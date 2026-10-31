#!/usr/bin/env python3
"""Telegram Web outbox worker (host side).

Drains data/tg_web_outbox/pending/*.json written by the Node server and sends
each message through the admin's own logged-in Telegram Web session
(/opt/loginsrv/profile-telegram). Nothing is sent from inside the container —
this process is the only sender, exactly as the owner chose.

Contract (files under /opt/vex/data/tg_web_outbox):
  pending/*.json   {id, target:'tg:<id>'|'phone:+…', text, kind, lead_id?, campaign_id?}
  sent/*.json      moved here after a confirmed delivery
  failed/*.json    moved here with an 'error' field
  safety.json      {halted, daily_cap, batch_size, gap_min_s, gap_max_s, warmup_start, …}
  worker_status.json  heartbeat + login state, rewritten every ~20s

Safety policy mirrors the WhatsApp track: warm-up ramp (day N allows
batch_size*N sends), hard daily cap, random human-like gaps, instant halt.
"""
import json
import os
import random
import re
import shutil
import sys
import time
from datetime import date, datetime, timezone

from playwright.sync_api import sync_playwright

BASE = "/opt/vex/data/tg_web_outbox"
PENDING = os.path.join(BASE, "pending")
SENT = os.path.join(BASE, "sent")
FAILED = os.path.join(BASE, "failed")
SAFETY = os.path.join(BASE, "safety.json")
STATUS = os.path.join(BASE, "worker_status.json")
PROFILE = "/opt/loginsrv/profile-telegram"
URL = "https://web.telegram.org/k/"

RAMP_DAYS = 14
HEARTBEAT_S = 20


def ensure_dirs():
    for d in (PENDING, SENT, FAILED):
        os.makedirs(d, exist_ok=True)


def read_json(path, default):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def beat(state, message="", logged_in=None, bot=None):
    payload = {
        "state": state,
        "last_beat": int(time.time() * 1000),
        "message": message,
    }
    if logged_in is not None:
        payload["logged_in"] = logged_in
    if bot:
        payload["bot_username"] = bot
    write_json(STATUS, payload)


def safety():
    s = read_json(SAFETY, {})
    return {
        "halted": bool(s.get("halted")),
        "daily_cap": int(s.get("daily_cap") or 25),
        "batch_size": int(s.get("batch_size") or 5),
        "gap_min_s": int(s.get("gap_min_s") or 45),
        "gap_max_s": int(s.get("gap_max_s") or 150),
        "warmup_start": s.get("warmup_start") or "",
    }


def warmup_day(s):
    start = s["warmup_start"]
    if not start:
        return 1
    try:
        d0 = datetime.strptime(start, "%Y-%m-%d").replace(tzinfo=timezone.utc).date()
    except Exception:
        return 1
    delta = (date.today() - d0).days + 1
    return max(1, min(RAMP_DAYS, delta))


def sent_today():
    today = date.today().isoformat()
    n = 0
    try:
        for f in os.listdir(SENT):
            if not f.endswith(".json"):
                continue
            m = read_json(os.path.join(SENT, f), {})
            ts = m.get("sent_at")
            if ts and datetime.fromtimestamp(ts / 1000, timezone.utc).date().isoformat() == today:
                n += 1
    except FileNotFoundError:
        pass
    return n


def allowance(s):
    day = warmup_day(s)
    allowed = min(s["daily_cap"], s["batch_size"] * day)
    used = sent_today()
    return allowed, used


def move(src, dst_dir, patch=None):
    m = read_json(src, None)
    if not m:
        try:
            os.remove(src)
        except OSError:
            pass
        return
    if patch:
        m.update(patch)
    dst = os.path.join(dst_dir, os.path.basename(src))
    tmp = dst + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
    os.replace(tmp, dst)
    try:
        os.remove(src)
    except OSError:
        pass


def claim_batch(limit):
    """Atomically claim up to `limit` pending files by renaming to .claim."""
    claimed = []
    try:
        names = sorted(f for f in os.listdir(PENDING) if f.endswith(".json"))
    except FileNotFoundError:
        return claimed
    for name in names:
        if len(claimed) >= limit:
            break
        src = os.path.join(PENDING, name)
        claimed_path = src + ".claim"
        try:
            os.rename(src, claimed_path)
        except OSError:
            continue  # another worker grabbed it
        msg = read_json(claimed_path, None)
        if not msg:
            try:
                os.remove(claimed_path)
            except OSError:
                pass
            continue
        claimed.append((claimed_path, msg))
    return claimed


def open_chat(page, target):
    """Open the target chat by SEARCH (the only reliable Telegram Web path).

    Numeric-id URL hashes and cold-phone lookups do not work (proven), so the
    target is a search query: type it, click the first matching result row.
    """
    query = target[2:] if target.startswith("q:") else target
    if not query.strip():
        raise ValueError("empty search query")

    # Ensure we are at the app root with the search box available.
    if "web.telegram.org" not in page.url:
        page.goto(URL, wait_until="domcontentloaded")
        page.wait_for_timeout(3000)

    search = page.query_selector("input.input-field-input")
    if not search:
        # Search box not present (maybe a chat is open) — go home first.
        page.goto(URL, wait_until="domcontentloaded")
        page.wait_for_timeout(3000)
        search = page.query_selector("input.input-field-input")
    if not search:
        raise RuntimeError("search box not found")

    search.click()
    page.wait_for_timeout(300)
    page.keyboard.press("Control+A")
    page.keyboard.type(query, delay=random.randint(40, 90))
    page.wait_for_timeout(3500)  # let global+local search resolve

    # Click the first VISIBLE result row (re-rendering can leave stale handles).
    rows = page.query_selector_all(".chatlist-chat")
    clicked = False
    for r in rows:
        try:
            if r.is_visible():
                r.click()
                clicked = True
                break
        except Exception:
            continue
    if not clicked:
        raise RuntimeError(f"no search result for {query!r}")

    # Wait for the message composer to appear.
    page.wait_for_selector("#message-text, textarea.input-message-input, .input-message-input", timeout=15000)
    page.wait_for_timeout(700)


def send_one(page, msg):
    target = msg.get("target", "")
    text = msg.get("text", "")
    if not text:
        raise ValueError("empty text")

    open_chat(page, target)

    editor = page.query_selector("#message-text, textarea.input-message-input, .input-message-input")
    if not editor:
        raise RuntimeError("message composer not found")

    editor.click()
    page.wait_for_timeout(300)
    # Fill line by line to keep newlines intact in the contenteditable.
    lines = text.split("\n")
    for i, line in enumerate(lines):
        page.keyboard.type(line, delay=random.randint(12, 35))
        if i < len(lines) - 1:
            page.keyboard.press("Shift+Enter")
    page.wait_for_timeout(random.randint(250, 600))

    # Prefer the send button; fall back to Enter.
    btn = page.query_selector("button.btn-send, .btn-send, button[title='Send'], .send-button")
    if btn and btn.is_visible():
        btn.click()
    else:
        page.keyboard.press("Enter")

    # Confirm the composer emptied (message left the box).
    page.wait_for_timeout(1200)
    box = page.query_selector("#message-text, textarea.input-message-input, .input-message-input")
    if box:
        value = (box.inner_text() if tag_is_editable(box) else (box.input_value() or "")).strip()
        if value:
            # Text still there → the send did not take.
            raise RuntimeError("message still in composer after send")


def tag_is_editable(el):
    try:
        tag = el.evaluate("e => e.tagName.toLowerCase()")
        return tag in ("div", "p")
    except Exception:
        return False


def login_ok(page):
    """True when the app shows the main chat list rather than the QR/login page."""
    try:
        if page.query_selector(".qr-container, .login-page, .login-qr, #auth-qr-form"):
            return False
        if page.query_selector(".chatlist, .chat-list, #column-center, .bubbles"):
            return True
    except Exception:
        return False
    return False


def main():
    ensure_dirs()
    beat("starting", "launching browser")
    with sync_playwright() as pw:
        browser = pw.chromium.launch_persistent_context(
            PROFILE,
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
            viewport={"width": 1280, "height": 900},
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        )
        page = browser.pages[0] if browser.pages else browser.new_page()
        try:
            page.goto(URL, wait_until="domcontentloaded", timeout=45000)
        except Exception as e:
            beat("error", f"initial load failed: {e}")
        page.wait_for_timeout(6000)

        if not login_ok(page):
            beat("stopped", "telegram web session is not logged in", logged_in=False)
            browser.close()
            return 1

        beat("running", "session active", logged_in=True)

        while True:
            s = safety()
            allowed, used = allowance(s)

            # Refresh heartbeat + login state each loop.
            if not login_ok(page):
                beat("stopped", "session lost (re-login required)", logged_in=False)
                browser.close()
                return 2
            beat("running", f"allowed={allowed} used={used}", logged_in=True)

            if s["halted"]:
                beat("running", "halted — waiting", logged_in=True)
                time.sleep(15)
                continue

            remaining = allowed - used
            if remaining <= 0:
                beat("running", "daily allowance reached", logged_in=True)
                time.sleep(30)
                continue

            batch = claim_batch(min(s["batch_size"], remaining))
            if not batch:
                time.sleep(8)
                continue

            for path, msg in batch:
                # Re-check halt between messages so a ban report stops us fast.
                if safety()["halted"]:
                    move(path, PENDING)  # unclaim back to pending
                    break
                try:
                    send_one(page, msg)
                    move(path, SENT, {"sent_at": int(time.time() * 1000)})
                    used += 1
                    beat("running", f"sent {msg.get('id')} ({used}/{allowed})", logged_in=True)
                except Exception as e:
                    move(path, FAILED, {"error": str(e)[:400], "failed_at": int(time.time() * 1000)})
                    beat("running", f"failed {msg.get('id')}: {e}", logged_in=True)

                gap = random.randint(s["gap_min_s"], s["gap_max_s"])
                time.sleep(gap)

        browser.close()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        beat("stopped", "interrupted")
        sys.exit(0)

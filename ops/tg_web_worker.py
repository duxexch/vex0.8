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
    # Claimed files carry a `.claim` suffix. Strip it when the file lands, so
    # it matches the documented `<id>.json` contract: both this worker's
    # sent_today() and the server's listTgWebMessages() filter on `.json`, so
    # leaving the suffix would make today's sends invisible to the daily cap
    # (observed: a delivered message still counting as used=0) and would leave
    # unclaimed messages stuck in pending/ where claim_batch() never sees them.
    name = os.path.basename(src)
    if name.endswith(".claim"):
        name = name[: -len(".claim")]
    dst = os.path.join(dst_dir, name)
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


def _norm_title(s):
    """Normalize a chat name so `@user_name`, `User Name` and `User  Name` compare equal."""
    s = (s or "").replace("_", " ")
    return re.sub(r"\s+", " ", s).strip().lower()


def _names_match(query, name):
    """True when `name` is plausibly the chat `query` points at.

    Either side may be a fragment of the other: a handle resolves to a display
    name (`@Vex_wallet_bot` -> "VEX WALLET") and an operator may pass a title
    fragment (`ملوك التوقعات` -> "ملوك التوقعات | رهانات مباشرة").
    """
    q = _norm_title(query)
    n = _norm_title(name)
    if len(q) < 2 or not n:
        return False
    return q == n or q in n or (len(n) >= 4 and n in q)


def _row_matches(query, peer_title, row_text):
    """True only when the ROW is the chat that was asked for.

    Matching runs against .peer-title (the chat's name) — never the message
    preview — so a chat that merely quoted the query in its last message can
    not be selected. An `@handle` query additionally requires the exact handle
    inside the row, which separates @Vex_wallet_bot from @VexWallet_bot.

    A global-search hit for an `@handle` renders the peer's OWN handle as a
    line of its own (`Or Ko\\n@Orko0l`) even when the display name has nothing
    to do with it ("Jason Jason" vs @BSKB120) — the name gate alone refuses
    those (observed: every real-client DM failed with "no result row named
    like"). So for handle queries, accept the row when one line IS exactly
    the handle: a message preview is time-prefixed (`11:22 @user…`) or longer
    text, so a chat merely quoting the handle never matches. Otherwise fall
    back to the original name gate — behavior for every other query is
    unchanged.
    """
    if query.strip().startswith("@"):
        handle = _norm_title("@" + query.strip().lstrip("@"))
        for line in (row_text or "").splitlines():
            if _norm_title(line) == handle:
                return True
        return _names_match(query, peer_title) and handle in _norm_title(row_text or "")
    return _names_match(query, peer_title)


def _opened_matches(query, opened, row_title):
    """Proof that the chat which opened is the one validated pre-click.

    The header shows the display name, which for handle queries may bear no
    relation to the handle — but identity was already proven pre-click (a row
    line IS the exact handle), so header == clicked-row-title proves the
    click landed on that very row. For name-gated rows this branch is
    implied by _names_match(query, row_title), so their behavior is
    unchanged; a wrong click on a different-named chat still fails closed.
    """
    if _names_match(query, opened):
        return True
    if row_title and _norm_title(opened) and _norm_title(opened) == _norm_title(row_title):
        return True
    return False


def _open_chat_title(page):
    """Name of the chat currently open (header), or '' when none can be read."""
    for sel in (".chat-info .peer-title", ".chat-info .title", ".chat-info"):
        try:
            el = page.query_selector(sel)
            if el:
                text = (el.inner_text() or "").strip()
                if text:
                    return text.split("\n")[0].strip()
        except Exception:
            continue
    try:
        col = page.query_selector("#column-center")
        if col:
            for line in (col.inner_text() or "").split("\n"):
                line = line.strip()
                if line:
                    return line
    except Exception:
        pass
    return ""


def open_chat(page, target):
    """Open the target chat by SEARCH, verifying WHO opened before returning.

    Telegram Web cannot open a chat by numeric id or cold-phone (proven), so
    the target is a search query. Search ranking is dynamic — the same query
    returned a different first row on consecutive runs — so clicking "the first
    row" delivered messages to strangers (observed: a random channel instead of
    the bot). Hence: pick the row whose NAME matches, refuse to click when none
    does, and re-read the opened chat's title afterwards. Any mismatch raises,
    so the message lands in failed/ instead of reaching the wrong person.
    """
    query = (target[2:] if target.startswith("q:") else target).strip()
    if not query:
        raise ValueError("empty search query")

    def focus_and_search():
        """(Re)type the query into the search box — called once per attempt."""
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

        # Focus the box with real input events. ElementHandle.click() waits for
        # the element to be "stable", and this sidebar re-renders on every
        # incoming message — observed to time out after 30s. Fall back to a
        # coordinate click read fresh from the DOM, which cannot go stale.
        try:
            search.click(timeout=8000)
        except Exception:
            rect = page.evaluate(
                """() => {
                  const el = document.querySelector('input.input-field-input');
                  if (!el) return null;
                  const b = el.getBoundingClientRect();
                  if (b.width < 10 || b.height < 10) return null;
                  return {x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2)};
                }"""
            )
            if not rect:
                raise RuntimeError("search box not found")
            page.mouse.click(rect["x"], rect["y"])
        page.wait_for_timeout(300)
        page.keyboard.press("Control+A")
        page.keyboard.type(query, delay=random.randint(40, 90))
        page.wait_for_timeout(3500)  # let global+local search resolve

    # The chat list is live: Telegram re-renders it on every incoming message
    # and detaches element handles mid-action (observed — handles read as
    # "not visible" or "not attached"). So read the WHOLE result set in one
    # evaluate and click by coordinates; no handle can go stale in between.
    # `clickable` (elementFromPoint) proves nothing else — a banner, a menu,
    # another row — sits on top of the centre we are about to click.
    SNAPSHOT_JS = """() => {
      const vh = innerHeight, out = [];
      for (const r of document.querySelectorAll('.chatlist-chat')) {
        const b = r.getBoundingClientRect();
        if (b.width < 10 || b.height < 10) continue;
        const t = r.querySelector('.peer-title');
        const cx = Math.round(b.x + b.width / 2), cy = Math.round(b.y + b.height / 2);
        const hit = document.elementFromPoint(cx, cy);
        const hitRow = hit && hit.closest ? hit.closest('.chatlist-chat') : null;
        out.push({
          title: t ? (t.textContent || '').trim() : '',
          text: (r.innerText || ''),
          cx, cy,
          inView: b.top >= 60 && b.bottom <= vh - 10,
          clickable: hitRow === r,
        });
      }
      return out;
    }"""

    def snapshot():
        return page.evaluate(SNAPSHOT_JS)

    def matching(rows):
        # NAME only — never the message preview (a chat that merely quoted the
        # query in its last message must not be selectable).
        return next((r for r in rows if _row_matches(query, r["title"], r["text"])), None)

    def scroll_list(delta):
        """Scroll whichever ancestor of the chat list actually scrolls."""
        page.evaluate(
            """(delta) => {
              let el = document.querySelector('.chatlist');
              while (el && el.scrollHeight <= el.clientHeight + 20) el = el.parentElement;
              if (el) el.scrollTop += delta;
            }""",
            delta,
        )
        page.wait_for_timeout(700)

    # (1)-(3) Select by NAME, click, and prove WHO opened — retried because a
    # click can land while the list is mid-re-render (observed: the composer
    # stays hidden, i.e. no chat opened at all). Fail closed throughout:
    # falling back to "some row" is exactly what gets the account reported
    # and banned, and a message to the wrong person is unrecoverable.
    last_err = "no attempt made"
    for _attempt in range(3):
        try:
            focus_and_search()
        except Exception as e:
            last_err = f"search failed ({str(e)[:140]})"
            continue

        # Select by NAME, scrolling the (virtual) list if the hit is below
        # the fold.
        row = matching(snapshot())
        for _ in range(6):
            if row is not None:
                break
            scroll_list(700)
            row = matching(snapshot())
        if row is None:
            last_err = f"no result row named like {query!r} ({len(snapshot())} rows seen)"
            continue

        # Bring it on screen if needed, confirm it is the topmost element at
        # its coordinates, then click with real input events.
        for _ in range(8):
            if row["inView"] and row["clickable"]:
                break
            page.mouse.move(row["cx"], max(80, min(row["cy"], 800)))
            page.mouse.wheel(0, 300 if row["cy"] > 0 else -300)
            page.wait_for_timeout(400)
            row = matching(snapshot())
            if row is None:
                break
        if row is None:
            last_err = f"result row for {query!r} vanished before click"
            continue
        if not (row["inView"] and row["clickable"]):
            last_err = f"result row for {query!r} is covered - refusing to click"
            continue
        row_title = row["title"]
        page.mouse.click(row["cx"], row["cy"])

        # The composer must be VISIBLE — a hidden one means no chat opened.
        try:
            page.wait_for_selector(
                "#message-text, textarea.input-message-input, .input-message-input",
                timeout=12000,
            )
        except Exception as e:
            last_err = f"composer did not appear after click ({str(e)[:120]})"
            continue

        # Prove the chat that opened is the one that was asked for. The header
        # renders lazily (3-9s observed after the click), so poll until it
        # matches — an early read would fail-closed every send, and a late read
        # could still be the previously opened chat.
        opened = ""
        deadline = time.time() + 20
        while True:
            opened = _open_chat_title(page)
            if _opened_matches(query, opened, row_title):
                break
            if time.time() >= deadline:
                break
            page.wait_for_timeout(500)
        if _opened_matches(query, opened, row_title):
            return
        last_err = f"opened chat {opened!r} does not match target {query!r}"

    raise RuntimeError(f"{last_err} - refusing to send")


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

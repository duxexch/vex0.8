#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Post-deploy GSC: verify all-domain sitemaps + resubmit + Indexing API batch."""
import json, time, base64, urllib.request, urllib.parse, sys, urllib.error
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_pem_private_key

sa = json.load(open("/root/indexing_sa.json"))
def b64url(b): return base64.urlsafe_b64encode(b).rstrip(b"=").decode()

def get_token(scope):
    now = int(time.time())
    si = (b64url(json.dumps({"alg": "RS256", "typ": "JWT"}, separators=(",", ":")).encode()) + "." +
          b64url(json.dumps({"iss": sa["client_email"], "scope": scope,
                             "aud": "https://oauth2.googleapis.com/token",
                             "iat": now, "exp": now + 3600}, separators=(",", ":")).encode())).encode()
    key = load_pem_private_key(sa["private_key"].encode(), password=None)
    sig = key.sign(si, padding.PKCS1v15(), hashes.SHA256())
    data = urllib.parse.urlencode({"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                                   "assertion": si.decode() + "." + b64url(sig)}).encode()
    r = urllib.request.urlopen(urllib.request.Request(
        "https://oauth2.googleapis.com/token", data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}), timeout=30)
    return json.load(r)["access_token"]

WC = get_token("https://www.googleapis.com/auth/webmasters")
IX = get_token("https://www.googleapis.com/auth/indexing")

def wapi(method, path, body=None):
    req = urllib.request.Request("https://searchconsole.googleapis.com/webmasters/v3" + path, method=method,
        headers={"Authorization": "Bearer " + WC, "Content-Type": "application/json"},
        data=json.dumps(body).encode() if body is not None else None)
    try:
        r = urllib.request.urlopen(req, timeout=40)
        return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")

print("=== 1) verify live sitemaps per domain ===")
for d in ["vex.deals", "betjam.sbs", "1xbetservices.com", "betongame.cloud"]:
    try:
        x = urllib.request.urlopen("https://%s/sitemap.xml" % d, timeout=25).read().decode("utf-8", "replace")
        print("  %-20s locs=%d bytes=%d" % (d, x.count("<loc>"), len(x)))
    except Exception as e:
        print("  %-20s ERR %s" % (d, e))

print("=== 2) resubmit sitemaps (force fresh fetch) ===")
for d in ["vex.deals", "betjam.sbs", "1xbetservices.com", "betongame.cloud"]:
    feed = "https://%s/sitemap.xml" % d
    st, res = wapi("PUT", "/sites/%s/sitemaps/%s" % (
        urllib.parse.quote("sc-domain:" + d, safe=""), urllib.parse.quote(feed, safe="")), {})
    print("  %-20s -> %s" % (d, st))

print("=== 3) Indexing API: URL_UPDATED batch ===")
GUIDES = ['claim-compensation', 'unfreeze-balance', 'ai-predictions-guide', 'provably-fair-lottery',
          '1xbet-bonus-promo-guide', 'betting-wallet-tracking-guide', 'betting-odds-explained',
          'bankroll-management-guide', 'parlay-accumulator-guide', 'how-to-choose-betting-site',
          'live-betting-guide', 'responsible-gambling-guide', 'betting-glossary']
vex = ["https://vex.deals/", "https://vex.deals/guides", "https://vex.deals/predictions",
       "https://vex.deals/predictions/today", "https://vex.deals/news", "https://vex.deals/companies",
       "https://vex.deals/compare", "https://vex.deals/best-betting-sites",
       "https://vex.deals/privacy", "https://vex.deals/about", "https://vex.deals/wallets",
       "https://vex.deals/lottery", "https://vex.deals/ai-sports"]
vex += ["https://vex.deals/guides/" + g for g in GUIDES]
betjam = ["https://betjam.sbs/", "https://betjam.sbs/guides",
          "https://betjam.sbs/guides/live-betting-guide", "https://betjam.sbs/guides/claim-compensation",
          "https://betjam.sbs/predictions"]
one = ["https://1xbetservices.com/", "https://1xbetservices.com/guides",
       "https://1xbetservices.com/predictions", "https://1xbetservices.com/predictions/today"]
beto = ["https://betongame.cloud/", "https://betongame.cloud/guides", "https://betongame.cloud/predictions"]

ok = fail = 0
for url in vex + betjam + one + beto:
    body = json.dumps({"url": url, "type": "URL_UPDATED"}).encode()
    req = urllib.request.Request("https://indexing.googleapis.com/v3/urlNotifications:publish", data=body,
        method="POST", headers={"Authorization": "Bearer " + IX, "Content-Type": "application/json"})
    try:
        r = urllib.request.urlopen(req, timeout=30)
        ok += 1
    except urllib.error.HTTPError as e:
        fail += 1
        if fail <= 3:
            print("  FAIL %s -> %s %s" % (url, e.code, e.read().decode()[:150]))
print("  submitted OK=%d FAIL=%d total=%d" % (ok, fail, ok + fail))
print("DONE")

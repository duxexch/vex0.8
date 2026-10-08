#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Verify GSC registered our fixes: sitemap state per property + URL inspection."""
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

TOK = get_token("https://www.googleapis.com/auth/webmasters")

def gapi(path):
    req = urllib.request.Request("https://searchconsole.googleapis.com/webmasters/v3" + path,
        headers={"Authorization": "Bearer " + TOK})
    try:
        r = urllib.request.urlopen(req, timeout=40)
        return json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return {"_err": e.code, "_body": e.read().decode()[:300]}

print("=== 1) sitemaps state per property ===")
for d in ["vex.deals", "betjam.sbs", "1xbetservices.com", "betongame.cloud", "vixo.uno"]:
    site = "sc-domain:" + d
    res = gapi("/sites/%s/sitemaps" % urllib.parse.quote(site, safe=""))
    if "_err" in res:
        print("  %-20s ERR %s" % (d, res)); continue
    sm = res.get("sitemap", [])
    if not sm:
        print("  %-20s (no sitemaps submitted)" % d); continue
    for s in sm:
        path = s.get("path", "?")
        if "sitemap.xml" not in path: continue
        c = s.get("contents", [{}])
        tot = sum(x.get("urlCount", 0) for x in c)
        errs = sum(x.get("errors", 0) for x in c)
        warns = sum(x.get("warnings", 0) for x in c)
        print("  %-20s urls=%-5d errors=%d warnings=%d lastDownloaded=%s lastSubmitted=%s" % (
            d, tot, errs, warns,
            (c[0].get("submitted") or "-") if c else "-",
            s.get("lastSubmitted", "-")))

def inspect(url, site):
    body = json.dumps({"inspectionUrl": url, "siteUrl": site}).encode()
    req = urllib.request.Request("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
        data=body, method="POST",
        headers={"Authorization": "Bearer " + TOK, "Content-Type": "application/json"})
    try:
        r = urllib.request.urlopen(req, timeout=40)
        res = json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"_err": e.code, "_b": e.read().decode()[:200]}
    idx = res.get("inspectionResult", {}).get("indexStatusResult", {})
    return {"verdict": idx.get("verdict"), "coverage": idx.get("coverageState"),
            "canonical": idx.get("canonical"), "crawledAs": idx.get("crawledAs"),
            "lastCrawl": idx.get("lastCrawlTime", "-")[:19]}

print("\n=== 2) URL inspection (key pages) ===")
sd = "sc-domain:vex.deals"
for u in ["https://vex.deals/",
          "https://vex.deals/guides/live-betting-guide",
          "https://vex.deals/predictions",
          "https://vex.deals/predictions/league/la-liga?lang=en",
          "https://vex.deals/site-posts"]:
    r = inspect(u, sd)
    print("  %-58s %s" % (u.replace("https://vex.deals", ""), r))
    time.sleep(1.2)

print("\n=== 3) searchAnalytics: last 7d totals (vex.deals) ===")
body = {"startDate": "2026-09-30", "endDate": "2026-10-06", "dimensions": ["query"],
        "rowLimit": 5, "dataState": "final"}
req = urllib.request.Request("https://searchconsole.googleapis.com/webmasters/v3/sites/%s/searchAnalytics/query" %
    urllib.parse.quote(sd, safe=""), data=json.dumps(body).encode(), method="POST",
    headers={"Authorization": "Bearer " + TOK, "Content-Type": "application/json"})
try:
    r = urllib.request.urlopen(req, timeout=40)
    res = json.loads(r.read().decode())
    rows = res.get("rows", [])
    print("  top queries:")
    for row in rows[:5]:
        print("    %-40s clicks=%d impr=%d pos=%.1f" % (row["keys"][0][:40], row["clicks"], row["impressions"], row["position"]))
except urllib.error.HTTPError as e:
    print("  ERR %s %s" % (e.code, e.read().decode()[:200]))
print("DONE")

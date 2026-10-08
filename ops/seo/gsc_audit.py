#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""GSC ERROR AUDIT — يفحص أخطاء Google Search Console لكل الدومينات:
1) Sitemaps API: أخطاء/تحذيرات الخرائط المُرسلة
2) فحص مباشر: robots.txt + sitemap.xml (HTTP status + صحة)
3) URL Inspection API: حالة فهرسة أهم الصفحات + أسباب عدم الفهرسة
4) searchAnalytics: أداء 28 يوم + فرص التحسين
"""
import json, time, base64, urllib.request, urllib.parse, sys, urllib.error, datetime, re
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_pem_private_key

sa = json.load(open("/root/indexing_sa.json"))
DOMAINS = ["vex.deals", "betjam.sbs", "1xbetservices.com", "vixo.uno", "betongame.cloud"]
LAG = 3

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

TOK_WM = get_token("https://www.googleapis.com/auth/webmasters")
TOK_INSPECT = TOK_WM  # نفس التوكن لو الـ API مفعّل

def api(url, body=None, tok=None, method=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method or ("POST" if data else "GET"),
                                 headers={"Authorization": "Bearer " + (tok or TOK_WM),
                                          "Content-Type": "application/json"})
    try:
        r = urllib.request.urlopen(req, timeout=40)
        return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"_http_error": e.code, "_body": e.read().decode()[:400]}
    except Exception as e:
        return {"_error": str(e)[:300]}

def head_http(url, timeout=20):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)"})
        r = urllib.request.urlopen(req, timeout=timeout)
        body = r.read(60000).decode("utf-8", "replace")
        return r.status, body, None
    except urllib.error.HTTPError as e:
        return e.code, "", str(e)
    except Exception as e:
        return None, "", str(e)

out = []
def P(s=""):
    out.append(s); print(s, flush=True)

P("========== GSC ERROR AUDIT %s ==========" % datetime.date.today().isoformat())
P()

# ---------- 1) SITEMAPS API ----------
P("--- [1] SITEMAPS (API) ---")
for d in DOMAINS:
    site = "sc-domain:" + d
    res = api("https://www.googleapis.com/webmasters/v3/sites/%s/sitemaps" % urllib.parse.quote(site, safe=""))
    if "_http_error" in res or "_error" in res:
        P("  %-20s ERROR: %s" % (d, res))
        continue
    sms = res.get("sitemap", [])
    if not sms:
        P("  %-20s ⚠️ NO SITEMAP SUBMITTED" % d)
        continue
    for sm in sms:
        errs = sm.get("errors", "?")
        warns = sm.get("warnings", "?")
        flag = "OK" if (errs == 0) else "❌ ERRORS"
        P("  %-20s %s err=%s warn=%s lastSubmitted=%s path=%s" % (
            d, flag, errs, warns, (sm.get("lastSubmitted") or "")[:10], sm.get("path", "")))
P()

# ---------- 2) LIVE robots/sitemap checks ----------
P("--- [2] LIVE CHECK robots.txt + sitemap.xml ---")
for d in DOMAINS:
    st_rb, rb, e1 = head_http("https://%s/robots.txt" % d)
    st_sm, sm, e2 = head_http("https://%s/sitemap.xml" % d)
    rb_bad = ""
    if st_rb != 200:
        rb_bad = " ❌HTTP %s" % st_rb
    elif re.search(r"(?im)^\s*Disallow:\s*/\s*$", rb):
        rb_bad = " ❌DISALLOW ALL"
    sm_bad = ""
    if st_sm != 200:
        sm_bad = " ❌HTTP %s" % st_sm
    else:
        if "<urlset" not in sm and "<sitemapindex" not in sm:
            sm_bad = " ❌NOT XML SITEMAP (%s)" % sm[:60].replace("\n", " ")
    n_urls = len(re.findall(r"<loc>", sm or ""))
    P("  %-20s robots:%s%s | sitemap:%s%s urls=%d" % (d, st_rb, rb_bad, st_sm, sm_bad, n_urls))
    if st_rb == 200:
        # host/sitemap مذكور؟
        if "sitemap:" not in rb.lower():
            P("      ⚠️ robots.txt لا يذكر Sitemap:")
    if st_sm == 200 and n_urls == 0:
        P("      ❌ sitemap فارغ (0 URLs)")
P()

# ---------- 3) URL INSPECTION ----------
P("--- [3] URL INSPECTION (أهم الصفحات) ---")
sample_urls = {
    "vex.deals": ["https://vex.deals/", "https://vex.deals/predictions/league/la-liga?lang=en",
                  "https://vex.deals/guides/ai-predictions-guide?lang=en"],
    "betjam.sbs": ["https://betjam.sbs/", "https://betjam.sbs/predictions/today?lang=en"],
    "1xbetservices.com": ["https://1xbetservices.com/", "https://1xbetservices.com/predictions/today?lang=en",
                          "https://1xbetservices.com/guides/live-betting-guide"],
    "vixo.uno": ["https://vixo.uno/", "https://vixo.uno/predictions/tomorrow"],
    "betongame.cloud": ["https://betongame.cloud/"],
}
inspect_ok = False
for d, urls in sample_urls.items():
    for u in urls[:3]:
        res = api("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
                  {"inspectionUrl": u, "siteUrl": "sc-domain:" + d})
        if "_http_error" in res:
            P("  inspection API error %s: %s" % (res["_http_error"], res.get("_body", "")[:150]))
            inspect_ok = False
            break
        if "_error" in res:
            P("  inspection error: %s" % res["_error"]); inspect_ok = False; break
        ir = (((res.get("inspectionResult") or {}).get("indexStatusResult")) or {})
        verdict = ir.get("verdict", "?")
        cov = ir.get("coverageState", "")
        robots = ir.get("robotsTxtState", "")
        page_state = ir.get("pageFetchState", "")
        canonical = ir.get("googleSelectedCanonical", "")
        flag = "✅" if verdict == "PASS" else ("⚠️" if verdict == "VERDICT_UNKNOWN" else "❌")
        P("  %s %-62s verdict=%s cov=%s fetch=%s robots=%s" % (
            flag, u[:62], verdict, cov, page_state, robots))
        if canonical and canonical.rstrip("/") != u.rstrip("/"):
            P("      canonical=%s" % canonical[:90])
    if not inspect_ok:
        break
if not inspect_ok:
    P("  (URL Inspection API غير متاح لهذا المشروع — نكمل بالمؤشرات التانية)")
P()

# ---------- 4) PERFORMANCE + IMPROVEMENT ----------
P("--- [4] PERFORMANCE 28d + STRIKING DISTANCE ---")
today = datetime.date.today()
rng28 = {"startDate": (today - datetime.timedelta(days=28 + LAG)).isoformat(),
         "endDate": (today - datetime.timedelta(days=1 + LAG)).isoformat()}

def q(site, body):
    return api("https://www.googleapis.com/webmasters/v3/sites/%s/searchAnalytics/query"
               % urllib.parse.quote(site, safe=""), body, tok=TOK_WM)

all_opp, worst_pages = [], []
for d in DOMAINS:
    site = "sc-domain:" + d
    tot = q(site, dict(rng28, dimensions=[]))
    if "rows" in tot and tot["rows"]:
        t = tot["rows"][0]
        P("  %-20s 28d: %d clicks / %d impr / ctr %.2f%% / pos %.1f" % (
            d, t["clicks"], t["impressions"], t["ctr"] * 100, t["position"]))
    else:
        P("  %-20s 28d: NO DATA %s" % (d, str(tot)[:120]))
    # striking distance queries
    rq = q(site, dict(rng28, dimensions=["query"], rowLimit=1000))
    for r in (rq.get("rows") or []):
        if r["impressions"] >= 3 and 5 <= r["position"] <= 45 and r["clicks"] == 0:
            all_opp.append((r["impressions"], r["position"], r["keys"][0], d))
    # pages with impressions but weak position (>=40) — فرصة تحسين
    rp = q(site, dict(rng28, dimensions=["page"], rowLimit=1000))
    for r in (rp.get("rows") or []):
        if r["impressions"] >= 5 and r["position"] >= 40 and r["clicks"] == 0:
            worst_pages.append((r["impressions"], r["position"], r["keys"][0], d))
P()
P("  -- STRIKING DISTANCE (impr>=3, pos 5-45, 0 clicks) top 12 --")
for i, p, k, d in sorted(all_opp, key=lambda x: -x[0])[:12]:
    P("    i=%-3d p=%-5.1f %-50s [%s]" % (i, p, k[:50], d))
P("  -- WEAK PAGES (impr>=5, pos>=40, 0 clicks) top 8 --")
for i, p, k, d in sorted(worst_pages, key=lambda x: -x[0])[:8]:
    P("    i=%-3d p=%-5.1f %-70s [%s]" % (i, p, k[:70], d))

with open("/root/reports/gsc_audit_%s.txt" % today.isoformat(), "w", encoding="utf-8") as f:
    f.write("\n".join(out))
P()
P("saved: /root/reports/gsc_audit_%s.txt" % today.isoformat())

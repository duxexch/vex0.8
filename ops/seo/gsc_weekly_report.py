import json, time, base64, urllib.request, urllib.parse, sys, urllib.error, os, datetime
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_pem_private_key

sa = json.load(open('/root/indexing_sa.json'))
DOMAINS = ['vex.deals', 'betjam.sbs', '1xbetservices.com', 'vixo.uno', 'betongame.cloud']
REPORT_DIR = '/root/reports'
LAG = 3  # GSC data lag days

os.makedirs(REPORT_DIR, exist_ok=True)

def b64url(b): return base64.urlsafe_b64encode(b).rstrip(b'=').decode()

def get_token(scope):
    now = int(time.time())
    si = (b64url(json.dumps({'alg': 'RS256', 'typ': 'JWT'}, separators=(',', ':')).encode()) + '.' +
          b64url(json.dumps({'iss': sa['client_email'], 'scope': scope,
                             'aud': 'https://oauth2.googleapis.com/token',
                             'iat': now, 'exp': now + 3600}, separators=(',', ':')).encode())).encode()
    key = load_pem_private_key(sa['private_key'].encode(), password=None)
    sig = key.sign(si, padding.PKCS1v15(), hashes.SHA256())
    data = urllib.parse.urlencode({'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                                   'assertion': si.decode() + '.' + b64url(sig)}).encode()
    r = urllib.request.urlopen(urllib.request.Request(
        'https://oauth2.googleapis.com/token', data=data,
        headers={'Content-Type': 'application/x-www-form-urlencoded'}), timeout=30)
    return json.load(r)['access_token']

TOK = get_token('https://www.googleapis.com/auth/webmasters')

def query(site, body):
    url = 'https://www.googleapis.com/webmasters/v3/sites/%s/searchAnalytics/query' % urllib.parse.quote(site, safe='')
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method='POST',
                                 headers={'Authorization': 'Bearer ' + TOK,
                                          'Content-Type': 'application/json'})
    try:
        r = urllib.request.urlopen(req, timeout=40)
        return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {'error': e.read().decode()[:300]}

def rng(days_from, days_to):
    today = datetime.date.today()
    return {'startDate': (today - datetime.timedelta(days=days_from)).isoformat(),
            'endDate': (today - datetime.timedelta(days=days_to)).isoformat()}

# windows (all end at today-LAG): cur7, prev7, cur28, prev28
CUR7 = rng(LAG + 7, LAG + 1)
PREV7 = rng(LAG + 14, LAG + 8)
CUR28 = rng(LAG + 28, LAG + 1)
PREV28 = rng(LAG + 56, LAG + 29)

def totals(site, r):
    res = query(site, r)
    if 'error' in res:
        return None
    rows = res.get('rows', [])
    return rows[0] if rows else {'clicks': 0, 'impressions': 0, 'ctr': 0, 'position': 0}

def fmt_t(t):
    return '%d clicks / %d impr / %.2f%% / pos %.1f' % (
        t['clicks'], t['impressions'], t['ctr'] * 100, t['position'])

def delta(cur, prev):
    d = []
    dc = cur['clicks'] - prev['clicks']
    di = cur['impressions'] - prev['impressions']
    d.append('clk %+d' % dc)
    d.append('impr %+d' % di)
    dp = cur['position'] - prev['position']
    d.append('pos %+.1f' % (-dp))  # negative pos delta = improvement
    return ' '.join(d)

out = []
def P(s=''):
    out.append(s)
    print(s)

today = datetime.date.today().isoformat()
P('===== VEX WEEKLY GSC REPORT (%s) =====' % today)
P('windows: 7d %s..%s | 28d %s..%s (GSC lag %dd)' % (
    CUR7['startDate'], CUR7['endDate'], CUR28['startDate'], CUR28['endDate'], LAG))
P()
P('--- TOTALS: last 7 days vs previous 7 (and 28d totals) ---')
P('%-20s %-44s %-44s %s' % ('domain', 'last 7d', 'prev 7d (delta)', 'last 28d'))
sum7 = sum7p = sum28 = 0
sum28_impr = 0
for d in DOMAINS:
    site = 'sc-domain:' + d
    c7 = totals(site, CUR7)
    p7 = totals(site, PREV7)
    c28 = totals(site, CUR28)
    if c7 is None or p7 is None or c28 is None:
        P('%-20s ERROR querying GSC' % d)
        continue
    P('%-20s %-44s %-44s %d clk / %d impr' % (
        d, fmt_t(c7), fmt_t(c7) + ' [' + delta(c7, p7) + ']', c28['clicks'], c28['impressions']))
    sum7 += c7['clicks']; sum7p += p7['clicks']
    sum28 += c28['clicks']; sum28_impr += c28['impressions']
P('%-20s 7d total: %d clicks (prev 7d: %d) | 28d total: %d clicks / %d impr' % (
    'ALL', sum7, sum7p, sum28, sum28_impr))
P()

# merged 28d rows across domains
def merged(dim, limit=15):
    agg = {}
    for d in DOMAINS:
        res = query('sc-domain:' + d, dict(CUR28, dimensions=[dim], rowLimit=500))
        if 'error' in res:
            continue
        for r in res.get('rows', []):
            k = r['keys'][0]
            if k not in agg:
                agg[k] = {'clicks': 0, 'impressions': 0, 'pw': 0}
            agg[k]['clicks'] += r['clicks']
            agg[k]['impressions'] += r['impressions']
            agg[k]['pw'] += r['position'] * r['impressions']
    items = []
    for k, v in agg.items():
        pos = v['pw'] / v['impressions'] if v['impressions'] else 0
        items.append((v['clicks'], v['impressions'], pos, k))
    items.sort(key=lambda x: (-x[0], -x[1]))
    return items[:limit]

P('--- TOP QUERIES (28d, all domains) ---')
for c, i, p, k in merged('query', 15):
    P('  %-55s c=%d i=%d p=%.1f' % (k[:55], c, i, p))
P()

P('--- STRIKING DISTANCE (28d, impr>=3, pos 5-45) ---')
opp = []
for d in DOMAINS:
    res = query('sc-domain:' + d, dict(CUR28, dimensions=['query'], rowLimit=500))
    if 'error' in res:
        continue
    for r in res.get('rows', []):
        if r['impressions'] >= 3 and 5 <= r['position'] <= 45:
            opp.append((r['impressions'], r['position'], r['clicks'], r['keys'][0], d))
opp.sort(reverse=True)
if opp:
    for impr, pos, c, q, d in opp[:25]:
        P('  %-46s %-18s i=%d p=%.1f c=%d' % (q[:46], d, impr, pos, c))
else:
    P('  (none this period)')
P('  total: %d' % len(opp))
P()

P('--- TOP PAGES (28d, all domains) ---')
for c, i, p, k in merged('page', 12):
    P('  %-75s c=%d i=%d p=%.1f' % (k.replace('https://', '')[:75], c, i, p))
P()

P('--- TOP COUNTRIES (28d, vex.deals) ---')
res = query('sc-domain:vex.deals', dict(CUR28, dimensions=['country'], rowLimit=8))
for r in res.get('rows', []):
    P('  %-25s c=%d i=%d' % (r['keys'][0], r['clicks'], r['impressions']))
P()

# index coverage sanity: sitemap submitted count via sitemaps API
try:
    req = urllib.request.Request('https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Avex.deals/sitemaps',
                                 headers={'Authorization': 'Bearer ' + TOK})
    sm = json.load(urllib.request.urlopen(req, timeout=30))
    for s in sm.get('sitemap', []):
        P('sitemap vex.deals: %s lastSubmitted=%s errors=%s warnings=%s' % (
            s.get('path'), s.get('lastSubmitted'), s.get('errors'), s.get('warnings')))
except Exception as e:
    P('sitemap check failed: %s' % e)

report = '\n'.join(out) + '\n'
path = os.path.join(REPORT_DIR, 'gsc_report_%s.txt' % today)
with open(path, 'w', encoding='utf-8') as f:
    f.write(report)
# keep only last 26 reports
files = sorted(f for f in os.listdir(REPORT_DIR) if f.startswith('gsc_report_'))
for f in files[:-26]:
    os.remove(os.path.join(REPORT_DIR, f))
print('[saved] %s' % path)

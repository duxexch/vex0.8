import json, time, base64, urllib.request, urllib.parse, sys, urllib.error, re, io
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_pem_private_key

SA_PATH = '/root/indexing_sa.json'
STATE_PATH = '/root/indexing_state.json'
DOMAINS = ['vex.deals', 'betjam.sbs', '1xbetservices.com', 'vixo.uno', 'betongame.cloud']
MAX_PER_RUN = 600
DELAY = 0.15

sa = json.load(open(SA_PATH, encoding='utf-8'))
state = {}
if __import__('os').path.exists(STATE_PATH):
    state = json.load(open(STATE_PATH, encoding='utf-8'))
state.setdefault('submitted', {})
state.setdefault('blocked', {})

def b64url(b): return base64.urlsafe_b64encode(b).rstrip(b'=').decode()

def get_token():
    now = int(time.time())
    si = (b64url(json.dumps({'alg': 'RS256', 'typ': 'JWT'}, separators=(',', ':')).encode()) + '.' +
          b64url(json.dumps({'iss': sa['client_email'],
                             'scope': 'https://www.googleapis.com/auth/indexing',
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

TOKEN = get_token()

def publish(url):
    body = json.dumps({'url': url, 'type': 'URL_UPDATED'}).encode()
    req = urllib.request.Request('https://indexing.googleapis.com/v3/urlNotifications:publish',
                                 data=body, method='POST',
                                 headers={'Authorization': 'Bearer ' + TOKEN,
                                          'Content-Type': 'application/json'})
    try:
        r = urllib.request.urlopen(req, timeout=30)
        return r.status, ''
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]

def fetch_locs(domain):
    try:
        t = urllib.request.urlopen('https://%s/sitemap.xml' % domain, timeout=30).read().decode('utf-8', 'replace')
    except Exception as e:
        print('SITEMAP FAIL %s: %s' % (domain, e))
        return []
    if '<sitemapindex' in t:
        out = []
        for sm in re.findall(r'<loc>([^<]+)</loc>', t):
            try:
                st = urllib.request.urlopen(sm, timeout=30).read().decode('utf-8', 'replace')
                out += re.findall(r'<loc>([^<]+)</loc>', st)
            except Exception:
                pass
        return out
    return re.findall(r'<loc>([^<]+)</loc>', t)

def rank(url):
    path = urllib.parse.urlsplit(url).path
    segs = [s for s in path.split('/') if s]
    if not segs: return 0
    f = segs[0]
    if f in ('about', 'privacy', 'terms', 'contact', 'editorial-policy',
             'affiliate-disclosure', 'security', 'responsible-gambling',
             'companies', 'best-betting-sites', 'trust', 'compare' if len(segs) == 1 else ''):
        return 1
    if f == 'guides': return 2
    if f == 'company': return 3
    if f == 'compare': return 4
    if f == 'predictions': return 5
    if f in ('lottery', 'wallets', 'referrals'): return 1
    return 6

by_domain = {}
for d in DOMAINS:
    if state['blocked'].get(d):
        print('SKIP (blocked/ownership):', d)
        continue
    locs = [u for u in fetch_locs(d) if u.startswith('https://' + d)]
    by_domain[d] = locs
    print('%-20s %d urls' % (d, len(locs)))

items = []
for d, locs in by_domain.items():
    for i, u in enumerate(locs):
        items.append((rank(u), u, i))
items.sort(key=lambda x: (x[0], x[2]))

buckets = {}
for r, u, i in items:
    buckets.setdefault(r, []).append(u)
ordered = []
for r in sorted(buckets):
    per = {d: [] for d in by_domain}
    for u in buckets[r]:
        d = u.split('/')[2]
        if d in per: per[d].append(u)
    maxlen = max((len(v) for v in per.values()), default=0)
    for j in range(maxlen):
        for d in by_domain:
            if j < len(per[d]): ordered.append(per[d][j])

todo = [u for u in ordered if u not in state['submitted']]
print('total ordered:', len(ordered), '| already submitted:', len(state['submitted']), '| todo:', len(todo))

stats = {'ok': 0, 'quota': 0, 'blocked': 0, 'other': 0}
fail_streak = 0
stop = None
for n, url in enumerate(todo[:MAX_PER_RUN], 1):
    code, body = publish(url)
    if code == 200:
        stats['ok'] += 1
        fail_streak = 0
        state['submitted'][url] = int(time.time())
    elif code == 429:
        stats['quota'] += 1
        stop = 'QUOTA (429)'
        break
    elif code == 403:
        stats['blocked'] += 1
        d = url.split('/')[2]
        state['blocked'][d] = body
        fail_streak += 1
        print('403 ownership -> skip domain', d, '|', body[:120])
    else:
        stats['other'] += 1
        fail_streak += 1
        print('HTTP', code, url, '|', body[:150])
    if fail_streak >= 15:
        stop = '15 consecutive failures'
        break
    if n % 50 == 0:
        print('progress: %d | ok=%d quota=%d blocked=%d other=%d' % (n, stats['ok'], stats['quota'], stats['blocked'], stats['other']))
        json.dump(state, open(STATE_PATH, 'w', encoding='utf-8'))
    time.sleep(DELAY)

json.dump(state, open(STATE_PATH, 'w', encoding='utf-8'))

per_dom = {}
for u, ts in state['submitted'].items():
    d = u.split('/')[2]
    per_dom[d] = per_dom.get(d, 0) + 1
print()
print('=== RUN SUMMARY ===')
print('this run:', stats, '| stop:', stop or 'batch complete/max reached')
print('cumulative submitted per domain:')
for d in DOMAINS:
    print('  %-20s %d' % (d, per_dom.get(d, 0)))
print('total submitted:', len(state['submitted']), '| blocked domains:', list(state['blocked']))

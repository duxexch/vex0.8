import json, re, sys, time, urllib.request
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
DOMAINS = ['vex.deals', 'betjam.sbs', '1xbetservices.com', 'betongame.cloud']

ok_batches = 0
for d in DOMAINS:
    try:
        b = urllib.request.urlopen('https://%s/sitemap.xml' % d, timeout=30).read().decode('utf-8', 'replace')
    except Exception as e:
        print(d, 'sitemap ERR', str(e)[:150])
        continue
    urls = re.findall(r'<loc>(https://[^<]*/predictions[^<]*)</loc>', b)
    if not urls:
        print(d, 'no prediction urls')
        continue
    print(d, 'prediction urls:', len(urls))
    for i in range(0, len(urls), 500):
        chunk = urls[i:i + 500]
        try:
            req = urllib.request.Request(
                'https://%s/api/indexnow' % d,
                data=json.dumps({'urls': chunk}).encode(),
                headers={'Content-Type': 'application/json'}, method='POST')
            r = urllib.request.urlopen(req, timeout=180)
            j = json.loads(r.read().decode())
            print('  chunk', i, '->', j)
            if j.get('ok', 0) > 0:
                ok_batches += 1
        except Exception as e:
            print('  chunk', i, 'ERR', str(e)[:200])
        time.sleep(1)
    time.sleep(2)
print('DONE ok_batches:', ok_batches)

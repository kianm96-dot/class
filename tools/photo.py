"""사진 목록 관리 (위키미디어 공용).
사진은 assets/photo/credits.json 에 이름별로 적습니다.
  {"m1/self/socrates": {"commons": "File:...jpg", "credit": "한국어 출처 표기", "license": "이용 조건", "page": "원본 페이지"}}
assets/photo/<이름>.jpg 파일이 있으면 그 파일을, 없으면 위키미디어 공용 주소에서 바로 불러옵니다(build_deck.py, build_ws.py).

  python3 tools/photo.py search "검색어"       → 공용의 파일 이름 찾기
  python3 tools/photo.py fetch [이름 ...]      → 아직 내려받지 않은 사진을 assets/photo/ 에 저장하고, 이용 조건·작가를 공용에서 다시 읽어 적기
  python3 tools/photo.py list                  → 사진 목록과 저장 여부
인터넷이 되는 PC에서 fetch 를 한 번 돌린 뒤 build_deck.py · build_ws.py 를 다시 돌리면 모든 사진이 저장소 안의 파일로 바뀝니다.
Commons 로봇 정책에 맞는 User-Agent를 쓰고, 요청 사이에 쉬며, 표준 썸네일 크기만 요청합니다."""
import sys, re, json, html, time, pathlib, urllib.parse as up, urllib.request as ur, urllib.error as ue

ROOT = pathlib.Path(__file__).resolve().parent.parent
PHOTO = ROOT / 'assets' / 'photo'
CRED = PHOTO / 'credits.json'
UA = 'MoralClassMaterials/1.0 (https://github.com/kianm96-dot/class)'
SIZES = [1280, 960, 1920, 500]

def load():
    return json.loads(CRED.read_text(encoding='utf-8')) if CRED.exists() else {}

def save(c):
    CRED.write_text(json.dumps(c, ensure_ascii=False, indent=1), encoding='utf-8')

def local(name):
    for ext in ('.jpg', '.png'):
        if (PHOTO / (name + ext)).exists():
            return name + ext
    return None

def remote(name, width=1280):
    t = load()[name]['commons']
    return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + up.quote(t[5:].replace(' ', '_')) + f'?width={width}'

def page(t):
    return 'https://commons.wikimedia.org/wiki/' + up.quote(t.replace(' ', '_'))

def fetch_url(url, tries=4):
    for t in range(tries):
        try:
            with ur.urlopen(ur.Request(url, headers={'User-Agent': UA}), timeout=60) as r:
                return r.read(), r.headers.get('Content-Type', '')
        except ue.HTTPError as e:
            if e.code in (429, 503) and t < tries - 1:
                time.sleep(20 * (t + 1)); continue
            raise
    raise RuntimeError('fetch failed')

def text(fragment):
    f = re.sub(r'<style.*?</style>', ' ', fragment or '', flags=re.S)
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html.unescape(f))).strip()

def meta(title):
    s = fetch_url(page(title))[0].decode('utf-8')
    lic = sorted(set(text(x) for x in re.findall(r'class="licensetpl_short"[^>]*>(.*?)</span>', s)))
    if not lic:
        lic = sorted(set(re.findall(r'(Public domain|CC0|CC BY(?:-SA)? [0-9.]+|KOGL Type \d)', s)))[:3]
    a = re.search(r'id="fileinfotpl_aut"[^>]*>.*?</td>\s*<td[^>]*>(.*?)</td>', s, re.S)
    m = re.search(r'upload\.wikimedia\.org/wikipedia/commons/([0-9a-f]/[0-9a-f]{2})/([^"?/]+)', s)
    return ', '.join(lic), text(a.group(1))[:160] if a else '', m.group(1) if m else None, m.group(2) if m else None

def fetch(names):
    from PIL import Image
    c = load()
    for n in names or list(c):
        if local(n):
            continue
        t = c[n]['commons']
        lic, aut, h, fn = meta(t); time.sleep(1)
        if not h:
            print('주소를 찾지 못함:', n, t); continue
        data = None
        for size in SIZES:
            url = f'https://upload.wikimedia.org/wikipedia/commons/thumb/{h}/{fn}/{size}px-{fn}'
            if fn.lower().endswith(('.svg', '.tif', '.tiff')):
                url += '.png' if fn.lower().endswith('.svg') else '.jpg'
            try:
                body, ctype = fetch_url(url, tries=3)
                if ctype.startswith('image/'):
                    data = body; break
            except ue.HTTPError as e:
                if e.code not in (400, 404, 500):
                    time.sleep(15)
            time.sleep(3)
        if data is None:
            data = fetch_url(f'https://upload.wikimedia.org/wikipedia/commons/{h}/{fn}')[0]
        ext = '.png' if fn.lower().endswith(('.png', '.svg', '.gif')) else '.jpg'
        out = PHOTO / (n + ext); out.parent.mkdir(parents=True, exist_ok=True); out.write_bytes(data)
        im = Image.open(out)
        if ext == '.jpg':
            im = im.convert('RGB'); im.thumbnail((1600, 1600)); im.save(out, quality=84, optimize=True)
        else:
            im.thumbnail((1600, 1600)); im.save(out, optimize=True)
        c[n].update({'license': lic or c[n].get('license', ''), 'author': aut, 'size': Image.open(out).size, 'checked': True})
        save(c); print(n + ext, '|', lic, '|', aut[:60]); time.sleep(3)

def search(q):
    s = fetch_url('https://commons.wikimedia.org/w/index.php?' + up.urlencode(
        {'search': q, 'title': 'Special:Search', 'ns6': 1, 'fulltext': 1, 'limit': 20}))[0].decode('utf-8')
    for block in re.findall(r'<li class="mw-search-result.*?</li>', s, re.S):
        t = re.search(r'href="/wiki/(File:[^"]+)"', block)
        if t:
            print(up.unquote(html.unescape(t.group(1))))

def lst():
    for n, v in sorted(load().items()):
        print(('저장됨 ' if local(n) else '원격   ') + n, '|', v.get('license', ''), '|', v['commons'])

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'list'
    {'search': lambda: search(sys.argv[2]), 'fetch': lambda: fetch(sys.argv[2:]), 'list': lst}[cmd]()

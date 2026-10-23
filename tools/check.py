"""자동 검사: 모든 HTML 페이지를 열어 JS 오류, 깨진 내부 링크, 화면 넘침을 확인합니다.
사용: python3 tools/check.py [폴더나 파일 ...]   (기본: 저장소 전체)
슬라이드(.deck)는 장마다 질문을 모두 펼친 상태에서 글자가 화면 밖으로 나가는지 봅니다.
사진 파일이 아직 없으면 '사진 없음'으로 따로 알립니다(오류로 세지 않음)."""
import sys, pathlib, re
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SIZES = [(1280, 720), (390, 844)]

OVERFLOW_JS = r"""() => {
  const W = innerWidth, H = innerHeight, out = [];
  const docW = document.documentElement.scrollWidth;
  if (docW > W + 1) out.push('가로 스크롤 ' + docW + 'px');
  const deck = document.querySelector('.deck');
  if (!deck) return out;
  const S = [...document.querySelectorAll('.s')];
  S.forEach((s, i) => {
    S.forEach(x => x.classList.toggle('on', x === s));
    s.querySelectorAll('.f').forEach(f => f.classList.add('show'));
    s.querySelectorAll('h2,p,b,span,small,blockquote,cite,.word,.num,.cap,.tag,.kick,.when').forEach(el => {
      if (!el.textContent.trim() || el.closest('.miss')) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0) return;
      if (r.left < -2 || r.right > W + 2 || r.top < -2 || r.bottom > H + 2)
        out.push((i + 1) + '장 넘침: "' + el.textContent.trim().slice(0, 20) + '"');
    });
  });
  return [...new Set(out)];
}"""

def pages(args):
    if not args:
        args = [str(ROOT)]
    for a in args:
        p = pathlib.Path(a).resolve()
        yield from ([p] if p.is_file() else sorted(x for x in p.rglob('*.html') if '.git' not in x.parts))

def main():
    errs = 0
    with sync_playwright() as pw:
        br = pw.chromium.launch()
        for f in pages(sys.argv[1:]):
            if f.name == 'index.html' and f.parent != ROOT and f.stat().st_size < 600: continue
            rel = f.relative_to(ROOT)
            for w, h in SIZES:
                pg = br.new_page(viewport={'width': w, 'height': h})
                probs, missing_photo = [], set()
                pg.on('pageerror', lambda e: probs.append('JS 오류: ' + str(e).splitlines()[0]))
                pg.on('console', lambda m: m.type == 'error' and not re.search(r'net::|Failed to load resource', m.text) and probs.append('콘솔: ' + m.text[:120]))
                def failed(r):
                    u = r.url
                    if not u.startswith('file://'):
                        return
                    if '/assets/photo/' in u:
                        missing_photo.add(u.rsplit('/', 1)[1])
                    else:
                        probs.append('없는 파일: ' + u.replace(ROOT.as_uri() + '/', ''))
                pg.on('requestfailed', failed)
                pg.route(re.compile(r'^https?://'), lambda r: r.abort())
                pg.goto(f.as_uri())
                pg.wait_for_timeout(300)
                probs += pg.evaluate(OVERFLOW_JS)
                # 내부 링크
                for href in pg.eval_on_selector_all('a[href]', 'els => els.map(e => e.getAttribute("href"))'):
                    if re.match(r'^(https?:|mailto:|#)', href):
                        continue
                    t = (f.parent / href.split('#')[0]).resolve()
                    if not t.exists():
                        probs.append('깨진 링크: ' + href)
                pg.close()
                probs = sorted(set(probs))
                if probs:
                    errs += len(probs)
                    print(f'✗ {rel} [{w}×{h}]')
                    for p in probs:
                        print('   ', p)
                if missing_photo and w == SIZES[0][0]:
                    print(f'  사진 없음 {rel}: {", ".join(sorted(missing_photo))}')
        br.close()
    print('문제 없음' if not errs else f'문제 {errs}건')
    sys.exit(1 if errs else 0)

if __name__ == '__main__':
    main()

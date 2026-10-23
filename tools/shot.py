"""단원 확인용 스크린샷 1장: 여러 화면을 2×2로 모읍니다.
사용: python3 tools/shot.py 출력.png "경로#해시[|동작]" ... (최대 4개)
동작: click:선택자 또는 key:키이름 을 쉼표로 이어 씀. 예) "m1/basics/sim.html#1|click:#bRun1" """
import sys, pathlib
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parent.parent
out, specs = sys.argv[1], sys.argv[2:6]
files = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for i, sp in enumerate(specs):
        path, _, acts = sp.partition('|'); url, _, h = path.partition('#')
        pg = b.new_page(viewport={'width': 1280, 'height': 720})
        pg.goto((ROOT / url).as_uri() + ('#' + h if h else '')); pg.wait_for_timeout(700)
        for a in filter(None, acts.split(',')):
            k, _, v = a.partition(':')
            if k == 'click': pg.click(v)
            elif k == 'key': pg.keyboard.press(v)
            pg.wait_for_timeout(250)
        pg.wait_for_timeout(500); f = f'{out}.{i}.png'; pg.screenshot(path=f); files.append(f); pg.close()
    b.close()
ims = [Image.open(f) for f in files]; o = Image.new('RGB', (2560, 1440), 'black')
for i, im in enumerate(ims): o.paste(im, ((i % 2) * 1280, (i // 2) * 720))
o.resize((1600, 900)).save(out); print(out)

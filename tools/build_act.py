"""활동 화면 만들기: tools/decks/<책>_<단원>.py 의 ACTS 를 읽어 <책>/<단원>/act.html 을 씁니다.
사용: python3 tools/build_act.py tools/decks/m1_others.py
ACTS = [ {lesson:N, title:'활동 이름', q:'안내 한 줄', [philo:'철학자 id'], blocks:[{k:'vote', ...}, ...]} ... ]
블록 종류와 칸은 assets/kit.js 맨 위 설명을 봅니다.
RAW_ACT = 'tools/decks/raw/파일.html' 이 있으면 손으로 만든 패널(<section class="panel">…와 <script>)을 그대로 이어 붙입니다."""
import sys, json, html, pathlib, runpy
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
from build_deck import SHELL, FONTS
import philo_data
E = lambda s: html.escape(s, quote=True)

def build(path):
    m = runpy.run_path(path)
    if not m.get('ACTS'): return   # 활동을 손으로 만든 단원(도덕① Ⅰ)은 건드리지 않는다
    book, unit, uno, back = m['BOOK'], m['UNIT'], m['UNO'], m['BACK']
    unit_title = m.get('UNIT_TITLE', '')
    panels = []
    for A in m.get('ACTS', []):
        ph = ''
        if A.get('philo'):
            P = philo_data.PHILO[A['philo']]
            ph = f'<a class="philo-link" href="../../philo/{A["philo"]}.html" style="--pc:{P["color"]}">{P["emoji"]} 철학자와 도란도란 · {E(philo_data.wa(P["name"]))} 톡 하기</a>'
        data = json.dumps(A['blocks'], ensure_ascii=False).replace('</', '<\\/')
        panels.append((A['lesson'], f'''
<section class="panel" data-lesson="{A["lesson"]}">
  <h1>{E(A["title"])}</h1>
  <p class="q">{E(A["q"])}</p>{ph}
  <script type="application/json" class="kit">{data}</script>
</section>'''))
    raw = ''
    if m.get('RAW_ACT'):
        raw = (ROOT / m['RAW_ACT']).read_text(encoding='utf-8')
    panels.sort(key=lambda x: x[0])
    extra_css = m.get('RAW_ACT_CSS', '')
    doc = f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>활동 · {E(back)} {uno}단원 {E(unit_title)}</title>
{FONTS}
{SHELL('../../')}
<link rel="stylesheet" href="../../assets/act.css">
<link rel="stylesheet" href="../../assets/kit.css">
</head>
<body>
<div class="top"><a href="../../index.html#{book}">← {E(back)} 목록</a><nav id="nav"></nav></div>
''' + ''.join(p for _, p in panels) + '\n' + raw + '''
<script src="../../assets/kit.js"></script>
<script src="../../assets/act.js"></script>
</body>
</html>
'''
    (ROOT / book / unit / 'act.html').write_text(doc, encoding='utf-8')
    print(f'{book}/{unit}/act.html  {len(panels)}개 활동' + (' + 손으로 만든 패널' if raw else ''))

if __name__ == '__main__':
    for p in sys.argv[1:]: build(p)

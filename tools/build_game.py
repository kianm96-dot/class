"""단원 게임 만들기: tools/decks/<책>_<단원>.py 의 GAME 을 읽어 <책>/<단원>/<GAME.href> 를 씁니다(분류 게임, assets/game-sort.js).
GAME = {'href':'app-xxx.html', 'title':'게임 이름', 'rounds': {키: {name, q, bins:[[이름,설명]...], cards:[[문장, 답 번호, 해설]...]}}}"""
import sys, json, html, pathlib, runpy
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
from build_deck import SHELL, FONTS
E = lambda s: html.escape(s, quote=True)

def build(path):
    m = runpy.run_path(path)
    G = m.get('GAME')
    if not G: return
    book, unit, back = m['BOOK'], m['UNIT'], m['BACK']
    data = json.dumps(G['rounds'], ensure_ascii=False, indent=0).replace('</', '<\\/')
    doc = f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>게임 · {E(G["title"])}</title>
{FONTS}
{SHELL('../../')}
<link rel="stylesheet" href="../../assets/game.css">
</head>
<body>
<div class="top"><a href="../../index.html#{book}">← {E(back)} 목록</a><div class="rounds" id="rounds"></div></div>
<main>
  <h1>{E(G["title"])}</h1>
  <p class="q" id="q"></p>
  <div class="hud"><span>맞힌 수 <b id="score">0</b></span><span>연속 <b id="streak">0</b></span><span>남은 카드 <b id="left">0</b></span></div>
  <div class="card" id="card"></div>
  <div class="bins" id="bins"></div>
  <div class="flash" id="flash" aria-live="polite"></div>
  <p class="how">단추를 누르거나, 키보드 ← → (세 칸 이상일 때 숫자 1~5)로 고릅니다. 모둠 대결로 할 때는 판마다 점수를 칠판에 적습니다.</p>
  <div class="review" id="review" hidden></div>
</main>
<script>
window.R={data};
</script>
<script src="../../assets/game-sort.js"></script>
</body>
</html>
'''
    (ROOT / book / unit / G['href']).write_text(doc, encoding='utf-8')
    print(f'{book}/{unit}/{G["href"]}  {len(G["rounds"])}판')

if __name__ == '__main__':
    for p in sys.argv[1:]: build(p)

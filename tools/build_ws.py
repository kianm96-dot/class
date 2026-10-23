"""학습지 만들기: tools/decks/<책>_<단원>.py 의 WORKSHEET 를 읽어 <책>/<단원>/worksheet.html 을 씁니다.
사용: python3 tools/build_ws.py tools/decks/m1_self.py
차시마다 첫 면(id 가 없는 면) 앞에 ‘요점 정리 · 교과서 개념 채우기’ 면(id lNc)이 붙습니다(양면 인쇄하면 앞면 개념, 뒷면 활동).
교과서 학습지(한글 파일)의 요점 정리 · 1분 체크와 같은 문장 · 같은 빈칸이며, 개념 장(TB concept)과 CHECK 에서 만듭니다. TB 의 개념 장(concept)에서 만들어
슬라이드와 같은 번호(①②…)의 빈칸이 되므로, 슬라이드를 넘기며 학습지 빈칸을 하나씩 함께 채울 수 있습니다.
WORKSHEET = [ {lesson:N, [id:'l2p'], [kick:' · 추가 활동지'], title:'제목', std:'성취기준 코드', q:'오늘의 질문', parts:[{h:'제목', items:[...]}...], src:'출처 줄'} ... ]
items:
  ('p', '문장 {{답}} 문장')                  빈칸 문장 (답은 정답 보기 때만)
  ('case', '사례 제목', '사례 글')            실제 사례 상자
  ('qa', [(꼬리표, 질문, 예시답)...])          표 형식 묻고 답하기
  ('table', [머리...], [[칸...]...])          표. '='로 시작하는 칸은 정답 칸
  ('lines', 줄 수, '예시 답')                 쓰는 줄
  ('photo', 사진이름, [(꼬리표, 예시답)...])    사진 + 표
  ('scale', ['문장', ...])                    나를 돌아보는 1~5 척도
  ('choice', '상황', ['선택지', ...])          고르고 까닭 쓰기
  ('write', '앞말', '뒷말')                   한 문장 쓰기
"""
import sys, html, re, pathlib, runpy
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
from build_deck import SHELL, credit, src_of, FONTS, fills, circ, concept_items, is_sub
STD = {}
for line in (ROOT / 'assets/standards.js').read_text(encoding='utf-8').splitlines():
    m = re.match(r"'([^']+)':'(.*)',?$", line)
    if m: STD[m.group(1)] = m.group(2)
E = lambda s: html.escape(s, quote=True)

def blanks(s):
    out, pos = '', 0
    for m in re.finditer(r'\{\{(.*?)\}\}', s):
        out += E(s[pos:m.start()]); a = m.group(1)
        w = min(110, max(22, len(a) * 4))
        out += f'<span class="blank" style="min-width:min({w}mm,100%)"><span class="ans">{E(a)}</span></span>'
        pos = m.end()
    return out + E(s[pos:])

def item(it):
    k = it[0]
    if k == 'p': return f'<p>{blanks(it[1])}</p>'
    if k == 'case': return f'<div class="case"><b>{E(it[1])}</b><p>{E(it[2])}</p></div>'
    if k == 'qa':
        return '<table class="grid">' + ''.join(f'<tr><th>{E(a)}</th><td>{E(q)}<p class="ans">{E(x)}</p></td></tr>' for a, q, x in it[1]) + '</table>'
    if k == 'table':
        head = '<tr>' + ''.join(f'<th style="width:auto">{E(h)}</th>' for h in it[1]) + '</tr>'
        body = ''.join('<tr>' + ''.join(f'<td><span class="ans">{E(c[1:])}</span></td>' if c.startswith('=') else f'<td style="height:auto">{E(c)}</td>' for c in r) + '</tr>' for r in it[2])
        return f'<table class="grid">{head}{body}</table>'
    if k == 'lines':
        return '<div class="lines"></div>' * it[1] + (f'<p class="ans">예시: {E(it[2])}</p>' if len(it) > 2 and it[2] else '')
    if k == 'photo':
        rows = ''.join(f'<tr><th>{E(a)}</th><td><span class="ans">{E(x)}</span></td></tr>' for a, x in it[2])
        return (f'<div class="photo"><figure><img src="{E(src_of(it[1]))}" alt="" loading="lazy"><div class="miss">사진</div>'
                f'<figcaption>{E(credit(it[1]))}</figcaption></figure><table class="grid">{rows}</table></div>')
    if k == 'scale':
        rows = ''.join(f'<tr><td style="height:auto">{E(s)}</td>' + ''.join(f'<td class="c">{n}</td>' for n in '①②③④⑤') + '</tr>' for s in it[1])
        return ('<table class="grid scale"><tr><th style="width:auto">나를 돌아보기</th><th class="c">전혀</th><th class="c">조금</th><th class="c">보통</th><th class="c">자주</th><th class="c">늘</th></tr>'
                + rows + '</table>')
    if k == 'choice':
        opts = ''.join(f'<span class="opt">□ {E(o)}</span>' for o in it[2])
        return f'<div class="choice"><p>{E(it[1])}</p><div>{opts}</div><p class="why">까닭: <span class="blank" style="min-width:min(130mm,100%)">&nbsp;</span></p></div>'
    if k == 'write':
        return (f'<div class="write">{E(it[1])} <span class="blank" style="min-width:min(30mm,100%)">&nbsp;</span>{E(it[2])}<br>'
                f'왜냐하면 <span class="blank" style="min-width:min(110mm,100%)">&nbsp;</span>.</div>')
    raise SystemExit('모르는 항목: ' + k)

def concept_part(tb, check):
    """학습지 ‘요점 정리’와 같은 꼴: ■ 제목, 줄마다 번호 빈칸(슬라이드와 같은 번호), 끝에 1분 체크."""
    ctr = [0]
    mk = lambda n, a: f'<span class="blank nb" style="min-width:min({min(90, max(16, len(a) * 4.2))}mm,100%)"><i>{circ(n)}</i><span class="ans">{E(a)}</span></span>'
    rows, last = '', None
    for h, pg, items in concept_items(tb):
        h = h.replace(' (이어서)', '')
        if h != last:
            rows += f'<h3>■ {E(h)}' + (f' <small>교과서 {E(str(pg))}쪽</small>' if pg else '') + '</h3>'
        last = h
        for x in items:
            if x[0]: rows += f'<p class="cp">{fills(x[0], ctr, mk)}: {fills(x[1], ctr, mk)}</p>'
            else: rows += f'<p class="cp{" sub" if is_sub(x[1]) else ""}">{fills(x[1], ctr, mk)}</p>'
    if not rows: return ''
    out = f'<section class="part concept"><h2><i>📖</i>요점 정리 · 교과서 개념 채우기</h2>{rows}</section>'
    if check:
        out += ('<section class="part check"><h2><i>⏱️</i>1분 체크</h2><ol>' + ''.join(
            f'<li>{E(q)} <span class="ox">( ○ / ✕ )</span> <span class="ans">{"○" if t else "✕"}</span></li>' for q, t in check) + '</ol></section>')
    k = sum(len(it) for _, _, it in concept_items(tb)) + len(check or [])   # 자리가 남는 차시만 ‘내 사례로 설명하기’
    if k <= 10:
        out += ('<section class="part"><h2><i>🔍</i>내 사례로 설명하기</h2><p>오늘 채운 개념 하나를 골라, 내 경험이나 주변에서 본 일로 설명해 보자.</p>'
                '<p>고른 개념: <span class="blank" style="min-width:min(50mm,100%)">&nbsp;</span></p>' + '<div class="lines"></div>' * (3 if k <= 8 else 2) + '</section>')
    return out

def build(path):
    m = runpy.run_path(path)
    TB = m.get('TB', {})
    book, unit, uno, back = m['BOOK'], m['UNIT'], m['UNO'], m['BACK']
    unit_title = m.get('UNIT_TITLE', m['TAG'].split('·')[-1].strip())
    def sheet(id, n, kick, title, stds, q, parts, src='', cls=''):
        return f'''
<article class="sheet{cls}" id="{id}">
  <header>
    <div><div class="kicker">{E(back)} · {E(unit_title)} · {n}차시{E(kick)}</div><h1>{E(title)}</h1></div>
    <div class="who"><span>학년</span><span>반</span><span>번호</span><span>이름</span></div>
  </header>
  {''.join(f'<p class="std">[{s}] {E(STD.get(s, ""))}</p>' for s in stds)}
  <div class="big-q"><b>오늘의 질문</b>{E(q)}</div>
  {parts}
  {f'<p class="src-list">{E(src)}</p>' if src else ''}
</article>'''
    sheets = ''
    for W in m['WORKSHEET']:
        n, stds = W['lesson'], W['std'] if isinstance(W['std'], list) else [W['std']]
        cp = concept_part(TB[n], m.get('CHECK', {}).get(n)) if 'id' not in W and n in TB else ''
        if cp:   # 앞면: 슬라이드와 함께 채우는 개념 빈칸 · 뒷면: 활동
            sheets += sheet(f'l{n}c', n, ' · 개념 채우기', W['title'], stds, W['q'], cp, cls=' cpage')
        parts = ''.join(f'<section class="part"><h2><i>{i}</i>{E(p["h"])}</h2>' + ''.join(item(x) for x in p['items']) + '</section>'
                        for i, p in enumerate(W['parts'], 1))
        sheets += sheet(W.get('id', f'l{n}'), n, W.get('kick', ''), W['title'], stds, W['q'], parts, W.get('src', ''))
    doc = f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>학습지 · {E(back)} {uno}단원 {E(unit_title)}</title>
{FONTS}
{SHELL('../../')}
<link rel="stylesheet" href="../../assets/worksheet.css">
</head>
<body>
<div class="bar"><a href="../../index.html#{book}">← {E(back)} 목록</a><div class="tools"><button id="bAns" type="button" aria-pressed="false">예시 답 보기</button><button id="bPrint" type="button">인쇄하기</button></div></div>
<main class="sheets">{sheets}
</main>
<script src="../../assets/worksheet.js"></script>
</body>
</html>
'''
    (ROOT / book / unit / 'worksheet.html').write_text(doc, encoding='utf-8')
    print(f"{book}/{unit}/worksheet.html  {sheets.count('<article')}면")

if __name__ == '__main__':
    for p in sys.argv[1:]: build(p)

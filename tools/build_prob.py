"""차시별 문제 만들기: tools/prob/<책>_<단원>.py 의 PROB 를 읽어 <책>/<단원>/probN.html 을 씁니다.
사용: python3 tools/build_prob.py tools/prob/m2_society.py   (인자 없이 실행하면 전체)

PROB = {차시: [문항 12개]}  — 순서대로 하 3 · 중 3 · 상 3 · 극상 3(합답형 2 + 서술형 1)
  ('mc', 발문, [보기 5개], 정답 번호(0부터), 해설)          다섯 고르기 하나
  ('box', 발문, [ㄱ, ㄴ, ㄷ, ㄹ 진술], 옳은 것 번호들(예 (0, 2)), 해설)   <보기>에서 옳은 것만 고른 합답형
  ('essay', 발문, 모범 답안, 채점 기준)                        서술형
발문 안의 줄바꿈(\n) 뒤는 자료 상자(사례·대화)로 보여 줍니다.
정답·해설·빠른 정답표는 class="ans" 라서 [정답 보기] 전에는 숨고, 교사 잠금 서버에서는 학생에게 아예 지워져 갑니다.
"""
import sys, html, pathlib, runpy, re, random, zlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
from build_deck import FONTS, SHELL
E = lambda s: html.escape(s, quote=True)
NUM, KO = '①②③④⑤', 'ㄱㄴㄷㄹ'
LEVEL = ['하', '하', '하', '중', '중', '중', '상', '상', '상', '극상', '극상', '극상']

def stem(q):
    head, _, data = q.partition('\n')
    return f'<p class="qs">{E(head)}</p>' + (f'<div class="qd">{"<br>".join(E(x) for x in data.split(chr(10)))}</div>' if data else '')

def combos(right, q):
    # 합답형 보기 다섯: 정답 짝 + 문항마다 정해진 규칙으로 고른 오답 짝 넷(2~3개 묶음), 짧은 것부터 차례로
    from itertools import combinations
    right = tuple(sorted(right))
    pool = [c for k in (2, 3) for c in combinations(range(4), k) if c != right]
    random.Random(zlib.crc32(q.encode()) + 7).shuffle(pool)
    c = sorted(pool[:4] + [right], key=lambda x: (len(x), x))
    return c, c.index(right)

def mix(q, n):
    # 보기 순서를 문항마다 정해진 규칙으로 섞는다(다시 만들어도 같은 순서). 원고에서는 정답을 아무 자리에나 써도 된다.
    order = list(range(n)); random.Random(zlib.crc32(q.encode())).shuffle(order); return order

def item(no, it):
    k = it[0]
    if k == 'mc':
        _, q, opts, a, why = it
        assert len(opts) == 5 and 0 <= a < 5, q
        o = mix(q, 5); opts, a = [opts[i] for i in o], o.index(a)
        body = stem(q) + '<ol class="op">' + ''.join(f'<li><b>{NUM[i]}</b>{E(o)}</li>' for i, o in enumerate(opts)) + '</ol>'
        ans, key = f'정답 {NUM[a]}', NUM[a]
    elif k == 'box':
        _, q, st, right, why = it
        o = mix(q, len(st)); st, right = [st[i] for i in o], [o.index(r) for r in right]
        why = re.sub('[ㄱㄴㄷㄹ]', lambda m: KO[o.index(KO.index(m.group()))], why)
        c, a = combos(right, q)
        body = (stem(q) + '<div class="bx"><b>&lt;보기&gt;</b>' + ''.join(f'<p><b>{KO[i]}.</b> {E(s)}</p>' for i, s in enumerate(st)) + '</div>'
                + '<ol class="op">' + ''.join(f'<li><b>{NUM[i]}</b>{", ".join(KO[j] for j in x)}</li>' for i, x in enumerate(c)) + '</ol>')
        ans, key = f'정답 {NUM[a]} ({", ".join(KO[j] for j in sorted(right))})', NUM[a]
    elif k == 'essay':
        _, q, model, rubric = it
        body = stem(q) + '<div class="lines"></div>' * 4
        why = f'모범 답안: {model}'
        ans, key = '서술형', '서술형'
        return (f'<div class="q essay"><div class="qn"><b>{no}</b><i class="lv">{LEVEL[no - 1]}</i></div><div class="qb">{body}'
                f'<div class="ans sol"><b>예시 답</b> {E(model)}<br><b>채점 기준</b> {E(rubric)}</div></div></div>'), key
    else:
        raise SystemExit('모르는 문항: ' + k)
    return (f'<div class="q"><div class="qn"><b>{no}</b><i class="lv">{LEVEL[no - 1]}</i></div><div class="qb">{body}'
            f'<div class="ans sol"><b>{E(ans)}</b> {E(why)}</div></div></div>'), key

CSS = '''<style>
.sheet{gap:3mm}
.lvh{font:13px var(--serif);color:#fff;background:var(--leaf);border-radius:999px;padding:1px 12px;align-self:flex-start;margin-top:2mm}
.lvh.l2{background:#f0a23a}.lvh.l3{background:#4a9eff}.lvh.l4{background:#7b5cd6}
.q{display:grid;grid-template-columns:12mm 1fr;gap:2mm;break-inside:avoid;page-break-inside:avoid;padding:1.5mm 0;border-top:1px dashed var(--line)}
.qn{display:flex;flex-direction:column;align-items:center;gap:1mm}.qn b{font:20px var(--serif)}
.lv{font-style:normal;font-size:10px;color:var(--dim);border:1px solid var(--line);border-radius:999px;padding:0 5px;white-space:nowrap}
.qs{margin:0;font-size:13.5px;font-weight:700}
.qd{margin:1.5mm 0 0;border-left:3px solid var(--line);background:#faf7f1;padding:2mm 3.5mm;font-size:12.5px}
.bx{margin:1.5mm 0 0;border:1px solid var(--ink);padding:2mm 4mm;font-size:12.5px}.bx>b{display:block;text-align:center;font-size:12px}.bx p{margin:.5mm 0}
.op{list-style:none;margin:1.5mm 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,58mm),1fr));gap:1mm 4mm;font-size:12.5px}
.op li{display:flex;gap:1.5mm}.op b{font-weight:700}
.sol{margin-top:1.5mm;font-size:12px;background:#fff4f1;border-radius:6px;padding:1.5mm 3mm}
.keys{display:grid;grid-template-columns:repeat(6,1fr);border:1px solid var(--line);font-size:12px;margin-top:2mm}
.keys span{border:1px solid var(--line);padding:1mm 2mm;text-align:center}
@media print{.q{break-inside:avoid}}
</style>'''

def build(path):
    m = runpy.run_path(path)
    book, unit = m['BOOK'], m['UNIT']
    deck = runpy.run_path(str(ROOT / 'tools' / 'decks' / f'{book}_{unit}.py'))
    back, uno = deck['BACK'], deck['UNO']
    unit_title = deck.get('UNIT_TITLE', deck['TAG'].split('·')[-1].strip())
    titles = {L.get('n', i): L['title'] for i, L in enumerate(deck['LESSONS'], 1)}
    out = ROOT / book / unit
    for n, Q in sorted(m['PROB'].items()):
        assert len(Q) == 12 and [x[0] for x in Q[9:]] == ['box', 'box', 'essay'], f'{path} {n}차시: 12문항 형식이 아님'
        rows, keys = [], []
        for i, it in enumerate(Q, 1):
            h, k = item(i, it); keys.append(k)
            if i in (1, 4, 7, 10):
                rows.append(f'<div class="lvh l{(i + 2) // 3}">{["하 · 기본 개념", "중 · 개념 적용", "상 · 자료 해석과 추론", "극상 · 종합 사고와 서술"][(i - 1) // 3]}</div>')
            rows.append(h)
        key = '<div class="ans"><b style="font-size:12px">빠른 정답</b><div class="keys">' + ''.join(f'<span>{i} {k}</span>' for i, k in enumerate(keys, 1)) + '</div></div>'
        doc = f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{n}차시 문제 · {E(titles[n])} · {E(back)} {uno}단원</title>
{FONTS}
{SHELL('../../')}
<link rel="stylesheet" href="../../assets/worksheet.css">
{CSS}
</head>
<body>
<div class="bar"><a href="../../index.html#{book}">← {E(back)} 목록</a><div class="tools"><button id="bAns" type="button" aria-pressed="false">정답 보기</button><button id="bPrint" type="button">인쇄하기</button></div></div>
<main class="sheets">
<article class="sheet">
  <header>
    <div><div class="kicker">{E(back)} · {E(unit_title)} · {n}차시 문제</div><h1>{E(titles[n])}</h1></div>
    <div class="who"><span>학년</span><span>반</span><span>번호</span><span>이름</span></div>
  </header>
  {''.join(rows)}
  {key}
</article>
</main>
<script src="../../assets/worksheet.js"></script>
</body>
</html>
'''
        (out / f'prob{n}.html').write_text(doc, encoding='utf-8')
    print(f'{book}/{unit}/prob*.html  {len(m["PROB"])}차시')

if __name__ == '__main__':
    files = sys.argv[1:] or sorted(str(p) for p in (ROOT / 'tools' / 'prob').glob('m*.py'))
    for f in files: build(f)

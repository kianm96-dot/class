"""수업 슬라이드 만들기: tools/decks/<책>_<단원>.py 의 LESSONS 를 읽어 <책>/<단원>/slidesN.html 을 씁니다.
사용: python3 tools/build_deck.py tools/decks/m1_self.py
장 종류(type):
  cover   photo, word, small, [tag]                 표지: 사진 + 큰 낱말
  q       h2, lad                                   관통 발문(따옴표) / 질문 사다리
  big     h2, [lad], [num], [size]                  큰 낱말·질문 한 줄 (사진 없음)
  photoq  photo, h2, [lad], [fit]                   사진 + 오른쪽 위 질문
  photow  photo, word, [small], [fit]               사진 + 왼쪽 아래 큰 낱말
  trio    items=[(낱말,작은글)...], [h2], [size]     낱말 묶음(클릭마다 하나)
  pair    photos=[(사진,낱말)...], h2               두 사진 견주기
  case    [photo], when, h2, facts=[(꼬리표,글)...], ask   실제 사례 카드(사진이 없으면 가운데 카드)
  dilemma sit, [small], a=(낱말,글), b=(낱말,글), ask  딜레마: 상황 → 두 선택지 → 질문
  quote   photo, text, who, [lad]                   사상가의 말: 왼쪽 초상 + 오른쪽 인용
  nums    h2, items=[(숫자,설명)...]                 숫자 견주기(클릭마다 하나)
  end     a, b                                      한 문장 쓰기: a ___ b. 왜냐하면 ___.
모든 장: note(교사 메모 HTML). lad = [(꼬리표, 질문)...] 꼬리표가 ''이면 질문만.
사진: assets/photo/credits.json 의 이름. 저장된 파일이 있으면 그것을, 없으면 위키미디어 공용에서 불러옵니다.
사진 출처는 credits.json 의 credit 와 license 로 자동 표기합니다."""
import sys, json, html, pathlib, runpy
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
import photo as PH
CRED = PH.load()
E = lambda s: html.escape(s, quote=True)

def credit(ph):
    c = CRED.get(ph)
    if not c: raise SystemExit('credits.json 에 없음: ' + ph)
    return c['credit'] + ' · ' + (c.get('license') or '위키미디어 공용 · 이용 조건은 원본 페이지')

def src_of(ph, depth='../../'):
    f = PH.local(ph)
    return depth + 'assets/photo/' + f if f else PH.remote(ph)

def img(ph, alt, fit):
    credit(ph)
    return (f'<div class="ph{" cover" if fit == "cover" else ""}"><img data-src="{E(src_of(ph))}" alt="{E(alt)}">'
            f'<div class="miss">사진 · {E(alt)}<small>인터넷 연결을 확인하세요</small></div></div>')

def lad(items, cls='lad'):
    if not items: return ''
    return f'<div class="{cls}">' + ''.join(f'<p class="f">{"<b>"+E(a)+"</b>" if a else ""}{E(b)}</p>' for a, b in items) + '</div>'

def h2(t): return E(t).replace('\n', '<br>')

def slide(s, meta):
    t, note = s['type'], s.get('note', '')
    srcs, body = [], ''
    if t == 'cover':
        body = img(s['photo'], s.get('alt', s['word']), s.get('fit', 'cover')) + \
               f'<div class="tag">{E(s.get("tag", meta["tag"]))}</div><div class="word">{E(s["word"])}<small>{E(s.get("small", meta["title"]))}</small></div>'
        srcs = [s['photo']]
    elif t == 'q':
        body = f'<div class="q"><span class="mark">“</span><h2>{h2(s["h2"])}</h2>{lad(s.get("lad"))}</div>'
    elif t == 'big':
        size = s.get('size')
        st = f' style="font-size:min({size}vw,{int(size*12)}px);font-weight:900"' if size else ''
        num = f'<div class="num">{E(s["num"])}</div>' if s.get('num') else ''
        mt = ' style="margin-top:2vh"' if num and not size else st
        body = f'<div class="center"><div class="q">{num}<h2{mt}>{h2(s["h2"])}</h2>{lad(s.get("lad"))}</div></div>'
    elif t == 'photoq':
        body = img(s['photo'], s.get('alt', s['h2']), s.get('fit', 'cover')) + \
               f'<div class="onphoto"><h2>{h2(s["h2"])}</h2>{lad(s.get("lad"))}</div>'
        srcs = [s['photo']]
    elif t == 'photow':
        body = img(s['photo'], s.get('alt', s['word']), s.get('fit', 'cover')) + \
               f'<div class="word">{E(s["word"])}' + (f'<small>{E(s["small"])}</small>' if s.get('small') else '') + '</div>'
        srcs = [s['photo']]
    elif t == 'trio':
        size = s.get('size')
        bst = f' style="font-size:min({size}vw,{int(size*12)}px)"' if size else ''
        items = ''.join(f'<div class="f"><b{bst}>{E(a)}</b><span>{E(b)}</span></div>' for a, b in s['items'])
        if s.get('h2'):
            body = f'<div class="center"><div class="q"><h2>{h2(s["h2"])}</h2><div class="trio" style="margin-top:6vh">{items}</div></div></div>'
        else:
            body = f'<div class="trio">{items}</div>'
    elif t == 'pair':
        cells = ''.join(img(p, s.get('alts', [c, c])[i], 'cover').replace('</div></div>', f'</div><div class="cap">{E(c)}</div></div>', 1)
                        for i, (p, c) in enumerate(s['photos']))
        body = f'<div class="pair">{cells}</div><div class="center" style="pointer-events:none"><div class="onphoto" style="position:static;text-align:center;max-width:none"><h2>{h2(s["h2"])}</h2></div></div>'
        srcs = [p for p, _ in s['photos']]
    elif t == 'case':
        card = (f'<div class="case{"" if s.get("photo") else " solo"}"><div class="kick">{E(s.get("kick", "실제 사례"))}</div>'
                f'<div class="when">{E(s["when"])}</div><h2>{h2(s["h2"])}</h2>{lad(s.get("facts"))}'
                + (f'<p class="ask f">{E(s["ask"])}</p>' if s.get('ask') else '') + '</div>')
        if s.get('photo'):
            body = img(s['photo'], s.get('alt', s['h2']), s.get('fit', 'cover')).replace('class="ph"', 'class="ph right"', 1) + card
            srcs = [s['photo']]
        else:
            body = f'<div class="center">{card}</div>'
    elif t == 'dilemma':
        (an, at), (bn, bt) = s['a'], s['b']
        body = (f'<div class="center"><div class="dil"><div class="sit">{h2(s["sit"])}' + (f'<small>{E(s["small"])}</small>' if s.get('small') else '') + '</div>'
                f'<div class="opts"><div class="opt f"><b>{E(an)}</b><span>{E(at)}</span></div><div class="opt f"><b>{E(bn)}</b><span>{E(bt)}</span></div></div>'
                + (f'<p class="ask f">{E(s["ask"])}</p>' if s.get('ask') else '') + '</div></div>')
    elif t == 'quote':
        body = (f'<div class="quote">{img(s["photo"], s.get("alt", s["who"]), s.get("fit", "cover"))}'
                f'<div class="say"><span class="mark">“</span><blockquote>{h2(s["text"])}</blockquote><cite>{E(s["who"])}</cite>{lad(s.get("lad"))}</div></div>')
        srcs = [s['photo']]
    elif t == 'nums':
        items = ''.join(f'<div class="f"><b>{E(a)}</b><span>{E(b)}</span></div>' for a, b in s['items'])
        body = f'<div class="center"><div class="q"><h2>{h2(s["h2"])}</h2><div class="nums">{items}</div></div></div>'
    elif t == 'end':
        body = f'<div class="center"><div class="q"><span class="mark">“</span><h2>{E(s["a"])} <span class="fill">&nbsp;</span>{E(s["b"])}<br>왜냐하면 <span class="fill" style="min-width:7em">&nbsp;</span>.</h2></div></div>'
    else:
        raise SystemExit('모르는 장 종류: ' + t)
    src = f'<div class="src">{E(" / ".join(credit(p) for p in srcs))}</div>' if srcs else ''
    return f'<section class="s" data-note="{E(note)}">\n  {body}\n  {src}\n</section>\n'

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jua&family=Gowun+Dodum&display=swap">')

def build(path):
    m = runpy.run_path(path)
    book, unit, uno, tag, back = m['BOOK'], m['UNIT'], m['UNO'], m['TAG'], m['BACK']
    out = ROOT / book / unit; out.mkdir(parents=True, exist_ok=True)
    for i, L in enumerate(m['LESSONS'], 1):
        i = L.get('n', i)
        meta = {'tag': tag, 'title': L['title']}
        n = len(L['slides'])
        if not 9 <= n <= 15: print(f'  주의: {i}차시 {n}장')
        if L['slides'][-1]['type'] != 'end': print(f'  주의: {i}차시 마지막 장이 한 문장 쓰기가 아님')
        doc = f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{E(L["title"])} · {E(back)} {uno}단원 {i}차시</title>
{FONTS}
<link rel="stylesheet" href="../../assets/deck.css">
</head>
<body>
<a class="home" href="../../index.html#{book}">← {E(back)} 목록</a>
<div class="help"><button id="bN" type="button">발문 메모 (N)</button><button id="bF" type="button">전체 화면 (F)</button></div>
<main class="deck" id="deck">
''' + ''.join(slide(s, meta) for s in L['slides']) + '''</main>
<div class="bar" id="bar"></div><div class="hud" id="hud"></div>
<aside class="notes" id="notes"></aside>
<script src="../../assets/deck.js"></script>
</body>
</html>
'''
        (out / f'slides{i}.html').write_text(doc, encoding='utf-8')
        print(f'{book}/{unit}/slides{i}.html  {n}장')

if __name__ == '__main__':
    for p in sys.argv[1:]: build(p)

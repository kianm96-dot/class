"""수업 슬라이드 만들기: tools/decks/<책>_<단원>.py 의 LESSONS 를 읽어 <책>/<단원>/slidesN.html 을 씁니다.
사용: python3 tools/build_deck.py tools/decks/m1_self.py
장 종류(type):
  cover   photo|emoji, word, small, [tag]           표지: 사진(또는 큰 그림 글자) + 큰 낱말
  q       h2, lad                                   관통 발문(따옴표) / 질문 사다리
  big     h2, [lad], [num], [size]                  큰 낱말·질문 한 줄 (사진 없음)
  photoq  photo, h2, [lad], [fit]                   사진 + 오른쪽 위 질문
  photow  photo, word, [small], [fit]               사진 + 왼쪽 아래 큰 낱말
  trio    items=[(낱말,작은글)...], [h2], [size]     낱말 묶음(클릭마다 하나)
  pair    photos=[(사진,낱말)...], h2               두 사진 견주기
  case    [photo], when, h2, facts=[(꼬리표,글)...], ask   실제 사례 카드(사진이 없으면 가운데 카드)
  dilemma sit, [small], a=(낱말,글), b=(낱말,글), ask  딜레마: 상황 → 두 선택지 → 질문
  quote   photo|emoji, text, who, [lad]             사상가의 말: 왼쪽 초상(또는 그림 글자) + 오른쪽 인용
  philo   who(철학자 id), [h2]                       철학자와 도란도란: 철학자 카드 + ‘철학자 톡’ 바로 가기 (tools/philo_data.py)
  nums    h2, items=[(숫자,설명)...]                 숫자 견주기(클릭마다 하나)
  end     a, b                                      한 문장 쓰기: a ___ b. 왜냐하면 ___.
  ── 교과서 흐름 (차시에 'tb' 목록이 있으면 표지 + tb + 마지막 한 문장 쓰기로 장을 엮습니다) ──
  goal    pg, goals=[...]                          학습 목표
  tb      pg, [kind], h2, [sit], [steps=[...]]       교과서 활동(생각 열기 · 탐구하기 · 나의 성찰 · 특별 활동 …): 상황 → 물음 → 단계
  concept pg, h2(소단원), items=[(낱말, 뜻, [사례])...]  교과서 본문 개념. 뜻의 {{답}}은 학습지와 같은 번호의 빈칸으로,
                                                    클릭마다 하나씩 채워지고 사례(💡)가 뒤따릅니다. 학습지 ‘교과서 개념 채우기’도 여기서 만듭니다
  keep    i, [pg], [kind]                           원래 slides 의 i번째 장을 끼움. pg 가 없으면 ‘➕ 더해 보기’ 표시
  check   (자동) CHECK[차시] = [(문장, 맞으면 True)...] 학습지 ‘1분 체크’ OX. 클릭마다 문장, 다음 클릭에 정답
  act     (자동) 마지막 장 앞에 그 차시 활동 화면(act.html#N)의 활동 이름·안내·블록을 보여 주고 바로 가는 단추
모든 장: note(교사 메모 HTML), [pg](교과서 쪽 표시), [extra](더해 보기 표시). lad = [(꼬리표, 질문)...] 꼬리표가 ''이면 질문만.
사진: assets/photo/credits.json 의 이름. 저장된 파일이 있으면 그것을, 없으면 위키미디어 공용에서 불러옵니다.
사진 출처는 credits.json 의 credit 와 license 로 자동 표기합니다."""
import sys, json, html, pathlib, runpy, re
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

def emo(e, cap=''):
    return f'<div class="emo"><span>{e}</span>' + (f'<b>{E(cap)}</b>' if cap else '') + '</div>'

def lad(items, cls='lad'):
    if not items: return ''
    return f'<div class="{cls}">' + ''.join(f'<p class="f">{"<b>"+E(a)+"</b>" if a else ""}{E(b)}</p>' for a, b in items) + '</div>'

def h2(t): return E(t).replace('\n', '<br>')

CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'
def circ(n): return CIRC[n - 1] if n <= len(CIRC) else f'({n})'

def fills(s, ctr, mk):
    """{{답}}을 번호 붙은 빈칸으로. ctr=[지금까지 번호], mk(번호, 답) → HTML. 슬라이드와 학습지가 같은 번호를 쓴다."""
    out, pos = '', 0
    for m in re.finditer(r'\{\{(.*?)\}\}', s):
        ctr[0] += 1
        out += E(s[pos:m.start()]) + mk(ctr[0], m.group(1)); pos = m.end()
    return out + E(s[pos:])

def is_sub(t):
    """학습지의 작은 제목 줄: ‘(2) 자아의 유형’, ‘⇨ 나에 관해 탐구할 때 고려할 점’처럼 짧고 문장이 끝나지 않은 줄"""
    t = re.sub(r'\{\{|\}\}', '', t).strip()
    return bool(re.match(r'^(\(\d+\)|⇨)', t)) and len(t) <= 34 and not re.search(r'(함|음|임|됨|짐|있음|없음|것|다)\.?$', t)

def concept_items(tb):
    """차시 교과서 흐름에서 개념 장만 (h2, pg, items) 로."""
    return [(x['h2'], x.get('pg'), x['items']) for x in tb if x['type'] == 'concept']

KIT = {'vote': '🗳️ 투표', 'pick': '👆 골라 보기', 'sort': '🗂️ 분류하기', 'ox': '⭕ OX', 'flip': '🃏 뒤집기 카드', 'line': '📏 동의 수직선',
       'rank': '🏅 순위 매기기', 'write': '✍️ 생각 쓰기', 'timer': '⏱️ 모둠 시계', 'spin': '🎲 카드 뽑기'}

def acts_of(book, unit):
    """활동 화면(act.html)에서 차시별 활동 이름·안내·블록 종류를 읽는다(손으로 만든 활동 화면도 같은 꼴)."""
    f = ROOT / book / unit / 'act.html'
    out = {}
    if not f.exists(): return out
    for m in re.finditer(r'<section class="panel" data-lesson="(\d+)">\s*<h1>(.*?)</h1>\s*<p class="q">(.*?)</p>(.*?)</section>', f.read_text(encoding='utf-8'), re.S):
        ks = []
        for j in re.findall(r'<script type="application/json" class="kit">(.*?)</script>', m.group(4), re.S):
            ks += [b['k'] for b in json.loads(j.replace('<\\/', '</'))]
        out.setdefault(int(m.group(1)), []).append((html.unescape(m.group(2)), html.unescape(m.group(3)), list(dict.fromkeys(ks))))
    return out

def chip(s):
    if s.get('extra'):
        return '<div class="pgchip extra">➕ 더해 보기' + (f' · {E(s["kind"])}' if s.get('kind') else '') + '</div>'
    if s.get('pg'):
        return f'<div class="pgchip">📖 교과서 {E(str(s["pg"]))}쪽' + (f' · {E(s["kind"])}' if s.get('kind') else '') + '</div>'
    return ''

def slide(s, meta):
    t, note = s['type'], s.get('note', '')
    srcs, body = [], ''
    if t == 'goal':
        body = (f'<div class="center"><div class="goal"><div class="kick">학습 목표</div><h2>{E(meta["title"])}</h2>'
                + ''.join(f'<p class="show"><b>{i}</b>{E(g)}</p>' for i, g in enumerate(s['goals'], 1)) + '</div></div>')
    elif t == 'tb':
        sit = f'<div class="sit">{h2(s["sit"])}</div>' if s.get('sit') else ''
        steps = ''.join(f'<p class="f"><b>{i}</b>{E(x)}</p>' for i, x in enumerate(s.get('steps', []), 1))
        body = f'<div class="center"><div class="tbact{" wide" if s.get("sit") else ""}">{sit}<h2>{h2(s["h2"])}</h2>' + (f'<div class="steps">{steps}</div>' if steps else '') + '</div></div>'
    elif t == 'concept':
        bl = lambda n, a: f'<span class="bl f"><i>{circ(n)}</i><em>{E(a)}</em></span>'
        def row(x):
            ex = f'<p class="ex f">💡 {E(x[2])}</p>' if len(x) > 2 else ''
            if x[0]: return f'<div class="f"><b>{fills(x[0], meta["n"], bl)}</b><span>{fills(x[1], meta["n"], bl)}</span>{ex}</div>'
            return f'<div class="f wide{" sub" if is_sub(x[1]) else ""}"><span>{fills(x[1], meta["n"], bl)}</span>{ex}</div>'
        items = ''.join(row(x) for x in s['items'])
        body = f'<div class="center"><div class="concept{" dense" if len(s["items"]) > 3 or any(len(x) > 2 for x in s["items"]) else ""}"><h2>{h2(s["h2"])}</h2><div class="defs">{items}</div></div></div>'
    elif t == 'check':
        rows = ''.join(f'<li class="f"><span>{E(q)}</span><b class="f {"o" if a else "x"}">{"○" if a else "✕"}</b></li>' for q, a in s['items'])
        body = f'<div class="center"><div class="check"><div class="kick">⏱️ 1분 체크</div><h2>맞으면 ○, 틀리면 ✕</h2><ol>{rows}</ol></div></div>'
    elif t == 'act':
        rows = ''.join(f'<div class="f"><h2>{E(a)}</h2><p>{E(q)}</p>' + (f'<div class="kits">{"".join(f"<span>{KIT[k]}</span>" for k in ks if k in KIT)}</div>' if ks else '') + '</div>'
                       for a, q, ks in s['acts'])
        body = (f'<div class="center"><div class="actcard"><div class="kick">🎲 함께 해 보기 · 마음 활동</div>{rows}'
                f'<a class="go-chat" href="act.html#{s["n"]}">🧩 활동 화면 열기</a></div></div>')
    elif t == 'cover' and s.get('emoji'):
        body = f'<div class="emo-cover">{emo(s["emoji"])}</div>' + \
               f'<div class="tag">{E(s.get("tag", meta["tag"]))}</div><div class="word">{E(s["word"])}<small>{E(s.get("small", meta["title"]))}</small></div>'
    elif t == 'philo':
        import philo_data
        ph = philo_data.PHILO[s['who']]
        body = (f'<div class="center"><div class="philo-card" style="--pc:{ph["color"]}">{emo(ph["emoji"])}'
                f'<div><div class="kick">철학자와 도란도란</div><h2>{E(ph["name"])}</h2><p class="era">{E(ph["era"])}</p>'
                f'<p class="one">{h2(s.get("h2", ph["one"]))}</p>'
                f'<a class="go-chat" href="../../philo/{s["who"]}.html">💬 {E(philo_data.wa(ph["name"]))} 톡 하기</a></div></div></div>')
    elif t == 'cover':
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
    elif t == 'quote' and s.get('emoji'):
        body = (f'<div class="quote"><div class="emo-side">{emo(s["emoji"], s.get("name", ""))}</div>'
                f'<div class="say"><span class="mark">“</span><blockquote>{h2(s["text"])}</blockquote><cite>{E(s["who"])}</cite>{lad(s.get("lad"))}</div></div>')
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
    return f'<section class="s" data-note="{E(note)}">\n  {chip(s)}{body}\n  {src}\n</section>\n'

def compose(L):
    """차시에 tb 가 있으면 교과서 흐름으로 장을 엮는다: 표지 + tb(keep 은 원래 장) + 마지막 장."""
    if 'tb' not in L: return L['slides']
    out = [L['slides'][0]]
    for x in L['tb']:
        if x['type'] == 'keep':
            k = dict(L['slides'][x['i']])
            for f in ('pg', 'kind'):
                if f in x: k[f] = x[f]
            if 'pg' not in k: k['extra'] = True
            out.append(k)
        else:
            out.append(x)
    return out + [L['slides'][-1]]

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jua&family=Gowun+Dodum&display=swap">')

def SHELL(root):
    """모든 화면 공통: 앱 설치(manifest, 아이콘) + ‘이 차시 자료’ 막대(assets/lessonbar.js, 서비스 워커 등록 포함)."""
    return (f'<link rel="manifest" href="{root}manifest.webmanifest">\n<link rel="icon" type="image/png" href="{root}icons/icon-192.png">\n'
            f'<link rel="apple-touch-icon" href="{root}icons/apple-touch-icon.png">\n<script src="{root}assets/lessonbar.js" defer></script>')

def build(path):
    m = runpy.run_path(path)
    book, unit, uno, tag, back = m['BOOK'], m['UNIT'], m['UNO'], m['TAG'], m['BACK']
    out = ROOT / book / unit; out.mkdir(parents=True, exist_ok=True)
    acts = acts_of(book, unit)
    for i, L in enumerate(m['LESSONS'], 1):
        i = L.get('n', i)
        meta = {'tag': tag, 'title': L['title'], 'n': [0]}
        L = dict(L, slides=compose(L))
        if m.get('CHECK', {}).get(i):   # 학습지 ‘1분 체크’ OX: 클릭마다 문장 → 정답
            L['slides'] = L['slides'][:-1] + [{'type': 'check', 'pg': next((x['pg'] for x in L.get('tb', []) if x['type'] == 'goal'), ''), 'kind': '학습지 1분 체크', 'items': m['CHECK'][i],
                'note': '<h4>1분 체크 · 학습지</h4><p>문장이 나오면 학생들이 손으로 ○(머리 위 동그라미) / ✕(팔 엇갈리기)를 먼저 표시하게 하고, 한 번 더 클릭해 정답을 보여 준다. ✕ 문장은 “어디를 고치면 맞는 문장이 될까?”를 묻는다.</p>'}] + L['slides'][-1:]
        if acts.get(i):   # 교과서 활동 뒤, 한 문장 쓰기 앞: 이 차시의 재미있는 활동으로 마음 열기
            L['slides'] = L['slides'][:-1] + [{'type': 'act', 'extra': True, 'kind': '활동', 'n': i, 'acts': acts[i],
                'note': '<h4>마음 활동 · 5~10분</h4><p>단추를 눌러 활동 화면을 칠판에 띄운다. 정답을 맞히는 시간이 아니라 내 생각과 마음을 꺼내 보는 시간 — 어떤 답이든 까닭을 물어 준다.</p><p>시간이 모자라면 건너뛰고 다음 시간 도입이나 복습으로 써도 좋다.</p>'}] + L['slides'][-1:]
        n = len(L['slides'])
        if not 9 <= n <= 16: print(f'  주의: {i}차시 {n}장')
        if L['slides'][-1]['type'] != 'end': print(f'  주의: {i}차시 마지막 장이 한 문장 쓰기가 아님')
        doc = f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{E(L["title"])} · {E(back)} {uno}단원 {i}차시</title>
{FONTS}
{SHELL('../../')}
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

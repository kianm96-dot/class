"""골든벨 문항 만들기: 차시별 문제(tools/prob)의 하·중 객관식 + 단원 게임(GAME) 카드를 모아 assets/quizbank.js 를 씁니다.
사용: python3 tools/build_quiz.py
QB = {'책/단원': [[문제, [보기…], 정답 번호, 해설, 차시], ...]}  — 차시 0 은 단원 게임에서 온 문항."""
import json, pathlib, re, runpy
ROOT = pathlib.Path(__file__).resolve().parent.parent
QB = {}
for f in sorted((ROOT / 'tools' / 'prob').glob('m*.py')):
    m = runpy.run_path(str(f)); key = f"{m['BOOK']}/{m['UNIT']}"; out = []
    for n, Q in sorted(m['PROB'].items()):
        for it in Q[:6]:   # 하·중
            if it[0] == 'mc' and '\n' not in it[1]: out.append([it[1], it[2], it[3], it[4], n])
    deck = runpy.run_path(str(ROOT / 'tools' / 'decks' / f"{m['BOOK']}_{m['UNIT']}.py"))
    for r in (deck.get('GAME') or {}).get('rounds', {}).values():
        q = re.sub(r'\s*\([^)]*쪽\)', '', r['q'])
        for card, a, why in r['cards']:
            out.append([f'‘{card}’ — {q}', [b[0] for b in r['bins']], a, why, 0])
    QB[key] = out
    print(f'{key}: {len(out)}문항')
js = '/* 골든벨 문항 (tools/build_quiz.py 가 만듦 — 직접 고치지 말고 tools/prob 이나 단원 GAME 을 고친 뒤 다시 만드세요). [문제, [보기…], 정답 번호, 해설, 차시] */\nwindow.QB = ' + json.dumps(QB, ensure_ascii=False, separators=(',', ':')).replace('],[', '],\n[') + ';\n'
(ROOT / 'assets' / 'quizbank.js').write_text(js, encoding='utf-8')

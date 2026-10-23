"""철학자 톡 만들기: tools/philo_data.py 를 읽어 philo/<id>.html, philo/index.html, assets/philo-list.js 를 씁니다.
사용: python3 tools/build_philo.py"""
import sys, json, html, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
from build_deck import FONTS
import philo_data as D
E = lambda s: html.escape(s, quote=True)
J = lambda o: json.dumps(o, ensure_ascii=False).replace('</', '<\\/')

def meta(k):
    p = D.PHILO[k]
    b, u, n = p['link']
    return {'id': k, 'name': p['name'], 'emoji': p['emoji'], 'color': p['color'], 'era': p['era'], 'book': p['book'],
            'page': p['page'], 'one': p['one'].replace('\n', ' '), 'tags': p['tags'], 'lesson': f'{b}/{u}/slides{n}.html', 'key': f'{b}/{u}', 'n': n}

def build():
    out = ROOT / 'philo'; out.mkdir(exist_ok=True)
    L = [meta(k) for k in D.ORDER]
    for m in L:
        p = D.PHILO[m['id']]
        doc = f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>철학자 톡 · {E(p["name"])}</title>
{FONTS}
<link rel="stylesheet" href="../assets/philo.css">
</head>
<body style="--pc:{p["color"]}">
<header class="top"><div class="in"><a class="back" href="../index.html#{m["key"].split("/")[0]}">← 수업실</a>
  <div class="who"><span class="big">{p["emoji"]}</span><div><b>{E(p["name"])}</b><small>{E(p["era"])} · {E(p["book"])} 교과서 {p["page"]}쪽</small></div></div>
  <button id="all" type="button" title="선생님 미리 보기">한 번에 보기</button></div><div class="prog"><i id="prog"></i></div></header>
<div class="tags">{"".join(f"<span>#{E(t)}</span>" for t in p["tags"])}<a href="../{m["lesson"]}">연결 차시 슬라이드 →</a></div>
<main id="log" aria-live="polite"></main>
<div class="dock"><button id="next" type="button">다음 ▶</button></div>
<script>
window.WHO={J({k: m[k] for k in ("id", "name", "emoji", "color", "tags")})};
window.CHAT={J(p["chat"])};
</script>
<script src="../assets/philo.js"></script>
</body>
</html>
'''
        (out / f'{m["id"]}.html').write_text(doc, encoding='utf-8')
    (ROOT / 'assets' / 'philo-list.js').write_text('/* tools/build_philo.py 가 씁니다. 첫 화면 ‘철학자 톡’ 줄 */\nwindow.PHILO_LIST = ' + json.dumps(L, ensure_ascii=False, indent=1) + ';\n', encoding='utf-8')
    print('philo/', len(L), '명')

if __name__ == '__main__':
    build()

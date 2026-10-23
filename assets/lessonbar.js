/* ‘이 차시 자료’ 막대: 슬라이드 · 활동 · 학습지 · 문제 · 철학자 톡 · 게임 · 퀴즈를 같은 차시끼리 잇는다.
   페이지에는 <script src="…/assets/lessonbar.js" defer></script> 한 줄만 넣으면 된다(catalog.js · philo-list.js 는 스스로 불러옴).
   주소로 차시를 찾는다: <책>/<단원>/slidesN · probN, act.html#N · worksheet.html#N, philo/<이름>.
   슬라이드에서는 왼쪽 아래 작은 단추로 접어 둔다. 인쇄할 때는 숨긴다. 앱 설치(서비스 워커)도 여기서 등록한다. */
(function () {
  var me = document.currentScript; if (!me) return;
  var ROOT = me.src.replace(/assets\/lessonbar\.js.*$/, '');
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register(ROOT + 'sw.js').catch(function () {});
  if (window.self !== window.top) return;

  function need(src, ok) {
    if (src === 'catalog' ? window.FILES : window.PHILO_LIST) return ok();
    var s = document.createElement('script'); s.src = ROOT + 'assets/' + (src === 'catalog' ? 'catalog.js' : 'philo-list.js');
    s.onload = ok; s.onerror = function () {}; document.head.appendChild(s);
  }
  need('catalog', function () { need('philo', start); });

  function css() {
    if (document.getElementById('lb-css')) return;
    var s = document.createElement('style'); s.id = 'lb-css';
    s.textContent = '.lb{font:15px/1.35 "Gowun Dodum","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;background:#fff;color:#2b211e;border-bottom:2px solid #efe0d0;padding:7px 14px;display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;position:relative;z-index:40}' +
      '.lb .u{font-family:Jua,sans-serif;font-size:16px;color:#6f5f57;margin-right:2px;white-space:nowrap}' +
      '.lb a{display:inline-flex;align-items:center;gap:4px;padding:3px 11px;border-radius:999px;border:2px solid #efe0d0;background:#fff;color:#2b211e;text-decoration:none;white-space:nowrap;font-weight:700;font-size:14px}' +
      '.lb a:hover{border-color:#ff7a6b}.lb a[aria-current="page"]{background:#ff7a6b;border-color:#ff7a6b;color:#fff}' +
      '.lb .nav{margin-left:auto;display:flex;gap:6px}.lb .nav a{padding:3px 9px}' +
      '.lb-float{position:fixed;left:12px;bottom:16px;z-index:60;font:700 14px "Gowun Dodum",system-ui,sans-serif}' +
      '.lb-float>button{border:0;border-radius:999px;padding:8px 14px;background:rgba(43,33,30,.82);color:#fff;cursor:pointer;font:inherit;opacity:.55}.lb-float>button:hover,.lb-float.open>button{opacity:1}' +
      '.lb-float .lb{position:absolute;left:0;bottom:44px;width:min(92vw,620px);border:2px solid #efe0d0;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.18)}' +
      '@media print{.lb,.lb-float{display:none!important}}';
    document.head.appendChild(s);
  }

  function here() {
    var rel = location.href.slice(ROOT.length).split('?')[0].split('#')[0].replace(/\.html$/, ''), n = +location.hash.slice(1) || 0, m;
    if ((m = rel.match(/^philo\/([a-z]+)$/))) {
      var p = (window.PHILO_LIST || []).filter(function (x) { return x.id === m[1]; })[0];
      return p ? { key: p.key, n: p.n, kind: 'philo' } : null;
    }
    if (!(m = rel.match(/^(m[12]\/[a-z]+)\/([a-z-]+?)(\d*)$/))) return null;
    var kind = { slides: 'slides', prob: 'prob', act: 'act', worksheet: 'ws' }[m[2]] || (m[2].indexOf('app-') === 0 ? 'game' : null);
    if (!kind) return null;
    return { key: m[1], n: m[3] ? +m[3] : n, kind: kind };
  }

  function start() {
    var h = here(); if (!h) return;
    var F = (window.FILES || {})[h.key]; if (!F) return;
    var parts = h.key.split('/'), book = (window.CATALOG || []).filter(function (b) { return b.id === parts[0]; })[0];
    var unit = book && book.units.filter(function (u) { return u.dir === parts[1]; })[0]; if (!unit) return;
    var all = (F.slides || []).slice(), n = h.n && all.indexOf(h.n) > -1 ? h.n : 0;
    var base = ROOT + h.key + '/', has = function (k) { return (F[k] || []).indexOf(n) > -1; };
    var ph = (window.PHILO_LIST || []).filter(function (p) { return p.key === h.key && p.n === n; })[0];
    var L = [];
    if (n) {
      if (has('slides')) L.push(['slides', '📽 슬라이드', base + 'slides' + n + '.html']);
      if (has('act')) L.push(['act', '🧩 활동', base + 'act.html#' + n]);
      if (has('ws')) L.push(['ws', '📄 학습지', base + 'worksheet.html#' + n]);
      if (has('prob')) L.push(['prob', '✍ 문제', base + 'prob' + n + '.html']);
      if (ph) L.push(['philo', ph.emoji + ' ' + ph.name + ' 톡', ROOT + 'philo/' + ph.id + '.html']);
    }
    if (F.game) L.push(['game', '🎮 ' + F.game.title, base + F.game.href]);
    L.push(['quiz', '🏆 골든벨', ROOT + 'quiz/bell.html?u=' + h.key]);
    var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var title = book.book + ' ' + ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'][unit.no - 1] + (n ? ' · ' + n + '차시' : '');
    var i = all.indexOf(n), go = function (k) { return h.kind === 'act' || h.kind === 'ws' ? base + (h.kind === 'act' ? 'act.html#' : 'worksheet.html#') + k : h.kind === 'prob' && (F.prob || []).indexOf(k) > -1 ? base + 'prob' + k + '.html' : base + 'slides' + k + '.html'; };
    var nav = n ? '<span class="nav">' + (i > 0 ? '<a href="' + go(all[i - 1]) + '" title="이전 차시">◀ ' + all[i - 1] + '차시</a>' : '') +
      (i < all.length - 1 ? '<a href="' + go(all[i + 1]) + '" title="다음 차시">' + all[i + 1] + '차시 ▶</a>' : '') + '</span>' : '';
    var html = '<span class="u">' + esc(title) + '</span>' + L.map(function (x) {
      return '<a href="' + x[2] + '"' + (x[0] === h.kind ? ' aria-current="page"' : '') + '>' + esc(x[1]) + '</a>';
    }).join('') + nav;
    css();
    var bar = document.createElement('nav'); bar.className = 'lb'; bar.setAttribute('aria-label', '이 차시 자료'); bar.innerHTML = html;
    if (h.kind === 'slides') {
      var w = document.createElement('div'); w.className = 'lb-float';
      w.innerHTML = '<button type="button" aria-expanded="false">📚 이 차시 자료</button>'; bar.hidden = true; w.appendChild(bar);
      w.firstChild.onclick = function (e) { e.stopPropagation(); bar.hidden = !bar.hidden; w.classList.toggle('open', !bar.hidden); this.setAttribute('aria-expanded', String(!bar.hidden)); };
      w.addEventListener('click', function (e) { e.stopPropagation(); });
      document.body.appendChild(w);
    } else {
      var top = document.querySelector('.bar, .top, .phead');
      if (top && top.parentNode === document.body) top.insertAdjacentElement('afterend', bar); else document.body.insertBefore(bar, document.body.firstChild);
    }
    // 같은 페이지 안에서 #차시만 바뀌는 활동·학습지는 막대도 다시 그린다
    if (h.kind === 'act' || h.kind === 'ws') addEventListener('hashchange', function () { var o = document.querySelector('.lb'); if (o) o.remove(); start(); }, { once: true });
  }
})();

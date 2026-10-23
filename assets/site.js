/* 첫 화면 그리기 (과학 수업실 구성): 검색 → 책 탭 → 단원 카드(차시마다 슬라이드·활동·학습지).
   자료가 만들어지면 catalog.js의 FILES에 적은 것만 링크로 바뀝니다. 주소 끝 #m2 → 도덕② 탭. */
(function () {
  var C = window.CATALOG, S = window.STANDARDS || {}, F = window.FILES || {}, SITE = window.SITE || {};
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'], AREA = { '9도01': 'self', '9도02': 'others', '9도03': 'society', '9도04': 'nature' };
  var units = [];
  C.forEach(function (b) { b.units.forEach(function (u) { units.push({ u: u, b: b }); }); });
  var book = (location.hash || '#m1').slice(1); if (!C.some(function (b) { return b.id === book; })) book = 'm1';
  var q = '';
  document.title = SITE.name;
  $('curr').textContent = SITE.curriculum + '. 실제 사례와 사진으로 시작해 질문으로 생각하고, 한 문장으로 마음을 정리해요.';
  $('books').innerHTML = C.map(function (b) { return '<button type="button" data-b="' + b.id + '">' + esc(b.book) + '</button>'; }).join('');
  $('books').onclick = function (e) { var t = e.target.closest('button'); if (!t) return; book = t.dataset.b; q = ''; $('q').value = ''; history.replaceState(null, '', '#' + book); render(); };
  $('q').addEventListener('input', function (e) { q = e.target.value.trim(); render(); });
  function made(key, kind, n) { var f = F[key]; return !!(f && f[kind] && f[kind].indexOf(n) > -1); }
  function hi(t) { if (!q) return esc(t); var i = t.toLowerCase().indexOf(q.toLowerCase()); return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length)); }
  function act(href, label, main) { return href ? '<a class="act' + (main ? ' main' : '') + '" href="' + href + '">' + label + '</a>' : '<span class="act">' + label + '</span>'; }
  function card(x, showBook) {
    var u = x.u, b = x.b, key = b.id + '/' + u.dir, base = key + '/', f = F[key] || {}, last = '';
    var nS = u.lessons.filter(function (_, i) { return made(key, 'slides', i + 1); }).length;
    var rows = u.lessons.map(function (l, i) {
      var n = i + 1, sl = made(key, 'slides', n) && base + 'slides' + n + '.html';
      var std = l[1] !== last ? '<li class="sub"><b class="subt">' + esc(l[3] || '') + '</b><p class="std"><b>[' + l[1] + ']</b> ' + esc(S[l[1]] || '') + '</p></li>' : '';
      last = l[1];
      return std + '<li><span class="ln">' + n + '</span>' + '<span class="lw">' + (sl ? '<a class="lt" href="' + sl + '">' + hi(l[0]) + '</a>' : '<span class="lt">' + hi(l[0]) + '</span>') + (l[2] ? '<small class="pg">교과서 ' + l[2] + '쪽</small>' : '') + '</span>' +
        '<span class="acts">' + act(sl, '슬라이드', true) + act(made(key, 'act', n) && base + 'act.html#' + n, '활동') + act(made(key, 'ws', n) && base + 'worksheet.html#' + n, '학습지') + '</span></li>';
    }).join('');
    var ex = (f.ws && f.ws.length > 1 ? '<a class="extra" href="' + base + 'worksheet.html"><span class="xk">학습지</span><span class="xt">단원 학습지 전체 · 인쇄</span></a>' : '<span class="extra"><span class="xk">학습지</span><span class="xt">단원 학습지 <span class="soon">준비 중</span></span></span>') +
      (f.game ? '<a class="extra" href="' + base + f.game.href + '"><span class="xk">게임</span><span class="xt">' + esc(f.game.title) + '</span></a>' : '<span class="extra"><span class="xk">게임</span><span class="xt">단원 게임 <span class="soon">준비 중</span></span></span>');
    return '<article class="unit a-' + (AREA[u.code] || 'self') + '"><header class="unit-head"><div class="tile"><span class="no">' + ROMAN[u.no - 1] + '</span><span class="cd">' + (showBook ? esc(b.book) : u.code) + '</span></div>' +
      '<div><h3>' + hi(u.title) + '</h3><p class="cnt">' + u.lessons.length + '차시 · 슬라이드 ' + nS + (nS ? '' : ' · 준비 중') + '</p></div></header>' +
      '<ol class="lessons">' + rows + '</ol><div class="extras">' + ex + '</div></article>';
  }
  function render() {
    $('books').querySelectorAll('button').forEach(function (t) { t.setAttribute('aria-pressed', String(!q && t.dataset.b === book)); });
    var list;
    if (q) {
      var k = q.toLowerCase();
      list = units.filter(function (x) { return (x.u.title + ' ' + x.u.lessons.map(function (l) { return l[0] + ' ' + (l[3] || ''); }).join(' ')).toLowerCase().indexOf(k) > -1; });
      $('status').textContent = list.length ? '‘' + q + '’ 검색 결과: 단원 ' + list.length + '개' : '';
    } else { list = units.filter(function (x) { return x.b.id === book; }); $('status').textContent = ''; }
    $('units').innerHTML = list.map(function (x) { return card(x, !!q); }).join('') || '<div class="empty">‘' + esc(q) + '’에 맞는 차시가 없어요. 다른 낱말로 찾아보세요.</div>';
  }
  render();
  addEventListener('hashchange', function () { var h = location.hash.slice(1); if (C.some(function (b) { return b.id === h; })) { book = h; render(); } });
})();

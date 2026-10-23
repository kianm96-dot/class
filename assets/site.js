/* 첫 화면 그리기: 책 탭 → 철학자 톡 줄 → 단원 카드(차시마다 슬라이드·활동·학습지).
   자료가 만들어지면 catalog.js의 FILES에 적은 것만 링크로 바뀝니다. 주소 끝 #m2 → 도덕② 탭, #philo → 철학자 톡 펼치기(골든벨 옆 단추로도 펼침). */
(function () {
  var C = window.CATALOG, S = window.STANDARDS || {}, F = window.FILES || {}, SITE = window.SITE || {}, PL = window.PHILO_LIST || [];
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'], AREA = { '9도01': 'self', '9도02': 'others', '9도03': 'society', '9도04': 'nature' };
  var units = [];
  C.forEach(function (b) { b.units.forEach(function (u) { units.push({ u: u, b: b }); }); });
  var h0 = (location.hash || '#m1').slice(1), book = C.some(function (b) { return b.id === h0; }) ? h0 : 'm1';
  var q = '', got = [];
  // 교사 잠금 서버(Cloudflare)가 넣어 주는 값. GitHub Pages처럼 서버가 없으면 undefined → 모두 보임
  var T = window.IS_TEACHER, R = window.ROLE, OPEN = window.OPEN_SLIDES || [];
  var canSee = function (href) { return T !== false || OPEN.indexOf('/' + href.replace(/\.html$/, '')) > -1; };
  if (R) $('who').innerHTML = R === 'teacher' ? '<a href="/teacher">교사 모드</a>' : R === 'board' ? '' : '<a href="/board?next=/">칠판 수업 시작</a><a href="/teacher?next=/">교사 로그인</a>';
  try { got = JSON.parse(localStorage.getItem('philoBadges') || '[]'); } catch (e) {}
  document.title = SITE.name;
  $('curr').textContent = SITE.curriculum + ' · 실제 사례로 시작해 질문으로 생각하고, 한 문장으로 정리해요.';
  $('books').innerHTML = C.map(function (b) { return '<button type="button" data-b="' + b.id + '">' + esc(b.book) + '</button>'; }).join('');
  $('books').onclick = function (e) { var t = e.target.closest('button'); if (!t) return; book = t.dataset.b; q = ''; $('q').value = ''; history.replaceState(null, '', '#' + book); render(); };
  $('q').addEventListener('input', function (e) { q = e.target.value.trim(); render(); });
  function made(key, kind, n) { var f = F[key]; return !!(f && f[kind] && f[kind].indexOf(n) > -1); }
  function hi(t) { if (!q) return esc(t); var i = t.toLowerCase().indexOf(q.toLowerCase()); return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length)); }
  function philoOf(key, n) { return PL.filter(function (p) { return p.key === key && p.n === n; })[0]; }

  function pcards() {
    var list = q ? PL : PL.filter(function (p) { return p.key.split('/')[0] === book; });
    $('pcards').innerHTML = list.map(function (p) {
      return '<a class="pcard' + (got.indexOf(p.id) > -1 ? ' got' : '') + '" href="philo/' + p.id + '.html" style="--pc:' + p.color + '">' +
        '<span class="pe">' + p.emoji + '</span><span class="pt"><b>' + esc(p.name) + '</b><small>' + esc(p.book) + ' ' + p.page + '쪽</small></span>' +
        '<span class="po">' + esc(p.one) + '</span></a>';
    }).join('');
    var n = PL.filter(function (p) { return got.indexOf(p.id) > -1; }).length;
    $('got').textContent = n ? '모은 철학자 카드 ' + n + ' / ' + PL.length : '';
  }

  function card(x, showBook) {
    var u = x.u, b = x.b, key = b.id + '/' + u.dir, base = key + '/', f = F[key] || {}, last = '';
    var rows = u.lessons.map(function (l, i) {
      var n = i + 1, sl = made(key, 'slides', n) && base + 'slides' + n + '.html', ph = philoOf(key, n);
      if (sl && !canSee(sl)) sl = '';
      var web = '';
      if ((R === 'teacher' || R === 'board') && made(key, 'ppt', n)) { web = sl; sl = '/ppt/view?f=' + encodeURIComponent('/' + base + 'ppt' + n + '.pptx'); }   // ▶ = 교과서 수업 PPT 재생
      var pub = R === 'teacher' && made(key, 'slides', n) ? '<button type="button" class="pub" data-s="/' + base + 'slides' + n + '" aria-pressed="' + (OPEN.indexOf('/' + base + 'slides' + n) > -1) + '">' + (OPEN.indexOf('/' + base + 'slides' + n) > -1 ? '학생 공개 중' : '비공개') + '</button>' : '';
      var head = '';
      if (l[1] !== last) {
        head = '<li class="sub"><b>' + esc(l[3] || '') + '</b><details class="std"><summary>성취기준</summary><p><b>[' + l[1] + ']</b> ' + esc(S[l[1]] || '') + '</p></details></li>';
      }
      last = l[1];
      var links = (web ? '<a href="' + web + '">웹 슬라이드</a>' : '') + (made(key, 'act', n) ? '<a href="' + base + 'act.html#' + n + '">활동</a>' : '') +
        (made(key, 'ws', n) ? '<a href="' + base + 'worksheet.html#' + n + '">학습지</a>' : '') +
        (made(key, 'prob', n) ? '<a href="' + base + 'prob' + n + '.html">문제</a>' : '') +
        (made(key, 'ppt', n) && window.IS_TEACHER !== false ? '<a class="ppt" href="' + base + 'ppt' + n + '.pptx" download="' + esc((b.book + ' ' + ROMAN[u.no - 1] + '단원 ' + n + '차시 ' + l[0]).replace(/[\\/:*?"<>|]/g, '')) + '.pptx">📥 PPT</a>' : '') +
        (ph ? '<a class="ph" href="philo/' + ph.id + '.html" style="--pc:' + ph.color + '">' + ph.emoji + ' ' + esc(ph.name) + ' 톡</a>' : '');
      return head + '<li class="ls"><span class="ln">' + n + '</span>' +
        '<span class="lw">' + (sl ? '<a class="lt" href="' + sl + '">' + hi(l[0]) + '</a>' : '<span class="lt off">' + hi(l[0]) + (made(key, 'slides', n) ? '' : ' <small>준비 중</small>') + '</span>') +
        '<span class="meta">' + (l[2] ? '교과서 ' + l[2] + '쪽' : '') + (links ? '<span class="lk">' + links + '</span>' : '') + pub + '</span></span>' +
        (sl ? '<a class="play" href="' + sl + '" aria-label="' + n + '차시 ' + (web ? '수업 PPT 재생' : '슬라이드 열기') + '">▶</a>' : '') + '</li>';
    }).join('');
    var ex = (f.ws && f.ws.length > 1 ? '<a class="extra" href="' + base + 'worksheet.html">📄 단원 학습지 모아 인쇄</a>' : '') +
      (f.game ? '<a class="extra" href="' + base + f.game.href + '">🎮 ' + esc(f.game.title) + '</a>' : '') +
      (f.slides ? '<a class="extra" href="quiz/bell.html?u=' + key + '">🏆 골든벨</a>' : '');
    return '<article class="unit a-' + (AREA[u.code] || 'self') + '"><header class="unit-head"><span class="no">' + ROMAN[u.no - 1] + '</span>' +
      '<div><h3>' + hi(u.title) + '</h3><p class="cnt">' + (showBook ? esc(b.book) + ' · ' : '') + u.lessons.length + '차시</p></div></header>' +
      '<ol class="lessons">' + rows + '</ol>' + (ex ? '<div class="extras">' + ex + '</div>' : '') + '</article>';
  }
  function render() {
    $('books').querySelectorAll('button').forEach(function (t) { t.setAttribute('aria-pressed', String(!q && t.dataset.b === book)); });
    var list;
    if (q) {
      var k = q.toLowerCase();
      list = units.filter(function (x) { return (x.u.title + ' ' + x.u.lessons.map(function (l) { return l[0] + ' ' + (l[3] || ''); }).join(' ')).toLowerCase().indexOf(k) > -1; });
      $('status').textContent = list.length ? '‘' + q + '’ 검색 결과: 단원 ' + list.length + '개' : '';
    } else { list = units.filter(function (x) { return x.b.id === book; }); $('status').textContent = ''; }
    pcards();
    $('units').innerHTML = list.map(function (x) { return card(x, !!q); }).join('') || '<div class="empty">‘' + esc(q) + '’에 맞는 차시가 없어요. 다른 낱말로 찾아보세요.</div>';
    $('units').querySelectorAll('.pub').forEach(function (b) {
      b.onclick = function () {
        var on = b.getAttribute('aria-pressed') !== 'true'; b.disabled = true;
        fetch('/teacher/slides', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slide: b.dataset.s, open: on }) })
          .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); OPEN = j.open; b.setAttribute('aria-pressed', String(on)); b.textContent = on ? '학생 공개 중' : '비공개'; }); })
          .catch(function (e) { alert('공개 설정을 바꾸지 못했어요: ' + e.message); })
          .then(function () { b.disabled = false; });
      };
    });
  }
  render();
  // 철학자 톡: 위쪽 단추(골든벨 옆)를 누르면 철학자 카드가 펼쳐지고 접힘. 주소 끝 #philo 면 펼친 채로
  function philo(open) { $('philo').hidden = !open; $('philoBtn').setAttribute('aria-expanded', String(open)); if (open) $('philo').scrollIntoView({block: 'nearest'}); }
  $('philoBtn').onclick = function (e) { e.preventDefault(); philo($('philo').hidden); };
  if (h0 === 'philo') philo(true);
  addEventListener('hashchange', function () { var h = location.hash.slice(1); if (C.some(function (b) { return b.id === h; })) { book = h; render(); } });
})();

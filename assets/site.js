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
  var T = window.IS_TEACHER, R = window.ROLE, OPEN = window.OPEN_SLIDES || [], MY = window.MY_PPT || {};
  var HREF = {}, ORDER = {};   // 차시 열기 주소, 책마다 차시 순서 (반별 진도에 씀)
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
      var web = '', pf = '/' + base + 'ppt' + n + '.pptx', mine = MY[pf], hasPpt = made(key, 'ppt', n) || !!mine;
      if ((R === 'teacher' || R === 'board') && hasPpt) { web = sl; sl = '/ppt/view?f=' + encodeURIComponent('/' + base + 'ppt' + n + '.pptx'); }   // ▶ = 교과서 수업 PPT 재생
      var pub = R === 'teacher' && made(key, 'slides', n) ? '<button type="button" class="pub" data-s="/' + base + 'slides' + n + '" aria-pressed="' + (OPEN.indexOf('/' + base + 'slides' + n) > -1) + '">' + (OPEN.indexOf('/' + base + 'slides' + n) > -1 ? '학생 공개 중' : '비공개') + '</button>' : '';
      var head = '';
      if (l[1] !== last) {
        head = '<li class="sub"><b>' + esc(l[3] || '') + '</b><details class="std"><summary>성취기준</summary><p><b>[' + l[1] + ']</b> ' + esc(S[l[1]] || '') + '</p></details></li>';
      }
      last = l[1];
      var links = (web ? '<a href="' + web + '">웹 슬라이드</a>' : '') + (made(key, 'act', n) ? '<a href="' + base + 'act.html#' + n + '">활동</a>' : '') +
        (made(key, 'ws', n) ? '<a href="' + base + 'worksheet.html#' + n + '">학습지</a>' : '') +
        (made(key, 'prob', n) ? '<a href="' + base + 'prob' + n + '.html">문제</a>' : '') +
        (hasPpt && window.IS_TEACHER !== false ? '<a class="ppt" href="' + base + 'ppt' + n + '.pptx" download="' + esc((b.book + ' ' + ROMAN[u.no - 1] + '단원 ' + n + '차시 ' + l[0]).replace(/[\\/:*?"<>|]/g, '')) + '.pptx">📥 PPT</a>' : '') +
        (R === 'teacher' || R === 'board' ? '<button type="button" class="up" data-f="' + pf + '" title="' + (mine ? esc('올린 파일: ' + mine.name) : '이 차시에 쓸 수업 PPT(.pptx) 올리기') + '">' + (mine ? '⬆ 내 PPT ✓' : '⬆ PPT 올리기') + '</button>' +
          (mine ? '<button type="button" class="up undo" data-f="' + pf + '" data-undo="1"' + (made(key, 'ppt', n) ? ' title="올린 파일을 지우고 원래 PPT로">되돌리기' : ' title="올린 파일 지우기">지우기') + '</button>' : '') : '') +
        (ph ? '<a class="ph" href="philo/' + ph.id + '.html" style="--pc:' + ph.color + '">' + ph.emoji + ' ' + esc(ph.name) + ' 톡</a>' : '');
      var k = key + '/' + n; HREF[k] = sl; (ORDER[b.id] = ORDER[b.id] || []).push({k: k, n: n, t: l[0], u: ROMAN[u.no - 1]});
      return head + '<li class="ls" data-k="' + k + '"><span class="ln">' + n + '</span>' +
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
    $('units').querySelectorAll('.up').forEach(function (b) { b.onclick = function () { upload(b); }; });
    marks();
  }

  /* ── 선생님이 수업 PPT 올리기: 차시 줄의 [⬆ PPT 올리기] → 파일 고르기 → 서버에 저장. 올린 뒤 ▶·📥가 그 파일로 ── */
  function upload(b) {
    var f = b.dataset.f;
    if (b.dataset.undo) {
      if (!confirm('올린 PPT를 지울까요?')) return;
      return send('DELETE', f, null, b);
    }
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation';
    inp.onchange = function () {
      var file = inp.files[0]; if (!file) return;
      if (!/\.pptx$/i.test(file.name)) return alert('.pptx 파일만 올릴 수 있어요. .ppt는 PowerPoint에서 “다른 이름으로 저장 → .pptx”로 바꿔 주세요.');
      if (file.size > 25 * 1024 * 1024) return alert('25MB보다 커요. PowerPoint의 “그림 압축”으로 줄인 뒤 올려 주세요.');
      if (file.size > 10 * 1024 * 1024 && !confirm('10MB가 넘으면 화면 재생(▶)이 안 될 수 있어요(내려받기는 돼요). 그래도 올릴까요?')) return;
      send('POST', f, file, b);
    };
    inp.click();
  }
  function send(method, f, file, b) {
    var old = b.textContent; b.disabled = true; b.textContent = file ? '올리는 중…' : '지우는 중…';
    fetch('/teacher/ppt?f=' + encodeURIComponent(f), { method: method, body: file, headers: file ? { 'x-name': encodeURIComponent(file.name) } : {} })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); MY = j.mine; render(); }); })
      .catch(function (e) { alert((file ? 'PPT를 올리지 못했어요: ' : '지우지 못했어요: ') + e.message); b.disabled = false; b.textContent = old; });
  }

  /* ── 반별 진도: 제목 오른쪽에서 반을 고르고 ▶로 수업 → 끝나면 [끝까지 했어요]/[여기까지만] → 다음 시간에 어디부터인지 보여 줌.
     Cloudflare(교사·칠판)에서는 서버에 저장해 폰·칠판 어디서나 같고, 서버가 없으면(GitHub Pages) 이 브라우저에만 저장. 학생 화면에는 안 나옴. ── */
  var PG = { classes: [], rec: {} }, cur = '', LOCAL = !R, PGKEY = 'moralProgress', ending = false;
  try { cur = localStorage.getItem('moralClass') || ''; } catch (e) {}
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var md = function (d) { return d ? +d.slice(5, 7) + '/' + +d.slice(8, 10) : ''; };
  var cls = function () { return PG.classes.filter(function (c) { return c.id === cur; })[0]; };
  var rec = function (id) { var r = PG.rec[id] || {}; r.done = r.done || {}; return r; };
  var lesson = function (k) { for (var b in ORDER) { var x = ORDER[b].filter(function (o) { return o.k === k; })[0]; if (x) return x; } };
  var label = function (x) { return x ? x.u + '-' + x.n + '차시 ‘' + x.t + '’' : ''; };
  function pgSave(body) {
    if (LOCAL) {
      if (body.classes) { PG.classes = body.classes; Object.keys(PG.rec).forEach(function (id) { if (!body.classes.some(function (c) { return c.id === id; })) delete PG.rec[id]; }); }
      if (body.id) PG.rec[body.id] = body.rec;
      try { localStorage.setItem(PGKEY, JSON.stringify(PG)); } catch (e) {}
      return Promise.resolve();
    }
    if (body.id) PG.rec[body.id] = body.rec; else PG.classes = body.classes;   // 화면 먼저 바꾸고 서버에 저장
    return fetch('/teacher/progress', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); PG = j; }); })
      .catch(function (e) { alert('진도를 저장하지 못했어요: ' + e.message); });
  }
  // 다음에 할 차시: 지난 시간이 중간에 끝났으면 그 차시, 아니면 그 다음 차시. 기록이 없으면 아직 안 한 첫 차시
  function nextOf(c) {
    var r = rec(c.id), list = ORDER[c.book] || [];
    if (r.last && r.last.part) return lesson(r.last.k);
    var i = r.last ? list.map(function (o) { return o.k; }).indexOf(r.last.k) : -1;
    for (var j = i + 1; j < list.length; j++) if (!r.done[list[j].k]) return list[j];
    return list.filter(function (o) { return !r.done[o.k]; })[0];
  }
  function panel() {
    var box = $('cls'); if (!box) return;
    box.hidden = false;
    var c = cls(), h = '<div class="cls-h"><b>우리 반</b><span class="chips">' + PG.classes.map(function (x) {
      return '<button type="button" class="chip" data-id="' + esc(x.id) + '" aria-pressed="' + (x.id === cur) + '">' + esc(x.name) + (rec(x.id).now ? ' <i title="수업 중">●</i>' : '') + '</button>';
    }).join('') + '<button type="button" class="chip add" data-add="1" title="반 추가">＋ 반</button></span></div>';
    if (!c) h += '<p class="cls-s">' + (PG.classes.length ? '반을 누르면 지난 진도와 다음 차시가 보여요.' : '＋ 반으로 수업하는 반(예: 1-3)을 만들어요. 지금 보고 있는 교과서(' + esc(C.filter(function (b) { return b.id === book; })[0].book) + ')로 만들어져요.') + '</p>';
    else {
      var r = rec(c.id), nx = nextOf(c), now = r.now && lesson(r.now.k);
      if (now) {
        h += '<div class="cls-s now' + (ending ? ' end' : '') + '"><p>🟢 <b>' + esc(c.name) + '</b> ' + esc(label(now)) + ' 수업 중</p>' +
          '<div class="row"><button type="button" data-end="all">✓ 끝까지 했어요</button><button type="button" data-end="part" class="ghost">여기까지만 했어요…</button><button type="button" data-end="cancel" class="ghost sm" title="수업 중 표시만 지워요">취소</button></div></div>';
      } else {
        h += '<div class="cls-s">' + (r.last ? '<p class="last">지난 시간(' + md(r.last.d) + '): ' + esc(label(lesson(r.last.k))) + (r.last.part ? ' — <b>' + esc(r.last.part) + '</b>까지' : ' 끝') + '</p>' : '<p class="last">아직 기록이 없어요.</p>') +
          (nx ? '<p class="nx">다음 시간: <b>' + esc(label(nx)) + '</b>' + (r.last && r.last.part ? ' <small>(' + esc(r.last.part) + '부터 이어서)</small>' : '') + '</p>' +
            '<div class="row">' + (HREF[nx.k] ? '<a class="go" href="' + HREF[nx.k] + '" data-start="' + nx.k + '">▶ 수업 시작</a>' : '') + '<button type="button" class="ghost sm" data-del="1">반 지우기</button></div>'
            : '<p class="nx">🎉 이 교과서의 모든 차시를 마쳤어요.</p><div class="row"><button type="button" class="ghost sm" data-del="1">반 지우기</button></div>') + '</div>';
      }
    }
    box.innerHTML = h;
  }
  // 차시 줄 표시: 끝낸 차시 ✓, 중간까지 한 차시, 다음 차시, 수업 중인 차시
  function marks() {
    if (R === 'student') return;
    var c = cls(); panel();
    document.querySelectorAll('.ls[data-k]').forEach(function (li) {
      li.classList.remove('done', 'nxt', 'part', 'live');
      var tag = li.querySelector('.pg'); if (tag) tag.remove();
      if (!c) return li.querySelector('.ln').removeAttribute('title');
      var r = rec(c.id), k = li.dataset.k, nx = nextOf(c), t = '';
      if (r.now && r.now.k === k) { li.classList.add('live'); t = '수업 중'; }
      else if (nx && nx.k === k) { li.classList.add('nxt'); t = r.last && r.last.part ? '다음 · ' + r.last.part + '부터' : '다음 시간'; }
      if (r.done[k]) { li.classList.add('done'); if (!t) t = '✓ ' + md(r.done[k]); }
      else if (r.last && r.last.part && r.last.k === k && !t) { li.classList.add('part'); t = r.last.part + '까지'; }
      li.querySelector('.ln').title = r.done[k] ? '눌러서 ‘끝낸 차시’ 표시 지우기' : '눌러서 ‘끝낸 차시’로 표시';
      if (t) li.querySelector('.lw').insertAdjacentHTML('afterbegin', '<span class="pg">' + esc(t) + '</span>');
    });
  }
  function setRec(r) { return pgSave({ id: cur, rec: r }).then(marks); }
  function start(k) { var c = cls(); if (!c || !k) return; var r = rec(c.id); r.now = { k: k, d: today() }; pgSave({ id: c.id, rec: r }); marks(); }
  function pick(id) {
    cur = cur === id ? '' : id; ending = false;
    try { localStorage.setItem('moralClass', cur); } catch (e) {}
    var c = cls();
    if (c && c.book !== book && !q) { book = c.book; history.replaceState(null, '', '#' + book); render(); } else marks();
  }
  function wireClasses() {
    var box = $('cls');
    box.onclick = function (e) {
      var t = e.target.closest('button,a'); if (!t) return;
      var c = cls();
      if (t.dataset.add) {
        var name = (prompt('반 이름 (예: 1-3, 2학년 4반)') || '').trim().slice(0, 20); if (!name) return;
        var id = 'c' + Date.now().toString(36);
        pgSave({ classes: PG.classes.concat([{ id: id, name: name, book: book }]) }).then(function () { cur = ''; pick(id); });
      } else if (t.dataset.id) pick(t.dataset.id);
      else if (t.dataset.del) {
        if (!c || !confirm('‘' + c.name + '’ 반과 진도 기록을 지울까요?')) return;
        pgSave({ classes: PG.classes.filter(function (x) { return x.id !== c.id; }) }).then(function () { cur = ''; marks(); });
      } else if (t.dataset.start) start(t.dataset.start);
      else if (t.dataset.end && c) {
        var r = rec(c.id), k = r.now && r.now.k; if (!k) return;
        if (t.dataset.end === 'all') { r.done[k] = today(); r.last = { k: k, d: today() }; }
        else if (t.dataset.end === 'part') {
          var part = (prompt('어디까지 했나요? (예: 12장, 활동 2 전, 빈칸 ③)') || '').trim().slice(0, 40); if (!part) return;
          r.last = { k: k, d: today(), part: part };
        }
        r.now = null; ending = false; setRec(r);
      }
    };
    // 반을 고른 채 차시를 열면(▶·제목·웹 슬라이드) 그 반의 ‘수업 중’으로 기록
    $('units').addEventListener('click', function (e) {
      var a = e.target.closest('.ls a'), ln = e.target.closest('.ls .ln'), c = cls();
      if (!c) return;
      if (a && (a.classList.contains('play') || a.classList.contains('lt') || /slides\d+\.html$/.test(a.getAttribute('href') || ''))) start(a.closest('.ls').dataset.k);
      else if (ln) {
        var r = rec(c.id), k = ln.closest('.ls').dataset.k;
        if (r.done[k]) delete r.done[k]; else r.done[k] = today();
        setRec(r);
      }
    });
  }
  if (R !== 'student' && $('cls')) {
    wireClasses();
    var endAsk = /[?&]end=1/.test(location.search);
    if (endAsk) history.replaceState(null, '', location.pathname + location.hash);
    var ready = LOCAL ? Promise.resolve(JSON.parse((function () { try { return localStorage.getItem(PGKEY); } catch (e) { return null; } })() || 'null'))
      : fetch('/teacher/progress').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    ready.then(function (j) {
      if (j && j.classes) PG = j;
      if (!cls()) cur = '';
      ending = endAsk && !!(cls() && rec(cur).now);
      var c = cls();
      if (c && c.book !== book && !q && !/^#m[12]$/.test(location.hash)) { book = c.book; history.replaceState(null, '', '#' + book); render(); } else marks();
      if (ending) $('cls').scrollIntoView({ block: 'center' });
    });
  }
  render();
  // 철학자 톡: 위쪽 단추(골든벨 옆)를 누르면 철학자 카드가 펼쳐지고 접힘. 주소 끝 #philo 면 펼친 채로
  function philo(open) { $('philo').hidden = !open; $('philoBtn').setAttribute('aria-expanded', String(open)); if (open) $('philo').scrollIntoView({block: 'nearest'}); }
  $('philoBtn').onclick = function (e) { e.preventDefault(); philo($('philo').hidden); };
  if (h0 === 'philo') philo(true);
  addEventListener('hashchange', function () { var h = location.hash.slice(1); if (C.some(function (b) { return b.id === h; })) { book = h; render(); } });
})();

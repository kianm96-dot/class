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
        (R === 'teacher' ? '<button type="button" class="up" data-f="' + pf + '" title="' + (mine ? esc('올린 파일: ' + mine.name) : '이 차시에 쓸 수업 PPT(.pptx) 올리기') + '">' + (mine ? '⬆ 내 PPT ✓' : '⬆ PPT 올리기') + '</button>' +
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

  /* ── 반별 진도: 제목 오른쪽 ‘우리 반’. 반은 [＋ 반]에서 학년·반 번호를 눌러 여러 개 한 번에 만들고,
     [☑ 여러 반]을 켜면 여러 반을 같이 골라 한 번에 기록. ▶로 수업 → [끝까지 했어요]/[여기까지만] → 다음 시간에 어디부터인지 보여 줌.
     차시 번호 동그라미를 누르면 고른 반 모두 ‘그 차시까지 끝냄’으로 한 번에 기록(다시 누르면 그 차시부터 지움).
     Cloudflare(교사·칠판)에서는 서버에 저장해 폰·칠판 어디서나 같고, 서버가 없으면(GitHub Pages) 이 브라우저에만 저장. 학생 화면에는 안 나옴. ── */
  var PG = { classes: [], rec: {} }, sel = [], multi = false, adding = null, partIn = false, LOCAL = !R, PGKEY = 'moralProgress', ending = false;
  try { var sv = localStorage.getItem('moralClass') || ''; sel = sv.charAt(0) === '[' ? JSON.parse(sv) : sv ? [sv] : []; multi = localStorage.getItem('moralMulti') === '1'; } catch (e) {}
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var md = function (d) { return d ? +d.slice(5, 7) + '/' + +d.slice(8, 10) : ''; };
  var byId = function (id) { return PG.classes.filter(function (c) { return c.id === id; })[0]; };
  var chosen = function () { return sel.map(byId).filter(Boolean); };
  var cls = function () { return chosen()[0]; };   // 차시 줄 표시는 처음 고른 반 기준
  var rec = function (id) { var r = PG.rec[id] || {}; r.done = r.done || {}; return r; };
  var lesson = function (k) { for (var b in ORDER) { var x = ORDER[b].filter(function (o) { return o.k === k; })[0]; if (x) return x; } };
  var label = function (x) { return x ? x.u + '-' + x.n + '차시 ‘' + x.t + '’' : ''; };
  var names = function (cs) { return cs.map(function (c) { return c.name; }).join(', '); };
  var natural = function (a, b) { return a.name.localeCompare(b.name, 'ko', { numeric: true }); };
  function keep() { try { localStorage.setItem('moralClass', JSON.stringify(sel)); localStorage.setItem('moralMulti', multi ? '1' : ''); } catch (e) {} }
  // body: {classes} 반 목록 바꾸기, {recs: {반 id: 진도}} 여러 반 진도 한 번에
  function pgSave(body) {
    if (body.classes) { PG.classes = body.classes; Object.keys(PG.rec).forEach(function (id) { if (!byId(id)) delete PG.rec[id]; }); }
    if (body.recs) Object.keys(body.recs).forEach(function (id) { PG.rec[id] = body.recs[id]; });
    if (LOCAL) { try { localStorage.setItem(PGKEY, JSON.stringify(PG)); } catch (e) {} return Promise.resolve(); }
    return fetch('/teacher/progress', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); PG = j; }); })
      .catch(function (e) { alert('진도를 저장하지 못했어요: ' + e.message); });
  }
  // 고른 반마다 진도를 고쳐서 한 번에 저장
  function each(fn) { var recs = {}; chosen().forEach(function (c) { var r = rec(c.id); fn(r, c); recs[c.id] = r; }); marks(); return pgSave({ recs: recs }).then(marks); }
  // 다음에 할 차시: 지난 시간이 중간에 끝났으면 그 차시, 아니면 그 다음 차시. 기록이 없으면 아직 안 한 첫 차시
  function nextOf(c) {
    var r = rec(c.id), list = ORDER[c.book] || [];
    if (r.last && r.last.part) return lesson(r.last.k);
    var i = r.last ? list.map(function (o) { return o.k; }).indexOf(r.last.k) : -1;
    for (var j = i + 1; j < list.length; j++) if (!r.done[list[j].k]) return list[j];
    return list.filter(function (o) { return !r.done[o.k]; })[0];
  }
  function addForm() {
    var a = adding, nums = []; for (var i = 1; i <= 12; i++) nums.push(i);
    var tog = function (attr, v, on, txt) { return '<button type="button" class="chip sm" ' + attr + '="' + v + '" aria-pressed="' + on + '">' + txt + '</button>'; };
    var exist = PG.classes.map(function (c) { return c.name; });
    return '<div class="cls-add"><p><b>학년</b>' + [1, 2, 3].map(function (g) { return tog('data-g', g, a.g === g, g + '학년'); }).join('') + '</p>' +
      '<p><b>반</b>' + nums.map(function (n) { return exist.indexOf(a.g + '-' + n) > -1 ? '<button type="button" class="chip sm" disabled title="이미 있어요">' + n + '</button>' : tog('data-n', n, a.n.indexOf(n) > -1, n); }).join('') + '</p>' +
      '<p><b>교과서</b>' + C.map(function (b) { return tog('data-bk', b.id, a.book === b.id, esc(b.book)); }).join('') + '</p>' +
      '<div class="row"><button type="button" data-make="1"' + (a.n.length ? '' : ' disabled') + '>' + (a.n.length ? a.g + '학년 ' + a.n.length + '개 반 만들기' : '반 번호를 눌러 골라요') + '</button><button type="button" class="ghost" data-close="1">닫기</button></div></div>';
  }
  function panel() {
    var box = $('cls'); if (!box) return;
    box.hidden = false;
    var cs = chosen(), list = PG.classes.slice().sort(natural);
    var h = '<div class="cls-h"><b>우리 반</b><span class="chips">' + list.map(function (x) {
      return '<button type="button" class="chip" data-id="' + esc(x.id) + '" aria-pressed="' + (sel.indexOf(x.id) > -1) + '">' + esc(x.name) + (rec(x.id).now ? ' <i title="수업 중">●</i>' : '') + '</button>';
    }).join('') + '<button type="button" class="chip add" data-add="1" title="반 여러 개 한 번에 만들기">＋ 반</button>' +
      (PG.classes.length > 1 ? '<button type="button" class="chip add" data-multi="1" aria-pressed="' + multi + '" title="여러 반을 같이 골라 한 번에 기록">☑ 여러 반</button>' : '') +
      (multi ? '<button type="button" class="chip add" data-alls="1">' + (cs.length === PG.classes.length ? '모두 해제' : '모두') + '</button>' : '') + '</span></div>';
    if (adding) h += addForm();
    else if (!cs.length) h += '<p class="cls-s">' + (PG.classes.length ? '반을 누르면 지난 진도와 다음 차시가 보여요.' + (PG.classes.length > 1 ? ' 같은 진도의 반은 <b>☑ 여러 반</b>으로 한꺼번에 기록해요.' : '') : '<b>＋ 반</b>을 눌러 학년과 반 번호를 고르면 한 번에 만들어져요.') + '</p>';
    else {
      var live = cs.filter(function (c) { return rec(c.id).now; });
      if (live.length) {
        var now = lesson(rec(live[0].id).now.k);
        h += '<div class="cls-s now' + (ending ? ' end' : '') + '"><p>🟢 <b>' + esc(names(live)) + '</b> · ' + esc(label(now)) + ' 수업 중</p>' +
          (partIn ? '<div class="row"><input id="partIn" maxlength="40" placeholder="어디까지? 예: 12장, 활동 2 전" aria-label="어디까지 했는지"><button type="button" data-end="save">저장</button><button type="button" class="ghost sm" data-end="back">취소</button></div>'
            : '<div class="row"><button type="button" data-end="all">✓ 끝까지 했어요</button><button type="button" data-end="part" class="ghost">여기까지만 했어요…</button><button type="button" data-end="cancel" class="ghost sm" title="수업 중 표시만 지워요">취소</button></div>') + '</div>';
      } else {
        // 다음 차시가 같은 반끼리 묶어서 한 줄씩
        var groups = [];
        cs.forEach(function (c) {
          var r = rec(c.id), nx = nextOf(c), key = (nx ? nx.k : '') + '|' + (r.last && r.last.part || ''), g = groups.filter(function (x) { return x.key === key; })[0];
          if (g) g.cs.push(c); else groups.push({ key: key, nx: nx, part: r.last && r.last.part, last: r.last, cs: [c] });
        });
        h += '<div class="cls-s">' + groups.map(function (g) {
          return '<p class="nx">' + (cs.length > 1 ? '<b class="who">' + esc(names(g.cs)) + '</b> ' : '') +
            (g.nx ? '다음: <b>' + esc(label(g.nx)) + '</b>' + (g.part ? ' <small>(' + esc(g.part) + '부터 이어서)</small>' : '') : '🎉 모든 차시를 마쳤어요') +
            (g.last && cs.length === 1 ? '<br><small class="last">지난 시간 ' + md(g.last.d) + ': ' + esc(label(lesson(g.last.k))) + (g.part ? ' — ' + esc(g.part) + '까지' : ' 끝') + '</small>' : '') + '</p>';
        }).join('') +
          '<div class="row">' + (groups.length === 1 && groups[0].nx && HREF[groups[0].nx.k] ? '<a class="go" href="' + HREF[groups[0].nx.k] + '" data-start="' + groups[0].nx.k + '">▶ 수업 시작</a>' : '') +
          '<button type="button" class="ghost sm" data-del="1">' + (cs.length > 1 ? cs.length + '개 반 지우기' : '반 지우기') + '</button></div>' +
          '<p class="tip">차시 번호(①②③)를 누르면 ' + (cs.length > 1 ? '고른 반 모두 ' : '') + '그 차시까지 끝낸 것으로 한 번에 기록돼요.</p></div>';
      }
    }
    box.innerHTML = h;
    if (partIn && $('partIn')) $('partIn').focus();
  }
  // 차시 줄 표시: 끝낸 차시 ✓, 중간까지 한 차시, 다음 차시, 수업 중인 차시
  function marks() {
    if (R === 'student') return;
    var c = cls(), more = chosen().length > 1; panel();
    document.querySelectorAll('.ls[data-k]').forEach(function (li) {
      li.classList.remove('done', 'nxt', 'part', 'live');
      var tag = li.querySelector('.pg'); if (tag) tag.remove();
      if (!c) return li.querySelector('.ln').removeAttribute('title');
      var r = rec(c.id), k = li.dataset.k, nx = nextOf(c), t = '';
      if (r.now && r.now.k === k) { li.classList.add('live'); t = '수업 중'; }
      else if (nx && nx.k === k) { li.classList.add('nxt'); t = r.last && r.last.part ? '다음 · ' + r.last.part + '부터' : '다음 시간'; }
      if (r.done[k]) { li.classList.add('done'); if (!t) t = '✓ ' + md(r.done[k]); }
      else if (r.last && r.last.part && r.last.k === k && !t) { li.classList.add('part'); t = r.last.part + '까지'; }
      if (t && more) t = c.name + ' ' + t;
      li.querySelector('.ln').title = r.done[k] ? '눌러서 이 차시부터 ‘끝냄’ 지우기' : '눌러서 이 차시까지 ‘끝냄’으로 기록';
      if (t) li.querySelector('.lw').insertAdjacentHTML('afterbegin', '<span class="pg">' + esc(t) + '</span>');
    });
  }
  // 차시 번호를 누름: 처음 고른 반에서 끝낸 차시면 그 차시부터 뒤를 지우고, 아니면 그 차시까지(앞 차시 포함) 모두 끝냄
  function upTo(k) {
    var c = cls(); if (!c) return;
    var undo = !!rec(c.id).done[k];
    each(function (r, x) {
      var list = (ORDER[x.book] || []).map(function (o) { return o.k; }), i = list.indexOf(k); if (i < 0) return;
      if (undo) {
        list.slice(i).forEach(function (kk) { delete r.done[kk]; });
        var prev = list.slice(0, i).filter(function (kk) { return r.done[kk]; }).pop();
        r.last = prev ? { k: prev, d: r.done[prev] } : null;
      } else {
        list.slice(0, i + 1).forEach(function (kk) { if (!r.done[kk]) r.done[kk] = today(); });
        r.last = { k: k, d: today() };
      }
      r.now = null;
    });
  }
  function start(k) { if (!k || !cls()) return; each(function (r) { r.now = { k: k, d: today() }; }); }
  function pick(id) {
    var i = sel.indexOf(id);
    if (multi) { if (i > -1) sel.splice(i, 1); else sel.push(id); }
    else sel = i > -1 && sel.length === 1 ? [] : [id];
    ending = false; partIn = false; keep();
    var c = byId(id);
    if (sel.indexOf(id) > -1 && c && c.book !== book && !q) { book = c.book; history.replaceState(null, '', '#' + book); render(); } else marks();
  }
  function finish(part) {
    ending = false; partIn = false;
    each(function (r) {
      var k = r.now && r.now.k; if (!k) return;
      if (part) r.last = { k: k, d: today(), part: part };
      else { r.done[k] = today(); r.last = { k: k, d: today() }; }
      r.now = null;
    });
  }
  function wireClasses() {
    var box = $('cls');
    box.onclick = function (e) {
      var t = e.target.closest('button,a'); if (!t || t.disabled) return;
      var d = t.dataset, cs = chosen();
      if (d.add) { adding = adding ? null : { g: 1, n: [], book: book }; partIn = false; panel(); }
      else if (d.g) { adding.g = +d.g; adding.n = []; panel(); }
      else if (d.n) { var n = +d.n, i = adding.n.indexOf(n); if (i > -1) adding.n.splice(i, 1); else adding.n.push(n); panel(); }
      else if (d.bk) { adding.book = d.bk; panel(); }
      else if (d.close) { adding = null; panel(); }
      else if (d.make) {
        var t0 = Date.now(), bk = adding.book, add = adding.n.sort(function (a, b) { return a - b; }).map(function (n, j) { return { id: 'c' + (t0 + j).toString(36), name: adding.g + '-' + n, book: bk }; });
        adding = null;
        pgSave({ classes: PG.classes.concat(add) }).then(function () {
          if (add.length > 1) multi = true;
          sel = add.map(function (c) { return c.id; }); keep();
          if (bk !== book && !q) { book = bk; history.replaceState(null, '', '#' + book); render(); } else marks();
        });
      }
      else if (d.multi) { multi = !multi; if (!multi) sel = sel.slice(0, 1); keep(); marks(); }
      else if (d.alls) { sel = cs.length === PG.classes.length ? [] : PG.classes.slice().sort(natural).map(function (c) { return c.id; }); keep(); marks(); }
      else if (d.id) pick(d.id);
      else if (d.del) {
        if (!cs.length || !confirm('‘' + names(cs) + '’ 반과 진도 기록을 지울까요?')) return;
        pgSave({ classes: PG.classes.filter(function (x) { return sel.indexOf(x.id) < 0; }) }).then(function () { sel = []; keep(); marks(); });
      } else if (d.start) start(d.start);
      else if (d.end === 'all') finish();
      else if (d.end === 'part') { partIn = true; panel(); }
      else if (d.end === 'back') { partIn = false; panel(); }
      else if (d.end === 'save') { var v = ($('partIn').value || '').trim(); if (!v) return $('partIn').focus(); finish(v); }
      else if (d.end === 'cancel') each(function (r) { r.now = null; });
    };
    box.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'partIn') { var v = e.target.value.trim(); if (v) finish(v); } });
    // 반을 고른 채 차시를 열면(▶·제목·웹 슬라이드) 고른 반 모두 ‘수업 중’으로 기록
    $('units').addEventListener('click', function (e) {
      var a = e.target.closest('.ls a'), ln = e.target.closest('.ls .ln');
      if (!cls()) return;
      if (a && (a.classList.contains('play') || a.classList.contains('lt') || /slides\d+\.html$/.test(a.getAttribute('href') || ''))) start(a.closest('.ls').dataset.k);
      else if (ln) upTo(ln.closest('.ls').dataset.k);
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
      sel = sel.filter(byId);
      ending = endAsk && chosen().some(function (c) { return rec(c.id).now; });
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

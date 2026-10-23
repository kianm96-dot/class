/* 골든벨 · 퀴즈 배틀 (과학 실험실 골든벨과 같은 진행 방식).
   주소: quiz/bell.html?u=m2/society  (쉼표로 여러 단원: ?u=m1/self,m1/others)
   - 골든벨(교사 진행): 선생님이 띄우고 학생은 보드판에 답을 쓴다 → [정답 공개] → 맞힌 모둠을 눌러 점수. 마지막 문제는 2배.
   - 개인 풀이: 보기를 눌러 혼자(또는 모둠이 번갈아) 푼다.
   교사 잠금 서버에서 학생 화면이면(window.IS_TEACHER === false) 골든벨 모드는 숨긴다. 문항은 assets/quizbank.js(tools/build_quiz.py). */
(function () {
  var QB = window.QB || {}, C = window.CATALOG || [], app = document.getElementById('app'), hud = document.getElementById('hud');
  var TEACHER = window.IS_TEACHER !== false, NUM = '①②③④⑤';
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  var units = [];
  C.forEach(function (b) { b.units.forEach(function (u) { var k = b.id + '/' + u.dir; if (QB[k]) units.push({ key: k, name: b.book + ' ' + ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'][u.no - 1] + ' ' + u.title, n: QB[k].length }); }); });
  var want = (new URLSearchParams(location.search).get('u') || '').split(',').filter(function (k) { return QB[k]; });
  var S = { sel: want.length ? want : units.slice(0, 1).map(function (u) { return u.key; }), mode: TEACHER ? 'bell' : 'solo', sec: 20, cnt: 10, teams: 4 };
  try { var saved = JSON.parse(localStorage.getItem('moralBell') || '{}'); ['sec', 'cnt', 'teams'].forEach(function (k) { if (saved[k]) S[k] = saved[k]; }); if (TEACHER && saved.mode) S.mode = saved.mode; } catch (e) {}
  var qs, qi, deadline, revealed, picked, right, score, timer, wrong, scored;

  // 효과음(작게). 칠판 스피커에서 시간 끝·정답을 알린다.
  var AC = null; function beep(f, d, t0) { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); var o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + (t0 || 0); o.frequency.value = f; g.gain.setValueAtTime(.15, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d); } catch (e) {} }

  function chips(name, list, cur, multi) {
    return '<div class="chips" data-k="' + name + '">' + list.map(function (x) {
      var on = multi ? cur.indexOf(x[0]) > -1 : String(cur) === String(x[0]);
      return '<button type="button" class="chip" data-v="' + esc(x[0]) + '" aria-pressed="' + on + '">' + x[1] + '</button>';
    }).join('') + '</div>';
  }
  function setup() {
    clearInterval(timer); hud.textContent = '';
    var total = S.sel.reduce(function (s, k) { return s + QB[k].length; }, 0);
    app.innerHTML = '<h1>🏆 도덕 골든벨</h1><p class="lead">' + (TEACHER ? '<b>골든벨</b>: 선생님이 화면을 띄우고 진행해요. 학생은 보드판에 답을 쓰고, 정답을 공개한 뒤 맞힌 모둠에 점수를 줘요. <b>개인 풀이</b>: 보기를 눌러 혼자 풀어요.' : '보기를 눌러 혼자 풀어요. 모둠이 번갈아 풀 수도 있어요. 선생님이 진행하는 골든벨 모드는 교사 로그인 뒤 열려요.') + '</p>' +
      '<div class="box"><h2>단원 (여러 개 고를 수 있어요)</h2>' + chips('sel', units.map(function (u) { return [u.key, esc(u.name) + '<small>' + u.n + '문항</small>']; }), S.sel, true) + '</div>' +
      '<div class="box"><h2>방법</h2>' + chips('mode', TEACHER ? [['bell', '골든벨(교사 진행)'], ['solo', '개인 풀이']] : [['solo', '개인 풀이']], S.mode) +
      '<h2 style="margin-top:14px">제한 시간</h2>' + chips('sec', [[10, '10초'], [20, '20초'], [30, '30초'], [45, '45초']], S.sec) +
      '<h2 style="margin-top:14px">문제 수</h2>' + chips('cnt', [[10, '10문제'], [15, '15문제'], [20, '20문제']], S.cnt) +
      '<h2 style="margin-top:14px">모둠</h2>' + chips('teams', [[1, '없음(1명)'], [2, '2모둠'], [3, '3모둠'], [4, '4모둠'], [5, '5모둠'], [6, '6모둠']], S.teams) + '</div>' +
      '<button type="button" class="go" id="start"' + (total ? '' : ' disabled') + '>시작 ▶</button><p class="note">고른 단원 문항 ' + total + '개 가운데 무작위로 나와요.</p>';
    app.querySelectorAll('.chips').forEach(function (g) {
      g.onclick = function (e) {
        var b = e.target.closest('.chip'); if (!b) return; var k = g.dataset.k, v = b.dataset.v;
        if (k === 'sel') { var i = S.sel.indexOf(v); if (i > -1) { if (S.sel.length > 1) S.sel.splice(i, 1); } else S.sel.push(v); }
        else S[k] = isNaN(+v) ? v : +v;
        try { localStorage.setItem('moralBell', JSON.stringify({ sec: S.sec, cnt: S.cnt, teams: S.teams, mode: S.mode })); } catch (e2) {}
        setup();
      };
    });
    document.getElementById('start').onclick = start;
  }
  function start() {
    var pool = []; S.sel.forEach(function (k) { pool = pool.concat(QB[k]); });
    qs = shuffle(pool).slice(0, S.cnt); qi = -1; right = 0; wrong = [];
    score = Array.apply(null, Array(S.teams)).map(function () { return 0; });
    next();
  }
  function turn() { return S.teams > 1 && S.mode === 'solo' ? qi % S.teams : -1; }
  function next() {
    qi++; if (qi >= qs.length) return end();
    revealed = false; picked = -1; scored = {};
    var q = qs[qi], ord = shuffle(q[1].map(function (_, i) { return i; })), last = qi === qs.length - 1;
    q.ord = ord; deadline = Date.now() + S.sec * 1000;
    hud.textContent = (qi + 1) + ' / ' + qs.length + (turn() > -1 ? ' · ' + (turn() + 1) + '모둠 차례' : '');
    app.innerHTML = '<div class="qno">Q' + (qi + 1) + (last && S.mode === 'bell' && S.teams > 1 ? ' · 마지막 문제 (점수 2배!)' : '') + '</div>' +
      '<div class="bar" id="bar"><i style="width:100%"></i></div>' +
      '<div class="qt">' + esc(q[0]) + '</div>' +
      '<div class="opts">' + ord.map(function (i, k) { return '<button type="button" class="opt" data-i="' + i + '"><b>' + NUM[k] + '</b><span>' + esc(q[1][i]) + '</span></button>'; }).join('') + '</div>' +
      '<div id="after"></div>' +
      (S.mode === 'bell' ? '<div class="row" id="ctl"><button type="button" class="go" id="rv">정답 공개</button><button type="button" class="go alt" id="add">⏱ +10초</button></div>' : '');
    app.querySelectorAll('.opt').forEach(function (b) {
      b.onclick = function () { if (revealed || S.mode === 'bell') return; picked = +b.dataset.i; reveal(); };
      if (S.mode === 'bell') b.style.cursor = 'default';
    });
    if (S.mode === 'bell') { document.getElementById('rv').onclick = reveal; document.getElementById('add').onclick = function () { deadline += 10000; }; }
    clearInterval(timer); var lastSec = null;
    timer = setInterval(function () {
      var left = Math.max(0, deadline - Date.now()), bar = document.getElementById('bar'); if (!bar) return;
      bar.firstChild.style.width = (left / (S.sec * 1000) * 100) + '%'; bar.classList.toggle('warn', left < S.sec * 300);
      var s = Math.ceil(left / 1000); if (s !== lastSec && s <= 5 && s > 0) beep(660, .12); lastSec = s;
      if (!left) reveal();
    }, 100);
  }
  function reveal() {
    if (revealed) return; revealed = true; clearInterval(timer);
    var q = qs[qi], ok = picked === q[2], last = qi === qs.length - 1, pts = 10 * (last && S.mode === 'bell' ? 2 : 1);
    app.querySelectorAll('.opt').forEach(function (b) { var i = +b.dataset.i; b.disabled = true; if (i === q[2]) b.classList.add('ok'); else if (i === picked) b.classList.add('no'); });
    var bar = document.getElementById('bar'); if (bar) bar.firstChild.style.width = '0%';
    if (S.mode === 'solo') {
      if (ok) { right++; if (turn() > -1) score[turn()] += 10; beep(988, .25); } else { wrong.push(q); beep(220, .3); }
    } else beep(880, .2), beep(1175, .35, .2);
    var ctl = document.getElementById('ctl'); if (ctl) ctl.remove();
    var teams = S.mode === 'bell' && S.teams > 1 ? '<div class="row"><span>맞힌 모둠:</span><div class="teams">' + score.map(function (s, i) { return '<button type="button" class="team" data-t="' + i + '" aria-pressed="false">' + (i + 1) + '모둠 <b>+' + pts + '</b></button>'; }).join('') + '</div></div>' : '';
    document.getElementById('after').innerHTML = (q[3] ? '<p class="why">💡 ' + esc(q[3]) + '</p>' : '') + teams +
      '<div class="row"><button type="button" class="go" id="nx">' + (qi + 1 < qs.length ? '다음 문제 ▶' : '결과 보기') + '</button></div>';
    app.querySelectorAll('.team').forEach(function (b) {
      b.onclick = function () { var t = +b.dataset.t, on = b.getAttribute('aria-pressed') === 'true'; score[t] += on ? -pts : pts; b.setAttribute('aria-pressed', String(!on)); beep(660, .1); };
    });
    document.getElementById('nx').onclick = next;
    document.getElementById('nx').focus();
  }
  function end() {
    hud.textContent = ''; var multi = S.teams > 1 && (S.mode === 'bell' || S.mode === 'solo'), best = Math.max.apply(null, score);
    var body = multi
      ? '<h1>' + (S.mode === 'bell' ? '골든벨 끝!' : '모둠 대결 끝!') + '</h1><div class="score">' + score.map(function (s, i) { return '<div class="' + (s === best && s > 0 ? 'win' : '') + '">' + (i + 1) + '모둠<b>' + s + '</b></div>'; }).join('') + '</div>'
      : '<h1>다 풀었어요!</h1><div class="big">' + right + ' / ' + qs.length + '</div>';
    if (S.mode === 'solo' && wrong.length) body += '<div class="box"><h2>다시 볼 문제</h2><ul class="review">' + wrong.map(function (q) { return '<li><b>' + esc(q[0]) + '</b> → ' + esc(q[1][q[2]]) + (q[4] ? ' (' + q[4] + '차시)' : '') + '</li>'; }).join('') + '</ul></div>';
    app.innerHTML = body + '<div class="row"><button type="button" class="go" id="again">다시 하기</button><button type="button" class="go alt" id="back">설정으로</button></div>';
    document.getElementById('again').onclick = start; document.getElementById('back').onclick = setup;
    beep(784, .2); beep(988, .2, .2); beep(1319, .5, .4);
  }
  addEventListener('keydown', function (e) {
    if (!qs || qi < 0 || qi >= qs.length) return;
    var k = '12345'.indexOf(e.key);
    if (k > -1 && !revealed && S.mode === 'solo') { var b = app.querySelectorAll('.opt')[k]; if (b) b.click(); }
    else if ((e.key === 'Enter' || e.key === ' ') && !revealed && S.mode === 'bell') { e.preventDefault(); reveal(); }
  });
  setup();
})();

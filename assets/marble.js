/* 🎱 구슬 레이스 뽑기 (수업 진행 도구). 이름 구슬이 핀 · 빙빙 도는 풍차 · 비탈길을 굴러 내려가고, 결승 앞 좁은 문을 먼저 빠져나온 구슬이 뽑힘.
   window.MarbleRace(이름 배열, 끝났을 때 함수(뽑힌 이름)) → 화면 전체에 띄움.
   ×1 ×2 ×3 배속, 1등이 결승에 가까워지면 느린 화면 + 확대, 왼쪽 미니맵. 물리는 직접 계산(원-원, 원-선분), 외부 라이브러리 없음. */
(function () {
  var W = 800, R = 15, G = 1500, FIN = 3260, H = 3420;
  // spin: 빙빙 도는 막대(arms 2면 십자 풍차). w = 초당 회전(라디안)
  function course() {
    var pegs = [], segs = [], spin = [], x, y, row, i;
    for (y = 280, row = 0; y < 900; y += 78, row++) for (x = (row % 2 ? 75 : 40); x < W - 20; x += 72) pegs.push({ x: x + (Math.random() * 10 - 5), y: y, r: 7 });
    [[170, 1000, 2.4], [400, 1060, -3], [630, 1000, 2.7]].forEach(function (s) { spin.push({ x: s[0], y: s[1], len: 150, w: s[2], t: Math.random() * 3, arms: 2 }); });
    segs.push({ a: [0, 1150], b: [330, 1300] }, { a: [W, 1150], b: [W - 330, 1300] });                       // 깔때기
    for (i = 0; i < 7; i++) segs.push({ a: [70 + i * 105, 1430], b: [110 + i * 105, 1370] });                // 빗살 막대 ///
    for (i = 0; i < 4; i++) { x = 100 + i * 200; segs.push({ a: [x - 90, 1540], b: [x - 26, 1600] }, { a: [x + 26, 1600], b: [x + 90, 1540] }); }   // 지그재그 V (가운데 틈으로 빠짐)
    for (y = 1720, row = 0; y < 2160; y += 95, row++) for (x = (row % 2 ? 110 : 60); x < W - 30; x += 110) pegs.push({ x: x, y: y, r: 10 });
    spin.push({ x: 250, y: 1920, len: 170, w: -2.2, t: 1, arms: 1 }, { x: 560, y: 2020, len: 170, w: 2.6, t: 0, arms: 1 });
    for (i = 0; i < 3; i++) { y = 2260 + i * 200; segs.push(i % 2 ? { a: [W, y], b: [150, y + 110] } : { a: [0, y], b: [W - 150, y + 110] }); }   // 비탈길
    segs.push({ a: [0, 2930], b: [W / 2 - 30, 3110] }, { a: [W, 2930], b: [W / 2 + 30, 3110] });                // 결승 앞 좁은 문(구슬 하나 지나감)
    spin.push({ x: W / 2, y: 3030, len: 130, w: 1.7, t: 0, arms: 2 });                                         // 문 위 풍차: 막았다 열었다
    return { pegs: pegs, segs: segs, spin: spin };
  }
  function bars(s) { var out = []; for (var k = 0; k < s.arms; k++) { var a = s.t + k * Math.PI / 2, ux = Math.cos(a) * s.len / 2, uy = Math.sin(a) * s.len / 2; out.push([s.x - ux, s.y - uy, s.x + ux, s.y + uy]); } return out; }
  function seg(c, ax, ay, bx, by, s) {   // 원과 선분: 겹치면 밀어내고 튕김(s = 도는 막대면 그 지점 속도까지)
    var dx = bx - ax, dy = by - ay, t = ((c.x - ax) * dx + (c.y - ay) * dy) / (dx * dx + dy * dy); t = Math.max(0, Math.min(1, t));
    var px = ax + dx * t, py = ay + dy * t, nx = c.x - px, ny = c.y - py, d = Math.sqrt(nx * nx + ny * ny), m = R + 5;
    if (d >= m || d === 0) return;
    nx /= d; ny /= d; c.x = px + nx * m; c.y = py + ny * m;
    var svx = s ? -s.w * (py - s.y) : 0, svy = s ? s.w * (px - s.x) : 0, rvx = c.vx - svx, rvy = c.vy - svy, vn = rvx * nx + rvy * ny;
    if (vn < 0) { c.vx -= 1.45 * vn * nx; c.vy -= 1.45 * vn * ny; c.vx *= .995; }
  }
  window.MarbleRace = function (names, done) {
    var box = document.createElement('div'); box.className = 'mr';
    box.innerHTML = '<style>.mr{position:fixed;inset:0;z-index:60;background:#000;display:flex;flex-direction:column;font-family:Jua,"Gowun Dodum",sans-serif}' +
      '.mr .bar{display:flex;gap:8px;align-items:center;padding:8px 12px;color:#fff;font-size:18px;background:#111}.mr .bar .sp{flex:1}' +
      '.mr button{font:17px Jua,sans-serif;border:0;border-radius:999px;padding:6px 16px;cursor:pointer;background:#fff;color:#2b211e}.mr button.go{background:#ff7a6b;color:#fff}' +
      '.mr .spd{display:flex;background:#333;border-radius:999px;padding:3px}.mr .spd button{background:none;color:#ccc;padding:4px 12px}.mr .spd button[aria-pressed="true"]{background:#3ff;color:#000}' +
      '.mr .st{flex:1;position:relative;min-height:0}.mr canvas{position:absolute;inset:0;width:100%;height:100%}' +
      '.mr .rank{position:absolute;right:14px;top:12px;font-size:24px;text-align:right;line-height:1.35;text-shadow:0 0 8px #000}.mr .rank:empty{display:none}' +
      '.mr .slow{position:absolute;left:50%;top:14px;transform:translateX(-50%);color:#ff5;font-size:22px;letter-spacing:2px;text-shadow:0 0 10px #ff5}.mr .slow[hidden]{display:none}' +
      '.mr .win{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}.mr .win div{background:#fff;border-radius:28px;padding:3vh 6vw;text-align:center;font-size:min(11vw,15vh);color:#ff7a6b;box-shadow:0 0 60px rgba(51,255,255,.6);animation:mrpop .5s ease-out}' +
      '.mr .win small{display:block;font-size:min(3.5vw,4vh);color:#6f5f57}@keyframes mrpop{from{transform:scale(.3);opacity:0}}</style>' +
      '<div class="bar">🎱 구슬 레이스 · ' + names.length + '명<span class="sp"></span><span class="spd" role="group" aria-label="배속"><button type="button" data-s="1" aria-pressed="true">×1</button><button type="button" data-s="2" aria-pressed="false">×2</button><button type="button" data-s="3" aria-pressed="false">×3</button></span>' +
      '<button type="button" class="go" data-k="again">다시 굴리기</button><button type="button" data-k="close">닫기 (Esc)</button></div>' +
      '<div class="st"><canvas></canvas><div class="rank"></div><div class="slow" hidden>⏳ 결승 직전!</div><div class="win"></div></div>';
    document.body.appendChild(box);
    var cv = box.querySelector('canvas'), cx = cv.getContext('2d'), rank = box.querySelector('.rank'), win = box.querySelector('.win'), slowEl = box.querySelector('.slow');
    var C, balls, cam, camX, zoom, order, raf, last, over, speed = 1, AC = null, ticked = 0;
    function beep(f, d) { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); var o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.15, AC.currentTime); g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + d); o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + d); } catch (e) {} }
    function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function start() {
      C = course(); order = []; over = false; win.innerHTML = ''; rank.innerHTML = ''; slowEl.hidden = true;
      var cols = Math.min(names.length, 12), mix = names.slice().sort(function () { return Math.random() - .5; });
      balls = mix.map(function (n, i) { return { n: n, x: 60 + (i % cols) * ((W - 120) / Math.max(1, cols - 1)), y: 60 + Math.floor(i / cols) * 36, vx: Math.random() * 40 - 20, vy: 0, c: 'hsl(' + Math.round(names.indexOf(n) * 360 / names.length) + ' 85% 62%)', still: 0, done: false }; });
      cam = 0; camX = W / 2; zoom = 1; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    }
    function step(dt) {
      C.spin.forEach(function (s) { s.t += s.w * dt; });
      balls.forEach(function (b) {
        if (b.done) return;
        b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt;
        var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy); if (sp > 1400) { b.vx *= 1400 / sp; b.vy *= 1400 / sp; }
        if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx) * .6; } if (b.x > W - R) { b.x = W - R; b.vx = -Math.abs(b.vx) * .6; }
        C.pegs.forEach(function (p) { var dx = b.x - p.x, dy = b.y - p.y, d = Math.sqrt(dx * dx + dy * dy), m = R + p.r; if (d < m && d > 0) { dx /= d; dy /= d; b.x = p.x + dx * m; b.y = p.y + dy * m; var vn = b.vx * dx + b.vy * dy; if (vn < 0) { b.vx -= 1.5 * vn * dx; b.vy -= 1.5 * vn * dy; b.vx += (Math.random() - .5) * 30; } } });
        C.segs.forEach(function (s) { seg(b, s.a[0], s.a[1], s.b[0], s.b[1]); });
        C.spin.forEach(function (s) { bars(s).forEach(function (l) { seg(b, l[0], l[1], l[2], l[3], s); }); });
        if (sp < 25) { if ((b.still += dt) > 1.2) { b.vx += (Math.random() - .5) * 500; b.vy -= 300; b.still = 0; } } else b.still = 0;   // 끼면 살짝 흔들기
        if (b.y > FIN && !b.done) { b.done = true; order.push(b); beep(order.length === 1 ? 988 : 520, .2); if (order.length === 1) finish(b); paintRank(); }
      });
      for (var i = 0; i < balls.length; i++) for (var j = i + 1; j < balls.length; j++) {   // 구슬끼리
        var a = balls[i], c = balls[j]; if (a.done || c.done) continue;
        var dx = c.x - a.x, dy = c.y - a.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 2 * R && d > 0) { dx /= d; dy /= d; var o = (2 * R - d) / 2; a.x -= dx * o; a.y -= dy * o; c.x += dx * o; c.y += dy * o; var vn = (c.vx - a.vx) * dx + (c.vy - a.vy) * dy; if (vn < 0) { a.vx += vn * dx * .9; a.vy += vn * dy * .9; c.vx -= vn * dx * .9; c.vy -= vn * dy * .9; } }
      }
    }
    function paintRank() { rank.innerHTML = order.slice(0, 5).map(function (b, i) { return '<b style="color:' + b.c + '">' + esc(b.n) + ' #' + (i + 1) + '</b>'; }).join('<br>'); }
    function finish(b) {
      over = true; slowEl.hidden = true;
      setTimeout(function () { win.innerHTML = '<div>' + esc(b.n) + '<small>🎉 1등으로 도착!</small></div>'; beep(1175, .6); }, 300);
      if (done) done(b.n);
    }
    function line(x1, y1, x2, y2) { cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2); cx.stroke(); }
    function frame(now) {
      var dt = Math.min(.033, (now - last) / 1000); last = now;
      var live = balls.filter(function (b) { return !b.done; }), lead = live.reduce(function (m, b) { return !m || b.y > m.y ? b : m; }, null);
      var near = !over && lead && lead.y > FIN - 380;   // 1등이 결승 가까이: 느린 화면 + 확대
      slowEl.hidden = !near;
      var n = Math.round(6 * speed * (near ? .35 : 1)) || 1;
      for (var k = 0; k < n; k++) step(dt / 6);
      if (near && ++ticked % 20 === 0) beep(330, .05);
      var rw = cv.clientWidth, rh = cv.clientHeight, dpr = devicePixelRatio || 1;
      if (cv.width !== Math.round(rw * dpr) || cv.height !== Math.round(rh * dpr)) { cv.width = Math.round(rw * dpr); cv.height = Math.round(rh * dpr); }
      zoom += ((near ? 1.7 : 1) - zoom) * .06;
      var sc = Math.min(rw / W, rh / 700) * zoom, viewH = rh / sc, viewW = rw / sc;
      var ty = over ? FIN - viewH * .55 : lead ? lead.y - viewH * .6 : cam, tx = near && lead ? lead.x : W / 2;
      cam += (Math.max(-40, Math.min(H - viewH, ty)) - cam) * .08; camX += (tx - camX) * .08;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.fillStyle = '#000'; cx.fillRect(0, 0, rw, rh);
      cx.setTransform(sc * dpr, 0, 0, sc * dpr, (rw / 2 - camX * sc) * dpr, -cam * sc * dpr);
      cx.strokeStyle = '#fff'; cx.lineWidth = 4; cx.shadowColor = '#3ff'; cx.shadowBlur = 14; line(0, cam - 50, 0, cam + viewH + 50); line(W, cam - 50, W, cam + viewH + 50);
      for (var x = 0; x < W; x += 40) { cx.shadowBlur = 0; cx.fillStyle = (x / 40) % 2 ? '#fff' : '#333'; cx.fillRect(x, FIN, 40, 14); }
      cx.fillStyle = '#ff5'; cx.font = '28px Jua, sans-serif'; cx.textAlign = 'center'; cx.fillText('🏁 결승선', W / 2, FIN + 50);
      cx.shadowBlur = 12; cx.fillStyle = '#3ff'; C.pegs.forEach(function (p) { cx.beginPath(); cx.arc(p.x, p.y, p.r * .8, 0, 7); cx.fill(); });
      cx.strokeStyle = '#3ff'; cx.lineWidth = 10; cx.lineCap = 'round';
      C.segs.forEach(function (s) { line(s.a[0], s.a[1], s.b[0], s.b[1]); });
      cx.strokeStyle = '#f5f'; cx.shadowColor = '#f5f'; C.spin.forEach(function (s) { bars(s).forEach(function (l) { line(l[0], l[1], l[2], l[3]); }); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(s.x, s.y, 6, 0, 7); cx.fill(); });
      cx.shadowBlur = 0; cx.font = '18px Jua, "Gowun Dodum", sans-serif';
      balls.forEach(function (b) {
        cx.fillStyle = b.c; cx.shadowColor = b.c; cx.shadowBlur = 10; cx.beginPath(); cx.arc(b.x, b.y, R, 0, 7); cx.fill(); cx.shadowBlur = 0;
        if (order[0] === b || (lead === b && near)) { cx.strokeStyle = '#fff'; cx.lineWidth = 3; cx.stroke(); }
        cx.fillStyle = b.c; cx.textAlign = 'center'; cx.fillText(b.n, b.x, b.y + R + 18);
      });
      // 미니맵 (왼쪽): 코스 전체와 지금 보는 곳
      var mh = rh - 24, ms = mh / H, mw = W * ms;
      if (rw > 700) {
        cx.setTransform(dpr, 0, 0, dpr, 12 * dpr, 12 * dpr);
        cx.fillStyle = 'rgba(60,60,60,.75)'; cx.fillRect(0, 0, mw, mh);
        cx.setTransform(ms * dpr, 0, 0, ms * dpr, 12 * dpr, 12 * dpr);
        cx.strokeStyle = '#9aa'; cx.lineWidth = 2 / ms * .6; C.segs.forEach(function (s) { line(s.a[0], s.a[1], s.b[0], s.b[1]); });
        C.spin.forEach(function (s) { bars(s).forEach(function (l) { line(l[0], l[1], l[2], l[3]); }); });
        balls.forEach(function (b) { cx.fillStyle = b.c; cx.beginPath(); cx.arc(b.x, b.y, 2.5 / ms, 0, 7); cx.fill(); });
        cx.strokeStyle = '#3f3'; cx.lineWidth = 1.5 / ms; cx.strokeRect(camX - viewW / 2, cam, viewW, viewH);
      }
      raf = requestAnimationFrame(frame);
    }
    function close() { cancelAnimationFrame(raf); removeEventListener('keydown', key); box.remove(); }
    function key(e) { if (e.key === 'Escape') close(); }
    addEventListener('keydown', key);
    box.querySelector('.bar').onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.s) { speed = +b.dataset.s; box.querySelectorAll('.spd button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); }
      else if (b.dataset.k === 'close') close(); else start();
    };
    start();
  };
})();

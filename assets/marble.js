/* 🎱 구슬 레이스 뽑기 (수업 진행 도구). 이름 구슬이 핀·회전 막대·비탈길을 굴러 내려가고 결승선에 먼저 닿은 구슬이 뽑힘.
   window.MarbleRace(이름 배열, 끝났을 때 함수(뽑힌 이름)) → 화면 전체에 띄움. 물리는 직접 계산(원-원, 원-선분), 외부 라이브러리 없음. */
(function () {
  var W = 800, H = 3300, R = 15, G = 1500, FIN = 3150;
  function course() {
    var pegs = [], segs = [], spin = [];
    for (var y = 300, row = 0; y < 1050; y += 78, row++) for (var x = (row % 2 ? 75 : 40); x < W - 20; x += 72) pegs.push({ x: x + (Math.random() * 10 - 5), y: y, r: 7 });
    segs.push({ a: [0, 1080], b: [330, 1230] }, { a: [W, 1080], b: [W - 330, 1230] });                        // 깔때기
    [[170, 1420, 2.2], [400, 1520, -2.8], [630, 1420, 2.5]].forEach(function (s) { spin.push({ x: s[0], y: s[1], len: 190, w: s[2], t: Math.random() * 3 }); });
    for (y = 1700, row = 0; y < 2250; y += 95, row++) for (x = (row % 2 ? 110 : 60); x < W - 30; x += 110) pegs.push({ x: x, y: y, r: 10 });
    for (var i = 0; i < 4; i++) { var yy = 2330 + i * 190; segs.push(i % 2 ? { a: [W, yy], b: [150, yy + 110] } : { a: [0, yy], b: [W - 150, yy + 110] }); }   // 비탈길
    spin.push({ x: W / 2, y: 3060, len: 240, w: 3.2, t: 0 });
    return { pegs: pegs, segs: segs, spin: spin };
  }
  function seg(c, ax, ay, bx, by, vx, vy) {   // 원과 선분: 겹치면 밀어내고 튕김(vx·vy = 그 지점의 선분 속도)
    var dx = bx - ax, dy = by - ay, t = ((c.x - ax) * dx + (c.y - ay) * dy) / (dx * dx + dy * dy); t = Math.max(0, Math.min(1, t));
    var px = ax + dx * t, py = ay + dy * t, nx = c.x - px, ny = c.y - py, d = Math.sqrt(nx * nx + ny * ny), m = R + 4;
    if (d >= m || d === 0) return;
    nx /= d; ny /= d; c.x = px + nx * m; c.y = py + ny * m;
    var rvx = c.vx - (vx || 0), rvy = c.vy - (vy || 0), vn = rvx * nx + rvy * ny;
    if (vn < 0) { c.vx -= 1.45 * vn * nx; c.vy -= 1.45 * vn * ny; c.vx *= .995; }
  }
  window.MarbleRace = function (names, done) {
    var box = document.createElement('div'); box.className = 'mr';
    box.innerHTML = '<style>.mr{position:fixed;inset:0;z-index:60;background:#1d1a19;display:flex;flex-direction:column;font-family:Jua,"Gowun Dodum",sans-serif}' +
      '.mr .bar{display:flex;gap:8px;align-items:center;padding:8px 12px;color:#fff;font-size:18px}.mr .bar .sp{flex:1}' +
      '.mr button{font:17px Jua,sans-serif;border:0;border-radius:999px;padding:6px 16px;cursor:pointer;background:#fff;color:#2b211e}.mr button.go{background:#ff7a6b;color:#fff}' +
      '.mr .st{flex:1;position:relative;min-height:0}.mr canvas{position:absolute;inset:0;width:100%;height:100%}' +
      '.mr .rank{position:absolute;right:12px;top:12px;background:rgba(255,255,255,.92);border-radius:14px;padding:8px 14px;font-size:18px;min-width:150px}.mr .rank:empty{display:none}' +
      '.mr .win{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}.mr .win div{background:#fff;border-radius:28px;padding:3vh 6vw;text-align:center;font-size:min(11vw,15vh);color:#ff7a6b;box-shadow:0 10px 40px rgba(0,0,0,.4);animation:mrpop .5s ease-out}' +
      '.mr .win small{display:block;font-size:min(3.5vw,4vh);color:#6f5f57}@keyframes mrpop{from{transform:scale(.3);opacity:0}}</style>' +
      '<div class="bar">🎱 구슬 레이스 · ' + names.length + '명<span class="sp"></span><button type="button" class="go" data-k="again">다시 굴리기</button><button type="button" data-k="close">닫기 (Esc)</button></div>' +
      '<div class="st"><canvas></canvas><div class="rank"></div><div class="win"></div></div>';
    document.body.appendChild(box);
    var cv = box.querySelector('canvas'), cx = cv.getContext('2d'), rank = box.querySelector('.rank'), win = box.querySelector('.win');
    var C, balls, cam, order, raf, last, over, AC = null;
    function beep(f, d) { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); var o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.15, AC.currentTime); g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + d); o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + d); } catch (e) {} }
    function start() {
      C = course(); order = []; over = false; win.innerHTML = ''; rank.innerHTML = '';
      var cols = Math.min(names.length, 12);
      balls = names.map(function (n, i) { return { n: n, x: 60 + (i % cols) * ((W - 120) / Math.max(1, cols - 1)) + Math.random() * 8, y: 60 + Math.floor(i / cols) * 36 + Math.random() * 10, vx: Math.random() * 40 - 20, vy: 0, c: 'hsl(' + Math.round(i * 360 / names.length) + ' 80% 60%)', still: 0, done: false }; });
      balls.sort(function () { return Math.random() - .5; }).forEach(function (b, i) { var cols2 = Math.min(names.length, 12); b.x = 60 + (i % cols2) * ((W - 120) / Math.max(1, cols2 - 1)); b.y = 60 + Math.floor(i / cols2) * 36; });
      cam = 0; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
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
        C.spin.forEach(function (s) {
          var ux = Math.cos(s.t) * s.len / 2, uy = Math.sin(s.t) * s.len / 2, ax = s.x - ux, ay = s.y - uy, bx = s.x + ux, by = s.y + uy;
          var dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((b.x - ax) * dx + (b.y - ay) * dy) / (dx * dx + dy * dy))), px = ax + dx * t - s.x, py = ay + dy * t - s.y;
          seg(b, ax, ay, bx, by, -s.w * py, s.w * px);
        });
        if (sp < 25) { if ((b.still += dt) > 1.2) { b.vx += (Math.random() - .5) * 500; b.vy -= 300; b.still = 0; } } else b.still = 0;   // 끼면 살짝 흔들기
        if (b.y > FIN && !b.done) { b.done = true; order.push(b); beep(order.length === 1 ? 988 : 520, .2); if (order.length === 1) finish(b); paintRank(); }
      });
      for (var i = 0; i < balls.length; i++) for (var j = i + 1; j < balls.length; j++) {   // 구슬끼리
        var a = balls[i], c = balls[j]; if (a.done || c.done) continue;
        var dx = c.x - a.x, dy = c.y - a.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 2 * R && d > 0) { dx /= d; dy /= d; var o = (2 * R - d) / 2; a.x -= dx * o; a.y -= dy * o; c.x += dx * o; c.y += dy * o; var vn = (c.vx - a.vx) * dx + (c.vy - a.vy) * dy; if (vn < 0) { a.vx += vn * dx * .9; a.vy += vn * dy * .9; c.vx -= vn * dx * .9; c.vy -= vn * dy * .9; } }
      }
    }
    function paintRank() { rank.innerHTML = order.slice(0, 5).map(function (b, i) { return (i + 1) + '등 <b style="color:' + b.c + '">' + esc(b.n) + '</b>'; }).join('<br>'); }
    function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function finish(b) {
      over = true;
      setTimeout(function () { win.innerHTML = '<div>' + esc(b.n) + '<small>🎉 1등으로 도착!</small></div>'; beep(1175, .6); }, 300);
      if (done) done(b.n);
    }
    function frame(now) {
      var dt = Math.min(.033, (now - last) / 1000); last = now;
      for (var k = 0; k < 6; k++) step(dt / 6);
      var live = balls.filter(function (b) { return !b.done; }), lead = live.length ? Math.max.apply(null, live.map(function (b) { return b.y; })) : FIN;
      var rw = cv.clientWidth, rh = cv.clientHeight; if (cv.width !== rw * devicePixelRatio) { cv.width = rw * devicePixelRatio; cv.height = rh * devicePixelRatio; }
      var sc = Math.min(rw / W, rh / 700), ox = (rw - W * sc) / 2, viewH = rh / sc;
      cam += (Math.max(0, Math.min(H - viewH, (over ? FIN : lead) - viewH * .6)) - cam) * .08;
      cx.setTransform(sc * devicePixelRatio, 0, 0, sc * devicePixelRatio, ox * devicePixelRatio, -cam * sc * devicePixelRatio);
      cx.fillStyle = '#1d1a19'; cx.fillRect(-ox / sc, cam, rw / sc, viewH);
      cx.fillStyle = '#2b211e'; cx.fillRect(0, cam, W, viewH);
      cx.fillStyle = '#ffc94a'; for (var x = 0; x < W; x += 40) { cx.fillStyle = (x / 40) % 2 ? '#fff' : '#2b211e'; cx.fillRect(x, FIN, 40, 14); }
      cx.fillStyle = '#ffc94a'; cx.font = '28px Jua, sans-serif'; cx.textAlign = 'center'; cx.fillText('🏁 결승선', W / 2, FIN + 50);
      cx.fillStyle = '#8c7b72'; C.pegs.forEach(function (p) { cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 7); cx.fill(); });
      cx.strokeStyle = '#c9b8ad'; cx.lineWidth = 8; cx.lineCap = 'round';
      C.segs.forEach(function (s) { cx.beginPath(); cx.moveTo(s.a[0], s.a[1]); cx.lineTo(s.b[0], s.b[1]); cx.stroke(); });
      cx.strokeStyle = '#ff7a6b'; C.spin.forEach(function (s) { var ux = Math.cos(s.t) * s.len / 2, uy = Math.sin(s.t) * s.len / 2; cx.beginPath(); cx.moveTo(s.x - ux, s.y - uy); cx.lineTo(s.x + ux, s.y + uy); cx.stroke(); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(s.x, s.y, 6, 0, 7); cx.fill(); });
      cx.font = '17px "Gowun Dodum", sans-serif'; cx.textAlign = 'left';
      balls.forEach(function (b) {
        cx.fillStyle = b.c; cx.beginPath(); cx.arc(b.x, b.y, R, 0, 7); cx.fill();
        if (order[0] === b) { cx.strokeStyle = '#fff'; cx.lineWidth = 4; cx.stroke(); }
        cx.fillStyle = '#fff'; cx.fillText(b.n, b.x + R + 4, b.y + 6);
      });
      raf = requestAnimationFrame(frame);
    }
    function close() { cancelAnimationFrame(raf); removeEventListener('keydown', key); box.remove(); }
    function key(e) { if (e.key === 'Escape') close(); }
    addEventListener('keydown', key);
    box.querySelector('.bar').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; if (b.dataset.k === 'close') close(); else start(); };
    start();
  };
})();

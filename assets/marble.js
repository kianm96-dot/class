/* 🎱 구슬 레이스 뽑기 (수업 진행 도구). 이름 구슬이 맵을 굴러 내려가 결승 앞 좁은 문을 먼저 빠져나온 구슬이 뽑힘.
   window.MarbleRace(이름 배열, 끝났을 때 함수(뽑힌 이름)) → 화면 전체에 띄움.
   막혀서 구슬 여러 개가 뭉쳐 멈추면 💥 펑 터져 흩어짐. 맵 4개(+무작위): 장치 = 핀, 빙빙 도는 막대·풍차, 범퍼(닿으면 튕겨 나감), 좌우로 움직이는 막대, 되돌이 구멍(빠지면 위로 되돌아감 · 구슬마다 2번까지), 선.
   ×1 ×2 ×3 배속, 1등이 결승에 가까워지면 느린 화면 + 확대, 왼쪽 미니맵. 물리는 직접 계산(원-원, 원-선분), 외부 라이브러리 없음. */
(function () {
  var W = 800, R = 15, G = 1500;
  /* ───── 맵 만들기 도구 ───── */
  function Map() { this.pegs = []; this.segs = []; this.spin = []; this.bump = []; this.slide = []; this.trap = []; }
  Map.prototype = {
    grid: function (y0, y1, dx, dy, r, j) { for (var y = y0, row = 0; y < y1; y += dy, row++) for (var x = (row % 2 ? dx * .5 + 40 : 40); x < W - 30; x += dx) this.pegs.push({ x: x + (j ? Math.random() * j - j / 2 : 0), y: y, r: r }); return this; },
    line: function (ax, ay, bx, by) { this.segs.push({ a: [ax, ay], b: [bx, by] }); return this; },
    funnel: function (y, gap, h) { return this.line(0, y, W / 2 - gap / 2, y + h).line(W, y, W / 2 + gap / 2, y + h); },
    mill: function (x, y, len, w, arms) { this.spin.push({ x: x, y: y, len: len, w: w, t: Math.random() * 3, arms: arms || 2 }); return this; },
    bumper: function (x, y, r) { this.bump.push({ x: x, y: y, r: r || 32, hit: 0 }); return this; },
    slider: function (x, y, len, amp, w) { this.slide.push({ x0: x, x: x, y: y, len: len, amp: amp, w: w, t: Math.random() * 6 }); return this; },
    hole: function (x, y, toY) { this.trap.push({ x: x, y: y, r: 30, to: toY }); return this; },
    gate: function (y) { this.funnel(y, 60, 180); this.mill(W / 2, y + 100, 130, 1.7, 2); this.fin = y + 330; this.h = y + 490; return this; }   // 결승 앞 좁은 문 + 막았다 열었다 하는 풍차
  };
  var MAPS = {
    mill: { name: '🌀 풍차 마을', make: function () {
      var m = new Map().grid(280, 900, 72, 78, 7, 10);
      [[170, 1000, 2.4], [400, 1060, -3], [630, 1000, 2.7]].forEach(function (s) { m.mill(s[0], s[1], 150, s[2], 2); });
      m.funnel(1150, 140, 150);
      for (var i = 0; i < 7; i++) m.line(70 + i * 105, 1430, 110 + i * 105, 1370);
      for (i = 0; i < 4; i++) { var x = 100 + i * 200; m.line(x - 90, 1540, x - 26, 1600).line(x + 26, 1600, x + 90, 1540); }
      m.grid(1720, 2160, 110, 95, 10).mill(250, 1920, 170, -2.2, 1).mill(560, 2020, 170, 2.6, 1);
      m.slider(400, 2280, 220, 260, 1.6).bumper(170, 2400).bumper(630, 2400).bumper(400, 2520, 38).bumper(120, 2660).bumper(680, 2660).slider(400, 2760, 180, 240, -2.1);
      m.hole(90, 2840, 1680).hole(710, 2840, 1680);
      return m.gate(2930);
    } },
    pinball: { name: '💥 핀볼 대소동', make: function () {
      var m = new Map().grid(260, 600, 90, 85, 8, 12);
      [[150, 760], [400, 720], [650, 760], [270, 900], [530, 900], [120, 1050], [400, 1060], [680, 1050], [270, 1200], [530, 1200]].forEach(function (b) { m.bumper(b[0], b[1], 34); });
      m.slider(400, 1360, 240, 250, 1.8).slider(400, 1500, 240, 250, -1.4);
      m.mill(170, 1680, 160, 3, 2).mill(400, 1640, 160, -2.6, 2).mill(630, 1680, 160, 3.2, 2);
      m.grid(1820, 2080, 100, 80, 9);
      m.hole(400, 2180, 900).bumper(160, 2230, 30).bumper(640, 2230, 30).hole(90, 2330, 1300).hole(710, 2330, 1300);
      return m.gate(2420);
    } },
    stairs: { name: '🪜 지그재그 계단', make: function () {
      var m = new Map().grid(250, 500, 80, 80, 7, 10);
      for (var i = 0; i < 7; i++) {
        var y = 600 + i * 300;
        // 발판마다: 길에 박힌 혹 두 개(구슬이 통통 튀어 줄 서서 굴러가지 않게), 끝에는 빙빙 도는 막대, 3·5번째 발판 위 공중엔 되돌이 구멍(떨어지는 구슬만 걸림)
        var surf = function (x) { return i % 2 ? y + (W - x) / (W - 230) * 70 : y + x / (W - 230) * 70; };
        if (i % 2) { m.line(W, y, 230, y + 70).mill(115, y + 70, 150, 3.4, 1).bumper(560, y - 110, 26); [470, 330].forEach(function (x) { m.pegs.push({ x: x, y: surf(x) + 2, r: 8 }); }); }
        else { m.line(0, y, W - 230, y + 70).mill(W - 115, y + 70, 150, -3.4, 1).bumper(240, y - 110, 26); [330, 470].forEach(function (x) { m.pegs.push({ x: x, y: surf(x) + 2, r: 8 }); }); }
        if (i === 2 || i === 4) m.hole(i % 2 ? 560 : 240, surf(i % 2 ? 560 : 240) - 70, 600 + (i - 2) * 300);
      }
      m.slider(400, 2700, 260, 240, 2);
      return m.gate(2820);
    } },
    hell: { name: '🕳️ 함정 지옥 (짧음)', make: function () {
      var m = new Map().grid(250, 650, 80, 75, 8, 12);
      m.hole(160, 760, 200).hole(400, 790, 200).hole(640, 760, 200);
      m.mill(280, 930, 170, 2.8, 2).mill(520, 930, 170, -2.8, 2);
      m.grid(1080, 1350, 95, 85, 9).slider(400, 1450, 220, 260, 1.9);
      m.bumper(200, 1580).bumper(600, 1580).hole(400, 1640, 900);
      return m.gate(1730);
    } }
  };
  var ORDER = ['mill', 'pinball', 'stairs', 'hell'];
  function bars(s) { var out = []; for (var k = 0; k < s.arms; k++) { var a = s.t + k * Math.PI / 2, ux = Math.cos(a) * s.len / 2, uy = Math.sin(a) * s.len / 2; out.push([s.x - ux, s.y - uy, s.x + ux, s.y + uy]); } return out; }
  function seg(c, ax, ay, bx, by, vel) {   // 원과 선분: 겹치면 밀어내고 튕김(vel = 움직이는 막대면 그 지점의 속도)
    var dx = bx - ax, dy = by - ay, t = ((c.x - ax) * dx + (c.y - ay) * dy) / (dx * dx + dy * dy); t = Math.max(0, Math.min(1, t));
    var px = ax + dx * t, py = ay + dy * t, nx = c.x - px, ny = c.y - py, d = Math.sqrt(nx * nx + ny * ny), m = R + 5;
    if (d >= m || d === 0) return;
    nx /= d; ny /= d; c.x = px + nx * m; c.y = py + ny * m;
    var sv = vel ? vel(px, py) : [0, 0], rvx = c.vx - sv[0], rvy = c.vy - sv[1], vn = rvx * nx + rvy * ny;
    if (vn < 0) { c.vx -= 1.45 * vn * nx; c.vy -= 1.45 * vn * ny; c.vx *= .995; }
  }
  window.MarbleRace = function (names, done) {
    var pick = 'mill'; try { pick = localStorage.getItem('marbleMap') || 'mill'; } catch (e) {}
    var box = document.createElement('div'); box.className = 'mr';
    box.innerHTML = '<style>.mr{position:fixed;inset:0;z-index:60;background:#000;display:flex;flex-direction:column;font-family:Jua,"Gowun Dodum",sans-serif}' +
      '.mr .bar{display:flex;gap:8px;align-items:center;padding:8px 12px;color:#fff;font-size:18px;background:#111;flex-wrap:wrap}.mr .bar .sp{flex:1}' +
      '.mr button,.mr select{font:17px Jua,sans-serif;border:0;border-radius:999px;padding:6px 16px;cursor:pointer;background:#fff;color:#2b211e}.mr button.go{background:#ff7a6b;color:#fff}' +
      '.mr select{background:#222;color:#3ff;border:1.5px solid #3ff;padding:5px 12px}' +
      '.mr .spd{display:flex;background:#333;border-radius:999px;padding:3px}.mr .spd button{background:none;color:#ccc;padding:4px 12px}.mr .spd button[aria-pressed="true"]{background:#3ff;color:#000}' +
      '.mr .st{flex:1;position:relative;min-height:0}.mr canvas{position:absolute;inset:0;width:100%;height:100%}' +
      '.mr .rank{position:absolute;right:14px;top:12px;font-size:24px;text-align:right;line-height:1.35;text-shadow:0 0 8px #000}.mr .rank:empty{display:none}' +
      '.mr .slow{position:absolute;left:50%;top:14px;transform:translateX(-50%);color:#ff5;font-size:22px;letter-spacing:2px;text-shadow:0 0 10px #ff5}.mr .slow[hidden]{display:none}' +
      '.mr .toast{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);color:#f66;font-size:22px;text-shadow:0 0 10px #f00;pointer-events:none}' +
      '.mr .win{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}.mr .win div{background:#fff;border-radius:28px;padding:3vh 6vw;text-align:center;font-size:min(11vw,15vh);color:#ff7a6b;box-shadow:0 0 60px rgba(51,255,255,.6);animation:mrpop .5s ease-out}' +
      '.mr .win small{display:block;font-size:min(3.5vw,4vh);color:#6f5f57}@keyframes mrpop{from{transform:scale(.3);opacity:0}}</style>' +
      '<div class="bar">🎱 구슬 레이스 · ' + names.length + '명<select aria-label="맵 고르기">' + ORDER.map(function (k) { return '<option value="' + k + '">' + MAPS[k].name + '</option>'; }).join('') + '<option value="random">🎲 무작위 맵</option></select>' +
      '<span class="sp"></span><span class="spd" role="group" aria-label="배속"><button type="button" data-s="1" aria-pressed="true">×1</button><button type="button" data-s="2" aria-pressed="false">×2</button><button type="button" data-s="3" aria-pressed="false">×3</button></span>' +
      '<button type="button" class="go" data-k="again">다시 굴리기</button><button type="button" data-k="close">닫기 (Esc)</button></div>' +
      '<div class="st"><canvas></canvas><div class="rank"></div><div class="slow" hidden>⏳ 결승 직전!</div><div class="toast"></div><div class="win"></div></div>';
    document.body.appendChild(box);
    var cv = box.querySelector('canvas'), cx = cv.getContext('2d'), rank = box.querySelector('.rank'), win = box.querySelector('.win'), slowEl = box.querySelector('.slow'), toast = box.querySelector('.toast'), sel = box.querySelector('select');
    sel.value = MAPS[pick] || pick === 'random' ? pick : 'mill';
    var C, FIN, H, balls, cam, camX, zoom, order, raf, last, over, speed = 1, AC = null, ticked = 0, toastT = 0, booms = [], jamT = 0, boomCool = 0;
    function beep(f, d) { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); var o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.15, AC.currentTime); g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + d); o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + d); } catch (e) {} }
    function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function say(t) { toast.textContent = t; toastT = 1.6; }
    function start() {
      var k = sel.value === 'random' ? ORDER[Math.floor(Math.random() * ORDER.length)] : sel.value;
      C = MAPS[k].make(); booms = []; jamT = 0; boomCool = 3; FIN = C.fin; H = C.h; order = []; over = false; win.innerHTML = ''; rank.innerHTML = ''; slowEl.hidden = true;
      if (sel.value === 'random') say('🎲 ' + MAPS[k].name);
      var cols = Math.min(names.length, 12), mix = names.slice().sort(function () { return Math.random() - .5; });
      balls = mix.map(function (n, i) { return { n: n, x: 60 + (i % cols) * ((W - 120) / Math.max(1, cols - 1)), y: 60 + Math.floor(i / cols) * 36, vx: Math.random() * 40 - 20, vy: 0, c: 'hsl(' + Math.round(names.indexOf(n) * 360 / names.length) + ' 85% 62%)', still: 0, done: false, traps: 0 }; });
      cam = 0; camX = W / 2; zoom = 1; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    }
    /* 💥 펑: 느린 구슬 4개 이상이 한곳(지름 160 안)에 1.5초 넘게 뭉쳐 있으면 그 가운데서 터져 사방으로 흩어짐(2.5초에 한 번까지) */
    function jam(dt) {
      if ((boomCool -= dt) > 0) return;
      var slow = balls.filter(function (b) { return !b.done && b.vx * b.vx + b.vy * b.vy < 90 * 90; }), best = null;
      slow.forEach(function (a) { var g = slow.filter(function (b) { var dx = b.x - a.x, dy = b.y - a.y; return dx * dx + dy * dy < 80 * 80; }); if (!best || g.length > best.length) best = g; });
      if (!best || best.length < 4) { jamT = 0; return; }
      if ((jamT += dt) < 1.5) return;
      var x = 0, y = 0; best.forEach(function (b) { x += b.x; y += b.y; }); x /= best.length; y /= best.length;
      balls.forEach(function (b) {
        if (b.done) return; var dx = b.x - x, dy = b.y - y, d = Math.sqrt(dx * dx + dy * dy) || 1; if (d > 220) return;
        var f = 1300 * (1 - d / 260); b.vx += dx / d * f + (Math.random() - .5) * 300; b.vy += dy / d * f - 500 - Math.random() * 300; b.still = 0;
      });
      booms.push({ x: x, y: y, t: 0 }); jamT = 0; boomCool = 2.5; say('💥 펑! 막혀 있던 구슬이 흩어져요');
      beep(90, .5); beep(160, .25);
    }
    function step(dt) {
      C.spin.forEach(function (s) { s.t += s.w * dt; });
      C.slide.forEach(function (s) { s.t += dt; s.x = s.x0 + Math.sin(s.t * s.w) * s.amp; s.vx = Math.cos(s.t * s.w) * s.amp * s.w; s.x = Math.max(s.len / 2, Math.min(W - s.len / 2, s.x)); });
      C.bump.forEach(function (p) { if (p.hit > 0) p.hit -= dt; });
      jam(dt);
      balls.forEach(function (b) {
        if (b.done) return;
        b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt;
        var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy); if (sp > 1500) { b.vx *= 1500 / sp; b.vy *= 1500 / sp; }
        if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx) * .6; } if (b.x > W - R) { b.x = W - R; b.vx = -Math.abs(b.vx) * .6; }
        C.pegs.forEach(function (p) { var dx = b.x - p.x, dy = b.y - p.y, d = Math.sqrt(dx * dx + dy * dy), m = R + p.r; if (d < m && d > 0) { dx /= d; dy /= d; b.x = p.x + dx * m; b.y = p.y + dy * m; var vn = b.vx * dx + b.vy * dy; if (vn < 0) { b.vx -= 1.5 * vn * dx; b.vy -= 1.5 * vn * dy; b.vx += (Math.random() - .5) * 30; } } });
        C.bump.forEach(function (p) {   // 범퍼: 닿으면 바깥으로 세게 튕김
          var dx = b.x - p.x, dy = b.y - p.y, d = Math.sqrt(dx * dx + dy * dy), m = R + p.r;
          if (d < m && d > 0) { dx /= d; dy /= d; b.x = p.x + dx * m; b.y = p.y + dy * m; var vn = b.vx * dx + b.vy * dy; if (vn < 0) { b.vx -= vn * dx; b.vy -= vn * dy; } b.vx += dx * 650; b.vy += dy * 650; p.hit = .15; if (Math.random() < .3) beep(700 + Math.random() * 300, .05); }
        });
        C.segs.forEach(function (s) { seg(b, s.a[0], s.a[1], s.b[0], s.b[1]); });
        C.spin.forEach(function (s) { bars(s).forEach(function (l) { seg(b, l[0], l[1], l[2], l[3], function (px, py) { return [-s.w * (py - s.y), s.w * (px - s.x)]; }); }); });
        C.slide.forEach(function (s) { seg(b, s.x - s.len / 2, s.y, s.x + s.len / 2, s.y, function () { return [s.vx, 0]; }); });
        C.trap.forEach(function (t) {   // 되돌이 구멍: 위로 되돌아감(구슬마다 2번까지)
          if (b.traps >= 2) return;
          var dx = b.x - t.x, dy = b.y - t.y; if (dx * dx + dy * dy < t.r * t.r) { b.traps++; b.x = 80 + Math.random() * (W - 160); b.y = t.to; b.vx = 0; b.vy = 0; beep(220, .25); say('↩ ' + b.n + ' 되돌아감!'); }
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
    function paintRank() { rank.innerHTML = order.slice(0, 5).map(function (b, i) { return '<b style="color:' + b.c + '">' + esc(b.n) + ' #' + (i + 1) + '</b>'; }).join('<br>'); }
    function finish(b) {
      over = true; slowEl.hidden = true;
      setTimeout(function () { win.innerHTML = '<div>' + esc(b.n) + '<small>🎉 1등으로 도착!</small></div>'; beep(1175, .6); }, 300);
      if (done) done(b.n);
    }
    function line(x1, y1, x2, y2) { cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2); cx.stroke(); }
    function drawMap(mini) {
      if (!mini) { cx.shadowBlur = 12; cx.shadowColor = '#3ff'; cx.fillStyle = '#3ff'; C.pegs.forEach(function (p) { cx.beginPath(); cx.arc(p.x, p.y, p.r * .8, 0, 7); cx.fill(); }); }
      cx.strokeStyle = mini ? '#9aa' : '#3ff'; cx.lineWidth = mini ? 8 : 10; cx.lineCap = 'round';
      C.segs.forEach(function (s) { line(s.a[0], s.a[1], s.b[0], s.b[1]); });
      if (!mini) { cx.strokeStyle = '#ff5'; cx.shadowColor = '#ff5'; }
      C.slide.forEach(function (s) { line(s.x - s.len / 2, s.y, s.x + s.len / 2, s.y); });
      if (!mini) { cx.strokeStyle = '#f5f'; cx.shadowColor = '#f5f'; }
      C.spin.forEach(function (s) { bars(s).forEach(function (l) { line(l[0], l[1], l[2], l[3]); }); if (!mini) { cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(s.x, s.y, 6, 0, 7); cx.fill(); } });
      C.bump.forEach(function (p) { cx.fillStyle = mini ? '#f80' : p.hit > 0 ? '#fff' : '#f80'; if (!mini) { cx.shadowColor = '#f80'; cx.shadowBlur = p.hit > 0 ? 30 : 14; } cx.beginPath(); cx.arc(p.x, p.y, p.hit > 0 && !mini ? p.r * 1.12 : p.r, 0, 7); cx.fill(); });
      C.trap.forEach(function (t) {
        if (!mini) { cx.shadowColor = '#f00'; cx.shadowBlur = 18; }
        cx.fillStyle = '#300'; cx.strokeStyle = '#f33'; cx.lineWidth = mini ? 10 : 4; cx.beginPath(); cx.arc(t.x, t.y, t.r, 0, 7); cx.fill(); cx.stroke();
        if (!mini) { cx.shadowBlur = 0; cx.fillStyle = '#f66'; cx.font = '26px Jua, sans-serif'; cx.textAlign = 'center'; cx.fillText('↩', t.x, t.y + 9); }
      });
      cx.shadowBlur = 0;
    }
    function frame(now) {
      var dt = Math.min(.033, (now - last) / 1000); last = now;
      var live = balls.filter(function (b) { return !b.done; }), lead = live.reduce(function (m, b) { return !m || b.y > m.y ? b : m; }, null);
      var near = !over && lead && lead.y > FIN - 380;   // 1등이 결승 가까이: 느린 화면 + 확대
      slowEl.hidden = !near;
      if (toastT > 0) { toastT -= dt; if (toastT <= 0) toast.textContent = ''; }
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
      cx.shadowBlur = 0; for (var x = 0; x < W; x += 40) { cx.fillStyle = (x / 40) % 2 ? '#fff' : '#333'; cx.fillRect(x, FIN, 40, 14); }
      cx.fillStyle = '#ff5'; cx.font = '28px Jua, sans-serif'; cx.textAlign = 'center'; cx.fillText('🏁 결승선', W / 2, FIN + 50);
      drawMap(false);
      booms = booms.filter(function (o) { o.t += dt; return o.t < .7; });
      booms.forEach(function (o) {   // 펑: 퍼지는 고리 + 불꽃
        var k = o.t / .7; cx.globalAlpha = 1 - k; cx.strokeStyle = '#ff5'; cx.shadowColor = '#f80'; cx.shadowBlur = 30; cx.lineWidth = 10 * (1 - k) + 2;
        cx.beginPath(); cx.arc(o.x, o.y, 30 + k * 220, 0, 7); cx.stroke();
        cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(o.x, o.y, 40 * (1 - k), 0, 7); cx.fill();
        cx.font = (60 + 40 * k) + 'px Jua, sans-serif'; cx.textAlign = 'center'; cx.fillStyle = '#ff5'; cx.fillText('💥', o.x, o.y - 30 - k * 40);
        cx.globalAlpha = 1; cx.shadowBlur = 0;
      });
      cx.font = '18px Jua, "Gowun Dodum", sans-serif';
      balls.forEach(function (b) {
        cx.fillStyle = b.c; cx.shadowColor = b.c; cx.shadowBlur = 10; cx.beginPath(); cx.arc(b.x, b.y, R, 0, 7); cx.fill(); cx.shadowBlur = 0;
        if (order[0] === b || (lead === b && near)) { cx.strokeStyle = '#fff'; cx.lineWidth = 3; cx.stroke(); }
        cx.fillStyle = b.c; cx.textAlign = 'center'; cx.fillText(b.n, b.x, b.y + R + 18);
      });
      // 미니맵 (왼쪽): 코스 전체와 지금 보는 곳
      var mh = Math.min(rh - 24, 520), ms = mh / H, mw = W * ms;
      if (rw > 700) {
        cx.setTransform(dpr, 0, 0, dpr, 12 * dpr, 12 * dpr); cx.fillStyle = 'rgba(60,60,60,.75)'; cx.fillRect(0, 0, mw, mh);
        cx.setTransform(ms * dpr, 0, 0, ms * dpr, 12 * dpr, 12 * dpr);
        drawMap(true);
        balls.forEach(function (b) { cx.fillStyle = b.c; cx.beginPath(); cx.arc(b.x, b.y, 2.5 / ms, 0, 7); cx.fill(); });
        cx.strokeStyle = '#3f3'; cx.lineWidth = 1.5 / ms; cx.strokeRect(camX - viewW / 2, cam, viewW, viewH);
      }
      raf = requestAnimationFrame(frame);
    }
    function close() { cancelAnimationFrame(raf); removeEventListener('keydown', key); box.remove(); }
    function key(e) { if (e.key === 'Escape') close(); }
    addEventListener('keydown', key);
    sel.onchange = function () { try { localStorage.setItem('marbleMap', sel.value); } catch (e) {} start(); };
    box.querySelector('.bar').onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.s) { speed = +b.dataset.s; box.querySelectorAll('.spd button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); }
      else if (b.dataset.k === 'close') close(); else start();
    };
    start();
  };
})();

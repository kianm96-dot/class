/* 🎱 구슬 레이스 뽑기 (수업 진행 도구). 이름 구슬이 맵을 굴러 내려가 결승선을 먼저(또는 마지막으로) 지나는 구슬이 뽑힘.
   window.MarbleRace(이름 배열, 끝났을 때 함수(뽑힌 이름)) → 화면 전체에 띄움. [다시 굴리기]하면 함수가 다시 불림.
   역전 장치: 🎡 회전통(틈이 돌아야 빠져나감), 🚀 역전 부스터(뒤처진 구슬일수록 세게 밀어 줌), 🌀 워프(? = 앞으로 갈지 뒤로 갈지 모름),
   🧱 깨지는 벽(먼저 온 구슬이 막혀 있다가 무리가 쌓이면 와르르), ↩ 되돌이 구멍, 풍차·범퍼·움직이는 막대·핀.
   ⚡ 이변(켜고 끌 수 있음): 1등 번개, 꼴찌 로켓, 자리 바꾸기, 돌풍 + 구슬마다 가끔 💨 밀치기.
   오른쪽 실시간 순위판(▲▼, 누르면 그 구슬 따라가기), 역전되면 큰 알림. 1등 뽑기 / 꼴등 뽑기.
   ⚙️ 톱니 막대 줄·🫧 터지는 방울·🧅 겹겹 방울은 lazygyu 룰렛(구슬 룰렛)을 참고, 원작 맵 2개(운명의 수레바퀴·버블 팝)는 그 맵 데이터를 옮김(아래 MIT 표기).
   ×1 ×2 ×3 배속, 결승 직전 느린 화면 + 확대, 왼쪽 미니맵. 물리는 직접 계산(원-원, 원-선분), 외부 라이브러리 없음. */
(function () {
  var W = 800, R = 15, G = 1500, TAU = Math.PI * 2;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pickOne(a) { return a[Math.floor(Math.random() * a.length)]; }

  /* ───── 맵 만들기 도구 ───── */
  function Map() { this.pegs = []; this.segs = []; this.spin = []; this.bump = []; this.slide = []; this.trap = []; this.ring = []; this.pad = []; this.warp = []; this.brick = []; this.door = []; this.hold = []; this.w = W; this.g = G; }
  Map.prototype = {
    grid: function (y0, y1, dx, dy, r, j) { for (var y = y0, row = 0; y < y1; y += dy, row++) for (var x = (row % 2 ? dx * .5 + 40 : 40); x < W - 30; x += dx) this.pegs.push({ x: x + (j ? Math.random() * j - j / 2 : 0), y: y, r: r }); return this; },
    peg: function (x, y, r) { this.pegs.push({ x: x, y: y, r: r || 8 }); return this; },
    line: function (ax, ay, bx, by) { this.segs.push({ a: [ax, ay], b: [bx, by] }); return this; },
    funnel: function (y, gap, h) { return this.line(0, y, W / 2 - gap / 2, y + h).line(W, y, W / 2 + gap / 2, y + h); },
    mill: function (x, y, len, w, arms) { this.spin.push({ x: x, y: y, len: len, w: w, t: Math.random() * 3, arms: arms || 2 }); return this; },
    bumper: function (x, y, r) { this.bump.push({ x: x, y: y, r: r || 32, hit: 0 }); return this; },
    slider: function (x, y, len, amp, w) { this.slide.push({ x0: x, x: x, y: y, len: len, amp: amp, w: w, t: Math.random() * 6 }); return this; },
    hole: function (x, y, toY) { this.trap.push({ x: x, y: y, r: 30, to: toY }); return this; },
    wheel: function (x, y, r, w, gaps) { this.ring.push({ x: x, y: y, r: r, w: w, gaps: gaps || 2, t: Math.random() * TAU, segs: [] }); return this; },   // 🎡 회전통
    boost: function (x, y, w, h, ax, ay, rb) { this.pad.push({ x: x, y: y, w: w, h: h, ax: ax, ay: ay, rb: !!rb }); return this; },   // rb = 뒤처질수록 세게
    portal: function (x, y, to, mys) { this.warp.push({ x: x, y: y, r: 32, to: to, mys: !!mys, t: Math.random() * 6 }); return this; },
    wall: function (ax, ay, bx, by, life) { this.brick.push({ a: [ax, ay], b: [bx, by], life: life || 3, max: life || 3 }); return this; },   // 🧱 깨지는 벽(구슬이 닿아 있는 시간만큼 닳음)
    tidy: function () {   // 다른 장치와 겹치는 핀 치우기
      var keep = this.bump.concat(this.trap, this.warp);
      this.pegs = this.pegs.filter(function (p) {
        return keep.every(function (k) { var dx = p.x - k.x, dy = p.y - k.y; return dx * dx + dy * dy > Math.pow(k.r + p.r + 36, 2); });
      });
      return this;
    },
    bubble: function (x, y, r) { this.pegs.push({ x: x, y: y, r: r || 18, pop: true, e: 2.4 }); return this; },   // 🫧 닿으면 터지는 방울(세게 튕김)
    onion: function (x, y) { var m = this; [96, 66, 36].forEach(function (r) { m.bubble(x, y, r); }); return m; },   // 🧅 겹겹 방울: 바깥부터 한 겹씩 터짐
    bubbles: function (y0, rows, dx) { dx = dx || 100; for (var r = 0; r < rows; r++) for (var x = (r % 2 ? 50 + dx / 2 : 50); x < W - 30; x += dx) this.bubble(x + rnd(-8, 8), y0 + r * 80, 18); return this; },
    grinder: function (y, w) {   // ⚙️ 톱니 막대 줄: 끝이 맞닿은 막대 5개가 번갈아 반대로 돌며 길을 막았다 열었다
      for (var i = 0; i < 5; i++) this.mill(80 + i * 160, y, 160, (i % 2 ? -1 : 1) * (w || 3.5), 1);
      this.spin.slice(-5).forEach(function (s, i) { s.t = i % 2 ? Math.PI / 2 : 0; });
      return this;
    },
    // 🚦 신호등 문: V자 바닥 가운데 문이 닫혔다(closed초) 잠깐 열림(open초) → 구슬이 쌓여 기다리다 한 무더기씩 빠짐
    light: function (y, closed, open) {
      this.line(0, y, 340, y + 90).line(W, y, 460, y + 90);
      this.door.push({ a: [340, y + 90], b: [460, y + 90], c: closed || 3.5, o: open || 1, t: Math.random() * 3, open: false });
      this.hold.push({ y0: y - 60, y1: y + 110, k: 'light' });
      return this;
    },
    // ⏳ 모래시계 병목: 구슬 하나만 겨우 지나는 목 + 개찰구처럼 도는 짧은 막대
    hourglass: function (y) {
      this.line(0, y, 377, y + 240).line(W, y, 423, y + 240).mill(400, y + 190, 240, 1.6, 1);
      this.hold.push({ y0: y - 60, y1: y + 260, k: 'hour' });
      return this;
    },
    shift: function (y0, dy) {   // y0 아래에 있는 장치를 모두 dy만큼 내림(사이에 구간 끼워 넣기)
      function f(v) { return v >= y0 ? v + dy : v; }
      [this.pegs, this.spin, this.bump, this.slide, this.ring, this.pad, this.warp, this.trap].forEach(function (L) { L.forEach(function (o) { o.y = f(o.y); }); });
      this.trap.forEach(function (t) { t.to = f(t.to); });
      this.warp.forEach(function (w) { w.to = w.to.map(function (d) { return [d[0], f(d[1])]; }); });
      [this.segs, this.brick, this.door].forEach(function (L) { L.forEach(function (o) { o.a = [o.a[0], f(o.a[1])]; o.b = [o.b[0], f(o.b[1])]; }); });
      this.hold.forEach(function (h) { h.y0 = f(h.y0); h.y1 = f(h.y1); });
      return this;
    },
    gate: function (y) {   // 결승 앞: 좁은 통로 + 통로 벽 뒤에 축이 있는 막대 두 개. 막대 끝이 통로 안을 아래→위로 쓸어 올려 들어간 구슬을 다시 퍼 올림
      this.funnel(y, 150, 180);
      this.line(325, y + 180, 325, y + 600).line(475, y + 180, 475, y + 600);
      this.mill(560, y + 420, 420, GW, 1);   // 막대 하나: 시계 방향으로 돌아 통로 안에서는 아래→위로 쓸어 올림
      this.spin.slice(-1).forEach(function (s) { s.kick = GK; s.goal = true; });
      this.hold.push({ y0: y + 40, y1: y + 600, k: 'goal' });
      this.fin = y + 660; this.h = y + 820; return this;
    }
  };

  function spinners(m, y0, rows, gap, spd) {   // 🌪️ 풍차 숲: 4개 줄과 3개 줄이 번갈아, 방향·빠르기·모양 제각각
    gap = gap || 170;
    for (var r = 0; r < rows; r++) {
      var y = y0 + r * gap, xs = r % 2 ? [200, 400, 600] : [100, 300, 500, 700];
      xs.forEach(function (x, k) {
        var dir = (r + k) % 2 ? 1 : -1, arms = Math.random() < .3 ? 1 : 2;
        m.mill(x, y, xs.length === 4 ? 140 : 150, dir * rnd(1.8, 3.6) * (spd || 1), arms);
      });
      if (r % 2) m.peg(30, y, 10).peg(W - 30, y, 10);
    }
    return m;
  }
  var PACE = .7;   // 화면에서 경주가 흘러가는 빠르기 — 구슬·막대·이변이 모두 같이 느려져서 맵 밸런스는 그대로
  var GW = 1.9, GK = 2.4;   // 결승 막대 도는 빠르기·튕기는 힘
  var MAPS = {
    reverse: { name: '🎢 역전 대소동', make: function () {
      var m = new Map().grid(250, 520, 80, 78, 7, 12), o;
      m.funnel(560, 200, 110).wheel(400, 860, 150, 1.1, 2);
      // 갈림길: 왼쪽 = 부스터 지름길(되돌이 구멍 조심), 오른쪽 = 풍차 길
      m.peg(400, 1080, 14).line(400, 1100, 400, 1760);
      m.boost(20, 1150, 370, 70, 0, 4200).hole(200, 1330, 540).peg(100, 1450, 9).peg(300, 1450, 9).peg(200, 1510, 9);
      m.boost(20, 1570, 370, 60, 0, 4200).hole(300, 1690, 1110);
      m.mill(600, 1210, 170, 2.8, 2).mill(500, 1410, 140, -3.2, 2).mill(700, 1410, 140, 3, 1).mill(600, 1610, 170, -2.6, 2);
      spinners(m, 1880, 5);
      // 수수께끼 워프: 크게 앞서거나, 처음으로 돌아가거나
      o = 1000;
      var MYS = [[400, 2720 + o], [150, 2470 + o], [650, 2470 + o], [285, 2180 + o], [515, 2180 + o], [200, 1110], [600, 1110], [400, 520], [400, 1820]];
      m.bubbles(1830 + o, 4, 110).portal(200, 1960 + o, MYS, true).portal(600, 1960 + o, MYS, true).portal(400, 2080 + o, MYS, true);
      m.grinder(2280 + o).onion(400, 2460 + o);
      m.boost(20, 2500 + o, 760, 60, 0, 5000, true);
      m.wall(0, 2600 + o, 400, 2665 + o, 3).wall(800, 2600 + o, 400, 2665 + o, 3);
      [[160, 2800], [400, 2790], [640, 2800], [280, 2920], [520, 2920]].forEach(function (b) { m.bumper(b[0], b[1] + o, 30); });
      m.slider(400, 3030 + o, 200, 250, 1.7).hole(90, 3090 + o, 1830 + o).hole(710, 3090 + o, 1830 + o);
      return m.tidy().gate(3160 + o);
    } },
    warp: { name: '🌀 워프 소용돌이 (짧음)', make: function () {
      var m = new Map().grid(250, 520, 80, 78, 7, 12), o = 700;
      m.mill(250, 640, 150, 2.6, 2).mill(550, 640, 150, -2.6, 2);
      m.portal(110, 790, [[650, 1560 + o]]).portal(690, 790, [[400, 330]]);   // 왼쪽 = 지름길, 오른쪽 = 처음으로
      m.wheel(400, 1000, 140, -1.3, 2);
      m.boost(20, 1200, 370, 60, 2600, 900).boost(410, 1200, 370, 60, -2600, 900);
      spinners(m, 1360, 4);
      m.grid(1300 + o, 1640 + o, 90, 85, 8, 14);
      var MYS = [[400, 1980 + o], [150, 1440 + o], [650, 1440 + o], [400, 1330], [400, 700], [400, 330], [285, 1980 + o]];
      m.portal(250, 1740 + o, MYS, true).portal(550, 1740 + o, MYS, true);
      m.wall(0, 1860 + o, 400, 1925 + o, 3).wall(800, 1860 + o, 400, 1925 + o, 3);
      m.grinder(2060 + o).bubbles(2170 + o, 1, 90);
      m.boost(20, 2200 + o, 760, 60, 0, 5000, true).hole(400, 2300 + o, 1300 + o);
      return m.tidy().gate(2380 + o);
    } },
    wheel: { name: '🎡 회전통 3단', make: function () {
      var m = new Map().grid(240, 430, 80, 75, 7, 12), o = 680;
      m.funnel(470, 260, 90).wheel(400, 750, 150, 1.2, 2);
      m.boost(20, 940, 760, 50, 0, 3500, true);
      m.funnel(1000, 240, 90).wheel(400, 1280, 150, -1.4, 3);
      spinners(m, 1520, 3);
      m.wall(0, 1470 + o, 400, 1530 + o, 3).wall(800, 1470 + o, 400, 1530 + o, 3);
      m.wheel(400, 1740 + o, 160, 1.7, 2);
      var MYS = [[400, 2110 + o], [150, 2140 + o], [650, 2140 + o], [400, 1080], [400, 560], [400, 1480]];
      m.portal(80, 1700 + o, MYS, true).portal(720, 1700 + o, MYS, true);
      m.grinder(1990 + o);
      m.slider(400, 2190 + o, 200, 250, 1.8);
      return m.tidy().gate(2260 + o);
    } },
    garden: { name: '🐌 느릿느릿 정원 (느림)', make: function () {   // 중력 약하고 공기 저항 큼 → 천천히 둥실 내려감
      var m = new Map().grid(250, 480, 80, 78, 7, 12); m.g = 380; m.drag = .5; m.vmax = 460;
      m.wheel(400, 720, 150, .8, 2);
      m.grinder(1060, 1.5).bubbles(1190, 3, 100);
      m.wheel(240, 1620, 130, -.9, 2).wheel(560, 1620, 130, .9, 2);
      spinners(m, 1880, 3, 170, .6);
      m.onion(400, 2420).grinder(2580, -1.2);
      m.wall(0, 2700, 400, 2765, 3).wall(800, 2700, 400, 2765, 3);
      spinners(m, 2920, 2, 170, .6);
      m.wheel(240, 3420, 130, .8, 2).wheel(560, 3420, 130, -.8, 2).grinder(3680, 1.3).bubbles(3810, 3, 100);
      m.shift(2310, 260).light(2320, 4, 1);   // 🚦 정체 구간
      return m.tidy().gate(4360);
    } },
    sea: { name: '🫧 둥실둥실 방울 바다 (느림)', make: function () {   // 물속처럼 느림, 방울이 터진 길로 뒤 구슬이 쉽게 따라옴
      var m = new Map().grid(250, 450, 80, 78, 7, 12); m.g = 320; m.drag = .42; m.vmax = 400;
      m.bubbles(560, 5, 95).grinder(1010, 1.2);
      m.onion(220, 1210).onion(580, 1210);
      m.bubbles(1380, 4, 95).wheel(400, 1820, 150, -.7, 2);
      m.bubbles(2040, 4, 95).onion(400, 2440).grinder(2600, -1);
      m.bubbles(2720, 3, 95).wheel(400, 3120, 150, .6, 3);
      m.bubbles(3340, 4, 95).onion(220, 3720).onion(580, 3720).grinder(3900, 1.1);
      m.shift(2320, 340).hourglass(2330);   // ⏳ 정체 구간
      return m.tidy().gate(4360);
    } },
    traffic: { name: '🚗 꽉 막힌 출근길', make: function () {   // 정체 구간 네 군데: 신호등 → 모래시계 → 신호등 → 모래시계
      var m = new Map().grid(250, 480, 80, 78, 7, 12);
      m.light(560, 3, 1.2);
      spinners(m, 820, 2);
      m.hourglass(1180).grinder(1620).bubbles(1740, 2, 100);
      m.light(1960, 4, .8);
      m.wheel(400, 2330, 140, 1.2, 2);
      spinners(m, 2620, 2);
      m.hourglass(2900).boost(20, 3230, 760, 60, 0, 5000, true);
      return m.tidy().gate(3360);
    } },
    mill: { name: '🌀 풍차 마을', make: function () {
      var m = new Map().grid(280, 900, 72, 78, 7, 10);
      [[170, 1000, 2.4], [400, 1060, -3], [630, 1000, 2.7]].forEach(function (s) { m.mill(s[0], s[1], 150, s[2], 2); });
      m.funnel(1150, 140, 150);
      spinners(m, 1400, 2);
      m.grid(1720, 2160, 110, 95, 10).mill(250, 1920, 170, -2.2, 1).mill(560, 2020, 170, 2.6, 1);
      m.slider(400, 2280, 220, 260, 1.6).bumper(170, 2400).bumper(630, 2400).bumper(400, 2520, 38).bumper(120, 2660).bumper(680, 2660).slider(400, 2760, 180, 240, -2.1);
      m.hole(90, 2840, 1680).hole(710, 2840, 1680);
      return m.gate(2930);
    } },
    pinball: { name: '💥 핀볼 대소동', make: function () {
      var m = new Map().grid(260, 600, 90, 85, 8, 12);
      [[150, 760], [400, 720], [650, 760], [270, 900], [530, 900], [120, 1050], [400, 1060], [680, 1050], [270, 1200], [530, 1200]].forEach(function (b) { m.bumper(b[0], b[1], 34); });
      m.slider(400, 1360, 240, 250, 1.8).slider(400, 1500, 240, 250, -1.4);
      m.grinder(1660);
      m.grid(1820, 2080, 100, 80, 9);
      m.hole(400, 2180, 900).bumper(160, 2230, 30).bumper(640, 2230, 30).hole(90, 2330, 1300).hole(710, 2330, 1300);
      return m.gate(2420);
    } },
    storm: { name: '🌪️ 풍차 폭풍', make: function () {
      var m = new Map().grid(250, 480, 80, 78, 7, 12);
      spinners(m, 600, 5);
      m.mill(400, 1560, 560, .9, 1);   // 거대 막대: 천천히 돌며 한쪽을 막았다 열었다
      spinners(m, 1920, 4);
      m.boost(20, 2540, 760, 60, 0, 5000, true);
      m.mill(250, 2780, 300, -1.3, 2).mill(550, 2780, 300, 1.3, 2);   // 큰 풍차 두 개가 맞물려 돎
      m.grinder(3020).bubbles(3150, 3, 90).grinder(3420, -3);
      m.shift(1400, 340).hourglass(1410);   // ⏳ 정체 구간
      return m.tidy().gate(3900);
    } },
    hell: { name: '🕳️ 함정 지옥 (짧음)', make: function () {
      var m = new Map().grid(250, 650, 80, 75, 8, 12);
      m.hole(160, 760, 200).hole(400, 790, 200).hole(640, 760, 200);
      m.grinder(930, 3);
      m.grid(1080, 1350, 95, 85, 9).slider(400, 1450, 220, 260, 1.9);
      m.bumper(200, 1580).bumper(600, 1580).hole(400, 1640, 900);
      return m.gate(1730);
    } }
  };
  /* lazygyu 룰렛 맵 옮겨 오기. 원래 크기에서 1칸 = 60픽셀(구슬 지름 0.5칸 = 30픽셀로 같은 비율)
     맵 데이터 출처: https://github.com/lazygyu/roulette — MIT License, Copyright (c) 2022 LazyGyu
     Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),
     to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
     and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
     The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
     segs: [ax, ay, bx, by, 두께, 튕김], spins: [x, y, 길이, 도는 빠르기, 처음 각도, 두께], pegs: [x, y, 반지름, 닿으면 터짐(1), 튕김] */
  var LAZY = {"wof":{"w":1485,"fin":7560,"sx":600,"sy":900,"segs":[[540.0,60,540.0,1410.0,2,1],[540.0,1410.0,105.0,2055.0,2,1],[105.0,2055.0,105.0,2460,2,1],[105.0,2460,570.0,2700,2,1],[570.0,2700,570.0,2910.0,2,1],[570.0,2910.0,60.0,3360,2,1],[60.0,3360,60.0,4125.0,2,1],[60.0,4125.0,480.0,4425.0,2,1],[480.0,4425.0,480.0,4680,2,1],[480.0,4680,540.0,4740,2,1],[540.0,4740,480.0,4800,2,1],[480.0,4800,480.0,6855.0,2,1],[480.0,6855.0,891.0,7305.0,2,1],[891.0,7305.0,891.0,7605.0,2,1],[975.0,60,975.0,1455.0,2,1],[975.0,1455.0,555.0,2100,2,1],[555.0,2100,555.0,2250.0,2,1],[555.0,2250.0,1035.0,2460,2,1],[1035.0,2460,1035.0,2910.0,2,1],[1035.0,2910.0,1425.0,3210.0,2,1],[1425.0,3210.0,1125.0,3630.0,2,1],[1125.0,3630.0,1125.0,4230.0,2,1],[1125.0,4230.0,1425.0,4455.0,2,1],[1425.0,4455.0,1425.0,4680,2,1],[1425.0,4680,1365.0,4740,2,1],[1365.0,4740,1425.0,4800,2,1],[1425.0,4800,1425.0,6930.0,2,1],[1425.0,6930.0,945.0,7305.0,2,1],[945.0,7305.0,945.0,7605.0,2,1],[750.0,3150.0,405.0,3510.0,2,1],[405.0,3510.0,405.0,3885.0,2,1],[405.0,3885.0,750.0,4125.0,2,1],[750.0,4125.0,750.0,3150.0,2,1],[870.0,3150.0,870.0,3480,2,1],[870.0,3480,1035.0,3315.0,2,1],[1035.0,3315.0,870.0,3150.0,2,1],[898.5,2703.9,911.1,2683.5,2,2],[911.1,2683.5,931.5,2696.1,2,2],[931.5,2696.1,918.9,2716.5,2,2],[918.9,2716.5,898.5,2703.9,2,2],[898.5,2823.9,911.1,2803.5,2,1],[911.1,2803.5,931.5,2816.1,2,1],[931.5,2816.1,918.9,2836.5,2,1],[918.9,2836.5,898.5,2823.9,2,1],[898.5,2583.9,911.1,2563.5,2,1],[911.1,2563.5,931.5,2576.1,2,1],[931.5,2576.1,918.9,2596.5,2,1],[918.9,2596.5,898.5,2583.9,2,1],[718.5,2703.9,731.1,2683.5,2,1],[731.1,2683.5,751.5,2696.1,2,1],[751.5,2696.1,738.9,2716.5,2,1],[738.9,2716.5,718.5,2703.9,2,1],[718.5,2823.9,731.1,2803.5,2,1],[731.1,2803.5,751.5,2816.1,2,1],[751.5,2816.1,738.9,2836.5,2,1],[738.9,2836.5,718.5,2823.9,2,1],[718.5,2583.9,731.1,2563.5,2,1],[731.1,2563.5,751.5,2576.1,2,1],[751.5,2576.1,738.9,2596.5,2,1],[738.9,2596.5,718.5,2583.9,2,1],[530.1,4865.4,567.9,4926.6,6.0,1],[644.1,4865.4,681.9,4926.6,6.0,1],[758.1,4865.4,795.9,4926.6,6.0,1],[872.1,4865.4,909.9,4926.6,6.0,1],[986.1,4865.4,1023.9,4926.6,6.0,1],[1100.1,4865.4,1137.9,4926.6,6.0,1],[1208.1,4865.4,1245.9,4926.6,6.0,1],[1328.1,4865.4,1365.9,4926.6,6.0,1],[530.1,5076.6,567.9,5015.4,6.0,1],[644.1,5076.6,681.9,5015.4,6.0,1],[758.1,5076.6,795.9,5015.4,6.0,1],[872.1,5076.6,909.9,5015.4,6.0,1],[986.1,5076.6,1023.9,5015.4,6.0,1],[1100.1,5076.6,1137.9,5015.4,6.0,1],[1208.1,5076.6,1245.9,5015.4,6.0,1],[1328.1,5076.6,1365.9,5015.4,6.0,1],[555.0,6398.8,576.2,6420.0,2,1],[576.2,6420.0,555.0,6441.2,2,1],[555.0,6441.2,533.8,6420.0,2,1],[533.8,6420.0,555.0,6398.8,2,1],[750.0,6398.8,771.2,6420.0,2,1],[771.2,6420.0,750.0,6441.2,2,1],[750.0,6441.2,728.8,6420.0,2,1],[728.8,6420.0,750.0,6398.8,2,1],[945.0,6398.8,966.2,6420.0,2,1],[966.2,6420.0,945.0,6441.2,2,1],[945.0,6441.2,923.8,6420.0,2,1],[923.8,6420.0,945.0,6398.8,2,1],[1140.0,6398.8,1161.2,6420.0,2,1],[1161.2,6420.0,1140.0,6441.2,2,1],[1140.0,6441.2,1118.8,6420.0,2,1],[1118.8,6420.0,1140.0,6398.8,2,1],[1335.0,6398.8,1356.2,6420.0,2,1],[1356.2,6420.0,1335.0,6441.2,2,1],[1335.0,6441.2,1313.8,6420.0,2,1],[1313.8,6420.0,1335.0,6398.8,2,1],[645.0,6578.8,666.2,6600.0,2,1],[666.2,6600.0,645.0,6621.2,2,1],[645.0,6621.2,623.8,6600.0,2,1],[623.8,6600.0,645.0,6578.8,2,1],[840.0,6578.8,861.2,6600.0,2,1],[861.2,6600.0,840.0,6621.2,2,1],[840.0,6621.2,818.8,6600.0,2,1],[818.8,6600.0,840.0,6578.8,2,1],[1035.0,6578.8,1056.2,6600.0,2,1],[1056.2,6600.0,1035.0,6621.2,2,1],[1035.0,6621.2,1013.8,6600.0,2,1],[1013.8,6600.0,1035.0,6578.8,2,1],[1230.0,6578.8,1251.2,6600.0,2,1],[1251.2,6600.0,1230.0,6621.2,2,1],[1230.0,6621.2,1208.8,6600.0,2,1],[1208.8,6600.0,1230.0,6578.8,2,1],[555.0,6758.8,576.2,6780.0,2,1],[576.2,6780.0,555.0,6801.2,2,1],[555.0,6801.2,533.8,6780.0,2,1],[533.8,6780.0,555.0,6758.8,2,1],[750.0,6758.8,771.2,6780.0,2,1],[771.2,6780.0,750.0,6801.2,2,1],[750.0,6801.2,728.8,6780.0,2,1],[728.8,6780.0,750.0,6758.8,2,1],[945.0,6758.8,966.2,6780.0,2,1],[966.2,6780.0,945.0,6801.2,2,1],[945.0,6801.2,923.8,6780.0,2,1],[923.8,6780.0,945.0,6758.8,2,1],[1140.0,6758.8,1161.2,6780.0,2,1],[1161.2,6780.0,1140.0,6801.2,2,1],[1140.0,6801.2,1118.8,6780.0,2,1],[1118.8,6780.0,1140.0,6758.8,2,1],[1335.0,6758.8,1356.2,6780.0,2,1],[1356.2,6780.0,1335.0,6801.2,2,1],[1335.0,6801.2,1313.8,6780.0,2,1],[1313.8,6780.0,1335.0,6758.8,2,1]],"spins":[[465.0,5400,240,3.5,0,6.0],[705.0,5400,240,-3.5,0,6.0],[945.0,5400,240,3.5,0,6.0],[1185.0,5400,240,-3.5,0,6.0],[1425.0,5400,240,3.5,0,6.0],[825.0,7305.0,240,-1.2,0,6.0]],"pegs":[]},"bub":{"w":1035,"fin":5880,"sx":420,"sy":900,"segs":[[360.0,60,360.0,900.0,2,1],[360.0,900.0,360.0,3480.0,2,1],[360.0,3480.0,60.0,3900.0,2,1],[60.0,3900.0,360.0,4080.0,2,1],[360.0,4080.0,360.0,5160.0,2,1],[360.0,5160.0,372.7,5175.0,2,1],[372.7,5175.0,360.0,5190.0,2,1],[360.0,5190.0,360.0,5400.0,2,1],[360.0,5400.0,525.0,5700.0,2,1],[525.0,5700.0,525.0,5880.0,2,1],[795.0,60,795.0,3900.0,2,1],[795.0,3900.0,975.0,4140.0,2,1],[975.0,4140.0,915.0,4260.0,2,1],[915.0,4260.0,975.0,4380.0,2,1],[975.0,4380.0,795.0,4560.0,2,1],[795.0,4560.0,795.0,5160.0,2,1],[795.0,5160.0,782.3,5175.6,2,1],[782.3,5175.6,795.0,5190.0,2,1],[795.0,5190.0,795.0,5400.0,2,1],[795.0,5400.0,585.0,5700.0,2,1],[585.0,5700.0,585.0,5880.0,2,1],[795.0,4050.0,855.0,4140.0,2,1],[855.0,4140.0,795.0,4260.0,2,1],[795.0,4260.0,855.0,4380.0,2,1],[855.0,4380.0,795.0,4440.0,2,1],[795.0,4440.0,735.0,4260.0,2,1],[735.0,4260.0,795.0,4050.0,2,1],[360.0,3630.0,180.0,3870.0,2,1],[180.0,3870.0,360.0,3960.0,2,1],[360.0,3960.0,675.0,3930.0,2,1],[675.0,3930.0,360.0,3630.0,2,1],[360.0,2460.0,468.8,2550.0,2,1],[795.0,2460.0,686.2,2550.0,2,1],[468.8,2700.0,577.5,2610.0,2,1],[577.5,2610.0,686.2,2700.0,2,1],[360.0,2760.0,468.8,2850.0,2,1],[795.0,2760.0,686.2,2850.0,2,1],[468.8,3000.0,577.5,2910.0,2,1],[577.5,2910.0,686.2,3000.0,2,1],[353.6,1973.6,366.4,1986.4,9.0,1],[473.6,1973.6,486.4,1986.4,9.0,1],[593.6,1973.6,606.4,1986.4,9.0,1],[713.6,1973.6,726.4,1986.4,9.0,1],[428.6,2033.6,441.4,2046.4,9.0,1],[548.6,2033.6,561.4,2046.4,9.0,1],[668.6,2033.6,681.4,2046.4,9.0,1],[788.6,2033.6,801.4,2046.4,9.0,1],[353.6,2093.6,366.4,2106.4,9.0,1],[473.6,2093.6,486.4,2106.4,9.0,1],[593.6,2093.6,606.4,2106.4,9.0,1],[713.6,2093.6,726.4,2106.4,9.0,1],[428.6,2153.6,441.4,2166.4,9.0,1],[548.6,2153.6,561.4,2166.4,9.0,1],[668.6,2153.6,681.4,2166.4,9.0,1],[788.6,2153.6,801.4,2166.4,9.0,1],[353.6,2213.6,366.4,2226.4,9.0,1],[473.6,2213.6,486.4,2226.4,9.0,1],[593.6,2213.6,606.4,2226.4,9.0,1],[713.6,2213.6,726.4,2226.4,9.0,1],[428.6,2273.6,441.4,2286.4,9.0,1],[548.6,2273.6,561.4,2286.4,9.0,1],[668.6,2273.6,681.4,2286.4,9.0,1],[788.6,2273.6,801.4,2286.4,9.0,1],[369.0,2985.4,623.6,3240.0,2,1],[623.6,3240.0,369.0,3494.6,2,1],[369.0,3494.6,114.4,3240.0,2,1],[114.4,3240.0,369.0,2985.4,2,1],[795.0,3225.4,1049.6,3480.0,2,1],[1049.6,3480.0,795.0,3734.6,2,1],[795.0,3734.6,540.4,3480.0,2,1],[540.4,3480.0,795.0,3225.4,2,1]],"spins":[[447.0,1500,60.0,10,0,6.0],[687.0,1500,60.0,-10,0,6.0],[567.0,1500,60.0,10,0,6.0],[447.0,1740,240,-3,0,6.0],[687.0,1740,240,3,0,6.0],[477.0,3540,60.0,-5,0,6.0],[423.0,5400,120,8,0,6.0],[732.7,5400,120,-8,0,6.0],[562.5,4260.0,120,-8,0,6.0]],"pegs":[[465.0,4800,30.0,1,2.5],[585.0,4800,30.0,1,2.5],[705.0,4800,30.0,1,2.5],[525.0,4950.0,30.0,1,2.5],[645.0,4950.0,30.0,1,2.5],[585.0,5086.2,48.0,1,2.5],[447.0,5550.0,48.0,1,2.5],[687.0,5550.0,48.0,1,2.5],[562.5,5700,90.0,1,2.5],[562.5,5700,72.0,1,2.5],[401.9,4655.7,30.0,1,2.5],[521.9,4655.7,30.0,1,2.5],[641.9,4655.7,30.0,1,2.5],[754.7,4655.7,30.0,1,2.5]]}};
  function lazyMap(k) {
    var d = LAZY[k], m = new Map();
    m.w = d.w; m.g = 620; m.imp = true; m.sx = d.sx; m.sy = d.sy; m.fin = d.fin; m.h = d.fin + 320;
    d.segs.forEach(function (g) { m.segs.push({ a: [g[0], g[1]], b: [g[2], g[3]], r: g[4], e: g[5] }); });
    d.spins.forEach(function (g) { m.spin.push({ x: g[0], y: g[1], len: g[2], w: g[3], t: g[4], arms: 1, r: g[5] }); });
    d.pegs.forEach(function (g) { m.pegs.push({ x: g[0], y: g[1], r: g[2], pop: !!g[3], e: g[4] }); });
    return m;
  }
  MAPS.wof = { name: '🎰 운명의 수레바퀴 (원작)', make: function () { return lazyMap('wof'); } };
  MAPS.bub = { name: '🫧 버블 팝 (원작)', make: function () { return lazyMap('bub'); } };
  var ORDER = ['reverse', 'traffic', 'storm', 'garden', 'sea', 'warp', 'wheel', 'mill', 'pinball', 'hell', 'wof', 'bub'];

  function bars(s) { var out = []; for (var k = 0; k < s.arms; k++) { var a = s.t + k * Math.PI / 2, ux = Math.cos(a) * s.len / 2, uy = Math.sin(a) * s.len / 2; out.push([s.x - ux, s.y - uy, s.x + ux, s.y + uy]); } return out; }
  function ringSegs(g) {   // 회전통: 원을 28조각 선분으로, 틈(gaps개) 자리만 비움
    var n = 28, out = [];
    for (var i = 0; i < n; i++) {
      var mid = (i + .5) * TAU / n, skip = false;
      for (var k = 0; k < g.gaps; k++) { var d = Math.abs(mid - k * TAU / g.gaps) % TAU; if (Math.min(d, TAU - d) < .34) skip = true; }
      if (skip) continue;
      var a0 = g.t + i * TAU / n, a1 = a0 + TAU / n;
      out.push([g.x + Math.cos(a0) * g.r, g.y + Math.sin(a0) * g.r, g.x + Math.cos(a1) * g.r, g.y + Math.sin(a1) * g.r]);
    }
    return out;
  }
  function seg(c, ax, ay, bx, by, vel, th, e) {   // 원과 선분: 겹치면 밀어내고 튕김(vel = 움직이는 막대면 그 지점의 속도). 닿았으면 부딪친 세기(>0) 돌려줌
    var pad = R + 20; if (c.x < Math.min(ax, bx) - pad || c.x > Math.max(ax, bx) + pad || c.y < Math.min(ay, by) - pad || c.y > Math.max(ay, by) + pad) return 0;
    var dx = bx - ax, dy = by - ay, t = ((c.x - ax) * dx + (c.y - ay) * dy) / (dx * dx + dy * dy); t = Math.max(0, Math.min(1, t));
    var px = ax + dx * t, py = ay + dy * t, nx = c.x - px, ny = c.y - py, d = Math.sqrt(nx * nx + ny * ny), m = R + (th == null ? 5 : th), k = e == null ? 1.45 : e;
    if (d >= m || d === 0) return 0;
    nx /= d; ny /= d; c.x = px + nx * m; c.y = py + ny * m;
    var sv = vel ? vel(px, py) : [0, 0], rvx = c.vx - sv[0], rvy = c.vy - sv[1], vn = rvx * nx + rvy * ny;
    if (vn < 0) { c.vx -= k * vn * nx; c.vy -= k * vn * ny; c.vx *= .995; return -vn + .001; }
    return .001;
  }
  function rot(g) { return function (px, py) { return [-g.w * (py - g.y), g.w * (px - g.x)]; }; }

  /* ───── 경주 (화면과 따로, 물리와 이변만) ───── */
  function Race(key, names, opt, on) {
    on = on || {}; var say = on.say || function () {}, fx = on.fx || function () {}, beep = on.beep || function () {};
    var C = MAPS[key].make(), gs = Math.sqrt(C.g / G);
    C.spin.forEach(function (s) { if (s.goal) { s.w *= gs; s.kick *= gs * gs; } });   // 중력 약한 맵은 결승 막대도 느리고 약하게
    var cols = Math.min(names.length, 12), mix = names.slice().sort(function () { return Math.random() - .5; });
    var S = { C: C, key: key, t: 0, order: [], over: false, pick: null, evT: rnd(4, 6), wind: null, jamT: 0, boomCool: 3, leadMax: 0, leadT: 0, live: [] };
    S.balls = mix.map(function (n, i) {
      return { n: n, x: C.imp ? C.sx + (i % 10) * 36 : 60 + (i % cols) * ((W - 120) / Math.max(1, cols - 1)), y: C.imp ? C.sy - 20 - Math.floor(i / 10) * 36 : 60 + Math.floor(i / cols) * 36, vx: rnd(-20, 20), vy: 0,
        c: 'hsl(' + Math.round(names.indexOf(n) * 137.508 % 360) + ' 88% 62%)', still: 0, done: false, traps: 0, warps: 0, wcd: 0, rk: i, rocket: 0, zap: 0, sk: rnd(3, 9), onB: false, best: 0, stall: 0, kicks: 0 };
    });
    function rank() {   // 아직 달리는 구슬: 아래(결승 쪽)에 있을수록 앞
      S.live = S.balls.filter(function (b) { return !b.done; }).sort(function (a, b) { return b.y - a.y; });
      S.live.forEach(function (b, i) { b.rk = i; });
      return S.live;
    }
    S.ranking = function () { return S.order.concat(rank()); };
    function choose(b) {
      if (S.over) return; S.over = true; S.pick = b; if (on.finish) on.finish(b);
    }
    /* ⚡ 이변: 7~11초마다 하나 */
    function events(dt) {
      if (!opt.events || S.over) return;
      if ((S.evT -= dt) > 0) return;
      S.evT = rnd(6, 9);
      var L = S.live; if (L.length < 3) return;
      var k = pickOne(['zap', 'zap', 'rocket', 'rocket', 'swap', 'wind']);
      if (k === 'zap') { var a = L[0]; a.vy = -1100; a.vx = rnd(-500, 500); a.zap = 1; fx({ k: 'zap', x: a.x, y: a.y }); say('⚡ 번개! 1등 ' + a.n + ' 감전!'); beep(1400, .08); beep(200, .4); }
      else if (k === 'rocket') { var z = L[L.length - 1]; z.rocket = 1.6; say('🚀 꼴찌 ' + z.n + ' 로켓 발사!'); beep(300, .5); }
      else if (k === 'swap') {
        var p = L[Math.floor(Math.random() * Math.min(3, L.length))], q = L[L.length - 1 - Math.floor(Math.random() * Math.max(1, Math.floor(L.length / 3)))];
        if (p === q) return;
        ['x', 'y', 'vx', 'vy'].forEach(function (f) { var v = p[f]; p[f] = q[f]; q[f] = v; });
        p.wcd = q.wcd = 1; fx({ k: 'warp', x: p.x, y: p.y, c: p.c }); fx({ k: 'warp', x: q.x, y: q.y, c: q.c });
        say('🔀 ' + p.n + ' ↔ ' + q.n + ' 자리 바꾸기!'); beep(600, .15); beep(900, .15);
      }
      else { var ax = (Math.random() < .5 ? -1 : 1) * 2600; S.wind = { t: 2, ax: ax }; say(ax < 0 ? '🌪️ 왼쪽으로 돌풍!' : '🌪️ 오른쪽으로 돌풍!'); beep(150, .6); }
    }
    /* 💨 밀치기: 구슬마다 5~10초에 한 번, 가까운 구슬을 밀어냄 */
    function skills(dt) {
      if (!opt.events) return;
      S.live.forEach(function (b) {
        if ((b.sk -= dt) > 0) return; b.sk = rnd(5, 10); var hit = 0;
        S.live.forEach(function (o) {
          if (o === b) return; var dx = o.x - b.x, dy = o.y - b.y, d = Math.sqrt(dx * dx + dy * dy) || 1; if (d > 130) return;
          var f = 900 * (1 - d / 150); o.vx += dx / d * f; o.vy += dy / d * f * .6 - 100; o.still = 0; hit++;
        });
        if (hit) fx({ k: 'push', x: b.x, y: b.y, c: b.c });
      });
    }
    /* 💥 펑: 느린 구슬 3개 이상이 1초 넘게 뭉치거나 선두가 3초 동안 못 나가면 흩어짐(깨지는 벽 위에서 기다리는 건 빼고) */
    function jam(dt) {
      if ((S.boomCool -= dt) > 0) return;
      var live = S.live, sv = 160 * Math.min(1, (C.vmax || 1500) / 1200), slow = live.filter(function (b) { return !b.onB && b.vx * b.vx + b.vy * b.vy < sv * sv; }), best = null;
      slow.forEach(function (a) { var g = slow.filter(function (b) { var dx = b.x - a.x, dy = b.y - a.y; return dx * dx + dy * dy < 110 * 110; }); if (!best || g.length > best.length) best = g; });
      var lead = live[0];
      if (!lead || lead.onB || lead.y > S.leadMax + 40) { S.leadMax = lead ? lead.y : 0; S.leadT = 0; } else S.leadT += dt;
      var stuck = lead && S.leadT > (lead.hold ? 6 : 3) && !S.over;
      if (stuck) best = live.filter(function (b) { var dx = b.x - lead.x, dy = b.y - lead.y; return dx * dx + dy * dy < 160 * 160; });
      else if (!best || best.length < 3) { S.jamT = 0; return; }
      else if ((S.jamT += dt) < (best.some(function (b) { return b.hold; }) ? 4 : 1)) return;
      S.leadT = 0; S.leadMax = lead ? lead.y : 0;
      var x = 0, y = 0; best.forEach(function (b) { x += b.x; y += b.y; }); x /= best.length; y /= best.length;
      S.balls.forEach(function (b) {
        if (b.done) return; var dx = b.x - x, dy = b.y - y, d = Math.sqrt(dx * dx + dy * dy) || 1; if (d > 220) return;
        var f = 1300 * (1 - d / 260) * gs; b.vx += dx / d * f + (Math.random() - .5) * 300 * gs; b.vy += dy / d * f - (500 + Math.random() * 300) * gs; b.still = 0;
      });
      fx({ k: 'boom', x: x, y: y }); S.jamT = 0; S.boomCool = 2.5; say('💥 펑! 막혀 있던 구슬이 흩어져요');
      beep(90, .5); beep(160, .25);
    }
    S.step = function (dt) {
      S.t += dt;
      C.spin.forEach(function (s) { s.t += s.w * dt; s.bars = bars(s); });
      C.ring.forEach(function (g) { g.t += g.w * dt; g.segs = ringSegs(g); });
      C.slide.forEach(function (s) { s.t += dt; s.x = s.x0 + Math.sin(s.t * s.w) * s.amp; s.vx = Math.cos(s.t * s.w) * s.amp * s.w; s.x = Math.max(s.len / 2, Math.min(W - s.len / 2, s.x)); });
      C.bump.forEach(function (p) { if (p.hit > 0) p.hit -= dt; });
      C.warp.forEach(function (w) { w.t += dt; });
      C.door.forEach(function (d) { d.t += dt; var was = d.open; d.open = d.t % (d.c + d.o) > d.c; if (d.open && !was) beep(660, .12); });
      if (S.wind && (S.wind.t -= dt) <= 0) S.wind = null;
      rank(); jam(dt); events(dt); skills(dt);
      var nLive = Math.max(1, S.live.length - 1);
      S.balls.forEach(function (b) {
        if (b.done) return;
        b.onB = false; b.hold = false;
        b.vy += C.g * dt;
        if (b.rocket > 0) { b.rocket -= dt; b.vy += 3800 * dt; b.vx *= .98; }
        if (b.zap > 0) b.zap -= dt;
        if (b.wcd > 0) b.wcd -= dt;
        if (S.wind) b.vx += S.wind.ax * dt;
        C.pad.forEach(function (p) {
          if (b.x > p.x && b.x < p.x + p.w && b.y > p.y && b.y < p.y + p.h) { var f = p.rb ? .1 + 1.5 * b.rk / nLive : 1; b.vx += p.ax * f * dt; b.vy += p.ay * f * dt; }
        });
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (C.drag) { var dk = Math.pow(C.drag, dt); b.vx *= dk; b.vy *= dk; }
        var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy), vm = C.vmax || 1500; if (sp > vm) { b.vx *= vm / sp; b.vy *= vm / sp; }
        if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx) * .6; } if (b.x > C.w - R) { b.x = C.w - R; b.vx = -Math.abs(b.vx) * .6; }
        C.pegs.forEach(function (p) { if (p.gone) return; var dx = b.x - p.x, dy = b.y - p.y, m = R + p.r; if (Math.abs(dx) > m || Math.abs(dy) > m) return; var d = Math.sqrt(dx * dx + dy * dy); if (d < m && d > 0) { dx /= d; dy /= d; b.x = p.x + dx * m; b.y = p.y + dy * m; var vn = b.vx * dx + b.vy * dy; if (vn < 0) { b.vx -= (p.e || 1.5) * vn * dx; b.vy -= (p.e || 1.5) * vn * dy; b.vx += (Math.random() - .5) * 30; } if (p.pop) { p.gone = true; fx({ k: 'pop', x: p.x, y: p.y, r: p.r }); beep(900 + Math.random() * 400, .06); } } });   // 🫧 터지는 방울: 닿으면 펑
        C.bump.forEach(function (p) {   // 범퍼: 닿으면 바깥으로 세게 튕김
          var dx = b.x - p.x, dy = b.y - p.y, d = Math.sqrt(dx * dx + dy * dy), m = R + p.r;
          if (d < m && d > 0) { dx /= d; dy /= d; b.x = p.x + dx * m; b.y = p.y + dy * m; var vn = b.vx * dx + b.vy * dy; if (vn < 0) { b.vx -= vn * dx; b.vy -= vn * dy; } b.vx += dx * 650; b.vy += dy * 650; p.hit = .15; if (Math.random() < .3) beep(700 + Math.random() * 300, .05); }
        });
        C.segs.forEach(function (s) { seg(b, s.a[0], s.a[1], s.b[0], s.b[1], null, s.r, s.e); });
        C.spin.forEach(function (s) { var v = rot(s); s.bars.forEach(function (l) { var hit = seg(b, l[0], l[1], l[2], l[3], v, s.r); if (s.kick && hit > 1) { var sv = v(b.x, b.y); b.vx += sv[0] * s.kick; b.vy += sv[1] * s.kick; } }); });
        if (C.imp) for (var it = 0; it < 2; it++) {   // 원작 맵: 벽과 도는 막대 사이에 낀 구슬이 막대를 뚫고 겹치지 않게 몇 번 더 맞춤
          C.spin.forEach(function (s) { var v = rot(s); s.bars.forEach(function (l) { seg(b, l[0], l[1], l[2], l[3], v, s.r, 1); }); });
          C.segs.forEach(function (s) { seg(b, s.a[0], s.a[1], s.b[0], s.b[1], null, s.r, s.e); });
        }
        C.slide.forEach(function (s) { seg(b, s.x - s.len / 2, s.y, s.x + s.len / 2, s.y, function () { return [s.vx, 0]; }); });
        C.ring.forEach(function (g) { var dx = b.x - g.x, dy = b.y - g.y; if (dx * dx + dy * dy > Math.pow(g.r + 40, 2)) return; var v = rot(g); g.segs.forEach(function (l) { seg(b, l[0], l[1], l[2], l[3], v); }); });
        C.hold.forEach(function (h) { if (b.y > h.y0 && b.y < h.y1) b.hold = true; });   // 정체 구간: 한참(4초) 막혀야 💥
        C.door.forEach(function (d) { if (!d.open) seg(b, d.a[0], d.a[1], d.b[0], d.b[1]); });
        C.brick.forEach(function (w) {
          if (w.life <= 0) return;
          var hit = seg(b, w.a[0], w.a[1], w.b[0], w.b[1]); if (!hit) return;
          b.onB = true; w.life -= dt + (hit > 300 ? .2 : 0);
          if (w.life <= 0) { fx({ k: 'brick', a: w.a, b: w.b }); say('🧱 와르르! 벽이 무너졌어요'); beep(120, .5); beep(80, .6); }
        });
        C.trap.forEach(function (t) {   // 되돌이 구멍: 위로 되돌아감(구슬마다 2번까지)
          if (b.traps >= 2) return;
          var dx = b.x - t.x, dy = b.y - t.y; if (dx * dx + dy * dy < t.r * t.r) { b.traps++; b.x = 80 + Math.random() * (W - 160); b.y = t.to; b.vx = 0; b.vy = 0; beep(220, .25); say('↩ ' + b.n + ' 되돌아감!'); }
        });
        C.warp.forEach(function (w) {   // 워프: 구슬마다 4번까지
          if (b.wcd > 0 || b.warps >= 4) return;
          var dx = b.x - w.x, dy = b.y - w.y; if (dx * dx + dy * dy > w.r * w.r) return;
          var d = pickOne(w.to), from = b.y;
          fx({ k: 'warp', x: b.x, y: b.y, c: b.c });
          b.x = d[0] + rnd(-20, 20); b.y = d[1]; b.vx = rnd(-80, 80); b.vy = 0; b.wcd = 1.5; b.warps++; b.still = 0;
          fx({ k: 'warp', x: b.x, y: b.y, c: b.c });
          if (w.mys) say(b.y > from ? '🌀 ' + b.n + ' 앞으로 순간이동! 대박!' : '🌀 ' + b.n + ' 뒤로 순간이동… 앗!');
          beep(b.y > from ? 1200 : 260, .2);
        });
        if (sp < 25) { if ((b.still += dt) > 1.2) { b.vx += (Math.random() - .5) * 500; b.vy -= 300; b.still = 0; } } else b.still = 0;   // 끼면 살짝 흔들기
        // 오래(4초) 못 내려가는 구슬은 따로 툭 쳐 줌, 세 번째부터는 가운데로 옮겨 줌(결승 앞 풍차에 걸리는 것 방지)
        if (b.y > b.best + 30 || b.onB) { b.best = Math.max(b.best, b.y); b.stall = 0; }
        else if ((b.stall += dt) > (b.hold ? 9 : 4)) { b.stall = 0; b.best = b.y; if (++b.kicks >= 3 && !C.imp) { b.x = W / 2 + rnd(-10, 10); b.vx = 0; b.vy = 200; b.kicks = 0; } else { b.vx = rnd(-600, 600); b.vy = -400; } }
        if (b.y > C.fin && !b.done) {
          b.done = true; S.order.push(b); beep(S.order.length === 1 ? 988 : 520, .2);
          if (opt.mode !== 'last' && S.order.length === 1) choose(b);
        }
      });
      for (var i = 0; i < S.balls.length; i++) for (var j = i + 1; j < S.balls.length; j++) {   // 구슬끼리
        var a = S.balls[i], c = S.balls[j]; if (a.done || c.done) continue;
        var dx = c.x - a.x, dy = c.y - a.y; if (dx > 30 || dx < -30 || dy > 30 || dy < -30) continue;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 2 * R && d > 0) { dx /= d; dy /= d; var o = (2 * R - d) / 2; a.x -= dx * o; a.y -= dy * o; c.x += dx * o; c.y += dy * o; var vn = (c.vx - a.vx) * dx + (c.vy - a.vy) * dy; if (vn < 0) { a.vx += vn * dx * .9; a.vy += vn * dy * .9; c.vx -= vn * dx * .9; c.vy -= vn * dy * .9; } }
      }
      if (opt.mode === 'last' && !S.over) { var left = S.balls.filter(function (b) { return !b.done; }); if (left.length === 1) choose(left[0]); }
      if (!S.over && S.t > 240) { var r = rank(); choose(opt.mode === 'last' ? r[r.length - 1] : (S.order[0] || r[0])); }   // 너무 오래 걸리면 지금 순위로
    };
    rank();
    return S;
  }

  /* ───── 화면 ───── */
  window.MarbleRace = function (names, done) {
    var st = {}; try { st = JSON.parse(localStorage.getItem('marbleRace2') || '{}'); } catch (e) {}
    var box = document.createElement('div'); box.className = 'mr';
    box.innerHTML = '<style>.mr{position:fixed;inset:0;z-index:60;background:#000;display:flex;flex-direction:column;font-family:Jua,"Gowun Dodum",sans-serif}' +
      '.mr .bar{display:flex;gap:8px;align-items:center;padding:8px 12px;color:#fff;font-size:18px;background:#111;flex-wrap:wrap}.mr .bar .sp{flex:1}' +
      '.mr button,.mr select{font:17px Jua,sans-serif;border:0;border-radius:999px;padding:6px 16px;cursor:pointer;background:#fff;color:#2b211e}.mr button.go{background:#ff7a6b;color:#fff}' +
      '.mr select{background:#222;color:#3ff;border:1.5px solid #3ff;padding:5px 12px}.mr select.md{color:#ff5;border-color:#ff5}' +
      '.mr button.ev{background:#222;color:#888;border:1.5px solid #555}.mr button.ev[aria-pressed="true"]{color:#ff5;border-color:#ff5;box-shadow:0 0 10px #ff58}' +
      '.mr .spd{display:flex;background:#333;border-radius:999px;padding:3px}.mr .spd button{background:none;color:#ccc;padding:4px 12px}.mr .spd button[aria-pressed="true"]{background:#3ff;color:#000}' +
      '.mr .st{flex:1;position:relative;min-height:0;overflow:hidden;user-select:none;-webkit-user-select:none}.mr canvas{position:absolute;inset:0;width:100%;height:100%}' +
      '.mr .board{position:absolute;right:10px;top:10px;width:min(250px,36vw);background:rgba(10,10,20,.72);border:1.5px solid rgba(51,255,255,.35);border-radius:14px;padding:6px;color:#fff;font-size:17px}' +
      '.mr .board h4{margin:2px 6px 4px;font-weight:400;font-size:15px;color:#3ff}' +
      '.mr .board .r{display:flex;gap:6px;align-items:center;padding:2px 6px;border-radius:8px;cursor:pointer;transition:background .4s}.mr .board .r:hover{background:rgba(255,255,255,.12)}' +
      '.mr .board .no{width:24px;text-align:right;color:#999;font-size:15px}.mr .board .dot{width:12px;height:12px;border-radius:50%;flex:none}' +
      '.mr .board .nm{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mr .board .ch{width:38px;text-align:right;font-size:14px}' +
      '.mr .board .up{color:#6f6}.mr .board .dn{color:#f77}.mr .board .fin .no{color:#ff5}.mr .board .me{outline:2px solid #fff}.mr .board .hot{background:rgba(255,230,60,.32)}.mr .board .gap{text-align:center;color:#777;line-height:1}' +
      '.mr .big{position:absolute;left:50%;top:18%;transform:translateX(-50%);font-size:min(7vw,52px);color:#fff;white-space:nowrap;text-shadow:0 0 18px #f80,0 0 4px #000;pointer-events:none;opacity:0}' +
      '.mr .big.on{animation:mrbig 1.5s ease-out}@keyframes mrbig{0%{opacity:0;transform:translateX(-50%) scale(.4)}15%{opacity:1;transform:translateX(-50%) scale(1.15)}25%{transform:translateX(-50%) scale(1)}80%{opacity:1}100%{opacity:0}}' +
      '.mr .slow{position:absolute;left:50%;top:14px;transform:translateX(-50%);color:#ff5;font-size:22px;letter-spacing:2px;text-shadow:0 0 10px #ff5}.mr .slow[hidden]{display:none}.mr .cast{position:absolute;left:50%;top:56px;transform:translateX(-50%);background:#e33;color:#fff;border-radius:999px;padding:4px 16px;font-size:20px;white-space:nowrap;box-shadow:0 0 14px #f33a}.mr .cast[hidden]{display:none}' +
      '.mr .toast{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);color:#fff;background:rgba(0,0,0,.6);border-radius:999px;padding:4px 18px;font-size:24px;text-shadow:0 0 10px #f80;pointer-events:none;white-space:nowrap}.mr .toast:empty{display:none}' +
      '.mr .win{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}.mr .win div{background:#fff;border-radius:28px;padding:3vh 6vw;text-align:center;font-size:min(11vw,15vh);color:#ff7a6b;box-shadow:0 0 60px rgba(51,255,255,.6);animation:mrpop .5s ease-out}' +
      '.mr .win small{display:block;font-size:min(3.5vw,4vh);color:#6f5f57}@keyframes mrpop{from{transform:scale(.3);opacity:0}}</style>' +
      '<div class="bar">🎱 구슬 레이스 · ' + names.length + '명' +
      '<select aria-label="맵 고르기">' + ORDER.map(function (k) { return '<option value="' + k + '">' + MAPS[k].name + '</option>'; }).join('') + '<option value="random">🎲 무작위 맵</option></select>' +
      '<select class="md" aria-label="뽑는 방법"><option value="first">🥇 1등이 뽑힘</option><option value="last">🐢 꼴등이 뽑힘</option></select>' +
      '<button type="button" class="ev" data-k="ev" title="번개·로켓·자리 바꾸기·돌풍·밀치기">⚡ 이변</button>' +
      '<span class="sp"></span><span class="spd" role="group" aria-label="배속"><button type="button" data-s="1" aria-pressed="true">×1</button><button type="button" data-s="2" aria-pressed="false">×2</button><button type="button" data-s="3" aria-pressed="false">×3</button></span>' +
      '<button type="button" class="go" data-k="again" title="화면을 더블클릭하면 배속이 바뀌어요">다시 굴리기</button><button type="button" data-k="close">닫기 (Esc)</button></div>' +
      '<div class="st"><canvas></canvas><div class="board"></div><div class="big"></div><div class="slow" hidden>⏳ 결승 직전!</div><div class="cast" hidden></div><div class="toast"></div><div class="win"></div></div>';
    document.body.appendChild(box);
    var cv = box.querySelector('canvas'), cx = cv.getContext('2d'), board = box.querySelector('.board'), big = box.querySelector('.big'), win = box.querySelector('.win'), slowEl = box.querySelector('.slow'), castEl = box.querySelector('.cast'), toast = box.querySelector('.toast'),
      sel = box.querySelector('select'), mdSel = box.querySelector('select.md'), evBtn = box.querySelector('.ev');
    sel.value = MAPS[st.map] || st.map === 'random' ? st.map : 'reverse';
    mdSel.value = st.mode === 'last' ? 'last' : 'first';
    var evOn = st.events !== false; evBtn.setAttribute('aria-pressed', String(evOn));
    var S, C, FIN, H, MW, cam, camX, zoom, raf, last, speed = 1, AC = null, ticked = 0, toastT = 0, fxs = [], follow = null, boardT = 0, prevRk = {}, prevT = 0, leadName = null, cand = null, bigT = 0, hot = {};
    function saveSt() { try { localStorage.setItem('marbleRace2', JSON.stringify({ map: sel.value, mode: mdSel.value, events: evOn })); } catch (e) {} }
    function beep(f, d) { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); var o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.15, AC.currentTime); g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + d); o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + d); } catch (e) {} }
    function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function say(t) { toast.textContent = t; toastT = 1.8; }
    function shout(t) { big.textContent = t; big.classList.remove('on'); void big.offsetWidth; big.classList.add('on'); bigT = 1.6; }
    function addFx(o) {
      o.t = 0;
      if (o.k === 'brick') { o.ps = []; for (var i = 0; i < 18; i++) { var u = Math.random(); o.ps.push({ x: o.a[0] + (o.b[0] - o.a[0]) * u, y: o.a[1] + (o.b[1] - o.a[1]) * u, vx: rnd(-200, 200), vy: rnd(-350, 0) }); } }
      if (o.k === 'zap') { o.pts = []; for (var y = -700, x = o.x; y <= 0; y += 70) { o.pts.push([x + rnd(-40, 40), o.y + y]); } o.pts.push([o.x, o.y]); }
      fxs.push(o);
    }
    function start() {
      var k = sel.value === 'random' ? pickOne(ORDER) : sel.value;
      S = Race(k, names, { mode: mdSel.value, events: evOn }, { say: say, fx: addFx, beep: beep, finish: finish });
      C = S.C; FIN = C.fin; H = C.h; MW = C.w; fxs = []; follow = null; prevRk = {}; prevT = 0; leadName = null; cand = null; hot = {};
      win.innerHTML = ''; slowEl.hidden = true; toast.textContent = '';
      say(sel.value === 'random' ? '🎲 ' + MAPS[k].name : MAPS[k].name + (mdSel.value === 'last' ? ' · 🐢 꼴등이 뽑혀요' : ' · 🥇 1등이 뽑혀요'));
      cam = S.balls[0].y - 400; camX = MW / 2; zoom = 1; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); paintBoard();
    }
    function finish(b) {
      slowEl.hidden = true; var lastMode = mdSel.value === 'last';
      setTimeout(function () { win.innerHTML = '<div>' + esc(b.n) + '<small>' + (lastMode ? '🐢 끝까지 남았어요! (꼴등 뽑기)' : '🎉 1등으로 도착!') + '</small></div>'; beep(1175, .6); }, 300);
      if (done) done(b.n);
    }
    /* 실시간 순위판: 12명 넘으면 위 10명 + … + 꼴찌 */
    function paintBoard() {
      var list = S.ranking(), n = list.length, rows = [], lastMode = mdSel.value === 'last';
      list.forEach(function (b, i) { rows.push(i); });
      if (n > 12) rows = rows.slice(0, 10).concat(['gap', n - 1]);
      board.innerHTML = '<h4>실시간 순위 ' + (lastMode ? '· 🐢 꼴등이 뽑힘' : '· 🥇 1등이 뽑힘') + '</h4>' + rows.map(function (i) {
        if (i === 'gap') return '<div class="gap">⋮</div>';
        var b = list[i], was = prevRk[b.n], ch = was === undefined ? 0 : was - i, idx = S.balls.indexOf(b);
        var tag = b.done ? '🏁' : (i === 0 ? '👑' : (i === n - 1 && n > 2 ? '🐢' : ''));
        return '<div class="r' + (b.done ? ' fin' : '') + (follow === b ? ' me' : '') + (hot[b.n] > S.t ? ' hot' : '') + '" data-i="' + idx + '" title="누르면 이 구슬 따라가기">' +
          '<span class="no">' + (i + 1) + '</span><span class="dot" style="background:' + b.c + '"></span><span class="nm">' + tag + esc(b.n) + '</span>' +
          '<span class="ch ' + (ch > 0 ? 'up' : ch < 0 ? 'dn' : '') + '">' + (ch > 0 ? '▲' + ch : ch < 0 ? '▼' + (-ch) : '') + '</span></div>';
      }).join('');
    }
    function watchRank() {   // 역전 알림 + ▲▼ 기준(1.5초 전 순위)
      var list = S.ranking(), lastMode = mdSel.value === 'last';
      if (S.t - prevT > 1.5) { prevT = S.t; var m = {}; list.forEach(function (b, i) { if (prevRk[b.n] !== undefined && prevRk[b.n] - i >= 3) hot[b.n] = S.t + 1.5; m[b.n] = i; }); prevRk = m; }
      if (S.over || S.t < 2.5) { leadName = lastMode ? (list[list.length - 1] || {}).n : (list[0] || {}).n; return; }
      var who = lastMode ? list[list.length - 1] : list[0];   // 0.6초 넘게 그 자리를 지켜야 역전으로 침(엎치락뒤치락 깜빡임 막기)
      if (lastMode && S.live.length > 8) { leadName = who && who.n; return; }   // 꼴등 뽑기는 8명 남았을 때부터 알림
      if (!who || who.n === leadName) { cand = null; return; }
      if (!cand || cand.n !== who.n) { cand = { n: who.n, t: S.t }; return; }
      if (S.t - cand.t < .6 || bigT > 0) return;
      if (leadName !== null) { shout(lastMode ? '🐢 꼴찌가 바뀌었다! ' + who.n : '🔥 역전! ' + who.n + ' 1위!'); hot[who.n] = S.t + 1.5; beep(lastMode ? 330 : 880, .12); beep(lastMode ? 260 : 1320, .18); }
      leadName = who.n; cand = null;
    }
    function line(x1, y1, x2, y2) { cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2); cx.stroke(); }
    function drawMap(mini, now) {
      // 부스터: 화살표가 흐르는 판
      C.pad.forEach(function (p) {
        cx.fillStyle = p.rb ? 'rgba(80,255,120,.16)' : 'rgba(80,200,255,.14)'; cx.fillRect(p.x, p.y, p.w, p.h);
        if (mini) return;
        cx.strokeStyle = p.rb ? '#5f8' : '#5cf'; cx.lineWidth = 2; cx.strokeRect(p.x, p.y, p.w, p.h);
        var ang = Math.atan2(p.ay, p.ax), off = (now / 8) % 40;
        cx.save(); cx.beginPath(); cx.rect(p.x, p.y, p.w, p.h); cx.clip(); cx.globalAlpha = .7; cx.lineWidth = 5; cx.lineCap = 'round';
        for (var x = p.x + 20; x < p.x + p.w; x += 60) for (var y = p.y - 40 + off; y < p.y + p.h + 40; y += 40) {
          var ux = Math.cos(ang) * 10, uy = Math.sin(ang) * 10, cxp = x + (Math.abs(p.ax) > Math.abs(p.ay) ? (y - p.y) * Math.sign(p.ax) : 0), cyp = Math.abs(p.ax) > Math.abs(p.ay) ? p.y + p.h / 2 : y;
          cx.beginPath(); cx.moveTo(cxp - ux - uy, cyp - uy + ux); cx.lineTo(cxp + ux, cyp + uy); cx.lineTo(cxp - ux + uy, cyp - uy - ux); cx.stroke();
        }
        cx.restore();
        if (p.rb) { cx.fillStyle = '#5f8'; cx.font = '20px Jua, sans-serif'; cx.textAlign = 'left'; cx.fillText('🚀 역전 부스터 (뒤처질수록 세게)', p.x + 8, p.y - 8); }
      });
      C.pegs.forEach(function (p) {
        if (p.gone) return;
        if (p.pop) {   // 🫧 터지는 방울
          cx.fillStyle = mini ? '#cc5' : 'rgba(255,240,80,.18)'; cx.strokeStyle = '#ff5'; cx.lineWidth = mini ? 6 : 3;
          if (!mini) { cx.shadowColor = '#ff5'; cx.shadowBlur = 14; }
          cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 7); cx.fill(); if (!mini) cx.stroke(); return;
        }
        if (mini) return; cx.shadowBlur = 12; cx.shadowColor = '#3ff'; cx.fillStyle = '#3ff'; cx.beginPath(); cx.arc(p.x, p.y, p.r * .8, 0, 7); cx.fill();
      });
      cx.shadowBlur = mini ? 0 : 12; cx.shadowColor = '#3ff';
      cx.strokeStyle = mini ? '#9aa' : '#3ff'; cx.lineCap = 'round';
      C.segs.forEach(function (s) { cx.lineWidth = mini ? 8 : Math.max(5, 2 * (s.r == null ? 5 : s.r)); line(s.a[0], s.a[1], s.b[0], s.b[1]); });
      C.door.forEach(function (d) {   // 🚦 문: 닫히면 빨강, 열리면 초록 점선 + 남은 초
        var left = d.open ? d.c + d.o - d.t % (d.c + d.o) : d.c - d.t % (d.c + d.o);
        cx.lineWidth = mini ? 8 : 12; cx.strokeStyle = d.open ? '#3f6' : '#f33';
        if (!mini) { cx.shadowColor = cx.strokeStyle; cx.shadowBlur = 16; cx.setLineDash(d.open ? [8, 14] : []); }
        line(d.a[0], d.a[1], d.b[0], d.b[1]); cx.setLineDash([]);
        if (mini) return;
        var mx = (d.a[0] + d.b[0]) / 2, my = d.a[1] + 50;
        cx.shadowBlur = 0; cx.fillStyle = '#222'; cx.fillRect(mx - 38, my - 18, 76, 34);
        cx.fillStyle = d.open ? '#3f6' : '#f33'; cx.beginPath(); cx.arc(mx - 20, my - 1, 11, 0, 7); cx.fill();
        cx.fillStyle = '#fff'; cx.font = '22px Jua, sans-serif'; cx.textAlign = 'center'; cx.fillText(Math.ceil(left), mx + 14, my + 7);
      });
      if (!mini) C.hold.forEach(function (h) { cx.shadowBlur = 0; cx.fillStyle = h.k === 'light' ? '#f88' : '#fd8'; cx.font = '20px Jua, sans-serif'; cx.textAlign = 'center'; if (h.k === 'light') cx.fillText('🚦 신호등 정체', MW / 2, h.y0 + 30); });
      // 깨지는 벽: 금이 갈수록 흐려짐
      C.brick.forEach(function (w) {
        if (w.life <= 0) return; var k = w.life / w.max;
        cx.strokeStyle = mini ? '#c84' : 'rgb(255,' + Math.round(120 + 60 * k) + ',60)'; if (!mini) { cx.shadowColor = '#f84'; cx.shadowBlur = 12; }
        cx.lineWidth = mini ? 10 : 14; cx.setLineDash(mini ? [] : [26, 6]); line(w.a[0], w.a[1], w.b[0], w.b[1]); cx.setLineDash([]);
        if (!mini && k < .7) { cx.strokeStyle = '#000'; cx.lineWidth = 3; cx.shadowBlur = 0; for (var i = 1; i < 4; i++) { var u = i / 4, mx = w.a[0] + (w.b[0] - w.a[0]) * u, my = w.a[1] + (w.b[1] - w.a[1]) * u; if (k < 1 - i * .2) line(mx - 6, my - 7, mx + 5, my + 7); } }
        if (!mini && w === C.brick[0]) { cx.shadowBlur = 0; cx.fillStyle = '#fa6'; cx.font = '20px Jua, sans-serif'; cx.textAlign = 'center'; cx.fillText('🧱 깨지는 벽', MW / 2, Math.min(w.a[1], w.b[1]) - 14); }
      });
      if (!mini) { cx.strokeStyle = '#ff5'; cx.shadowColor = '#ff5'; cx.shadowBlur = 12; }
      cx.lineWidth = mini ? 8 : 10;
      C.slide.forEach(function (s) { line(s.x - s.len / 2, s.y, s.x + s.len / 2, s.y); });
      if (!mini) { cx.strokeStyle = '#f5f'; cx.shadowColor = '#f5f'; }
      C.spin.forEach(function (s) { cx.lineWidth = mini ? 8 : Math.max(10, 2 * (s.r || 5)); (s.bars || bars(s)).forEach(function (l) { line(l[0], l[1], l[2], l[3]); }); if (!mini) { cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(s.x, s.y, 6, 0, 7); cx.fill(); } });
      if (!mini) { cx.strokeStyle = '#7f7'; cx.shadowColor = '#7f7'; }
      C.ring.forEach(function (g) { (g.segs.length ? g.segs : ringSegs(g)).forEach(function (l) { line(l[0], l[1], l[2], l[3]); }); if (!mini) { cx.fillStyle = 'rgba(120,255,120,.08)'; cx.beginPath(); cx.arc(g.x, g.y, g.r, 0, 7); cx.fill(); } });
      C.bump.forEach(function (p) { cx.fillStyle = mini ? '#f80' : p.hit > 0 ? '#fff' : '#f80'; if (!mini) { cx.shadowColor = '#f80'; cx.shadowBlur = p.hit > 0 ? 30 : 14; } cx.beginPath(); cx.arc(p.x, p.y, p.hit > 0 && !mini ? p.r * 1.12 : p.r, 0, 7); cx.fill(); });
      C.trap.forEach(function (t) {
        if (!mini) { cx.shadowColor = '#f00'; cx.shadowBlur = 18; }
        cx.fillStyle = '#300'; cx.strokeStyle = '#f33'; cx.lineWidth = mini ? 10 : 4; cx.beginPath(); cx.arc(t.x, t.y, t.r, 0, 7); cx.fill(); cx.stroke();
        if (!mini) { cx.shadowBlur = 0; cx.fillStyle = '#f66'; cx.font = '26px Jua, sans-serif'; cx.textAlign = 'center'; cx.fillText('↩', t.x, t.y + 9); }
      });
      C.warp.forEach(function (w) {   // 워프: 빙글빙글 소용돌이
        if (mini) { cx.fillStyle = '#a5f'; cx.beginPath(); cx.arc(w.x, w.y, w.r, 0, 7); cx.fill(); return; }
        cx.shadowColor = '#a5f'; cx.shadowBlur = 24; cx.fillStyle = '#1a0630'; cx.beginPath(); cx.arc(w.x, w.y, w.r, 0, 7); cx.fill();
        cx.lineWidth = 4; for (var i = 0; i < 3; i++) { cx.strokeStyle = ['#c8f', '#a5f', '#f6f'][i]; cx.beginPath(); cx.arc(w.x, w.y, w.r - 6 - i * 8, w.t * (3 + i) + i * 2, w.t * (3 + i) + i * 2 + 3.6); cx.stroke(); }
        cx.shadowBlur = 0; cx.fillStyle = '#fff'; cx.font = '24px Jua, sans-serif'; cx.textAlign = 'center'; cx.fillText(w.mys ? '?' : (w.to[0][1] > w.y ? '⬇' : '⬆'), w.x, w.y + 8);
      });
      cx.shadowBlur = 0;
    }
    function drawFx(dt) {
      fxs = fxs.filter(function (o) { o.t += dt; return o.t < (o.k === 'brick' ? 1.2 : o.k === 'zap' ? .5 : .7); });
      fxs.forEach(function (o) {
        var k;
        if (o.k === 'boom') {
          k = o.t / .7; cx.globalAlpha = 1 - k; cx.strokeStyle = '#ff5'; cx.shadowColor = '#f80'; cx.shadowBlur = 30; cx.lineWidth = 10 * (1 - k) + 2;
          cx.beginPath(); cx.arc(o.x, o.y, 30 + k * 220, 0, 7); cx.stroke();
          cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(o.x, o.y, 40 * (1 - k), 0, 7); cx.fill();
          cx.font = (60 + 40 * k) + 'px Jua, sans-serif'; cx.textAlign = 'center'; cx.fillStyle = '#ff5'; cx.fillText('💥', o.x, o.y - 30 - k * 40);
        } else if (o.k === 'zap') {
          k = o.t / .5; cx.globalAlpha = (1 - k) * (Math.random() < .3 ? .4 : 1); cx.strokeStyle = '#fff'; cx.shadowColor = '#ff5'; cx.shadowBlur = 30; cx.lineWidth = 6; cx.lineJoin = 'round';
          cx.beginPath(); o.pts.forEach(function (p, i) { if (i) cx.lineTo(p[0], p[1]); else cx.moveTo(p[0], p[1]); }); cx.stroke();
          cx.fillStyle = 'rgba(255,255,120,.5)'; cx.beginPath(); cx.arc(o.x, o.y, 70 * (1 - k) + 20, 0, 7); cx.fill();
        } else if (o.k === 'warp') {
          k = o.t / .7; cx.globalAlpha = 1 - k; cx.strokeStyle = o.c; cx.shadowColor = '#a5f'; cx.shadowBlur = 20; cx.lineWidth = 5;
          cx.beginPath(); cx.arc(o.x, o.y, 10 + k * 70, 0, 7); cx.stroke(); cx.beginPath(); cx.arc(o.x, o.y, 5 + k * 40, 0, 7); cx.stroke();
        } else if (o.k === 'push') {
          k = o.t / .7; cx.globalAlpha = (1 - k) * .8; cx.strokeStyle = o.c; cx.lineWidth = 4; cx.shadowBlur = 0;
          cx.beginPath(); cx.arc(o.x, o.y, 20 + k * 120, 0, 7); cx.stroke();
          cx.font = '28px Jua, sans-serif'; cx.textAlign = 'center'; cx.fillStyle = '#fff'; cx.fillText('💨', o.x, o.y - 30 - k * 30);
        } else if (o.k === 'pop') {
          k = o.t / .7; cx.globalAlpha = 1 - k; cx.strokeStyle = '#ff5'; cx.lineWidth = 4; cx.shadowColor = '#ff5'; cx.shadowBlur = 16;
          cx.beginPath(); cx.arc(o.x, o.y, o.r * (1 + k * .8), 0, 7); cx.stroke();
        } else if (o.k === 'brick') {
          k = o.t / 1.2; cx.globalAlpha = 1 - k; cx.fillStyle = '#f94'; cx.shadowBlur = 0;
          o.ps.forEach(function (p) { p.vy += 1200 * dt; p.x += p.vx * dt; p.y += p.vy * dt; cx.fillRect(p.x - 7, p.y - 5, 14, 10); });
        }
        cx.globalAlpha = 1; cx.shadowBlur = 0;
      });
    }
    function frame(now) {
      var dt = Math.min(.033, (now - last) / 1000); last = now;
      var live = S.live, lastMode = mdSel.value === 'last', lead = live[0];
      var near = !S.over && (lastMode ? live.length === 2 && lead && lead.y > FIN - 380 : lead && lead.y > FIN - 380);   // 승부가 갈리기 직전: 느린 화면 + 확대
      slowEl.hidden = !near;
      if (toastT > 0) { toastT -= dt; if (toastT <= 0) toast.textContent = ''; }
      if (bigT > 0) bigT -= dt;
      var n = Math.round(6 * speed * (near ? .35 : 1)) || 1;
      for (var k = 0; k < n; k++) S.step(dt / 6 * PACE);   // PACE: ×1에서 경주가 흘러가는 빠르기(1 = 원래)
      if (near && ++ticked % 20 === 0) beep(330, .05);
      watchRank();
      if ((boardT -= dt) <= 0) { boardT = .2; paintBoard(); }
      if (follow && follow.done) follow = null;
      // 📺 꼴등 뽑기: 1등이 들어오면 카메라가 꼴찌를 중계(남은 둘이 가까우면 둘 사이를 비춤), 끝나면 뽑힌 구슬을 비춤
      var tail = live[live.length - 1], casting = lastMode && S.order.length > 0 && tail;
      castEl.hidden = !(casting && !S.over);
      if (casting && !S.over) castEl.textContent = '📺 꼴찌 중계 · ' + tail.n + ' (남은 구슬 ' + live.length + '개)';
      var tgt = follow || (lastMode && S.over && S.pick ? S.pick : casting ? (live.length === 2 && Math.abs(live[0].y - tail.y) < 450 ? { x: (live[0].x + tail.x) / 2, y: (live[0].y + tail.y) / 2 } : tail) : lead);
      var rw = cv.clientWidth, rh = cv.clientHeight, dpr = devicePixelRatio || 1;
      if (cv.width !== Math.round(rw * dpr) || cv.height !== Math.round(rh * dpr)) { cv.width = Math.round(rw * dpr); cv.height = Math.round(rh * dpr); }
      zoom += ((near ? 1.7 : 1) - zoom) * .06;
      var sc = Math.min(rw / Math.min(MW, 900), rh / 700) * zoom, viewH = rh / sc, viewW = rw / sc;
      var ty = S.over && !follow && !lastMode ? FIN - viewH * .55 : tgt ? tgt.y - viewH * .6 : cam, tx = tgt && (MW > viewW || (near && zoom > 1.2)) ? tgt.x : MW / 2;   // 맵이 화면보다 넓을 때나 확대 중일 때만 옆으로 따라감
      cam += (Math.max(-40, Math.min(H - viewH, ty)) - cam) * .08; if (MW > viewW) tx = Math.max(viewW / 2 - 40, Math.min(MW - viewW / 2 + 40, tx)); camX += (tx - camX) * .08;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.fillStyle = '#000'; cx.fillRect(0, 0, rw, rh);
      cx.setTransform(sc * dpr, 0, 0, sc * dpr, (rw / 2 - camX * sc) * dpr, -cam * sc * dpr);
      if (S.wind) { cx.globalAlpha = .25; cx.strokeStyle = '#fff'; cx.lineWidth = 3; for (var i = 0; i < 14; i++) { var wy = cam + ((i * 97 + now / 3) % viewH), wx = ((i * 211 + now * Math.sign(S.wind.ax)) % (MW + 200) + MW + 200) % (MW + 200) - 100; line(wx, wy, wx - Math.sign(S.wind.ax) * 80, wy); } cx.globalAlpha = 1; }
      cx.strokeStyle = '#fff'; cx.lineWidth = 4; cx.shadowColor = '#3ff'; cx.shadowBlur = 14; if (!C.imp) { line(0, cam - 50, 0, cam + viewH + 50); line(MW, cam - 50, MW, cam + viewH + 50); }
      cx.shadowBlur = 0; for (var x = 0; x < MW; x += 40) { cx.fillStyle = (x / 40) % 2 ? '#fff' : '#333'; cx.fillRect(x, FIN, 40, 14); }
      cx.fillStyle = '#ff5'; cx.font = '28px Jua, sans-serif'; cx.textAlign = 'center'; cx.fillText('🏁 결승선', camX, FIN + 50);
      drawMap(false, now);
      drawFx(dt);
      cx.font = '18px Jua, "Gowun Dodum", sans-serif';
      S.balls.forEach(function (b) {
        if (b.rocket > 0) { cx.fillStyle = Math.random() < .5 ? '#f80' : '#ff5'; cx.beginPath(); cx.moveTo(b.x - 10, b.y - 8); cx.lineTo(b.x + 10, b.y - 8); cx.lineTo(b.x + rnd(-6, 6), b.y - 40 - Math.random() * 40); cx.fill(); }
        cx.fillStyle = b.c; cx.shadowColor = b.c; cx.shadowBlur = 10; cx.beginPath(); cx.arc(b.x, b.y, R, 0, 7); cx.fill(); cx.shadowBlur = 0;
        if (b.zap > 0 && Math.random() < .6) { cx.strokeStyle = '#ff5'; cx.lineWidth = 4; cx.stroke(); }
        else if (follow === b || S.order[0] === b || (lead === b && near)) { cx.strokeStyle = '#fff'; cx.lineWidth = 3; cx.stroke(); }
        cx.fillStyle = b.c; cx.textAlign = 'center'; cx.fillText(b.n, b.x, b.y + R + 18);
        if (!b.done && b === lead && !S.order.length) cx.fillText('👑', b.x, b.y - R - 6);
      });
      // 미니맵 (왼쪽): 코스 전체와 지금 보는 곳
      var mh = Math.min(rh - 24, 520), ms = mh / H, mw = MW * ms;
      if (rw > 700) {
        cx.setTransform(dpr, 0, 0, dpr, 12 * dpr, 12 * dpr); cx.fillStyle = 'rgba(60,60,60,.75)'; cx.fillRect(0, 0, mw, mh);
        cx.setTransform(ms * dpr, 0, 0, ms * dpr, 12 * dpr, 12 * dpr);
        drawMap(true, now);
        S.balls.forEach(function (b) { cx.fillStyle = b.c; cx.beginPath(); cx.arc(b.x, b.y, 2.5 / ms, 0, 7); cx.fill(); });
        cx.strokeStyle = '#3f3'; cx.lineWidth = 1.5 / ms; cx.strokeRect(camX - viewW / 2, cam, viewW, viewH);
      }
      raf = requestAnimationFrame(frame);
    }
    function close() { cancelAnimationFrame(raf); removeEventListener('keydown', key); box.remove(); }
    function key(e) { if (e.key === 'Escape') close(); }
    addEventListener('keydown', key);
    sel.onchange = mdSel.onchange = function () { saveSt(); start(); };
    function setSpeed(v) { speed = v; box.querySelectorAll('.spd button').forEach(function (x) { x.setAttribute('aria-pressed', String(+x.dataset.s === v)); }); }
    // ⏩ 화면 더블클릭: ×2로 빠르게 ↔ 다시 ×1
    box.querySelector('.st').ondblclick = function (e) {
      if (e.target.closest('.board')) return;
      setSpeed(speed === 2 ? 1 : 2); say(speed === 2 ? '⏩ ×2 빠르게' : '▶ 보통 빠르기 (×1)');
      var sel = window.getSelection && window.getSelection(); if (sel) sel.removeAllRanges();
    };
    board.onclick = function (e) { var r = e.target.closest('.r'); if (!r) return; var b = S.balls[+r.dataset.i]; follow = follow === b || b.done ? null : b; paintBoard(); };
    box.querySelector('.bar').onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.s) setSpeed(+b.dataset.s);
      else if (b.dataset.k === 'ev') { evOn = !evOn; evBtn.setAttribute('aria-pressed', String(evOn)); saveSt(); start(); }
      else if (b.dataset.k === 'close') close(); else start();
    };
    start();
  };
  window.MarbleRace._race = Race; window.MarbleRace._maps = ORDER;   // 점검용
})();

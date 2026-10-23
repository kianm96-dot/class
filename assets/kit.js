/* 활동 도구 모음: 패널 안의 <script type="application/json" class="kit"> 를 읽어 활동 블록을 그립니다.
   블록 k: vote(반 전체 투표) · pick(골라 보고 결과 보기) · sort(분류) · ox(OX 퀴즈) · flip(뒤집기 카드)
          line(동의 정도 수직선) · rank(순위 매기기) · write(생각 쓰기+예시) · timer(모둠 시계) · spin(카드 뽑기)
   tools/build_act.py 가 데이터로 이 블록들을 씁니다. 저장하지 않고 이 화면에서만 씁니다. */
(function () {
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  var COLORS = ['#ff7a6b', '#4a9eff', '#36b37e', '#a777e3', '#f5a623', '#ef5d9a'];
  var B = {};

  B.vote = function (b, box) {
    var n = b.opts.map(function () { return 0; });
    var wrap = el('div', 'k-vote');
    function draw() {
      var tot = n.reduce(function (a, c) { return a + c; }, 0) || 1;
      wrap.innerHTML = b.opts.map(function (o, i) {
        return '<div class="k-vrow" style="--c:' + COLORS[i % 6] + '"><button type="button" class="k-vbtn" data-i="' + i + '">' + esc(o) + '</button>' +
          '<span class="k-vbar"><i style="width:' + (n[i] / tot * 100) + '%"></i></span><b>' + n[i] + '</b><button type="button" class="k-minus" data-m="' + i + '" aria-label="하나 빼기">−</button></div>';
      }).join('') + '<p class="k-hint">선택지를 누를 때마다 한 표씩 올라가요. 손을 든 학생 수만큼 누르세요.</p><div class="btns"><button type="button" class="k-reset">처음부터</button></div>';
    }
    wrap.onclick = function (e) {
      var t = e.target;
      if (t.dataset.i != null) n[+t.dataset.i]++;
      else if (t.dataset.m != null) n[+t.dataset.m] = Math.max(0, n[+t.dataset.m] - 1);
      else if (t.classList.contains('k-reset')) n = n.map(function () { return 0; });
      else return;
      draw();
    };
    draw(); box.appendChild(wrap);
  };

  B.pick = function (b, box) {
    var w = el('div', 'k-pick');
    w.innerHTML = '<div class="k-sit">' + esc(b.sit) + '</div><div class="k-opts">' +
      b.opts.map(function (o, i) { return '<button type="button" class="pick" data-i="' + i + '"><b>' + String.fromCharCode(65 + i) + '</b>' + esc(o[0]) + '</button>'; }).join('') +
      '</div><div class="fb" hidden></div>';
    var fb = w.querySelector('.fb');
    w.querySelector('.k-opts').onclick = function (e) {
      var t = e.target.closest('.pick'); if (!t) return;
      w.querySelectorAll('.pick').forEach(function (p) { p.setAttribute('aria-pressed', String(p === t)); });
      fb.hidden = false; fb.innerHTML = esc(b.opts[+t.dataset.i][1]);
    };
    box.appendChild(w);
  };

  B.sort = function (b, box) {
    var w = el('div', 'k-sort'), done = 0, ok = 0;
    w.innerHTML = '<div class="k-score">맞힌 수 <b>0</b> / ' + b.cards.length + '</div>' + b.cards.map(function (c, i) {
      return '<div class="k-card" data-i="' + i + '"><p>' + esc(c[0]) + '</p><div class="k-bins">' +
        b.bins.map(function (x, j) { return '<button type="button" data-j="' + j + '" style="--c:' + COLORS[j % 6] + '">' + esc(x) + '</button>'; }).join('') +
        '</div><p class="k-why" hidden></p></div>';
    }).join('');
    w.onclick = function (e) {
      var t = e.target.closest('button[data-j]'); if (!t) return;
      var card = t.closest('.k-card'); if (card.classList.contains('done')) return;
      var c = b.cards[+card.dataset.i], right = c[1] === +t.dataset.j;
      card.classList.add('done', right ? 'ok' : 'no'); done++; if (right) ok++;
      card.querySelectorAll('button').forEach(function (x) { x.disabled = true; if (+x.dataset.j === c[1]) x.classList.add('ans'); });
      var why = card.querySelector('.k-why'); why.hidden = false; why.textContent = (right ? '⭕ ' : '❌ 정답: ' + b.bins[c[1]] + ' · ') + (c[2] || '');
      w.querySelector('.k-score b').textContent = ok;
    };
    box.appendChild(w);
  };

  B.ox = function (b, box) {
    var w = el('div', 'k-ox');
    w.innerHTML = b.items.map(function (c, i) {
      return '<div class="k-card" data-i="' + i + '"><p><span class="k-n">Q' + (i + 1) + '</span>' + esc(c[0]) + '</p><div class="k-bins">' +
        '<button type="button" data-o="1" class="o">⭕</button><button type="button" data-o="0" class="x">❌</button></div><p class="k-why" hidden></p></div>';
    }).join('');
    w.onclick = function (e) {
      var t = e.target.closest('button[data-o]'); if (!t) return;
      var card = t.closest('.k-card'); if (card.classList.contains('done')) return;
      var c = b.items[+card.dataset.i], right = (t.dataset.o === '1') === !!c[1];
      card.classList.add('done', right ? 'ok' : 'no');
      var why = card.querySelector('.k-why'); why.hidden = false; why.textContent = (right ? '맞아요! ' : '아쉬워요. 정답은 ' + (c[1] ? '⭕' : '❌') + ' · ') + (c[2] || '');
    };
    box.appendChild(w);
  };

  B.flip = function (b, box) {
    var w = el('div', 'k-flip');
    w.innerHTML = b.cards.map(function (c) {
      return '<button type="button" class="k-fc"><span class="fr">' + esc(c[0]) + '<small>눌러서 뒤집기</small></span><span class="bk">' + esc(c[1]) + '</span></button>';
    }).join('');
    w.onclick = function (e) { var t = e.target.closest('.k-fc'); if (t) t.classList.toggle('on'); };
    box.appendChild(w);
  };

  B.line = function (b, box) {
    var w = el('div', 'k-line');
    w.innerHTML = '<div class="k-ends"><span>◀ ' + esc(b.left) + '</span><span>' + esc(b.right) + ' ▶</span></div>' + b.items.map(function (s) {
      return '<label class="k-lrow"><span>' + esc(s) + '</span><input type="range" min="0" max="100" value="50"><i class="k-dot">🙂</i></label>';
    }).join('');
    w.addEventListener('input', function (e) {
      var r = e.target; if (r.type !== 'range') return;
      r.nextElementSibling.textContent = r.value < 25 ? '🙅' : r.value < 45 ? '🤔' : r.value <= 55 ? '😐' : r.value < 75 ? '🙂' : '🙆';
    });
    box.appendChild(w);
  };

  B.rank = function (b, box) {
    var w = el('div', 'k-rank'), order = [];
    function draw() {
      w.innerHTML = '<div class="k-ritems">' + b.items.map(function (s, i) {
        var r = order.indexOf(i);
        return '<button type="button" class="pick' + (r > -1 ? ' ranked' : '') + '" data-i="' + i + '"><b>' + (r > -1 ? (r + 1) + '위' : '·') + '</b>' + esc(s) + '</button>';
      }).join('') + '</div><div class="btns"><button type="button" class="k-reset">다시 매기기</button></div>' +
        (order.length === b.items.length && b.after ? '<div class="fb">' + esc(b.after) + '</div>' : '');
    }
    w.onclick = function (e) {
      var t = e.target.closest('[data-i]');
      if (t) { var i = +t.dataset.i, r = order.indexOf(i); if (r > -1) order.splice(r, 1); else order.push(i); draw(); }
      else if (e.target.classList.contains('k-reset')) { order = []; draw(); }
    };
    draw(); box.appendChild(w);
  };

  B.write = function (b, box) {
    var w = el('div', 'k-write');
    w.innerHTML = b.prompts.map(function (p, i) {
      return '<div class="card"><label class="step">' + esc(p[0]) + '</label><textarea rows="3" placeholder="여기에 써 보세요"></textarea>' +
        (p[1] ? '<button type="button" class="k-ex">예시 보기</button><p class="k-exm" hidden>' + esc(p[1]) + '</p>' : '') + '</div>';
    }).join('');
    w.onclick = function (e) {
      if (!e.target.classList.contains('k-ex')) return;
      var m = e.target.nextElementSibling; m.hidden = !m.hidden; e.target.textContent = m.hidden ? '예시 보기' : '예시 숨기기';
    };
    box.appendChild(w);
  };

  B.timer = function (b, box) {
    var w = el('div', 'k-timer'), left = b.min * 60, t = null;
    function fmt() { return Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); }
    w.innerHTML = '<span class="k-tl">⏱ ' + esc(b.label || '모둠 이야기') + '</span><b>' + fmt() + '</b><button type="button" class="go">시작</button><button type="button" class="k-tr">다시</button>';
    var face = w.querySelector('b'), go = w.querySelector('.go');
    go.onclick = function () {
      if (t) { clearInterval(t); t = null; go.textContent = '계속'; return; }
      go.textContent = '멈춤';
      t = setInterval(function () { left--; face.textContent = fmt(); if (left <= 0) { clearInterval(t); t = null; w.classList.add('end'); face.textContent = '끝! 🔔'; go.textContent = '시작'; left = b.min * 60; } }, 1000);
    };
    w.querySelector('.k-tr').onclick = function () { clearInterval(t); t = null; left = b.min * 60; face.textContent = fmt(); go.textContent = '시작'; w.classList.remove('end'); };
    box.appendChild(w);
  };

  B.spin = function (b, box) {
    var w = el('div', 'k-spin'), used = [];
    w.innerHTML = '<div class="k-slot">' + esc(b.q || '버튼을 눌러 카드를 뽑아요') + '</div><div class="btns"><button type="button" class="go">🎲 카드 뽑기</button><span class="k-left"></span></div>';
    var slot = w.querySelector('.k-slot'), lf = w.querySelector('.k-left');
    w.querySelector('.go').onclick = function () {
      if (used.length === b.items.length) used = [];
      var rest = b.items.map(function (_, i) { return i; }).filter(function (i) { return used.indexOf(i) < 0; });
      var k = 0, pickI = rest[Math.floor(Math.random() * rest.length)];
      slot.classList.add('rolling');
      var iv = setInterval(function () {
        slot.textContent = b.items[Math.floor(Math.random() * b.items.length)];
        if (++k > 10) { clearInterval(iv); slot.classList.remove('rolling'); slot.textContent = b.items[pickI]; used.push(pickI); lf.textContent = '남은 카드 ' + (b.items.length - used.length); }
      }, 70);
    };
    box.appendChild(w);
  };

  document.querySelectorAll('script.kit').forEach(function (s) {
    var blocks = JSON.parse(s.textContent), host = s.parentNode;
    blocks.forEach(function (b) {
      var box = el('div', 'k-block k-' + b.k + '-box');
      if (b.h) box.appendChild(el('h2', 'sub', esc(b.h)));
      if (b.q && b.k !== 'spin') box.appendChild(el('p', 'k-q', esc(b.q)));
      (B[b.k] || function () { box.appendChild(el('p', '', '모르는 활동: ' + esc(b.k))); })(b, box);
      host.insertBefore(box, s);
    });
  });
})();

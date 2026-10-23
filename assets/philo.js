/* 철학자 톡: window.WHO(철학자 정보)와 window.CHAT(메시지 목록)으로 메신저 화면을 그립니다.
   [다음] · → · 스페이스: 다음 말풍선. 퀴즈와 OX는 답해야 넘어갑니다. ‘한 번에 보기’는 선생님 미리 보기용.
   다 읽으면 철학자 카드를 얻고, 이 브라우저에 기억해 첫 화면 ‘철학자 톡’ 줄에 표시합니다. */
(function () {
  var W = window.WHO, C = window.CHAT, log = document.getElementById('log'), nextB = document.getElementById('next'),
      bar = document.getElementById('prog'), i = 0, lock = false;
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var nl = function (s) { return esc(s).replace(/\n/g, '<br>'); };
  var ava = '<span class="ava">' + W.emoji + '</span>';
  function add(html, cls) { var d = document.createElement('div'); d.className = 'msg ' + cls; d.innerHTML = html; log.appendChild(d); requestAnimationFrame(function () { d.classList.add('in'); }); d.scrollIntoView({ behavior: 'smooth', block: 'end' }); return d; }
  function wait(on) { lock = on; nextB.disabled = on; nextB.textContent = on ? '답을 골라 보세요' : (i < C.length ? '다음 ▶' : '처음부터 다시'); }
  function render(m) {
    var k = m[0];
    if (k === 'p') return add(ava + '<div class="bub">' + m[1] + '</div>', 'them');
    if (k === 'me') return add('<div class="bub">' + nl(m[1]) + '</div>', 'me');
    if (k === 'term') return add('<div class="term"><span>📌 용어 카드</span><b>' + esc(m[1]) + '</b><p>' + nl(m[2]) + '</p></div>', 'sys');
    if (k === 'quote') {
      var q = add('<div class="orig"><span>📜 원문 읽기</span><blockquote>' + nl(m[1]) + '</blockquote><cite>' + esc(m[2]) + '</cite>' +
        '<button type="button" class="easy-b">🔍 쉬운 말로 보기</button><p class="easy" hidden>' + nl(m[3]) + '</p></div>', 'sys');
      q.querySelector('.easy-b').onclick = function () { var e = q.querySelector('.easy'); e.hidden = !e.hidden; this.textContent = e.hidden ? '🔍 쉬운 말로 보기' : '쉬운 말 접기'; };
      return q;
    }
    if (k === 'quiz' || k === 'ox') {
      var opts = k === 'ox' ? ['⭕ 맞다', '❌ 아니다'] : m[2], ans = k === 'ox' ? (m[2] ? 0 : 1) : m[3], why = k === 'ox' ? m[3] : m[4];
      var d = add('<div class="quiz"><span>' + (k === 'ox' ? '⭕❌ OX 퀴즈' : '❓ 퀴즈') + '</span><b>' + esc(m[1]) + '</b><div class="opts">' +
        opts.map(function (o, j) { return '<button type="button" data-j="' + j + '">' + esc(o) + '</button>'; }).join('') + '</div><p class="why" hidden></p></div>', 'sys');
      wait(true);
      d.querySelector('.opts').onclick = function (e) {
        var t = e.target.closest('button'); if (!t || d.classList.contains('done')) return;
        var j = +t.dataset.j, ok = j === ans;
        t.classList.add(ok ? 'ok' : 'no');
        if (!ok) { t.disabled = true; var w = d.querySelector('.why'); w.hidden = false; w.textContent = '다시 생각해 보세요! 🤔'; return; }
        d.classList.add('done'); d.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
        var w2 = d.querySelector('.why'); w2.hidden = false; w2.textContent = '🎉 ' + why;
        score++; wait(false); w2.scrollIntoView({ behavior: 'smooth', block: 'end' });
      };
      return d;
    }
    if (k === 'mission') {
      var x = add('<div class="mission"><span>🚀 오늘의 미션</span><b>' + esc(m[1]) + '</b><div class="story">' + nl(m[2]) + '</div>' +
        '<p class="task">✏️ ' + esc(m[3]) + '</p><textarea rows="5" placeholder="내 생각을 써 보세요"></textarea>' +
        '<div class="row"><button type="button" class="ex-b">💡 예시 답 보기</button></div><p class="ex" hidden>' + nl(m[4]) + '</p></div>', 'sys');
      x.querySelector('.ex-b').onclick = function () { var e = x.querySelector('.ex'); e.hidden = !e.hidden; this.textContent = e.hidden ? '💡 예시 답 보기' : '예시 답 접기'; };
      return x;
    }
    if (k === 'end') {
      try { var got = JSON.parse(localStorage.getItem('philoBadges') || '[]'); if (got.indexOf(W.id) < 0) got.push(W.id); localStorage.setItem('philoBadges', JSON.stringify(got)); } catch (e) {}
      return add('<div class="badge" style="--pc:' + W.color + '"><div class="b-ava">' + W.emoji + '</div><span>철학자 카드 획득!</span><b>' + esc(W.name) + '</b><p>“' + esc(m[1]) + '”</p>' +
        '<small>퀴즈 ' + score + '개 통과 · ' + esc(W.tags.join(' · ')) + '</small></div>', 'sys');
    }
  }
  var score = 0;
  function next() {
    if (lock) return;
    if (i >= C.length) { log.innerHTML = ''; i = 0; score = 0; }
    var m = C[i++];
    if (m[0] === 'p' || m[0] === 'me') {
      lock = true;
      var t = add((m[0] === 'p' ? ava : '') + '<div class="bub typing"><i></i><i></i><i></i></div>', m[0] === 'p' ? 'them' : 'me');
      setTimeout(function () { t.remove(); lock = false; render(m); prog(); wait(false); }, m[0] === 'p' ? 450 : 250);
      return;
    }
    render(m); prog(); if (!lock) wait(false);
  }
  function prog() { bar.style.width = (i / C.length * 100) + '%'; }
  nextB.onclick = next;
  addEventListener('keydown', function (e) {
    if (/TEXTAREA|INPUT/.test(document.activeElement.tagName)) return;
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); next(); }
  });
  document.getElementById('all').onclick = function () {
    log.innerHTML = ''; i = 0; score = 0;
    C.forEach(function (m) { i++; var d = render(m); if (d && (m[0] === 'quiz' || m[0] === 'ox')) { d.classList.add('done'); d.querySelectorAll('.opts button')[m[0] === 'ox' ? (m[2] ? 0 : 1) : m[3]].classList.add('ok'); var w = d.querySelector('.why'); w.hidden = false; w.textContent = '💡 ' + (m[0] === 'ox' ? m[3] : m[4]); } });
    lock = false; prog(); wait(false); window.scrollTo(0, 0);
  };
  next();
})();

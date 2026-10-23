/* 수업 슬라이드 엔진 (역사 수업실과 같은 동작).
   → / 스페이스 / 클릭: 질문 하나씩, 다 나오면 다음 장.  ← / 화면 왼쪽 클릭: 되돌리기.
   N: 교사 메모   F: 전체 화면   주소 끝 #3: 3장부터 */
(function () {
  var S = Array.prototype.slice.call(document.querySelectorAll('.s')),
      bar = document.getElementById('bar'), hud = document.getElementById('hud'), notes = document.getElementById('notes'),
      i = 0;
  function load(s) {   // 사진은 보이는 장과 다음 장만 불러온다(원격 사진이 많아도 가볍게)
    if (!s) return;
    s.querySelectorAll('img[data-src]').forEach(function (im) {
      var p = im.closest('.ph');
      im.onerror = function () { if (p) p.classList.add('err'); };
      im.src = im.dataset.src; im.removeAttribute('data-src');
    });
  }
  function show(n) {
    i = Math.max(0, Math.min(S.length - 1, n));
    S.forEach(function (s, j) { s.classList.toggle('on', j === i); });
    load(S[i]); load(S[i + 1]);
    bar.style.width = ((i + 1) / S.length * 100) + '%';
    hud.textContent = (i + 1) + ' / ' + S.length;
    notes.innerHTML = S[i].dataset.note || '';
    try { history.replaceState(null, '', '#' + (i + 1)); } catch (e) {}
  }
  function next() { var f = S[i].querySelector('.f:not(.show)'); if (f) f.classList.add('show'); else show(i + 1); }
  function prev() { var sh = S[i].querySelectorAll('.f.show'); if (sh.length) sh[sh.length - 1].classList.remove('show'); else show(i - 1); }
  function toggleFS() {
    if (!document.fullscreenElement) { var d = document.documentElement; if (d.requestFullscreen) d.requestFullscreen().catch(function () {}); }
    else document.exitFullscreen();
  }
  addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (['ArrowRight', ' ', 'PageDown', 'Enter'].indexOf(e.key) > -1) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].indexOf(e.key) > -1) { e.preventDefault(); prev(); }
    else if (e.key === 'n' || e.key === 'N') notes.classList.toggle('on');
    else if (e.key === 'f' || e.key === 'F') toggleFS();
  });
  document.getElementById('deck').addEventListener('click', function (e) { if (e.target.closest('a,button,input,textarea')) return; (e.clientX < innerWidth * .25 ? prev : next)(); });
  document.getElementById('bN').onclick = function () { notes.classList.toggle('on'); };
  document.getElementById('bF').onclick = toggleFS;
  // 교사 잠금 서버(Cloudflare)에서만: 교사 기기는 이 슬라이드를 학생에게 공개/비공개, 학생은 발문 메모가 비어 있으니 단추를 숨김
  if (window.IS_TEACHER === false) { document.getElementById('bN').hidden = true; }
  if (window.ROLE === 'teacher') {
    var key = location.pathname.replace(/\.html$/, ''), pub = document.createElement('button'); pub.type = 'button';
    var mark = function (on) { pub.setAttribute('aria-pressed', String(on)); pub.textContent = on ? '학생 공개 중' : '학생 비공개'; };
    mark((window.OPEN_SLIDES || []).indexOf(key) > -1);
    pub.onclick = function () {
      var on = pub.getAttribute('aria-pressed') !== 'true'; pub.disabled = true;
      fetch('/teacher/slides', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slide: key, open: on }) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); mark(on); }); })
        .catch(function (e) { alert('공개 설정을 바꾸지 못했어요: ' + e.message); })
        .then(function () { pub.disabled = false; });
    };
    document.getElementById('bN').parentNode.insertBefore(pub, document.getElementById('bN'));
  }
  addEventListener('hashchange', function () { var n = +location.hash.slice(1); if (n && n - 1 !== i) show(n - 1); });
  show((+location.hash.slice(1) || 1) - 1);
})();

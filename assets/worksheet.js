/* 학습지 공통 동작: 예시 답 보기, 인쇄, 주소 끝 #4 → 4차시 면으로 이동, 사진이 없으면 자리 표시. */
(function () {
  var btn = document.getElementById('bAns');
  var label = btn && btn.textContent;   // ‘예시 답 보기’(학습지) 또는 ‘정답 보기’(문제)
  if (btn) btn.onclick = function () {
    var on = document.body.classList.toggle('show-ans');
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.textContent = on ? label.replace('보기', '숨기기') : label;
  };
  // 교사 잠금 서버에서 학생 화면이면 정답 단추 대신 교사 로그인 링크(정답은 서버가 이미 지움)
  if (window.IS_TEACHER === false) {
    if (btn) btn.remove();
    var tb = document.querySelector('.bar .tools'), a = document.createElement('a');
    if (tb) { a.href = '/teacher?next=' + encodeURIComponent(location.pathname + location.hash); a.textContent = '교사 로그인'; a.style.cssText = 'color:#fff;font-size:13px;align-self:center'; tb.insertBefore(a, tb.firstChild); }
  }
  var pr = document.getElementById('bPrint');
  if (pr) pr.onclick = function () { window.print(); };
  document.querySelectorAll('figure img').forEach(function (im) {
    var f = im.closest('figure');
    function bad() { f.classList.add('err'); }
    if (im.complete && !im.naturalWidth && im.src) bad(); else im.addEventListener('error', bad);
  });
  var h = location.hash.slice(1), el = h && (document.getElementById('l' + h + 'c') || document.getElementById('l' + h));   // 개념 채우기 면이 있으면 그 면부터
  if (el) el.scrollIntoView();
})();

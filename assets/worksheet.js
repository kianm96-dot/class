/* 학습지 공통 동작: 예시 답 보기, 인쇄, 주소 끝 #4 → 4차시 면으로 이동, 사진이 없으면 자리 표시. */
(function () {
  var btn = document.getElementById('bAns');
  if (btn) btn.onclick = function () {
    var on = document.body.classList.toggle('show-ans');
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.textContent = on ? '예시 답 숨기기' : '예시 답 보기';
  };
  var pr = document.getElementById('bPrint');
  if (pr) pr.onclick = function () { window.print(); };
  document.querySelectorAll('figure img').forEach(function (im) {
    var f = im.closest('figure');
    function bad() { f.classList.add('err'); }
    if (im.complete && !im.naturalWidth && im.src) bad(); else im.addEventListener('error', bad);
  });
  var h = location.hash.slice(1), el = h && document.getElementById('l' + h);
  if (el) el.scrollIntoView();
})();

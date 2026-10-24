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
  // 주소 끝 #3 → 3차시 면(개념 채우기 l3c · 활동 l3 · 추가 활동지 l3p)만 보이고 인쇄됨. 주소 끝이 없으면 단원 전체(‘단원 학습지 모아 인쇄’)
  var bar = document.querySelector('.bar'), all = document.querySelector('.bar .all');
  function only() {
    var h = location.hash.slice(1), re = new RegExp('^l' + h + '[cp]?$'), sheets = document.querySelectorAll('.sheet[id]');
    var hit = /^\d+$/.test(h) && [].some.call(sheets, function (x) { return re.test(x.id); });
    sheets.forEach(function (x) { x.hidden = hit && !re.test(x.id); });
    if (hit && !all && bar) { all = document.createElement('a'); all.className = 'all'; all.href = location.pathname; all.textContent = '단원 전체 보기'; bar.querySelector('.tools').insertBefore(all, bar.querySelector('.tools').firstChild); }
    if (all) all.hidden = !hit;
    var el = hit && (document.getElementById('l' + h + 'c') || document.getElementById('l' + h));   // 개념 채우기 면이 있으면 그 면부터
    if (el) el.scrollIntoView(); else if (hit === false && h) { var x = document.getElementById(h); if (x) x.scrollIntoView(); }
  }
  only();
  addEventListener('hashchange', only);
})();

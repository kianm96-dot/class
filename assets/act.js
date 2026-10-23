/* 활동 화면 공통: 주소 끝 #N → N차시 활동. 위쪽에 차시 이동 단추를 만든다. */
(function () {
  var P = Array.prototype.slice.call(document.querySelectorAll('.panel')), nav = document.getElementById('nav');
  nav.innerHTML = P.map(function (p) { return '<a href="#' + p.dataset.lesson + '">' + p.dataset.lesson + '차시</a>'; }).join('');
  function go() {
    var h = location.hash.slice(1) || P[0].dataset.lesson;
    P.forEach(function (p) { var on = p.dataset.lesson === h; p.classList.toggle('on', on); if (on && p.onShow) p.onShow(); });
    nav.querySelectorAll('a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + h); });
  }
  window.addEventListener('load', go);
  addEventListener('hashchange', go);
})();

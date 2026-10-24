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
  // 📥 내려받기 (교사·칠판, 또는 서버 없는 곳): HTML 한 파일(인터넷 없이도 클릭 진행 그대로, 사진까지 넣음) 또는 PDF(장마다 한 쪽, 빈칸 답까지 모두 펼침)
  if (window.IS_TEACHER !== false && location.protocol !== 'file:') {
    var dl = document.createElement('button'), menu = document.createElement('div'); dl.type = 'button'; dl.textContent = '📥 내려받기';
    menu.className = 'dlmenu'; menu.hidden = true;
    menu.innerHTML = '<button type="button" data-k="html">HTML 파일 <small>인터넷 없이도 클릭 진행 그대로</small></button><button type="button" data-k="pdf">PDF <small>인쇄 창에서 ‘PDF로 저장’ · 장마다 한 쪽</small></button>';
    dl.onclick = function () { menu.hidden = !menu.hidden; };
    menu.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; menu.hidden = true; (b.dataset.k === 'html' ? saveHtml : savePdf)(dl); };
    document.getElementById('bN').parentNode.insertBefore(dl, document.getElementById('bN'));
    document.getElementById('bN').parentNode.appendChild(menu);
  }
  var fileName = function (ext) { return (document.title.split(' · ').reverse().join(' ') || 'slides').replace(/[\\/:*?"<>|]/g, '') + ext; };
  function blobUrl(u) {   // 사진을 파일 안에 넣기(실패하면 원래 주소 그대로)
    return fetch(u).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (b) {
      return new Promise(function (ok) { var f = new FileReader(); f.onload = function () { ok(f.result); }; f.onerror = function () { ok(u); }; f.readAsDataURL(b); });
    }).catch(function () { return u; });
  }
  function saveHtml(btn) {
    var old = btn.textContent; btn.disabled = true; btn.textContent = '만드는 중…';
    fetch(location.pathname, { credentials: 'same-origin' }).then(function (r) { return r.text(); }).then(function (src) {
      var d = new DOMParser().parseFromString(src, 'text/html'), abs = function (u) { return new URL(u, location.href).href; }, jobs = [];
      d.querySelectorAll('script[src*="lessonbar"], link[rel="manifest"], #moral-board').forEach(function (x) { x.remove(); });
      d.querySelectorAll('a[href]').forEach(function (a) { if (!/^#/.test(a.getAttribute('href'))) a.href = abs(a.getAttribute('href')); });
      d.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach(function (l) { l.href = abs(l.getAttribute('href')); });
      d.querySelectorAll('link[rel="stylesheet"]').forEach(function (l) {
        var u = abs(l.getAttribute('href')); if (new URL(u).origin !== location.origin) return;
        jobs.push(fetch(u).then(function (r) { return r.text(); }).then(function (css) { var st = d.createElement('style'); st.textContent = css; l.replaceWith(st); }));
      });
      d.querySelectorAll('script[src]').forEach(function (sc) {
        var u = abs(sc.getAttribute('src'));
        jobs.push(fetch(u).then(function (r) { return r.text(); }).then(function (js) { var n = d.createElement('script'); n.textContent = js.replace(/<\/script/gi, '<\\/script'); sc.replaceWith(n); }));
      });
      d.querySelectorAll('img').forEach(function (im) {
        var u = im.getAttribute('data-src') || im.getAttribute('src'); if (!u || /^data:/.test(u)) return;
        jobs.push(blobUrl(abs(u)).then(function (v) { im.setAttribute(im.hasAttribute('data-src') ? 'data-src' : 'src', v); }));
      });
      return Promise.all(jobs).then(function () {
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['<!doctype html>\n' + d.documentElement.outerHTML], { type: 'text/html' }));
        a.download = fileName('.html'); document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      });
    }).catch(function (e) { alert('내려받지 못했어요: ' + (e && e.message || e)); })
      .then(function () { btn.disabled = false; btn.textContent = old; });
  }
  function savePdf(btn) {
    var old = btn.textContent; btn.disabled = true; btn.textContent = '사진 불러오는 중…';
    S.forEach(load);
    var imgs = [].slice.call(document.querySelectorAll('.s img'));
    Promise.all(imgs.map(function (im) { return im.complete ? 0 : new Promise(function (ok) { im.addEventListener('load', ok); im.addEventListener('error', ok); setTimeout(ok, 8000); }); })).then(function () {
      btn.disabled = false; btn.textContent = old;
      var t = document.title, hid = [].slice.call(document.querySelectorAll('.s .f:not(.show)'));
      hid.forEach(function (f) { f.classList.add('show'); });   // 하나씩 나오던 질문·빈칸 답을 모두 펼쳐서 인쇄
      addEventListener('afterprint', function back() { removeEventListener('afterprint', back); hid.forEach(function (f) { f.classList.remove('show'); }); document.title = t; });
      document.title = fileName('').replace(/\.$/, '');
      window.print();
    });
  }
  addEventListener('hashchange', function () { var n = +location.hash.slice(1); if (n && n - 1 !== i) show(n - 1); });
  show((+location.hash.slice(1) || 1) - 1);
})();

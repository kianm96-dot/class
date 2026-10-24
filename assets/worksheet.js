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

  /* ✏️ 고치기 (교사 로그인, 또는 서버 없는 곳): 보이는 면의 글자를 눌러 바로 고치고 [저장].
     서버(Cloudflare)에서는 고친 면을 저장해 모든 기기에 보이고, 학생에게는 예시 답을 뺀 면이 갑니다. 서버가 없으면 이 브라우저에만 저장.
     [원래대로]는 보이는 면의 고친 내용을 지우고 처음 학습지로. */
  var R = window.ROLE, LOCAL = !R, path = location.pathname.replace(/\.html$/, ''), LKEY = 'wsedit:' + path;
  if (!document.querySelector('.sheet[id]') || !(R === 'teacher' || LOCAL)) return;
  var edited = window.WS_EDITED || [];
  if (LOCAL) { try { var mine = JSON.parse(localStorage.getItem(LKEY) || '{}'); Object.keys(mine).forEach(function (id) { var el = document.getElementById(id); if (el) el.innerHTML = mine[id].t; }); edited = Object.keys(mine); } catch (e) {} }
  var tools = bar.querySelector('.tools'), mk = function (txt, cls) { var b = document.createElement('button'); b.type = 'button'; b.textContent = txt; if (cls) b.className = cls; return b; };
  var bEdit = mk('✏️ 고치기'), bSave = mk('💾 저장', 'em'), bCancel = mk('취소'), bReset = mk('원래대로'), before = {}, wasAns;
  [bSave, bCancel, bReset].forEach(function (b) { b.hidden = true; });
  tools.insertBefore(bReset, tools.firstChild); tools.insertBefore(bCancel, tools.firstChild); tools.insertBefore(bSave, tools.firstChild); tools.insertBefore(bEdit, tools.firstChild);
  var shown = function () { return [].filter.call(document.querySelectorAll('.sheet[id]'), function (x) { return !x.hidden; }); };
  function marks() { document.querySelectorAll('.sheet[id]').forEach(function (x) { x.classList.toggle('edited', edited.indexOf(x.id) > -1); }); }
  marks();
  function mode(on) {
    document.body.classList.toggle('editing', on);
    bEdit.hidden = on; bSave.hidden = bCancel.hidden = !on;
    bReset.hidden = !on || !shown().some(function (x) { return edited.indexOf(x.id) > -1; });
    if (btn) btn.hidden = on;
    if (on) { wasAns = document.body.classList.contains('show-ans'); document.body.classList.add('show-ans'); }   // 예시 답도 고칠 수 있게 펼침
    else if (!wasAns) document.body.classList.remove('show-ans');
    shown().forEach(function (x) { if (on) { before[x.id] = x.innerHTML; x.contentEditable = 'true'; } else x.removeAttribute('contenteditable'); });
  }
  bEdit.onclick = function () { mode(true); var f = shown()[0]; if (f) f.focus(); };
  bCancel.onclick = function () { shown().forEach(function (x) { if (x.id in before) x.innerHTML = before[x.id]; }); mode(false); };
  function send(body) {
    if (LOCAL) {
      var m = {}; try { m = JSON.parse(localStorage.getItem(LKEY) || '{}'); } catch (e) {}
      Object.keys(body.sheets || {}).forEach(function (id) { m[id] = body.sheets[id]; }); (body.drop || []).forEach(function (id) { delete m[id]; });
      try { localStorage.setItem(LKEY, JSON.stringify(m)); } catch (e) { return Promise.reject(new Error('브라우저 저장 공간이 모자라요')); }
      return Promise.resolve(Object.keys(m));
    }
    return fetch('/teacher/wsedit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); return j.edited; }); });
  }
  bSave.onclick = function () {
    var sheets = {};
    shown().forEach(function (x) {
      if (before[x.id] === x.innerHTML) return;
      var c = x.cloneNode(true); c.removeAttribute('contenteditable');
      var t = c.innerHTML; c.querySelectorAll('.ans').forEach(function (a) { a.remove(); });   // 학생용: 예시 답 뺌
      sheets[x.id] = { t: t, s: c.innerHTML };
    });
    if (!Object.keys(sheets).length) return mode(false);
    bSave.disabled = true; bSave.textContent = '저장하는 중…';
    send({ path: path, sheets: sheets }).then(function (e) { edited = e; marks(); mode(false); })
      .catch(function (e) { alert('저장하지 못했어요: ' + e.message); })
      .then(function () { bSave.disabled = false; bSave.textContent = '💾 저장'; });
  };
  bReset.onclick = function () {
    var ids = shown().map(function (x) { return x.id; }).filter(function (id) { return edited.indexOf(id) > -1; });
    if (!ids.length || !confirm('이 면에서 고친 내용을 모두 지우고 처음 학습지로 돌릴까요?')) return;
    send({ path: path, drop: ids }).then(function () { location.reload(); }).catch(function (e) { alert('되돌리지 못했어요: ' + e.message); });
  };
})();

/* 도덕 수업실 · 교사 잠금 + 전자칠판 수업 모드 (Cloudflare Workers, 설정은 wrangler.jsonc). 과학 실험실과 같은 구조.
   모든 요청이 이 코드를 먼저 거친 뒤 사이트 파일(env.ASSETS)을 받아 옵니다.
   비밀번호는 코드에 적지 않습니다. Cloudflare 대시보드 → moral → Settings → Build → Variables and secrets 에
   TEACHER_PASSWORD (Secret)로 넣고 다시 배포하세요. (워커 실행 변수에 넣어도 됩니다.)
   비밀번호를 바꾸면 기존 교사 로그인은 모두 풀립니다.

   역할은 세 가지입니다.
   - teacher: 선생님 개인 기기. 비밀번호로 로그인, 30일 유지. 슬라이드 학생 공개 같은 관리 기능까지 사용.
   - board  : 전자칠판. 칠판에 뜬 QR을 교사 폰으로 찍어 승인하면 열림. 50분 또는 10분 동안 조작이 없으면 자동으로 닫힘.
              수업 기능(슬라이드, 정답 보기, 골든벨 진행, 수업 진행 도구)만 쓰고 관리 기능은 없음. 칠판에 비밀번호를 치지 않음.
   - student: 그 밖의 모든 기기.

   학생에게는 서버에서 아래를 지운 뒤 페이지를 보냅니다. 페이지 소스를 열어도 보이지 않습니다.
   - 학습지·차시별 문제: 예시 답·정답·해설·빠른 정답표(.ans), [예시 답 보기]/[정답 보기] 단추(#bAns)
   - 교과서 수업 PPT(<책>/<단원>/pptN.pptx): 교사·칠판만 받음, 학생은 교사 로그인으로.
     ▶ 재생(/ppt/view)은 PowerPoint 웹 뷰어로 열고, 뷰어가 가져갈 수 있게 4시간짜리 서명 주소(/ppt-file/…)를 만듦
   - 수업 슬라이드(slidesN.html, 선생님이 학생 공개한 것 제외), 수업 진행 도구(tools/class.html): 로그인 화면으로 보냄
   - 슬라이드 발문 메모(data-note)
   골든벨 '교사 진행' 모드는 화면에서 숨깁니다(window.IS_TEACHER).

   선생님이 올린 수업 PPT(/teacher/ppt): 차시마다 하나. 올리면 그 차시의 ▶ 재생·📥 받기가 올린 파일로 바뀌고, [되돌리기]로 원래 파일로.
   반별 진도(/teacher/progress): 반 목록, 반마다 끝낸 차시·지난 시간 어디까지·지금 수업 중인 차시. 교사·칠판 어디서 기록해도 같이 보임. */

import {DurableObject} from 'cloudflare:workers';
import {TEACHER_TOKEN} from './.teacher.js';   // 배포 때 build-teacher.mjs가 만듦

const COOKIE = 'moral_teacher', BOARD = 'moral_board', PAIR = 'moral_pair';
const MAX_AGE = 60 * 60 * 24 * 30;          // 교사 기기: 30일
const BOARD_MAX = 50 * 60 * 1000;           // 칠판: 한 번 열면 최대 50분(수업 1차시)
const BOARD_IDLE = 10 * 60 * 1000;          // 칠판: 10분 동안 조작이 없으면 닫힘
const PAIR_TTL = 2 * 60 * 1000;             // QR: 2분 동안만 유효, 한 번만 사용
const TEACHER_ONLY = [/^\/tools\/class(\.html)?$/];   // 수업 진행 도구
const SLIDE = /^(\/m[12]\/[a-z]+\/slides\d+)(?:\.html)?$/;
const PPT = /^\/m[12]\/[a-z]+\/ppt\d+\.pptx$/;    // 교과서 수업 PPT
const PPT_MAX = 25 * 1024 * 1024, PPT_CHUNK = 1024 * 1024;   // 올리는 PPT: 25MB까지, 저장소에는 1MB씩 나눠 저장
const PPT_TTL = 4 * 60 * 60 * 1000;          // 화면에서 재생할 때 쓰는 임시 주소: 4시간     // 수업 슬라이드: 교사 전용, 단 선생님이 '학생 공개'로 연 것은 학생도 볼 수 있음

/* 저장소 (Cloudflare Durable Object, 설정은 wrangler.jsonc)
   - openSlides: 학생에게 공개한 슬라이드 목록
   - pair:<코드>: 칠판 QR (누가 승인했는지, 칠판 확인용 비밀값의 지문)
   - sess:<지문>: 열린 칠판 세션 (시작 시각, 마지막 조작 시각)
   - pptm:<파일 주소>, pptc:<파일 주소>:<번호>: 선생님이 올린 수업 PPT (이름·크기·시각, 1MB 조각들)
   - progress: 반 목록과 반별 진도 */
export class Settings extends DurableObject {
  async getOpen() { return (await this.ctx.storage.get('openSlides')) || []; }
  async setOpen(key, open) {
    const s = new Set(await this.getOpen()); open ? s.add(key) : s.delete(key);
    const a = [...s].sort(); await this.ctx.storage.put('openSlides', a); return a;
  }

  async sweep(prefix, dead) {
    const all = await this.ctx.storage.list({prefix});
    const gone = [...all].filter(([, v]) => dead(v)).map(([k]) => k);
    if (gone.length) await this.ctx.storage.delete(gone);
  }
  async createPair(code, secretHash) {
    const now = Date.now();
    await this.sweep('pair:', v => now - v.t > PAIR_TTL);
    await this.ctx.storage.put('pair:' + code, {t: now, s: secretHash, ok: false});
  }
  async peekPair(code) {
    const p = await this.ctx.storage.get('pair:' + code);
    if (!p || Date.now() - p.t > PAIR_TTL) return 'expired';
    return p.ok ? 'approved' : 'pending';
  }
  async approvePair(code) {
    const p = await this.ctx.storage.get('pair:' + code);
    if (!p || Date.now() - p.t > PAIR_TTL || p.ok) return false;
    p.ok = true; await this.ctx.storage.put('pair:' + code, p); return true;
  }
  // 칠판이 QR 승인 결과를 받아 감: 같은 칠판(비밀값 일치)이어야 하고 한 번만 가능
  async claimPair(code, secretHash, sessHash) {
    const p = await this.ctx.storage.get('pair:' + code);
    if (!p || Date.now() - p.t > PAIR_TTL) return 'expired';
    if (p.s !== secretHash) return 'expired';
    if (!p.ok) return 'pending';
    await this.ctx.storage.delete('pair:' + code);
    const now = Date.now();
    await this.sweep('sess:', v => now - v.c > BOARD_MAX || now - v.l > BOARD_IDLE);
    await this.ctx.storage.put('sess:' + sessHash, {c: now, l: now});
    return 'ok';
  }
  // 칠판 세션 확인. touch면 마지막 조작 시각을 갱신(30초에 한 번만 기록)
  async checkSession(sessHash, touch) {
    const k = 'sess:' + sessHash, v = await this.ctx.storage.get(k);
    if (!v) return null;
    const now = Date.now();
    if (now - v.c > BOARD_MAX || now - v.l > BOARD_IDLE) { await this.ctx.storage.delete(k); return null; }
    if (touch && now - v.l > 30000) { v.l = now; await this.ctx.storage.put(k, v); }
    return {ends: v.c + BOARD_MAX};
  }
  async endSession(sessHash) { await this.ctx.storage.delete('sess:' + sessHash); }

  async listPpts() {
    const out = {};
    for (const [k, v] of await this.ctx.storage.list({prefix: 'pptm:'})) out[k.slice(5)] = v;
    return out;
  }
  async putPpt(f, meta, chunks) {
    await this.delPpt(f);
    for (let i = 0; i < chunks.length; i++) await this.ctx.storage.put('pptc:' + f + ':' + i, chunks[i]);
    await this.ctx.storage.put('pptm:' + f, {...meta, n: chunks.length});
    return this.listPpts();
  }
  async getPpt(f) {
    const m = await this.ctx.storage.get('pptm:' + f);
    if (!m) return null;
    const got = await this.ctx.storage.get([...Array(m.n).keys()].map(i => 'pptc:' + f + ':' + i));
    return [...Array(m.n).keys()].map(i => got.get('pptc:' + f + ':' + i));
  }
  async delPpt(f) {
    const m = await this.ctx.storage.get('pptm:' + f);
    if (m) await this.ctx.storage.delete(['pptm:' + f, ...[...Array(m.n).keys()].map(i => 'pptc:' + f + ':' + i)]);
    return this.listPpts();
  }

  async getProgress() { return (await this.ctx.storage.get('progress')) || {classes: [], rec: {}}; }
  async setProgress(op) {
    const p = await this.getProgress();
    if (op.classes) { p.classes = op.classes; const ids = op.classes.map(c => c.id); for (const id of Object.keys(p.rec)) if (!ids.includes(id)) delete p.rec[id]; }
    if (op.id) p.rec[op.id] = op.rec;
    await this.ctx.storage.put('progress', p); return p;
  }
}
const store = env => env.SETTINGS ? env.SETTINGS.get(env.SETTINGS.idFromName('main')) : null;
async function openSlides(env) { try { const s = store(env); return s ? await s.getOpen() : []; } catch (e) { return []; } }
async function myPpts(env) { try { const s = store(env); return s ? await s.listPpts() : {}; } catch (e) { return {}; } }
// 수업 PPT 파일: 선생님이 올린 것이 있으면 그것, 없으면 사이트에 있는 원래 파일
async function pptFile(env, origin, f) {
  const s = store(env), up = s && await s.getPpt(f).catch(() => null);
  if (up) return new Response(new Blob(up), {headers: {'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'}});
  return env.ASSETS.fetch(new Request(origin + f));
}

export default {
  fetch(request, env) { return handle(request, env); }
};

const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), {status, headers: {'content-type': 'application/json', 'Cache-Control': 'no-store', ...extra}});
const redirect = (to, cookie) => new Response(null, {status: 302, headers: {Location: to, 'Cache-Control': 'no-store', ...(cookie ? {'Set-Cookie': cookie} : {})}});
const clear = name => `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
const sameOrigin = (request, url) => { const o = request.headers.get('origin'); return !o || o === url.origin; };

async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/teacher' || path === '/teacher/') return loginRoute(request, env, url);
  if (path === '/teacher/logout') return redirect('/', clear(COOKIE));
  if (path.startsWith('/board')) return boardRoute(request, env, url);
  if (path === '/pair') return pairRoute(request, env, url);

  // PPT 재생용 임시 주소: PowerPoint 웹 뷰어(Microsoft 서버)가 로그인 없이 파일을 가져가도록, 교사가 ▶를 누를 때 만든 서명 주소만 받음
  const pf = path.match(/^\/ppt-file\/(\d+)\/([0-9a-f]{32})(\/.+)$/);
  if (pf) {
    const [, exp, sig, f] = pf;
    if (!PPT.test(f) || +exp < Date.now() || !(await expected(env)) || !same(sig, await pptSig(env, f, exp))) return new Response('만료된 주소예요. 수업실에서 ▶를 다시 눌러 주세요.', {status: 403});
    const r = await pptFile(env, url.origin, f), h = new Headers(r.headers);
    h.set('Cache-Control', 'private, no-store'); h.set('X-Robots-Tag', 'noindex');
    h.set('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    return new Response(r.body, {status: r.status, headers: h});
  }

  // css·js·그림 같은 파일은 역할 확인 없이 바로 보냄
  const isFile = /\.[a-z0-9]+$/i.test(path) && !path.endsWith('.html');
  const isPpt = /\.pptx$/i.test(path);   // 교과서 수업 PPT(출판사 자료 + 새 장)는 교사·칠판만
  if (isFile && !isPpt) return env.ASSETS.fetch(request);

  const role = await getRole(request, env, true);
  if (path === '/teacher/slides') return slidesApi(request, env, url, role);
  if (path === '/teacher/ppt') return pptApi(request, env, url, role);
  if (path === '/teacher/progress') return progressApi(request, env, url, role);
  const can = role !== 'student';
  if (path === '/ppt/view') {   // ▶ 수업 PPT: 교사·칠판만, PowerPoint 웹 뷰어로 화면에서 재생
    const f = url.searchParams.get('f') || '';
    if (!can) return redirect('/teacher?next=' + encodeURIComponent(path + url.search));
    if (!PPT.test(f)) return redirect('/');
    const exp = String(Date.now() + PPT_TTL);
    return pptPage(f, `${url.origin}/ppt-file/${exp}/${await pptSig(env, f, exp)}${f}`, role === 'board' ? await boardInfo(request, env) : null);
  }
  if (isPpt) {
    if (!can) return redirect('/teacher?next=' + encodeURIComponent(path));
    const r = await pptFile(env, url.origin, path), h = new Headers(r.headers);
    h.set('Cache-Control', 'private, no-store'); h.set('x-moral-role', role);   // 서비스 워커·중간 캐시가 저장하지 않도록
    return new Response(r.body, {status: r.status, headers: h});
  }
  const slide = path.match(SLIDE);
  if (!can && (TEACHER_ONLY.some(r => r.test(path)) || (slide && !(await openSlides(env)).includes(slide[1])))) {
    return redirect('/teacher?next=' + encodeURIComponent(path + url.search));
  }

  // 화면(HTML)은 역할마다 내용이 달라서, 브라우저에 남은 예전 화면(304 응답)을 쓰지 않도록 조건부 요청 머리글을 지움
  const fresh = new Headers(request.headers); fresh.delete('if-none-match'); fresh.delete('if-modified-since');
  const res = await env.ASSETS.fetch(new Request(request.url, {method: request.method, headers: fresh, redirect: 'manual'}));
  const type = res.headers.get('content-type') || '';
  if (!type.includes('text/html')) return res;

  const headers = new Headers(res.headers);
  headers.delete('etag'); headers.delete('last-modified');
  headers.set('Cache-Control', 'private, no-store');
  headers.append('Vary', 'Cookie');
  headers.set('x-moral-role', role);     // 서비스 워커가 교사·칠판 화면을 저장하지 않도록
  let out = new Response(res.body, {status: res.status, statusText: res.statusText, headers});

  // 학생 공개한 슬라이드 목록: 첫 화면과 ‘이 차시 자료’ 막대가 학생에게 보여 줄 슬라이드를 고를 때 씀
  const extra = `window.OPEN_SLIDES=${JSON.stringify(await openSlides(env))};` + (can ? `window.MY_PPT=${JSON.stringify(await myPpts(env))};` : '');
  const board = role === 'board' ? await boardInfo(request, env) : null;
  let rw = new HTMLRewriter().on('head', {element(e) {
    e.prepend(`<script>window.IS_TEACHER=${can};window.ROLE=${JSON.stringify(role)};${extra}</script>`, {html: true});
  }});
  if (board) rw = rw.on('body', {element(e) { e.append(boardBar(board.ends), {html: true}); }});
  if (!can) {
    rw = rw
      .on('.ans', {element(e) { e.remove(); }})                                 // 예시 답·정답·해설 (빈칸 밑줄은 .blank 가 너비를 지킴)
      .on('#bAns', {element(e) { e.remove(); }})
      .on('[data-note]', {element(e) { e.removeAttribute('data-note'); }});   // 슬라이드 발문 메모
  }
  return rw.transform(out);
}

/* ───────── 역할 확인 ───────── */
function cookie(request, name, re) {
  const m = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${name}=(${re})`));
  return m ? m[1] : null;
}
async function getRole(request, env, touch) {
  if (await checkCookie(request, env)) return 'teacher';
  if (await boardInfo(request, env, touch)) return 'board';
  return 'student';
}
async function boardInfo(request, env, touch) {
  const raw = cookie(request, BOARD, '[A-Za-z0-9_-]{32,64}'); const s = store(env);
  if (!raw || !s) return null;
  try { return await s.checkSession(await hash('board|' + raw), !!touch); } catch (e) { return null; }
}
const rand = () => { const b = new Uint8Array(24); crypto.getRandomValues(b); return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };

/* ───────── 칠판: QR 띄우기, 승인 확인, 조작 신호, 수업 끝 ───────── */
async function boardRoute(request, env, url) {
  const path = url.pathname, s = store(env);
  if (!s) return json({error: '저장소가 아직 준비되지 않았어요.'}, 503);

  if (path === '/board' || path === '/board/') {
    const next = safeNext(url.searchParams.get('next'));
    if (await boardInfo(request, env)) return redirect(next);
    return boardPage(next);
  }
  if (!sameOrigin(request, url)) return json({error: 'origin'}, 403);

  if (path === '/board/start' && request.method === 'POST') {
    const code = rand(), secret = rand();
    await s.createPair(code, await hash('pair|' + secret));
    return json({code, url: `${url.origin}/pair?c=${code}`, ttl: PAIR_TTL},
      200, {'Set-Cookie': `${PAIR}=${secret}; Path=/board; Max-Age=${PAIR_TTL / 1000}; HttpOnly; Secure; SameSite=Strict`});
  }
  if (path === '/board/status') {
    const code = String(url.searchParams.get('c') || ''), secret = cookie(request, PAIR, '[A-Za-z0-9_-]{20,64}');
    if (!secret || !/^[A-Za-z0-9_-]{20,64}$/.test(code)) return json({state: 'expired'});
    const sess = rand();
    const state = await s.claimPair(code, await hash('pair|' + secret), await hash('board|' + sess));
    if (state !== 'ok') return json({state});
    const h = new Headers({'content-type': 'application/json', 'Cache-Control': 'no-store'});
    h.append('Set-Cookie', `${BOARD}=${sess}; Path=/; Max-Age=${BOARD_MAX / 1000}; HttpOnly; Secure; SameSite=Lax`);
    h.append('Set-Cookie', `${PAIR}=; Path=/board; Max-Age=0; HttpOnly; Secure; SameSite=Strict`);
    return new Response(JSON.stringify({state: 'ok'}), {headers: h});
  }
  if (path === '/board/ping' && request.method === 'POST') {
    const b = await boardInfo(request, env, true);
    return b ? json({ends: b.ends}) : json({state: 'ended'}, 401);
  }
  if (path === '/board/end') {
    const raw = cookie(request, BOARD, '[A-Za-z0-9_-]{32,64}');
    if (raw) await s.endSession(await hash('board|' + raw));
    return request.method === 'POST' ? json({state: 'ended'}, 200, {'Set-Cookie': clear(BOARD)}) : redirect('/', clear(BOARD));
  }
  return json({error: 'not found'}, 404);
}

/* ───────── 교사 폰: QR을 찍으면 열리는 승인 화면 ───────── */
async function pairRoute(request, env, url) {
  const code = String(url.searchParams.get('c') || '');
  const self = '/pair?c=' + encodeURIComponent(code);
  if (!(await checkCookie(request, env))) return redirect('/teacher?next=' + encodeURIComponent(self));
  const s = store(env);
  const valid = /^[A-Za-z0-9_-]{20,64}$/.test(code) && s;
  if (request.method === 'POST') {
    if (!sameOrigin(request, url)) return json({error: 'origin'}, 403);
    const ok = valid && await s.approvePair(code);
    return shell('칠판 열기', ok
      ? `<div class="big ok" aria-hidden="true">✓</div><h1>칠판이 열렸어요</h1><p class="d">칠판 화면이 곧 수업 모드로 바뀌어요. 50분이 지나거나 10분 동안 아무도 만지지 않으면 자동으로 닫혀요.</p><a class="out" href="/">이 폰은 메인 화면으로</a>`
      : expiredBody());
  }
  const st = valid ? await s.peekPair(code) : 'expired';
  if (st !== 'pending') return shell('칠판 열기', st === 'approved' ? `<h1>이미 열린 칠판이에요</h1><p class="d">이 QR은 한 번만 쓸 수 있어요.</p><a class="out" href="/">메인 화면으로</a>` : expiredBody());
  return shell('칠판 열기', `<h1>이 칠판을 열까요?</h1>
    <p class="d">칠판에서 수업 슬라이드, 학습지 예시 답, 문제 정답, 골든벨 진행, 수업 진행 도구를 쓸 수 있게 돼요. 슬라이드 학생 공개 설정은 칠판에 나오지 않아요.</p>
    <ul class="facts"><li>최대 50분 동안 열려요</li><li>10분 동안 아무도 만지지 않으면 닫혀요</li><li>칠판의 <b>수업 끝</b> 버튼으로 바로 닫을 수 있어요</li></ul>
    <form method="post" action="${esc(self)}"><button type="submit">칠판 열기</button></form>
    <a class="out" href="/">열지 않고 닫기</a>`);
}
const expiredBody = () => `<h1>QR이 만료됐어요</h1><p class="d">QR은 2분 동안 한 번만 쓸 수 있어요. 칠판에서 <b>새 QR</b>을 눌러 다시 찍어 주세요.</p><a class="out" href="/">메인 화면으로</a>`;

/* ───────── 슬라이드 학생 공개 켜기/끄기 (교사 기기만). POST {slide: '/m2/society/slides1', open: true} ───────── */
async function slidesApi(request, env, url, role) {
  if (role !== 'teacher') return json({error: '선생님 기기에서 교사 로그인을 해야 바꿀 수 있어요.'}, 401);
  if (request.method === 'GET') return json({open: await openSlides(env)});
  if (request.method !== 'POST') return json({error: 'method'}, 405);
  if (!sameOrigin(request, url)) return json({error: 'origin'}, 403);
  const s = store(env); if (!s) return json({error: '저장소가 아직 준비되지 않았어요.'}, 503);
  let body; try { body = await request.json(); } catch (e) { return json({error: 'body'}, 400); }
  const m = String(body.slide || '').match(SLIDE);
  if (!m) return json({error: '슬라이드 주소가 아니에요.'}, 400);
  return json({open: await s.setOpen(m[1], !!body.open)});
}

/* ───────── 선생님이 수업 PPT 올리기 (교사 기기만)
   POST /teacher/ppt?f=/m1/self/ppt1.pptx  본문 = 파일 그대로, 머리글 x-name = 원래 파일 이름(encodeURIComponent)
   DELETE 같은 주소 → 올린 파일 지우고 원래 PPT로 ───────── */
async function pptApi(request, env, url, role) {
  if (role !== 'teacher') return json({error: '선생님 기기에서 교사 로그인을 해야 올릴 수 있어요.'}, 401);
  if (!sameOrigin(request, url)) return json({error: 'origin'}, 403);
  const s = store(env); if (!s) return json({error: '저장소가 아직 준비되지 않았어요.'}, 503);
  const f = url.searchParams.get('f') || '';
  if (!PPT.test(f)) return json({error: '차시 PPT 주소가 아니에요.'}, 400);
  if (request.method === 'DELETE') return json({mine: await s.delPpt(f)});
  if (request.method !== 'POST') return json({error: 'method'}, 405);
  const buf = new Uint8Array(await request.arrayBuffer());
  if (!buf.length) return json({error: '빈 파일이에요.'}, 400);
  if (buf.length > PPT_MAX) return json({error: '25MB보다 큰 파일은 올릴 수 없어요. 그림을 압축해서 다시 올려 주세요.'}, 413);
  if (buf[0] !== 0x50 || buf[1] !== 0x4b) return json({error: 'PowerPoint(.pptx) 파일이 아니에요. .ppt는 PowerPoint에서 .pptx로 저장한 뒤 올려 주세요.'}, 400);
  let name = 'PPT.pptx'; try { name = decodeURIComponent(request.headers.get('x-name') || '') || name; } catch (e) {}
  const chunks = []; for (let i = 0; i < buf.length; i += PPT_CHUNK) chunks.push(buf.slice(i, i + PPT_CHUNK));
  return json({mine: await s.putPpt(f, {name: name.slice(0, 120), size: buf.length, t: Date.now()}, chunks)});
}

/* ───────── 반별 진도 (교사·칠판). GET → {classes, rec}
   POST {classes: [{id, name, book}]} 반 목록 바꾸기 · POST {id, rec: {done, last, now}} 한 반의 진도 바꾸기 ───────── */
async function progressApi(request, env, url, role) {
  if (role === 'student') return json({error: '교사 로그인(또는 QR로 연 칠판)에서만 쓸 수 있어요.'}, 401);
  const s = store(env); if (!s) return json({error: '저장소가 아직 준비되지 않았어요.'}, 503);
  if (request.method === 'GET') return json(await s.getProgress());
  if (request.method !== 'POST') return json({error: 'method'}, 405);
  if (!sameOrigin(request, url)) return json({error: 'origin'}, 403);
  const text = await request.text();
  if (text.length > 200000) return json({error: '너무 커요.'}, 413);
  let b; try { b = JSON.parse(text); } catch (e) { return json({error: 'body'}, 400); }
  const op = {};
  if (Array.isArray(b.classes)) op.classes = b.classes.slice(0, 40).map(c => ({id: String(c.id).slice(0, 40), name: String(c.name).slice(0, 20), book: c.book === 'm2' ? 'm2' : 'm1'}));
  if (typeof b.id === 'string' && b.rec && typeof b.rec === 'object') { op.id = b.id.slice(0, 40); op.rec = b.rec; }
  if (!op.classes && !op.id) return json({error: 'body'}, 400);
  return json(await s.setProgress(op));
}

/* ───────── 교사 비밀번호 ───────── */
async function pptSig(env, f, exp) { return (await hash('ppt|' + (await expected(env)) + '|' + f + '|' + exp)).slice(0, 32); }

/* ───────── 수업 PPT 재생 화면: 위쪽 얇은 막대 + PowerPoint 웹 뷰어(애니메이션·맑은 고딕 그대로) ───────── */
function pptPage(f, src, board) {
  const [, book, unit, n] = f.match(/^\/(m[12])\/([a-z]+)\/ppt(\d+)/);
  const view = 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(src);
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>수업 PPT · ${n}차시 · 도덕 수업실</title><meta name="robots" content="noindex"><link rel="icon" type="image/png" href="/icons/icon-192.png">
<style>html,body{margin:0;height:100%;background:#1d1a19;font:14px "Gowun Dodum","Malgun Gothic",sans-serif}
.top{height:40px;display:flex;align-items:center;gap:8px;padding:0 10px;background:#2b211e;color:#fff}
.top a,.top button{color:#fff;text-decoration:none;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:4px 12px;background:none;font:inherit;cursor:pointer}
.top .sp{flex:1}.top small{opacity:.7}
#wrap{position:absolute;top:40px;left:0;right:0;bottom:0}#wrap iframe{width:100%;height:100%;border:0;display:block;background:#fff}
#wrap:fullscreen{top:0}</style></head><body>
<div class="top"><a href="/#${book}">← 목록</a><b>${book === 'm1' ? '도덕①' : '도덕②'} · ${n}차시 수업 PPT</b><small>클릭(또는 →)으로 빈칸이 하나씩 채워져요</small><span class="sp"></span>
<a href="/?end=1#${book}" title="반별 진도에 어디까지 했는지 적어요">수업 끝 · 진도 기록</a><button type="button" id="fs">전체 화면</button><a href="/${book}/${unit}/slides${n}.html">웹 슬라이드</a><a href="${esc(f)}" download>📥 내려받기</a></div>
<div id="wrap"><iframe src="${esc(view)}" allowfullscreen title="수업 PPT"></iframe></div>
<script>document.getElementById('fs').onclick=function(){var w=document.getElementById('wrap');(w.requestFullscreen||w.webkitRequestFullscreen).call(w);};</script>
${board ? boardBar(board.ends) : ''}</body></html>`;
  return new Response(html, {headers: {'content-type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'x-moral-role': board ? 'board' : 'teacher'}});
}

async function hash(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const token = pw => hash(pw + '|moral-teacher-v1');

// 정답 지문: 실행 변수(env.TEACHER_PASSWORD)가 있으면 그것, 없으면 배포 때 만든 지문
async function expected(env) { return env.TEACHER_PASSWORD ? token(env.TEACHER_PASSWORD) : TEACHER_TOKEN; }

async function checkCookie(request, env) {
  const exp = await expected(env); if (!exp) return false;
  const v = cookie(request, COOKIE, '[0-9a-f]{64}');
  return !!v && same(v, exp);
}
function same(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

function safeNext(n) { return n && n.startsWith('/') && !n.startsWith('//') && !/^\/(teacher|board)/.test(n) ? n : '/'; }

async function loginRoute(request, env, url) {
  const next = safeNext(url.searchParams.get('next'));
  if (!(await expected(env))) return loginPage('교사 비밀번호가 아직 설정되지 않았어요. Cloudflare Build 설정에 TEACHER_PASSWORD를 넣고 다시 배포해 주세요.', next, true);
  if (request.method === 'POST') {
    const form = await request.formData();
    const pw = String(form.get('pw') || '');
    const to = safeNext(String(form.get('next') || '/'));
    if (pw && same(await token(pw), await expected(env))) {
      return new Response(null, {status: 303, headers: {Location: to, 'Set-Cookie': `${COOKIE}=${await token(pw)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`, 'Cache-Control': 'no-store'}});
    }
    await new Promise(r => setTimeout(r, 800));
    return loginPage('비밀번호가 맞지 않아요. 다시 입력해 주세요.', to);
  }
  if (await checkCookie(request, env)) return loginPage(null, next, false, true);
  return loginPage(null, next);
}

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c])); }

function loginPage(msg, next, disabled, already) {
  const isPair = next.startsWith('/pair');
  const body = already
    ? `<h1>교사 모드로 들어와 있어요</h1><p class="d">학습지 예시 답, 문제 정답, 수업 슬라이드, 골든벨 진행, 수업 진행 도구를 쓸 수 있어요. 이 기기에서 30일 동안 유지돼요.</p>
       <a class="go" href="${esc(next)}">계속하기</a><a class="out" href="/teacher/logout">교사 모드 끝내기</a>`
    : `<h1>${isPair ? '칠판을 열려면 먼저 로그인' : '교사 로그인'}</h1>
       <p class="d">${isPair ? '이 폰에서 한 번만 로그인하면 30일 동안 QR만 찍어 칠판을 열 수 있어요.' : '개인 기기(폰·노트북)에서 로그인하세요. 이 기기에서 30일 동안 유지돼요.'}</p>
       ${msg ? `<p class="err" role="alert">${esc(msg)}</p>` : ''}
       <form method="post" action="/teacher"><input type="hidden" name="next" value="${esc(next)}">
       <label for="pw">교사 비밀번호</label><input id="pw" name="pw" type="password" autocomplete="current-password" required ${disabled ? 'disabled' : isPair ? 'autofocus' : ''}>
       <button type="submit" ${disabled ? 'disabled' : ''}>로그인</button></form>
       ${isPair ? '' : `<div class="alt"><b>전자칠판이라면</b><span>폰으로 QR을 찍어 여세요.</span>
       <a class="go ghost" href="/board?next=${encodeURIComponent(next)}">폰 QR로 칠판 열기</a></div>`}
       <a class="out" href="${esc(next)}">학생 화면으로 돌아가기</a>`;
  return shell('교사 로그인', body, msg && !disabled ? 401 : 200);
}

/* ───────── 칠판 QR 화면 ───────── */
function boardPage(next) {
  return shell('칠판 수업 시작', `
  <div class="board">
    <div class="qr-col"><div class="qr" id="qr" aria-label="교사 폰으로 찍을 QR 코드"><span class="d">QR 만드는 중…</span></div>
      <div class="tm" id="tm" aria-live="polite"></div></div>
    <div class="txt">
      <h1>칠판 수업 시작</h1>
      <ol class="steps"><li><span>선생님 <b>폰 카메라</b>로 QR을 찍어요</span></li><li><span>폰에서 <b>칠판 열기</b>를 눌러요</span></li><li><span>이 화면이 수업 모드로 바뀌어요</span></li></ol>
      <p class="d">처음 한 번은 폰에서 교사 비밀번호를 입력해요. 칠판에는 비밀번호를 치지 않아요.</p>
      <div class="row"><button type="button" id="again" class="go ghost">새 QR</button><a class="go ghost" href="${esc(next)}">학생 화면으로</a></div>
    </div>
  </div>
  <script src="/assets/vendor/qrcode.js"></script>
  <script>
  (() => {
    const NEXT = ${JSON.stringify(next)}, $ = id => document.getElementById(id);
    let code = null, until = 0, poll = null, tick = null;
    async function start() {
      clearInterval(poll); clearInterval(tick); $('qr').innerHTML = '<span class="d">QR 만드는 중…</span>';
      try {
        const r = await fetch('/board/start', {method: 'POST'}); const j = await r.json(); if (!r.ok) throw new Error(j.error || r.status);
        code = j.code; until = Date.now() + j.ttl;
        const q = qrcode(0, 'M'); q.addData(j.url); q.make();
        $('qr').innerHTML = q.createSvgTag({cellSize: 8, margin: 2, scalable: true});
        poll = setInterval(check, 1500); tick = setInterval(count, 500); count();
      } catch (e) { $('qr').innerHTML = '<span class="err">QR을 만들지 못했어요. 인터넷 연결을 확인하고 새 QR을 눌러 주세요.</span>'; }
    }
    function count() {
      const s = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      $('tm').textContent = s ? 'QR 유효 시간 ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') : '';
      if (!s) start();
    }
    async function check() {
      try {
        const r = await fetch('/board/status?c=' + encodeURIComponent(code)); const j = await r.json();
        if (j.state === 'ok') { clearInterval(poll); clearInterval(tick); $('qr').innerHTML = '<div class="big ok">✓</div>'; $('tm').textContent = '열렸어요'; location.replace(NEXT); }
        else if (j.state === 'expired') start();
      } catch (e) {}
    }
    $('again').onclick = start; start();
  })();
  </script>`, 200, true);
}

/* ───────── 칠판이 열려 있을 때 모든 화면에 붙는 '수업 중' 표시 ───────── */
function boardBar(ends) {
  return `<div id="moral-board" role="status">
<span class="sb-dot" aria-hidden="true"></span><span class="sb-t">칠판 수업 중 <b id="sb-left"></b></span>
<button type="button" id="sb-keep" hidden>계속 쓰기</button><button type="button" id="sb-end">수업 끝</button></div>
<style>
#moral-board{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:calc(12px + env(safe-area-inset-bottom));z-index:2147483000;display:flex;align-items:center;gap:10px;
  padding:8px 8px 8px 14px;border-radius:999px;background:#10261b;color:#e8f5ee;font:500 15px "Gowun Dodum","Apple SD Gothic Neo","Malgun Gothic",sans-serif;box-shadow:0 2px 0 rgba(0,0,0,.25),0 0 0 1px #2f8a4e}
#moral-board.on-deck{bottom:24px}
#moral-board .sb-dot{width:10px;height:10px;border-radius:50%;background:#6cc48a;box-shadow:0 0 0 4px rgba(108,196,138,.25)}
#moral-board b{font-variant-numeric:tabular-nums;font-weight:700;color:inherit}
#moral-board span{color:inherit}
#moral-board button{font-weight:700;font-size:15px;font-family:inherit;border:0;border-radius:999px;padding:10px 18px;min-height:44px;cursor:pointer;background:#e8f5ee;color:#10261b}
#moral-board #sb-keep{background:#f6d365}
#moral-board.warn{background:#3a2a00;box-shadow:0 0 0 2px #f6d365}
#moral-board.warn .sb-dot{background:#f6d365;box-shadow:0 0 0 4px rgba(246,211,101,.3)}
@media print{#moral-board{display:none}}
</style>
<script>
(() => {
  const ENDS = ${ends}, IDLE = ${BOARD_IDLE}, WARN = 60000, bar = document.getElementById('moral-board');
  if (document.getElementById('deck')) bar.classList.add('on-deck');
  let last = Date.now(), pinged = Date.now(), ended = false;
  const end = async () => { if (ended) return; ended = true; try { await fetch('/board/end', {method: 'POST'}); } catch (e) {} location.reload(); };
  const act = () => {
    last = Date.now();
    setTimeout(() => { bar.classList.remove('warn'); document.getElementById('sb-keep').hidden = true; tick(); }, 300);   // 누르는 도중 버튼이 움직이지 않게 조금 뒤에 정리
    if (Date.now() - pinged > 60000) { pinged = Date.now(); fetch('/board/ping', {method: 'POST'}).then(r => { if (r.status === 401) location.reload(); }).catch(() => {}); }
  };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(t => addEventListener(t, act, {passive: true, capture: true}));
  document.getElementById('sb-end').onclick = e => { e.stopPropagation(); end(); };
  document.getElementById('sb-keep').onclick = act;
  const tick = () => {
    const now = Date.now(), left = ENDS - now, idle = IDLE - (now - last);
    if (left <= 0 || idle <= 0) return end();
    document.getElementById('sb-left').textContent = Math.ceil(left / 60000) + '분 남음';
    if (idle < WARN) { bar.classList.add('warn'); document.getElementById('sb-keep').hidden = false; document.getElementById('sb-left').textContent = Math.ceil(idle / 1000) + '초 뒤 닫힘'; }
  };
  tick(); setInterval(tick, 1000);
})();
</script>`;
}

/* ───────── 공통 화면 틀 ───────── */
function shell(title, body, status = 200, wide = false) {
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)} · 도덕 수업실</title><meta name="robots" content="noindex"><meta name="theme-color" content="#ff7a6b">
<link rel="icon" type="image/png" href="/icons/icon-192.png"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jua&family=Gowun+Dodum&display=swap">
<style>
:root{--bg:#fff8ef;--grid:#fff8ef;--surface:#fff;--ink:#2b211e;--muted:#6f5f57;--line:#efe0d0;--soft:#fff3e6;--accent:#ff7a6b;--accent-ink:#fff;--hot:#c2321f;--ok:#2f8a4e}
*{box-sizing:border-box}html,body{margin:0;min-height:100%}
body{background-color:var(--bg);background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:24px 24px;color:var(--ink);font:16px/1.6 "Gowun Dodum","Apple SD Gothic Neo","Malgun Gothic",sans-serif;word-break:keep-all;display:grid;place-items:center;min-height:100vh;padding:20px}
.card{width:100%;max-width:${wide ? '980px' : '400px'};background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:28px 24px;display:flex;flex-direction:column;gap:14px}
.logo{display:flex;gap:10px;align-items:center;font-weight:700;color:var(--muted);font-size:14px;text-decoration:none}.logo img{width:32px;height:32px;border-radius:8px}
h1{margin:4px 0 0;font:26px/1.3 Jua,"Gowun Dodum",sans-serif}.d{margin:0;color:var(--muted);font-size:14px}
form{display:flex;flex-direction:column;gap:8px;margin-top:4px}label{font-size:13px;font-weight:500}
input{font:inherit;font-size:16px;padding:11px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink)}
button,.go{font:inherit;font-weight:700;border:0;border-radius:10px;padding:12px 16px;min-height:46px;background:var(--accent);color:var(--accent-ink);cursor:pointer;text-align:center;text-decoration:none;margin-top:4px;display:inline-flex;align-items:center;justify-content:center}
.go.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
button:disabled{opacity:.45;cursor:not-allowed}
.out{font-size:13px;color:var(--muted);text-align:center}
.err{margin:0;padding:10px 12px;border-radius:10px;background:color-mix(in srgb,var(--hot) 12%,transparent);color:var(--hot);font-size:14px;font-weight:500}
.alt{display:flex;flex-direction:column;gap:4px;padding:14px;border-radius:12px;background:var(--soft);font-size:13px;color:var(--muted)}.alt b{color:var(--ink);font-size:14px}
.facts{margin:0;padding-left:18px;color:var(--muted);font-size:14px}
.big{font-size:56px;line-height:1;font-weight:700}.ok{color:var(--ok)}
/* 칠판 QR 화면: 멀리서도 보이게 크게 */
.board{display:grid;grid-template-columns:minmax(0,auto) minmax(0,1fr);gap:40px;align-items:center}
.qr-col{display:flex;flex-direction:column;align-items:center;gap:10px}
.qr{width:min(42vh,380px);aspect-ratio:1;background:#fff;border-radius:16px;display:grid;place-items:center;padding:10px;border:1px solid var(--line)}
.qr svg{width:100%;height:100%;display:block}.qr .d{color:#5a6774}
.tm{font-size:15px;color:var(--muted);font-variant-numeric:tabular-nums;min-height:1.6em}
.board h1{font-size:clamp(28px,3.4vw,44px)}
.steps{margin:14px 0;padding:0;list-style:none;counter-reset:s;display:flex;flex-direction:column;gap:12px;font-size:clamp(17px,1.7vw,22px)}
.steps li{counter-increment:s;display:flex;gap:12px;align-items:center}
.steps li::before{content:counter(s);flex:none;width:36px;height:36px;border-radius:50%;background:var(--accent);color:var(--accent-ink);display:grid;place-items:center;font-weight:700;font-size:17px}
.row{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
@media (max-width:720px){.board{grid-template-columns:1fr;gap:20px}.qr{width:min(70vw,320px)}}
:focus-visible{outline:2px solid #2b5bd7;outline-offset:2px}
</style></head><body><main class="card"><a class="logo" href="/"><img src="/icons/icon-192.png" alt="">도덕 수업실</a>${body}</main></body></html>`;
  return new Response(html, {status, headers: {'content-type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'}});
}

/* 중학교 도덕 수업실 · 서비스 워커 (앱 설치 + 오프라인). 과학 실험실과 같은 방식.
   - 우리 사이트 파일: 인터넷이 되면 항상 최신 파일을 받고(받은 것은 저장), 끊겼을 때만 저장본을 씁니다.
     그래서 저장소에 자료를 올리면 앱에도 바로 반영됩니다. 이 파일을 고칠 필요가 없습니다.
   - 글꼴 같은 외부 파일: 저장본을 먼저 쓰고 뒤에서 새로 받아 둡니다.
   - 교사·칠판 화면(정답과 발문 메모가 들어 있음)은 저장하지 않습니다(서버가 붙이는 x-moral-role 머리글로 구분). */
const CACHE = 'moral-v1';
// 주소 정리(…/a.html → …/a)로 돌아온 응답은 그대로 저장하면 오프라인에서 열리지 않으므로 새 응답으로 감싸 저장한다
const plain = async res => res.redirected ? new Response(await res.blob(), {status: res.status, statusText: res.statusText, headers: res.headers}) : res;
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'assets/site.css', 'assets/site.js', 'assets/catalog.js', 'assets/standards.js', 'assets/philo-list.js', 'assets/lessonbar.js',
  'assets/deck.css', 'assets/deck.js', 'assets/act.css', 'assets/act.js', 'assets/kit.css', 'assets/kit.js',
  'assets/worksheet.css', 'assets/worksheet.js', 'assets/game.css', 'assets/game-sort.js', 'assets/philo.css', 'assets/philo.js',
  'assets/quiz.css', 'assets/quiz.js', 'assets/quizbank.js', 'quiz/bell.html', 'tools/class.html'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => fetch(u).then(async r => { if (r.ok && (r.headers.get('x-moral-role') || 'student') === 'student') await c.put(u, await plain(r)); }).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!url.protocol.startsWith('http')) return;
  if (/^\/(teacher|board|pair)/.test(url.pathname)) return;   // 로그인·칠판 화면은 저장하지 않음

  if (url.origin === location.origin) {
    // 최신 우선, 끊기면 저장본
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok && !(res.url || '').includes('/teacher') && (res.headers.get('x-moral-role') || 'student') === 'student') {
          const copy = res.clone(); plain(copy).then(r => caches.open(CACHE).then(c => c.put(req, r))); }
        return res;
      }).catch(async () => (await caches.match(req))
        || (await caches.match(req, {ignoreSearch: true}))
        || (req.mode === 'navigate' ? (await caches.match('./')) || Response.error() : Response.error()))
    );
  } else {
    // 외부 파일(글꼴): 저장본 먼저, 뒤에서 갱신
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit || Response.error());
      return hit || net;
    }));
  }
});

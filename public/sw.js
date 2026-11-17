/*
 * 봄날 서비스 워커: 인터넷이 끊겼을 때 '연결 없음' 화면만 보여 줌.
 * 일정·결제 같은 로그인한 화면은 저장하지 않음 (다른 사람 정보가 기기에 남지 않게, 늘 최신으로)
 */
const CACHE = "bomnal-offline-v1";
const OFFLINE = ["/offline.html", "/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => caches.match("/offline.html")));
});

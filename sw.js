const CACHE_NAME = 'tocfl-cache-v70';
const ASSETS = [
  './',
  './index.html',
  './js/icons.js',
  './css/main.css',
  './js/app.js',
  './js/playground.js',
  './js/drawing-board.js',
  './js/chapters.js',
  './js/scenarios.js',
  './js/vocabulary.js',
  './js/srs.js',
  './js/onboarding.js',
  './js/learn.js',
  './js/study-plan.js',
  './js/sentence-builder.js',
  './js/mixed-recall.js',
  './js/weakness-engine.js',
  './js/dialogue.js',
  './js/flashcards.js',
  './js/quiz.js',
  './js/reader.js',
  './js/mock-test.js',
  './js/tocfl.js',
  './js/tocfl-content.js',
  './js/b1-coach.js',
  './logo.png',
  './data/characters_all.json',
  './data/vocabulary.json',
  './data/levels.json',
  './data/playground_content.json',
  './data/sentence_builder_levels.json',
  './data/book1_dialogues.json',
  './data/book1_exercises.json',
  './data/tocfl_native_bank.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isFreshAsset = /\/(js|css|data)\//.test(url.pathname) || url.pathname.endsWith('/index.html');

  if (event.request.method !== 'GET') return;

  if (isFreshAsset) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});

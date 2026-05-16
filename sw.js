const CACHE_NAME = 'tocfl-cache-v27';
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
  './logo.png',
  './data/characters_all.json',
  './data/vocabulary.json',
  './data/levels.json',
  './data/playground_content.json',
  './data/sentence_builder_levels.json',
  './data/book1_dialogues.json',
  './data/book1_exercises.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});












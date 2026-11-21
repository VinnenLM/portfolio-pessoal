// Gerado por tools/build_web_sw.py — não edite à mão.
// Guarda o jogo para funcionar offline; versão muda quando qualquer arquivo muda.
const CACHE = "blockify-c97e2cd9ee";
const ASSETS = [
  "./",
  "manifest.webmanifest",
  "style.css",
  "icons/apple-touch-icon.png",
  "icons/favicon-64.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "js/app.js",
  "js/engine.js",
  "js/game.js",
  "js/painter.js",
  "js/random.js",
  "js/skins.js",
  "js/sound.js",
  "js/store.js",
  "js/tutorial.js",
  "sounds/music_loop.mp3",
  "sounds/sfx_bonus.mp3",
  "sounds/sfx_boom.mp3",
  "sounds/sfx_clear.mp3",
  "sounds/sfx_click.mp3",
  "sounds/sfx_crack.mp3",
  "sounds/sfx_fuse.mp3",
  "sounds/sfx_jewel.mp3",
  "sounds/sfx_lose.mp3",
  "sounds/sfx_pixel.mp3",
  "sounds/sfx_place.mp3",
  "sounds/sfx_pop.mp3",
  "sounds/sfx_shatter.mp3",
  "sounds/sfx_slash.mp3",
  "sounds/sfx_thud.mp3",
  "sounds/sfx_win.mp3",
  "sounds/word_bom.mp3",
  "sounds/word_excelente.mp3",
  "sounds/word_otimo.mp3",
  "sounds/word_perfeito.mp3",
  "index.html"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("blockify-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request))
  );
});

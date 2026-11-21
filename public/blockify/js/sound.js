// Som com Web Audio (porta do Sound.kt): música em loop sem emenda, efeitos e vozes.
// No iPhone o áudio só pode começar depois de um toque: unlock() é chamado no primeiro toque.
import { store } from "./store.js";

export const Sfx = {
  PLACE: "sfx_place", CLEAR: "sfx_clear", CRACK: "sfx_crack", BONUS: "sfx_bonus", SLASH: "sfx_slash",
  FUSE: "sfx_fuse", BOOM: "sfx_boom", WIN: "sfx_win", LOSE: "sfx_lose", CLICK: "sfx_click",
  THUD: "sfx_thud", PIXEL: "sfx_pixel", SHATTER: "sfx_shatter", POP: "sfx_pop", JEWEL: "sfx_jewel",
};
const WORDS = ["word_bom", "word_otimo", "word_excelente", "word_perfeito"];

let ctx = null;
let master = null;
const buffers = new Map();
let loading = null;
let musicSource = null;
let musicGain = null;
let musicWanted = false;
let wordSource = null;

function base() {
  return new URL("../sounds/", import.meta.url).href;
}

async function loadAll() {
  const names = [...Object.values(Sfx), ...WORDS, "music_loop"];
  await Promise.all(names.map(async (n) => {
    try {
      const res = await fetch(base() + n + ".mp3");
      const data = await res.arrayBuffer();
      buffers.set(n, await ctx.decodeAudioData(data));
    } catch (e) { /* sem esse som */ }
  }));
}

export const Sound = {
  /** Chamado no primeiro toque (exigência do iOS/Chrome). */
  unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.connect(ctx.destination);
      loading = loadAll().then(() => this.refreshMusic());
    }
    if (ctx.state === "suspended") ctx.resume();
  },

  play(name, rate = 1, volume = 1) {
    if (!store.sfxOn || !ctx) return;
    const buf = buffers.get(name);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = Math.max(0.5, Math.min(2, rate));
    const g = ctx.createGain();
    g.gain.value = volume;
    src.connect(g).connect(master);
    src.start();
  },

  /** 1 bom, 2 ótimo, 3 excelente, 4+ perfeito. */
  speakLines(lines) {
    if (!store.voiceOn || !ctx) return;
    const buf = buffers.get(WORDS[Math.min(4, Math.max(1, lines)) - 1]);
    if (!buf) return;
    try { wordSource?.stop(); } catch {}
    wordSource = ctx.createBufferSource();
    wordSource.buffer = buf;
    wordSource.connect(master);
    wordSource.start();
  },

  resumeMusic() {
    musicWanted = true;
    this.refreshMusic();
  },

  pauseMusic() {
    musicWanted = false;
    this.refreshMusic();
  },

  refreshMusic() {
    if (!ctx) return;
    const should = musicWanted && store.musicOn;
    if (should && !musicSource) {
      const buf = buffers.get("music_loop");
      if (!buf) return;
      musicSource = ctx.createBufferSource();
      musicSource.buffer = buf;
      musicSource.loop = true; // Web Audio repete sem nenhum intervalo
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.45;
      musicSource.connect(musicGain).connect(master);
      musicSource.start();
    } else if (!should && musicSource) {
      try { musicSource.stop(); } catch {}
      musicSource = null;
    }
  },

  /** Aba em segundo plano: silencia tudo. */
  setHidden(hidden) {
    if (!ctx) return;
    if (hidden) ctx.suspend(); else ctx.resume();
  },
};

export function vibrate(strong) {
  if (!store.vibrationOn || !navigator.vibrate) return;
  try { navigator.vibrate(strong ? 18 : 8); } catch {}
}

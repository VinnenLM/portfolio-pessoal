// Dados salvos no navegador (porta do Store.kt). O código de progresso BLK2 é o mesmo do Android:
// dá para passar o progresso do celular Android para a versão online e vice-versa.
import { Mode, TOTAL_LEVELS, MAX_BONUS } from "./engine.js";
import { applySkins, findPalette, findStyle, findBackground } from "./skins.js";

const PREFIX = "blockify.";
const N = 4;

function mem() {
  try { localStorage.setItem(PREFIX + "_t", "1"); localStorage.removeItem(PREFIX + "_t"); return localStorage; }
  catch { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; }
}
const ls = mem();

const getInt = (k, def) => { const v = ls.getItem(PREFIX + k); const n = v == null ? NaN : parseInt(v, 10); return Number.isNaN(n) ? def : n; };
const setInt = (k, v) => ls.setItem(PREFIX + k, String(Math.trunc(v)));
const getBool = (k, def) => { const v = ls.getItem(PREFIX + k); return v == null ? def : v === "1"; };
const setBool = (k, v) => ls.setItem(PREFIX + k, v ? "1" : "0");
const getStr = (k) => ls.getItem(PREFIX + k);
const setStr = (k, v) => (v == null ? ls.removeItem(PREFIX + k) : ls.setItem(PREFIX + k, v));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const store = {
  get currentLevel() { return clamp(getInt("level", 1), 1, TOTAL_LEVELS); },
  set currentLevel(v) { setInt("level", clamp(v, 1, TOTAL_LEVELS)); },
  get maxLevel() { return getInt("max_level", 1); },
  set maxLevel(v) { setInt("max_level", v); },
  get highInfinite() { return getInt("high_infinite", 0); },
  set highInfinite(v) { setInt("high_infinite", v); },
  get highHard() { return getInt("high_hard", 0); },
  set highHard(v) { setInt("high_hard", v); },
  highFor(mode) { return mode === Mode.HARD ? this.highHard : this.highInfinite; },
  setHigh(mode, v) { if (mode === Mode.HARD) this.highHard = v; else this.highInfinite = v; },

  get coins() { return getInt("coins", 0); },
  set coins(v) { setInt("coins", Math.max(0, v)); },
  owned() { try { return new Set(JSON.parse(getStr("owned") || "[]")); } catch { return new Set(); } },
  owns(id) { return this.owned().has(id); },
  addOwned(id) { const s = this.owned(); s.add(id); setStr("owned", JSON.stringify([...s])); },
  setOwned(set) { setStr("owned", JSON.stringify([...set])); },

  get paletteId() { return getStr("skin_palette"); },
  set paletteId(v) { setStr("skin_palette", v); },
  get styleId() { return getStr("skin_style"); },
  set styleId(v) { setStr("skin_style", v); },
  get backgroundId() { return getStr("skin_bg"); },
  set backgroundId(v) { setStr("skin_bg", v); },
  applySkins() { applySkins(this.paletteId, this.styleId, this.backgroundId); },

  get musicOn() { return getBool("music_on", true); },
  set musicOn(v) { setBool("music_on", v); },
  get sfxOn() { return getBool("sfx_on", true); },
  set sfxOn(v) { setBool("sfx_on", v); },
  get voiceOn() { return getBool("voice_on", true); },
  set voiceOn(v) { setBool("voice_on", v); },
  get vibrationOn() { return getBool("vibration_on", true); },
  set vibrationOn(v) { setBool("vibration_on", v); },
  get tutorialDone() { return getBool("tutorial_done", false); },
  set tutorialDone(v) { setBool("tutorial_done", v); },
  get infiniteBonus() { return getBool("infinite_bonus", false); },
  set infiniteBonus(v) { setBool("infinite_bonus", v); },

  loadBonuses() { return Array.from({ length: N }, (_, i) => clamp(getInt("bonus_" + i, 1), 0, MAX_BONUS)); },
  saveBonuses(b) { b.forEach((v, i) => setInt("bonus_" + i, v)); },
  loadReserve() { return Array.from({ length: N }, (_, i) => Math.max(0, getInt("reserve_" + i, 0))); },
  saveReserve(r) { r.forEach((v, i) => setInt("reserve_" + i, Math.max(0, v))); },

  saveGame(mode, state) { setStr("save_" + mode, state); },
  loadGame(mode) { return getStr("save_" + mode); },
  clearGame(mode) { setStr("save_" + mode, null); },

  resetProgress() {
    this.currentLevel = 1;
    this.maxLevel = 1;
    this.clearGame(Mode.LEVELS);
    for (let i = 0; i < N; i++) setStr("bonus_" + i, null);
  },

  // ---------- código de progresso (igual ao Android) ----------

  exportCode() {
    const owned = [...this.owned()].sort().join("+");
    const data = [this.currentLevel, this.maxLevel, this.highInfinite, this.highHard, this.coins].join(",") + ";" +
      this.loadBonuses().join(",") + ";" + this.loadReserve().join(",") + ";" + owned + ";" +
      [this.paletteId || "", this.styleId || "", this.backgroundId || ""].join("+");
    const raw = `${data}#${checksum(data)}`;
    return "BLK2-" + b64encode(raw);
  },

  importCode(code) {
    try {
      const clean = code.trim();
      if (clean.startsWith("BLK2-")) return this.importV2(b64decode(clean.slice(5)));
      if (clean.startsWith("BLK1-")) return this.importV1(b64decode(clean.slice(5)));
      return false;
    } catch { return false; }
  },

  importV2(raw) {
    const cut = raw.lastIndexOf("#");
    if (cut < 0) return false;
    const data = raw.slice(0, cut);
    if (checksum(data) !== raw.slice(cut + 1)) return false;
    const parts = data.split(";");
    if (parts.length !== 5) return false;
    const ints = (s) => s.split(",").map((x) => { const n = parseInt(x, 10); if (Number.isNaN(n)) throw new Error(); return n; });
    const n = ints(parts[0]), bonus = ints(parts[1]), reserve = ints(parts[2]);
    if (n.length !== 5 || bonus.length !== N || reserve.length !== N) return false;
    const skins = parts[4].split("+");
    this.clearGame(Mode.LEVELS);
    this.currentLevel = n[0];
    this.maxLevel = clamp(Math.max(n[1], n[0]), 1, TOTAL_LEVELS);
    this.highInfinite = Math.max(0, n[2]);
    this.highHard = Math.max(0, n[3]);
    this.coins = Math.max(0, n[4]);
    this.saveBonuses(bonus.map((v) => clamp(v, 0, MAX_BONUS)));
    this.saveReserve(reserve.map((v) => clamp(v, 0, 99)));
    const owned = new Set(parts[3].split("+").filter((x) => x.trim()));
    this.setOwned(owned);
    const ok = (prefix, id, free) => !!id && (free || owned.has(`${prefix}:${id}`));
    const [p, st, bg] = skins;
    this.paletteId = ok("palette", p, findPalette(p).price === 0) ? p : null;
    this.styleId = ok("style", st, findStyle(st).price === 0) ? st : null;
    this.backgroundId = ok("bg", bg, findBackground(bg).price === 0) ? bg : null;
    return true;
  },

  importV1(raw) {
    const [body, sum] = raw.split(";");
    if (checksum(body) !== sum) return false;
    const n = body.split(",").map((x) => parseInt(x, 10));
    if (n.length !== 3 + N || n.some(Number.isNaN)) return false;
    this.clearGame(Mode.LEVELS);
    this.currentLevel = n[0];
    this.maxLevel = clamp(Math.max(n[1], n[0]), 1, TOTAL_LEVELS);
    this.highInfinite = Math.max(0, n[2]);
    this.saveBonuses(n.slice(3).map((v) => clamp(v, 0, MAX_BONUS)));
    return true;
  },
};

/** Mesmo checksum do Kotlin: h = (h * 31 + código do caractere) % 1000003, em base 36. */
export function checksum(s) {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000003;
  return h.toString(36);
}

function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64decode(s) {
  let t = s.replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  const bin = atob(t);
  return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
}

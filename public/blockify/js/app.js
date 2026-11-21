// Telas fora do jogo (porta do MainActivity, ShopActivity e GameDialog): menu, loja, configurações.
import { Mode, Bonus, TOTAL_LEVELS, GameEngine } from "./engine.js";
import { Game } from "./game.js";
import { store } from "./store.js";
import { Sound, Sfx } from "./sound.js";
import { current, palettes, styles, backgrounds, bonusOffers, findPalette, findBackground, CASUAL_ID, CASUAL_PRICE, POINTS_PER_COIN } from "./skins.js";
import { drawBlock, colorOf } from "./painter.js";

export const VERSION = "2.2";
const DEV = new URLSearchParams(location.search).has("dev"); // atalhos de teste só com ?dev

const $ = (sel) => document.querySelector(sel);
const fmt = (n) => n.toLocaleString("pt-BR");
const el = (tag, props = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v;
    else if (k === "style") Object.assign(e.style, v);
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "html") e.innerHTML = v;
    else e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k instanceof Node ? k : withCoins(String(k)));
  return e;
};

/** Troca o emoji 🪙 por uma moeda desenhada (o emoji não existe no Windows 10 e em celulares antigos). */
function withCoins(text) {
  const frag = document.createDocumentFragment();
  text.split("🪙").forEach((part, i) => {
    if (i > 0) frag.append(Object.assign(document.createElement("span"), { className: "coin-i", ariaLabel: "moedas" }));
    if (part) frag.append(document.createTextNode(part));
  });
  return frag;
}

let game = null;
let screen = "menu";
let exiting = false; // saída pelo botão "Menu" (não é o botão voltar)

// No celular, o toque em "Menu" (no canvas) ainda gera um "click" logo depois, no mesmo ponto,
// que cairia no botão que apareceu ali no menu (ex.: "Difícil"). Só esse clique é ignorado:
// precisa ser quase imediato e no mesmo lugar. Um toque novo funciona na hora.
let ghost = null; // { x, y, until }
const guardGhostClick = (pos) => { if (pos) ghost = { x: pos[0], y: pos[1], until: performance.now() + 350 }; };
document.addEventListener("click", (e) => {
  if (!ghost) return;
  const g = ghost;
  if (performance.now() > g.until) { ghost = null; return; }
  if (Math.hypot(e.clientX - g.x, e.clientY - g.y) < 30) { ghost = null; e.stopPropagation(); e.preventDefault(); }
}, true);

// =====================================================================
// janelas no estilo do jogo
// =====================================================================

function dialog({ title, accent = "#2ec4f1", build }) {
  const box = el("div", { class: "dialog", style: { "--accent": accent } });
  const bg = el("div", { class: "dim-bg" }, box);
  const close = () => bg.remove();
  box.append(el("h2", { class: title.length > 16 ? "long" : "" }, title));
  const api = {
    line: (text, cls = "") => box.append(el("p", { class: cls }, text)),
    section: (text) => box.append(el("div", { class: "section" }, text)),
    input: (placeholder, value = "") => { const i = el("input", { placeholder, value, autocomplete: "off", autocapitalize: "off", spellcheck: "false" }); box.append(i); return i; },
    button: (label, onClick = () => {}, { primary = false, keep = false } = {}) => {
      const b = el("button", { class: primary ? "primary" : "", onclick: () => { Sound.play(Sfx.CLICK); onClick(b); if (!keep) close(); } }, label);
      box.append(b);
      return b;
    },
    close,
  };
  build(api);
  bg.addEventListener("click", (e) => { if (e.target === bg) close(); });
  $("#app").append(bg);
  return api;
}

function toast(text) {
  const t = el("div", { class: "toast" }, text);
  $("#app").append(t);
  setTimeout(() => t.remove(), 2200);
}

// =====================================================================
// navegação (o botão voltar do celular volta para o menu)
// =====================================================================

function show(name) {
  screen = name;
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("on", s.id === name));
}

function openGame(mode, tutorial = false) {
  Sound.unlock();
  Sound.play(Sfx.CLICK);
  history.pushState({ s: "game" }, "");
  show("game");
  const canvas = $("#game canvas");
  game?.destroy();
  game = new Game(canvas, mode, {
    tutorial: tutorial || !store.tutorialDone,
    onExit: () => { guardGhostClick(game?.lastUpClient); exiting = true; history.back(); },
  });
}

function closeGame() {
  if (!game) return;
  game.saveProgress();
  game.destroy();
  game = null;
}

function openShop() {
  Sound.unlock();
  Sound.play(Sfx.CLICK);
  history.pushState({ s: "shop" }, "");
  show("shop");
  renderShop();
}

window.addEventListener("popstate", () => {
  document.querySelectorAll(".dim-bg").forEach((d) => d.remove());
  const leaving = exiting;
  exiting = false;
  if (!leaving && screen === "game" && game && game.handleBack()) { history.pushState({ s: "game" }, ""); return; }
  if (screen === "game") closeGame();
  show("menu");
  renderMenu();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && screen !== "menu") history.back();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) { game?.pauseGame(); game?.saveProgress(); }
  Sound.setHidden(document.hidden);
});
window.addEventListener("pagehide", () => game?.saveProgress());

// =====================================================================
// menu
// =====================================================================

function drawLogo(cv) {
  const dpr = window.devicePixelRatio || 1;
  cv.width = 130 * dpr; cv.height = 96 * dpr;
  const c = cv.getContext("2d");
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const shape = [[0, 0, 1], [0, 1, 2], [0, 2, 3], [1, 0, 6], [1, 1, 7], [2, 0, 4], [2, 1, 5], [2, 2, 8], [1, 3, 3], [2, 3, 2]];
  const s = Math.min(130 / 4, 96 / 3), ox = (130 - 4 * s) / 2, oy = (96 - 3 * s) / 2;
  for (const [r, col, color] of shape) drawBlock(c, ox + col * s, oy + r * s, s, colorOf(color));
}

function gearSvg() {
  return `<svg width="26" height="26" viewBox="0 0 26 26"><path fill="#fff" d="${(() => {
    const cx = 13, cy = 13, ro = 11, ri = 8, n = 8; let p = "";
    for (let i = 0; i < n * 2; i++) {
      const a0 = (Math.PI * 2 * i) / (n * 2), a1 = (Math.PI * 2 * (i + 1)) / (n * 2), r = i % 2 === 0 ? ro : ri;
      p += `${i === 0 ? "M" : "L"}${(cx + r * Math.cos(a0)).toFixed(2)} ${(cy + r * Math.sin(a0)).toFixed(2)}L${(cx + r * Math.cos(a1)).toFixed(2)} ${(cy + r * Math.sin(a1)).toFixed(2)}`;
    }
    return p + "Z";
  })()}"/><circle cx="13" cy="13" r="8" fill="#fff"/><circle cx="13" cy="13" r="3.6" fill="#2e3470"/></svg>`;
}

function renderMenu() {
  store.applySkins();
  document.documentElement.style.setProperty("--top", current.background.top);
  document.documentElement.style.setProperty("--bottom", current.background.bottom);
  const m = $("#menu");
  m.innerHTML = "";

  const coins = el("button", { class: "corner left coins", onclick: openShop, "aria-label": "Moedas e loja" }, `🪙 ${fmt(store.coins)}`);
  const gear = el("button", { class: "corner right square-btn", onclick: () => { Sound.unlock(); Sound.play(Sfx.CLICK); openSettings(); }, "aria-label": "Configurações", html: gearSvg() });
  m.append(coins, gear);

  const logo = el("canvas", { class: "logo" });
  drawLogo(logo);
  if (DEV) {
    let taps = 0, last = 0;
    logo.addEventListener("click", () => {
      const now = Date.now();
      taps = now - last < 600 ? taps + 1 : 1;
      last = now;
      if (taps >= 7) { taps = 0; store.infiniteBonus = !store.infiniteBonus; toast(store.infiniteBonus ? "🧪 Bônus infinito ligado (teste)" : "🧪 Bônus infinito desligado"); renderMenu(); }
    });
  }

  const title = el("h1", { class: "title" }, ...[..."Blockify"].map((ch, i) => el("span", { style: { color: current.palette.colors[i % 8] } }, ch)));
  const infSaved = GameEngine.peekScore(store.loadGame(Mode.INFINITE));
  const hardSaved = GameEngine.peekScore(store.loadGame(Mode.HARD));
  const levelSaved = store.loadGame(Mode.LEVELS) != null;

  const twoLines = (top, bottom) => [top, el("small", {}, bottom)];
  const inner = el("div", { class: "menu-inner" },
    logo, title,
    el("div", { class: "subtitle" }, "Encaixe, limpe, combine!"),
    el("button", { class: "btn green", onclick: () => openGame(Mode.LEVELS) }, ...twoLines("▶  Fases", `Continuar da fase ${store.currentLevel} de ${TOTAL_LEVELS}${levelSaved ? " • salva" : ""}`)),
    el("button", { class: "btn blue", onclick: () => openGame(Mode.INFINITE) }, ...twoLines("∞  Infinito",
      infSaved != null ? `Continuar: ${fmt(infSaved)} pts • Recorde: ${fmt(store.highInfinite)}` : `Recorde: ${fmt(store.highInfinite)}`)),
    el("button", { class: "btn red", onclick: () => openGame(Mode.HARD) }, ...twoLines("🔥  Difícil",
      hardSaved != null ? `Continuar: ${fmt(hardSaved)} pts • Recorde: ${fmt(store.highHard)}` : `Recorde: ${fmt(store.highHard)}`)),
    el("div", { class: "row" },
      el("button", { class: "pill gold", onclick: openShop }, "🛒  Loja"),
      store.infiniteBonus ? el("button", { class: "pill cyan", onclick: () => { store.infiniteBonus = false; toast("Modo casual desligado"); renderMenu(); } }, "☕  Casual ✕") : null,
    ),
    installTip(),
  );
  m.append(inner);
}

function installTip() {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (standalone) return null;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return el("div", { class: "install-tip" },
    ios ? "📲 Para jogar como app: toque em Compartilhar e depois em “Adicionar à Tela de Início”."
      : "📲 Dá para instalar como app: no menu do navegador, toque em “Instalar app” ou “Adicionar à tela inicial”.");
}

// =====================================================================
// configurações
// =====================================================================

function openSettings() {
  const onOff = (v, f = false) => (v ? (f ? "ligados" : "ligada") : f ? "desligados" : "desligada");
  dialog({
    title: "Configurações",
    build: (d) => {
      d.section("SOM");
      d.button(`🎵  Música: ${onOff(store.musicOn)}`, (b) => { store.musicOn = !store.musicOn; Sound.resumeMusic(); b.textContent = `🎵  Música: ${onOff(store.musicOn)}`; }, { keep: true });
      d.button(`🔊  Efeitos: ${onOff(store.sfxOn, true)}`, (b) => { store.sfxOn = !store.sfxOn; b.textContent = `🔊  Efeitos: ${onOff(store.sfxOn, true)}`; }, { keep: true });
      d.button(`🗣  Voz: ${onOff(store.voiceOn)}`, (b) => { store.voiceOn = !store.voiceOn; if (store.voiceOn) Sound.speakLines(4); b.textContent = `🗣  Voz: ${onOff(store.voiceOn)}`; }, { keep: true });
      if (navigator.vibrate) d.button(`📳  Vibração: ${onOff(store.vibrationOn)}`, (b) => { store.vibrationOn = !store.vibrationOn; b.textContent = `📳  Vibração: ${onOff(store.vibrationOn)}`; }, { keep: true });
      d.section("AJUDA");
      d.button("🎓  Ver tutorial", () => openGame(Mode.LEVELS, true));
      d.section("PROGRESSO");
      d.line("O progresso fica salvo neste navegador. Para levar para outro aparelho, ou para o app Android, use o código.", "small");
      d.button("📋  Copiar código", copyCode);
      d.button("📥  Restaurar com código", restoreCode);
      d.section("FASES");
      d.button("🗑  Zerar progresso", confirmReset);
      d.line(`Versão ${VERSION} (online)`, "small");
      d.button("Fechar", () => {}, { primary: true });
    },
  });
}

async function copyCode() {
  const code = store.exportCode();
  let copied = false;
  try { await navigator.clipboard.writeText(code); copied = true; } catch {}
  dialog({
    title: copied ? "Código copiado!" : "Seu código",
    accent: "#3ddc84",
    build: (d) => {
      d.line(copied ? "Guarde ou envie para você mesmo. No outro aparelho, use “Restaurar com código”." : "Copie o código abaixo e guarde. No outro aparelho, use “Restaurar com código”.", "small");
      d.line(code, "code");
      d.button("OK", () => {}, { primary: true });
    },
  });
}

async function restoreCode() {
  let clip = "";
  try { clip = (await navigator.clipboard.readText()).trim(); } catch {}
  dialog({
    title: "Restaurar progresso",
    build: (d) => {
      d.line("Fases, recordes, moedas, compras e bônus deste navegador serão substituídos.", "small");
      const input = d.input("BLK2-...", clip.startsWith("BLK") ? clip : "");
      d.button("Restaurar", () => {
        if (store.importCode(input.value)) { toast("Progresso restaurado!"); renderMenu(); }
        else toast("Código inválido");
      }, { primary: true });
      d.button("Cancelar");
    },
  });
}

function confirmReset() {
  dialog({
    title: "Zerar progresso?",
    accent: "#ff4d5e",
    build: (d) => {
      d.line("Você volta para a fase 1 e os bônus guardados são perdidos. O recorde do infinito é mantido.");
      d.button("Zerar", () => { store.resetProgress(); toast("Progresso zerado"); renderMenu(); }, { primary: true });
      d.button("Cancelar");
    },
  });
}

// =====================================================================
// loja
// =====================================================================

let tab = "BONUS";
const TABS = [["BONUS", "Bônus"], ["COLORS", "Cores"], ["STYLES", "Estilos"], ["BACKGROUNDS", "Fundos"]];

function preview(kind, id) {
  const cv = el("canvas");
  const dpr = window.devicePixelRatio || 1, w = 76, h = 54;
  cv.width = w * dpr; cv.height = h * dpr;
  const c = cv.getContext("2d");
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (kind === "BONUS") {
    c.font = `${h * 0.62}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    c.textAlign = "center";
    c.fillText(id, w / 2, h * 0.72);
  } else if (kind === "PALETTE") {
    const colors = findPalette(id).colors, s = Math.min(w / 4, h / 2), ox = (w - 4 * s) / 2, oy = (h - 2 * s) / 2;
    for (let i = 0; i < 8; i++) drawBlock(c, ox + (i % 4) * s, oy + Math.floor(i / 4) * s, s, colors[i], 1, current.style.id);
  } else if (kind === "STYLE") {
    const s = Math.min(w / 3, h * 0.8), ox = (w - 3 * s) / 2, oy = (h - s) / 2;
    [0, 4, 6].forEach((ci, i) => drawBlock(c, ox + i * s, oy, s, current.palette.colors[ci], 1, id));
  } else {
    const b = findBackground(id);
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, b.top); g.addColorStop(1, b.bottom);
    c.fillStyle = g; c.beginPath(); c.roundRect(0, 0, w, h, 12); c.fill();
    const s = h / 4.2, ox = (w - 3 * s) / 2, oy = (h - 3 * s) / 2;
    c.fillStyle = b.board; c.beginPath(); c.roundRect(ox - 3, oy - 3, 3 * s + 6, 3 * s + 6, 6); c.fill();
    for (let i = 0; i < 9; i++) {
      const x = ox + (i % 3) * s, y = oy + Math.floor(i / 3) * s;
      if (i === 4 || i === 6) drawBlock(c, x, y, s, current.palette.colors[i % 8]);
      else { c.fillStyle = b.empty; c.beginPath(); c.roundRect(x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88, s * 0.15); c.fill(); }
    }
  }
  return cv;
}

function card(list, { prev, name, desc, action, cls, equipped, onClick }) {
  list.append(el("div", { class: "item" + (equipped ? " on" : "") },
    prev,
    el("div", { class: "txt" }, el("div", { class: "name" }, name), el("div", { class: "desc" }, desc)),
    el("button", { class: "act " + cls, onclick: onClick }, action)));
}

function buy(price, what, give) {
  Sound.play(Sfx.CLICK);
  if (store.coins < price) { toast(`Faltam ${fmt(price - store.coins)} 🪙. Jogue para ganhar mais!`); return; }
  dialog({
    title: `Comprar ${what}?`,
    accent: "#ffd23f",
    build: (d) => {
      d.line(`Por 🪙 ${fmt(price)}  •  você tem 🪙 ${fmt(store.coins)}`, "small");
      d.button("Comprar", () => { store.coins = store.coins - price; give(); Sound.play(Sfx.BONUS); renderShop(); }, { primary: true });
      d.button("Cancelar");
    },
  });
}

function renderShop() {
  store.applySkins();
  document.documentElement.style.setProperty("--top", current.background.top);
  document.documentElement.style.setProperty("--bottom", current.background.bottom);
  const s = $("#shop");
  s.innerHTML = "";
  const coins = el("button", { class: "coins" }, `🪙 ${fmt(store.coins)}`);
  if (DEV) {
    let taps = 0, last = 0;
    coins.addEventListener("click", () => {
      const now = Date.now();
      taps = now - last < 600 ? taps + 1 : 1;
      last = now;
      if (taps >= 7) { taps = 0; store.coins = store.coins + 99999; Sound.play(Sfx.WIN); toast("🧪 +99.999 🪙 (teste)"); renderShop(); }
    });
  }
  s.append(
    el("div", { class: "shop-head" },
      el("button", { class: "square-btn back", onclick: () => history.back(), "aria-label": "Voltar" }, "‹"),
      el("h1", {}, "🛒 Loja"),
      coins),
    el("div", { class: "shop-note" }, `Ganhe 1 🪙 a cada ${POINTS_PER_COIN} pontos feitos nas partidas.`),
    el("div", { class: "tabs" }, ...TABS.map(([k, label]) => el("button", { class: "tab" + (k === tab ? " on" : ""), onclick: () => { Sound.play(Sfx.CLICK); tab = k; renderShop(); } }, label))),
  );
  const list = el("div", { class: "list" });
  s.append(list);

  const priceLabel = (p) => (p === 0 ? "Grátis" : `🪙 ${fmt(p)}`);
  const skinCard = (kind, item, ownId, equipped, equip) => {
    const owned = item.price === 0 || store.owns(ownId);
    const action = equipped ? "Em uso" : owned ? "Usar" : priceLabel(item.price);
    const cls = equipped ? "equipped" : owned ? "use" : store.coins >= item.price ? "price" : "off";
    card(list, {
      prev: preview(kind, item.id), name: item.name, desc: item.description || (kind === "PALETTE" ? "8 cores" : "Fundo e tabuleiro"),
      action, cls, equipped,
      onClick: () => {
        if (equipped) return;
        if (owned) { equip(); Sound.play(Sfx.CLICK); renderShop(); }
        else buy(item.price, item.name, () => { store.addOwned(ownId); equip(); });
      },
    });
  };

  if (tab === "BONUS") {
    // bônus infinito (modo casual)
    const owned = store.owns(CASUAL_ID), on = store.infiniteBonus;
    card(list, {
      prev: preview("BONUS", "♾"), name: "Bônus infinito",
      desc: "Modo casual: bônus nunca acabam.\nNão dá moedas nem conta recorde." + (owned ? (on ? "\n☕ Ligado" : "\nDesligado") : ""),
      action: !owned ? priceLabel(CASUAL_PRICE) : on ? "Desligar" : "Ligar",
      cls: !owned ? (store.coins >= CASUAL_PRICE ? "price" : "off") : on ? "equipped" : "use",
      equipped: owned && on,
      onClick: () => {
        if (!owned) buy(CASUAL_PRICE, "o Bônus infinito", () => { store.addOwned(CASUAL_ID); store.infiniteBonus = true; });
        else { store.infiniteBonus = !on; Sound.play(Sfx.CLICK); renderShop(); }
      },
    });
    list.append(el("div", { class: "shop-note" }, "Bônus comprados vão para a 🎒 mochila e são usados quando os da partida acabam."));
    const reserve = store.loadReserve();
    for (const o of bonusOffers) {
      card(list, {
        prev: preview("BONUS", o.info.icon), name: `${o.info.icon} ${o.info.label}`, desc: `${o.description}\nNa mochila: ${reserve[o.bonus]}`,
        action: priceLabel(o.price), cls: store.coins >= o.price ? "price" : "off",
        onClick: () => buy(o.price, `+1 ${o.info.label}`, () => { const r = store.loadReserve(); r[o.bonus] = Math.min(99, r[o.bonus] + 1); store.saveReserve(r); }),
      });
    }
  } else if (tab === "COLORS") {
    for (const p of palettes) skinCard("PALETTE", p, `palette:${p.id}`, current.palette.id === p.id, () => (store.paletteId = p.id));
  } else if (tab === "STYLES") {
    for (const st of styles) skinCard("STYLE", st, `style:${st.id}`, current.style.id === st.id, () => (store.styleId = st.id));
  } else {
    for (const b of backgrounds) skinCard("BG", b, `bg:${b.id}`, current.background.id === b.id, () => (store.backgroundId = b.id));
  }
}

// =====================================================================
// início
// =====================================================================

store.applySkins();
history.replaceState({ s: "menu" }, "");
show("menu");
renderMenu();
Sound.resumeMusic();
document.addEventListener("pointerdown", () => Sound.unlock(), { once: true, capture: true });

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

// para os testes automáticos
window.__blockify = { get game() { return game; }, store, openGame, openShop, Mode };

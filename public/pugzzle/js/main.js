/* Pugzzle - controle do jogo, save, loja e interface */
(function () {
  'use strict';

  const SAVE_KEY = 'pugzzle:save:v1';
  const MAX_LIVES = 5, START_LIVES = 3;
  // Uma palavra por combo (acertos seguidos sem erro). Errou: volta para a primeira.
  const COMBO_WORDS = ['Bom', 'Ótimo', 'Muito bem', 'Excelente', 'Incrível', 'Fantástico', 'Sensacional', 'Épico', 'Perfeito', 'Lendário'];
  const BONUS_TYPES = ['life', 'pug', 'hint'];
  const BONE_D = 'M7.5 9.5H16.5A3 3 0 1 1 20.5 12A3 3 0 1 1 16.5 14.5H7.5A3 3 0 1 1 3.5 12A3 3 0 1 1 7.5 9.5Z';
  const boneIcon = (cls) => '<svg class="bone-ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true"><g transform="translate(12 12) rotate(-45) scale(1.12) translate(-12 -12)"><path d="' + BONE_D + '"/></g></svg>';
  const BONUS_NAMES = { life: boneIcon('inl') + ' +1 vida', pug: '🐶 Pug direto', hint: '💡 Dica' };
  const DEFAULT_MSG = '';
  const DOUBLE_MS = 350;

  const $ = (s) => document.querySelector(s);
  const L = window.PugLogic, A = window.PugAudio, Art = window.PugArt;

  /* ---------- Save ---------- */
  const defaults = () => ({
    v: 1, points: 0, level: 1, solved: 0, tutorialDone: false,
    skins: { owned: ['classico'], selected: 'classico' },
    themes: { owned: ['claro'], selected: 'claro' },
    palettes: { owned: ['padrao'], selected: 'padrao' },
    bonuses: { life: 1, pug: 1, hint: 1 },
    settings: { music: true, sfx: true, voice: true },
    run: null,
  });
  function merge(base, src) {
    for (const k in src) {
      const s = src[k], b = base[k];
      if (s && typeof s === 'object' && !Array.isArray(s) && b && typeof b === 'object' && !Array.isArray(b)) merge(b, s);
      else base[k] = s;
    }
    return base;
  }
  function load() {
    try { const raw = localStorage.getItem(SAVE_KEY); return raw ? merge(defaults(), JSON.parse(raw)) : defaults(); }
    catch (e) { return defaults(); }
  }
  let save = load();
  if (!save.themes) save.themes = { owned: ['claro'], selected: 'claro' };
  if (!save.palettes) save.palettes = { owned: ['padrao'], selected: 'padrao' };
  const THEMES = [
    { id: 'claro', name: 'Claro', price: 0, v: { bg: '#fff6e4', bg2: '#ffe6c6', card: '#fffaf0', ink: '#5b3a29', 'ink-soft': '#8a6a58', accent: '#e39a4a', 'accent-dark': '#c47a2a', panel: '#fffaf0', msg: 'rgba(255,255,255,.55)', tile: '#f3e2c4', tile2: '#e8d4b4', line: 'rgba(60,35,20,.55)' } },
    { id: 'escuro', name: 'Escuro', price: 15, v: { bg: '#1b2233', bg2: '#2a2742', card: '#2a3350', ink: '#e9eefc', 'ink-soft': '#a9b4d0', accent: '#ff9d86', 'accent-dark': '#e07a62', panel: '#2a3350', msg: 'rgba(255,255,255,.08)', tile: '#efe3d0', tile2: '#465175', line: 'rgba(8,10,20,.7)' } },
    { id: 'oceano', name: 'Oceano', price: 20, v: { bg: '#b4cfe8', bg2: '#8fb5d9', card: '#d3e4f3', ink: '#17304f', 'ink-soft': '#40638a', accent: '#2f78c4', 'accent-dark': '#215c9c', panel: '#d3e4f3', msg: 'rgba(255,255,255,.3)', tile: '#9fc2e3', tile2: '#86aed3', line: 'rgba(15,35,65,.65)' } },
    { id: 'menta', name: 'Menta', price: 20, v: { bg: '#b6dcc4', bg2: '#8fc4a5', card: '#d4ebdc', ink: '#1d4631', 'ink-soft': '#47755b', accent: '#2f9a5a', 'accent-dark': '#217a45', panel: '#d4ebdc', msg: 'rgba(255,255,255,.3)', tile: '#9fd0b3', tile2: '#86bd9b', line: 'rgba(20,50,35,.65)' } },
    { id: 'algodao', name: 'Algodão-doce', price: 25, v: { bg: '#f0bdd4', bg2: '#e39dbe', card: '#f8d9e6', ink: '#5a2540', 'ink-soft': '#8e5071', accent: '#d9548f', 'accent-dark': '#b53c72', panel: '#f8d9e6', msg: 'rgba(255,255,255,.3)', tile: '#eca9c7', tile2: '#dd92b5', line: 'rgba(80,25,55,.6)' } },
    { id: 'noite', name: 'Noite roxa', price: 30, v: { bg: '#1c1838', bg2: '#33265c', card: '#30284f', ink: '#ece6ff', 'ink-soft': '#b3a8d9', accent: '#9b7bff', 'accent-dark': '#7656e6', panel: '#30284f', msg: 'rgba(255,255,255,.09)', tile: '#e4dcf7', tile2: '#4e457c', line: 'rgba(10,6,25,.7)' } },
  ];
  const PALETTES = [
    { id: 'padrao', name: 'Cachorro', set: 'cao', price: 0, h: { vermelho: '#d9706f', amarelo: '#e6bb45', azul: '#5f7fc0', roxo: '#9b7bd6', rosa: '#f07fb5', cinza: '#a9bddb', verde: '#a6d58b', laranja: '#f0a35e', marrom: '#b0704c', bege: '#f3e4cc' } },
    { id: 'pastel', name: 'Fazenda', set: 'fazenda', price: 10, h: { vermelho: '#f1a5a0', amarelo: '#f7e08f', azul: '#a5c3f0', roxo: '#c9b2ec', rosa: '#f8c4dc', cinza: '#c9cdd2', verde: '#aedcb2', laranja: '#f7c796', marrom: '#cfae92', bege: '#fbf3e3' } },
    { id: 'terra', name: 'Floresta', set: 'floresta', price: 15, h: { vermelho: '#c0605a', amarelo: '#d9b256', azul: '#5f86a8', roxo: '#8b6fa6', rosa: '#c98a9c', cinza: '#8d9496', verde: '#6f9a6a', laranja: '#d08a4e', marrom: '#8a634a', bege: '#eadfca' } },
    { id: 'doce', name: 'Mar', set: 'mar', price: 20, h: { vermelho: '#ff7a85', amarelo: '#ffd35c', azul: '#5eb6ff', roxo: '#b48cff', rosa: '#ff9ad1', cinza: '#b8c0cc', verde: '#5fd69a', laranja: '#ffa04d', marrom: '#b9825a', bege: '#fff1d6' } },
    { id: 'joia', name: 'Savana', set: 'savana', price: 25, h: { vermelho: '#d6455d', amarelo: '#e0b020', azul: '#2f7fd6', roxo: '#7e4fd0', rosa: '#d9549c', cinza: '#7f8a99', verde: '#2fa86a', laranja: '#e0782c', marrom: '#7a4f35', bege: '#d9cdb5' } },
  ];
  const curPal = () => PALETTES.find((x) => x.id === save.palettes.selected) || PALETTES[0];
  const hexOf = (col) => curPal().h[col.id] || col.hex;
  const fillOf = (hex) => `linear-gradient(155deg, color-mix(in srgb, ${hex} 92%, #fff), ${hex})`;
  const F = (x) => '<g stroke="none">' + x + '</g>';
  const LN = (x, w) => '<g fill="none" stroke-width="' + (w || 2.4) + '" stroke-linecap="round" stroke-linejoin="round">' + x + '</g>';
  const STAR = 'M12 2l2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.3l7.1-.7z';
  const SUN = F('<circle cx="12" cy="12" r="4.5"/>') + LN('<path d="M12 2V5M12 19V22M2 12H5M19 12H22M5 5L7 7M17 17L19 19M19 5L17 7M5 19L7 17"/>');
  const DROP = F('<path d="M12 2Q20 11 20 15A8 8 0 0 1 4 15Q4 11 12 2Z"/>');
  const PAT_CAO = {
    vermelho: '<g stroke="none"><path d="M12 21C5 15 2 11.5 2 8c0-3 2.3-5 5-5 2 0 4 1.2 5 3 1-1.8 3-3 5-3 2.7 0 5 2 5 5 0 3.5-3 7-10 13z"/></g>',
    amarelo: '<g stroke="none"><g transform="translate(12 12) rotate(-45) scale(1.1) translate(-12 -12)"><path d="M7.5 9.5H16.5A3 3 0 1 1 20.5 12A3 3 0 1 1 16.5 14.5H7.5A3 3 0 1 1 3.5 12A3 3 0 1 1 7.5 9.5Z"/></g></g>',
    azul: '<circle cx="12" cy="12" r="9" fill="none" stroke-width="2.4"/><path d="M4 9q8 4 16 0" fill="none" stroke-width="2.2"/>',
    roxo: '<g stroke="none"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.700 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.3l7.1-.7z"/></g>',
    rosa: '<g stroke="none"><circle cx="5" cy="5" r="2.2"/><circle cx="12" cy="5" r="2.2"/><circle cx="19" cy="5" r="2.2"/><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="12" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/></g>',
    cinza: '<path d="M2 9q4-4 8 0t8 0 4 0M2 17q4-4 8 0t8 0 4 0" fill="none" stroke-width="2.6" stroke-linecap="round"/>',
    verde: '<g stroke="none"><path d="M4 20C4 9 10 4 20 4c0 10-6 16-16 16z"/></g><path d="M5 19L14 10" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1.6"/>',
    laranja: '<g stroke="none"><path d="M12 2l10 10-10 10L2 12z"/></g>',
    marrom: '<path d="M2 16l5-8 5 8 5-8 5 8" fill="none" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>',
    bege: '<circle cx="12" cy="12" r="7" fill="none" stroke-width="3.2"/>',
  };

  const PAT_FAZENDA = {
    vermelho: F('<path d="M12 8Q5 5 4 12Q4 20 9 21Q12 19 15 21Q20 20 20 12Q19 5 12 8Z"/>'),
    amarelo: F('<path d="M12 3Q19 3 19 14A7 7 0 0 1 5 14Q5 3 12 3Z"/>'),
    azul: F('<path d="M7 18Q2 18 3 13Q4 10 8 11Q9 6 14 7Q18 8 18 12Q22 12 21 16Q20 18 17 18Z"/>'),
    roxo: F('<circle cx="8" cy="9" r="3"/><circle cx="14" cy="9" r="3"/><circle cx="11" cy="14" r="3"/><circle cx="17" cy="14" r="3"/><circle cx="11" cy="19" r="2.5"/>'),
    rosa: LN('<ellipse cx="12" cy="12" rx="9" ry="6.5"/>') + F('<circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/>'),
    cinza: LN('<path d="M6 20V11A6 6 0 0 1 18 11V20"/>'),
    verde: F('<circle cx="12" cy="7" r="3.4"/><circle cx="17" cy="12" r="3.4"/><circle cx="12" cy="17" r="3.4"/><circle cx="7" cy="12" r="3.4"/>'),
    laranja: F('<path d="M17 4L20 7L9 21Q5 20 4 16Z"/>'),
    marrom: LN('<path d="M4 20V8M12 20V8M20 20V8M3 12H21M3 17H21"/>'),
    bege: LN('<path d="M12 21V6M12 9Q8 9 7 5Q11 5 12 9M12 9Q16 9 17 5Q13 5 12 9M12 14Q8 14 7 10M12 14Q16 14 17 10"/>', 2),
  };
  const PAT_FLORESTA = {
    vermelho: F('<path d="M3 12Q3 4 12 4Q21 4 21 12Z"/><rect x="9.5" y="12" width="5" height="8" rx="2"/>'),
    amarelo: SUN,
    azul: DROP,
    roxo: F('<path d="M16 3A9 9 0 1 0 21 15A7 7 0 0 1 16 3Z"/>'),
    rosa: F('<circle cx="12" cy="6" r="3.2"/><circle cx="18" cy="10.5" r="3.2"/><circle cx="15.5" cy="18" r="3.2"/><circle cx="8.5" cy="18" r="3.2"/><circle cx="6" cy="10.5" r="3.2"/><circle cx="12" cy="12.5" r="2.6"/>'),
    cinza: LN('<path d="M5 20Q5 6 20 4Q20 16 7 19M5 20L14 11"/>'),
    verde: F('<path d="M12 2L19 11H15L20 18H4L9 11H5Z"/><rect x="11" y="18" width="2" height="4"/>'),
    laranja: F('<path d="M6 11H18Q18 20 12 21Q6 20 6 11Z"/><path d="M5 11Q5 5 12 5Q19 5 19 11Z"/>'),
    marrom: LN('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>'),
    bege: LN('<path d="M3 12Q12 22 21 12M6 12Q12 18 18 12"/>'),
  };
  const PAT_MAR = {
    vermelho: F('<ellipse cx="10" cy="12" rx="7" ry="4.6"/><path d="M15 12L22 6.5V17.5Z"/>'),
    amarelo: F('<path d="M12 21L3 10Q4 3 12 3Q20 3 21 10Z"/>'),
    azul: LN('<circle cx="8" cy="15" r="4.5"/><circle cx="16.5" cy="8" r="3"/><circle cx="17" cy="17" r="1.8"/>'),
    roxo: F('<path d="' + STAR + '"/>'),
    rosa: LN('<path d="M12 21V11M12 15L7 10V6M12 13L17 9V5"/>'),
    cinza: LN('<path d="M2 9q4-4 8 0t8 0 4 0M2 17q4-4 8 0t8 0 4 0" />', 2.6),
    verde: LN('<path d="M8 21Q4 15 8 11T8 3M15 21Q11 15 15 11T15 5"/>'),
    laranja: DROP,
    marrom: LN('<path d="M12 4V20M7 9H17M5 14Q6 20 12 20Q18 20 19 14"/><circle cx="12" cy="4.5" r="1.8"/>'),
    bege: LN('<circle cx="12" cy="12" r="7"/>', 3) + F('<circle cx="9.5" cy="9.5" r="1.6"/>'),
  };
  const PAT_SAVANA = {
    vermelho: LN('<path d="M5 4L9 20M11 3L14 21M17 4L19 20"/>', 3),
    amarelo: F('<path d="M6 7L11 5L13 10L8 12Z"/><path d="M14 13L19 12L18 18L13 19Z"/><path d="M5 15L9 14L10 19L5 20Z"/>'),
    azul: F('<path d="' + STAR + '"/>'),
    roxo: F('<path d="M7 4H17L22 10L12 21L2 10Z"/>'),
    rosa: F('<ellipse cx="7" cy="9" rx="4.5" ry="5" transform="rotate(-20 7 9)"/><ellipse cx="17" cy="9" rx="4.5" ry="5" transform="rotate(20 17 9)"/><ellipse cx="8" cy="17" rx="3.5" ry="4"/><ellipse cx="16" cy="17" rx="3.5" ry="4"/>'),
    cinza: LN('<path d="M5 4Q6 14 10 20M11 3Q12 13 15 20M17 5Q18 13 20 19"/>', 2.8),
    verde: LN('<path d="M12 21V10M12 10Q6 6 3 10M12 10Q18 6 21 10M12 10Q8 3 4 4M12 10Q16 3 20 4"/>'),
    laranja: SUN,
    marrom: LN('<path d="M12 3L20 8V16L12 21L4 16V8Z"/><path d="M12 3V21M4 8L20 16M20 8L4 16"/>', 1.8),
    bege: LN('<circle cx="12" cy="12" r="7"/>', 3),
  };
  const PATSETS = { cao: PAT_CAO, fazenda: PAT_FAZENDA, floresta: PAT_FLORESTA, mar: PAT_MAR, savana: PAT_SAVANA };
  const isLight = (hex) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) > 170; };
  function patUri(id, hex, set) {
    const c = isLight(hex) ? 'rgba(80,45,25,.13)' : 'rgba(255,255,255,.2)';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${c}" stroke="${c}">${(PATSETS[set || curPal().set] || PAT_CAO)[id] || ''}</svg>`;
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }
  const tileBg = (col, size) => { const hex = hexOf(col); return `${patUri(col.id, hex)} center / ${size} no-repeat, ${fillOf(hex)}`; };
  function applyTheme() {
    const t = THEMES.find((x) => x.id === save.themes.selected) || THEMES[0];
    for (const k in t.v) document.documentElement.style.setProperty('--' + k, t.v[k]);
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', t.v.bg);
  }
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* sem storage */ } }

  /* ---------- Utilidades de UI ---------- */
  const screens = ['menu', 'game', 'shop', 'options'];
  function show(name) {
    screens.forEach((s) => $('#screen-' + s).classList.toggle('active', s === name));
    if (name === 'menu') renderMenu();
    if (name === 'shop') renderShop();
    if (name === 'options') renderOptions();
  }
  let toastTimer = null;
  function toast(text) {
    const t = $('#toast'); t.textContent = text; t.classList.remove('hidden');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
  }
  function modal(html, buttons) {
    const card = $('#modal-card'); card.innerHTML = html;
    buttons.forEach((b) => {
      const el = document.createElement('button');
      el.className = 'btn ' + (b.cls || ''); el.textContent = b.label;
      el.addEventListener('click', () => { closeModal(); b.fn && b.fn(); });
      card.appendChild(el);
    });
    $('#modal').classList.remove('hidden');
  }
  function closeModal() { $('#modal').classList.add('hidden'); }
  function setMsg(text, cls) { const m = $('#message'); m.textContent = text; m.className = 'message' + (cls ? ' ' + cls : ''); }
  const skinSvg = (id, cls) => Art.svg(Art.byId(id), cls);

  /* ---------- Latido ---------- */
  let lastBark = 0;
  function bark(svg, inBoard) {
    if (!svg) return;
    const now = Date.now();
    if (now - lastBark < 900) return; // limite: sem latir em sequência
    lastBark = now;
    A.init(); A.sfx('bark');
    svg.classList.remove('new', 'bark'); void svg.getBoundingClientRect(); svg.classList.add('bark');
    setTimeout(() => svg.classList.remove('bark'), 750);
    const host = inBoard ? $('#fx') : svg.closest('.menu-logo');
    const r = svg.getBoundingClientRect(), h = host.getBoundingClientRect();
    const b = document.createElement('div'); b.className = 'bark-bubble'; b.textContent = 'Au! Au!';
    b.style.left = (r.left - h.left + r.width * .7) + 'px'; b.style.top = (r.top - h.top - 4) + 'px';
    host.appendChild(b); setTimeout(() => b.remove(), 900);
  }

  /* ---------- Menu ---------- */
  function renderMenu() {
    $('#menu-logo').innerHTML = skinSvg(save.skins.selected);
    $('#menu-points').textContent = save.points;
    const resume = save.run && save.run.mode === 'campaign';
    $('#btn-play').textContent = resume ? 'Continuar (Fase ' + save.run.level + ')' : 'Jogar (Fase ' + save.level + ')';
  }

  /* ---------- Jogo ---------- */
  let G = null;
  const levelSize = (lv) => lv <= 20
    ? 6 + Math.floor((lv - 1) / 5) // começo: do mais fácil (6x6) subindo até 9x9
    : 6 + Math.floor(L.mulberry32((levelSeed(lv) ^ 0x9e3779b1) >>> 0)() * 5); // depois: tamanho aleatório de 6x6 a 10x10
  const levelSeed = (lv) => 1000 + lv * 37;

  function startCampaign() {
    A.init();
    const r = save.run;
    if (r && r.mode === 'campaign') startGame({ mode: 'campaign', level: r.level, n: r.n, seed: r.seed }, r);
    else startGame({ mode: 'campaign', level: save.level, n: levelSize(save.level), seed: levelSeed(save.level) });
  }

  function startGame(cfg, resume) {
    const n = cfg.n;
    const puz = L.generate(n, cfg.seed);
    const colors = L.pickColors(n, cfg.seed);
    G = Object.assign({}, cfg, {
      puz, colors, names: colors.map((c) => c.name),
      marks: new Uint8Array(n * n), pugs: new Int8Array(n).fill(-1),
      lives: START_LIVES, time: 0, dirty: false, lastTap: null, streak: 0, done: false, hl: null, hlTimer: null,
    });
    if (resume) {
      (resume.marks || []).forEach((i) => { G.marks[i] = 1; });
      (resume.pugs || []).forEach((c, r) => { if (r < n) G.pugs[r] = c; });
      G.lives = Math.min(START_LIVES, resume.lives || START_LIVES);
      G.dirty = !!resume.dirty; G.time = resume.time || 0;
    }
    // em algumas fases (chance baixa, fixa por fase) já começa com 1 pug colocado
    let startPug = false;
    if (!resume && L.mulberry32((cfg.seed ^ 0x5bd1e995) >>> 0)() < 0.15) {
      const r = Math.floor(L.mulberry32((cfg.seed ^ 0x2545f491) >>> 0)() * n), c = G.puz.solution[r];
      G.pugs[r] = c; autoMark(r, c); startPug = true;
    }
    G.pugHtml = skinSvg(save.skins.selected);
    buildBoard();
    updateHUD();
    setMsg(startPug ? 'Esta fase já começou com um pug no lugar! 🐶' : DEFAULT_MSG);
    show('game');
    saveRun();
    if (!save.tutorialDone) showTutorial(0);
  }

  function saveRun() {
    if (!G || G.done) return;
    save.run = {
      mode: G.mode, level: G.level || 0, n: G.n, seed: G.seed, lives: Math.min(START_LIVES, G.lives), dirty: G.dirty, time: G.time,
      pugs: Array.from(G.pugs), marks: Array.from(G.marks).reduce((a, v, i) => (v ? (a.push(i), a) : a), []),
    };
    persist();
  }

  function buildBoard() {
    const { n } = G, b = $('#board');
    b.style.setProperty('--n', n);
    b.innerHTML = '';
    const reg = G.puz.regions;
    for (let i = 0; i < n * n; i++) {
      const r = (i / n) | 0, c = i % n, g = reg[i];
      const el = document.createElement('div');
      el.className = 'cell'; el.dataset.i = i;
      el.style.background = tileBg(G.colors[g], '62%');
      const f = (cond) => (cond ? '3px' : '0px');
      el.style.setProperty('--tt', f(r === 0 || reg[i - n] !== g));
      el.style.setProperty('--tb', f(r === n - 1 || reg[i + n] !== g));
      el.style.setProperty('--tl', f(c === 0 || reg[i - 1] !== g));
      el.style.setProperty('--tr', f(c === n - 1 || reg[i + 1] !== g));
      b.appendChild(el);
    }
    renderAll();
  }

  function cellEl(i) { return $('#board').children[i]; }
  function renderCell(i, animate) {
    const el = cellEl(i), r = (i / G.n) | 0, c = i % G.n;
    const col = G.colors[G.puz.regions[i]], plain = G.pugs[r] === c || G.marks[i];
    el.style.background = plain ? fillOf(hexOf(col)) : tileBg(col, '62%');
    el.innerHTML = G.pugs[r] === c ? (animate ? G.pugHtml.replace('class="pug"', 'class="pug new"') : G.pugHtml) : (G.marks[i] ? '<span class="x">' + PAW + '</span>' : '');
  }
  function renderAll() { for (let i = 0; i < G.n * G.n; i++) renderCell(i); }

  const PAW = '<svg class="paw" viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="16" rx="5.2" ry="4.4"/><ellipse cx="5" cy="10.5" rx="2.2" ry="2.9" transform="rotate(-18 5 10.5)"/><ellipse cx="9.3" cy="5.8" rx="2.2" ry="3" transform="rotate(-6 9.3 5.8)"/><ellipse cx="14.7" cy="5.8" rx="2.2" ry="3" transform="rotate(6 14.7 5.8)"/><ellipse cx="19" cy="10.5" rx="2.2" ry="2.9" transform="rotate(18 19 10.5)"/></svg>';
  const BONE = (off) => boneIcon('life' + (off ? ' off' : ''));

  const fmtTime = (t) => Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  let tickN = 0;
  setInterval(() => {
    if (!G || G.done || !$('#screen-game').classList.contains('active') || !$('#modal').classList.contains('hidden')) return;
    G.time++; $('#game-time').textContent = fmtTime(G.time);
    if (++tickN % 5 === 0) saveRun();
  }, 1000);

  function renderChips() {
    const box = $('#chips'); if (!G) return;
    const reg = G.puz.regions, n = G.n, done = new Set();
    for (let r = 0; r < n; r++) if (G.pugs[r] >= 0 && G.pugs[r] != null) done.add(reg[r * n + G.pugs[r]]);
    const key = curPal().id + G.colors.map((c) => c.id).join();
    if (box.dataset.key !== key) {
      box.dataset.key = key; box.innerHTML = '';
      G.colors.forEach((col) => { const d = document.createElement('div'); d.className = 'chip'; d.style.background = tileBg(col, '70%'); box.appendChild(d); });
    }
    Array.from(box.children).forEach((d, g) => {
      const ok = done.has(g);
      d.classList.toggle('ok', ok);
      d.innerHTML = ok ? G.pugHtml : '';
    });
  }

  function updateHUD() {
    renderChips();
    $('#game-level').textContent = G.level;
    $('#game-time').textContent = fmtTime(G.time || 0);
    $('#game-points').textContent = save.points;
    $('#game-lives').innerHTML = BONE(false).repeat(Math.max(0, G.lives)) + BONE(true).repeat(Math.max(0, START_LIVES - G.lives));
    for (const t of BONUS_TYPES) {
      $('#count-' + t).textContent = save.bonuses[t];
      $('#bonus-' + t).disabled = save.bonuses[t] <= 0;
    }
    $('#bonus-pug-icon').innerHTML = skinSvg(save.skins.selected);
    $('#bonus-life-icon').innerHTML = boneIcon('big');
  }

  function clearHint() {
    if (!G || !G.hl) return;
    clearTimeout(G.hlTimer);
    G.hl.show.concat(G.hl.elim).forEach((i) => cellEl(i).classList.remove('hl', 'hl-elim'));
    G.hl = null;
  }

  // Marca X em tudo que ficou impossível depois de um acerto: cor, linha, coluna e vizinhos.
  function autoMark(r, c) {
    const n = G.n, reg = G.puz.regions, g = reg[r * n + c];
    for (let i = 0; i < n * n; i++) {
      const ri = (i / n) | 0, ci = i % n;
      if (ri === r || ci === c || reg[i] === g || (Math.abs(ri - r) <= 1 && Math.abs(ci - c) <= 1)) G.marks[i] = 1;
    }
    G.marks[r * n + c] = 0;
  }

  function onCellTap(i) {
    if (!G || G.done) return;
    A.init();
    clearHint();
    setMsg(DEFAULT_MSG);
    const n = G.n, r = (i / n) | 0, c = i % n;
    if (G.pugs[r] === c) { G.lastTap = null; bark(document.querySelector('#board .cell[data-i="' + i + '"] .pug'), true); return; }
    const now = Date.now(), last = G.lastTap;
    if (last && last.i === i && now - last.t <= DOUBLE_MS) {
      // segundo toque rápido: desfaz o risco do primeiro toque e coloca o pug
      G.marks[i] = last.prev; G.lastTap = null; renderCell(i);
      tryPlace(r, c);
      return;
    }
    // um toque: alterna o X (não é aqui)
    G.lastTap = { i, t: now, prev: G.marks[i] };
    G.marks[i] ^= 1; A.sfx('mark'); renderCell(i); saveRun();
  }

  function tryPlace(r, c, viaBonus) {
    const n = G.n, i = r * n + c;
    if (G.puz.solution[r] === c) {
      const before = Uint8Array.from(G.marks);
      G.pugs[r] = c;
      autoMark(r, c);
      // redesenha só o que mudou (os pugs antigos não "pulam" de novo)
      for (let k = 0; k < n * n; k++) if (k === i || before[k] !== G.marks[k]) renderCell(k, k === i);
      renderChips();
      const finished = Array.from(G.pugs).every((x) => x >= 0);
      A.sfx('place');
      setTimeout(() => { const pl = placedCells(); if (G && pl.length >= 2 && !G.done) lookAround([i, pl.filter((x) => x !== i)[Math.floor(Math.random() * (pl.length - 1))]]); }, 380);
      if (!viaBonus) {
        G.streak++;
        const word = COMBO_WORDS[Math.min(G.streak, COMBO_WORDS.length) - 1];
        A.say(word, Math.min(G.streak, COMBO_WORDS.length) - 1); showCombo(word, G.streak);
      }
      saveRun();
      if (finished) win();
    } else {
      G.lives--; G.dirty = true; G.streak = 0; G.marks[i] = 1; renderCell(i);
      const el = cellEl(i); el.classList.add('wrong'); setTimeout(() => el.classList.remove('wrong'), 450);
      A.sfx('error');
      setMsg('Aí não era! Esse quadrado agora está riscado.', 'bad');
      updateHUD(); saveRun();
      if (G.lives <= 0) lose();
    }
  }

  function win() {
    G.done = true;
    const got = [];
    for (let k = 0; k < (G.dirty ? 0 : 1); k++) { const t = BONUS_TYPES[Math.floor(Math.random() * 3)]; save.bonuses[t]++; got.push(t); }
    save.points += 1; save.solved += 1;
    save.level = Math.max(save.level, G.level + 1);
    save.run = null; persist(); updateHUD();
    A.sfx('win');
    setTimeout(() => modal(
      `<div class="pug-big">${G.pugHtml}</div><h2>Fase completa!</h2><p>+1 ponto 🐾</p>` +
      (got.length ? `<div class="reward">${got.map((t) => `<span>${BONUS_NAMES[t]}</span>`).join('')}</div>` : '<p class="hint-small">Sem bônus desta vez: ganhe um vencendo sem errar e sem usar bônus.</p>'),
      [
        { label: 'Próxima fase', cls: 'primary', fn: () => startCampaign() },
        { label: 'Menu', fn: () => show('menu') },
      ]
    ), 900);
  }

  function lose() {
    G.done = true; save.run = null; persist();
    A.sfx('lose');
    const cfg = { mode: G.mode, level: G.level, n: G.n, seed: G.seed };
    modal('<h2>Acabaram as vidas</h2><p>Os pugs precisam de mais um tempinho para pensar. Tente de novo!</p>', [
      { label: 'Tentar de novo', cls: 'primary', fn: () => startGame(cfg) },
      { label: 'Menu', fn: () => show('menu') },
    ]);
  }



  /* ---------- Pugs olhando uns para os outros ---------- */
  let lookTimer = null;
  function setLook(from, to) {
    const svg = cellEl(from) && cellEl(from).querySelector('svg');
    if (!svg) return;
    const n = G.n;
    const dx = (to % n) - (from % n), dy = ((to / n) | 0) - ((from / n) | 0), len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len, st = svg.style;
    st.setProperty('--rot', (ux * 7).toFixed(1) + 'deg');
    st.setProperty('--lx', (ux * 2.4).toFixed(1) + 'px'); st.setProperty('--ly', (uy * 1.6).toFixed(1) + 'px');
    st.setProperty('--sy', '-17px'); st.setProperty('--sr', (ux * -4).toFixed(1) + 'deg');
    st.setProperty('--ex', (ux * 3.4).toFixed(1) + 'px'); st.setProperty('--ey', (uy * 2.6).toFixed(1) + 'px');
  }
  function clearLook(i) {
    const svg = cellEl(i) && cellEl(i).querySelector('svg');
    if (svg) ['--rot', '--lx', '--ly', '--ex', '--ey', '--sy', '--sr'].forEach((v) => svg.style.removeProperty(v));
  }
  function placedCells() {
    const out = [];
    for (let r = 0; r < G.n; r++) if (G.pugs[r] >= 0) out.push(r * G.n + G.pugs[r]);
    return out;
  }
  // Os pugs se olham de tempos em tempos (em pares); com 2 ou mais no tabuleiro.
  function lookAround(only) {
    if (!G || G.done) return;
    const cells = only || placedCells();
    if (cells.length < 2) return;
    const list = cells.slice().sort(() => Math.random() - 0.5), seen = [];
    for (let k = 0; k < list.length; k += 2) {
      const a = list[k], b = list[k + 1] != null ? list[k + 1] : list[0] === a ? list[1] : list[0];
      setLook(a, b); setLook(b, a); seen.push(a, b);
    }
    setTimeout(() => { if (G) seen.forEach(clearLook); }, 1600);
  }
  function lookLoop() {
    clearTimeout(lookTimer);
    lookTimer = setTimeout(() => {
      if (G && !G.done && $('#screen-game').classList.contains('active') && $('#modal').classList.contains('hidden')) lookAround();
      lookLoop();
    }, 2400 + Math.random() * 2600);
  }

  /* ---------- Arrastar para riscar ---------- */
  let drag = null, dragSuppress = false;
  function cellAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const c = el && el.closest ? el.closest('.cell') : null;
    return c && c.parentNode === $('#board') ? +c.dataset.i : -1;
  }
  function paint(i) {
    const r = (i / G.n) | 0, c = i % G.n;
    if (G.pugs[r] === c || G.marks[i] === drag.val) return;
    G.marks[i] = drag.val; renderCell(i); A.sfx('mark');
  }
  let hovEl = null;
  function setHov(i) {
    const el = i >= 0 ? $('#board').children[i] : null;
    if (el === hovEl) return;
    if (hovEl) hovEl.classList.remove('hov');
    hovEl = el; if (el) el.classList.add('hov');
  }
  function dragDown(e) {
    if (!G || G.done || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const i = cellAt(e.clientX, e.clientY);
    if (e.pointerType !== 'mouse') setHov(i);
    if (i >= 0) drag = { start: i, last: i, active: false, val: 1 };
  }
  function dragMove(e) {
    if (drag && e.pointerType === 'mouse' && e.buttons === 0) { dragUp(); return; } // soltou fora do tabuleiro
    if (!drag || !G) return;
    const i = cellAt(e.clientX, e.clientY);
    if (e.pointerType !== 'mouse') setHov(i);
    if (i < 0 || i === drag.last) return;
    if (!drag.active) {
      drag.active = true; clearHint(); setMsg(DEFAULT_MSG); G.lastTap = null; A.init();
      drag.val = G.marks[drag.start] ? 0 : 1; // começou num X: apaga; começou vazio: risca
      paint(drag.start);
    }
    // preenche também os quadrados pulados quando o dedo anda rápido
    const n = G.n, r0 = (drag.last / n) | 0, c0 = drag.last % n, r1 = (i / n) | 0, c1 = i % n;
    const steps = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
    for (let s = 1; s <= steps; s++) paint(Math.round(r0 + (r1 - r0) * s / steps) * n + Math.round(c0 + (c1 - c0) * s / steps));
    drag.last = i;
  }
  function dragUp() {
    setHov(-1);
    if (!drag) return;
    if (drag.active) { dragSuppress = true; setTimeout(() => { dragSuppress = false; }, 80); saveRun(); }
    drag = null;
  }


  /* ---------- Efeito da palavra de combo ---------- */
  const COMBO_COLORS = [ // [preenchimento, contorno] por nível do combo
    ['#ffe08a', '#a8661c'], ['#ffc15e', '#a8561c'], ['#ffa66b', '#a8401c'], ['#ff8a8a', '#a82a3a'], ['#ff6fae', '#a81c62'],
    ['#c58bff', '#4b1c8a'], ['#82aaff', '#1c3a8a'], ['#5fe0d0', '#0f5a52'], ['#fff06a', '#8a6a00'], ['#ffffff', '#3b1f10'],
  ];
  const SPARKS = ['✨', '⭐', '🐾', '💫'];
  function showCombo(word, streak) {
    const fx = $('#fx'); if (!fx) return;
    const lv = Math.min(streak, COMBO_WORDS.length);
    fx.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'combo-word' + (lv === COMBO_WORDS.length ? ' rainbow' : '');
    el.style.setProperty('--lv', lv);
    el.style.setProperty('--c', COMBO_COLORS[lv - 1][0]);
    el.style.setProperty('--g', COMBO_COLORS[lv - 1][1]);
    el.innerHTML = `${word}!` + (streak >= 2 ? `<small>COMBO x${streak}</small>` : '');
    fx.appendChild(el);
    const count = lv >= 3 ? Math.min(4 + lv * 2, 20) : 0;
    for (let k = 0; k < count; k++) {
      const sp = document.createElement('span'); sp.className = 'spark';
      const ang = Math.random() * Math.PI * 2, dist = 70 + Math.random() * 90;
      sp.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      sp.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      sp.style.animationDelay = Math.random() * 0.12 + 's';
      sp.textContent = SPARKS[Math.floor(Math.random() * SPARKS.length)];
      fx.appendChild(sp);
    }
    if (lv >= 5) { const b = $('#board'); b.classList.remove('glow'); void b.offsetWidth; b.classList.add('glow'); }
    clearTimeout(showCombo.t); showCombo.t = setTimeout(() => { fx.innerHTML = ''; }, 1300);
  }

  /* ---------- Bônus ---------- */
  function useBonus(type) {
    if (!G) return;
    const before = save.bonuses[type];
    const prev = G.dirty; G.dirty = true;
    useBonusInner(type);
    if (save.bonuses[type] >= before) G.dirty = prev; else saveRun();
  }
  function useBonusInner(type) {
    if (!G || G.done) return;
    A.init();
    if (save.bonuses[type] <= 0) return;
    clearHint();
    if (type === 'life') {
      if (G.lives >= MAX_LIVES) { toast('Você já está com o máximo de vidas.'); return; }
      G.lives++; save.bonuses.life--; A.sfx('life'); toast('+1 vida!');
    } else if (type === 'pug') {
      const rows = [];
      for (let r = 0; r < G.n; r++) if (G.pugs[r] < 0) rows.push(r);
      if (!rows.length) return;
      const r = rows[Math.floor(Math.random() * rows.length)];
      save.bonuses.pug--; A.sfx('bonus');
      tryPlace(r, G.puz.solution[r], true);
      if (!G.done) {
        const el = cellEl(r * G.n + G.puz.solution[r]); el.classList.add('hl');
        G.hl = { show: [r * G.n + G.puz.solution[r]], elim: [] };
        G.hlTimer = setTimeout(clearHint, 2500);
        setMsg('Um pug apareceu! Os quadrados que ele bloqueia foram riscados.');
      }
    } else if (type === 'hint') {
      if (!giveHint()) { updateHUD(); return; }
      save.bonuses.hint--; A.sfx('bonus');
    }
    persist(); updateHUD(); saveRun();
  }

  function giveHint() {
    const n = G.n;
    const h = L.findHint(n, G.puz.regions, G.pugs, G.marks, G.names);
    let show = [], elim = [], text;
    if (h) {
      show = h.highlight; elim = h.elim; text = h.text;
      if (h.place == null) elim.forEach((i) => { G.marks[i] = 1; renderCell(i); });
    } else {
      // sem dedução simples: risca um quadrado errado com certeza
      const wrong = [];
      for (let i = 0; i < n * n; i++) if (G.puz.solution[(i / n) | 0] !== i % n && !G.marks[i] && G.pugs[(i / n) | 0] < 0) wrong.push(i);
      if (!wrong.length) { toast('Nenhuma dica necessária: continue assim!'); return false; }
      const i = wrong[Math.floor(Math.random() * wrong.length)];
      elim = [i]; G.marks[i] = 1; renderCell(i);
      text = 'Este quadrado não pode ter pug: se tivesse, o quebra-cabeça não fecharia. Tente a regra de suposição: imagine um pug aqui e veja se alguma cor ou linha fica sem lugar.';
    }
    show.forEach((i) => cellEl(i).classList.add('hl'));
    elim.forEach((i) => cellEl(i).classList.add('hl-elim'));
    G.hl = { show, elim };
    G.hlTimer = setTimeout(clearHint, 9000);
    setMsg('💡 ' + text, 'hint');
    return true;
  }

  /* ---------- Loja ---------- */
  let shopTab = 'skins';
  function renderShop() {
    $('#shop-points').textContent = save.points;
    $('#tab-skins').classList.toggle('on', shopTab === 'skins');
    $('#tab-themes').classList.toggle('on', shopTab === 'themes');
    $('#tab-pal').classList.toggle('on', shopTab === 'pal');
    $('#tab-bonus').classList.toggle('on', shopTab === 'bonus');
    const list = $('#shop-list'); list.innerHTML = '';
    if (shopTab === 'bonus') {
      const items = [
        { t: 'life', name: 'Vida extra', price: 5, icon: boneIcon('big2') },
        { t: 'hint', name: 'Dica', price: 8, icon: '<span class="bulb">💡</span>' },
        { t: 'pug', name: 'Pug direto', price: 12, icon: skinSvg(save.skins.selected) },
      ];
      items.forEach((it) => {
        const card = document.createElement('div'); card.className = 'skin-card';
        card.innerHTML = `<div class="bonus-prev">${it.icon}</div><div class="sname">${it.name}</div><small class="own">Você tem: ${save.bonuses[it.t]}</small>`;
        const btn = document.createElement('button'); btn.className = 'btn';
        btn.textContent = `🐾 ${it.price}`; btn.disabled = save.points < it.price;
        btn.addEventListener('click', () => {
          if (save.points < it.price) return;
          save.points -= it.price; save.bonuses[it.t]++; persist();
          A.sfx('buy'); toast(`+1 ${it.name.toLowerCase()}`); renderShop();
        });
        card.appendChild(btn); list.appendChild(card);
      });
      return;
    }
    if (shopTab === 'pal') {
      PALETTES.forEach((t) => {
        const owned = save.palettes.owned.includes(t.id), sel = save.palettes.selected === t.id;
        const card = document.createElement('div');
        card.className = 'skin-card' + (sel ? ' selected' : '');
        card.innerHTML = '<div class="pal-prev">' + Object.keys(t.h).map((k) => `<i style="background:${patUri(k, t.h[k], t.set).replace(/"/g, "'")} center / 78% no-repeat, ${t.h[k]}"></i>`).join('') + `</div><div class="sname">${t.name}</div>`;
        const btn = document.createElement('button'); btn.className = 'btn';
        if (sel) { btn.textContent = 'Equipada'; btn.disabled = true; }
        else if (owned) { btn.textContent = 'Equipar'; btn.addEventListener('click', () => { save.palettes.selected = t.id; persist(); renderShop(); }); }
        else {
          btn.textContent = `🐾 ${t.price}`; btn.disabled = save.points < t.price;
          btn.addEventListener('click', () => {
            if (save.points < t.price) return;
            save.points -= t.price; save.palettes.owned.push(t.id); save.palettes.selected = t.id; persist();
            A.sfx('buy'); toast(`Paleta ${t.name} desbloqueada!`); renderShop();
          });
        }
        card.appendChild(btn); list.appendChild(card);
      });
      return;
    }
    if (shopTab === 'themes') {
      THEMES.forEach((t) => {
        const owned = save.themes.owned.includes(t.id), sel = save.themes.selected === t.id;
        const card = document.createElement('div');
        card.className = 'skin-card' + (sel ? ' selected' : '');
        card.innerHTML = `<div class="theme-prev" style="background:linear-gradient(165deg,${t.v.bg},${t.v.bg2})"><i style="background:${t.v.card};border:2px solid ${t.v.accent}"></i><i style="background:${t.v.card};border:2px solid ${t.v.accent}"></i><b style="background:${t.v.accent}"></b></div><div class="sname">${t.name}</div>`;
        const btn = document.createElement('button'); btn.className = 'btn';
        if (sel) { btn.textContent = 'Equipado'; btn.disabled = true; }
        else if (owned) { btn.textContent = 'Equipar'; btn.addEventListener('click', () => { save.themes.selected = t.id; persist(); applyTheme(); renderShop(); }); }
        else {
          btn.textContent = `🐾 ${t.price}`; btn.disabled = save.points < t.price;
          btn.addEventListener('click', () => {
            if (save.points < t.price) return;
            save.points -= t.price; save.themes.owned.push(t.id); save.themes.selected = t.id; persist(); applyTheme();
            A.sfx('buy'); toast(`Tema ${t.name} desbloqueado!`); renderShop();
          });
        }
        card.appendChild(btn); list.appendChild(card);
      });
      return;
    }
    Art.SKINS.forEach((s) => {
      const owned = save.skins.owned.includes(s.id), sel = save.skins.selected === s.id;
      const card = document.createElement('div');
      card.className = 'skin-card' + (sel ? ' selected' : '');
      card.innerHTML = Art.svg(s) + `<div class="sname">${s.name}</div>`;
      const btn = document.createElement('button'); btn.className = 'btn';
      if (sel) { btn.textContent = 'Equipado'; btn.disabled = true; }
      else if (owned) { btn.textContent = 'Equipar'; btn.addEventListener('click', () => { save.skins.selected = s.id; persist(); renderShop(); }); }
      else {
        btn.textContent = `🐾 ${s.price}`; btn.disabled = save.points < s.price;
        btn.addEventListener('click', () => {
          if (save.points < s.price) return;
          save.points -= s.price; save.skins.owned.push(s.id); save.skins.selected = s.id; persist();
          A.sfx('buy'); toast(`${s.name} desbloqueado!`); renderShop();
        });
      }
      card.appendChild(btn); list.appendChild(card);
    });
  }


  /* ---------- Tutorial ---------- */
  const TUT_REGIONS = [0, 0, 1, 1, 0, 0, 1, 1, 3, 3, 2, 2, 3, 2, 2, 2];
  const TUT_COLORS = () => ['amarelo', 'azul', 'verde', 'rosa'].map((k) => curPal().h[k]);
  const TUT_SOL = [1, 3, 0, 2];
  function miniBoard(pugs, bad) {
    const pug = skinSvg(save.skins.selected);
    let h = '<div class="mini">';
    for (let i = 0; i < 16; i++) {
      const r = (i / 4) | 0, c = i % 4;
      const has = pugs.includes(i), isBad = bad && bad.includes(i);
      h += `<div class="mc${isBad ? ' bad' : ''}" style="background:${TUT_COLORS()[TUT_REGIONS[i]]}">${has ? pug : ''}</div>`;
    }
    return h + '</div>';
  }
  const TUT_PAGES = [
    { t: 'Objetivo', html: () => miniBoard(TUT_SOL.map((c, r) => r * 4 + c)),
      p: 'O tabuleiro é dividido em cores. Coloque <b>1 pug em cada cor</b>.' },
    { t: 'Linhas e colunas', html: () => miniBoard(TUT_SOL.map((c, r) => r * 4 + c)),
      p: 'Só pode ter <b>1 pug por linha</b> e <b>1 pug por coluna</b>. Aqui tem 4 cores, 4 linhas, 4 colunas e 4 pugs.' },
    { t: 'Sem se tocar', html: () => miniBoard([1, 6], [1, 6]),
      p: 'Os pugs <b>não podem se tocar</b>, nem na diagonal. Esses dois estão errados!' },
    { t: 'Como jogar', html: () => '<div class="tap-demo"><div><b>1 toque</b><span>' + PAW + '</span><small>aqui não tem pug (ou arraste)</small></div><div><b>2 toques rápidos</b><span class="tp"></span><small>coloca o pug</small></div></div>',
      p: 'Dá para <b>arrastar o dedo</b> para riscar vários quadrados de uma vez. Acertou? As patinhas aparecem sozinhas nos quadrados que ficaram impossíveis. Errou? Você perde 1 ' + boneIcon('inl') + '. Se todas as vidas acabarem, a fase recomeça.' },
    { t: 'Dicas e bônus', html: () => '<div class="reward"><span>' + boneIcon('inl') + ' +1 vida</span><span>🐶 Pug direto</span><span>💡 Dica</span></div>',
      p: 'Cada fase vencida dá <b>1 ponto</b> (para skins na loja) e <b>1 bônus aleatório</b> (só se vencer sem errar e sem usar bônus). A dica explica a regra usada. Truque: se uma cor só aparece em uma linha, o pug dessa cor está nela, e o resto da linha fica livre de outras cores!' },
  ];
  function showTutorial(page) {
    page = page || 0;
    const pg = TUT_PAGES[page], last = page === TUT_PAGES.length - 1;
    const card = $('#modal-card');
    card.innerHTML = `<h2>${pg.t}</h2><div class="tut-art">${pg.html()}</div><p>${pg.p}</p>` +
      `<div class="dots">${TUT_PAGES.map((_, i) => `<i class="${i === page ? 'on' : ''}"></i>`).join('')}</div>`;
    const tp = card.querySelector('.tp'); if (tp) tp.innerHTML = skinSvg(save.skins.selected);
    const row = document.createElement('div'); row.className = 'row';
    const mk = (label, cls, fn) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = label; b.addEventListener('click', fn); row.appendChild(b); };
    const finish = () => { save.tutorialDone = true; persist(); closeModal(); };
    if (page > 0) mk('Voltar', '', () => showTutorial(page - 1));
    else mk('Pular', '', finish);
    if (last) mk('Entendi!', 'primary', finish); else mk('Próximo', 'primary', () => showTutorial(page + 1));
    card.appendChild(row);
    $('#modal').classList.remove('hidden');
  }

  /* ---------- Opções ---------- */
  function renderOptions() {
    $('#opt-music').checked = save.settings.music;
    $('#opt-sfx').checked = save.settings.sfx;
    $('#opt-voice').checked = save.settings.voice;
  }
  const encode = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  const decode = (str) => JSON.parse(decodeURIComponent(escape(atob(str.trim()))));

  /* ---------- Eventos ---------- */
  function bind() {
    $('#btn-play').addEventListener('click', startCampaign);
    $('#btn-shop').addEventListener('click', () => { A.init(); show('shop'); });
    $('#btn-tutorial').addEventListener('click', () => { A.init(); showTutorial(0); });
    $('#btn-options').addEventListener('click', () => { A.init(); show('options'); });
    $('#shop-back').addEventListener('click', () => show('menu'));
    $('#opt-back').addEventListener('click', () => show('menu'));
    $('#menu-logo').addEventListener('click', () => bark($('#menu-logo svg'), false));
    $('#tab-skins').addEventListener('click', () => { shopTab = 'skins'; renderShop(); });
    $('#tab-bonus').addEventListener('click', () => { shopTab = 'bonus'; renderShop(); });
    $('#tab-pal').addEventListener('click', () => { shopTab = 'pal'; renderShop(); });
    $('#tab-themes').addEventListener('click', () => { shopTab = 'themes'; renderShop(); });
    const addPts = () => { save.points += 5; persist(); A.init(); A.sfx('mark'); $('#shop-points').textContent = save.points; $('#menu-points').textContent = save.points; if (!$('#screen-shop').classList.contains('hidden') && $('#screen-shop').classList.contains('active')) renderShop(); };
    $('#shop-points').parentElement.addEventListener('click', addPts);
    $('.menu-points').addEventListener('click', addPts);
    $('#btn-back').addEventListener('click', () => { clearHint(); saveRun(); show('menu'); });
    $('#board').addEventListener('click', (e) => {
      if (dragSuppress) return;
      const el = e.target.closest('.cell'); if (el) onCellTap(+el.dataset.i);
    });
    const board = $('#board');
    board.addEventListener('pointerdown', dragDown);
    board.addEventListener('pointermove', dragMove);
    board.addEventListener('pointerup', dragUp);
    window.addEventListener('pointerup', dragUp);
    window.addEventListener('pointercancel', dragUp);
    window.addEventListener('blur', dragUp);
    board.addEventListener('pointercancel', dragUp);
    BONUS_TYPES.forEach((t) => $('#bonus-' + t).addEventListener('click', () => useBonus(t)));

    $('#opt-music').addEventListener('change', (e) => { save.settings.music = e.target.checked; A.init(); A.setMusic(e.target.checked); persist(); });
    $('#opt-sfx').addEventListener('change', (e) => { save.settings.sfx = e.target.checked; A.setSfx(e.target.checked); persist(); });
    $('#opt-voice').addEventListener('change', (e) => { save.settings.voice = e.target.checked; A.setVoice(e.target.checked); persist(); });

    $('#btn-export').addEventListener('click', async () => {
      const code = encode(save); $('#save-code').value = code;
      try { await navigator.clipboard.writeText(code); toast('Código copiado!'); } catch (e) { toast('Copie o código acima.'); }
    });
    $('#btn-import').addEventListener('click', () => {
      try {
        const data = decode($('#save-code').value);
        if (!data || typeof data !== 'object' || data.v !== 1) throw new Error('inválido');
        save = merge(defaults(), data); persist(); applyTheme(); renderOptions(); renderMenu();
        A.configure(save.settings); A.setMusic(save.settings.music);
        toast('Progresso importado!');
      } catch (e) { toast('Código inválido.'); }
    });
    $('#btn-reset').addEventListener('click', () => {
      modal('<h2>Apagar progresso?</h2><p>Pontos, skins, fases e bônus serão perdidos.</p>', [
        { label: 'Apagar tudo', cls: 'danger', fn: () => { save = defaults(); persist(); applyTheme(); A.configure(save.settings); A.setMusic(save.settings.music); renderOptions(); renderMenu(); toast('Progresso apagado.'); } },
        { label: 'Cancelar' },
      ]);
    });
    A.preload(); document.addEventListener('pointerdown', () => A.init(), { once: true });
  }

  A.configure(save.settings);
  bind();
  lookLoop();
  applyTheme();
  renderMenu();
  // Para testes e depuração no console
  window.__pugzzle = { get game() { return G; }, get save() { return save; }, lookAround };
})();

/* Pugzzle - controle do jogo, save, loja e interface */
(function () {
  'use strict';

  const SAVE_KEY = 'pugzzle:save:v1';
  const MAX_LIVES = 5, START_LIVES = 3;
  // Uma palavra por combo (acertos seguidos sem erro). Errou: volta para a primeira.
  const COMBO_WORDS = ['Bom', 'Ótimo', 'Muito bem', 'Excelente', 'Incrível', 'Fantástico', 'Sensacional', 'Épico', 'Perfeito', 'Lendário'];
  const BONUS_TYPES = ['life', 'pug', 'hint'];
  const BONUS_NAMES = { life: '❤️ +1 vida', pug: '🐶 Pug direto', hint: '💡 Dica' };
  const DEFAULT_MSG = '';
  const DOUBLE_MS = 350;

  const $ = (s) => document.querySelector(s);
  const L = window.PugLogic, A = window.PugAudio, Art = window.PugArt;

  /* ---------- Save ---------- */
  const defaults = () => ({
    v: 1, points: 0, level: 1, solved: 0, tutorialDone: false,
    skins: { owned: ['classico'], selected: 'classico' },
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

  /* ---------- Menu ---------- */
  function renderMenu() {
    $('#menu-logo').innerHTML = skinSvg(save.skins.selected);
    $('#menu-points').textContent = save.points;
    const resume = save.run && save.run.mode === 'campaign';
    $('#btn-play').textContent = resume ? 'Continuar (Fase ' + save.run.level + ')' : 'Jogar (Fase ' + save.level + ')';
    const sizes = $('#free-sizes');
    if (!sizes.childElementCount) {
      for (let n = 6; n <= 10; n++) {
        const b = document.createElement('button'); b.textContent = n + '×' + n;
        b.addEventListener('click', () => { A.init(); startGame({ mode: 'free', n, seed: Math.floor(Math.random() * 1e9) }); });
        sizes.appendChild(b);
      }
    }
  }

  /* ---------- Jogo ---------- */
  let G = null;
  const levelSize = (lv) => Math.min(10, 6 + Math.floor((lv - 1) / 5));
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
      lives: START_LIVES, lastTap: null, streak: 0, done: false, hl: null, hlTimer: null,
    });
    if (resume) {
      (resume.marks || []).forEach((i) => { G.marks[i] = 1; });
      (resume.pugs || []).forEach((c, r) => { if (r < n) G.pugs[r] = c; });
      G.lives = resume.lives || START_LIVES;
    }
    G.pugHtml = skinSvg(save.skins.selected);
    buildBoard();
    updateHUD();
    setMsg(DEFAULT_MSG);
    show('game');
    saveRun();
    if (!save.tutorialDone) showTutorial(0);
  }

  function saveRun() {
    if (!G || G.done) return;
    save.run = {
      mode: G.mode, level: G.level || 0, n: G.n, seed: G.seed, lives: G.lives,
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
      el.style.background = G.colors[g].hex;
      const t = r === 0 || reg[i - n] !== g ? 3 : 1;
      const bt = r === n - 1 || reg[i + n] !== g ? 3 : 1;
      const lf = c === 0 || reg[i - 1] !== g ? 3 : 1;
      const rt = c === n - 1 || reg[i + 1] !== g ? 3 : 1;
      el.style.borderWidth = `${t}px ${rt}px ${bt}px ${lf}px`;
      b.appendChild(el);
    }
    renderAll();
  }

  function cellEl(i) { return $('#board').children[i]; }
  function renderCell(i, animate) {
    const el = cellEl(i), r = (i / G.n) | 0, c = i % G.n;
    el.innerHTML = G.pugs[r] === c ? (animate ? G.pugHtml.replace('class="pug"', 'class="pug new"') : G.pugHtml) : (G.marks[i] ? '<span class="x">✕</span>' : '');
  }
  function renderAll() { for (let i = 0; i < G.n * G.n; i++) renderCell(i); }

  function updateHUD() {
    $('#game-mode-label').textContent = G.mode === 'campaign' ? 'Fase' : 'Livre';
    $('#game-level').textContent = G.mode === 'campaign' ? G.level : G.n + '×' + G.n;
    $('#game-points').textContent = save.points;
    $('#game-lives').textContent = '❤️'.repeat(G.lives) + '🖤'.repeat(Math.max(0, START_LIVES - G.lives));
    for (const t of BONUS_TYPES) {
      $('#count-' + t).textContent = save.bonuses[t];
      $('#bonus-' + t).disabled = save.bonuses[t] <= 0;
    }
    $('#bonus-pug-icon').innerHTML = skinSvg(save.skins.selected);
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
    if (G.pugs[r] === c) { G.lastTap = null; return; }
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
      const finished = Array.from(G.pugs).every((x) => x >= 0);
      A.sfx('place');
      if (!viaBonus) {
        G.streak++;
        A.say(COMBO_WORDS[Math.min(G.streak, COMBO_WORDS.length) - 1]);
      }
      saveRun();
      if (finished) win();
    } else {
      G.lives--; G.streak = 0; G.marks[i] = 1; renderCell(i);
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
    for (let k = 0; k < 2; k++) { const t = BONUS_TYPES[Math.floor(Math.random() * 3)]; save.bonuses[t]++; got.push(t); }
    save.points += 1; save.solved += 1;
    if (G.mode === 'campaign') save.level = Math.max(save.level, G.level + 1);
    save.run = null; persist(); updateHUD();
    A.sfx('win');
    const next = G.mode === 'campaign';
    modal(
      `<div class="pug-big">${G.pugHtml}</div><h2>Fase completa!</h2><p>+1 ponto 🐾</p>` +
      `<div class="reward">${got.map((t) => `<span>${BONUS_NAMES[t]}</span>`).join('')}</div>`,
      [
        { label: next ? 'Próxima fase' : 'Jogar de novo', cls: 'primary', fn: () => (next ? startCampaign() : startGame({ mode: 'free', n: G.n, seed: Math.floor(Math.random() * 1e9) })) },
        { label: 'Menu', fn: () => show('menu') },
      ]
    );
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

  /* ---------- Bônus ---------- */
  function useBonus(type) {
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
  function renderShop() {
    $('#shop-points').textContent = save.points;
    const list = $('#shop-list'); list.innerHTML = '';
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
  const TUT_COLORS = ['#f2c94c', '#5b8def', '#6cc070', '#f49ac2'];
  const TUT_SOL = [1, 3, 0, 2];
  function miniBoard(pugs, bad) {
    const pug = skinSvg(save.skins.selected);
    let h = '<div class="mini">';
    for (let i = 0; i < 16; i++) {
      const r = (i / 4) | 0, c = i % 4;
      const has = pugs.includes(i), isBad = bad && bad.includes(i);
      h += `<div class="mc${isBad ? ' bad' : ''}" style="background:${TUT_COLORS[TUT_REGIONS[i]]}">${has ? pug : ''}</div>`;
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
    { t: 'Como jogar', html: () => '<div class="tap-demo"><div><b>1 toque</b><span>✕</span><small>aqui não tem pug</small></div><div><b>2 toques rápidos</b><span class="tp"></span><small>coloca o pug</small></div></div>',
      p: 'Acertou? Os X aparecem sozinhos nos quadrados que ficaram impossíveis. Errou? Você perde 1 ❤️. Se todas as vidas acabarem, a fase recomeça.' },
    { t: 'Dicas e bônus', html: () => '<div class="reward"><span>❤️ +1 vida</span><span>🐶 Pug direto</span><span>💡 Dica</span></div>',
      p: 'Cada fase vencida dá <b>1 ponto</b> (para skins na loja) e <b>2 bônus</b>. A dica explica a regra usada. Truque: se uma cor só aparece em uma linha, o pug dessa cor está nela, e o resto da linha fica livre de outras cores!' },
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
    $('#btn-free-toggle').addEventListener('click', () => $('#free-sizes').classList.toggle('hidden'));
    $('#btn-shop').addEventListener('click', () => { A.init(); show('shop'); });
    $('#btn-tutorial').addEventListener('click', () => { A.init(); showTutorial(0); });
    $('#btn-options').addEventListener('click', () => { A.init(); show('options'); });
    $('#shop-back').addEventListener('click', () => show('menu'));
    $('#opt-back').addEventListener('click', () => show('menu'));
    $('#btn-back').addEventListener('click', () => { clearHint(); saveRun(); show('menu'); });
    $('#board').addEventListener('click', (e) => { const el = e.target.closest('.cell'); if (el) onCellTap(+el.dataset.i); });
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
        save = merge(defaults(), data); persist(); renderOptions(); renderMenu();
        A.configure(save.settings); A.setMusic(save.settings.music);
        toast('Progresso importado!');
      } catch (e) { toast('Código inválido.'); }
    });
    $('#btn-reset').addEventListener('click', () => {
      modal('<h2>Apagar progresso?</h2><p>Pontos, skins, fases e bônus serão perdidos.</p>', [
        { label: 'Apagar tudo', cls: 'danger', fn: () => { save = defaults(); persist(); A.configure(save.settings); A.setMusic(save.settings.music); renderOptions(); renderMenu(); toast('Progresso apagado.'); } },
        { label: 'Cancelar' },
      ]);
    });
    document.addEventListener('pointerdown', () => A.init(), { once: true });
  }

  A.configure(save.settings);
  bind();
  renderMenu();
  // Para testes e depuração no console
  window.__pugzzle = { get game() { return G; }, get save() { return save; } };
})();

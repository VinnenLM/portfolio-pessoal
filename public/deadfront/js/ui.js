/* Deadfront - UI: menus, loja, save, controles */
(function () {
  const COIN = '<i class="coin-ico"></i>';
  const DF = window.DF;
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = 'deadfront_save_v1';

  // ---------- save ----------
  function defaultSave() {
    return { coins: 0, unlocked: 1, stars: {}, weapons: { pistol: true }, wlvl: {}, towers: {}, tlvl: {}, up: {}, steel: false, startWeapon: 'pistol', skins: { default: true }, skin: 'default', sound: true, auto: true };
  }
  let save = defaultSave();
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) save = Object.assign(defaultSave(), JSON.parse(raw)); } catch (e) { /* sem storage */ }
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignora */ } }
  DF.save = save;
  DF.muted = !save.sound;

  // ---------- input ----------
  const touch = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
  const input = DF.input = { mx: 0, my: 0, stick: { x: 0, y: 0, active: false }, mouse: { x: 0, y: 0, has: false }, mouseDown: false, keyFire: false, auto: save.auto, touch, actions: [] };
  if (touch) document.body.classList.add('touch');
  const keys = {};
  function recomputeMove() {
    if (touch && moveStick.active) return;
    input.mx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
    input.my = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  }
  const KEYMAP = { e: 'build', z: 'material', f: 'heal', t: 'trap', x: 'trapType', q: 'weapon', r: 'reload', n: 'skip', enter: 'skip', g: 'tower', v: 'towerType', b: 'gren', c: 'grenType' };
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (!inGame) return;
    if (k === 'escape' || k === 'p') { togglePause(); e.preventDefault(); return; }
    if (paused) return;
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keys[k] = true; recomputeMove(); e.preventDefault(); }
    else if (k === ' ') { input.keyFire = true; e.preventDefault(); }
    else if (KEYMAP[k] && !e.repeat) input.actions.push(KEYMAP[k]);
    else if (k >= '1' && k <= '9' && !e.repeat) input.actions.push('w:' + (parseInt(k, 10) - 1));
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase(); keys[k] = false;
    if (k === ' ') input.keyFire = false;
    recomputeMove();
  });
  const cv = $('game');
  cv.addEventListener('mousemove', (e) => { if (touch) return; input.mouse.x = e.clientX; input.mouse.y = e.clientY; input.mouse.has = true; });
  cv.addEventListener('mousedown', (e) => { if (touch) return; input.mouse.x = e.clientX; input.mouse.y = e.clientY; input.mouse.has = true; if (e.button === 0) input.mouseDown = true; });
  window.addEventListener('mouseup', () => { input.mouseDown = false; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  // analógicos flutuantes
  function makeStick(zoneId, onMove) {
    const zone = $(zoneId), base = zone.querySelector('.stick-base'), knob = zone.querySelector('.stick-knob');
    const st = { active: false, id: -1, cx: 0, cy: 0 };
    const R = 55;
    zone.addEventListener('pointerdown', (e) => {
      if (st.active) return; st.active = true; st.id = e.pointerId; zone.setPointerCapture(e.pointerId);
      const r = zone.getBoundingClientRect(); st.cx = e.clientX; st.cy = e.clientY;
      base.style.left = (e.clientX - r.left) + 'px'; base.style.top = (e.clientY - r.top) + 'px'; knob.style.transform = 'translate(0,0)'; zone.classList.add('active');
      onMove(0, 0, true); e.preventDefault();
    });
    zone.addEventListener('pointermove', (e) => {
      if (!st.active || e.pointerId !== st.id) return;
      let dx = e.clientX - st.cx, dy = e.clientY - st.cy; const d = Math.hypot(dx, dy);
      if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; onMove(dx / R, dy / R, true); e.preventDefault();
    });
    const end = (e) => {
      if (e.pointerId !== st.id) return; st.active = false; zone.classList.remove('active'); onMove(0, 0, false);
    };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
    return st;
  }
  const moveStick = makeStick('zoneL', (x, y, a) => { input.mx = x; input.my = y; if (!a) { input.mx = 0; input.my = 0; } });
  makeStick('zoneR', (x, y, a) => { input.stick.x = x; input.stick.y = y; input.stick.active = a && Math.hypot(x, y) > 0.12; });

  // botões do dock
  document.querySelectorAll('#hud [data-act]').forEach((b) => {
    const fire = (e) => { e.preventDefault(); e.stopPropagation(); if (DF.audioInit) DF.audioInit(); input.actions.push(b.dataset.act); };
    b.addEventListener('pointerdown', fire);
  });

  // áudio precisa de um gesto do usuário para iniciar
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => { if (DF.audioInit) DF.audioInit(); }, { passive: true }));

  // ---------- telas ----------
  const screens = ['menu', 'levels', 'shop', 'help', 'pause', 'result'];
  function show(name) {
    for (const s of screens) $(s).classList.toggle('hidden', s !== name);
    refreshCoins();
  }
  function hideAll() { for (const s of screens) $(s).classList.add('hidden'); }
  function refreshCoins() {
    $('menu-coins').textContent = save.coins;
    document.querySelectorAll('.coins-val').forEach((e) => { e.textContent = save.coins; });
    $('m-sound').textContent = 'SOM: ' + (save.sound ? 'ON' : 'OFF');
    $('p-sound').textContent = 'SOM: ' + (save.sound ? 'ON' : 'OFF');
    $('p-auto').textContent = 'MIRA AUTOMÁTICA: ' + (save.auto ? 'ON' : 'OFF');
  }
  document.querySelectorAll('.coins-corner').forEach((e) => e.addEventListener('click', () => { save.coins += 500; persist(); refreshCoins(); if (DF.sfx) DF.sfx('pickup'); if (!$('shop').classList.contains('hidden')) renderShop(); }));
  document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { click(); show(b.dataset.back); }));
  function click() { if (DF.audioInit) DF.audioInit(); if (DF.sfx) DF.sfx('click'); }
  $('m-play').onclick = () => { click(); renderLevels(); show('levels'); };
  $('m-shop').onclick = () => { click(); renderShop(); show('shop'); };
  $('m-help').onclick = () => { click(); show('help'); };
  const toggleSound = () => { save.sound = !save.sound; DF.muted = !save.sound; if (DF.applyMute) DF.applyMute(); persist(); refreshCoins(); click(); };
  $('m-sound').onclick = toggleSound; $('p-sound').onclick = toggleSound;
  $('p-auto').onclick = () => { save.auto = !save.auto; input.auto = save.auto; persist(); refreshCoins(); };

  // ---------- fases ----------
  function renderLevels() {
    const g = $('level-grid'); g.innerHTML = '';
    DF.LEVELS.forEach((lv, i) => {
      const locked = i >= save.unlocked || (lv.unlock !== undefined && save.unlocked < lv.unlock); const st = save.stars[lv.id] || 0;
      const c = document.createElement('div'); c.className = 'card' + (locked ? ' locked' : '');
      c.innerHTML = '<h4>' + (i + 1) + '. ' + lv.name + '</h4><p>' + lv.blurb + '</p><p>' + (lv.mission ? 'Missão: atravesse o aeroporto até o helicóptero · chefe no final' : 'Ondas: ' + lv.waves + ' + chefe · Portas: ' + countDoors(lv)) + '</p><div class="stars">' + [1, 2, 3].map((n) => '<span class="' + (n <= st ? '' : 'off') + '">★</span>').join('') + '</div>';
      const b = document.createElement('button'); b.className = 'btn primary small'; b.textContent = locked ? '🔒 Bloqueada' : 'JOGAR'; b.disabled = locked;
      b.onclick = () => { click(); startGame(i); };
      c.appendChild(b); g.appendChild(c);
    });
  }
  function countDoors(lv) { let n = 0; for (const r of lv.rooms) for (const d of r.doors) n += 1; return n; }

  // ---------- loja ----------
  let shopTab = 'weapons';
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { shopTab = t.dataset.tab; click(); renderShop(); }));
  function buy(price) { if (save.coins < price) { return false; } save.coins -= price; persist(); return true; }
  function renderShop() {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === shopTab));
    const g = $('shop-list'); g.innerHTML = ''; refreshCoins();
    const card = (html) => { const c = document.createElement('div'); c.className = 'card'; c.innerHTML = html; g.appendChild(c); return c; };
    const btn = (c, label, fn, disabled, cls) => { const b = document.createElement('button'); b.className = 'btn small ' + (cls || ''); b.innerHTML = label; b.disabled = !!disabled; b.onclick = () => { click(); fn(); renderShop(); }; c.appendChild(b); return b; };
    if (shopTab === 'weapons') {
      DF.WEAPON_ORDER.forEach((id) => {
        const w = DF.WEAPONS[id]; const owned = !!save.weapons[id]; const lvl = save.wlvl[id] || 0;
        const c = card('<h4>' + w.name + '</h4><div class="wbig">' + DF.weaponSVG(id) + '</div><p>Dano ' + Math.round(w.dmg * (1 + 0.12 * lvl)) + (w.pellets > 1 ? ' x' + w.pellets : '') + ' · Pente ' + Math.round(w.mag * (1 + 0.1 * lvl)) + ' · Cadência ' + (1 / w.rate).toFixed(1) + '/s' + (w.pierce > 1 ? ' · Perfura' : '') + '</p><div class="lvl-bar"><b style="width:' + (lvl / DF.WEAPON_UP_MAX * 100) + '%"></b></div><p>Melhoria: nível ' + lvl + '/' + DF.WEAPON_UP_MAX + '</p>');
        if (!owned) btn(c, 'Comprar <span class="price">' + COIN + ' ' + w.price + '</span>', () => { if (buy(w.price)) { save.weapons[id] = true; persist(); } }, save.coins < w.price, 'primary');
        else {
          if (lvl < DF.WEAPON_UP_MAX) { const cost = DF.weaponUpCost(id, lvl); btn(c, 'Melhorar <span class="price">' + COIN + ' ' + cost + '</span>', () => { if (buy(cost)) { save.wlvl[id] = lvl + 1; persist(); } }, save.coins < cost); }
          else { const b = document.createElement('p'); b.textContent = 'Nível máximo'; c.appendChild(b); }
          const sel = save.startWeapon === id;
          btn(c, sel ? '✔ Arma inicial' : 'Usar como inicial', () => { save.startWeapon = id; persist(); }, sel, sel ? '' : 'primary');
        }
      });
    } else if (shopTab === 'towers') {
      DF.TOWER_ORDER.forEach((id) => {
        const t = DF.TOWERS[id]; const owned = !!save.towers[id]; const lvl = save.tlvl[id] || 0;
        const mult = 1 + 0.15 * lvl;
        const c = card('<h4>' + t.name + '</h4><div class="tbig">' + DF.towerSVG(id) + '</div><p>' + t.desc + '</p><p>Dano ' + Math.round(t.dmg * mult) + (id === 'flame' ? '/tick + fogo' : id === 'bazooka' ? ' em área' : '') + ' · Alcance ' + t.range + ' · Vida ' + Math.round(t.hp * (1 + 0.1 * lvl)) + ' · Custa ' + t.cost + ' 🔧 na fase</p><div class="lvl-bar"><b style="width:' + (lvl / DF.TOWER_UP_MAX * 100) + '%"></b></div><p>Melhoria: nível ' + lvl + '/' + DF.TOWER_UP_MAX + '</p>');
        if (!owned) btn(c, 'Comprar <span class="price">' + COIN + ' ' + t.price + '</span>', () => { if (buy(t.price)) { save.towers[id] = true; persist(); } }, save.coins < t.price, 'primary');
        else if (lvl < DF.TOWER_UP_MAX) { const cost = DF.towerUpCost(id, lvl); btn(c, 'Melhorar <span class="price">' + COIN + ' ' + cost + '</span>', () => { if (buy(cost)) { save.tlvl[id] = lvl + 1; persist(); } }, save.coins < cost, 'primary'); }
        else { const p = document.createElement('p'); p.textContent = 'Nível máximo'; c.appendChild(p); }
      });
    } else if (shopTab === 'upgrades') {
      DF.UPGRADES.forEach((u) => {
        const lvl = save.up[u.id] || 0;
        const c = card('<h4>' + u.icon + ' ' + u.name + '</h4><p>' + u.desc + '</p><div class="lvl-bar"><b style="width:' + (lvl / u.max * 100) + '%"></b></div><p>Nível ' + lvl + '/' + u.max + '</p>');
        if (lvl < u.max) { const cost = u.base * (lvl + 1); btn(c, 'Comprar <span class="price">' + COIN + ' ' + cost + '</span>', () => { if (buy(cost)) { save.up[u.id] = lvl + 1; persist(); } }, save.coins < cost, 'primary'); }
        else { const p = document.createElement('p'); p.textContent = 'Nível máximo'; c.appendChild(p); }
      });
      const c = card('<h4>🛡️ Barricada de Aço</h4><p>Desbloqueia o material mais resistente (900 de vida, custa 50 de sucata).</p>');
      if (save.steel) { const p = document.createElement('p'); p.textContent = '✔ Desbloqueado'; c.appendChild(p); }
      else btn(c, 'Comprar <span class="price">' + COIN + ' ' + DF.STEEL_PRICE + '</span>', () => { if (buy(DF.STEEL_PRICE)) { save.steel = true; persist(); } }, save.coins < DF.STEEL_PRICE, 'primary');
    } else {
      DF.SKINS.forEach((s) => {
        const owned = !!save.skins[s.id]; const sel = save.skin === s.id;
        const c = card('<h4>' + s.name + '</h4>');
        c.classList.toggle('selected', sel);
        const cvs = document.createElement('canvas'); cvs.width = 110; cvs.height = 90; cvs.className = 'skin-prev'; c.appendChild(cvs); DF.drawSkinPreview(cvs, s);
        if (!owned) btn(c, 'Comprar <span class="price">' + COIN + ' ' + s.price + '</span>', () => { if (buy(s.price)) { save.skins[s.id] = true; save.skin = s.id; persist(); } }, save.coins < s.price, 'primary');
        else btn(c, sel ? '✔ Equipada' : 'Equipar', () => { save.skin = s.id; persist(); }, sel, sel ? '' : 'primary');
      });
    }
  }

  // ---------- jogo ----------
  let engine = null, inGame = false, paused = false, curLevel = 0, lastHud = 0, lastResult = null;
  const els = {
    hpFill: $('hp-fill'), hpText: $('hp-text'), wave: $('wave-info'), scrap: $('scrap-val'), toast: $('toast'), count: $('countdown'),
    bossBar: $('boss-bar'), bossName: $('boss-name'), bossFill: $('boss-fill'), skip: $('btn-skip'),
    wIco: $('w-ico'), wName: $('w-name'), wAmmo: $('w-ammo'), reload: $('reload-fill'), bName: $('b-name'), bCost: $('b-cost'), mIco: $('m-ico'),
    hCount: $('h-count'), tIco: $('t-ico'), tName: $('t-name'), tCount: $('t-count'), slotBuild: $('slot-build'), slotHeal: $('slot-heal'), slotTrap: $('slot-trap'), slotMat: $('slot-mat'), slotTower: $('slot-tower'), slotGren: $('slot-gren'), gIco: $('g-ico'), gName: $('g-name'), gCount: $('g-count'), warn: $('warn'), obj: $('obj-info'), twIco: $('tw-ico'), twName: $('tw-name'), twCost: $('tw-cost')
  };
  function updateHud(G) {
    const now = performance.now(); if (now - lastHud < 90) return; lastHud = now;
    const h = G.hud();
    els.hpFill.style.width = (h.hp / h.maxHp * 100) + '%'; els.hpText.textContent = Math.ceil(h.hp) + ' / ' + h.maxHp;
    els.wave.textContent = h.mission ? 'Missão · Restam ' + h.left : h.wave === 0 ? 'Prepare-se!' : 'Onda ' + h.wave + '/' + h.waves + ' · Restam ' + h.left;
    els.scrap.textContent = h.scrap;
    els.toast.textContent = h.msg; els.toast.style.color = h.msgColor;
    if (h.waveState === 'break' && h.state === 'play') { els.count.classList.remove('hidden'); els.count.textContent = (h.wave === 0 ? 'Primeira onda' : 'Próxima onda') + ' em ' + Math.ceil(h.breakT) + 's'; els.skip.classList.remove('hidden'); }
    else { els.count.classList.add('hidden'); els.skip.classList.add('hidden'); }
    if (h.boss) { els.bossBar.classList.remove('hidden'); els.bossName.textContent = h.boss.name; els.bossFill.style.width = (h.boss.hp / h.boss.max * 100) + '%'; } else els.bossBar.classList.add('hidden');
    els.wIco.innerHTML = DF.weaponSVG(h.wid); els.wName.textContent = h.weapon; els.wAmmo.textContent = h.mag + '/' + (h.reserve === Infinity ? '∞' : h.reserve);
    const rb = els.reload.parentElement; if (h.reload >= 0) { rb.style.display = 'block'; els.reload.style.width = (h.reload * 100) + '%'; } else rb.style.display = 'none';
    els.bName.textContent = h.mat.name; els.bCost.textContent = h.mat.cost + ' 🔧'; els.mIco.innerHTML = DF.matSVG(h.matId);
    els.slotBuild.classList.toggle('glow', h.nearDoor); els.slotBuild.classList.toggle('disabled', h.scrap < h.mat.cost);
    els.hCount.textContent = 'x' + h.medkit; els.slotHeal.classList.toggle('disabled', h.medkit <= 0);
    els.tIco.innerHTML = DF.trapSVG(h.trapId); els.tName.textContent = h.trap.name.length > 9 ? 'Urso' : h.trap.name; els.tCount.textContent = 'x' + h.trapCount; els.slotTrap.classList.toggle('disabled', h.trapCount <= 0);
    if (h.towerInfo) { els.twIco.innerHTML = DF.towerSVG(h.towerInfo.id); els.twName.textContent = h.towerInfo.name.length > 9 ? h.towerInfo.name.slice(0, 8) + '.' : h.towerInfo.name; els.twCost.textContent = h.towerInfo.cost + '🔧 ' + h.towerInfo.count + '/' + h.towerInfo.max; els.slotTower.classList.toggle('disabled', h.scrap < h.towerInfo.cost || h.towerInfo.count >= h.towerInfo.max); }
    else { els.twIco.textContent = '🗼'; els.twName.textContent = 'Torre'; els.twCost.textContent = 'na loja'; els.slotTower.classList.add('disabled'); }
    els.gIco.innerHTML = DF.grenSVG(h.gren.id); els.gName.textContent = h.gren.name; els.gCount.textContent = 'x' + h.gren.count; els.slotGren.classList.toggle('disabled', h.gren.count <= 0 && !Object.values(h.gren.all).some((n) => n > 0));
    els.warn.classList.toggle('hidden', !h.outside);
    if (h.mission) { els.obj.classList.remove('hidden'); els.obj.innerHTML = '🎯 ' + h.mission.step + '/' + h.mission.total + ' · ' + h.mission.text + ' <b>' + h.mission.dist + 'm</b>'; } else els.obj.classList.add('hidden');
    if (DF.musicMode) DF.musicMode(h.boss ? 'boss' : 'game');
  }
  function startGame(level) {
    if (DF.audioInit) DF.audioInit();
    stopGame(); curLevel = level; hideAll(); $('hud').classList.remove('hidden');
    for (const k in keys) keys[k] = false; input.mx = input.my = 0; input.actions.length = 0; input.stick.active = false; input.keyFire = false; input.mouseDown = false;
    inGame = true; paused = false; lastHud = 0;
    engine = DF.Engine.create({ level, canvas: cv, save, onHud: updateHud, onEnd: onEnd });
  }
  function stopGame() { if (engine) engine.stop(); engine = null; inGame = false; if (DF.musicMode) DF.musicMode('menu'); $('hud').classList.add('hidden'); }
  function togglePause() {
    if (!engine || engine.G.state !== 'play') return;
    paused = !paused; engine.pause(paused); $('pause').classList.toggle('hidden', !paused); if (paused) refreshCoins();
  }
  function onEnd(r) {
    lastResult = r; const lv = DF.LEVELS[r.level];
    save.coins += r.coins;
    if (r.win) { save.stars[lv.id] = Math.max(save.stars[lv.id] || 0, r.stars); save.unlocked = Math.max(save.unlocked, Math.min(DF.LEVELS.length, r.level + 2)); }
    persist();
    if (DF.sfx) DF.sfx(r.win ? 'win' : 'lose');
    $('r-title').textContent = r.win ? 'Vitória!' : 'Você caiu...';
    $('r-stars').innerHTML = r.win ? [1, 2, 3].map((n) => '<span class="' + (n <= r.stars ? '' : 'off') + '">★</span>').join('') : '';
    $('r-info').innerHTML = (r.win ? (lv.mission ? 'Missão cumprida: <b>' : 'Local protegido: <b>') + lv.name + '</b><br>' : (lv.mission ? 'Você caiu no aeroporto<br>' : 'Chegou até a onda ' + r.wave + ' de ' + r.waves + '<br>')) + 'Zumbis abatidos: <b>' + r.kills + '</b><br>Moedas ganhas: <b style="color:#ffd86b">' + COIN + ' ' + r.coins + '</b>';
    $('r-next').classList.toggle('hidden', !(r.win && r.level + 1 < DF.LEVELS.length));
    stopGame(); show('result');
  }
  $('btn-pause').addEventListener('pointerdown', (e) => { e.preventDefault(); togglePause(); });
  $('p-resume').onclick = () => { click(); togglePause(); };
  $('p-restart').onclick = () => { click(); $('pause').classList.add('hidden'); startGame(curLevel); };
  $('p-quit').onclick = () => { click(); stopGame(); paused = false; renderLevels(); show('menu'); };
  $('r-next').onclick = () => { click(); startGame(lastResult.level + 1); };
  $('r-retry').onclick = () => { click(); startGame(lastResult.level); };
  $('r-shop').onclick = () => { click(); renderShop(); show('shop'); };
  $('r-menu').onclick = () => { click(); show('menu'); };
  document.addEventListener('visibilitychange', () => { if (document.hidden && inGame && !paused) togglePause(); });

  // debug / testes
  DF._debug = { startGame, get engine() { return engine; }, save, input };
  show('menu');
})();

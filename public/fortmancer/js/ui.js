'use strict';
/* ============================================================
   FORTMANCER — interface (menus, loja, preparação, cartas, opções)
   ============================================================ */
const UI = (() => {
  const $ = s => document.querySelector(s);
  const stage = $('#stage'), ui = $('#ui'), modal = $('#modal'), hud = $('#hud'), skillsEl = $('#skills');
  let prepTab = 'mago', shopTab = 'mage', mapMode = 'map', secret = { n: 0, t: 0 }, resetArm = false, audioOn = false;
  const cache = {};
  const setTxt = (el, v) => { if (cache[el.id] !== v) { cache[el.id] = v; el.textContent = v; } };
  const setW = (el, v) => { if (cache[el.id] !== v) { cache[el.id] = v; el.style.width = v; } };

  function resize() {
    const w = innerWidth, h = innerHeight; let sw = w, sh = w * 9 / 16;
    if (sh > h) { sh = h; sw = h * 16 / 9; }
    stage.style.width = sw + 'px'; stage.style.height = sh + 'px';
    stage.style.setProperty('--u', (sh / 270) + 'px');
  }
  const ic = (name, cls) => `<img class="pi ${cls || ''}" src="${Art.iconURL(name)}" alt="">`;
  const hydrate = root => (root || document).querySelectorAll('[data-ic]').forEach(el => { el.innerHTML = ic(el.dataset.ic); });
  function toast(msg, icon) {
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = (icon ? ic(icon) : '') + '<span></span>'; t.lastChild.textContent = msg;
    $('#toast').appendChild(t); setTimeout(() => t.remove(), 1900);
  }
  const coin = ic('coin');
  const costBtn = (a, extra, c, ok, label) => `<button class="btn sm ${ok ? '' : 'dis'}" data-a="${a}" ${extra}>${label || ''}${coin}${fmt(c)}</button>`;
  const gemBtn = (a, extra, c, ok, label) => `<button class="btn sm violet ${ok ? '' : 'dis'}" data-a="${a}" ${extra}>${label || ''}${ic('gem')}${fmt(c)}</button>`;
  function hydrateCanvases() {
    ui.querySelectorAll('canvas[data-castle]').forEach(c => { const src = Art.castle(Save.d.equip.castle, Game.R.tier).c; c.width = src.width; c.height = src.height; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0); });
    ui.querySelectorAll('canvas[data-petc]').forEach(c => { const src = Art.pet(c.dataset.petc).n; c.width = src.width; c.height = src.height; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0); });
    ui.querySelectorAll('canvas[data-ally]').forEach(c => { const src = Art.ally(c.dataset.ally).n; c.width = src.width; c.height = src.height; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0); });
  }

  /* ---------- HUD ---------- */
  function showHud(on) { hud.classList.toggle('hidden', !on); skillsEl.classList.toggle('hidden', !on); if (on) Object.keys(cache).forEach(k => delete cache[k]); }
  function buildSkills() {
    const R = Game.R; if (!R) return;
    skillsEl.innerHTML = Object.keys(SKILLS).filter(id => R.skills[id] > 0).map(id => {
      const s = SKILLS[id];
      return `<button class="sk" data-a="cast" data-id="${id}" style="--c:${s.color}"><span>${ic(s.icon)}</span><i class="k">${s.key}</i><i class="lv">${R.skills[id]}</i><div class="cd"></div></button>`;
    }).join('');
  }
  function updateHud() {
    const R = Game.R; if (!R || Game.demo) return;
    const c = R.castle;
    setW($('#hpFill'), Math.max(0, c.hp / c.max * 100) + '%');
    setTxt($('#hpTxt'), Math.ceil(Math.max(0, c.hp)) + '/' + c.max);
    $('#shBar').style.display = c.bmax > 0 ? '' : 'none';
    setW($('#shFill'), (c.bmax ? c.barrier / c.bmax * 100 : 0) + '%');
    setTxt($('#waveTxt'), Game.waveLabel());
    setW($('#waveFill'), Game.waveProgress() * 100 + '%');
    setTxt($('#goldTxt').querySelector('b') || $('#goldTxt'), fmt(R.gold));
    const bb = Game.bossBar();
    $('#bossBar').classList.toggle('hidden', !bb);
    if (bb) { setTxt($('#bossName'), bb.name); setW($('#bossFill'), Math.max(0, bb.hp / bb.max * 100) + '%'); }
    skillsEl.querySelectorAll('.sk').forEach(b => {
      const id = b.dataset.id, cd = R.cd[id], mx = R.cdMax[id] || 1;
      b.querySelector('.cd').style.height = cd > 0 ? Math.min(100, cd / mx * 100) + '%' : '0';
      b.classList.toggle('ready', cd <= 0);
    });
  }
  // o contador de ouro precisa de um <b>: garante o elemento
  $('#goldTxt').querySelector('b').id = 'goldB';

  /* ---------- telas ---------- */
  function show(html, cls) { ui.innerHTML = html; ui.className = cls || ''; }
  function clearUI() { ui.innerHTML = ''; ui.className = ''; }

  function runInfo() {
    const r = Save.d.run; if (!r) return '';
    const m = r.mode === 'map' ? 'Campanha — ' + MAPS[r.map].name : r.mode === 'infinite' ? 'Infinito' : 'Boss Rush';
    return `${m} · ${r.mode === 'boss' ? r.bosses + ' chefes' : 'onda ' + (r.wave + 1)}`;
  }
  function showMenu() {
    showHud(false); closeModal(); Game.startDemo();
    const g = Save.d.gems;
    show(`<div class="menu">
        <div class="logo">FORT<span>MANCER</span></div>
        <div class="tag">DEFENDA O CASTELO MÁGICO</div>
        <div class="btns">
          ${Save.d.run ? `<button class="btn big green" data-a="cont">${ic('play')}CONTINUAR</button><div class="sub" style="font-size:calc(var(--u)*6);margin-top:calc(var(--u)*-2)">${runInfo()}</div>` : ''}
          <button class="btn big${Save.d.run ? ' dark' : ''}" data-a="play">${ic('play')}${Save.d.run ? 'NOVO JOGO' : 'JOGAR'}</button>
          <button class="btn violet" data-a="shop">${ic('hat')}LOJA DE SKINS</button>
        </div>
      </div>
      <div class="corner l"><div class="chip" data-a="gems">${ic('gem')}<b>${fmt(g)}</b></div></div>
      <div class="corner"><button class="ibtn" data-a="settings">${ic('gear')}</button><button class="ibtn" data-a="fs">${ic('full')}</button></div>
      <div class="ver">v0.2</div>`, 'screen');
  }

  function showModes() {
    const s = Save.d;
    show(`<div class="full panel">
      <div class="head"><button class="btn sm dark" data-a="menu">${ic('left')}Voltar</button><div class="title">ESCOLHA O MODO</div><div style="width:calc(var(--u)*50)"></div></div>
      <div class="cards3">
        <div class="mode" data-a="mode" data-m="map"><div class="ic">${ic('castle', 'pi4')}</div><h3>CAMPANHA</h3><p>9 mapas, 10 ondas cada, com chefe no final. Vença para liberar o próximo.</p><div class="rec">Mapas: ${Math.min(s.cleared, MAPS.length)}/${MAPS.length} concluídos</div></div>
        <div class="mode" data-a="mode" data-m="infinite"><div class="ic">${ic('inf', 'pi4')}</div><h3>MODO INFINITO</h3><p>Ondas sem fim, chefes a cada 10 ondas e cartas de habilidade para evoluir seu mago.</p><div class="rec">Recorde: onda ${s.best.inf}</div></div>
        <div class="mode" data-a="mode" data-m="boss"><div class="ic">${ic('skull', 'pi4')}</div><h3>BOSS RUSH</h3><p>Enfrente os 12 chefes em sequência, do Rei Slime ao Rei Demônio. Cada vitória rende cartas.</p><div class="rec">Recorde: ${s.best.boss} chefes</div></div>
      </div></div>`, 'screen');
  }

  function showMaps(mode) {
    mapMode = mode; const s = Save.d;
    show(`<div class="full panel">
      <div class="head"><button class="btn sm dark" data-a="play">${ic('left')}Voltar</button><div class="title">${mode === 'map' ? 'CAMPANHA' : 'MODO INFINITO'} — ESCOLHA O MAPA</div><div style="width:calc(var(--u)*50)"></div></div>
      <div class="maps">${MAPS.map((m, i) => {
        const lock = i > s.cleared;
        return `<div class="map ${lock ? 'lock' : ''}" data-a="${lock ? 'locked' : 'map'}" data-i="${i}"><canvas width="160" height="90" data-map="${i}"></canvas><div class="mi"><h3>${m.name}</h3><p>${m.desc}</p><div class="st">${lock ? ic('lock') + 'Vença o anterior' : (mode === 'map' ? (i < s.cleared ? ic('check') + 'Concluído' : ic('sword') + 'Disponível') : 'Recorde: onda ' + s.best.inf)}</div></div></div>`;
      }).join('')}</div></div>`, 'screen');
    ui.querySelectorAll('canvas[data-map]').forEach(c => {
      const m = Art.map(MAPS[+c.dataset.map]), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      x.drawImage(m.back, 0, 0, 480, 270, 0, 0, 160, 90); x.drawImage(m.front, 0, 0, 480, 270, 0, 0, 160, 90);
    });
  }

  /* ---------- preparação entre ondas ---------- */
  function labelFor(w) {
    const R = Game.R;
    if (R.mode === 'map') return `Onda ${w}/${CAMPAIGN_WAVES}`;
    if (R.mode === 'boss') return `Chefe ${w}`;
    return `Onda ${w}`;
  }
  function upItem(id) {
    const R = Game.R, u = UPGRADES[id], lvl = R.up[id], mx = lvl >= u.max, c = upCost(id, lvl);
    return `<div class="it"><div class="ic">${ic(u.icon)}</div><div class="tx"><div class="nm">${u.name}<em>Nv ${lvl}/${u.max}</em></div><div class="ds">${u.desc}</div></div><div class="act">${mx ? '<span class="sub">MÁX</span>' : costBtn('up', `data-id="${id}"`, c, R.gold >= c)}</div></div>`;
  }
  function skillItem(id) {
    const R = Game.R, s = SKILLS[id], l = R.skills[id], mx = l >= SKILL_MAX;
    const c = l === 0 ? s.unlock : Math.round(s.base * Math.pow(s.grow, l - 1));
    const a = skillStats(id, Math.max(1, l)), b = skillStats(id, Math.min(SKILL_MAX, l + 1));
    const prev = (l === 0 || mx) ? `${skillText(id, Math.max(1, l))} · recarga ${a.cd.toFixed(1)}s` : `${skillText(id, l)} → ${skillText(id, l + 1)} · recarga ${a.cd.toFixed(1)}s → ${b.cd.toFixed(1)}s`;
    const fx = l > 0 ? `<br>Efeito visual: nível ${fxTier(l) + 1}/4${fxTier(l) < 3 ? ' (evolui no Nv ' + [3, 5, 7][fxTier(l)] + ')' : ''}` : '';
    return `<div class="it ${l ? 'on' : ''}"><div class="ic">${ic(s.icon)}</div><div class="tx"><div class="nm">${s.name} <span class="gold">[${s.key}]</span><em>${l ? `Nv ${l}/${SKILL_MAX}` : 'Bloqueada'}</em></div><div class="ds">${s.desc}<br>${prev}${fx}</div></div><div class="act">${mx ? '<span class="sub">MÁX</span>' : costBtn('skill', `data-id="${id}"`, c, R.gold >= c, l === 0 ? 'Abrir ' : '')}</div></div>`;
  }
  function allyItem(id) {
    const R = Game.R, a = ALLIES[id], l = R.allies[id], mx = l >= a.max, c = allyCost(id, l);
    const prev = l === 0 ? allyText(id, 1) : mx ? allyText(id, l) : `${allyText(id, l)} → ${allyText(id, l + 1)}`;
    return `<div class="it ${l ? 'on' : ''}"><div class="ic"><canvas data-ally="${id}"></canvas></div><div class="tx"><div class="nm">${a.name}<em>${l ? `Nv ${l}/${a.max}` : 'Não contratado'}</em></div><div class="ds">${a.desc}<br>${prev}</div></div><div class="act">${mx ? '<span class="sub">MÁX</span>' : costBtn('ally', `data-id="${id}"`, c, R.gold >= c, l === 0 ? 'Contratar ' : '')}</div></div>`;
  }
  function petItem(id) {
    const R = Game.R, p = PET_INFO[id], own = !!R.pets[id], c = PET_COST[id];
    return `<div class="it ${own ? 'on' : ''}"><div class="ic"><canvas data-petc="${id}"></canvas></div><div class="tx"><div class="nm">${p.name}<em>${own ? 'Adotado' : 'Pet'}</em></div><div class="ds">${p.desc}<br>Acompanha o mago e ataca sozinho. Dá para ter todos.</div></div><div class="act">${own ? '<span class="sub">COMPRADO</span>' : costBtn('pet', `data-id="${id}"`, c, R.gold >= c, 'Adotar ')}</div></div>`;
  }
  function prepBody() {
    const R = Game.R;
    if (prepTab === 'mago') {
      const hasPet = Object.keys(R.pets).length > 0;
      return ['dmg', 'spd', 'crit', 'gold'].map(upItem).join('') + (hasPet ? upItem('pet') : `<div class="it"><div class="ic">${ic('paw')}</div><div class="tx"><div class="nm">Treino do Pet</div><div class="ds">Compre um pet na aba Aliados para treiná-lo aqui.</div></div></div>`);
    }
    if (prepTab === 'hab') return SKILL_KEYS.map(skillItem).join('');
    if (prepTab === 'ali') return Object.keys(ALLIES).map(allyItem).join('') + Object.keys(PET_COST).map(petItem).join('');
    if (prepTab === 'arm') {
      return R.slots.map((s, i) => {
        const tr = TRAPS[s.type], c = trapCost(s.type, s.lvl), mx = s.lvl >= TRAP_MAX;
        return `<div class="it ${s.lvl ? 'on' : ''}"><div class="ic">${ic(tr.icon)}</div><div class="tx"><div class="nm">Espaço ${i + 1}: ${tr.name}<em>${s.lvl ? `Nv ${s.lvl}/${TRAP_MAX}` : 'Não comprada'}</em></div><div class="ds">${tr.desc}</div></div><div class="act">${mx ? '<span class="sub">MÁX</span>' : costBtn('trap', `data-i="${i}"`, c, R.gold >= c, s.lvl ? 'Melhorar ' : 'Comprar ')}</div></div>`;
      }).join('');
    }
    const c = R.castle, rc = Game.repairCost(), n = R.up.wall + R.up.barrier + R.up.thorns, nxt = Art.TIER_AT[R.tier];
    const pips = [1, 2, 3, 4].map(k => `<i class="${R.tier >= k ? 'on' : ''}"></i>`).join('');
    return `<div class="it on"><div class="ic cp"><canvas data-castle="1"></canvas></div><div class="tx"><div class="nm">Evolução do Castelo<em>Nível visual ${R.tier}/4</em></div><div class="ds">${nxt ? `Melhorias do castelo: ${n}/${nxt} para a próxima evolução (torres, portão, tochas, ouro...).` : 'Castelo no nível máximo!'}</div><div class="tier">${pips}</div></div></div>`
      + `<div class="it on"><div class="ic">${ic('heart')}</div><div class="tx"><div class="nm">Reparar Castelo<em>${Math.ceil(c.hp)}/${c.max}</em></div><div class="ds">Restaura a vida do castelo (1 de ouro a cada 2 de vida).</div></div><div class="act">${c.hp >= c.max - .5 ? '<span class="sub">CHEIO</span>' : costBtn('repair', '', rc, R.gold >= 1)}</div></div>`
      + ['wall', 'barrier', 'thorns'].map(upItem).join('');
  }
  function renderPrep() {
    const R = Game.R; if (!R) return;
    const keep = ui.querySelector('.grid'), st = keep ? keep.scrollTop : 0;
    const info = Game.nextWaveInfo(), w = R.wave + 1;
    const tabs = [['mago', 'hat', 'Mago'], ['hab', 'fire', 'Habilidades'], ['ali', 'bow', 'Aliados'], ['arm', 'spikes', 'Armadilhas'], ['cas', 'castle', 'Castelo']];
    show(`<div class="prep panel">
        <div class="ptop"><div class="tabs">${tabs.map(t => `<button class="tab ${prepTab === t[0] ? 'on' : ''}" data-a="ptab" data-t="${t[0]}">${ic(t[1])}${t[2]}</button>`).join('')}</div>
        <div class="chip">${coin}<b>${fmt(R.gold)}</b></div></div>
        <div class="grid">${prepBody()}</div>
        <div class="pbar"><div class="nextinfo">${info.boss ? `${ic('warn')}<b>CHEFE:</b> ${info.boss.name}` : `Próxima: ${labelFor(w)}`} · Castelo ${Math.ceil(R.castle.hp)}/${R.castle.max}</div>
        <button class="btn sm dark" data-a="savequit">Salvar e sair</button>
        <button class="btn big green" data-a="go">${ic('play')}${info.boss ? 'ENFRENTAR CHEFE' : 'INICIAR ' + labelFor(w).toUpperCase()}</button></div>
      </div>`, 'screen');
    const g = ui.querySelector('.grid'); if (g) g.scrollTop = st;
    hydrateCanvases();
    showHud(false);
  }
  function showCards(bonus) {
    const R = Game.R, cards = Game.drawCards();
    show(`<div class="cardwrap"><div class="title">ESCOLHA UMA CARTA</div><div class="sub" style="font-size:calc(var(--u)*7)">${labelFor(R.wave)} concluída · +${fmt(bonus)} de ouro</div>
      <div class="cards">${cards.map(c => `<div class="cd3" data-a="card" data-id="${c.id}" style="--rc:${RARITY[c.rar].c}"><div class="r">${RARITY[c.rar].n.toUpperCase()}</div><div class="ic">${ic(c.icon)}</div><h3>${c.name}</h3><p>${c.desc}</p>${(R.cards[c.id] || 0) ? `<div class="own">Você tem x${R.cards[c.id]}</div>` : ''}</div>`).join('')}</div></div>`, 'screen');
    showHud(false); Snd.sfx.card();
  }

  /* ---------- resultado ---------- */
  function showResult(res) {
    showHud(false);
    const mode = res.mode === 'map' ? 'Campanha — ' + MAPS[res.map].name : res.mode === 'infinite' ? 'Modo Infinito' : 'Boss Rush';
    const nextMap = res.mode === 'map' && res.win && res.map + 1 < MAPS.length;
    show(`<div class="result panel">
      <div class="title ${res.win ? 'win' : 'lose'}">${res.win ? 'VITÓRIA!' : 'O CASTELO CAIU'}</div>
      <div class="sub">${mode}</div>
      <div class="stats"><div><span>Ondas vencidas</span>${res.wave}</div><div><span>Chefes</span>${res.bosses}</div><div><span>Monstros</span>${res.kills}</div><div><span>Ouro coletado</span>${fmt(res.earned)}</div></div>
      <div class="chip" style="font-size:calc(var(--u)*10)">${ic('gem')} +${res.gems} gemas</div>
      ${res.newBest ? `<div class="newbest">${ic('star')} NOVO RECORDE! ${ic('star')}</div>` : ''}${res.unlocked ? `<div class="newbest">${ic('unlock')} Novo mapa liberado!</div>` : ''}
      <div class="row">${nextMap ? `<button class="btn green" data-a="nextmap">Próximo mapa${ic('play')}</button>` : ''}<button class="btn" data-a="retry" data-m="${res.mode}" data-i="${res.map}">${ic('retry')}Jogar de novo</button><button class="btn dark" data-a="menu">Menu</button></div>
    </div>`, 'screen');
  }

  /* ---------- loja permanente (só skins; melhorias ficam dentro da partida) ---------- */
  function showShop() {
    const s = Save.d;
    const tabs = [['mage', 'hat', 'Magos'], ['castle', 'castle', 'Castelos']];
    const body = SKINS[shopTab].map(k => {
      const owned = s.owned[shopTab].includes(k.id), eq = s.equip[shopTab] === k.id;
      const act = eq ? '<button class="btn sm eq">Equipado</button>' : owned ? `<button class="btn sm green" data-a="seq" data-g="${shopTab}" data-id="${k.id}">Equipar</button>` : gemBtn('sbuy', `data-g="${shopTab}" data-id="${k.id}"`, k.cost, s.gems >= k.cost);
      return `<div class="it ${eq ? 'on' : ''}"><div class="ic"><canvas data-prev="${shopTab}:${k.id}"></canvas></div><div class="tx"><div class="nm">${k.name}</div><div class="ds">${k.desc || '—'}</div></div><div class="act">${act}</div></div>`;
    }).join('');
    const keep = ui.querySelector('.grid'), st = keep ? keep.scrollTop : 0;
    show(`<div class="full panel">
      <div class="head"><button class="btn sm dark" data-a="menu">${ic('left')}Voltar</button><div class="title">LOJA DE SKINS</div><div class="chip" data-a="gems">${ic('gem')}<b>${fmt(s.gems)}</b></div></div>
      <div class="tabs">${tabs.map(t => `<button class="tab ${shopTab === t[0] ? 'on' : ''}" data-a="stab" data-t="${t[0]}">${ic(t[1])}${t[2]}</button>`).join('')}</div>
      <div class="grid">${body}</div></div>`, 'screen');
    const g = ui.querySelector('.grid'); if (g) g.scrollTop = st;
    ui.querySelectorAll('canvas[data-prev]').forEach(c => {
      const [grp, id] = c.dataset.prev.split(':'); let src = null;
      if (grp === 'mage') src = Art.mage(id).n; else if (grp === 'castle') src = Art.castle(id, 4).c; else if (grp === 'pet') src = id === 'none' ? null : Art.pet(id).n;
      if (!src) src = Art.icon('lock').n;
      c.width = src.width; c.height = src.height; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      x.drawImage(src, 0, 0);
    });
  }

  /* ---------- modais ---------- */
  function closeModal() { modal.classList.add('hidden'); modal.innerHTML = ''; resetArm = false; if (Game.state === 'wave' && Game.paused) Game.paused = false; }
  function showSettings() {
    const s = Save.d.set;
    const tog = (k, label) => `<div class="opt"><span>${label}</span><div class="tog ${s[k] ? 'on' : ''}" data-a="tog" data-k="${k}"></div></div>`;
    modal.classList.remove('hidden');
    modal.innerHTML = `<div class="panel settings"><div class="title" style="font-size:calc(var(--u)*11)">${ic('gear')} OPÇÕES</div>
      <div class="opt"><span>Música</span><input type="range" min="0" max="100" value="${Math.round(s.music * 100)}" data-k="music"></div>
      <div class="opt"><span>Efeitos</span><input type="range" min="0" max="100" value="${Math.round(s.sfx * 100)}" data-k="sfx"></div>
      ${tog('shake', 'Tremor de tela')}${tog('nums', 'Números de dano')}${tog('auto', 'Habilidades automáticas')}
      <div class="row"><button class="btn sm dark" data-a="fs">${ic('full')}Tela cheia</button><button class="btn sm dark ${resetArm ? 'dis' : ''}" data-a="reset">${resetArm ? 'Toque de novo para apagar' : ic('retry') + 'Apagar progresso'}</button></div>
      <button class="btn" data-a="closem">Fechar</button></div>`;
  }
  function showPause() {
    if (Game.state !== 'wave') return;
    Game.paused = true; modal.classList.remove('hidden');
    modal.innerHTML = `<div class="panel pausebox"><div class="title" style="font-size:calc(var(--u)*12)">PAUSADO</div>
      <button class="btn green" data-a="closem">${ic('play')}Continuar</button><button class="btn violet" data-a="settings">${ic('gear')}Opções</button><button class="btn" data-a="savequit">Salvar e sair</button><button class="btn dark" data-a="quit">Desistir da partida</button></div>`;
  }
  function fullscreen() {
    const d = document, el = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
    const p = (el.requestFullscreen || el.webkitRequestFullscreen); if (p) { const r = p.call(el); const lock = () => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }; r && r.then ? r.then(lock).catch(() => { }) : lock(); }
  }

  /* ---------- ações ---------- */
  function act(a, d, el) {
    switch (a) {
      case 'play': Snd.sfx.click(); showModes(); break;
      case 'menu': Snd.sfx.back(); showMenu(); break;
      case 'shop': Snd.sfx.click(); shopTab = 'mage'; showShop(); break;
      case 'settings': Snd.sfx.click(); showSettings(); break;
      case 'closem': { Snd.sfx.back(); const fromSet = modal.querySelector('.settings'); closeModal(); if (fromSet && Game.state === 'wave') showPause(); break; }
      case 'fs': fullscreen(); break;
      case 'gems': {
        const n = performance.now(); secret.n = (n - secret.t < 800) ? secret.n + 1 : 1; secret.t = n;
        if (secret.n >= 7) { secret.n = 0; Game.cheat(99999); Snd.sfx.buy(); toast('+99999 gemas (modo teste)'); (ui.querySelector('.menu') ? showMenu : showShop)(); }
        break;
      }
      case 'mode': Snd.sfx.click(); if (d.m === 'boss') startRun('boss', MAPS.findIndex(m => m.id === 'volcano')); else showMaps(d.m); break;
      case 'locked': Snd.sfx.nope(); toast('Vença o mapa anterior para liberar', 'lock'); break;
      case 'map': startRun(mapMode, +d.i); break;
      case 'retry': startRun(d.m, +d.i); break;
      case 'nextmap': startRun('map', Game.R.map + 1); break;
      case 'ptab': Snd.sfx.click(); prepTab = d.t; renderPrep(); break;
      case 'up': Game.buy.up(d.id); renderPrep(); break;
      case 'skill': Game.buy.skill(d.id); renderPrep(); break;
      case 'trap': Game.buy.trap(+d.i); renderPrep(); break;
      case 'ally': Game.buy.ally(d.id); renderPrep(); break;
      case 'pet': Game.buy.pet(d.id); renderPrep(); break;
      case 'repair': Game.buy.repair(); renderPrep(); break;
      case 'go': Snd.sfx.click(); clearUI(); showHud(true); buildSkills(); Game.beginWave(); break;
      case 'card': Game.pickCard(d.id); renderPrep(); break;
      case 'cast': Game.cast(d.id); break;
      case 'pause': showPause(); break;
      case 'speed': { Game.speed = Game.speed === 1 ? 2 : 1; $('#btnSpeed').textContent = 'x' + Game.speed; Snd.sfx.click(); break; }
      case 'cont': Snd.sfx.click(); Game.resumeRun(); break;
      case 'savequit': Snd.sfx.back(); Game.saveRun(); closeModal(); Game.paused = false; showMenu(); break;
      case 'quit': closeModal(); Game.paused = false; Game.finish(false); break;
      case 'stab': Snd.sfx.click(); shopTab = d.t; showShop(); break;
      case 'sbuy': {
        const k = SKINS[d.g].find(x => x.id === d.id), s = Save.d;
        if (s.gems < k.cost) { Snd.sfx.nope(); toast('Gemas insuficientes'); break; }
        s.gems -= k.cost; s.owned[d.g].push(k.id); s.equip[d.g] = k.id; Save.store(); Snd.sfx.buy(); showShop(); break;
      }
      case 'seq': Save.d.equip[d.g] = d.id; Save.store(); Snd.sfx.click(); showShop(); break;
      case 'tog': { const s = Save.d.set; s[d.k] = !s[d.k]; Save.store(); el.classList.toggle('on', s[d.k]); Snd.sfx.click(); break; }
      case 'reset':
        if (!resetArm) { resetArm = true; showSettings(); } else { Save.reset(); Snd.setVolumes(Save.d.set.music, Save.d.set.sfx); closeModal(); showMenu(); toast('Progresso apagado'); }
        break;
    }
  }
  function startRun(mode, map) { closeModal(); Game.startRun(mode, map); }

  document.addEventListener('click', e => {
    unlockAudio();
    const b = e.target.closest('[data-a]'); if (!b) return;
    act(b.dataset.a, b.dataset, b);
  });
  document.addEventListener('input', e => {
    const t = e.target; if (t.type !== 'range') return;
    Save.d.set[t.dataset.k] = t.value / 100; Snd.setVolumes(Save.d.set.music, Save.d.set.sfx); Save.store();
  });
  document.addEventListener('change', e => { if (e.target.type === 'range') Snd.sfx.click(); });
  function unlockAudio() {
    if (audioOn) { Snd.resume(); return; }
    audioOn = true; Snd.resume(); Snd.setVolumes(Save.d.set.music, Save.d.set.sfx);
    if (Game.state === 'menu' || Game.state === 'prep') Snd.play('calm');
  }
  addEventListener('pointerdown', unlockAudio, { passive: true });
  addEventListener('keydown', e => {
    unlockAudio();
    const k = e.key;
    if (k >= '1' && k <= '7' && Game.state === 'wave' && !Game.paused) { Game.cast(SKILL_KEYS[+k - 1]); }
    else if (k === 'Escape' || k === 'p' || k === 'P') { if (!modal.classList.contains('hidden')) closeModal(); else showPause(); }
    else if ((k === ' ' || k === 'Enter') && Game.state === 'prep' && ui.querySelector('.prep') && modal.classList.contains('hidden')) { e.preventDefault(); act('go', {}); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && Game.state === 'wave') showPause(); });
  addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 200));

  /* ---------- ganchos do jogo ---------- */
  Game.hooks.hud = updateHud;
  Game.hooks.prep = () => { prepTab = 'mago'; renderPrep(); };
  Game.hooks.wave = () => { buildSkills(); showHud(true); $('#btnSpeed').textContent = 'x' + Game.speed; };
  Game.hooks.waveClear = (bonus, cards) => { if (cards) showCards(bonus); else { renderPrep(); toast(`+${fmt(bonus)} de ouro`); } };
  Game.hooks.over = res => showResult(res);
  Game.hooks.tierUp = t => toast('Castelo evoluiu! Nível ' + t, 'castle');
  Game.buy = Game.buy || {};

  function init() {
    Save.load();
    hydrate();
    resize();
    Game.init($('#cv'));
    Game.hooks.hud = updateHud;
    showMenu();
  }
  return { init, resize, toast, showMenu, act };
})();
UI.init();

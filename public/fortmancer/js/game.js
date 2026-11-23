'use strict';
/* ============================================================
   FORTMANCER — núcleo do jogo
   ============================================================ */
const Save = {
  d: null,
  def() {
    return {
      v: 1, gems: 0, best: { inf: 0, boss: 0 }, cleared: 0, lastMap: 0,
      owned: { mage: ['apprentice'], castle: ['stone'], pet: ['none'] },
      equip: { mage: 'apprentice', castle: 'stone', pet: 'none' },
      set: { music: .6, sfx: .8, shake: true, nums: true, auto: true },
    };
  },
  load() {
    const d = this.def();
    try {
      const s = JSON.parse(localStorage.getItem('fortmancer.save') || 'null');
      if (s) for (const k of Object.keys(d)) if (s[k] !== undefined) d[k] = (typeof d[k] === 'object' && !Array.isArray(d[k])) ? Object.assign(d[k], s[k]) : s[k];
    } catch (e) { }
    this.d = d; return d;
  },
  store() { try { localStorage.setItem('fortmancer.save', JSON.stringify(this.d)); } catch (e) { } },
  reset() { try { localStorage.removeItem('fortmancer.save'); } catch (e) { } this.load(); },
};

const Game = (() => {
  let cv, cx, bgMap = null, mapIdx = 0;
  let R = null;                                   // dados da partida atual
  let E = [], P = [], EP = [], PT = [], TX = [], CO = [], FX = [], ZN = [], AMB = [], castleFlash = 0;
  let shake = 0, flashRed = 0, banner = null, T = 0;
  let wv = { q: [], t: 0, active: false, boss: null, endT: 0 };
  const mage = { x: 26, foot: GY - 160 + 30, cast: 0, anim: 0, atk: .5 };
  const petObj = {};
  const petOf = id => petObj[id] || (petObj[id] = { x: 56, y: 56, cd: 1, a: Math.random() * 6 });
  let state = 'menu', paused = false, speed = 1, demo = true, demoT = 0;
  const hooks = {};
  const clouds = [];

  /* ================= estatísticas derivadas ================= */
  const card = id => (R && R.cards[id]) || 0;
  const mageId = () => Save.d.equip.mage;
  const dmgMul = () => (1 + .12 * R.up.dmg) * (1 + .05 * card('power')) * (mageId() === 'archmage' ? 1.08 : 1);
  const spdMul = () => 1 + .08 * R.up.spd + .05 * card('cadence');
  const critCh = () => Math.min(1, .03 + .05 * R.up.crit + .05 * card('crit'));
  const goldMul = () => (1 + .1 * R.up.gold) * (1 + .05 * card('greed')) * (mageId() === 'necro' ? 1.12 : 1);
  const castleMax = () => Math.round(260 * (1 + .25 * R.up.wall));
  const barrierMax = () => (R.up.barrier ? 40 * R.up.barrier : 0) + 20 * card('shield');
  const thornsDmg = () => R.up.thorns * 8 + card('thorn') * 3;
  const trapDmg = (base, lvl) => base * (1 + .7 * (lvl - 1)) * (1 + .1 * card('trap')) * (1 + .5 * (dmgMul() - 1));

  function recalc(full) {
    const c = R.castle, nm = castleMax(), nb = barrierMax();
    if (full) { c.max = nm; c.hp = nm; c.bmax = nb; c.barrier = nb; return; }
    c.hp += Math.max(0, nm - c.max); c.max = nm;
    c.barrier += Math.max(0, nb - c.bmax); c.bmax = nb;
  }

  /* ================= partida ================= */
  function newRun(mode, map) {
    mapIdx = map; setMap(map);
    for (const k in petObj) delete petObj[k];
    const m = MAPS[map];
    R = {
      mode, map, wave: 0, kills: 0, bosses: 0, earned: 0, over: false,
      gold: (mode === 'boss' ? 160 : mode === 'infinite' ? 100 : m.start),
      up: {}, cards: {}, skills: { fire: 1, frost: 0, bolt: 0, meteor: 0, poison: 0, roots: 0, light: 0 },
      cd: { fire: 0, frost: 0, bolt: 0, meteor: 0, poison: 0, roots: 0, light: 0 }, cdMax: { fire: 1, frost: 1, bolt: 1, meteor: 1, poison: 1, roots: 1, light: 1 },
      slots: TRAP_X.map((_, i) => ({ type: TRAP_ORDER[i], lvl: 0, cd: 0, t: 0 })),
      pets: {}, allies: { archer: 0, frostmage: 0, ballista: 0, cleric: 0 }, allyCd: { archer: .5, frostmage: .8, ballista: 1, cleric: 2 }, allyHcd: 1, allyKick: {},
      tier: 0,
      castle: { hp: 1, max: 1, barrier: 0, bmax: 0, lastHit: 0 },
    };
    for (const k of Object.keys(UPGRADES)) R.up[k] = 0;
    if (mode === 'map') { ['frost', 'bolt', 'meteor'].slice(0, map).forEach(k => R.skills[k] = 1); if (map >= 3) R.skills.fire = 2; }
    if (mode === 'boss') { Object.assign(R.skills, { fire: 2, frost: 1, bolt: 1, meteor: 1 }); R.gold = 260; }
    recalc(true);
    reset();
  }
  function reset() { E = []; P = []; EP = []; PT = []; TX = []; CO = []; FX = []; ZN = []; castleFlash = 0; wv = { q: [], t: 0, active: false, boss: null, endT: 0 }; shake = 0; banner = null; mage.atk = .5; }

  function setMap(i) {
    mapIdx = i; bgMap = Art.map(MAPS[i]);
    AMB = []; const a = MAPS[i].amb;
    if (a === 'fireflies') for (let k = 0; k < 26; k++) AMB.push({ x: rand(0, W), y: rand(100, GY), ph: rand(0, 6), s: rand(.4, 1) });
    if (a === 'wisps') for (let k = 0; k < 16; k++) AMB.push({ x: rand(0, W), y: rand(110, GY - 6), ph: rand(0, 6), s: rand(.4, 1) });
    if (a === 'dust') for (let k = 0; k < 30; k++) AMB.push({ x: rand(0, W), y: rand(20, GY), ph: rand(0, 6), s: rand(.4, 1) });
    if (a === 'snow') for (let k = 0; k < 60; k++) AMB.push({ x: rand(0, W), y: rand(0, GY), ph: rand(0, 6), s: rand(.4, 1) });
    if (a === 'embers') for (let k = 0; k < 40; k++) AMB.push({ x: rand(0, W), y: rand(0, GY), ph: rand(0, 6), s: rand(.4, 1) });
  }
  function startDemo() {
    demo = true; state = 'menu'; paused = false; demoT = 1;
    newRun('infinite', clamp(Save.d.lastMap || 0, 0, MAPS.length - 1));
    Object.assign(R.skills, { fire: 3, frost: 2, bolt: 2, meteor: 0 });
    R.allies = { archer: 2, frostmage: 1, ballista: 0, cleric: 2 }; R.tier = 2;
    R.castle.hp = R.castle.max = 9999;
    Snd.play('calm');
  }
  function startRun(mode, map) {
    demo = false; Save.d.lastMap = map; Save.store();
    newRun(mode, map); state = 'prep'; paused = false;
    Snd.play('calm');
    hooks.prep && hooks.prep();
  }

  /* ================= ondas ================= */
  const bossDef = i => BOSSES[i % BOSSES.length];
  function waveLabel() {
    if (!R) return '';
    if (R.mode === 'map') return `Onda ${Math.max(R.wave, 1)}/${CAMPAIGN_WAVES}`;
    if (R.mode === 'boss') return `Chefe ${Math.max(R.wave, 1)}`;
    return `Onda ${Math.max(R.wave, 1)}`;
  }
  function nextWaveInfo() {
    const w = R.wave + 1;
    if (R.mode === 'boss') return { boss: bossDef(w - 1) };
    if (R.mode === 'map' && w === CAMPAIGN_WAVES) return { boss: bossById(MAPS[R.map].boss) };
    if (R.mode === 'infinite' && w % 10 === 0) return { boss: bossDef(w / 10 - 1) };
    return {};
  }
  function buildList(w, pool, budgetMul) {
    const avail = pool.filter(p => w >= p[1]).map(p => p[0]);
    let budget = Math.round((8 + 6 * w + .35 * w * w) * 1.65 * budgetMul);
    const list = [];
    while (budget >= 2) {
      const ok = avail.filter(t => ENEMY[t].cost <= budget);
      if (!ok.length) break;
      const wts = ok.map((t, i) => 1 + i * .8);
      let r = Math.random() * wts.reduce((a, b) => a + b, 0), k = 0;
      while (r > wts[k]) { r -= wts[k]; k++; }
      list.push(ok[k]); budget -= ENEMY[ok[k]].cost;
    }
    const dur = Math.min(62, 24 + w * 2.0);
    return list.map(type => ({ t: Math.random() * dur, type })).sort((a, b) => a.t - b.t);
  }
  const INF_POOL = [['slime', 1], ['goblin', 2], ['bat', 3], ['skeleton', 5], ['witch', 8], ['ogre', 10], ['darkmage', 14], ['troll', 16]];

  function beginWave() {
    R.wave++; const w = R.wave, m = MAPS[R.map];
    const info = nextWaveInfoFor(w);
    let list = [];
    const mapMode = R.mode === 'map';
    const scaleHp = waveScale(w) * (mapMode ? m.hp * .72 : 1) * (R.mode === 'infinite' && w > 15 ? Math.pow(1.07, w - 15) : 1);
    const ctxW = { hpMul: scaleHp, dmgMul: 1 + .1 * (w - 1) + (mapMode ? .08 * R.map : 0), goldMul: (1 + .1 * (w - 1)) * (mapMode ? m.gold * 1.3 : 1) };
    if (R.mode !== 'boss') list = buildList(w, mapMode ? m.pool : INF_POOL, info.boss ? .55 : 1);
    wv = { q: list, t: 0, active: true, boss: null, endT: 0, ctx: ctxW, total: list.length + (info.boss ? 1 : 0) };
    if (info.boss) {
      let hpMul;
      if (R.mode === 'boss') hpMul = 1 + .6 * Math.floor((w - 1) / BOSSES.length);
      else if (mapMode) hpMul = m.hp;
      else hpMul = waveScale(w) / waveScale(10) * (w > 15 ? Math.pow(1.07, w - 15) : 1) * (1 + .5 * Math.floor((w / 10 - 1) / BOSSES.length));
      wv.bossSpawn = { t: 1.8, tpl: info.boss, hpMul, dmgMul: R.mode === 'boss' ? 1 + .3 * Math.floor((w - 1) / BOSSES.length) : ctxW.dmgMul };
      banner = { text: info.boss.name.toUpperCase(), sub: 'CHEFE', t: 0, life: 3, boss: true };
      Snd.sfx.boss(); Snd.play('boss');
    } else {
      banner = { text: waveLabel().toUpperCase(), sub: '', t: 0, life: 2 };
      Snd.sfx.wave(); Snd.play('battle', R.map);
    }
    state = 'wave'; hooks.wave && hooks.wave();
  }
  function nextWaveInfoFor(w) {
    if (R.mode === 'boss') return { boss: bossDef(w - 1) };
    if (R.mode === 'map' && w === CAMPAIGN_WAVES) return { boss: bossById(MAPS[R.map].boss) };
    if (R.mode === 'infinite' && w % 10 === 0) return { boss: bossDef(w / 10 - 1) };
    return {};
  }

  function spawn(type, o) {
    o = o || {};
    const tpl = o.tpl || ENEMY[type], s = tpl.scale || 1;
    const fly = !!tpl.fly;
    const e = {
      type: type || tpl.id, tpl, boss: !!o.boss, scale: tpl.base ? tpl.scale : s, sprite: tpl.sprite || tpl.base,
      x: o.x != null ? o.x : W + 16, y: fly ? tpl.fy + rand(-14, 14) : GY + rand(3, 15),
      w: tpl.w, h: tpl.h, spd: tpl.spd * rand(.92, 1.08), atk: rand(.2, .8), flash: 0, anim: rand(0, 6),
      slowT: 0, slowF: 0, freezeT: 0, burnT: 0, burnD: 0, poisT: 0, poisD: 0, rootT: 0, rootD: 0, rootAge: 0, alive: true, fly,
      sum: tpl.summon ? tpl.summon.every * .6 : 0, hit: 0,
    };
    e.max = e.hp = Math.round(tpl.hp * (o.hpMul || 1));
    e.dmg = tpl.dmg * (o.dmgMul || 1); e.gold = tpl.gold * (o.goldMul || 1);
    e.stopX = tpl.ranged ? CASTLE_X + tpl.range + rand(-12, 12) : CASTLE_X + tpl.w / 2 + rand(0, 8);
    e.ctx = o.ctx || wv.ctx;
    E.push(e);
    return e;
  }

  /* ================= alvos / dano ================= */
  const cy = e => e.fly ? e.y : e.y - e.h / 2;
  const living = () => E.filter(e => e.alive && e.x < W + 2);
  function nearest(fromX, excl, maxd) {
    let best = null, bd = 1e9;
    for (const e of E) {
      if (!e.alive || e.x > W - 2 || (excl && excl.includes(e))) continue;
      const d = fromX == null ? e.x : Math.abs(e.x - fromX);
      if (d < bd && (maxd == null || d <= maxd)) { bd = d; best = e; }
    }
    return best;
  }
  function targets(n) {
    return E.filter(e => e.alive && e.x < W - 2).sort((a, b) => a.x - b.x).slice(0, n);
  }
  function addText(x, y, s, col, big) {
    if (!Save.d.set.nums || TX.length > 40) return;
    TX.push({ x, y, s, col, t: 0, life: .8, big });
  }
  function hurt(e, dmg, o) {
    if (!e.alive) return;
    o = o || {};
    let crit = false;
    if (!o.nocrit && Math.random() < critCh()) { dmg *= 2; crit = true; }
    e.hp -= dmg; e.flash = .09;
    if (!o.quiet) addText(e.x + rand(-4, 4), cy(e) - e.h / 2 - 4, Math.round(dmg) + (crit ? '!' : ''), crit ? '#ffd23f' : '#fff', crit);
    Snd.sfx.hit();
    if (e.hp <= 0) die(e);
  }
  function hurtRaw(e, d) { e.hp -= d; if (e.hp <= 0 && e.alive) die(e); }
  function burst(x, y, col, n, sp, life, size, grav) {
    for (let i = 0; i < n && PT.length < 500; i++) {
      const a = Math.random() * TAU, s = rand(.3, 1) * sp;
      PT.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - sp * .15, life: rand(.5, 1) * life, t: 0, col: Array.isArray(col) ? pick(col) : col, size: size || 1, g: grav == null ? 120 : grav });
    }
  }
  function die(e) {
    if (!e.alive) return;
    e.alive = false;
    const tpl = e.tpl;
    const colMap = { slime: ['#5fd46a', '#a5f0a0'], bat: ['#7a4fb3', '#4d2f7d'], goblin: ['#7bbf3a', '#8a5a2b'], skeleton: ['#e9e4d2', '#b9b29a'], witch: ['#7b3fb0', '#8fd16a'], ogre: ['#9a9a45', '#7a4a2a'], darkmage: ['#33284f', '#9d4edd'], troll: ['#5f8fa8', '#4fa84a'], demon: ['#d8402e', '#ffd166'] };
    burst(e.x, cy(e), colMap[e.sprite] || '#fff', e.boss ? 60 : 12 + e.scale * 4, e.boss ? 130 : 70, .7, e.boss ? 3 : 2, 160);
    Snd.sfx.kill();
    if (!demo) { R.kills++; }
    // moedas
    const val = e.gold * 1.05 * goldMul();
    const n = e.boss ? 16 : clamp(Math.round(e.gold / 3), 1, 8);
    for (let i = 0; i < n; i++) CO.push({ x: e.x + rand(-6, 6), y: cy(e), vx: rand(-50, 50), vy: rand(-130, -60), val: val / n, age: 0, fly: false });
    if (tpl.die) for (let i = 0; i < tpl.die.n; i++) spawn(tpl.die.spawn, { x: e.x + rand(-14, 14), hpMul: e.ctx ? e.ctx.hpMul : 1, dmgMul: e.ctx ? e.ctx.dmgMul : 1, goldMul: e.ctx ? e.ctx.goldMul * .5 : 1 });
    if (!demo) {
      if (mageId() === 'necro') healCastle(.5);
      if (card('siphon')) healCastle(card('siphon'));
    }
    if (e.boss) {
      R.bosses++; shake = Math.max(shake, 10); FX.push({ k: 'ring', x: e.x, y: cy(e), r: 4, max: 90, t: 0, life: .6, col: '#ffd166' });
      Snd.sfx.boom();
    }
  }
  function healCastle(n) { const c = R.castle; c.hp = Math.min(c.max, c.hp + n); }

  function hitCastle(dmg, src) {
    const c = R.castle; c.lastHit = 0;
    if (c.barrier > 0) {
      const ab = Math.min(c.barrier, dmg); c.barrier -= ab; dmg -= ab; Snd.sfx.barrier();
      FX.push({ k: 'ring', x: CASTLE_X + 4, y: GY - 40, r: 4, max: 22, t: 0, life: .25, col: '#7fe0ff', w: 2 });
      burst(CASTLE_X + 4, GY - 40 + rand(-20, 20), '#9ff0ff', 4, 50, .3, 1, 0);
    }
    if (dmg > 0) {
      c.hp -= dmg; shake = Math.max(shake, 3); flashRed = .25; Snd.sfx.castle();
      burst(CASTLE_X, GY - rand(10, 60), ['#b9b29a', '#8a8fa8'], 6, 70, .5, 2, 200);
      addText(CASTLE_X + 6, GY - rand(50, 80), '-' + Math.round(dmg), '#ff6b6b');
    }
    const th = thornsDmg();
    if (src && th > 0 && src.alive && !src.tpl.ranged) hurt(src, th, { nocrit: true, quiet: true });
    if (c.hp <= 0 && !demo && !R.over) finish(false);
    if (demo && c.hp < 5000) c.hp = 9999;
  }

  /* ================= projéteis e habilidades ================= */
  function fireBasic() {
    const n = 1 + card('multi'), tg = targets(Math.max(1, n));
    if (!tg.length) return false;
    const tipX = mage.x + 5, tipY = mage.foot - 16;
    for (let i = 0; i < n; i++) {
      const t = tg[i % tg.length], a = Math.atan2(cy(t) - tipY, t.x - tipX) + (n > 1 && tg.length === 1 ? (i - (n - 1) / 2) * .12 : 0);
      P.push({ k: 'basic', x: tipX, y: tipY, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330, dmg: 11 * dmgMul(), pierce: card('pierce'), hit: [], life: 2.2, col: Art.magePalette(mageId()).g, tgt: t, turn: 9 });
    }
    mage.cast = .12; Snd.sfx.shoot();
    return true;
  }
  function skillMods(id) {
    const l = R.skills[id], st = skillStats(id, l), gm = dmgMul(), mi = mageId();
    st.l = l; st.vt = fxTier(l);
    if (id === 'light') { st.heal *= 1 + .1 * card('lightH'); st.dmg *= gm * (1 + .1 * card('lightR')); st.cd *= Math.pow(.95, card('lightR')); return st; }
    st.dmg *= gm;
    if (id === 'fire') { st.radius *= 1 + .08 * card('fireR'); st.burn *= (1 + .1 * card('fireB')) * (mi === 'pyro' ? 1.2 : 1); if (mi === 'pyro') st.dmg *= 1.2; st.extra = card('fireD'); }
    if (id === 'frost') { st.cd *= Math.pow(.95, card('frostC')); st.freeze = Math.min(1, .05 * card('frostF')) + (mi === 'cryo' ? .1 : 0); if (mi === 'cryo') { st.slow = .7; st.dur *= 1.25; } }
    if (id === 'bolt') { st.chain += 2 * card('boltC'); st.dmg *= 1 + .1 * card('boltS'); st.cd *= Math.pow(.95, card('boltS')); }
    if (id === 'meteor') { st.n += 2 * card('metR'); st.dmg *= 1 + .1 * card('metP'); }
    if (id === 'poison') { st.dmg *= 1 + .1 * card('poisA'); st.radius *= 1 + .08 * card('poisB'); st.dur *= 1 + .08 * card('poisB'); }
    if (id === 'roots') { st.dmg *= 1 + .1 * card('rootA'); st.n += card('rootB'); st.dur += .3 * card('rootB'); }
    return st;
  }
  const UNDEAD = { skeleton: 1, darkmage: 1, demon: 1 };
  function cast(id) {
    const l = R.skills[id];
    if (!l || R.cd[id] > 0) return false;
    const st = skillMods(id), vt = st.vt, tipX = mage.x + 5, tipY = mage.foot - 16;
    if (id === 'fire') {
      const n = 1 + st.extra, tg = targets(n); if (!tg.length) return false;
      for (let i = 0; i < n; i++) {
        const t = tg[i % tg.length];
        setTimeout(() => { if (!R || state === 'menu' && !demo) return; const a = Math.atan2(cy(t) - tipY, t.x - tipX); P.push({ k: 'fire', vt, x: tipX, y: tipY, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, dmg: st.dmg, r: st.radius, burn: st.burn, tx: t.x, ty: cy(t), life: 3, hit: [], tgt: t, turn: 7, age: 0 }); }, i * 120);
      }
      Snd.sfx.fire();
    } else if (id === 'frost') {
      if (!living().length) return false;
      FX.push({ k: 'ring', x: mage.x, y: GY - 10, r: 6, max: st.radius, t: 0, life: .55, col: '#9ff0ff', w: 2 + vt });
      if (vt >= 2) FX.push({ k: 'ring', x: mage.x, y: GY - 10, r: 6, max: st.radius * .8, t: -.1, life: .5, col: '#ffffff', w: 2 });
      for (let i = 0; vt >= 1 && i < 5 + vt * 4; i++) FX.push({ k: 'icicle', x: mage.x + 10 + Math.random() * Math.max(10, st.radius - 12), h: rand(9, 14) + vt * 4, t: -Math.random() * .3, life: .75 + Math.random() * .25 });
      burst(mage.x, GY - 20, ['#cfeeff', '#7fe0ff', '#ffffff'], 26 + vt * 10, 120, .8, 2, 0);
      for (const e of E) if (e.alive && Math.hypot(e.x - mage.x, (e.fly ? e.y : GY) - (GY - 10)) <= st.radius + e.w / 2) {
        hurt(e, st.dmg, { nocrit: true });
        if (!e.boss && Math.random() < st.freeze) e.freezeT = 1.6; else { e.slowT = st.dur; e.slowF = st.slow; }
      }
      Snd.sfx.ice();
    } else if (id === 'bolt') {
      let t = nearest(); if (!t) return false;
      const pts = [{ x: tipX, y: tipY }], hits = []; let d = st.dmg;
      for (let i = 0; i < st.chain && t; i++) {
        hurt(t, d, { nocrit: true }); pts.push({ x: t.x, y: cy(t) }); hits.push(t); d *= .85;
        t = nearest(t.x, hits, 110);
      }
      const jag = [], forks = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], n = Math.max(3, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 10));
        for (let k = 0; k < n; k++) {
          const q = { x: lerp(a.x, b.x, k / n) + (k ? rand(-5, 5) : 0), y: lerp(a.y, b.y, k / n) + (k ? rand(-5, 5) : 0) }; jag.push(q);
          if (vt >= 2 && k && Math.random() < .5) forks.push([q, { x: q.x + rand(-16, 16), y: q.y + rand(-16, 12) }]);
        }
      }
      jag.push(pts[pts.length - 1]);
      FX.push({ k: 'bolt', pts: jag, forks, vt, t: 0, life: .28 + vt * .03 });
      if (vt >= 3) FX.push({ k: 'flash', t: 0, life: .12, col: '#fff7c0' });
      for (const h of hits) { burst(h.x, cy(h), ['#fff3a0', '#ffffff'], 6 + vt * 3, 80, .3, 1, 0); if (vt >= 1) FX.push({ k: 'ring', x: h.x, y: cy(h), r: 2, max: 12 + vt * 3, t: 0, life: .2, col: '#fff3a0', w: 1 }); }
      Snd.sfx.bolt();
    } else if (id === 'meteor') {
      if (!living().length) return false;
      const tg = E.filter(e => e.alive && e.x < W - 10);
      for (let i = 0; i < st.n; i++) {
        const base = tg.length ? pick(tg) : null, tx = base ? clamp(base.x + rand(-20, 20), 120, W - 10) : rand(160, 420);
        FX.push({ k: 'meteor', vt, tx, ty: GY + rand(2, 12), x: tx + 90, y: -20, t: -i * .22, life: 0, fall: .55, dmg: st.dmg, r: st.radius, done: false });
      }
      Snd.sfx.meteor();
    } else if (id === 'poison') {
      const g = E.filter(e => e.alive && e.x < W - 20 && e.x > CASTLE_X); if (!g.length) return false;
      let best = g[0], bc = -1; for (const e of g) { const c = g.filter(o => Math.abs(o.x - e.x) < st.radius).length; if (c > bc) { bc = c; best = e; } }
      FX.push({ k: 'flask', sx: tipX, sy: tipY, tx: clamp(best.x, 130, W - 20), ty: GY + 6, t: 0, life: .55, st, done: false });
      Snd.sfx.poison();
    } else if (id === 'roots') {
      const g = E.filter(e => e.alive && !e.fly && e.x < W - 6).sort((a, b) => a.x - b.x).slice(0, st.n); if (!g.length) return false;
      g.forEach(e => {
        e.rootT = e.boss ? st.dur * .5 : st.dur; e.rootD = st.dmg * .6; e.rootAge = 0;
        hurt(e, st.dmg, { nocrit: true, quiet: true });
        burst(e.x, GY + 6, ['#4fae56', '#8fe070', '#6e4520'], 14 + vt * 4, 70, .6, 2, 90);
      });
      Snd.sfx.roots();
    } else if (id === 'light') {
      const c = R.castle, heal = c.max * st.heal, lx = CASTLE_X - 14;
      if (!living().length && c.hp >= c.max - 1 && c.barrier >= c.bmax - 1) return false;
      healCastle(heal); c.barrier = Math.min(c.bmax, c.barrier + c.bmax * (.4 + .15 * vt));
      FX.push({ k: 'pillar', x: lx, t: 0, life: .9 + vt * .1, vt, r: st.radius });
      addText(lx, GY - 110, '+' + Math.round(heal), '#8bff9b', true);
      let n = 0;
      for (const e of E) if (e.alive && Math.abs(e.x - lx) <= st.radius + e.w / 2) { hurt(e, st.dmg * (UNDEAD[e.sprite] ? 1.6 : 1), { nocrit: true, quiet: n > 5 }); if (n++ < 10) FX.push({ k: 'beam', x: e.x, t: 0, life: .35 }); }
      burst(lx, GY - 40, ['#fff0a0', '#ffffff', '#8bff9b'], 24 + vt * 8, 70, .9, 2, -60);
      Snd.sfx.light();
    }
    R.cd[id] = R.cdMax[id] = st.cd; mage.cast = .35;
    FX.push({ k: 'ring', x: mage.x + 3, y: mage.foot - 2, r: 3, max: 18, t: 0, life: .3, col: SKILLS[id].color, w: 2 });
    return true;
  }
  function explode(x, y, r, dmg, burn, col, vt) {
    vt = vt || 0; col = col || '#ffb347';
    FX.push({ k: 'ring', x, y, r: 3, max: r * 1.2, t: 0, life: .35, col, w: 3 + (vt > 1 ? 1 : 0) });
    FX.push({ k: 'glow', x, y, r: r * 1.1, t: 0, life: .22, col });
    if (vt >= 2) FX.push({ k: 'ring', x, y, r: 3, max: r * 1.7, t: -.08, life: .4, col: '#fff3b0', w: 2 });
    if (vt >= 3) FX.push({ k: 'firecol', x, y: Math.min(y, GY + 4), t: 0, life: .55 });
    burst(x, y, ['#ffd166', '#ff7a1a', '#ff4d2a'], 22 + vt * 8, 150, .6, 2, 60);
    for (const e of E) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - x, cy(e) - y);
      if (d <= r + e.w / 2) { hurt(e, dmg * (1 - Math.min(d / (r + e.w / 2), 1) * .35), { nocrit: true }); if (burn) { e.burnT = 3; e.burnD = Math.max(e.burnD, burn); } }
    }
    Snd.sfx.boom(); shake = Math.max(shake, 2.5);
  }

  /* ================= atualização ================= */
  function update(dt) {
    T += dt; mage.anim += dt;
    if (mage.cast > 0) mage.cast -= dt;
    if (flashRed > 0) flashRed -= dt;
    shake = Math.max(0, shake - dt * 18);
    if (banner) { banner.t += dt; if (banner.t > banner.life) banner = null; }

    // demo do menu
    if (demo) {
      demoT -= dt;
      if (demoT <= 0) { demoT = rand(1.6, 3); const t = pick(['slime', 'goblin', 'goblin', 'skeleton', 'bat', 'slime']); spawn(t, { hpMul: 1.4, ctx: { hpMul: 1.4, dmgMul: 1, goldMul: 0 } }); if (Math.random() < .3) spawn('slime', { hpMul: 1.4, ctx: { hpMul: 1.4, dmgMul: 1, goldMul: 0 } }); }
    }
    // spawn de onda
    if (wv.active && !demo) {
      wv.t += dt;
      while (wv.q.length && wv.q[0].t <= wv.t) { const it = wv.q.shift(); spawn(it.type, wv.ctx); }
      if (wv.bossSpawn && wv.t >= wv.bossSpawn.t) {
        const b = wv.bossSpawn; wv.bossSpawn = null;
        wv.boss = spawn(null, { tpl: b.tpl, boss: true, hpMul: b.hpMul, dmgMul: b.dmgMul, goldMul: R.mode === 'boss' ? 2.2 : (R.mode === 'map' ? MAPS[R.map].gold : 1) });
        wv.boss.ctx = { hpMul: b.hpMul, dmgMul: b.dmgMul, goldMul: wv.ctx.goldMul };
      }
      if (!wv.q.length && !wv.bossSpawn && !E.some(e => e.alive)) {
        wv.endT += dt;
        if (wv.endT > .9 && (CO.length === 0 || wv.endT > 3)) waveClear();
      } else wv.endT = 0;
    }

    // castelo
    const c = R.castle; c.lastHit += dt;
    if (!demo && card('regen')) c.hp = Math.min(c.max, c.hp + card('regen') * dt);
    if (c.bmax > 0 && c.lastHit > 2.5 && c.barrier < c.bmax) c.barrier = Math.min(c.bmax, c.barrier + c.bmax * .12 * dt);

    // mago ataca
    mage.atk -= dt;
    if (mage.atk <= 0 && E.some(e => e.alive && e.x < W - 2)) { if (fireBasic()) mage.atk = .75 / spdMul(); else mage.atk = .1; }
    for (const id of Object.keys(R.cd)) if (R.cd[id] > 0) R.cd[id] -= dt;
    if ((Save.d.set.auto || demo) && state !== 'prep') autoCast();

    // pet e aliados
    updatePet(dt);
    updateAllies(dt);
    updateZones(dt);
    if (castleFlash > 0) castleFlash -= dt * 1.4;

    // inimigos
    for (const e of E) updateEnemy(e, dt);
    // armadilhas
    if (!demo) updateTraps(dt);
    // projéteis
    updateProjectiles(dt);
    // efeitos
    for (const f of FX) {
      f.t += dt;
      if (f.k === 'meteor' && !f.done && f.t >= 0) {
        const p = Math.min(1, f.t / f.fall);
        f.x = lerp(f.tx + 90, f.tx, p); f.y = lerp(-20, f.ty, p);
        if (PT.length < 480 && Math.random() < .8) PT.push({ x: f.x, y: f.y, vx: rand(-10, 10), vy: rand(-10, 10), life: .3, t: 0, col: pick(['#ffd166', '#ff7a1a']), size: 2, g: 0 });
        if (p >= 1) {
          f.done = true; explode(f.tx, f.ty - 4, f.r, f.dmg, 4 * R.skills.meteor, '#ff7a1a', f.vt); shake = Math.max(shake, 5 + f.vt);
          FX.push({ k: 'scorch', x: f.tx, y: f.ty, rx: 14 + f.vt * 4, t: 0, life: 1.1 });
          burst(f.tx, f.ty - 2, ['#6e4520', '#a08a6c', '#ff7a1a'], 10 + f.vt * 6, 120, .7, 2, 260);
        }
      }
      if (f.k === 'flask' && !f.done && f.t >= f.life) {
        f.done = true; const st = f.st;
        ZN.push({ k: 'poison', x: f.tx, r: st.radius, dps: st.dmg, t: 0, life: st.dur, vt: st.vt, tick: 0, ph: rand(0, 6) });
        burst(f.tx, GY + 4, ['#7bdc4a', '#b8f06a', '#3a8a2a'], 24, 90, .7, 2, 80);
        FX.push({ k: 'ring', x: f.tx, y: GY + 6, r: 3, max: st.radius, t: 0, life: .4, col: '#7bdc4a', w: 2, flat: 1 });
      }
    }
    FX = FX.filter(f => f.t < f.life + (f.k === 'meteor' ? f.fall + 1 : 0) && !((f.k === 'meteor' || f.k === 'flask') && f.done));
    for (const p of PT) { p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    PT = PT.filter(p => p.t < p.life);
    for (const t of TX) { t.t += dt; t.y -= 18 * dt; }
    TX = TX.filter(t => t.t < t.life);
    // moedas
    const mx = mage.x, my = mage.foot - 8;
    for (const o of CO) {
      o.age += dt;
      if (!o.fly) {
        o.vy += 420 * dt; o.x += o.vx * dt; o.y += o.vy * dt;
        const gy = GY + 10;
        if (o.y > gy) { o.y = gy; o.vy *= -.35; o.vx *= .6; if (Math.abs(o.vy) < 20) o.vy = 0; }
        if (o.age > .55) o.fly = true;
      } else {
        const dx = mx - o.x, dy = my - o.y, d = Math.hypot(dx, dy) || 1, sp = 160 + (o.age - .55) * 520;
        o.x += dx / d * sp * dt; o.y += dy / d * sp * dt;
        if (d < 8) { o.dead = true; if (!demo) { R.gold += o.val; R.earned += o.val; } Snd.sfx.coin(); }
      }
    }
    CO = CO.filter(o => !o.dead);
    E = E.filter(e => e.alive);
    // ambiente
    for (const a of AMB) {
      a.ph += dt;
      const t = MAPS[mapIdx].amb;
      if (t === 'embers') { a.y -= (18 + a.s * 22) * dt; a.x += Math.sin(a.ph * 2) * 8 * dt; if (a.y < -4) { a.y = GY; a.x = rand(0, W); } }
      else if (t === 'snow') { a.y += (14 + a.s * 16) * dt; a.x += Math.sin(a.ph * 1.5) * 10 * dt - 6 * dt; if (a.y > GY + 4) { a.y = -4; a.x = rand(0, W + 20); } }
      else if (t === 'dust') { a.x += Math.sin(a.ph * .5 + a.s * 6) * 5 * dt; a.y += Math.cos(a.ph * .4 + a.s * 3) * 4 * dt; }
      else if (t === 'fireflies' || t === 'wisps') { a.x += Math.sin(a.ph * .8 + a.s * 6) * 14 * dt; a.y += Math.cos(a.ph * .6 + a.s * 3) * 9 * dt; }
    }
    for (const cl of clouds) { cl.x -= cl.s * dt; if (cl.x < -60) cl.x = W + 20; }
  }

  function autoCast() {
    const live = living();
    for (const id of ['fire', 'bolt', 'poison', 'roots', 'frost', 'meteor', 'light']) {
      if (!R.skills[id] || R.cd[id] > 0) continue;
      if (id === 'light') {
        const c = R.castle;
        if (c.hp < c.max * .8 || (live.length && c.bmax > 0 && c.barrier < c.bmax * .3) || live.filter(e => e.x < CASTLE_X + 110).length >= 5) cast(id);
        continue;
      }
      if (!live.length) continue;
      if (id === 'frost') { const r = skillStats('frost', R.skills.frost).radius; if (!live.some(e => Math.abs(e.x - mage.x) < r * .85)) continue; }
      if (id === 'meteor' && live.length < 3 && !live.some(e => e.boss)) continue;
      if (id === 'poison' && live.length < 2 && !live.some(e => e.boss)) continue;
      if (id === 'roots' && !live.some(e => !e.fly && e.x < CASTLE_X + 150)) continue;
      cast(id);
    }
  }

  /* ---------- aliados ---------- */
  const allyMul = () => (1 + .5 * (dmgMul() - 1)) * (1 + .08 * card('allyUp'));
  const allySpd = () => 1 + .08 * card('allyUp');
  const allyPos = id => ({ x: ALLIES[id].x, foot: GY - 160 + ALLIES[id].cy });
  function updateAllies(dt) {
    for (const id of Object.keys(R.allies)) {
      const l = R.allies[id]; if (!l) continue;
      if (R.allyKick[id] > 0) R.allyKick[id] -= dt;
      const st = allyStats(id, l), pos = allyPos(id), mx = pos.x + 6, my = pos.foot - 9, am = allyMul();
      if (id === 'cleric' && !demo) {
        R.allyHcd -= dt;
        if (R.allyHcd <= 0) {
          R.allyHcd = st.cd;
          const c = R.castle;
          if (c.hp < c.max - 1) { const h = c.max * st.heal * (1 + .08 * card('allyUp')); healCastle(h); FX.push({ k: 'ring', x: CASTLE_X - 30, y: GY - 60, r: 4, max: 34, t: 0, life: .5, col: '#8bff9b', w: 2 }); burst(CASTLE_X - 30, GY - 60, ['#8bff9b', '#ffffff'], 10, 40, .8, 1, -40); addText(pos.x, pos.foot - 24, '+' + Math.round(h), '#8bff9b'); }
        }
      }
      R.allyCd[id] -= dt;
      if (R.allyCd[id] > 0) continue;
      const t = nearest();
      if (!t || t.x - pos.x > 300) { R.allyCd[id] = .15; continue; }
      const cd = (id === 'cleric' ? st.hcd : st.cd) / allySpd(), a = Math.atan2(cy(t) - my, t.x - mx);
      R.allyCd[id] = cd; R.allyKick[id] = .12;
      if (id === 'archer') {
        for (let i = 0; i < st.n; i++) P.push({ k: 'ally', sub: 'arrow', x: mx, y: my - i * 2, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320 - i * 14, dmg: st.dmg * am, hit: [], pierce: 0, life: 1.6, col: '#f2f2f2', tgt: t, turn: 6 });
        Snd.sfx.arrow();
      } else if (id === 'frostmage') {
        P.push({ k: 'ally', sub: 'ice', x: mx, y: my, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, dmg: st.dmg * am, hit: [], pierce: 0, life: 1.8, col: '#9ff0ff', slow: st.slow, dur: st.dur, tgt: t, turn: 7 });
        Snd.sfx.petshot();
      } else if (id === 'ballista') {
        P.push({ k: 'ally', sub: 'bolt', x: mx, y: my, vx: Math.cos(a) * 400, vy: Math.sin(a) * 400, dmg: st.dmg * am, hit: [], pierce: st.pierce, life: 1.4, col: '#d8d8e8' });
        shake = Math.max(shake, .8); Snd.sfx.ballista();
      } else if (id === 'cleric') {
        P.push({ k: 'ally', sub: 'holy', x: mx, y: my, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, dmg: st.dmg * am, hit: [], pierce: 0, life: 1.8, col: '#fff0a0', tgt: t, turn: 8 });
        Snd.sfx.petshot();
      }
    }
  }
  function updateZones(dt) {
    for (const z of ZN) {
      z.t += dt; z.tick -= dt;
      if (z.tick <= 0) { z.tick = .2; for (const e of E) if (e.alive && Math.abs(e.x - z.x) <= z.r + e.w / 2) { e.poisT = Math.max(e.poisT, .45); e.poisD = Math.max(e.poisD, z.dps); } }
      if (PT.length < 460 && Math.random() < dt * (10 + z.vt * 7)) PT.push({ x: z.x + rand(-z.r, z.r), y: GY + rand(2, 10), vx: rand(-6, 6), vy: -rand(10, 28), life: rand(.5, 1), t: 0, col: pick(['#7bdc4a', '#b8f06a', '#4aa83a']), size: Math.random() < .3 ? 2 : 1, g: 0 });
    }
    ZN = ZN.filter(z => z.t < z.life);
  }

  function updatePet(dt) {
    if (!R || !R.pets) return;
    let i = 0;
    for (const id of Object.keys(PET_COST)) {
      if (!R.pets[id]) continue;
      const pet = petOf(id), k = i++;
      pet.a += dt;
      const tx = mage.x + 24 + k * 15 + Math.sin(pet.a * 1.3) * 5, ty = mage.foot - 22 - (k % 2) * 12 + Math.cos(pet.a * 2) * 4;
      pet.x += (tx - pet.x) * Math.min(1, dt * 5); pet.y += (ty - pet.y) * Math.min(1, dt * 5);
      pet.cd -= dt;
      if (pet.cd <= 0) {
        const t = nearest(); if (!t) continue;
        pet.cd = id === 'fairy' ? .8 : 1.15;
        const a = Math.atan2(cy(t) - pet.y, t.x - pet.x), info = Art.PETS[id];
        P.push({ k: 'pet', pet: id, x: pet.x + 4, y: pet.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, dmg: 8 * dmgMul() * (1 + .25 * R.up.pet) * (1 + .1 * card('pet')), hit: [], life: 2, col: info.shot, pierce: 0, tgt: t, turn: 8 });
        Snd.sfx.petshot();
      }
    }
  }

  function updateEnemy(e, dt) {
    const tpl = e.tpl;
    e.anim += dt; if (e.flash > 0) e.flash -= dt;
    if (e.burnT > 0) { e.burnT -= dt; hurtRaw(e, e.burnD * dt); if (Math.random() < dt * 8) PT.push({ x: e.x + rand(-4, 4), y: cy(e) - e.h / 2, vx: rand(-8, 8), vy: -25, life: .35, t: 0, col: pick(['#ff7a1a', '#ffd166']), size: 1, g: 0 }); }
    if (e.poisT > 0) { e.poisT -= dt; hurtRaw(e, e.poisD * dt); }
    if (!e.alive) return;
    if (tpl.regen) e.hp = Math.min(e.max, e.hp + e.max * tpl.regen * dt);
    if (e.freezeT > 0) { e.freezeT -= dt; return; }
    const sf = e.slowT > 0 ? (1 - e.slowF) : 1; if (e.slowT > 0) e.slowT -= dt;
    const rooted = e.rootT > 0;
    if (rooted) { e.rootT -= dt; e.rootAge += dt; hurtRaw(e, e.rootD * dt); if (!e.alive) return; }
    if (e.x > e.stopX) {
      if (!rooted) {
        e.x -= e.spd * sf * dt; if (e.x < e.stopX) e.x = e.stopX;
        if (e.fly) e.y = tpl.fy + Math.sin(e.anim * 4) * 12 + (e.x < 250 ? (e.x - 250) * -.18 : 0);
      }
    } else {
      e.atk -= dt * sf * (rooted ? .5 : 1);
      if (e.atk <= 0) {
        e.atk = tpl.rate; e.hit = .15;
        if (tpl.ranged) {
          EP.push({ x: e.x - 4, y: cy(e) - e.h * .15, tx: CASTLE_X - 6, ty: GY - 30 - rand(0, 30), dmg: e.dmg, col: tpl.shot || '#b86bff', sp: 140, src: e });
        } else hitCastle(e.dmg, e);
      }
    }
    if (e.hit > 0) e.hit -= dt;
    if (tpl.summon && !demo) {
      e.sum -= dt * sf;
      if (e.sum <= 0 && E.length < 90) {
        e.sum = tpl.summon.every;
        for (let i = 0; i < tpl.summon.n; i++) spawn(tpl.summon.type, { x: e.x + rand(-10, 20), hpMul: (e.ctx ? e.ctx.hpMul : 1) * (e.boss ? .45 : .7), dmgMul: e.ctx ? e.ctx.dmgMul : 1, goldMul: (e.ctx ? e.ctx.goldMul : 1) * .4 });
        burst(e.x, cy(e), tpl.shot || '#b86bff', 14, 60, .5, 1, 0); Snd.sfx.summon();
      }
    }
  }

  function updateTraps(dt) {
    R.slots.forEach((s, i) => {
      if (!s.type || s.lvl < 1) return;
      const tx = TRAP_X[i]; s.t += dt;
      const near = (r, g) => E.filter(e => e.alive && (g || !e.fly) && Math.abs(e.x - tx) < r + e.w / 2 * .6);
      if (s.type === 'spikes') {
        s.cd -= dt; const hit = near(18);
        if (s.cd <= 0 && hit.length) { s.cd = .45; for (const e of hit) hurt(e, trapDmg(13, s.lvl), { nocrit: true, quiet: true }); s.pulse = .15; burst(tx, GY + 6, '#c0c6d6', 4, 40, .25, 1, 0); }
      } else if (s.type === 'frost') {
        for (const e of near(26)) { e.slowT = Math.max(e.slowT, .3); e.slowF = Math.max(e.slowF, Math.min(.8, .35 + .08 * s.lvl)); }
        s.cd -= dt; if (s.cd <= 0 && near(26).length) { s.cd = .6; for (const e of near(26)) hurt(e, trapDmg(4, s.lvl), { nocrit: true, quiet: true }); }
      } else if (s.type === 'fire') {
        for (const e of near(20)) { e.burnT = Math.max(e.burnT, 2); e.burnD = Math.max(e.burnD, trapDmg(7, s.lvl)); }
      } else if (s.type === 'bomb') {
        s.cd -= dt;
        if (s.cd <= 0 && near(22, true).length) { s.cd = Math.max(3, 8 - .8 * s.lvl); explode(tx, GY - 2, 46 + 3 * s.lvl, trapDmg(110, s.lvl), 0, '#ff4d6d'); }
      }
    });
  }

  function updateProjectiles(dt) {
    for (const p of P) {
      if (p.tgt) {
        if (!p.tgt.alive) p.tgt = nearest(p.x);
        if (p.tgt) {
          const want = Math.atan2(cy(p.tgt) - p.y, p.tgt.x - p.x); let cur = Math.atan2(p.vy, p.vx);
          let d = ((want - cur + Math.PI * 3) % TAU) - Math.PI; cur += clamp(d, -p.turn * dt, p.turn * dt);
          const sp = Math.hypot(p.vx, p.vy); p.vx = Math.cos(cur) * sp; p.vy = Math.sin(cur) * sp;
          if (p.k === 'fire') { p.tx = p.tgt.x; p.ty = cy(p.tgt); }
        }
      }
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k === 'fire' && PT.length < 470) { const vt = p.vt || 0; for (let q = 0; q <= (vt >= 2 ? 1 : 0); q++) PT.push({ x: p.x - p.vx * .01, y: p.y - p.vy * .01, vx: rand(-15, 15) - p.vx * .08, vy: rand(-15, 15) - p.vy * .08, life: .3 + vt * .06, t: 0, col: pick(vt >= 3 ? ['#ffffff', '#9fd8ff', '#ff7a1a'] : ['#ffd166', '#ff7a1a', '#ff4d2a']), size: vt >= 1 ? 2 : 1 + (Math.random() < .5 ? 1 : 0), g: 0 }); }
      if (p.k === 'ally' && p.sub === 'holy' && PT.length < 470 && Math.random() < .5) PT.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: .25, t: 0, col: '#fff0a0', size: 1, g: 0 });
      if (p.k === 'fire') p.age += dt;
      if (p.k === 'fire' && (Math.hypot(p.x - p.tx, p.y - p.ty) < 7 || p.x > W || p.y > GY + 14)) { p.dead = true; explode(p.x, p.y, p.r, p.dmg, p.burn, null, p.vt); continue; }
      for (const e of E) {
        if (!e.alive || p.hit.includes(e)) continue;
        const top = e.fly ? e.y - e.h / 2 : e.y - e.h, bot = e.fly ? e.y + e.h / 2 : e.y;
        if (p.x > e.x - e.w / 2 - 2 && p.x < e.x + e.w / 2 + 2 && p.y > top - 2 && p.y < bot + 2) {
          if (p.k === 'fire') { p.dead = true; explode(p.x, p.y, p.r, p.dmg, p.burn, null, p.vt); break; }
          p.hit.push(e); hurt(e, p.dmg, (p.k === 'pet' || p.k === 'ally') ? { nocrit: true, quiet: true } : null);
          if (p.k === 'ally' && p.sub === 'ice') { e.slowT = Math.max(e.slowT, p.dur); e.slowF = Math.max(e.slowF, p.slow); }
          if (p.k === 'pet') {
            if (p.pet === 'dragon') { e.burnT = 2; e.burnD = Math.max(e.burnD, 5 * dmgMul()); }
            if (p.pet === 'owl') { e.slowT = 1.5; e.slowF = Math.max(e.slowF, .3); }
            if (p.pet === 'slimey') { e.poisT = 3; e.poisD = Math.max(e.poisD, 4 * dmgMul()); }
          }
          burst(p.x, p.y, p.col, 4, 60, .25, 1, 0);
          if (p.pierce > 0) { p.pierce--; p.dmg *= p.k === 'ally' ? .92 : .85; } else { p.dead = true; break; }
        }
      }
      if (p.life <= 0 || p.x > W + 10 || p.x < -10 || p.y < -20 || p.y > H) p.dead = true;
    }
    P = P.filter(p => !p.dead);
    for (const p of EP) {
      const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy) || 1;
      p.x += dx / d * p.sp * dt; p.y += dy / d * p.sp * dt;
      if (PT.length < 480 && Math.random() < .5) PT.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: .25, t: 0, col: p.col, size: 1, g: 0 });
      if (d < 6) { p.dead = true; hitCastle(p.dmg, null); }
    }
    EP = EP.filter(p => !p.dead);
  }

  /* ================= fluxo ================= */
  function waveClear() {
    wv.active = false;
    const w = R.wave, m = MAPS[R.map];
    const bonus = Math.round((20 + 8 * w) * (R.mode === 'map' ? m.gold : 1) * goldMul());
    R.gold += bonus; R.earned += bonus;
    Snd.sfx.win(); Snd.play('calm');
    if (R.mode === 'map' && w >= CAMPAIGN_WAVES) { finish(true); return; }
    state = 'prep';
    healCastle(R.castle.max * .3);
    R.castle.barrier = R.castle.bmax;
    hooks.waveClear && hooks.waveClear(bonus, R.mode !== 'map');
  }
  function calcGems(win) {
    const w = Math.max(0, R.wave - (win ? 0 : 1));
    if (R.mode === 'map') return Math.floor(w * 1.2 + R.bosses * 4 + (win ? 15 + 10 * R.map : 0));
    if (R.mode === 'infinite') return Math.floor(w * 1.5 + R.bosses * 6);
    return Math.floor(R.bosses * 8);
  }
  function finish(win) {
    if (R.over) return; R.over = true;
    const gems = calcGems(win), res = { win, mode: R.mode, map: R.map, wave: Math.max(0, R.wave - (win ? 0 : 1)), bosses: R.bosses, kills: R.kills, gems, earned: Math.round(R.earned), newBest: false, unlocked: false };
    Save.d.gems += gems;
    if (R.mode === 'infinite' && res.wave > Save.d.best.inf) { Save.d.best.inf = res.wave; res.newBest = true; }
    if (R.mode === 'boss' && R.bosses > Save.d.best.boss) { Save.d.best.boss = R.bosses; res.newBest = true; }
    if (R.mode === 'map' && win && Save.d.cleared < R.map + 1) { Save.d.cleared = R.map + 1; res.unlocked = R.map + 1 < MAPS.length; }
    Save.store();
    state = 'over'; wv.active = false;
    win ? Snd.sfx.win() : Snd.sfx.lose();
    Snd.stop();
    setTimeout(() => hooks.over && hooks.over(res), win ? 600 : 900);
  }

  /* ================= compras (partida) ================= */
  const buy = {
    up(id) {
      const lvl = R.up[id], u = UPGRADES[id];
      if (lvl >= u.max) return false;
      const c = upCost(id, lvl); if (R.gold < c) { Snd.sfx.nope(); return false; }
      R.gold -= c; R.up[id]++; recalc(false); Snd.sfx.buy();
      if (u.group === 'castelo') checkTier();
      return true;
    },
    skill(id) {
      const l = R.skills[id], s = SKILLS[id];
      if (l >= SKILL_MAX) return false;
      const c = l === 0 ? s.unlock : Math.round(s.base * Math.pow(s.grow, l - 1));
      if (R.gold < c) { Snd.sfx.nope(); return false; }
      R.gold -= c; R.skills[id]++; Snd.sfx.buy(); return true;
    },
    trap(i) {
      const s = R.slots[i];
      if (s.lvl >= TRAP_MAX) return false;
      const c = trapCost(s.type, s.lvl); if (R.gold < c) { Snd.sfx.nope(); return false; }
      R.gold -= c; s.lvl++; s.cd = 0; Snd.sfx.buy(); return true;
    },
    ally(id) {
      const l = R.allies[id], a = ALLIES[id];
      if (l >= a.max) return false;
      const c = allyCost(id, l); if (R.gold < c) { Snd.sfx.nope(); return false; }
      R.gold -= c; R.allies[id]++; R.allyCd[id] = .4; Snd.sfx.buy();
      const p = allyPos(id); burst(p.x, p.foot - 8, ['#ffd84a', '#ffffff'], 14, 60, .6, 1, -40);
      return true;
    },
    pet(id) {
      if (R.pets[id]) return false;
      const c = PET_COST[id]; if (R.gold < c) { Snd.sfx.nope(); return false; }
      R.gold -= c; R.pets[id] = 1; petObj[id] = null; delete petObj[id]; Snd.sfx.buy();
      const p = petOf(id); p.x = mage.x + 10; p.y = mage.foot - 10; burst(p.x, p.y, ['#ffd84a', '#ffffff'], 14, 60, .6, 1, -40);
      return true;
    },
    repair() {
      const c = R.castle, need = c.max - c.hp, cost = Math.ceil(need * .5);
      if (need < 1) return false;
      if (R.gold < 1) { Snd.sfx.nope(); return false; }
      const pay = Math.min(R.gold, cost), heal = pay >= cost ? need : pay * 2;
      R.gold -= pay; c.hp = Math.min(c.max, c.hp + heal); Snd.sfx.buy(); return true;
    },
  };
  function checkTier() {
    const n = R.up.wall + R.up.barrier + R.up.thorns, t = Art.tierFor(n);
    if (t > R.tier) {
      R.tier = t; castleFlash = 1; shake = Math.max(shake, 4);
      for (let i = 0; i < 40; i++) PT.push({ x: rand(0, 110), y: GY - rand(0, 150), vx: rand(-30, 30), vy: rand(-80, -20), life: rand(.5, 1.1), t: 0, col: pick(['#ffd84a', '#ffffff', '#9ff0ff']), size: Math.random() < .3 ? 2 : 1, g: 40 });
      Snd.sfx.tier(); hooks.tierUp && hooks.tierUp(t);
    }
  }
  const repairCost = () => Math.ceil((R.castle.max - R.castle.hp) * .5);

  /* ================= cartas ================= */
  function drawCards() {
    const hasAlly = Object.values(R.allies).some(l => l > 0);
    const pool = CARDS.filter(c => (!c.req || R.skills[c.req] > 0) && (!c.ally || hasAlly) && (!c.max || card(c.id) < c.max) && (c.id !== 'crit' || critCh() < 1) && (c.id !== 'pet' || Object.keys(R.pets).length));
    const out = [];
    while (out.length < 3 && pool.length) {
      const wts = pool.map(c => c.rar === 0 ? 10 : c.rar === 1 ? 5 : 2);
      let r = Math.random() * wts.reduce((a, b) => a + b, 0), k = 0;
      while (r > wts[k]) { r -= wts[k]; k++; }
      out.push(pool[k]); pool.splice(k, 1);
    }
    return out;
  }
  function pickCard(id) {
    R.cards[id] = (R.cards[id] || 0) + 1; recalc(false); Snd.sfx.card();
  }

  /* ================= renderização (tudo em pixel) ================= */
  const PX = Art.px, OUT_C = '#150f22';
  const text = (s, x, y, col, size, align, outline) => Art.text(cx, s, x, y, col, size || 8, align, outline);
  const disc = (x, y, r, col) => PX.disc(cx, col, x, y, r);
  const rc = (col, a, b, w, h) => { cx.fillStyle = col; cx.fillRect(Math.round(a), Math.round(b), w, h); };

  function drawCloud(c) {
    cx.fillStyle = 'rgba(255,255,255,.85)';
    const x = Math.round(c.x), y = Math.round(c.y);
    cx.fillRect(x + 6, y, 24, 6); cx.fillRect(x, y + 6, 44, 6); cx.fillRect(x + 12, y - 5, 14, 6);
    cx.fillStyle = 'rgba(200,220,240,.9)'; cx.fillRect(x, y + 10, 44, 3);
  }

  function drawVines(e, dw) {
    const g = Math.min(1, e.rootAge / .25), n = e.scale > 1 ? 5 : 3, k0 = e.scale > 1 ? 1.5 : 1;
    PX.ell(cx, '#2a1a10', e.x, e.y + 2, dw * .38, 2);
    for (let k = 0; k < n; k++) {
      const bx = e.x + (k - (n - 1) / 2) * (dw * .75 / n), h = (7 + (k % 2) * 5) * k0 * g, sw = Math.sin(T * 3 + k * 1.7) * 1.4;
      PX.line(cx, OUT_C, bx, e.y + 2, bx + sw, e.y - h, 3);
      PX.line(cx, k % 2 ? '#4fae56' : '#2e9c4c', bx, e.y + 2, bx + sw, e.y - h, 1);
      rc('#8fe070', bx + sw - 1, e.y - h - 1, 3, 2);
      if (h > 6) { rc('#6e4520', bx + 1, e.y - h * .5, 2, 1); rc('#6e4520', bx - 2, e.y - h * .3, 2, 1); }
    }
  }

  function drawEnemy(e) {
    const s = Art.SPR[e.sprite]; if (!s) return;
    const sc = e.scale || 1, dw = s.w * sc, dh = s.h * sc;
    const walking = e.x > e.stopX && e.freezeT <= 0 && e.rootT <= 0;
    let bob = 0, sx = 1, sy = 1;
    if (e.sprite === 'slime') { const ph = Math.abs(Math.sin(e.anim * (walking ? 5 : 2))); bob = -ph * 3 * sc; sy = 1 - ph * .06; sx = 1 + ph * .06; }
    else if (walking && !e.fly) bob = -Math.abs(Math.sin(e.anim * 9)) * 1.5 * (sc > 1 ? 1.4 : 1);
    const lunge = e.hit > 0 ? -Math.sin((.15 - e.hit) / .15 * Math.PI) * 4 * sc : 0;
    if (!e.fly) PX.ell(cx, 'rgba(0,0,0,.3)', e.x, e.y + 1, dw * .38, 2.5 * sc);
    else PX.ell(cx, 'rgba(0,0,0,.22)', e.x, GY + 6, 6, 2);
    if (e.boss) { const pul = .25 + .12 * Math.sin(T * 4); PX.ell(cx, `rgba(255,60,90,${pul})`, e.x, e.y + 1, dw * .6, 5 * sc); }
    const img = e.flash > 0 ? s.f : (e.freezeT > 0 ? s.i : (e.slowT > 0 && e.slowF > .25 ? s.i : (e.poisT > 0 ? s.p : s.n)));
    let dx = e.x - dw / 2 + lunge, dy = e.fly ? e.y - dh / 2 : e.y - s.foot * sc + sc;
    dy += bob;
    cx.save();
    if (sx !== 1 || sy !== 1) { cx.translate(e.x, e.fly ? e.y : e.y + 1); cx.scale(sx, sy); cx.drawImage(img, Math.round(-dw / 2 + lunge), Math.round(dy - (e.fly ? e.y : e.y + 1)), dw, dh); }
    else cx.drawImage(img, Math.round(dx), Math.round(dy), dw, dh);
    cx.restore();
    if (e.fly && !e.freezeT) { cx.fillStyle = 'rgba(77,47,125,.35)'; const f = Math.sin(e.anim * 24) > 0 ? 1 : 0; cx.fillRect(Math.round(dx), Math.round(dy + 2 + f * 3), dw, 2); }
    if (e.boss && e.tpl.crown) { cx.save(); cx.translate(Math.round(e.x), Math.round(dy + 3 * sc)); cx.scale(Math.max(1, Math.round(sc * .6)), Math.max(1, Math.round(sc * .6))); Art.crown(cx, 0, 0); cx.restore(); }
    if (e.freezeT > 0) { cx.fillStyle = 'rgba(200,240,255,.55)'; cx.fillRect(Math.round(e.x - dw / 2 + 2), Math.round(dy + 2), 2, 2); }
    if (e.rootT > 0) drawVines(e, dw);
    if (e.poisT > 0 && Math.random() < .08 && PT.length < 470) PT.push({ x: e.x + rand(-4, 4), y: cy(e) - e.h / 2, vx: rand(-4, 4), vy: -16, life: .5, t: 0, col: '#9be85a', size: 1, g: 0 });
    if (!e.boss && e.hp < e.max) {
      const bw = Math.max(10, Math.round(dw * .7)), bx = Math.round(e.x - bw / 2), by = Math.round(dy - 5);
      cx.fillStyle = '#150f22'; cx.fillRect(bx - 1, by - 1, bw + 2, 4);
      cx.fillStyle = '#4a1a24'; cx.fillRect(bx, by, bw, 2);
      cx.fillStyle = e.hp / e.max > .5 ? '#6bdc7a' : e.hp / e.max > .25 ? '#ffc857' : '#ff5a5a'; cx.fillRect(bx, by, Math.max(1, Math.round(bw * e.hp / e.max)), 2);
    }
  }

  function drawCastle() {
    const k = Save.d.equip.castle, tier = R.tier, cs = Art.castle(k, tier), oy = GY - Art.CH, by = GY - 160;
    cx.drawImage(cs.c, 0, oy);
    const hpR = R.castle.hp / R.castle.max;
    if (!demo) Art.drawCracks(cx, 0, oy, hpR < .2 ? 3 : hpR < .45 ? 2 : hpR < .75 ? 1 : 0);
    if (castleFlash > 0) { cx.globalAlpha = clamp(castleFlash, 0, 1) * .8; cx.drawImage(cs.flash || (cs.flash = Art.tint(cs.c, '#ffffff')), 0, oy); cx.globalAlpha = 1; }
    // tochas
    for (const [tx, ty] of cs.torches) {
      const f = Math.sin(T * 14 + tx) > 0 ? 1 : 0, y = by + ty;
      PX.halo(cx, 'rgba(255,170,60,.5)', tx + 1, y - 4, 7 + f, (T * 8) | 0);
      rc('#ff7a1a', tx - 1, y - 5 - f, 4, 5 + f); rc('#ffd166', tx, y - 4 - f, 2, 3 + f); rc('#fff3b0', tx, y - 2, 1, 1);
      if (Math.random() < .03 && PT.length < 470) PT.push({ x: tx + 1, y: y - 6, vx: rand(-6, 6), vy: -rand(14, 28), life: .6, t: 0, col: '#ffd166', size: 1, g: 0 });
    }
    // bandeira
    const [fx, ft] = cs.pole, big = tier >= 4, fl = big ? 18 : 13, fh = big ? 10 : 8, ftop = by + (big ? -3 : -1);
    if (!big) { rc(OUT_C, fx - 1, by + ft - 24, 3, 25); rc('#6e4520', fx, by + ft - 23, 1, 23); rc('#ffd84a', fx - 1, by + ft - 25, 3, 2); }
    for (let i = 0; i < fl; i++) {
      const wob = Math.round(Math.sin(T * 5 - i * .5) * (1 + i * .12)), hh = fh - (i > fl - 4 ? i - (fl - 4) : 0), xx = fx + 1 + i, yy = ftop + wob;
      rc(OUT_C, xx, yy - 1, 1, hh + 2); rc(cs.p.flag, xx, yy, 1, hh); rc(Art.mix(cs.p.flag, '#ffffff', .35), xx, yy, 1, 1); rc(Art.mix(cs.p.flag, '#000000', .3), xx, yy + hh - 1, 1, 1);
    }
    rc('#ffffff', fx + 4, ftop + 3 + Math.round(Math.sin(T * 5 - 2) * 1.3), 2, 2);
    // cristal flutuante
    const cyy = by + 30 + Math.sin(T * 2) * 3, cxx = 76 + (tier >= 2 ? 6 : 0);
    PX.halo(cx, 'rgba(160,230,255,.55)', cxx, cyy, 10, (T * 4) | 0);
    rc(OUT_C, cxx - 4, cyy - 7, 9, 15); rc(OUT_C, cxx - 6, cyy - 4, 13, 9);
    rc('#9ff0ff', cxx - 1, cyy - 6, 3, 12); rc('#9ff0ff', cxx - 4, cyy - 3, 9, 6); rc('#9ff0ff', cxx - 2, cyy - 5, 5, 10);
    rc('#e8ffff', cxx - 1, cyy - 4, 1, 5); rc('#3aa7d8', cxx + 1, cyy, 2, 4); rc('#3aa7d8', cxx + 2, cyy - 2, 2, 2);
    // runas no chão
    const gl = 'rgba(160,230,255,' + (.2 + .1 * Math.sin(T * 3)) + ')';
    for (let x = 12; x < 86; x += 6) rc(gl, x, GY + 2, 3, 1);
    // aura do nível máximo
    if (tier >= 4) {
      for (let x = 4; x < 108; x += 4) { cx.globalAlpha = .35 + .3 * Math.sin(T * 3 + x * .3); rc(cs.p.glow, x, by + 154, 2, 2); }
      cx.globalAlpha = 1;
      if (Math.random() < .12 && PT.length < 470) PT.push({ x: rand(4, 108), y: by + rand(30, 150), vx: rand(-3, 3), vy: -rand(8, 20), life: 1.2, t: 0, col: pick(['#ffd84a', '#ffffff']), size: 1, g: 0 });
    }
    // barreira
    if (R.castle.bmax > 0 && R.castle.barrier > 0) {
      const a = .15 + .3 * (R.castle.barrier / R.castle.bmax);
      for (let y = oy + 60; y < GY; y += 2) { cx.fillStyle = `rgba(127,224,255,${a * (.7 + .3 * Math.sin(T * 4 + y * .3))})`; cx.fillRect(CASTLE_X + 3 + Math.round(Math.sin(y * .15 + T * 3) * 1), y, 2, 2); }
    }
    // fumaça com pouca vida
    if (!demo && hpR < .35 && Math.random() < .12) PT.push({ x: rand(10, 100), y: GY - rand(60, 140), vx: rand(-4, 4), vy: -22, life: 1, t: 0, col: 'rgba(80,80,100,.6)', size: 3, g: 0 });
  }

  function drawMage() {
    const s = Art.mage(mageId()), bob = Math.sin(mage.anim * 2.2) * .8 - (mage.cast > 0 ? 1 : 0);
    const dx = Math.round(mage.x - s.w / 2), dy = Math.round(mage.foot - s.foot + 1 + bob);
    rc('rgba(0,0,0,.25)', dx + 3, mage.foot, 12, 2);
    cx.drawImage(s.n, dx, dy);
    const g = Art.magePalette(mageId()).g, tipX = dx + 14, tipY = dy + 2, big = mage.cast > 0;
    PX.halo(cx, g, tipX, tipY, 4 + (big ? 3 : 0) + Math.round(Math.sin(T * 5)), (T * 10) | 0);
    disc(tipX, tipY, 1.5, '#fff');
    if (Math.random() < .12 && PT.length < 480) PT.push({ x: tipX, y: tipY, vx: rand(-8, 8), vy: rand(-22, -8), life: .5, t: 0, col: g, size: 1, g: 0 });
  }
  function drawPet() {
    if (!R || !R.pets) return;
    for (const id of Object.keys(PET_COST)) {
      if (!R.pets[id]) continue;
      const pet = petOf(id), s = Art.pet(id); if (!s) continue;
      cx.drawImage(s.n, Math.round(pet.x - s.w / 2), Math.round(pet.y - s.h / 2 + Math.sin(pet.a * 5) * 1.2));
    }
  }
  function drawAllies() {
    for (const id of Object.keys(ALLIES)) {
      const l = R.allies[id], pos = allyPos(id), s = Art.ally(id);
      if (!l) {
        if (state === 'prep' && !demo) { cx.globalAlpha = .28; cx.drawImage(s.n, Math.round(pos.x - s.w / 2), Math.round(pos.foot - s.foot + 1)); cx.globalAlpha = 1; }
        continue;
      }
      const kick = R.allyKick[id] > 0 ? -1 : 0, bob = Math.round(Math.sin(T * 2 + pos.x) * .6);
      const dx = Math.round(pos.x - s.w / 2) + kick, dy = Math.round(pos.foot - s.foot + 1 + bob);
      rc('rgba(0,0,0,.28)', dx + 3, pos.foot, s.w - 6, 2);
      cx.drawImage(s.n, dx, dy);
      if (id === 'cleric') PX.halo(cx, 'rgba(255,240,150,.7)', dx + 3, dy + 2, 3, (T * 6) | 0);
      if (id === 'frostmage') { PX.halo(cx, '#aaf0ff', dx + 13, dy + 3, 3, (T * 6) | 0); }
      for (let k = 0; k < l; k++) { rc(OUT_C, pos.x - l + k * 2 - 1, pos.foot + 2, 3, 3); rc('#ffd84a', pos.x - l + k * 2, pos.foot + 3, 1, 1); }
    }
  }

  function drawTraps() {
    R.slots.forEach((s, i) => {
      const x = TRAP_X[i], y = GY + 7, tr = TRAPS[s.type];
      if (s.lvl < 1) {
        if (state === 'prep' && !demo) {
          PX.ellRing(cx, 'rgba(255,255,255,.4)', x, y, 14, 5, 2);
          cx.globalAlpha = .4; cx.drawImage(Art.icon(tr.icon).n, x - 6, y - 12); cx.globalAlpha = 1;
        }
        return;
      }
      const pul = .5 + .5 * Math.sin(s.t * 4);
      PX.ell(cx, 'rgba(0,0,0,.3)', x, y + 1, 14, 5);
      if (s.type === 'spikes') {
        const up = s.pulse > 0 ? 3 : 0; if (s.pulse > 0) s.pulse -= .016;
        for (let k = -2; k <= 2; k++) { PX.tri(cx, OUT_C, x + k * 5, y + 3, 4, 12 + up); PX.tri(cx, '#9aa2b8', x + k * 5, y + 2, 3, 9 + up); PX.tri(cx, '#e8ecf6', x + k * 5 - 1, y + 1, 0, 6 + up); }
      } else if (s.type === 'frost') {
        PX.ell(cx, `rgba(127,224,255,${.2 + .15 * pul})`, x, y, 16, 6);
        PX.ellRing(cx, '#bff3ff', x, y, 11, 4, 0);
        rc('#e8ffff', x - 1, y - 3, 3, 7); rc('#e8ffff', x - 4, y, 9, 1); rc('#7fe0ff', x - 3, y - 2, 1, 1); rc('#7fe0ff', x + 3, y + 2, 1, 1);
        if (Math.random() < .05) PT.push({ x: x + rand(-10, 10), y, vx: 0, vy: -18, life: .6, t: 0, col: '#cfeeff', size: 1, g: 0 });
      } else if (s.type === 'fire') {
        PX.ell(cx, `rgba(255,122,26,${.25 + .2 * pul})`, x, y, 16, 6);
        PX.ellRing(cx, '#ffb347', x, y, 11, 4, 0);
        rc('#ff4d2a', x - 2, y - 2, 5, 4); rc('#ffd166', x - 1, y - 1, 3, 2);
        if (Math.random() < .35) PT.push({ x: x + rand(-8, 8), y: y - 1, vx: rand(-4, 4), vy: -rand(20, 40), life: .45, t: 0, col: pick(['#ff7a1a', '#ffd166', '#ff4d2a']), size: 2, g: 0 });
      } else if (s.type === 'bomb') {
        const ready = s.cd <= 0;
        disc(x, y - 3, 7, OUT_C); disc(x, y - 3, 6, ready ? '#2a2438' : '#4a4658'); rc(ready ? '#ff4d6d' : '#7a6a78', x - 3, y - 6, 2, 2);
        rc('#8a5a2b', x + 2, y - 11, 1, 4);
        if (ready) rc(pul > .5 ? '#ffd166' : '#ff7a1a', x + 2, y - 13, 2, 2);
        else { const f = 1 - s.cd / Math.max(3, 8 - .8 * s.lvl); rc('#150f22', x - 9, y + 6, 18, 3); rc('#ffd166', x - 8, y + 7, Math.round(16 * f), 1); }
      }
      for (let k = 0; k < s.lvl; k++) { rc(OUT_C, x - 13 + k * 5, y + 8, 4, 3); rc('#ffd166', x - 12 + k * 5, y + 9, 2, 1); }
    });
  }

  function drawProjectile(p) {
    if (p.k === 'basic') { disc(p.x, p.y, 3, 'rgba(160,230,255,.3)'); rc(p.col, p.x - 1, p.y - 1, 3, 3); rc('#fff', p.x, p.y, 1, 1); }
    else if (p.k === 'pet') { rc(p.col, p.x - 1, p.y - 1, 3, 3); rc('#fff', p.x, p.y, 1, 1); }
    else if (p.k === 'fire') {
      const vt = p.vt || 0, r = 3 + vt;
      PX.halo(cx, '#ff9a3a', p.x, p.y, r + 5, (T * 30) | 0);
      disc(p.x, p.y, r + 1, '#ff4d2a'); disc(p.x, p.y, r, '#ff7a1a'); disc(p.x, p.y, r - 1.5, vt >= 3 ? '#9fd8ff' : '#ffd166'); disc(p.x, p.y, Math.max(1, r - 3), '#fff');
      if (vt >= 2) for (let q = 0; q < 2; q++) { const a = p.age * 12 + q * Math.PI; rc('#ffd166', p.x + Math.cos(a) * (r + 4), p.y + Math.sin(a) * (r + 4), 2, 2); }
    } else if (p.k === 'ally') {
      const sp = Math.hypot(p.vx, p.vy) || 1, nx = p.vx / sp, ny = p.vy / sp;
      if (p.sub === 'arrow') { PX.line(cx, '#8a5a2b', p.x, p.y, p.x - nx * 7, p.y - ny * 7, 1); rc('#e8ecf6', p.x, p.y, 2, 2); rc('#6bdc7a', p.x - nx * 7, p.y - ny * 7, 2, 2); }
      else if (p.sub === 'bolt') { PX.line(cx, OUT_C, p.x, p.y, p.x - nx * 13, p.y - ny * 13, 4); PX.line(cx, '#b07a3a', p.x, p.y, p.x - nx * 13, p.y - ny * 13, 2); rc('#e8ecf6', p.x - 1, p.y - 1, 3, 3); rc('#ff5a4a', p.x - nx * 13 - 1, p.y - ny * 13 - 1, 3, 3); }
      else if (p.sub === 'ice') { rc('#7fe0ff', p.x - 2, p.y - 1, 5, 3); rc('#7fe0ff', p.x - 1, p.y - 2, 3, 5); rc('#fff', p.x, p.y, 1, 1); }
      else { PX.halo(cx, '#fff0a0', p.x, p.y, 4, (T * 20) | 0); disc(p.x, p.y, 2, '#fff0a0'); rc('#fff', p.x, p.y, 1, 1); }
    }
  }

  function drawFx(f) {
    const p = clamp(f.t / f.life, 0, 1);
    if (f.k === 'ring') {
      if (f.t < 0) return;
      cx.globalAlpha = 1 - p; const r = lerp(f.r, f.max, 1 - Math.pow(1 - p, 2));
      if (f.flat) PX.ellRing(cx, f.col, f.x, f.y, r, r * .32, 0); else PX.ring(cx, f.col, f.x, f.y, r, f.w || 2);
      if (f.w >= 3 && r < 90) { cx.globalAlpha = (1 - p) * .14; disc(f.x, f.y, r, f.col); }
      cx.globalAlpha = 1;
    } else if (f.k === 'glow') { cx.globalAlpha = (1 - p) * .85; PX.halo(cx, f.col, f.x, f.y, f.r * (.5 + p * .5), 0); cx.globalAlpha = (1 - p) * .45; disc(f.x, f.y, f.r * .45 * (1 - p * .5), '#fff3b0'); cx.globalAlpha = 1; }
    else if (f.k === 'bolt') {
      cx.globalAlpha = 1 - p; const vt = f.vt || 0;
      const draw = (w, c, pts) => { for (let i = 0; i < pts.length - 1; i++) PX.line(cx, c, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, w); };
      draw(3 + vt * 2, 'rgba(255,230,100,.35)', f.pts); draw(2 + (vt >= 1 ? 1 : 0), '#fff3a0', f.pts); draw(1, '#ffffff', f.pts);
      for (const fk of f.forks || []) PX.line(cx, '#fff3a0', fk[0].x, fk[0].y, fk[1].x, fk[1].y, 1);
      cx.globalAlpha = 1;
    } else if (f.k === 'meteor') {
      if (f.t < 0) { PX.ellRing(cx, 'rgba(255,80,60,.6)', f.tx, f.ty, 10 + f.vt * 2, 3, 2); return; }
      if (f.done) return;
      const vt = f.vt || 0, s = 5 + vt;
      PX.line(cx, '#ff4d2a', f.x, f.y, f.x + 22 + vt * 8, f.y - 14 - vt * 5, 3 + vt); PX.line(cx, '#ffb347', f.x, f.y, f.x + 16 + vt * 6, f.y - 10 - vt * 4, 1 + (vt >= 2 ? 1 : 0));
      PX.halo(cx, '#ff8a3a', f.x, f.y, s + 5, (T * 24) | 0);
      disc(f.x, f.y, s, '#c0261d'); disc(f.x, f.y, s - 1, '#ff5a1a'); disc(f.x, f.y, s - 3, '#ffb347'); disc(f.x, f.y, Math.max(1, s - 5), '#fff');
    } else if (f.k === 'icicle') {
      if (f.t < 0) return;
      const h = Math.round(f.h * (p < .25 ? p / .25 : p > .75 ? (1 - p) / .25 : 1)), bx = Math.round(f.x), by = GY + 5;
      if (h < 2) return;
      PX.tri(cx, OUT_C, bx, by + 1, 4, h + 2); PX.tri(cx, '#5fc3e8', bx, by, 3, h); PX.tri(cx, '#aaf0ff', bx - 1, by, 1, h - 1); PX.tri(cx, '#ffffff', bx - 1, by - 2, 0, Math.max(1, h - 5));
    } else if (f.k === 'pillar') {
      const vt = f.vt, w = Math.round((5 + vt * 2) * (1 - p * .45)), a = p < .15 ? p / .15 : 1 - (p - .15) / .85;
      cx.globalAlpha = clamp(a, 0, 1) * .35; rc('#fff0a0', f.x - w - 3, 0, w * 2 + 7, GY + 8);
      cx.globalAlpha = clamp(a, 0, 1) * .6; rc('#fff0a0', f.x - w, 0, w * 2 + 1, GY + 8);
      cx.globalAlpha = clamp(a, 0, 1); rc('#ffffff', f.x - Math.round(w * .45), 0, Math.round(w * .9) + 1, GY + 8);
      cx.globalAlpha = clamp(a, 0, 1) * .8; PX.ellRing(cx, '#fff0a0', f.x, GY + 6, lerp(6, f.r, 1 - Math.pow(1 - p, 2)), lerp(2, f.r * .3, 1 - Math.pow(1 - p, 2)), 0);
      PX.halo(cx, '#fff0a0', f.x, GY + 4, 14 + vt * 3, (f.t * 12) | 0); cx.globalAlpha = 1;
      if (PT.length < 470 && Math.random() < .7) PT.push({ x: f.x + rand(-w - 6, w + 6), y: GY, vx: 0, vy: -rand(30, 70), life: .8, t: 0, col: pick(['#fff0a0', '#ffffff', '#8bff9b']), size: Math.random() < .3 ? 2 : 1, g: 0 });
    } else if (f.k === 'beam') {
      const w = Math.max(1, Math.round(5 * (1 - p)));
      cx.globalAlpha = 1 - p * .6; rc('#fff0a0', f.x - w, 0, w * 2 + 1, GY + 8); rc('#ffffff', f.x - (w >> 1), 0, w + 1, GY + 8); cx.globalAlpha = 1;
    } else if (f.k === 'scorch') { cx.globalAlpha = .55 * (1 - p); PX.ell(cx, '#150f0f', f.x, f.y + 2, f.rx, 3); cx.globalAlpha = 1; }
    else if (f.k === 'firecol') {
      cx.globalAlpha = 1 - p * .8;
      for (let i = 0; i < 26; i++) { const w = Math.max(1, Math.round((5 - i * .16) * (1 - p * .5))); rc(i < 8 ? '#ffd166' : i < 16 ? '#ff7a1a' : '#ff4d2a', f.x - w + Math.round(Math.sin(T * 20 + i) * 1.5), f.y - i * 2 * Math.min(1, p * 4 + .3), w * 2, 2); }
      cx.globalAlpha = 1;
    } else if (f.k === 'flash') { cx.globalAlpha = (1 - p) * .35; rc(f.col, 0, 0, W, H); cx.globalAlpha = 1; }
    else if (f.k === 'flask') {
      const x = lerp(f.sx, f.tx, p), y = lerp(f.sy, f.ty, p) - Math.sin(p * Math.PI) * 42;
      rc(OUT_C, x - 3, y - 4, 7, 9); rc('#9fe8c0', x - 2, y - 1, 5, 5); rc('#7bdc4a', x - 2, y + 1, 5, 3); rc('#8a5a2b', x - 1, y - 3, 3, 2); rc('#fff', x - 2, y - 1, 1, 2);
      if (PT.length < 470 && Math.random() < .6) PT.push({ x, y, vx: rand(-8, 8), vy: rand(-4, 12), life: .35, t: 0, col: '#7bdc4a', size: 1, g: 60 });
    }
  }
  function drawZone(z) {
    const fade = clamp(Math.min(z.t / .3, (z.life - z.t) / .8), 0, 1), r = z.r;
    cx.globalAlpha = .55 * fade; PX.ell(cx, '#3a8a2a', z.x, GY + 6, r, r * .3);
    cx.globalAlpha = .75 * fade; PX.halo(cx, '#9be85a', z.x, GY - r * .1, r * .85, 0);
    for (let i = 0; i < 5 + z.vt * 2; i++) { const a = z.ph + i * 2.4 + z.t * .6, rr = r * (.2 + .5 * ((i * 37) % 10) / 10), bx = z.x + Math.cos(a) * rr, bw = 6 + (i % 3) * 3 + z.vt; cx.globalAlpha = .4 * fade; disc(bx, GY - 4 - ((i * 13) % 14) + Math.sin(a * 2) * 2, bw, i % 2 ? '#7bdc4a' : '#a8f070'); }
    cx.globalAlpha = fade;
    for (let i = 0; i < 3 + z.vt; i++) { const a = z.ph + i * 1.9 + z.t * 1.3, bx = z.x + Math.sin(a) * r * .6, by = GY + 4 - ((z.t * 14 + i * 9) % 22); rc('#d8ffb0', bx, by, 2, 2); }
    cx.globalAlpha = 1;
  }

  function render() {
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.imageSmoothingEnabled = false;
    cx.clearRect(0, 0, W, H);
    if (!R || !bgMap) return;
    let sx = 0, sy = 0;
    if (Save.d.set.shake && shake > 0) { sx = Math.round(rand(-1, 1) * shake * .4); sy = Math.round(rand(-1, 1) * shake * .4); }
    cx.save(); cx.translate(sx, sy);
    cx.drawImage(bgMap.back, 0, 0);
    const amb = MAPS[mapIdx].amb;
    if (amb === 'clouds') for (const c of clouds) drawCloud(c);
    cx.drawImage(bgMap.front, 0, 0);
    for (const a of AMB) {
      if (amb === 'fireflies') { const al = .5 + .5 * Math.sin(a.ph * 3); cx.fillStyle = `rgba(230,255,120,${al * .9})`; cx.fillRect(Math.round(a.x), Math.round(a.y), 2, 2); cx.fillStyle = `rgba(230,255,120,${al * .2})`; cx.fillRect(Math.round(a.x) - 1, Math.round(a.y) - 1, 4, 4); }
      else if (amb === 'wisps') { const al = .35 + .35 * Math.sin(a.ph * 2); cx.fillStyle = `rgba(160,190,255,${al})`; cx.fillRect(Math.round(a.x), Math.round(a.y), 2, 2); cx.fillStyle = `rgba(160,190,255,${al * .25})`; cx.fillRect(Math.round(a.x) - 1, Math.round(a.y) - 1, 4, 4); }
      else if (amb === 'snow') { cx.fillStyle = a.s > .7 ? '#ffffff' : 'rgba(255,255,255,.7)'; cx.fillRect(Math.round(a.x), Math.round(a.y), a.s > .8 ? 2 : 1, a.s > .8 ? 2 : 1); }
      else if (amb === 'dust') { cx.fillStyle = `rgba(220,210,190,${.12 + .12 * Math.sin(a.ph * 2)})`; cx.fillRect(Math.round(a.x), Math.round(a.y), 1, 1); }
      else if (amb === 'embers') { cx.fillStyle = a.s > .7 ? '#ffd166' : '#ff7a1a'; cx.globalAlpha = .5 + .4 * Math.sin(a.ph * 4); cx.fillRect(Math.round(a.x), Math.round(a.y), 1 + (a.s > .8 ? 1 : 0), 1 + (a.s > .8 ? 1 : 0)); cx.globalAlpha = 1; }
    }
    for (const f of FX) if (f.k === 'scorch') drawFx(f);
    for (const z of ZN) drawZone(z);
    drawTraps();
    drawCastle();
    drawAllies();
    const order = E.slice().sort((a, b) => (a.fly ? 999 : a.y) - (b.fly ? 999 : b.y));
    for (const e of order) if (!e.fly) drawEnemy(e);
    drawMage(); drawPet();
    for (const e of order) if (e.fly) drawEnemy(e);
    for (const p of P) drawProjectile(p);
    for (const p of EP) { disc(p.x, p.y, 5, p.col + '44'); rc(p.col, p.x - 2, p.y - 2, 4, 4); rc('#fff', p.x - 1, p.y - 1, 1, 1); }
    for (const o of CO) {
      const w = Math.max(1, Math.round(Math.abs(Math.cos(o.age * 10)) * 5));
      cx.fillStyle = '#150f22'; cx.fillRect(Math.round(o.x - w / 2) - 1, Math.round(o.y) - 4, w + 2, 7);
      cx.fillStyle = '#ffd23f'; cx.fillRect(Math.round(o.x - w / 2), Math.round(o.y) - 3, w, 5);
      cx.fillStyle = '#fff3a0'; cx.fillRect(Math.round(o.x - w / 2), Math.round(o.y) - 3, Math.max(1, w >> 1), 1);
    }
    for (const f of FX) if (f.k !== 'scorch') drawFx(f);
    for (const p of PT) { cx.globalAlpha = clamp(1 - p.t / p.life, 0, 1); cx.fillStyle = p.col; cx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size); }
    cx.globalAlpha = 1;
    for (const t of TX) { cx.globalAlpha = clamp(1 - t.t / t.life + .2, 0, 1); text(t.s, Math.round(t.x), Math.round(t.y), t.col, t.big ? 10 : 8, 'center'); }
    cx.globalAlpha = 1;
    cx.restore();
    if (flashRed > 0) { cx.fillStyle = `rgba(255,40,60,${flashRed * .45})`; cx.fillRect(0, 0, W, H); }
    if (banner) {
      const p = banner.t / banner.life, a = p < .15 ? p / .15 : p > .75 ? (1 - p) / .25 : 1;
      cx.globalAlpha = clamp(a, 0, 1);
      const y = 105 - (1 - Math.min(1, p * 6)) * 10;
      cx.fillStyle = banner.boss ? 'rgba(80,0,20,.6)' : 'rgba(10,10,30,.5)'; cx.fillRect(0, y - 24, W, 44);
      cx.fillStyle = banner.boss ? '#ff4d6d' : '#9d4edd'; cx.fillRect(0, y - 24, W, 1); cx.fillRect(0, y + 19, W, 1);
      if (banner.sub) text(banner.sub, W / 2, y - 8, '#ff9aa8', 9, 'center');
      text(banner.text, W / 2, y + 12, banner.boss ? '#ffd166' : '#fff', banner.boss ? 18 : 20, 'center');
      cx.globalAlpha = 1;
    }
  }

  /* ================= loop ================= */
  let last = 0, accHud = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
    if (!R) return;
    if (!paused && (state === 'wave' || state === 'menu' || state === 'prep')) {
      const n = demo ? 1 : speed;
      for (let i = 0; i < n; i++) update(dt);
    }
    render();
    accHud += dt; if (accHud > .05) { accHud = 0; hooks.hud && hooks.hud(); }
  }

  function init(canvas) {
    cv = canvas; cx = cv.getContext('2d');
    cv.width = W; cv.height = H;
    Art.init();
    for (let i = 0; i < 5; i++) clouds.push({ x: rand(0, W), y: rand(14, 70), s: rand(3, 8) });
    requestAnimationFrame(frame);
  }

  return {
    init, hooks, startDemo, startRun, beginWave, buy, cast, drawCards, checkTier, pickCard, finish, setMap, repairCost,
    get R() { return R; }, get state() { return state; }, get demo() { return demo; },
    get paused() { return paused; }, set paused(v) { paused = v; },
    get speed() { return speed; }, set speed(v) { speed = v; },
    waveLabel, nextWaveInfo, goldMul, dmgMul, castleMax,
    bossBar() { const b = wv.boss; return b && b.alive ? { name: b.tpl.name, hp: b.hp, max: b.max } : null; },
    waveProgress() { if (state !== 'wave' || !wv.total) return 0; const left = E.filter(e => e.alive).length + wv.q.length + (wv.bossSpawn ? 1 : 0); return Math.max(0, Math.min(1, 1 - left / Math.max(wv.total, left))); },
    enemiesLeft() { return E.length + wv.q.length + (wv.bossSpawn ? 1 : 0); },
    get mapIdx() { return mapIdx; },
    quit() { Snd.stop(); startDemo(); },
    cheat(g) { Save.d.gems += g; Save.store(); },
    _dbg: { E: () => E, P: () => P, FX: () => FX, ZN: () => ZN, update, spawn: (t, o) => spawn(t, o), mage, ctx: () => wv },
  };
})();

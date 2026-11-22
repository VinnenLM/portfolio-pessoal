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
      bless: { gold: 0, hp: 0, dmg: 0, luck: 0 },
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
  let E = [], P = [], EP = [], PT = [], TX = [], CO = [], FX = [], AMB = [];
  let shake = 0, flashRed = 0, banner = null, T = 0;
  let wv = { q: [], t: 0, active: false, boss: null, endT: 0 };
  const mage = { x: 26, foot: GY - Art.CH + 30, cast: 0, anim: 0, atk: .5 };
  const pet = { x: 56, y: 56, cd: 1, a: 0 };
  let state = 'menu', paused = false, speed = 1, demo = true, demoT = 0;
  const hooks = {};
  const clouds = [];

  /* ================= estatísticas derivadas ================= */
  const card = id => (R && R.cards[id]) || 0;
  const mageId = () => Save.d.equip.mage;
  const bless = k => Save.d.bless[k] || 0;
  const dmgMul = () => (1 + .15 * R.up.dmg) * (1 + .2 * card('power')) * (1 + .05 * bless('dmg')) * (mageId() === 'archmage' ? 1.08 : 1);
  const spdMul = () => 1 + .1 * R.up.spd + .15 * card('cadence');
  const critCh = () => .03 + .05 * R.up.crit + .1 * card('crit');
  const goldMul = () => (1 + .1 * R.up.gold) * (1 + .25 * card('greed')) * (1 + .05 * bless('luck')) * (mageId() === 'necro' ? 1.12 : 1);
  const castleMax = () => Math.round(260 * (1 + .25 * R.up.wall) * (1 + .1 * bless('hp')));
  const barrierMax = () => (R.up.barrier ? 40 * R.up.barrier : 0) + 60 * card('shield');
  const thornsDmg = () => R.up.thorns * 8 + card('thorn') * 10;
  const trapDmg = (base, lvl) => base * (1 + .7 * (lvl - 1)) * (1 + .4 * card('trap')) * (1 + .5 * (dmgMul() - 1));

  function recalc(full) {
    const c = R.castle, nm = castleMax(), nb = barrierMax();
    if (full) { c.max = nm; c.hp = nm; c.bmax = nb; c.barrier = nb; return; }
    c.hp += Math.max(0, nm - c.max); c.max = nm;
    c.barrier += Math.max(0, nb - c.bmax); c.bmax = nb;
  }

  /* ================= partida ================= */
  function newRun(mode, map) {
    mapIdx = map; setMap(map);
    const m = MAPS[map];
    R = {
      mode, map, wave: 0, kills: 0, bosses: 0, earned: 0, over: false,
      gold: (mode === 'boss' ? 160 : mode === 'infinite' ? 100 : m.start) + 40 * bless('gold'),
      up: {}, cards: {}, skills: { fire: 1, frost: 0, bolt: 0, meteor: 0 },
      cd: { fire: 0, frost: 0, bolt: 0, meteor: 0 }, cdMax: { fire: 1, frost: 1, bolt: 1, meteor: 1 },
      slots: TRAP_X.map(() => ({ type: null, lvl: 0, cd: 0, t: 0 })),
      castle: { hp: 1, max: 1, barrier: 0, bmax: 0, lastHit: 0 },
    };
    for (const k of Object.keys(UPGRADES)) R.up[k] = 0;
    if (mode === 'map') { ['frost', 'bolt', 'meteor'].slice(0, map).forEach(k => R.skills[k] = 1); if (map >= 3) R.skills.fire = 2; }
    if (mode === 'boss') { R.skills = { fire: 2, frost: 1, bolt: 1, meteor: 1 }; R.gold = 260 + 40 * bless('gold'); }
    recalc(true);
    reset();
  }
  function reset() { E = []; P = []; EP = []; PT = []; TX = []; CO = []; FX = []; wv = { q: [], t: 0, active: false, boss: null, endT: 0 }; shake = 0; banner = null; mage.atk = .5; }

  function setMap(i) {
    mapIdx = i; bgMap = Art.map(MAPS[i]);
    AMB = []; const a = MAPS[i].amb;
    if (a === 'fireflies') for (let k = 0; k < 26; k++) AMB.push({ x: rand(0, W), y: rand(100, GY), ph: rand(0, 6), s: rand(.4, 1) });
    if (a === 'wisps') for (let k = 0; k < 16; k++) AMB.push({ x: rand(0, W), y: rand(110, GY - 6), ph: rand(0, 6), s: rand(.4, 1) });
    if (a === 'embers') for (let k = 0; k < 40; k++) AMB.push({ x: rand(0, W), y: rand(0, GY), ph: rand(0, 6), s: rand(.4, 1) });
  }
  function startDemo() {
    demo = true; state = 'menu'; paused = false; demoT = 1;
    newRun('infinite', clamp(Save.d.lastMap || 0, 0, MAPS.length - 1));
    R.skills = { fire: 3, frost: 2, bolt: 2, meteor: 0 };
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
    if (R.mode === 'map' && w === CAMPAIGN_WAVES) return { boss: BOSSES[MAPS[R.map].boss] };
    if (R.mode === 'infinite' && w % 10 === 0) return { boss: bossDef(w / 10 - 1) };
    return {};
  }
  function buildList(w, pool, budgetMul) {
    const avail = pool.filter(p => w >= p[1]).map(p => p[0]);
    let budget = Math.round((8 + 6 * w + .35 * w * w) * budgetMul);
    const list = [];
    while (budget >= 2) {
      const ok = avail.filter(t => ENEMY[t].cost <= budget);
      if (!ok.length) break;
      const wts = ok.map((t, i) => 1 + i * .8);
      let r = Math.random() * wts.reduce((a, b) => a + b, 0), k = 0;
      while (r > wts[k]) { r -= wts[k]; k++; }
      list.push(ok[k]); budget -= ENEMY[ok[k]].cost;
    }
    const dur = Math.min(34, 14 + w * 1.1);
    return list.map(type => ({ t: Math.random() * dur, type })).sort((a, b) => a.t - b.t);
  }
  const INF_POOL = [['slime', 1], ['goblin', 2], ['bat', 3], ['skeleton', 5], ['witch', 8], ['ogre', 10], ['darkmage', 14], ['troll', 16]];

  function beginWave() {
    R.wave++; const w = R.wave, m = MAPS[R.map];
    const info = nextWaveInfoFor(w);
    let list = [];
    const mapMode = R.mode === 'map';
    const scaleHp = waveScale(w) * (mapMode ? m.hp : 1) * (R.mode === 'infinite' && w > 15 ? Math.pow(1.07, w - 15) : 1);
    const ctxW = { hpMul: scaleHp, dmgMul: 1 + .1 * (w - 1) + (mapMode ? .08 * R.map : 0), goldMul: (1 + .1 * (w - 1)) * (mapMode ? m.gold : 1) };
    if (R.mode !== 'boss') list = buildList(w, mapMode ? m.pool : INF_POOL, info.boss ? .55 : 1);
    wv = { q: list, t: 0, active: true, boss: null, endT: 0, ctx: ctxW };
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
    if (R.mode === 'map' && w === CAMPAIGN_WAVES) return { boss: BOSSES[MAPS[R.map].boss] };
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
      slowT: 0, slowF: 0, freezeT: 0, burnT: 0, burnD: 0, poisT: 0, poisD: 0, alive: true, fly,
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
    const val = e.gold * 1.5 * goldMul();
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
    st.dmg *= gm;
    if (id === 'fire') { st.radius *= 1 + .25 * card('fireR'); st.burn *= (1 + .5 * card('fireB')) * (mi === 'pyro' ? 1.2 : 1); if (mi === 'pyro') st.dmg *= 1.2; st.extra = card('fireD'); }
    if (id === 'frost') { st.cd *= Math.pow(.8, card('frostC')); st.freeze = .2 * card('frostF') + (mi === 'cryo' ? .1 : 0); if (mi === 'cryo') { st.slow = .7; st.dur *= 1.25; } }
    if (id === 'bolt') { st.chain += 2 * card('boltC'); st.dmg *= 1 + .4 * card('boltS'); st.cd *= Math.pow(.8, card('boltS')); }
    if (id === 'meteor') { st.n += 2 * card('metR'); st.dmg *= 1 + .3 * card('metP'); }
    return st;
  }
  function cast(id) {
    const l = R.skills[id];
    if (!l || R.cd[id] > 0) return false;
    const st = skillMods(id), tipX = mage.x + 5, tipY = mage.foot - 16;
    if (id === 'fire') {
      const n = 1 + st.extra, tg = targets(n); if (!tg.length) return false;
      for (let i = 0; i < n; i++) {
        const t = tg[i % tg.length];
        setTimeout(() => { if (!R || state === 'menu' && !demo) return; const a = Math.atan2(cy(t) - tipY, t.x - tipX); P.push({ k: 'fire', x: tipX, y: tipY, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, dmg: st.dmg, r: st.radius, burn: st.burn, tx: t.x, ty: cy(t), life: 3, hit: [], tgt: t, turn: 7 }); }, i * 120);
      }
      Snd.sfx.fire();
    } else if (id === 'frost') {
      if (!living().length) return false;
      FX.push({ k: 'ring', x: mage.x, y: GY - 10, r: 6, max: st.radius, t: 0, life: .55, col: '#9ff0ff', w: 3 });
      burst(mage.x, GY - 20, ['#cfeeff', '#7fe0ff'], 26, 120, .8, 2, 0);
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
      const jag = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], n = Math.max(3, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 10));
        for (let k = 0; k < n; k++) jag.push({ x: lerp(a.x, b.x, k / n) + (k ? rand(-5, 5) : 0), y: lerp(a.y, b.y, k / n) + (k ? rand(-5, 5) : 0) });
      }
      jag.push(pts[pts.length - 1]);
      FX.push({ k: 'bolt', pts: jag, t: 0, life: .28 });
      for (const h of hits) burst(h.x, cy(h), '#fff3a0', 6, 80, .3, 1, 0);
      Snd.sfx.bolt();
    } else if (id === 'meteor') {
      if (!living().length) return false;
      const tg = E.filter(e => e.alive && e.x < W - 10);
      for (let i = 0; i < st.n; i++) {
        const base = tg.length ? pick(tg) : null, tx = base ? clamp(base.x + rand(-20, 20), 110, W - 10) : rand(150, 420);
        FX.push({ k: 'meteor', tx, ty: GY + rand(2, 12), x: tx + 90, y: -20, t: -i * .22, fall: .55, dmg: st.dmg, r: st.radius, done: false });
      }
      Snd.sfx.meteor();
    }
    R.cd[id] = R.cdMax[id] = st.cd; mage.cast = .35;
    FX.push({ k: 'ring', x: mage.x + 3, y: mage.foot - 2, r: 3, max: 18, t: 0, life: .3, col: SKILLS[id].color, w: 2 });
    return true;
  }
  function explode(x, y, r, dmg, burn, col) {
    FX.push({ k: 'ring', x, y, r: 3, max: r * 1.2, t: 0, life: .35, col: col || '#ffb347', w: 3 });
    FX.push({ k: 'glow', x, y, r: r * 1.1, t: 0, life: .22, col: col || '#ffb347' });
    burst(x, y, ['#ffd166', '#ff7a1a', '#ff4d2a'], 22, 150, .6, 2, 60);
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

    // pet
    updatePet(dt);

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
        if (p >= 1) { f.done = true; explode(f.tx, f.ty - 4, f.r, f.dmg, 4 * R.skills.meteor, '#ff7a1a'); shake = Math.max(shake, 5); }
      }
    }
    FX = FX.filter(f => f.t < f.life + (f.k === 'meteor' ? f.fall + 1 : 0) && !(f.k === 'meteor' && f.done));
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
      else if (t === 'fireflies' || t === 'wisps') { a.x += Math.sin(a.ph * .8 + a.s * 6) * 14 * dt; a.y += Math.cos(a.ph * .6 + a.s * 3) * 9 * dt; }
    }
    for (const cl of clouds) { cl.x -= cl.s * dt; if (cl.x < -60) cl.x = W + 20; }
  }

  function autoCast() {
    const live = living();
    if (!live.length) return;
    for (const id of ['fire', 'bolt', 'frost', 'meteor']) {
      if (!R.skills[id] || R.cd[id] > 0) continue;
      if (id === 'frost') { const r = skillStats('frost', R.skills.frost).radius; if (!live.some(e => Math.abs(e.x - mage.x) < r * .85)) continue; }
      if (id === 'meteor' && live.length < 3 && !live.some(e => e.boss)) continue;
      cast(id);
    }
  }

  function updatePet(dt) {
    const id = Save.d.equip.pet; if (!id || id === 'none') return;
    pet.a += dt;
    const tx = mage.x + 26 + Math.sin(pet.a * 1.3) * 6, ty = mage.foot - 22 + Math.cos(pet.a * 2) * 4;
    pet.x += (tx - pet.x) * Math.min(1, dt * 5); pet.y += (ty - pet.y) * Math.min(1, dt * 5);
    pet.cd -= dt;
    if (pet.cd <= 0) {
      const t = nearest(); if (!t) return;
      pet.cd = id === 'fairy' ? .8 : 1.15;
      const a = Math.atan2(cy(t) - pet.y, t.x - pet.x), info = Art.PETS[id];
      P.push({ k: 'pet', pet: id, x: pet.x + 4, y: pet.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, dmg: 8 * dmgMul() * (1 + .25 * R.up.pet) * (1 + .5 * card('pet')), hit: [], life: 2, col: info.shot, pierce: 0, tgt: t, turn: 8 });
      Snd.sfx.petshot();
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
    if (e.x > e.stopX) {
      e.x -= e.spd * sf * dt; if (e.x < e.stopX) e.x = e.stopX;
      if (e.fly) e.y = tpl.fy + Math.sin(e.anim * 4) * 12 + (e.x < 250 ? (e.x - 250) * -.18 : 0);
    } else {
      e.atk -= dt * sf;
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
      if (!s.type) return;
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
      if (p.k === 'fire' && PT.length < 480) PT.push({ x: p.x, y: p.y, vx: rand(-15, 15), vy: rand(-15, 15), life: .3, t: 0, col: pick(['#ffd166', '#ff7a1a', '#ff4d2a']), size: 2, g: 0 });
      if (p.k === 'fire' && (Math.hypot(p.x - p.tx, p.y - p.ty) < 7 || p.x > W || p.y > GY + 14)) { p.dead = true; explode(p.x, p.y, p.r, p.dmg, p.burn); continue; }
      for (const e of E) {
        if (!e.alive || p.hit.includes(e)) continue;
        const top = e.fly ? e.y - e.h / 2 : e.y - e.h, bot = e.fly ? e.y + e.h / 2 : e.y;
        if (p.x > e.x - e.w / 2 - 2 && p.x < e.x + e.w / 2 + 2 && p.y > top - 2 && p.y < bot + 2) {
          if (p.k === 'fire') { p.dead = true; explode(p.x, p.y, p.r, p.dmg, p.burn); break; }
          p.hit.push(e); hurt(e, p.dmg, p.k === 'pet' ? { nocrit: true, quiet: true } : null);
          if (p.k === 'pet') {
            if (p.pet === 'dragon') { e.burnT = 2; e.burnD = Math.max(e.burnD, 5 * dmgMul()); }
            if (p.pet === 'owl') { e.slowT = 1.5; e.slowF = Math.max(e.slowF, .3); }
            if (p.pet === 'slimey') { e.poisT = 3; e.poisD = Math.max(e.poisD, 4 * dmgMul()); }
          }
          burst(p.x, p.y, p.col, 4, 60, .25, 1, 0);
          if (p.pierce > 0) { p.pierce--; p.dmg *= .85; } else { p.dead = true; break; }
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
      R.gold -= c; R.up[id]++; recalc(false); Snd.sfx.buy(); return true;
    },
    skill(id) {
      const l = R.skills[id], s = SKILLS[id];
      if (l >= SKILL_MAX) return false;
      const c = l === 0 ? s.unlock : Math.round(s.base * Math.pow(s.grow, l - 1));
      if (R.gold < c) { Snd.sfx.nope(); return false; }
      R.gold -= c; R.skills[id]++; Snd.sfx.buy(); return true;
    },
    trap(i, type) {
      const s = R.slots[i];
      if (type && s.type !== type) { const c = trapCost(type, 0); if (R.gold < c) { Snd.sfx.nope(); return false; } R.gold -= c; s.type = type; s.lvl = 1; s.cd = 0; Snd.sfx.buy(); return true; }
      if (!s.type || s.lvl >= TRAP_MAX) return false;
      const c = trapCost(s.type, s.lvl); if (R.gold < c) { Snd.sfx.nope(); return false; }
      R.gold -= c; s.lvl++; Snd.sfx.buy(); return true;
    },
    repair() {
      const c = R.castle, need = c.max - c.hp, cost = Math.ceil(need * .5);
      if (need < 1) return false;
      if (R.gold < 1) { Snd.sfx.nope(); return false; }
      const pay = Math.min(R.gold, cost), heal = pay >= cost ? need : pay * 2;
      R.gold -= pay; c.hp = Math.min(c.max, c.hp + heal); Snd.sfx.buy(); return true;
    },
  };
  const repairCost = () => Math.ceil((R.castle.max - R.castle.hp) * .5);

  /* ================= cartas ================= */
  function drawCards() {
    const pool = CARDS.filter(c => (!c.req || R.skills[c.req] > 0) && (!c.max || card(c.id) < c.max));
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

  /* ================= renderização ================= */
  const font = (s, bold) => `${bold ? 'bold ' : ''}${s}px "Courier New", monospace`;
  function text(s, x, y, col, size, align, outline) {
    cx.font = font(size || 8, true); cx.textAlign = align || 'left'; cx.textBaseline = 'alphabetic';
    cx.fillStyle = outline || '#150f22';
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) cx.fillText(s, x + dx, y + dy);
    cx.fillStyle = col; cx.fillText(s, x, y);
  }
  const circle = (x, y, r, col) => { cx.fillStyle = col; cx.beginPath(); cx.arc(x, y, r, 0, TAU); cx.fill(); };

  function drawCloud(c) {
    cx.fillStyle = 'rgba(255,255,255,.85)';
    const x = Math.round(c.x), y = Math.round(c.y);
    cx.fillRect(x + 6, y, 24, 6); cx.fillRect(x, y + 6, 44, 6); cx.fillRect(x + 12, y - 5, 14, 6);
    cx.fillStyle = 'rgba(200,220,240,.9)'; cx.fillRect(x, y + 10, 44, 3);
  }

  function drawEnemy(e) {
    const s = Art.SPR[e.sprite]; if (!s) return;
    const sc = e.scale || 1, dw = s.w * sc, dh = s.h * sc;
    const walking = e.x > e.stopX && e.freezeT <= 0;
    let bob = 0, sx = 1, sy = 1;
    if (e.sprite === 'slime') { const ph = Math.abs(Math.sin(e.anim * (walking ? 5 : 2))); bob = -ph * 3 * sc; sy = 1 - ph * .06; sx = 1 + ph * .06; }
    else if (walking && !e.fly) bob = -Math.abs(Math.sin(e.anim * 9)) * 1.5 * (sc > 1 ? 1.4 : 1);
    const lunge = e.hit > 0 ? -Math.sin((.15 - e.hit) / .15 * Math.PI) * 4 * sc : 0;
    // sombra
    if (!e.fly) { cx.fillStyle = 'rgba(0,0,0,.28)'; cx.beginPath(); cx.ellipse(e.x, e.y + 1, dw * .38, 2.5 * sc, 0, 0, TAU); cx.fill(); }
    else { cx.fillStyle = 'rgba(0,0,0,.2)'; cx.beginPath(); cx.ellipse(e.x, GY + 6, 6, 2, 0, 0, TAU); cx.fill(); }
    if (e.boss) { const pul = .25 + .12 * Math.sin(T * 4); cx.fillStyle = `rgba(255,60,90,${pul})`; cx.beginPath(); cx.ellipse(e.x, e.y + 1, dw * .6, 5 * sc, 0, 0, TAU); cx.fill(); }
    const img = e.flash > 0 ? s.f : (e.freezeT > 0 ? s.i : (e.slowT > 0 && e.slowF > .25 ? s.i : (e.poisT > 0 ? s.p : s.n)));
    let dx = e.x - dw / 2 + lunge, dy = e.fly ? e.y - dh / 2 : e.y - s.foot * sc + sc;
    dy += bob;
    cx.save();
    if (sx !== 1 || sy !== 1) { cx.translate(e.x, e.fly ? e.y : e.y + 1); cx.scale(sx, sy); cx.drawImage(img, Math.round(-dw / 2 + lunge), Math.round(dy - (e.fly ? e.y : e.y + 1)), dw, dh); }
    else cx.drawImage(img, Math.round(dx), Math.round(dy), dw, dh);
    cx.restore();
    if (e.fly && !e.freezeT) { // batida de asas
      cx.fillStyle = 'rgba(77,47,125,.35)'; const f = Math.sin(e.anim * 24) > 0 ? 1 : 0; cx.fillRect(Math.round(dx), Math.round(dy + 2 + f * 3), dw, 2);
    }
    if (e.boss && e.tpl.crown) { cx.save(); cx.translate(Math.round(e.x), Math.round(dy + 3 * sc)); cx.scale(Math.max(1, sc * .6), Math.max(1, sc * .6)); Art.crown(cx, 0, 0); cx.restore(); }
    if (e.freezeT > 0) { cx.fillStyle = 'rgba(200,240,255,.55)'; cx.fillRect(Math.round(e.x - dw / 2 + 2), Math.round(dy + 2), 2, 2); }
    if (!e.boss && e.hp < e.max) {
      const bw = Math.max(10, Math.round(dw * .7)), bx = Math.round(e.x - bw / 2), by = Math.round(dy - 5);
      cx.fillStyle = '#150f22'; cx.fillRect(bx - 1, by - 1, bw + 2, 4);
      cx.fillStyle = '#4a1a24'; cx.fillRect(bx, by, bw, 2);
      cx.fillStyle = e.hp / e.max > .5 ? '#6bdc7a' : e.hp / e.max > .25 ? '#ffc857' : '#ff5a5a'; cx.fillRect(bx, by, Math.max(1, Math.round(bw * e.hp / e.max)), 2);
    }
  }

  function drawCastle() {
    const k = Save.d.equip.castle, cs = Art.castle(k), oy = GY - Art.CH;
    cx.drawImage(cs.c, 0, oy);
    const hpR = R.castle.hp / R.castle.max;
    if (!demo) Art.drawCracks(cx, 0, oy, hpR < .2 ? 3 : hpR < .45 ? 2 : hpR < .75 ? 1 : 0);
    // bandeira
    const px = 45, top = oy + 18;
    Art.rect(cx, '#4a3020', px, top - 22, 1, 22); Art.rect(cx, OUT_C, px - 1, top - 23, 3, 1);
    for (let i = 0; i < 13; i++) { const wob = Math.round(Math.sin(T * 5 - i * .5) * (1 + i * .12)); Art.rect(cx, cs.p.flag, px + 1 + i, top - 21 + wob, 1, 8 - (i > 9 ? i - 9 : 0)); }
    // cristal flutuante
    const cyy = oy + 30 + Math.sin(T * 2) * 3, cxx = 72;
    circle(cxx, cyy, 11, 'rgba(160,230,255,.12)'); circle(cxx, cyy, 7, 'rgba(160,230,255,.18)');
    cx.fillStyle = '#9ff0ff'; cx.fillRect(cxx - 1, cyy - 5, 3, 10); cx.fillRect(cxx - 3, cyy - 3, 7, 6); cx.fillRect(cxx - 2, cyy - 4, 5, 8);
    cx.fillStyle = '#e8ffff'; cx.fillRect(cxx - 1, cyy - 3, 1, 4);
    cx.fillStyle = '#3aa7d8'; cx.fillRect(cxx + 1, cyy, 2, 3);
    // runas no chão
    const g = 'rgba(160,230,255,' + (.18 + .08 * Math.sin(T * 3)) + ')';
    cx.fillStyle = g; cx.fillRect(10, GY + 2, 70, 1);
    // barreira
    if (R.castle.bmax > 0 && R.castle.barrier > 0) {
      const a = .12 + .25 * (R.castle.barrier / R.castle.bmax);
      for (let y = oy + 90; y < GY; y += 2) { cx.fillStyle = `rgba(127,224,255,${a * (.7 + .3 * Math.sin(T * 4 + y * .3))})`; cx.fillRect(CASTLE_X + 4 + Math.round(Math.sin(y * .15 + T * 3) * 1), y, 2, 2); }
    }
    // fumaça com pouca vida
    if (!demo && hpR < .35 && Math.random() < .12) PT.push({ x: rand(10, 80), y: GY - rand(60, 120), vx: rand(-4, 4), vy: -22, life: 1, t: 0, col: 'rgba(80,80,100,.6)', size: 3, g: 0 });
  }
  const OUT_C = '#150f22';

  function drawMage() {
    const s = Art.mage(mageId()), bob = Math.sin(mage.anim * 2.2) * .8 - (mage.cast > 0 ? 1 : 0);
    const dx = Math.round(mage.x - s.w / 2), dy = Math.round(mage.foot - s.foot + 1 + bob);
    cx.fillStyle = 'rgba(0,0,0,.25)'; cx.fillRect(dx + 3, mage.foot, 12, 2);
    cx.drawImage(s.n, dx, dy);
    const g = Art.magePalette(mageId()).g, tipX = dx + 14, tipY = dy + 1.5, pul = .35 + .2 * Math.sin(T * 5) + (mage.cast > 0 ? .5 : 0);
    cx.globalAlpha = Math.min(1, pul); circle(tipX, tipY, 4 + (mage.cast > 0 ? 3 : 0), g); cx.globalAlpha = 1;
    circle(tipX, tipY, 1.5, '#fff');
    if (Math.random() < .12 && PT.length < 480) PT.push({ x: tipX, y: tipY, vx: rand(-8, 8), vy: rand(-22, -8), life: .5, t: 0, col: g, size: 1, g: 0 });
  }
  function drawPet() {
    const id = Save.d.equip.pet; if (!id || id === 'none') return;
    const s = Art.pet(id); if (!s) return;
    cx.drawImage(s.n, Math.round(pet.x - s.w / 2), Math.round(pet.y - s.h / 2 + Math.sin(pet.a * 5) * 1.2));
  }

  function drawTraps() {
    R.slots.forEach((s, i) => {
      const x = TRAP_X[i], y = GY + 7;
      if (!s.type) {
        if (state === 'prep') { cx.strokeStyle = 'rgba(255,255,255,.35)'; cx.setLineDash([3, 3]); cx.beginPath(); cx.ellipse(x, y, 14, 5, 0, 0, TAU); cx.stroke(); cx.setLineDash([]); text(String(i + 1), x, y + 3, 'rgba(255,255,255,.55)', 8, 'center'); }
        return;
      }
      const col = TRAPS[s.type].color, pul = .5 + .5 * Math.sin(s.t * 4);
      cx.fillStyle = 'rgba(0,0,0,.3)'; cx.beginPath(); cx.ellipse(x, y + 1, 14, 5, 0, 0, TAU); cx.fill();
      if (s.type === 'spikes') {
        const up = s.pulse > 0 ? 3 : 0; if (s.pulse > 0) s.pulse -= .016;
        for (let k = -2; k <= 2; k++) { cx.fillStyle = '#9aa2b8'; cx.beginPath(); cx.moveTo(x + k * 5 - 3, y + 2); cx.lineTo(x + k * 5, y - 7 - up); cx.lineTo(x + k * 5 + 3, y + 2); cx.fill(); cx.fillStyle = '#e8ecf6'; cx.fillRect(x + k * 5 - 1, y - 4 - up, 1, 5); }
      } else if (s.type === 'frost') {
        cx.fillStyle = `rgba(127,224,255,${.2 + .15 * pul})`; cx.beginPath(); cx.ellipse(x, y, 16, 6, 0, 0, TAU); cx.fill();
        cx.strokeStyle = '#bff3ff'; cx.beginPath(); cx.ellipse(x, y, 11, 4, 0, 0, TAU); cx.stroke();
        cx.fillStyle = '#e8ffff'; cx.fillRect(x - 1, y - 2, 3, 5); cx.fillRect(x - 3, y, 7, 1);
        if (Math.random() < .05) PT.push({ x: x + rand(-10, 10), y, vx: 0, vy: -18, life: .6, t: 0, col: '#cfeeff', size: 1, g: 0 });
      } else if (s.type === 'fire') {
        cx.fillStyle = `rgba(255,122,26,${.25 + .2 * pul})`; cx.beginPath(); cx.ellipse(x, y, 16, 6, 0, 0, TAU); cx.fill();
        cx.strokeStyle = '#ffb347'; cx.beginPath(); cx.ellipse(x, y, 11, 4, 0, 0, TAU); cx.stroke();
        if (Math.random() < .35) PT.push({ x: x + rand(-8, 8), y: y - 1, vx: rand(-4, 4), vy: -rand(20, 40), life: .45, t: 0, col: pick(['#ff7a1a', '#ffd166', '#ff4d2a']), size: 2, g: 0 });
      } else if (s.type === 'bomb') {
        const ready = s.cd <= 0;
        cx.fillStyle = ready ? '#2a2438' : '#4a4658'; cx.beginPath(); cx.arc(x, y - 3, 6, 0, TAU); cx.fill();
        cx.fillStyle = ready ? '#ff4d6d' : '#7a6a78'; cx.fillRect(x - 3, y - 6, 2, 2);
        cx.fillStyle = '#8a5a2b'; cx.fillRect(x + 2, y - 10, 1, 3);
        if (ready) { cx.fillStyle = pul > .5 ? '#ffd166' : '#ff7a1a'; cx.fillRect(x + 2, y - 11, 2, 2); }
        else { const f = 1 - s.cd / Math.max(3, 8 - .8 * s.lvl); cx.fillStyle = '#150f22'; cx.fillRect(x - 8, y + 6, 16, 2); cx.fillStyle = '#ffd166'; cx.fillRect(x - 8, y + 6, Math.round(16 * f), 2); }
      }
      for (let k = 0; k < s.lvl; k++) { cx.fillStyle = '#150f22'; cx.fillRect(x - 12 + k * 5, y + 8, 4, 3); cx.fillStyle = '#ffd166'; cx.fillRect(x - 11 + k * 5, y + 9, 2, 1); }
      void col;
    });
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
    // fumaça do vulcão / ambiente
    for (const a of AMB) {
      if (amb === 'fireflies') { const al = .5 + .5 * Math.sin(a.ph * 3); cx.fillStyle = `rgba(230,255,120,${al * .9})`; cx.fillRect(Math.round(a.x), Math.round(a.y), 2, 2); cx.fillStyle = `rgba(230,255,120,${al * .2})`; cx.fillRect(Math.round(a.x) - 1, Math.round(a.y) - 1, 4, 4); }
      else if (amb === 'wisps') { const al = .35 + .35 * Math.sin(a.ph * 2); cx.fillStyle = `rgba(160,190,255,${al})`; cx.fillRect(Math.round(a.x), Math.round(a.y), 2, 2); cx.fillStyle = `rgba(160,190,255,${al * .25})`; cx.fillRect(Math.round(a.x) - 1, Math.round(a.y) - 1, 4, 4); }
      else if (amb === 'embers') { cx.fillStyle = a.s > .7 ? '#ffd166' : '#ff7a1a'; cx.globalAlpha = .5 + .4 * Math.sin(a.ph * 4); cx.fillRect(Math.round(a.x), Math.round(a.y), 1 + (a.s > .8 ? 1 : 0), 1 + (a.s > .8 ? 1 : 0)); cx.globalAlpha = 1; }
    }
    drawTraps();
    drawCastle();
    // inimigos por profundidade
    const order = E.slice().sort((a, b) => (a.fly ? 999 : a.y) - (b.fly ? 999 : b.y));
    for (const e of order) if (!e.fly) drawEnemy(e);
    drawMage(); drawPet();
    for (const e of order) if (e.fly) drawEnemy(e);
    // projéteis
    for (const p of P) {
      if (p.k === 'basic') { circle(p.x, p.y, 3, 'rgba(160,230,255,.25)'); cx.fillStyle = p.col; cx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3); cx.fillStyle = '#fff'; cx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
      else if (p.k === 'pet') { cx.fillStyle = p.col; cx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3); }
      else if (p.k === 'fire') { circle(p.x, p.y, 8, 'rgba(255,120,30,.25)'); circle(p.x, p.y, 5, '#ff7a1a'); circle(p.x, p.y, 3, '#ffd166'); circle(p.x, p.y, 1.5, '#fff'); }
    }
    for (const p of EP) { circle(p.x, p.y, 5, p.col + '44'); cx.fillStyle = p.col; cx.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 2, 4, 4); cx.fillStyle = '#fff'; cx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 1, 1); }
    // moedas
    for (const o of CO) {
      const w = Math.max(1, Math.round(Math.abs(Math.cos(o.age * 10)) * 5));
      cx.fillStyle = '#150f22'; cx.fillRect(Math.round(o.x - w / 2) - 1, Math.round(o.y) - 4, w + 2, 7);
      cx.fillStyle = '#ffd23f'; cx.fillRect(Math.round(o.x - w / 2), Math.round(o.y) - 3, w, 5);
      cx.fillStyle = '#fff3a0'; cx.fillRect(Math.round(o.x - w / 2), Math.round(o.y) - 3, Math.max(1, w >> 1), 1);
    }
    // efeitos
    for (const f of FX) {
      const p = clamp(f.t / f.life, 0, 1);
      if (f.k === 'ring') { cx.strokeStyle = f.col; cx.globalAlpha = 1 - p; cx.lineWidth = f.w || 2; cx.beginPath(); cx.arc(f.x, f.y, lerp(f.r, f.max, 1 - Math.pow(1 - p, 2)), 0, TAU); cx.stroke(); if (f.w === 3) { cx.globalAlpha = (1 - p) * .12; cx.fillStyle = f.col; cx.fill(); } cx.globalAlpha = 1; cx.lineWidth = 1; }
      else if (f.k === 'glow') { cx.globalAlpha = (1 - p) * .6; circle(f.x, f.y, f.r * (.5 + p * .5), f.col); cx.globalAlpha = 1; }
      else if (f.k === 'bolt') { cx.globalAlpha = 1 - p; for (const [w, c] of [[5, 'rgba(255,230,100,.35)'], [2, '#fff3a0'], [1, '#fff']]) { cx.strokeStyle = c; cx.lineWidth = w; cx.beginPath(); f.pts.forEach((q, i) => i ? cx.lineTo(Math.round(q.x), Math.round(q.y)) : cx.moveTo(Math.round(q.x), Math.round(q.y))); cx.stroke(); } cx.globalAlpha = 1; cx.lineWidth = 1; }
      else if (f.k === 'meteor' && f.t >= 0 && !f.done) { circle(f.x, f.y, 10, 'rgba(255,100,30,.25)'); circle(f.x, f.y, 6, '#ff5a1a'); circle(f.x, f.y, 4, '#ffb347'); circle(f.x, f.y, 2, '#fff'); cx.strokeStyle = '#ff7a1a'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(f.x, f.y); cx.lineTo(f.x + 22, f.y - 14); cx.stroke(); cx.lineWidth = 1; }
      else if (f.k === 'meteor' && f.t < 0) { cx.strokeStyle = 'rgba(255,80,60,.5)'; cx.beginPath(); cx.ellipse(f.tx, f.ty, 10, 3, 0, 0, TAU); cx.stroke(); }
    }
    for (const p of PT) { cx.globalAlpha = clamp(1 - p.t / p.life, 0, 1); cx.fillStyle = p.col; cx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size); }
    cx.globalAlpha = 1;
    for (const t of TX) { cx.globalAlpha = clamp(1 - t.t / t.life + .2, 0, 1); text(t.s, Math.round(t.x), Math.round(t.y), t.col, t.big ? 10 : 8, 'center'); }
    cx.globalAlpha = 1;
    cx.restore();
    if (flashRed > 0) { cx.fillStyle = `rgba(255,40,60,${flashRed * .45})`; cx.fillRect(0, 0, W, H); }
    // pausa/banner
    if (banner) {
      const p = banner.t / banner.life, a = p < .15 ? p / .15 : p > .75 ? (1 - p) / .25 : 1;
      cx.globalAlpha = clamp(a, 0, 1);
      const y = 105 - (1 - Math.min(1, p * 6)) * 10;
      cx.fillStyle = banner.boss ? 'rgba(80,0,20,.55)' : 'rgba(10,10,30,.45)'; cx.fillRect(0, y - 24, W, 44);
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
    init, hooks, startDemo, startRun, beginWave, buy, cast, drawCards, pickCard, finish, setMap, repairCost,
    get R() { return R; }, get state() { return state; }, get demo() { return demo; },
    get paused() { return paused; }, set paused(v) { paused = v; },
    get speed() { return speed; }, set speed(v) { speed = v; },
    waveLabel, nextWaveInfo, goldMul, dmgMul, castleMax,
    bossBar() { const b = wv.boss; return b && b.alive ? { name: b.tpl.name, hp: b.hp, max: b.max } : null; },
    enemiesLeft() { return E.length + wv.q.length + (wv.bossSpawn ? 1 : 0); },
    get mapIdx() { return mapIdx; },
    quit() { Snd.stop(); startDemo(); },
    cheat(g) { Save.d.gems += g; Save.store(); },
    _dbg: { E: () => E, P: () => P, update },
  };
})();

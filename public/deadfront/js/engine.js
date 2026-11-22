/* Deadfront - engine: simulação + render (top-down, canvas 2D) */
(function () {
  const DF = window.DF;
  const TILE = DF.TILE;
  const T = { FLOOR: 0, OUT: 1, WALL: 2, DOOR: 3, OBST: 4 };
  DF.T = T;

  const rand = (a, b) => a + Math.random() * (b - a);
  const rint = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const sfx = (n) => { if (DF.sfx) DF.sfx(n); };
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  // ---------------------------------------------------------------- mapa
  function buildMap(lv) {
    const w = lv.w, h = lv.h;
    const tiles = new Uint8Array(w * h).fill(T.OUT);
    const obst = new Array(w * h).fill(null);
    const inb = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
    for (const r of lv.rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) tiles[y * w + x] = T.FLOOR;
    // anel de paredes em volta do interior
    const ring = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (tiles[y * w + x] !== T.FLOOR) continue;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (inb(nx, ny) && tiles[ny * w + nx] === T.OUT) ring.push(ny * w + nx);
      }
    }
    for (const i of ring) tiles[i] = T.WALL;
    for (const [x, y, ww, hh] of lv.walls) for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) tiles[j * w + i] = T.WALL;
    if (lv.open) {
      for (let x = 0; x < w; x++) { tiles[x] = T.WALL; tiles[(h - 1) * w + x] = T.WALL; }
      for (let y = 0; y < h; y++) { tiles[y * w] = T.WALL; tiles[y * w + w - 1] = T.WALL; }
    }
    const doors = [];
    for (const r of lv.rooms) {
      for (const [side, off, wd] of r.doors) {
        for (let i = 0; i < wd; i++) {
          let x, y, dx = 0, dy = 0;
          if (side === 'N') { x = r.x + off + i; y = r.y - 1; dy = -1; }
          else if (side === 'S') { x = r.x + off + i; y = r.y + r.h; dy = 1; }
          else if (side === 'W') { x = r.x - 1; y = r.y + off + i; dx = -1; }
          else { x = r.x + r.w; y = r.y + off + i; dx = 1; }
          tiles[y * w + x] = T.DOOR;
          doors.push({ x, y, dx, dy, idx: y * w + x });
        }
      }
    }
    for (const [x, y, ww, hh, type] of lv.obst) for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) { tiles[j * w + i] = T.OBST; obst[j * w + i] = type; }
    // pontos de spawn: fora de cada porta
    for (const d of doors) {
      const cands = [];
      const px = d.dy !== 0 ? 1 : 0, py = d.dx !== 0 ? 1 : 0;
      for (let k = 2; k <= 8; k++) for (let l = -2; l <= 2; l++) {
        const x = d.x + d.dx * k + px * l, y = d.y + d.dy * k + py * l;
        if (inb(x, y) && tiles[y * w + x] === T.OUT) cands.push({ x, y, k });
      }
      cands.sort((a, b) => b.k - a.k);
      d.spawns = cands.slice(0, Math.max(3, Math.ceil(cands.length / 2)));
    }
    const floorTiles = [];
    for (let i = 0; i < tiles.length; i++) if (tiles[i] === T.FLOOR) floorTiles.push(i);
    return { w, h, tiles, obst, doors, floorTiles, open: !!lv.open };
  }
  DF.buildMap = buildMap;

  // ---------------------------------------------------------------- render estático
  const OBST_STYLE = {
    table: ['#7a5533', '#5a3b20'], sofa: ['#8a3a3a', '#5e2424'], piano: ['#181818', '#2e2e2e'], shelf: ['#5b4026', '#3c2a18'],
    crate: ['#9a7240', '#6d4d27'], counter: ['#6b7a8a', '#4a5663'], seats: ['#3b5b86', '#27405f'], belt: ['#2c2f33', '#46494f'],
    truck: ['#4d5a3a', '#343d26'], sandbag: ['#a88f5a', '#7f6b41'], bed: ['#e8ecef', '#6fa0c8'], cart: ['#aab4b8', '#78848a'], plane: ['#cfd6dc', '#8a949c'], barrier: ['#9a9a94', '#6e6e69'], tank: ['#b0352c', '#7a2019']
  };
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function renderStatic(lv, map) {
    const c = document.createElement('canvas');
    c.width = map.w * TILE; c.height = map.h * TILE;
    const ctx = c.getContext('2d');
    const th = lv.theme;
    let seed = 1234;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const t = map.tiles[y * map.w + x];
      const px = x * TILE, py = y * TILE;
      if (t === T.OUT) {
        ctx.fillStyle = (x + y) % 2 ? th.out : th.out2; ctx.fillRect(px, py, TILE, TILE);
        for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(px + rnd() * TILE, py + rnd() * TILE, 2, 4); }
        for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(px + rnd() * TILE, py + rnd() * TILE, 2, 3); }
      } else if (t === T.WALL) {
        ctx.fillStyle = th.wall; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = th.wallTop; ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(px + 3, py + TILE - 9, TILE - 6, 6);
      } else {
        ctx.fillStyle = (x + y) % 2 ? th.floor : th.floor2; ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = 'rgba(0,0,0,0.10)'; ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        if (t === T.DOOR) {
          ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = 'rgba(230,190,60,0.35)';
          for (let i = 0; i < 4; i++) ctx.fillRect(px + 4 + i * 11, py + 4, 6, TILE - 8);
        }
      }
    }
    // ---- realismo: sombras, bordas, textura, rachaduras, manchas e luz
    const tt = (x, y) => (x < 0 || y < 0 || x >= map.w || y >= map.h) ? T.WALL : map.tiles[y * map.w + x];
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const t = tt(x, y), px = x * TILE, py = y * TILE;
      if (t === T.WALL) {
        const g = ctx.createLinearGradient(px, py, px + TILE, py + TILE);
        g.addColorStop(0, 'rgba(255,255,255,0.16)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.38)');
        ctx.fillStyle = g; ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.moveTo(px + 3, py + 3); ctx.lineTo(px + TILE - 3, py + 3); ctx.moveTo(px + 3, py + 3); ctx.lineTo(px + 3, py + TILE - 3); ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; for (const [rx, ry] of [[8, 8], [TILE - 8, 8], [8, TILE - 8], [TILE - 8, TILE - 8]]) { ctx.beginPath(); ctx.arc(px + rx, py + ry, 1.6, 0, 6.283); ctx.fill(); }
        if (rnd() < 0.12) { ctx.fillStyle = 'rgba(90,12,14,0.35)'; ctx.fillRect(px + 6 + rnd() * 20, py + 4, 3 + rnd() * 4, 10 + rnd() * 24); }
        continue;
      }
      // sombra projetada por paredes vizinhas
      if (t !== T.OUT) {
        if (tt(x, y - 1) === T.WALL) { const g = ctx.createLinearGradient(0, py, 0, py + 16); g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(px, py, TILE, 16); }
        if (tt(x - 1, y) === T.WALL) { const g = ctx.createLinearGradient(px, 0, px + 12, 0); g.addColorStop(0, 'rgba(0,0,0,0.38)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(px, py, 12, TILE); }
      }
      // grão
      const n = t === T.OUT ? 14 : 10;
      for (let i = 0; i < n; i++) { ctx.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,' + (0.03 + rnd() * 0.07) + ')' : 'rgba(255,255,255,' + (0.02 + rnd() * 0.04) + ')'; const sz = 1 + rnd() * 3; ctx.fillRect(px + rnd() * TILE, py + rnd() * TILE, sz, sz); }
      // rachaduras
      if (rnd() < (t === T.OUT ? 0.06 : 0.07)) {
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.3; ctx.beginPath();
        let cx = px + rnd() * TILE, cy = py + rnd() * TILE; ctx.moveTo(cx, cy);
        for (let i = 0; i < 5; i++) { cx += (rnd() - 0.5) * 22; cy += (rnd() - 0.3) * 16; ctx.lineTo(cx, cy); if (i === 2 && rnd() < 0.6) { ctx.moveTo(cx, cy); ctx.lineTo(cx + (rnd() - 0.5) * 26, cy + rnd() * 14); ctx.moveTo(cx, cy); } }
        ctx.stroke();
      }
      // manchas (sangue, óleo, sujeira)
      if (rnd() < 0.05) {
        const k = rnd(), col = k < 0.45 ? '90,10,12' : k < 0.75 ? '0,0,0' : '60,50,20', rr = 10 + rnd() * 22, bx = px + rnd() * TILE, by = py + rnd() * TILE;
        const g = ctx.createRadialGradient(bx, by, 1, bx, by, rr); g.addColorStop(0, 'rgba(' + col + ',' + (0.3 + rnd() * 0.25) + ')'); g.addColorStop(1, 'rgba(' + col + ',0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, rr, 0, 6.283); ctx.fill();
      }
      if (t === T.DOOR) { // faixas de perigo
        ctx.save(); ctx.beginPath(); ctx.rect(px + 2, py + 2, TILE - 4, TILE - 4); ctx.clip();
        ctx.fillStyle = 'rgba(15,15,10,0.55)'; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = 'rgba(235,190,40,0.55)'; for (let i = -TILE; i < TILE * 2; i += 14) { ctx.beginPath(); ctx.moveTo(px + i, py + TILE); ctx.lineTo(px + i + 7, py + TILE); ctx.lineTo(px + i + 7 + TILE, py); ctx.lineTo(px + i + TILE, py); ctx.fill(); }
        ctx.restore();
      }
    }
    { // poças de luz e sombras amplas
      const ft = map.floorTiles;
      for (let i = 0; i < ft.length; i += 14) { const ti = ft[i], lx = (ti % map.w + 0.5) * TILE, ly = (((ti / map.w) | 0) + 0.5) * TILE, lr = 90 + rnd() * 70; const g = ctx.createRadialGradient(lx, ly, 4, lx, ly, lr); g.addColorStop(0, 'rgba(255,238,190,0.07)'); g.addColorStop(1, 'rgba(255,238,190,0)'); ctx.fillStyle = g; ctx.fillRect(lx - lr, ly - lr, lr * 2, lr * 2); }
      for (let i = 7; i < ft.length; i += 19) { const ti = ft[i], lx = (ti % map.w + 0.5) * TILE, ly = (((ti / map.w) | 0) + 0.5) * TILE, lr = 80 + rnd() * 90; const g = ctx.createRadialGradient(lx, ly, 4, lx, ly, lr); g.addColorStop(0, 'rgba(0,0,0,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(lx - lr, ly - lr, lr * 2, lr * 2); }
    }
    // obstáculos (por retângulo contíguo do mesmo tipo)
    for (const [x, y, ww, hh, type] of lv.obst) {
      const [c1, c2] = OBST_STYLE[type] || ['#777', '#444'];
      const px = x * TILE + 3, py = y * TILE + 3, pw = ww * TILE - 6, ph = hh * TILE - 6;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; rrect(ctx, px + 3, py + 4, pw, ph, 6); ctx.fill();
      ctx.fillStyle = c1; rrect(ctx, px, py, pw, ph, 6); ctx.fill();
      ctx.strokeStyle = c2; ctx.lineWidth = 3; rrect(ctx, px + 1.5, py + 1.5, pw - 3, ph - 3, 5); ctx.stroke();
      { const og = ctx.createLinearGradient(px, py, px + pw * 0.4, py + ph); og.addColorStop(0, 'rgba(255,255,255,0.22)'); og.addColorStop(0.5, 'rgba(255,255,255,0)'); og.addColorStop(1, 'rgba(0,0,0,0.32)'); ctx.fillStyle = og; rrect(ctx, px, py, pw, ph, 6); ctx.fill(); }
      ctx.lineWidth = 1;
      if (type === 'crate') { ctx.strokeStyle = c2; ctx.beginPath(); ctx.moveTo(px + 4, py + 4); ctx.lineTo(px + pw - 4, py + ph - 4); ctx.moveTo(px + pw - 4, py + 4); ctx.lineTo(px + 4, py + ph - 4); ctx.stroke(); }
      if (type === 'bed') { ctx.fillStyle = c2; ctx.fillRect(px + 4, py + ph * 0.35, pw - 8, ph * 0.6); ctx.fillStyle = '#fff'; ctx.fillRect(px + 6, py + 5, pw - 12, ph * 0.22); }
      if (type === 'truck') { ctx.fillStyle = c2; ctx.fillRect(px + pw - 40, py + 4, 36, ph - 8); ctx.fillStyle = 'rgba(150,200,230,0.6)'; ctx.fillRect(px + pw - 14, py + 8, 8, ph - 16); }
      if (type === 'seats') { ctx.fillStyle = c2; for (let i = 0; i < ww; i++) ctx.fillRect(px + 6 + i * TILE, py + 5, TILE - 14, ph - 10); }
      if (type === 'belt') { ctx.strokeStyle = '#777'; for (let i = 0; i < ww * 4; i++) { ctx.beginPath(); ctx.moveTo(px + 6 + i * 12, py + 4); ctx.lineTo(px + 6 + i * 12, py + ph - 4); ctx.stroke(); } }
      if (type === 'counter') { ctx.fillStyle = c2; ctx.fillRect(px + 4, py + ph - 10, pw - 8, 6); }
      if (type === 'piano') { ctx.fillStyle = '#eee'; ctx.fillRect(px + 6, py + ph - 14, pw - 12, 8); }
      if (type === 'table') { ctx.fillStyle = c2; ctx.fillRect(px + pw / 2 - 12, py + ph / 2 - 6, 24, 12); }
      if (type === 'plane') {
        c.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillStyle = '#e9eef2'; rrect(ctx, px + 6, py + ph / 2 - 10, pw - 12, 20, 10); ctx.fill(); ctx.strokeStyle = '#8a949c'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#b8c2ca'; rrect(ctx, px + pw * 0.36, py + 2, pw * 0.15, ph - 4, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#b8c2ca'; rrect(ctx, px + 8, py + ph / 2 - ph * 0.36, pw * 0.1, ph * 0.72, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#4a7aa8'; ctx.fillRect(px + pw - 22, py + ph / 2 - 5, 9, 10);
        ctx.fillStyle = '#5a89b5'; for (let i = 0; i < 6; i++) ctx.fillRect(px + pw * 0.55 + i * 8, py + ph / 2 - 8, 4, 3);
        ctx.fillStyle = '#d4141c'; ctx.fillRect(px + 14, py + ph / 2 - 2, pw * 0.2, 4);
      }
      if (type === 'tank') { ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(px + pw / 2, py + ph / 2, Math.min(pw, ph) / 2 - 4, 0, 6.283); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.arc(px + pw / 2 - 6, py + ph / 2 - 6, Math.min(pw, ph) / 5, 0, 6.283); ctx.fill(); }
      if (type === 'barrier') { ctx.fillStyle = '#d4a017'; for (let i = 0; i < Math.max(ww, hh) * 2; i++) { if (ww >= hh) ctx.fillRect(px + 4 + i * 22, py + 4, 10, ph - 8); else ctx.fillRect(px + 4, py + 4 + i * 22, pw - 8, 10); } }
      if (type === 'sandbag') { ctx.strokeStyle = c2; for (let i = 1; i < ww * 2; i++) { ctx.beginPath(); ctx.moveTo(px + i * (pw / (ww * 2)), py + 3); ctx.lineTo(px + i * (pw / (ww * 2)), py + ph - 3); ctx.stroke(); } }
    }
    for (const d of lv.decor || []) {
      if (d[0] === 'pad') {
        const x = d[1] * TILE, y = d[2] * TILE;
        ctx.fillStyle = 'rgba(40,44,48,0.7)'; ctx.beginPath(); ctx.arc(x, y, TILE * 2.6, 0, 6.283); ctx.fill();
        ctx.strokeStyle = '#e6c13a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, TILE * 2.3, 0, 6.283); ctx.stroke();
        ctx.fillStyle = '#e6c13a'; ctx.font = 'bold 72px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', x, y + 4);
      } else if (d[0] === 'dash') {
        ctx.fillStyle = d[5] || '#ddd';
        for (let i = 0; i < d[3]; i++) ctx.fillRect((d[1] + i) * TILE + 6, d[2] * TILE - d[4] * TILE / 2, TILE - 12, d[4] * TILE);
      }
    }
    return c;
  }

  // ---------------------------------------------------------------- engine
  function create(opts) {
    const lv = DF.LEVELS[opts.level];
    const save = opts.save;
    const endless = !!opts.endless;
    const canvas = opts.canvas;
    const ctx = canvas.getContext('2d');
    const map = buildMap(lv);
    const staticLayer = renderStatic(lv, map);
    const { w: MW, h: MH, tiles } = map;
    const decalLayer = document.createElement('canvas'); decalLayer.width = Math.ceil(MW * TILE / 2); decalLayer.height = Math.ceil(MH * TILE / 2);
    const dctx = decalLayer.getContext('2d');
    function decal(x, y, r, col) {
      dctx.save(); dctx.translate(x / 2, y / 2); dctx.fillStyle = col;
      dctx.beginPath(); dctx.ellipse(0, 0, r / 2, r / 2 * 0.8, Math.random() * 3, 0, 6.283); dctx.fill();
      for (let k = 0; k < 4; k++) { const a = Math.random() * 6.283, d = r / 2 * (0.7 + Math.random() * 0.8); dctx.beginPath(); dctx.arc(Math.cos(a) * d, Math.sin(a) * d, 1 + Math.random() * r / 9, 0, 6.283); dctx.fill(); }
      dctx.restore();
    }
    const input = DF.input;
    const skin = DF.SKINS.find((s) => s.id === save.skin) || DF.SKINS[0];
    const U = (id) => (save.up && save.up[id]) || 0;
    const cls = DF.CLASSES[save.cls] ? save.cls : 'fighter';
    const CLS = DF.CLASSES[cls];
    const GM = cls === 'grenadier' ? 1.5 : 1;

    // ----- estado
    const bars = new Array(MW * MH).fill(null);
    const flow = new Float64Array(MW * MH);
    const open = !!lv.open, OUT_RANGE = 6;
    const outDist = new Int16Array(MW * MH).fill(999);
    { // distância (em tiles) de cada tile de fora até a porta mais próxima: limita até onde o jogador pode sair
      const q = [];
      for (const d of map.doors) { outDist[d.idx] = 0; q.push(d.idx); }
      for (let k = 0; k < q.length; k++) {
        const i = q[k], x = i % MW, y = (i / MW) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
          const ni = ny * MW + nx; if (tiles[ni] !== T.OUT || outDist[ni] <= outDist[i] + 1) continue;
          outDist[ni] = outDist[i] + 1; q.push(ni);
        }
      }
    }
    const G = {
      lv, map, bars, state: 'play', time: 0, kills: 0, scrapGained: 0, shake: 0, hurtFlash: 0,
      zombies: [], bullets: [], acid: [], loot: [], traps: [], parts: [], texts: [], fx: [], towers: [], rockets: [],
      wave: 0, waveState: 'break', breakT: 6, spawnQ: [], spawnT: 0, bossAlive: false, boss: null,
      lootT: rand(5, 8), endT: 0, msgText: '', msgT: 0, msgColor: '#fff', paused: false, medkitsUsed: 0,
      flowT: 0, flowDirty: true, idc: 1,
      fires: [], grenFly: [], zaps: [], boxes: [], decals: [], furyT: 0, skillCd: 0, regenT: 0, holy: null, whiteFlash: 0, bonusCoins: 0, bossLootT: 0, bossDead: false, outside: false
    };
    const startW = save.startWeapon && save.weapons && save.weapons[save.startWeapon] ? save.startWeapon : 'pistol';
    const wLvl = (id) => (save.wlvl && save.wlvl[id]) || 0;
    const mkWeapon = (id, mult) => {
      const d = DF.WEAPONS[id];
      const res = d.reserve === Infinity ? Infinity : Math.round(d.reserve * (mult || 1));
      const mag = Math.round(d.mag * (1 + 0.1 * wLvl(id)));
      return { id, mag, magSize: mag, reserve: res };
    };
    const P = G.player = {
      x: (lv.start[0] + 0.5) * TILE, y: (lv.start[1] + 0.5) * TILE, r: 13,
      maxHp: 100 + 15 * U('hp'), hp: 100 + 15 * U('hp'), speed: 150 * (1 + 0.06 * U('speed')),
      angle: 0, weapons: [], wi: 0, reloadT: 0, fireCd: 0, hurtT: 0, flash: 0,
      inv: { medkit: 1 + Math.floor(U('medkit') / 2), spike: 2, mine: 1, bear: 1 },
      scrap: 40 + 30 * U('scrap'), mat: 0, trapI: 0, towerI: 0, buildCd: 0, walk: 0
    };
    P.weapons.push(mkWeapon('pistol'));
    if (startW !== 'pistol') { P.weapons.unshift(mkWeapon(startW, 1 + 0.25 * U('ammo'))); }
    P.weapons[0].reserve = P.weapons[0].reserve === Infinity ? Infinity : P.weapons[0].reserve;
    P.gren = { frag: 2 + U('gfrag') + (cls === 'grenadier' ? 2 : 0), fire: U('gfire') + (cls === 'grenadier' ? 1 : 0), holy: U('gholy') + (cls === 'grenadier' ? 1 : 0) };
    if (cls === 'medic') P.inv.medkit += 2; P.grenI = 0; P.grenCd = 0;
    const mission = lv.mission ? { idx: 0, groups: lv.groups.map((g) => Object.assign({ done: false }, g)), ambT: 4, bossSpawned: false } : null;
    G.mission = mission;
    if (mission) { G.waveState = 'mission'; G.wave = 1; }
    const camera = { x: 0, y: 0, s: 1, vw: 800, vh: 600, dpr: 1 };
    G.camera = camera;

    const msg = (t, c) => { G.msgText = t; G.msgT = 1.8; G.msgColor = c || '#fff'; };
    G.msg = msg;

    // ----- utilidades de tile
    const tileAt = (x, y) => { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return tx < 0 || ty < 0 || tx >= MW || ty >= MH ? -1 : ty * MW + tx; };
    const isBlockType = (i) => tiles[i] === T.WALL || tiles[i] === T.OBST;
    // sistema de altura: obstáculos baixos (mesas, sofás, caixotes...) deixam passar tiros e granadas; paredes e coisas altas não
    const HIGH = new Set(['plane', 'tank', 'truck', 'shelf']);
    const isHigh = (i) => tiles[i] === T.WALL || (tiles[i] === T.OBST && HIGH.has(map.obst[i]));
    function losShot(x0, y0, x1, y1) {
      const d = Math.hypot(x1 - x0, y1 - y0); const n = Math.ceil(d / 12);
      for (let i = 1; i < n; i++) { const ti = tileAt(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n); if (ti < 0 || isHigh(ti)) return false; }
      return true;
    }
    function solid(tx, ty, forPlayer) {
      if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
      const i = ty * MW + tx; const t = tiles[i];
      if (t === T.WALL || t === T.OBST) return true;
      if (bars[i]) return true;
      if (forPlayer && t === T.OUT) return !open && outDist[i] > OUT_RANGE;
      return false;
    }
    function resolve(e, forPlayer) {
      let hit = -1;
      const x0 = Math.floor((e.x - e.r) / TILE), x1 = Math.floor((e.x + e.r) / TILE);
      const y0 = Math.floor((e.y - e.r) / TILE), y1 = Math.floor((e.y + e.r) / TILE);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
        if (!solid(tx, ty, forPlayer)) continue;
        const cx = clamp(e.x, tx * TILE, tx * TILE + TILE), cy = clamp(e.y, ty * TILE, ty * TILE + TILE);
        let dx = e.x - cx, dy = e.y - cy; const d2 = dx * dx + dy * dy;
        if (d2 < e.r * e.r) {
          if (d2 > 0.0001) { const d = Math.sqrt(d2); const push = e.r - d; e.x += (dx / d) * push; e.y += (dy / d) * push; }
          else { e.y -= e.r; }
          if (bars[ty * MW + tx]) hit = ty * MW + tx;
        }
      }
      return hit;
    }
    function moveEnt(e, dx, dy, forPlayer) {
      let hit = -1;
      e.x += dx; let h1 = resolve(e, forPlayer); if (h1 >= 0) hit = h1;
      e.y += dy; let h2 = resolve(e, forPlayer); if (h2 >= 0) hit = h2;
      return hit;
    }
    function los(x0, y0, x1, y1, withBars) {
      const d = Math.hypot(x1 - x0, y1 - y0); const n = Math.ceil(d / 12);
      for (let i = 1; i < n; i++) {
        const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
        const ti = tileAt(x, y); if (ti < 0) return false;
        if (isBlockType(ti)) return false;
        if (withBars && bars[ti]) return false;
      }
      return true;
    }

    // ----- campo de fluxo (Dijkstra a partir do jogador)
    const hd = [], hi = [];
    function hpush(d, i) {
      let k = hd.length; hd.push(d); hi.push(i);
      while (k > 0) { const p = (k - 1) >> 1; if (hd[p] <= d) break; hd[k] = hd[p]; hi[k] = hi[p]; k = p; }
      hd[k] = d; hi[k] = i;
    }
    function hpop() {
      const rd = hd[0], ri = hi[0]; const ld = hd.pop(), li = hi.pop(); const n = hd.length;
      if (n > 0) {
        let k = 0;
        for (;;) {
          let c = 2 * k + 1; if (c >= n) break;
          if (c + 1 < n && hd[c + 1] < hd[c]) c++;
          if (hd[c] >= ld) break;
          hd[k] = hd[c]; hi[k] = hi[c]; k = c;
        }
        hd[k] = ld; hi[k] = li;
      }
      return [rd, ri];
    }
    const blockedForFlow = (x, y) => x < 0 || y < 0 || x >= MW || y >= MH || isBlockType(y * MW + x);
    function computeFlow() {
      flow.fill(1e9); hd.length = 0; hi.length = 0;
      const sx = clamp(Math.floor(P.x / TILE), 0, MW - 1), sy = clamp(Math.floor(P.y / TILE), 0, MH - 1);
      const s = sy * MW + sx; flow[s] = 0; hpush(0, s);
      while (hd.length) {
        const [d, i] = hpop(); if (d > flow[i]) continue;
        const x = i % MW, y = (i / MW) | 0;
        for (const [dx, dy] of DIRS) {
          const nx = x + dx, ny = y + dy;
          if (blockedForFlow(nx, ny)) continue;
          const diag = dx !== 0 && dy !== 0;
          if (diag && (blockedForFlow(x + dx, y) || blockedForFlow(x, y + dy) || bars[y * MW + x + dx] || bars[(y + dy) * MW + x])) continue;
          const ni = ny * MW + nx; const b = bars[ni];
          const nd = d + (diag ? 1.4142 : 1) + (b ? 6 + b.hp / 30 : 0);
          if (nd < flow[ni]) { flow[ni] = nd; hpush(nd, ni); }
        }
      }
      G.flowDirty = false; G.flowT = 0;
    }
    function nextStep(z) {
      const tx = Math.floor(z.x / TILE), ty = Math.floor(z.y / TILE);
      if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return -1;
      const ci = ty * MW + tx; let bd = flow[ci], best = -1;
      for (const [dx, dy] of DIRS) {
        const nx = tx + dx, ny = ty + dy;
        if (blockedForFlow(nx, ny)) continue;
        if (dx !== 0 && dy !== 0 && (blockedForFlow(tx + dx, ty) || blockedForFlow(tx, ty + dy) || bars[ty * MW + tx + dx] || bars[(ty + dy) * MW + tx])) continue;
        const ni = ny * MW + nx; if (flow[ni] < bd) { bd = flow[ni]; best = ni; }
      }
      return best;
    }

    // ----- efeitos
    function blood(x, y, n, color, spd) {
      for (let i = 0; i < n; i++) {
        const a = rand(0, 6.283), s = rand(30, spd || 140);
        G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.25, 0.6), max: 0.6, size: rand(1.5, 3.5), color: color || '#7a0f12' });
      }
      if (n >= 2 && Math.random() < 0.5) decal(x + rand(-8, 8), y + rand(-8, 8), 5 + n, color && color.length === 7 ? color + '99' : 'rgba(110,14,18,0.5)');
      if (G.parts.length > 500) G.parts.splice(0, G.parts.length - 500);
    }
    function text(x, y, t, color) { G.texts.push({ x, y, t, color: color || '#fff', life: 0.9 }); if (G.texts.length > 60) G.texts.shift(); }

    // ----- barricadas
    function barMax(mat) { return Math.round(DF.MATERIALS[mat].hp * (1 + 0.2 * U('barrier'))); }
    function damageBar(i, dmg, src) {
      const b = bars[i]; if (!b) return;
      b.hp -= dmg; b.hit = 0.2; b.atk = 1.2; b.show = 2.5;
      if (src) blood(src.x, src.y, 0);
      if (G.time - (b.lastSfx || 0) > 0.25) { b.lastSfx = G.time; sfx('wood'); }
      if (b.hp <= 0) {
        const cx = (i % MW) * TILE + TILE / 2, cy = ((i / MW) | 0) * TILE + TILE / 2;
        for (let k = 0; k < 14; k++) { const a = rand(0, 6.283), s = rand(60, 220); G.parts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.4, 0.9), max: 0.9, size: rand(2, 5), color: DF.MATERIALS[b.mat].color }); }
        bars[i] = null; G.flowDirty = true; sfx('break'); G.shake = Math.max(G.shake, 6);
      }
    }
    function doorInRange() {
      let best = null, bd = (TILE * 3.4) ** 2;
      for (const d of map.doors) {
        const cx = d.x * TILE + TILE / 2, cy = d.y * TILE + TILE / 2;
        const dd = (cx - P.x) ** 2 + (cy - P.y) ** 2;
        if (dd < bd) { bd = dd; best = d; }
      }
      return best;
    }
    function doorGroup(d) {
      const g = [d], seen = new Set([d.idx]);
      for (let k = 0; k < g.length; k++) {
        for (const o of map.doors) {
          if (seen.has(o.idx)) continue;
          if (Math.abs(o.x - g[k].x) + Math.abs(o.y - g[k].y) === 1 && o.dx === d.dx && o.dy === d.dy) { seen.add(o.idx); g.push(o); }
        }
      }
      return g;
    }
    // tenta construir/reparar em um tile de porta. Retorna 'ok' ou uma mensagem de erro
    function buildOn(d, matId, m) {
      const ex = bars[d.idx]; const rx = d.x * TILE, ry = d.y * TILE;
      if (!ex) {
        const cx = clamp(P.x, rx, rx + TILE), cy = clamp(P.y, ry, ry + TILE);
        if ((P.x - cx) ** 2 + (P.y - cy) ** 2 < (P.r + 2) ** 2) return 'Saia de cima da porta!';
        for (const z of G.zombies) { const zx = clamp(z.x, rx, rx + TILE), zy = clamp(z.y, ry, ry + TILE); if ((z.x - zx) ** 2 + (z.y - zy) ** 2 < z.r * z.r) return 'Tem um zumbi na porta!'; }
        if (P.scrap < m.cost) return 'Sucata insuficiente (' + m.cost + ')';
        P.scrap -= m.cost; bars[d.idx] = { mat: matId, hp: barMax(matId), max: barMax(matId), hit: 0, atk: 0, show: 2 };
        text(rx + TILE / 2, ry, m.name, '#e8c07a'); return 'ok';
      }
      const exOrder = DF.MATERIAL_ORDER.indexOf(ex.mat);
      if (P.mat > exOrder) {
        if (P.scrap < m.cost) return 'Sucata insuficiente (' + m.cost + ')';
        P.scrap -= m.cost; bars[d.idx] = { mat: matId, hp: barMax(matId), max: barMax(matId), hit: 0, atk: 0, show: 2 };
        text(rx + TILE / 2, ry, 'Melhorada: ' + m.name, '#e8c07a'); return 'ok';
      }
      if (ex.hp < ex.max) {
        const em = DF.MATERIALS[ex.mat]; const cost = Math.ceil(em.cost * 0.4 * (1 - ex.hp / ex.max) + 2);
        if (P.scrap < cost) return 'Sucata insuficiente (' + cost + ')';
        P.scrap -= cost; ex.hp = ex.max; text(rx + TILE / 2, ry, 'Reparada', '#9be37a'); return 'ok';
      }
      return 'noop';
    }
    const AMMO_COST = 40;
    let ammoBox = null;
    if (endless) {
      const sx = lv.start[0] * TILE, sy = lv.start[1] * TILE; let best = null, bd = 1e9;
      for (const ti of map.floorTiles) { const x = (ti % MW + 0.5) * TILE, y = (((ti / MW) | 0) + 0.5) * TILE; const dd = Math.hypot(x - sx, y - sy); if (dd > 130 && dd < bd) { bd = dd; best = { x, y }; } }
      ammoBox = best;
    }
    function actBuild() {
      if (P.buildCd > 0) return;
      if (endless && ammoBox && Math.hypot(P.x - ammoBox.x, P.y - ammoBox.y) < 70) {
        if (P.scrap < AMMO_COST) { msg('Precisa de ' + AMMO_COST + ' sucata', '#ff6b6b'); return; }
        const own = P.weapons.filter((x) => x.id !== 'pistol'); if (!own.length) { msg('Você só tem a pistola (munição infinita)', '#aaa'); return; }
        P.scrap -= AMMO_COST; P.buildCd = 0.4;
        for (const w2 of own) w2.reserve += Math.round(DF.WEAPONS[w2.id].reserve * 0.5);
        msg('Munição reabastecida! −' + AMMO_COST + ' sucata', '#d6c27a'); sfx('pickup'); return;
      }
      const d = doorInRange();
      if (!d) { msg('Chegue perto de uma entrada para construir', '#ffb347'); return; }
      const matId = DF.MATERIAL_ORDER[P.mat]; const m = DF.MATERIALS[matId];
      let done = 0, err = null;
      for (const t of doorGroup(d)) { const r = buildOn(t, matId, m); if (r === 'ok') done++; else if (r !== 'noop' && !err) err = r; }
      if (done) { G.flowDirty = true; P.buildCd = 0.3; sfx('build'); }
      else if (err) msg(err, '#ff6b6b');
      else msg('Barricada já está inteira', '#aaa');
    }

    // ----- armas / jogador
    const curW = () => P.weapons[P.wi];
    function startReload() {
      const w = curW(); const d = DF.WEAPONS[w.id];
      if (P.reloadT > 0 || w.mag >= w.magSize || w.reserve <= 0) return;
      P.reloadT = d.reload * (1 - 0.1 * U('reload')); P.reloadMax = P.reloadT; sfx('reload');
    }
    function fire(angle) {
      const w = curW(); const d = DF.WEAPONS[w.id];
      if (P.fireCd > 0 || P.reloadT > 0) return;
      if (w.mag <= 0) { startReload(); return; }
      if (G.furyT <= 0) w.mag--; P.fireCd = d.rate * (G.furyT > 0 ? 0.5 : 1); P.flash = 0.06;
      const dmg = d.dmg * (1 + 0.12 * wLvl(w.id)) * (cls === 'fighter' ? 1.2 : 1) * (G.furyT > 0 ? 1.8 : 1);
      if (d.kind === 'flame') {
        const ox = P.x + Math.cos(angle) * 22, oy = P.y + Math.sin(angle) * 22;
        for (const z of G.zombies.slice()) {
          const dx = z.x - P.x, dy = z.y - P.y, dist = Math.hypot(dx, dy);
          if (dist > d.range + z.r) continue;
          const da = Math.atan2(Math.sin(Math.atan2(dy, dx) - angle), Math.cos(Math.atan2(dy, dx) - angle));
          if (Math.abs(da) < 0.4 && losShot(P.x, P.y, z.x, z.y)) { z.burnT = 2.4; z.burnDmg = 4 * (1 + 0.12 * wLvl(w.id)); hurtZ(z, dmg, 0, 0, 0, true); }
        }
        for (let k = 0; k < 7; k++) { const a = angle + rand(-0.3, 0.3), sp = rand(380, 520), lf = d.range / sp * rand(0.55, 1); G.parts.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: lf, max: lf, size: rand(3, 7), color: pick(['#ff9f1c', '#ffd23f', '#ff6b2b']) }); }
        sfx('flame'); if (w.mag <= 0) startReload(); return;
      }
      if (d.kind === 'rocket') {
        G.rockets.push({ x: P.x + Math.cos(angle) * d.muzzle, y: P.y + Math.sin(angle) * d.muzzle, vx: Math.cos(angle) * d.speed, vy: Math.sin(angle) * d.speed, life: d.range / d.speed + 0.2, dmg, splash: d.splash });
        sfx('rocket'); G.shake = Math.max(G.shake, 4); if (w.mag <= 0) startReload(); return;
      }
      for (let i = 0; i < d.pellets; i++) {
        const a = angle + rand(-d.spread, d.spread);
        G.bullets.push({ x: P.x + Math.cos(angle) * (d.muzzle || 22), y: P.y + Math.sin(angle) * (d.muzzle || 22), vx: Math.cos(a) * d.speed, vy: Math.sin(a) * d.speed, dmg, life: d.range / d.speed, pierce: d.pierce, hit: new Set(), color: d.color });
      }
      sfx(w.id === 'shotgun' ? 'shotgun' : w.id === 'sniper' ? 'sniper' : 'shoot');
      G.shake = Math.max(G.shake, w.id === 'shotgun' ? 3 : 1);
      if (w.mag <= 0) startReload();
    }
    function switchWeapon(i) {
      if (i === P.wi || i < 0 || i >= P.weapons.length) return;
      P.wi = i; P.reloadT = 0; P.fireCd = 0.15; sfx('switch');
      if (curW().mag <= 0) startReload();
    }
    function actHeal() {
      if (P.inv.medkit <= 0) { msg('Sem kits médicos', '#ff6b6b'); return; }
      if (P.hp >= P.maxHp) { msg('Vida cheia', '#aaa'); return; }
      P.inv.medkit--; G.medkitsUsed++;
      const amt = Math.round((40 + 8 * U('medkit')) * (cls === 'medic' ? 1.5 : 1)); P.hp = Math.min(P.maxHp, P.hp + amt);
      text(P.x, P.y - 24, '+' + amt, '#6ee07a'); sfx('heal');
    }
    function actTrap() {
      const id = DF.TRAP_ORDER[P.trapI];
      if (P.inv[id] <= 0) { msg('Sem ' + DF.TRAPS[id].name, '#ff6b6b'); return; }
      const x = P.x + Math.cos(P.angle) * 30, y = P.y + Math.sin(P.angle) * 30;
      const ti = tileAt(x, y);
      if (ti < 0 || solid(ti % MW, (ti / MW) | 0, true)) { msg('Não dá para colocar aqui', '#ffb347'); return; }
      P.inv[id]--;
      G.traps.push({ type: id, x, y, r: id === 'mine' ? 20 : 17, dur: id === 'spike' ? 14 : id === 'bear' ? 2 : 1, tick: 0, arm: 0.6 });
      sfx('build');
    }
    function cycleTrap() { for (let k = 1; k <= 3; k++) { const n = (P.trapI + k) % 3; P.trapI = n; if (P.inv[DF.TRAP_ORDER[n]] > 0) break; } }
    function cycleMat() {
      for (let k = 1; k <= 3; k++) {
        const n = (P.mat + k) % 3; const id = DF.MATERIAL_ORDER[n];
        if (id === 'steel' && !save.steel) continue;
        P.mat = n; break;
      }
    }

    // ----- torres automáticas
    const tUp = (id) => (save.tlvl && save.tlvl[id]) || 0;
    const ownedTowers = () => DF.ALL_TOWERS.filter((id) => (save.towers && save.towers[id]) || (cls === 'engineer' && DF.TOWERS[id].eng));
    const towerMax = DF.TOWER_MAX + (cls === 'engineer' ? 2 : 0);
    const tcost = (id) => Math.round(DF.TOWERS[id].cost * (cls === 'engineer' ? 0.75 : 1));
    { const o0 = ownedTowers(); if (o0.length) P.towerI = DF.ALL_TOWERS.indexOf(o0[0]); }
    function cycleTower() {
      const o = ownedTowers(); if (!o.length) return;
      const i = o.indexOf(DF.ALL_TOWERS[P.towerI]); P.towerI = DF.ALL_TOWERS.indexOf(o[(i + 1) % o.length]);
    }
    function actTower() {
      const o = ownedTowers();
      if (!o.length) { msg('Compre torres na loja!', '#ffb347'); return; }
      let id = DF.ALL_TOWERS[P.towerI]; if (!o.includes(id)) { id = o[0]; P.towerI = DF.ALL_TOWERS.indexOf(id); }
      const d = DF.TOWERS[id];
      if (G.towers.length >= towerMax) { msg('Limite de ' + towerMax + ' torres', '#ffb347'); return; }
      if (P.scrap < tcost(id)) { msg('Sucata insuficiente (' + tcost(id) + ')', '#ff6b6b'); return; }
      const x = P.x + Math.cos(P.angle) * 38, y = P.y + Math.sin(P.angle) * 38;
      const ti = tileAt(x, y);
      let ok = ti >= 0 && tiles[ti] === T.FLOOR;
      for (const ox of [-14, 0, 14]) for (const oy of [-14, 0, 14]) if (ok && solid(Math.floor((x + ox) / TILE), Math.floor((y + oy) / TILE), true)) ok = false;
      if (!ok) { msg('Não dá para colocar aqui', '#ffb347'); return; }
      for (const t of G.towers) if (Math.hypot(t.x - x, t.y - y) < 40) { msg('Muito perto de outra torre', '#ffb347'); return; }
      P.scrap -= tcost(id);
      const hp = Math.round(d.hp * (1 + 0.1 * tUp(id)));
      G.towers.push({ type: id, x, y, hp, max: hp, angle: P.angle, cd: 0.4, flash: 0, recoil: 0, show: 2, firing: false });
      sfx('build'); text(x, y - 22, d.name, '#e8c07a');
    }
    function hurtTower(t, dmg) {
      t.hp -= dmg; t.show = 2.5; if (G.time - (t.sfxT || 0) > 0.3) { t.sfxT = G.time; sfx('wood'); }
      if (t.hp <= 0) {
        const i = G.towers.indexOf(t); if (i >= 0) G.towers.splice(i, 1);
        for (let k = 0; k < 18; k++) { const a = rand(0, 6.283), sp = rand(60, 240); G.parts.push({ x: t.x, y: t.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.4, 0.9), max: 0.9, size: rand(2, 5), color: pick(['#6d7479', '#c9a15a', '#555']) }); }
        sfx('break'); msg('Torre destruída!', '#ff6b6b');
      }
    }
    function nearTower(z) {
      for (const t of G.towers) if (Math.hypot(t.x - z.x, t.y - z.y) < z.r + 17) return t;
      return null;
    }
    function explode(x, y, R, dmg, fall, bossMul) {
      for (const z of G.zombies.slice()) {
        const d = Math.hypot(z.x - x, z.y - y);
        if (d < R + z.r && (d < 30 || losShot(x, y, z.x, z.y))) hurtZ(z, dmg * (z.boss && bossMul ? bossMul : 1) * (1 - (d / (R + z.r)) * (fall === undefined ? 0.55 : fall)), (z.x - x) / (d || 1), (z.y - y) / (d || 1), 220);
      }
      for (let k = 0; k < 28; k++) { const a = rand(0, 6.283), sp = rand(60, 330); G.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.25, 0.6), max: 0.6, size: rand(2, 5), color: pick(['#ffb347', '#ff6b2b', '#ffe27a', '#555']) }); }
      decal(x, y, Math.min(R * 0.45, 70), 'rgba(8,6,4,0.35)');
      G.shake = Math.max(G.shake, 6); sfx('boom');
    }
    // ----- granadas
    function cycleGren() { for (let k = 1; k <= 3; k++) { const n = (P.grenI + k) % 3; P.grenI = n; if (P.gren[DF.GRENADE_ORDER[n]] > 0) break; } }
    function actGren() {
      if (P.grenCd > 0) return;
      let id = DF.GRENADE_ORDER[P.grenI];
      if (P.gren[id] <= 0) {
        const alt = DF.GRENADE_ORDER.find((g) => P.gren[g] > 0);
        if (!alt) { msg('Sem granadas', '#ff6b6b'); return; }
        id = alt; P.grenI = DF.GRENADE_ORDER.indexOf(id);
      }
      P.gren[id]--; P.grenCd = 0.5;
      let tx = P.x, ty = P.y; const ca = Math.cos(P.angle), sa = Math.sin(P.angle);
      for (let dd = 14; dd <= 270; dd += 12) { const x = P.x + ca * dd, y = P.y + sa * dd; const ti = tileAt(x, y); if (ti < 0 || isHigh(ti)) break; tx = x; ty = y; }
      G.grenFly.push({ type: id, x0: P.x, y0: P.y, x1: tx, y1: ty, x: P.x, y: P.y, t: 0, T: 0.65, h: 0 });
      sfx('throw');
    }
    function detonate(g) {
      const d0 = DF.GRENADES[g.type]; const d = { r: d0.r * (GM > 1 ? 1.3 : 1), dmg: d0.dmg * GM };
      if (g.type === 'frag') explode(g.x, g.y, d.r, d.dmg);
      else if (g.type === 'fire') {
        explode(g.x, g.y, d.r, d.dmg, 0.3); G.fires.push({ x: g.x, y: g.y, r: d.r, t: 6, tick: 0 });
        for (let k = 0; k < 24; k++) { const a = rand(0, 6.283), sp = rand(40, 200); G.parts.push({ x: g.x, y: g.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.4, 0.8), max: 0.8, size: rand(3, 7), color: pick(['#ff9f1c', '#ffd23f', '#ff6b2b']) }); }
      } else {
        explode(g.x, g.y, d.r, d.dmg, 0.25, 0.35);
        G.holy = { x: g.x, y: g.y, t: 1, R: d.r }; G.whiteFlash = 0.7; G.shake = 20; sfx('holy');
        for (let k = 0; k < 50; k++) { const a = rand(0, 6.283), sp = rand(80, 420); G.parts.push({ x: g.x, y: g.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.5, 1.1), max: 1.1, size: rand(2, 6), color: pick(['#fff6c0', '#ffe27a', '#ffffff']) }); }
      }
    }
    function updateGrenades(dt) {
      for (let i = G.grenFly.length - 1; i >= 0; i--) {
        const g = G.grenFly[i]; g.t += dt; if (g.t < 0) continue; const k = Math.min(1, g.t / g.T);
        g.x = g.x0 + (g.x1 - g.x0) * k; g.y = g.y0 + (g.y1 - g.y0) * k; g.h = Math.sin(k * Math.PI);
        if (k >= 1) { detonate(g); G.grenFly.splice(i, 1); }
      }
      for (let i = G.fires.length - 1; i >= 0; i--) {
        const f = G.fires[i]; f.t -= dt; f.tick -= dt;
        if (Math.random() < 0.7) { const a = rand(0, 6.283), d2 = Math.sqrt(Math.random()) * f.r * 0.9; G.parts.push({ x: f.x + Math.cos(a) * d2, y: f.y + Math.sin(a) * d2, vx: rand(-15, 15), vy: rand(-60, -25), life: rand(0.3, 0.6), max: 0.6, size: rand(3, 6), color: pick(['#ff9f1c', '#ffd23f', '#ff6b2b']) }); }
        if (f.tick <= 0) {
          f.tick = 0.3;
          for (const z of G.zombies.slice()) if (Math.hypot(z.x - f.x, z.y - f.y) < f.r + z.r * 0.5) { z.burnT = 2.4; z.burnDmg = 6; hurtZ(z, 5, 0, 0, 0, true); }
        }
        if (f.t <= 0) G.fires.splice(i, 1);
      }
      if (G.holy) { G.holy.t -= dt * 1.2; if (G.holy.t <= 0) G.holy = null; }
      G.whiteFlash = Math.max(0, G.whiteFlash - dt * 1.4);
    }
    // ----- habilidades de classe
    function actSkill() {
      if (G.skillCd > 0) { msg('Habilidade recarregando (' + Math.ceil(G.skillCd) + 's)', '#ffb347'); return; }
      if (CLS.cost && P.scrap < CLS.cost) { msg('Precisa de ' + CLS.cost + ' sucata', '#ff6b6b'); return; }
      const fx = P.x + Math.cos(P.angle) * 40, fy = P.y + Math.sin(P.angle) * 40;
      if (cls === 'fighter') { G.furyT = 8; msg('FÚRIA!', '#ff7a3a'); sfx('boss'); }
      else if (cls === 'medic' || cls === 'engineer') {
        const ti = tileAt(fx, fy); if (ti < 0 || solid(ti % MW, (ti / MW) | 0, true)) { msg('Não dá para colocar aqui', '#ffb347'); return; }
        const kind = cls === 'medic' ? 'heal' : 'ammo';
        if (G.boxes.filter((b) => b.kind === kind).length >= 2) G.boxes.splice(G.boxes.findIndex((b) => b.kind === kind), 1);
        G.boxes.push({ kind, x: fx, y: fy, t: kind === 'heal' ? 22 : 90, uses: 3 }); sfx('build');
        msg(kind === 'heal' ? 'Caixa de cura colocada' : 'Caixa de munição colocada', '#7be07a');
      } else if (cls === 'grenadier') {
        if (P.gren.frag <= 0) { msg('Precisa de 1 granada comum', '#ff6b6b'); return; }
        P.gren.frag--;
        let tx = P.x + Math.cos(P.angle) * 230, ty = P.y + Math.sin(P.angle) * 230;
        for (let k = 0; k < 6; k++) { const a = rand(0, 6.283), dd = rand(0, 90); G.grenFly.push({ type: 'frag', x0: P.x, y0: P.y, x1: tx + Math.cos(a) * dd, y1: ty + Math.sin(a) * dd, x: P.x, y: P.y, t: -k * 0.22, T: 0.7, h: 0 }); }
        msg('BOMBARDEIO!', '#ffd27a'); sfx('throw');
      }
      P.scrap -= CLS.cost || 0; G.skillCd = CLS.cd;
    }
    function updateClass(dt) {
      G.skillCd = Math.max(0, G.skillCd - dt); G.furyT = Math.max(0, G.furyT - dt);
      if (cls === 'grenadier') { G.regenT += dt; if (G.regenT > (P.gren.frag <= 0 ? 8 : 14)) { G.regenT = 0; if (P.gren.frag < 8) { P.gren.frag++; msg('+1 Granada', '#ffd27a'); } } }
      for (let i = G.boxes.length - 1; i >= 0; i--) {
        const b = G.boxes[i]; b.t -= dt; const d = Math.hypot(P.x - b.x, P.y - b.y);
        if (b.kind === 'heal') { if (d < 105 && P.hp < P.maxHp) { P.hp = Math.min(P.maxHp, P.hp + 11 * dt); if (Math.random() < 0.15) G.parts.push({ x: P.x + rand(-8, 8), y: P.y + rand(-8, 8), vx: 0, vy: -40, life: 0.5, max: 0.5, size: 3, color: '#6ee07a' }); } }
        else if (d < 34) {
          const own = P.weapons.filter((x) => x.id !== 'pistol');
          if (own.length && own.some((x) => x.reserve < DF.WEAPONS[x.id].reserve * 1.2)) { for (const w2 of own) w2.reserve += Math.round(DF.WEAPONS[w2.id].reserve * 0.35); b.uses--; msg('Munição reabastecida', '#d6c27a'); sfx('pickup'); }
        }
        if (b.t <= 0 || b.uses <= 0) G.boxes.splice(i, 1);
      }
      for (let i = G.zaps.length - 1; i >= 0; i--) { G.zaps[i].t -= dt; if (G.zaps[i].t <= 0) G.zaps.splice(i, 1); }
    }
    function updateTowers(dt) {
      for (const t of G.towers.slice()) {
        const d = DF.TOWERS[t.type], lv = tUp(t.type);
        t.cd -= dt; t.flash = Math.max(0, t.flash - dt); t.show = Math.max(0, t.show - dt); t.recoil = Math.max(0, (t.recoil || 0) - dt * 60); t.firing = false;
        let best = null, bd = d.range * d.range;
        for (const z of G.zombies) {
          if (z.born > 0.3) continue;
          const dd = (z.x - t.x) ** 2 + (z.y - t.y) ** 2;
          if (dd < bd && losShot(t.x, t.y, z.x, z.y)) { bd = dd; best = z; }
        }
        if (!best) continue;
        const want = Math.atan2(best.y - t.y, best.x - t.x);
        const diff = Math.atan2(Math.sin(want - t.angle), Math.cos(want - t.angle));
        t.angle += clamp(diff, -dt * 7, dt * 7);
        if (Math.abs(diff) > 0.3 || t.cd > 0) continue;
        const mult = (1 + 0.15 * lv) * (cls === 'engineer' ? 1.2 : 1); t.cd = d.rate * (1 - 0.05 * lv);
        if (t.type === 'mg') {
          const a = t.angle + rand(-0.06, 0.06);
          G.bullets.push({ x: t.x + Math.cos(t.angle) * 24, y: t.y + Math.sin(t.angle) * 24, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, dmg: d.dmg * mult, life: d.range / 900, pierce: 1, hit: new Set(), color: '#ffd27a' });
          t.flash = 0.05; t.recoil = 3; sfx('shoot');
        } else if (t.type === 'tesla') {
          let cur = best, prev = { x: t.x, y: t.y }; const hit = new Set();
          for (let k = 0; k < d.chain && cur; k++) {
            hit.add(cur); G.zaps.push({ x0: prev.x, y0: prev.y, x1: cur.x, y1: cur.y, t: 0.14 });
            hurtZ(cur, d.dmg * mult * (1 - k * 0.2), 0, 0, 0, true); prev = cur;
            let nx = null, nd = 130 * 130; for (const z of G.zombies) if (!hit.has(z)) { const dd = (z.x - cur.x) ** 2 + (z.y - cur.y) ** 2; if (dd < nd) { nd = dd; nx = z; } }
            cur = nx;
          }
          t.flash = 0.12; sfx('zap');
        } else if (t.type === 'railgun') {
          const a = t.angle; G.bullets.push({ x: t.x + Math.cos(a) * 26, y: t.y + Math.sin(a) * 26, vx: Math.cos(a) * 1500, vy: Math.sin(a) * 1500, dmg: d.dmg * mult, life: d.range / 1500, pierce: 6, hit: new Set(), color: '#9fd0ff' });
          t.flash = 0.1; t.recoil = 7; sfx('shoot'); sfx('rocket');
        } else if (t.type === 'flame') {
          t.firing = true; t.flash = 0.1; sfx('flame');
          for (const z of G.zombies.slice()) {
            const dx = z.x - t.x, dy = z.y - t.y, dist = Math.hypot(dx, dy);
            if (dist > d.range + z.r) continue;
            const da = Math.atan2(Math.sin(Math.atan2(dy, dx) - t.angle), Math.cos(Math.atan2(dy, dx) - t.angle));
            if (Math.abs(da) < 0.42) { z.burnT = 2.4; z.burnDmg = 4 * mult; hurtZ(z, d.dmg * mult, 0, 0, 0, true); }
          }
          for (let k = 0; k < 4; k++) { const a = t.angle + rand(-0.28, 0.28), sp = rand(170, 300); G.parts.push({ x: t.x + Math.cos(t.angle) * 22, y: t.y + Math.sin(t.angle) * 22, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.25, 0.45), max: 0.45, size: rand(3, 7), color: pick(['#ff9f1c', '#ffd23f', '#ff6b2b']) }); }
        } else {
          G.rockets.push({ x: t.x + Math.cos(t.angle) * 30, y: t.y + Math.sin(t.angle) * 30, vx: Math.cos(t.angle) * 400, vy: Math.sin(t.angle) * 400, life: d.range / 400 + 0.3, dmg: d.dmg * mult, splash: d.splash });
          t.flash = 0.1; t.recoil = 8; sfx('rocket');
        }
      }
      for (let ri = G.rockets.length - 1; ri >= 0; ri--) {
        const r = G.rockets[ri]; r.x += r.vx * dt; r.y += r.vy * dt; r.life -= dt;
        G.parts.push({ x: r.x, y: r.y, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.4, max: 0.4, size: 3, color: '#b9b9b9' });
        let boom = r.life <= 0; const ti = tileAt(r.x, r.y);
        if (ti < 0 || isHigh(ti)) boom = true;
        else for (const z of G.zombies) if ((z.x - r.x) ** 2 + (z.y - r.y) ** 2 < (z.r + 5) ** 2) { boom = true; break; }
        if (boom) { explode(r.x, r.y, r.splash, r.dmg); G.rockets.splice(ri, 1); }
      }
    }

    // ----- zumbis
    function spawnZombie(typeId, atPos) {
      const d = DF.ZOMBIES[typeId];
      let x, y;
      if (atPos) { x = atPos.x; y = atPos.y; }
      else {
        const door = pick(map.doors); const sp = pick(door.spawns);
        x = (sp.x + 0.5) * TILE + rand(-10, 10); y = (sp.y + 0.5) * TILE + rand(-10, 10);
      }
      const waveMul = mission ? 1 + 0.08 * mission.idx : endless ? 1 + 0.07 * (Math.max(1, G.wave) - 1) + G.time / 300 : 1 + 0.06 * (Math.max(1, G.wave) - 1);
      const hp = d.boss ? d.hp : Math.round(d.hp * lv.hpScale * waveMul);
      const z = {
        id: G.idc++, type: typeId, def: d, x, y, r: d.r, hp, max: hp, speed: d.speed * rand(0.92, 1.1) * (endless && !d.boss ? 1 + Math.min(0.35, G.time / 900) : 1),
        atkT: rand(0, 0.5), barT: 0, flash: 0, rootT: 0, slowT: 0, born: 0.35, losT: rand(0, 0.2), canSee: false,
        boss: d.boss || null, v: rint(0, 3), atkAnim: 0, burnT: 0, burnTick: 0, burnDmg: 4, mode: 'idle', abT: 3.5, n: 0, face: 0, walk: rand(0, 6), spitT: rand(1, 2.2), kb: { x: 0, y: 0 }
      };
      G.zombies.push(z);
      if (d.boss) { G.bossAlive = true; G.boss = z; msg('⚠ ' + d.name + ' chegou!', '#ff5a5a'); sfx('boss'); }
      return z;
    }
    function composeWave(w) {
      const N = lv.waves; const li = opts.level;
      const count = Math.round((6 + w * 3.2) * lv.countScale);
      const wt = { walker: 10, runner: (w >= 2 || li >= 1) ? 4 + w : 0, spitter: (w >= 3 || li >= 2) ? 2 + w / 2 : 0, brute: (w >= 4 || (li >= 2 && w >= 3)) ? 1.2 + li * 0.4 : 0, bomber: (w >= 3 || (li >= 1 && w >= 2)) ? 1.2 + w / 3 : 0, carrier: (w >= 4 || (li >= 2 && w >= 3)) ? 1 + w / 3.5 : 0 };
      const keys = Object.keys(wt); const tot = keys.reduce((s, k) => s + wt[k], 0);
      const q = [];
      const n = !endless && w === N ? Math.round(count * 0.6) : count;
      for (let i = 0; i < n; i++) { let r = Math.random() * tot; let t = 'walker'; for (const k of keys) { r -= wt[k]; if (r <= 0) { t = k; break; } } q.push(t); }
      if (w === N) q.splice(Math.min(3, q.length), 0, lv.boss);
      if (endless && w % 5 === 0) q.splice(Math.min(3, q.length), 0, lv.boss);
      return q;
    }
    function startWave() {
      G.wave++; G.waveState = 'fight'; G.spawnQ = composeWave(G.wave); G.spawnT = 0.5;
      if (endless) { msg('Onda ' + G.wave + (G.wave % 5 === 0 ? ' — CHEFE!' : ''), G.wave % 5 === 0 ? '#ff5a5a' : '#fff'); sfx('wave'); return; }
      msg(G.wave === lv.waves ? 'ONDA FINAL!' : 'Onda ' + G.wave + ' de ' + lv.waves, G.wave === lv.waves ? '#ff5a5a' : '#fff'); sfx('wave');
    }
    function killZombie(z) {
      const i = G.zombies.indexOf(z); if (i >= 0) G.zombies.splice(i, 1);
      G.kills++; const sc = z.def.scrap + rint(0, 1); P.scrap += sc; G.scrapGained += sc;
      text(z.x, z.y - z.r - 14, '+' + sc, '#e8c07a'); blood(z.x, z.y, z.boss ? 40 : 12, z.type === 'spitter' ? '#3a8a6a' : '#6f1114', z.boss ? 260 : 150);
      sfx(z.boss ? 'bossdie' : 'die');
      if (z.boss) { G.bossAlive = false; G.boss = null; G.bossDead = true; G.shake = 14; msg('Chefe derrotado! Pegue os itens!', '#7be07a'); dropBossLoot(z.x, z.y); }
      if (z.def.bomb) bombBlast(z);
      if (z.def.brood) { for (let k = 0; k < 6; k++) spawnZombie('worm', { x: z.x + rand(-20, 20), y: z.y + rand(-20, 20) }); msg('Vermes!', '#e8a0a0'); }
      decal(z.x, z.y, z.boss ? 50 : z.r * 1.7, z.type === 'spitter' ? 'rgba(40,120,80,0.55)' : z.type === 'worm' ? 'rgba(150,90,90,0.5)' : 'rgba(110,14,18,0.6)');
      if (Math.random() < 0.05 && !z.boss) spawnLoot(z.x, z.y);
      if (cls === 'grenadier' && !z.boss && z.type !== 'worm' && Math.random() < 0.14) { const r2 = Math.random(); G.loot.push({ x: z.x, y: z.y, kind: 'grenade', g: r2 < 0.7 ? 'frag' : r2 < 0.92 ? 'fire' : 'holy', ttl: 32, bob: rand(0, 6) }); }
    }
    function bombBlast(z) {
      const R = 105; G.bombDepth = (G.bombDepth || 0) + 1;
      if (G.bombDepth < 4) explode(z.x, z.y, R, 130, 0.5);
      G.bombDepth--;
      const dp = Math.hypot(P.x - z.x, P.y - z.y); if (dp < R + P.r) hurtPlayer(Math.round(38 * (1 - dp / (R + P.r) * 0.5)));
      for (let i = 0; i < bars.length; i++) { const b = bars[i]; if (!b) continue; const bx = (i % MW + 0.5) * TILE, by = (((i / MW) | 0) + 0.5) * TILE; if (Math.hypot(bx - z.x, by - z.y) < R + 20) damageBar(i, 110, null); }
      for (const t of G.towers.slice()) if (Math.hypot(t.x - z.x, t.y - z.y) < R) hurtTower(t, 70);
      decal(z.x, z.y, R * 0.55, 'rgba(8,6,4,0.55)'); G.shake = Math.max(G.shake, 9);
    }
    function hurtZ(z, dmg, nx, ny, kb, quiet) {
      z.hp -= dmg; z.barT = 2.4; z.flash = 0.1;
      if (kb && !z.boss) { z.kb.x += nx * kb; z.kb.y += ny * kb; }
      if (!quiet) { text(z.x + rand(-6, 6), z.y - z.r - 6, String(Math.round(dmg)), z.boss ? '#ffd27a' : '#fff'); blood(z.x, z.y, 2, z.type === 'spitter' ? '#3a8a6a' : '#7a0f12', 100); }
      if (z.hp <= 0) killZombie(z);
    }
    function hurtPlayer(dmg) {
      if (P.hurtT > 0 || G.state !== 'play') return;
      P.hp -= dmg; P.hurtT = 0.35; G.hurtFlash = 0.35; G.shake = Math.max(G.shake, 5); sfx('hurt');
      blood(P.x, P.y, 6, '#a01418', 120);
      if (P.hp <= 0) { P.hp = 0; G.state = 'lost'; G.endT = 1.6; msg('Você foi devorado...', '#ff5a5a'); }
    }
    function acidShot(x, y, a, dmg) {
      G.acid.push({ x, y, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, life: 2.2, dmg: dmg || 10 });
    }
    function bossUpdate(z, dt) {
      const ang = Math.atan2(P.y - z.y, P.x - z.x);
      if (z.mode === 'idle') {
        z.abT -= dt * (z.enraged ? 1.4 : 1);
        if (z.abT <= 0) {
          let kind;
          if (z.boss === 'smasher') kind = z.n++ % 3 === 2 ? 'summon' : 'stomp';
          else if (z.boss === 'charger') kind = 'charge';
          else if (z.boss === 'summoner') kind = z.n++ % 2 ? 'summon' : 'spray';
          else kind = ['stomp', 'charge', 'summon', 'spray'][z.n++ % 4];
          z.mode = 'wind'; z.kind = kind; z.aim = ang;
          z.abT = kind === 'stomp' ? 0.75 : kind === 'charge' ? 0.8 : 0.6; z.windMax = z.abT;
        }
      } else if (z.mode === 'wind') {
        z.abT -= dt; if (z.kind === 'charge') z.aim = ang; z.face = ang;
        if (z.abT <= 0) {
          if (z.kind === 'stomp') {
            const R = 140; G.shake = 12; sfx('stomp');
            if (Math.hypot(P.x - z.x, P.y - z.y) < R + P.r) hurtPlayer(z.def.dmg);
            const tx0 = Math.floor((z.x - R) / TILE), tx1 = Math.floor((z.x + R) / TILE), ty0 = Math.floor((z.y - R) / TILE), ty1 = Math.floor((z.y + R) / TILE);
            for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
              if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) continue; const i = ty * MW + tx;
              if (bars[i] && Math.hypot((tx + 0.5) * TILE - z.x, (ty + 0.5) * TILE - z.y) < R + TILE / 2) damageBar(i, 140);
            }
            for (const t of G.towers.slice()) if (Math.hypot(t.x - z.x, t.y - z.y) < R + 17) hurtTower(t, 70);
            for (let k = 0; k < 24; k++) { const a = (k / 24) * 6.283; G.parts.push({ x: z.x, y: z.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, life: 0.5, max: 0.5, size: 3, color: '#b9a98a' }); }
            z.mode = 'idle'; z.abT = z.boss === 'mega' ? 2.4 : 3.4;
          } else if (z.kind === 'charge') {
            z.mode = 'act'; z.abT = 1.0; z.dvx = Math.cos(z.aim) * 560; z.dvy = Math.sin(z.aim) * 560; z.didHit = false; sfx('roar');
          } else if (z.kind === 'summon') {
            const mt = z.boss === 'smasher' ? ['walker', 'walker', 'runner'] : ['spitter', 'runner', 'runner'];
            for (let k = 0; k < 3; k++) spawnZombie(mt[k], { x: z.x + rand(-30, 30), y: z.y + rand(-30, 30) });
            z.mode = 'idle'; z.abT = z.boss === 'mega' ? 2.4 : 4.5;
          } else if (z.kind === 'spray') {
            for (let k = -3; k <= 3; k++) acidShot(z.x, z.y, ang + k * 0.2, 12);
            sfx('spit'); z.mode = 'idle'; z.abT = z.boss === 'mega' ? 2.4 : 3;
          }
        }
      } else if (z.mode === 'act') {
        z.abT -= dt; z.face = Math.atan2(z.dvy, z.dvx);
        const hit = moveEnt(z, z.dvx * dt, z.dvy * dt, false);
        if (hit >= 0) { damageBar(hit, 260); z.mode = 'idle'; z.abT = 3; G.shake = 10; }
        if (!z.didHit && Math.hypot(P.x - z.x, P.y - z.y) < z.r + P.r + 4) { hurtPlayer(z.def.dmg + 8); z.didHit = true; }
        if (z.abT <= 0) { z.mode = 'idle'; z.abT = z.boss === 'mega' ? 2.4 : 3.2; }
      }
    }
    function updateZombie(z, dt) {
      z.born = Math.max(0, z.born - dt); z.flash = Math.max(0, z.flash - dt); z.barT = Math.max(0, z.barT - dt);
      z.atkT -= dt; z.slowT = Math.max(0, z.slowT - dt); z.atkAnim = Math.max(0, z.atkAnim - dt);
      if (z.burnT > 0) {
        z.burnT -= dt; z.burnTick -= dt;
        if (z.burnTick <= 0) { z.burnTick = 0.4; hurtZ(z, z.burnDmg, 0, 0, 0, true); if (z.hp <= 0) return; }
      }
      if (z.kb.x || z.kb.y) { moveEnt(z, z.kb.x * dt, z.kb.y * dt, false); z.kb.x *= 0.85; z.kb.y *= 0.85; if (Math.abs(z.kb.x) + Math.abs(z.kb.y) < 5) { z.kb.x = z.kb.y = 0; } }
      if (z.rootT > 0) { z.rootT -= dt; return; }
      if (z.boss) {
        if (!z.enraged && z.hp < z.max * 0.5) { z.enraged = true; z.speed *= 1.25; msg(z.def.name + ' está enfurecido!', '#ff5a5a'); sfx('roar'); }
        bossUpdate(z, dt);
        if (z.mode !== 'idle') return;
      }
      const dP = Math.hypot(P.x - z.x, P.y - z.y);
      // ataque corpo a corpo
      if (dP < z.r + P.r + 8) {
        z.face = Math.atan2(P.y - z.y, P.x - z.x);
        if (z.atkT <= 0) { z.atkT = z.def.cd; z.atkAnim = 0.4; hurtPlayer(z.def.dmg); sfx('bite'); }
        return;
      }
      const tw = nearTower(z);
      if (tw) {
        z.face = Math.atan2(tw.y - z.y, tw.x - z.x);
        if (z.atkT <= 0) { z.atkT = z.def.cd; z.atkAnim = 0.4; hurtTower(tw, z.def.dmg); }
        return;
      }
      // cuspidor
      if (z.def.ranged) {
        z.spitT -= dt;
        if (dP < 320 && los(z.x, z.y, P.x, P.y, false)) {
          z.face = Math.atan2(P.y - z.y, P.x - z.x);
          if (z.spitT <= 0) { z.spitT = 2.2; acidShot(z.x, z.y, z.face + rand(-0.06, 0.06), 10); sfx('spit'); }
          if (dP < 300) return;
        }
      }
      z.losT -= dt;
      if (z.losT <= 0) { z.losT = 0.2; z.canSee = dP < 560 && los(z.x, z.y, P.x, P.y, true); }
      let tx = P.x, ty = P.y, attackBar = -1;
      if (!z.canSee) {
        const n = nextStep(z);
        if (n >= 0) {
          const ncx = (n % MW) * TILE + TILE / 2, ncy = ((n / MW) | 0) * TILE + TILE / 2;
          if (bars[n]) {
            const rx = (n % MW) * TILE, ry = ((n / MW) | 0) * TILE;
            const cx = clamp(z.x, rx, rx + TILE), cy = clamp(z.y, ry, ry + TILE);
            if (Math.hypot(z.x - cx, z.y - cy) < z.r + 5) attackBar = n;
          }
          tx = ncx; ty = ncy;
        }
      }
      z.face = Math.atan2(ty - z.y, tx - z.x);
      if (attackBar >= 0) {
        if (z.atkT <= 0) { z.atkT = z.def.cd; z.atkAnim = 0.4; damageBar(attackBar, z.def.bdmg, z); }
        return;
      }
      const sp = z.speed * (z.slowT > 0 ? 0.5 : 1) * (z.born > 0 ? 0.4 : 1);
      const dd = Math.hypot(tx - z.x, ty - z.y) || 1;
      z.walk += dt * sp * 0.08;
      const hit = moveEnt(z, ((tx - z.x) / dd) * sp * dt, ((ty - z.y) / dd) * sp * dt, false);
      if (hit >= 0 && z.atkT <= 0) { z.atkT = z.def.cd; z.atkAnim = 0.4; damageBar(hit, z.def.bdmg, z); }
    }

    // ----- loot
    function spawnLoot(x, y) {
      if (x === undefined) {
        if (mission) {
          let ok = false;
          for (let k = 0; k < 25 && !ok; k++) {
            const a = rand(0, 6.283), d2 = rand(160, 520); x = P.x + Math.cos(a) * d2; y = P.y + Math.sin(a) * d2;
            const ti = tileAt(x, y); ok = ti >= 0 && !solid(ti % MW, (ti / MW) | 0, true);
          }
          if (!ok) return;
        } else {
          const ti = pick(map.floorTiles); x = (ti % MW + 0.5) * TILE; y = (((ti / MW) | 0) + 0.5) * TILE;
          if (Math.hypot(x - P.x, y - P.y) < 60) return;
        }
      }
      const tbl = [['ammo', 24], ['medkit', 16], ['scrap', 18], ['trap', 16], ['weapon', 12], ['grenade', 14]];
      let r = Math.random() * tbl.reduce((s, t) => s + t[1], 0), kind = 'ammo';
      for (const [k, wgt] of tbl) { r -= wgt; if (r <= 0) { kind = k; break; } }
      const L = { x, y, kind, ttl: 32, bob: rand(0, 6) };
      if (kind === 'weapon') { const avail = DF.WEAPON_ORDER.filter((id) => id !== 'pistol'); L.w = pick(avail); }
      if (kind === 'trap') L.trap = pick(DF.TRAP_ORDER);
      if (kind === 'grenade') { const r2 = Math.random(); L.g = r2 < 0.6 ? 'frag' : r2 < 0.9 ? 'fire' : 'holy'; }
      G.loot.push(L); sfx('drop');
    }
    function pickupLoot(L) {
      const c = L.kind;
      if (c === 'medkit') { P.inv.medkit++; msg('+1 Kit médico', '#7be07a'); }
      else if (c === 'scrap') { const n = rint(25, 45); P.scrap += n; msg('+' + n + ' sucata', '#e8c07a'); }
      else if (c === 'grenade') { P.gren[L.g]++; msg('+1 ' + DF.GRENADES[L.g].name, '#ffd27a'); }
      else if (c === 'coins') { G.bonusCoins += L.amt; msg('+' + L.amt + ' moedas', '#ffd86b'); }
      else if (c === 'trap') { const n = L.trap === 'spike' ? 3 : 2; P.inv[L.trap] += n; msg('+' + n + ' ' + DF.TRAPS[L.trap].name, '#ffb347'); }
      else if (c === 'weapon' || c === 'ammo') {
        let id = c === 'weapon' ? L.w : null;
        if (c === 'ammo' && L.all) {
          const own = P.weapons.filter((x) => x.id !== 'pistol');
          for (const w2 of own) w2.reserve += Math.round(DF.WEAPONS[w2.id].reserve * 0.7);
          msg('Munição para todas as armas!', '#d6c27a'); sfx('pickup'); return;
        }
        if (c === 'ammo') {
          const cw = curW();
          if (cw.id !== 'pistol') id = cw.id; else { const own = P.weapons.filter((w) => w.id !== 'pistol'); id = own.length ? pick(own).id : pick(['smg', 'shotgun', 'rifle']); }
        }
        let w = P.weapons.find((x) => x.id === id);
        if (!w) {
          w = mkWeapon(id, 0.8); P.weapons.push(w);
          P.weapons.sort((a, b) => DF.WEAPON_ORDER.indexOf(a.id) - DF.WEAPON_ORDER.indexOf(b.id));
          switchWeapon(P.weapons.indexOf(w)); msg('Nova arma: ' + DF.WEAPONS[id].name, '#7ab8ff');
        } else {
          const add = Math.round(DF.WEAPONS[id].reserve * 0.5); w.reserve += add; msg('+' + add + ' munição ' + DF.WEAPONS[id].name, '#d6c27a');
        }
      }
      sfx('pickup');
    }

    function dropBossLoot(x, y) {
      const li = opts.level, amt = 40 + 25 * li;
      const items = [{ kind: 'ammo', all: true }, { kind: 'ammo', all: true }, { kind: 'medkit' }, { kind: 'medkit' }, { kind: 'grenade', g: 'holy' }, { kind: 'grenade', g: 'frag' }, { kind: 'scrap' }, { kind: 'coins', amt }, { kind: 'coins', amt }];
      items.forEach((it, i) => {
        let px = x, py = y;
        for (let k = 0; k < 12; k++) {
          const a = (i / items.length) * 6.283 + rand(-0.3, 0.3), d2 = rand(55, 110) + k * 6; const qx = x + Math.cos(a) * d2, qy = y + Math.sin(a) * d2;
          const ti = tileAt(qx, qy); if (ti >= 0 && !solid(ti % MW, (ti / MW) | 0, true)) { px = qx; py = qy; break; }
        }
        G.loot.push(Object.assign({ x: px, y: py, ttl: 60, bob: rand(0, 6), boss: true }, it));
      });
      G.bossLootT = 25; sfx('drop');
    }

    // ----- missão (mapa grande)
    function freeSpot(cx, cy, rad) {
      for (let k = 0; k < 30; k++) {
        const a = rand(0, 6.283), d2 = Math.sqrt(Math.random()) * rad; const x = cx + Math.cos(a) * d2, y = cy + Math.sin(a) * d2;
        const ti = tileAt(x, y); if (ti >= 0 && !solid(ti % MW, (ti / MW) | 0, false)) return { x, y };
      }
      return null;
    }
    function missionType() {
      const p = mission.idx; const wt = { walker: 10, runner: 3 + p, spitter: 1 + p * 0.8, brute: 0.3 + p * 0.5, bomber: p * 0.9, carrier: p * 0.6 };
      const keys = Object.keys(wt); let r = Math.random() * keys.reduce((a, k) => a + wt[k], 0);
      for (const k of keys) { r -= wt[k]; if (r <= 0) return k; }
      return 'walker';
    }
    function objTarget() {
      if (!mission) return null; const o = lv.objectives[mission.idx]; if (!o) return null;
      if (o.type === 'boss' && G.boss) return { x: G.boss.x, y: G.boss.y };
      return { x: o.x * TILE, y: o.y * TILE };
    }
    function updateMission(dt) {
      for (const g of mission.groups) {
        if (g.done) continue;
        if (Math.hypot(P.x - g.x * TILE, P.y - g.y * TILE) < g.trig * TILE) {
          g.done = true;
          for (let k = 0; k < g.n; k++) { const sp = freeSpot(g.x * TILE, g.y * TILE, 3.5 * TILE); if (sp) spawnZombie(missionType(), sp); }
        }
      }
      mission.ambT -= dt;
      if (mission.ambT <= 0) {
        mission.ambT = rand(5, 8);
        if (G.zombies.filter((z) => !z.boss).length < 22) {
          for (let k = 0; k < 2; k++) { const a = rand(0, 6.283), d2 = rand(650, 850); const sp = freeSpot(P.x + Math.cos(a) * d2, P.y + Math.sin(a) * d2, 60); if (sp) spawnZombie(missionType(), sp); }
        }
      }
      const o = lv.objectives[mission.idx]; if (!o) return;
      const dist = Math.hypot(P.x - o.x * TILE, P.y - o.y * TILE);
      if (o.type === 'reach') {
        if (dist < 2.2 * TILE) {
          if (o.win) { G.state = 'won'; G.endT = 1.8; msg('VITÓRIA!', '#7be07a'); sfx('win'); }
          else { mission.idx++; msg('Objetivo concluído!', '#7be07a'); sfx('wavedone'); }
        }
      } else if (o.type === 'boss') {
        if (!mission.bossSpawned) { if (dist < o.r * TILE) { mission.bossSpawned = true; spawnZombie(lv.boss, { x: o.x * TILE, y: o.y * TILE }); } }
        else if (G.bossDead) { mission.idx++; msg('Chefe derrotado! Pegue o loot e corra para o helicóptero!', '#7be07a'); }
      }
    }

    // ----- loop de atualização
    function aimAndFire(dt) {
      let angle = P.angle, wantFire = false;
      const st = input.stick;
      const w = DF.WEAPONS[curW().id];
      if (st && st.active) { angle = Math.atan2(st.y, st.x); wantFire = Math.hypot(st.x, st.y) > 0.35; }
      else if (!input.touch && input.mouse && input.mouse.has) {
        const wx = camera.x + input.mouse.x / camera.s, wy = camera.y + input.mouse.y / camera.s;
        angle = Math.atan2(wy - P.y, wx - P.x); wantFire = input.mouseDown || input.keyFire;
      } else if (input.auto) {
        let best = null, bd = (w.range * 0.95) ** 2;
        for (const z of G.zombies) {
          const dd = (z.x - P.x) ** 2 + (z.y - P.y) ** 2;
          if (dd < bd && z.born < 0.3 && losShot(P.x, P.y, z.x, z.y)) { bd = dd; best = z; }
        }
        if (best) { angle = Math.atan2(best.y - P.y, best.x - P.x); wantFire = true; }
        else if (Math.hypot(input.mx, input.my) > 0.2) angle = Math.atan2(input.my, input.mx);
      } else if (Math.hypot(input.mx, input.my) > 0.2) angle = Math.atan2(input.my, input.mx);
      if (input.keyFire) wantFire = true;
      P.angle = angle;
      if (wantFire) fire(angle);
    }
    function update(dt) {
      G.time += dt;
      // ações enfileiradas
      while (input.actions.length) {
        const a = input.actions.shift();
        if (G.state !== 'play') continue;
        if (a === 'build') actBuild();
        else if (a === 'heal') actHeal();
        else if (a === 'trap') actTrap();
        else if (a === 'trapType') cycleTrap();
        else if (a === 'material') cycleMat();
        else if (a === 'weapon') switchWeapon((P.wi + 1) % P.weapons.length);
        else if (a === 'reload') startReload();
        else if (a === 'skip' && G.waveState === 'break') {
          const bonus = Math.round(G.breakT * 2.5);
          if (bonus > 0) { P.scrap += bonus; G.scrapGained += bonus; msg('Espera pulada: +' + bonus + ' sucata', '#e8c07a'); }
          G.breakT = 0;
        }
        else if (a === 'tower') actTower();
        else if (a === 'gren') actGren();
        else if (a === 'skill') actSkill();
        else if (a === 'grenType') cycleGren();
        else if (a === 'towerType') cycleTower();
        else if (a.startsWith('w:')) switchWeapon(parseInt(a.slice(2), 10));
      }
      if (G.state === 'play') {
        P.buildCd = Math.max(0, P.buildCd - dt); P.grenCd = Math.max(0, P.grenCd - dt); P.fireCd = Math.max(0, P.fireCd - dt); P.hurtT = Math.max(0, P.hurtT - dt); P.flash = Math.max(0, P.flash - dt);
        if (P.reloadT > 0) {
          P.reloadT -= dt;
          if (P.reloadT <= 0) { P.reloadT = 0; sfx('reloaded'); const w = curW(); const need = w.magSize - w.mag; const take = Math.min(need, w.reserve); w.mag += take; if (w.reserve !== Infinity) w.reserve -= take; }
        }
        let mx = input.mx, my = input.my; const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
        if (ml > 0.05) { moveEnt(P, mx * P.speed * dt, my * P.speed * dt, true); P.walk += dt * 9; }
        aimAndFire(dt);
        { const pti = tileAt(P.x, P.y); G.outside = !open && pti >= 0 && tiles[pti] === T.OUT; }
        if (G.outside) {
          P.hp -= 2.4 * dt; G.hurtFlash = Math.max(G.hurtFlash, 0.1);
          if (P.hp <= 0) { P.hp = 0; G.state = 'lost'; G.endT = 1.6; msg('Você morreu lá fora...', '#ff5a5a'); }
        }
        if (P.hurtT <= 0) { /* regen nenhuma */ }
        if (Math.floor(P.x / TILE) !== G.ptx || Math.floor(P.y / TILE) !== G.pty) { G.ptx = Math.floor(P.x / TILE); G.pty = Math.floor(P.y / TILE); G.flowDirty = true; }
      }
      // ondas
      if (G.state === 'play') {
        if (!mission && !endless && G.bossDead && (G.bossLootT <= 0 || !G.loot.some((l) => l.boss))) { G.state = 'won'; G.endT = 1.8; msg('VITÓRIA!', '#7be07a'); sfx('win'); }
        else if (mission) { updateMission(dt); }
        else if (G.waveState === 'break') {
          G.breakT -= dt; if (G.breakT <= 0) startWave();
        } else {
          G.spawnT -= dt;
          if (G.spawnQ.length && G.spawnT <= 0 && G.zombies.length < 45) {
            spawnZombie(G.spawnQ.shift()); G.spawnT = Math.max(0.35, 1.15 - G.wave * 0.09) * rand(0.7, 1.2);
          }
          if (!G.spawnQ.length && G.zombies.length === 0) {
            if (!endless && G.wave >= lv.waves) { if (!G.bossDead || G.bossLootT <= 0 || !G.loot.some((l) => l.boss)) { G.state = 'won'; G.endT = 1.8; msg('VITÓRIA!', '#7be07a'); sfx('win'); } }
            else { G.waveState = 'break'; G.breakT = endless ? 8 : 12; const bonus = 12 + 4 * G.wave; P.scrap += bonus; G.scrapGained += bonus; msg('Onda ' + G.wave + ' concluída! +' + bonus + ' sucata', '#7be07a'); sfx('wavedone'); }
          }
        }
        // loot
        G.lootT -= dt;
        if (G.lootT <= 0) { if (G.loot.length < 3) spawnLoot(); G.lootT = rand(11, 19) * (1 - 0.1 * U('loot')); }
      }
      if (G.bossLootT > 0) G.bossLootT -= dt;
      // fluxo
      G.flowT += dt;
      if (G.flowDirty && G.flowT > 0.12 || G.flowT > 0.6) computeFlow();
      // zumbis
      if (G.state === 'play') for (const z of G.zombies.slice()) updateZombie(z, dt);
      // separação
      const Z = G.zombies;
      for (let i = 0; i < Z.length; i++) for (let j = i + 1; j < Z.length; j++) {
        const a = Z[i], b = Z[j]; const dx = b.x - a.x, dy = b.y - a.y; const rr = a.r + b.r; const d2 = dx * dx + dy * dy;
        if (d2 < rr * rr && d2 > 0.01) {
          const d = Math.sqrt(d2), ov = (rr - d) * 0.5; const ma = a.r * a.r, mb = b.r * b.r, tm = ma + mb;
          const ux = dx / d, uy = dy / d;
          moveEnt(a, -ux * ov * (mb / tm) * 2, -uy * ov * (mb / tm) * 2, false); moveEnt(b, ux * ov * (ma / tm) * 2, uy * ov * (ma / tm) * 2, false);
        }
      }
      if (G.state === 'play') { updateTowers(dt); updateGrenades(dt); updateClass(dt); }
      // balas
      for (let bi = G.bullets.length - 1; bi >= 0; bi--) {
        const b = G.bullets[bi]; let dead = false;
        const steps = Math.ceil(Math.hypot(b.vx, b.vy) * dt / 12);
        for (let s = 0; s < steps && !dead; s++) {
          b.x += (b.vx * dt) / steps; b.y += (b.vy * dt) / steps;
          const ti = tileAt(b.x, b.y);
          if (ti < 0 || isHigh(ti)) { dead = true; blood(b.x, b.y, 3, '#d9d27a', 80); break; }
          for (const z of G.zombies) {
            if (b.hit.has(z.id)) continue;
            if ((z.x - b.x) ** 2 + (z.y - b.y) ** 2 < (z.r + 3) ** 2) {
              b.hit.add(z.id); const l = Math.hypot(b.vx, b.vy);
              hurtZ(z, b.dmg, b.vx / l, b.vy / l, 90);
              b.pierce--; if (b.pierce <= 0) { dead = true; break; }
            }
          }
        }
        b.life -= dt; if (b.life <= 0 || dead) G.bullets.splice(bi, 1);
      }
      // ácido
      for (let ai = G.acid.length - 1; ai >= 0; ai--) {
        const a = G.acid[ai]; a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt; let dead = a.life <= 0;
        const ti = tileAt(a.x, a.y);
        if (ti < 0 || isBlockType(ti)) dead = true;
        else if (bars[ti]) { damageBar(ti, 12); dead = true; }
        else if (G.state === 'play' && (P.x - a.x) ** 2 + (P.y - a.y) ** 2 < (P.r + 5) ** 2) { hurtPlayer(a.dmg); dead = true; }
        if (dead) { blood(a.x, a.y, 4, '#4fd08a', 80); G.acid.splice(ai, 1); }
      }
      // armadilhas
      for (let ti = G.traps.length - 1; ti >= 0; ti--) {
        const t = G.traps[ti]; t.arm -= dt; if (t.arm > 0) continue; t.tick -= dt;
        let remove = false;
        if (t.type === 'spike') {
          if (t.tick <= 0) {
            let any = false;
            for (const z of G.zombies) if (Math.hypot(z.x - t.x, z.y - t.y) < t.r + z.r * 0.6) { hurtZ(z, 16, 0, 0, 0); z.slowT = 0.6; any = true; }
            if (any) { t.dur--; t.tick = 0.45; sfx('spike'); if (t.dur <= 0) remove = true; }
          }
        } else if (t.type === 'mine') {
          if (G.zombies.some((z) => Math.hypot(z.x - t.x, z.y - t.y) < t.r + z.r * 0.6)) {
            for (const z of G.zombies.slice()) { const d = Math.hypot(z.x - t.x, z.y - t.y); if (d < 100 + z.r) hurtZ(z, 150 * (1 - d / 160), (z.x - t.x) / (d || 1), (z.y - t.y) / (d || 1), 260); }
            for (let k = 0; k < 30; k++) { const a = rand(0, 6.283), s = rand(60, 320); G.parts.push({ x: t.x, y: t.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.25, 0.6), max: 0.6, size: rand(2, 5), color: pick(['#ffb347', '#ff6b2b', '#ffe27a', '#555']) }); }
            G.shake = 10; sfx('boom'); remove = true;
          }
        } else if (t.type === 'bear') {
          for (const z of G.zombies) if (z.rootT <= 0 && Math.hypot(z.x - t.x, z.y - t.y) < t.r + z.r * 0.5) { z.rootT = z.boss ? 1.2 : 3.5; hurtZ(z, 40, 0, 0, 0); t.dur--; sfx('bear'); break; }
          if (t.dur <= 0) remove = true;
        }
        if (remove) G.traps.splice(ti, 1);
      }
      // loot
      for (let li = G.loot.length - 1; li >= 0; li--) {
        const L = G.loot[li]; L.ttl -= dt;
        if (G.state === 'play' && Math.hypot(L.x - P.x, L.y - P.y) < 28) { pickupLoot(L); G.loot.splice(li, 1); continue; }
        if (L.ttl <= 0) G.loot.splice(li, 1);
      }
      // barricadas
      for (let i = 0; i < bars.length; i++) { const b = bars[i]; if (b) { b.hit = Math.max(0, b.hit - dt); b.atk = Math.max(0, b.atk - dt); b.show = Math.max(0, b.show - dt); } }
      // partículas/textos
      for (let i = G.parts.length - 1; i >= 0; i--) { const p = G.parts[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt; if (p.life <= 0) G.parts.splice(i, 1); }
      for (let i = G.texts.length - 1; i >= 0; i--) { const t = G.texts[i]; t.y -= 30 * dt; t.life -= dt; if (t.life <= 0) G.texts.splice(i, 1); }
      G.shake = Math.max(0, G.shake - dt * 30); G.hurtFlash = Math.max(0, G.hurtFlash - dt); G.msgT = Math.max(0, G.msgT - dt);
      // fim
      if (G.state === 'won' || G.state === 'lost') {
        G.endT -= dt;
        if (G.endT <= 0 && !G.ended) { G.ended = true; finish(); }
      }
    }
    function finish() {
      const win = G.state === 'won'; const li = opts.level;
      const hpPct = P.hp / P.maxHp;
      const stars = win ? (hpPct >= 0.85 ? 3 : hpPct >= 0.5 ? 2 : 1) : 0;
      const waveProg = Math.max(0, G.wave - (win ? 0 : 1));
      const coins = Math.round(20 + 12 * li + G.kills * 0.5 + (win ? 70 + 40 * li + stars * 25 : waveProg * (6 + 3 * li))) + G.bonusCoins;
      if (endless) { if (opts.onEnd) opts.onEnd({ win: false, endless: true, time: Math.floor(G.time), kills: G.kills, coins: Math.round(Math.floor(G.time) / 6 + G.kills * 0.5) + G.bonusCoins, wave: G.wave, level: li }); return; }
      if (opts.onEnd) opts.onEnd({ win, stars, kills: G.kills, coins, wave: G.wave, waves: lv.waves, level: li });
    }

    G.spawnZombie = spawnZombie;
    // ----- HUD snapshot
    G.hud = function () {
      const w = curW(); const d = DF.WEAPONS[w.id]; const matId = DF.MATERIAL_ORDER[P.mat]; const trapId = DF.TRAP_ORDER[P.trapI];
      const door = doorInRange();
      return {
        hp: P.hp, maxHp: P.maxHp, weapon: d.name, wicon: d.icon, mag: w.mag, reserve: w.reserve, reload: P.reloadT > 0 ? 1 - P.reloadT / P.reloadMax : -1,
        scrap: P.scrap, medkit: P.inv.medkit, mat: DF.MATERIALS[matId], matId, trap: DF.TRAPS[trapId], trapId, trapCount: P.inv[trapId],
        wave: G.wave, waves: lv.waves, waveState: G.waveState, breakT: Math.max(0, G.breakT), left: G.spawnQ.length + G.zombies.length,
        boss: G.boss ? { name: G.boss.def.name, hp: G.boss.hp, max: G.boss.max } : null,
        wid: w.id, towerInfo: (() => { const o = ownedTowers(); if (!o.length) return null; const id = o.includes(DF.ALL_TOWERS[P.towerI]) ? DF.ALL_TOWERS[P.towerI] : o[0]; return { id, name: DF.TOWERS[id].name, cost: tcost(id), count: G.towers.length, max: towerMax }; })(),
        gren: { id: DF.GRENADE_ORDER[P.grenI], name: DF.GRENADES[DF.GRENADE_ORDER[P.grenI]].name, count: P.gren[DF.GRENADE_ORDER[P.grenI]], all: P.gren },
        cls: { id: cls, name: CLS.name, skill: CLS.skill, cd: G.skillCd, cdMax: CLS.cd, cost: CLS.cost, fury: G.furyT }, outside: G.outside, bossTimer: !mission && !endless && G.bossDead && G.state === 'play' ? Math.ceil(Math.max(0, G.bossLootT)) : 0, mission: mission && lv.objectives[mission.idx] ? (() => { const o = lv.objectives[mission.idx], t = objTarget(); return { text: o.text, dist: Math.round(Math.hypot(P.x - t.x, P.y - t.y) / TILE), step: mission.idx + 1, total: lv.objectives.length }; })() : null,
        msg: G.msgT > 0 ? G.msgText : '', msgColor: G.msgColor, nearDoor: !!door || (endless && !!ammoBox && Math.hypot(P.x - ammoBox.x, P.y - ammoBox.y) < 70), endless, time: Math.floor(G.time), record: endless ? ((save.records || {})[lv.id] || 0) : 0, weapons: P.weapons.map((x) => x.id), wi: P.wi, state: G.state, steel: !!save.steel
      };
    };

    // ---------------------------------------------------------------- render
    DF.resizeGame = () => resize();
    function resize() {
      const vw = window.innerWidth, vh = window.innerHeight;
      // limita o total de pixels desenhados por quadro (telas grandes/densas ficam pesadas)
      const budget = DF.lowRes ? 0.9e6 : 1.5e6;
      const dpr = Math.max(0.5, Math.min(window.devicePixelRatio || 1, 2.5, Math.sqrt(budget / (vw * vh))));
      canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
      canvas.style.width = vw + 'px'; canvas.style.height = vh + 'px';
      camera.vw = vw; camera.vh = vh; camera.dpr = dpr;
      camera.s = Math.min(vw, vh) / (TILE * 15);
      if (vw / vh < 1) camera.s = Math.min(vw, vh) / (TILE * 11);
    }
    function render() {
      const s = camera.s, dpr = camera.dpr;
      const viewW = camera.vw / s, viewH = camera.vh / s;
      const worldW = MW * TILE, worldH = MH * TILE;
      let cx = P.x - viewW / 2, cy = P.y - viewH / 2;
      cx = worldW <= viewW ? (worldW - viewW) / 2 : clamp(cx, 0, worldW - viewW);
      cy = worldH <= viewH ? (worldH - viewH) / 2 : clamp(cy, 0, worldH - viewH);
      camera.x += (cx - camera.x) * 0.2; camera.y += (cy - camera.y) * 0.2;
      if (!G.camInit) { camera.x = cx; camera.y = cy; G.camInit = true; }
      const shx = G.shake ? rand(-G.shake, G.shake) * 0.4 : 0, shy = G.shake ? rand(-G.shake, G.shake) * 0.4 : 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#050605'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr * s, 0, 0, dpr * s, (-camera.x + shx) * s * dpr, (-camera.y + shy) * s * dpr);
      { const sx0 = Math.max(0, Math.floor(camera.x - 8)), sy0 = Math.max(0, Math.floor(camera.y - 8));
        const sw0 = Math.min(worldW - sx0, Math.ceil(viewW + 16)), sh0 = Math.min(worldH - sy0, Math.ceil(viewH + 16));
        if (sw0 > 0 && sh0 > 0) { ctx.drawImage(staticLayer, sx0, sy0, sw0, sh0, sx0, sy0, sw0, sh0); ctx.drawImage(decalLayer, sx0 / 2, sy0 / 2, sw0 / 2, sh0 / 2, sx0, sy0, sw0, sh0); } }

      // marcadores de portas
      const near = doorInRange();
      for (const d of map.doors) {
        if (bars[d.idx]) continue;
        const px = d.x * TILE, py = d.y * TILE;
        const isNear = near && near.idx === d.idx;
        ctx.strokeStyle = isNear ? 'rgba(255,220,90,0.95)' : 'rgba(255,90,60,0.55)'; ctx.lineWidth = isNear ? 3 : 2; ctx.setLineDash([6, 5]);
        ctx.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6); ctx.setLineDash([]);
      }
      if (near && bars[near.idx]) { ctx.strokeStyle = 'rgba(255,220,90,0.9)'; ctx.lineWidth = 2; ctx.strokeRect(near.x * TILE + 1, near.y * TILE + 1, TILE - 2, TILE - 2); }

      // armadilhas
      for (const t of G.traps) {
        ctx.save(); ctx.translate(t.x, t.y); ctx.globalAlpha = t.arm > 0 ? 0.5 : 1;
        if (t.type === 'spike') { ctx.fillStyle = '#9aa3aa'; for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4); ctx.lineTo(Math.cos(a + 0.2) * 16, Math.sin(a + 0.2) * 16); ctx.lineTo(Math.cos(a - 0.2) * 16, Math.sin(a - 0.2) * 16); ctx.fill(); } }
        else if (t.type === 'mine') { ctx.fillStyle = '#3a3d40'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, 6.283); ctx.fill(); ctx.fillStyle = Math.floor(G.time * 3) % 2 ? '#ff3b3b' : '#6a1a1a'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 6.283); ctx.fill(); }
        else { ctx.strokeStyle = '#b5bcc2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 13, 0.4, 2.7); ctx.arc(0, 0, 13, 3.5, 5.9); ctx.stroke(); ctx.fillStyle = '#6b7075'; ctx.fillRect(-4, -4, 8, 8); }
        ctx.restore();
      }
      // torres
      for (const t of G.towers) {
        ctx.save(); ctx.translate(t.x, t.y); DF.sprites.tower(ctx, t, G.time); ctx.restore();
        if (t.show > 0 || t.hp < t.max) drawBar(t.x - 18, t.y - 30, 36, 5, t.hp / t.max, '#7ab8ff', t.show > 0 ? Math.min(1, t.show / 0.5) : 0.6);
      }
      // loot
      for (const L of G.loot) {
        if (L.ttl < 6 && Math.floor(G.time * 6) % 2) continue;
        const bob = Math.sin(G.time * 4 + L.bob) * 2;
        ctx.save(); ctx.translate(L.x, L.y + bob);
        const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 30); glow.addColorStop(0, 'rgba(255,230,120,0.45)'); glow.addColorStop(1, 'rgba(255,230,120,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 30, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#7a5a2e'; rrect(ctx, -12, -12, 24, 24, 4); ctx.fill(); ctx.strokeStyle = '#d9b36a'; ctx.lineWidth = 2; rrect(ctx, -12, -12, 24, 24, 4); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        let lab = L.kind === 'grenade' ? 'GR' : L.kind === 'coins' ? '$' : L.kind === 'ammo' ? (L.all ? 'MUN' : 'AM') : L.kind === 'scrap' ? 'SU' : L.kind === 'weapon' ? DF.WEAPONS[L.w].name.slice(0, 3).toUpperCase() : L.trap === 'spike' ? 'ES' : L.trap === 'mine' ? 'MI' : 'UR';
        if (L.kind === 'medkit') { ctx.fillStyle = '#e53935'; ctx.fillRect(-3, -8, 6, 16); ctx.fillRect(-8, -3, 16, 6); }
        else { ctx.fillStyle = L.kind === 'grenade' ? '#ff8a5c' : L.kind === 'coins' ? '#ffd86b' : L.kind === 'weapon' ? '#7ab8ff' : L.kind === 'ammo' ? '#ffd27a' : L.kind === 'scrap' ? '#e8c07a' : '#ffb347'; ctx.fillText(lab, 0, 1); }
        ctx.restore();
      }
      // barricadas
      for (let i = 0; i < bars.length; i++) {
        const b = bars[i]; if (!b) continue; const m = DF.MATERIALS[b.mat];
        const px = (i % MW) * TILE, py = ((i / MW) | 0) * TILE; const sh = b.hit > 0 ? rand(-2, 2) : 0;
        ctx.save(); ctx.translate(sh, 0);
        ctx.fillStyle = m.dark; ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = m.color;
        if (b.mat === 'wood') { for (let k = 0; k < 4; k++) ctx.fillRect(px + 4, py + 4 + k * 10, TILE - 8, 8); ctx.fillStyle = '#d9d9d9'; for (let k = 0; k < 4; k++) { ctx.fillRect(px + 8, py + 7 + k * 10, 2, 2); ctx.fillRect(px + TILE - 10, py + 7 + k * 10, 2, 2); } }
        else if (b.mat === 'iron') { ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8); ctx.strokeStyle = m.dark; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + 4, py + 4); ctx.lineTo(px + TILE - 4, py + TILE - 4); ctx.moveTo(px + TILE - 4, py + 4); ctx.lineTo(px + 4, py + TILE - 4); ctx.stroke(); ctx.fillStyle = '#ddd'; for (const [ox, oy] of [[8, 8], [TILE - 10, 8], [8, TILE - 10], [TILE - 10, TILE - 10]]) ctx.fillRect(px + ox, py + oy, 3, 3); }
        else { ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(px + 5, py + 5, TILE - 10, 10); ctx.strokeStyle = m.dark; ctx.lineWidth = 3; ctx.strokeRect(px + 7, py + 7, TILE - 14, TILE - 14); }
        // rachaduras
        const dmgPct = 1 - b.hp / b.max;
        if (dmgPct > 0.25) { ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px + 10, py + 6); ctx.lineTo(px + 20, py + 22); ctx.lineTo(px + 14, py + 40); if (dmgPct > 0.55) { ctx.moveTo(px + 38, py + 8); ctx.lineTo(px + 28, py + 26); ctx.lineTo(px + 34, py + 42); } ctx.stroke(); }
        ctx.restore();
        if (b.show > 0 || dmgPct > 0) {
          const a = b.show > 0 ? Math.min(1, b.show / 0.5) : 0.6;
          drawBar(px + 4, py - 8, TILE - 8, 5, b.hp / b.max, '#e8c07a', a);
        }
      }
      for (const r of G.rockets) { ctx.save(); ctx.translate(r.x, r.y); DF.sprites.rocket(ctx, r); ctx.restore(); }
      // ácido
      for (const a of G.acid) { ctx.fillStyle = '#6fe8a0'; ctx.beginPath(); ctx.arc(a.x, a.y, 5, 0, 6.283); ctx.fill(); ctx.fillStyle = 'rgba(111,232,160,0.3)'; ctx.beginPath(); ctx.arc(a.x, a.y, 9, 0, 6.283); ctx.fill(); }
      // telegráficos dos chefes
      for (const z of G.zombies) {
        if (!z.boss || z.mode !== 'wind') continue;
        if (z.kind === 'stomp') { const k = 1 - z.abT / (z.windMax || 0.75); ctx.fillStyle = 'rgba(255,60,40,0.18)'; ctx.beginPath(); ctx.arc(z.x, z.y, 140, 0, 6.283); ctx.fill(); ctx.strokeStyle = 'rgba(255,60,40,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(z.x, z.y, 140 * k, 0, 6.283); ctx.stroke(); }
        else if (z.kind === 'charge') { ctx.strokeStyle = 'rgba(255,60,40,0.55)'; ctx.lineWidth = z.r * 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.lineTo(z.x + Math.cos(z.aim) * 520, z.y + Math.sin(z.aim) * 520); ctx.stroke(); ctx.lineCap = 'butt'; }
      }
      if (ammoBox) {
        const near = Math.hypot(P.x - ammoBox.x, P.y - ammoBox.y) < 70;
        ctx.save(); ctx.translate(ammoBox.x, ammoBox.y);
        if (near) { ctx.strokeStyle = 'rgba(255,216,107,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 30, 0, 6.283); ctx.stroke(); }
        ctx.fillStyle = '#3d4a2c'; rrect(ctx, -17, -13, 34, 26, 4); ctx.fill(); ctx.strokeStyle = '#161a10'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#d9b36a'; for (let i = -2; i <= 2; i++) ctx.fillRect(i * 6 - 1.5, -8, 3, 14);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('MUNIÇÃO ' + AMMO_COST + '🔧', 0, -19);
        ctx.restore();
      }
      for (const b of G.boxes) {
        ctx.save(); ctx.translate(b.x, b.y);
        if (b.kind === 'heal') {
          const p = 0.5 + 0.5 * Math.sin(G.time * 4); ctx.strokeStyle = 'rgba(110,224,122,' + (0.25 + 0.25 * p) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 105, 0, 6.283); ctx.stroke();
          const hg = ctx.createRadialGradient(0, 0, 10, 0, 0, 105); hg.addColorStop(0, 'rgba(110,224,122,0.18)'); hg.addColorStop(1, 'rgba(110,224,122,0)'); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, 105, 0, 6.283); ctx.fill();
          ctx.fillStyle = '#e8f5ec'; rrect(ctx, -13, -13, 26, 26, 4); ctx.fill(); ctx.strokeStyle = '#2a3a2a'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#d4141c'; ctx.fillRect(-3.5, -9, 7, 18); ctx.fillRect(-9, -3.5, 18, 7);
        } else {
          ctx.fillStyle = '#3d4a2c'; rrect(ctx, -15, -11, 30, 22, 4); ctx.fill(); ctx.strokeStyle = '#161a10'; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = '#d9b36a'; for (let i = -2; i <= 2; i++) ctx.fillRect(i * 5 - 1.5, -6, 3, 11);
        }
        ctx.restore();
      }
      for (const zp of G.zaps) { ctx.strokeStyle = 'rgba(160,215,255,' + Math.min(1, zp.t / 0.1) + ')'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(zp.x0, zp.y0); const n = 5; for (let i = 1; i < n; i++) { const k = i / n; ctx.lineTo(zp.x0 + (zp.x1 - zp.x0) * k + rand(-7, 7), zp.y0 + (zp.y1 - zp.y0) * k + rand(-7, 7)); } ctx.lineTo(zp.x1, zp.y1); ctx.stroke(); }
      // fogo no chão
      for (const f of G.fires) { const a = Math.min(1, f.t / 1.5); const fg = ctx.createRadialGradient(f.x, f.y, 4, f.x, f.y, f.r); fg.addColorStop(0, 'rgba(255,170,40,' + 0.55 * a + ')'); fg.addColorStop(1, 'rgba(255,60,0,' + 0.12 * a + ')'); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill(); }
      // granadas em voo
      for (const g of G.grenFly) {
        if (g.t < 0) continue;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(g.x, g.y + 3, 6, 3.5, 0, 0, 6.283); ctx.fill();
        const gy = g.y - g.h * 34; ctx.fillStyle = g.type === 'frag' ? '#4f6b3a' : g.type === 'fire' ? '#d4551c' : '#f4efe0'; ctx.beginPath(); ctx.arc(g.x, gy, 6, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        if (g.type === 'holy') { ctx.fillStyle = '#d4a017'; ctx.fillRect(g.x - 1, gy - 4, 2, 8); ctx.fillRect(g.x - 3.5, gy - 1.5, 7, 2); }
      }
      // zumbis (ordenados por y)
      const zs = G.zombies.slice().sort((a, b) => a.y - b.y);
      for (const z of zs) drawZombie(z);
      if (save.laser && save.laserOn !== false && G.state === 'play') {
        const wd = DF.WEAPONS[curW().id], mz = wd.muzzle || 22, rng = Math.min(wd.range || 600, 900);
        const ca = Math.cos(P.angle), sa = Math.sin(P.angle); let len = mz;
        for (; len < rng; len += 6) { const ti = tileAt(P.x + ca * len, P.y + sa * len); if (ti < 0 || isHigh(ti)) break; }
        const x0 = P.x + ca * mz, y0 = P.y + sa * mz, x1 = P.x + ca * len, y1 = P.y + sa * len;
        const lg = ctx.createLinearGradient(x0, y0, x1, y1); lg.addColorStop(0, 'rgba(255,40,40,0.75)'); lg.addColorStop(1, 'rgba(255,40,40,0.25)');
        ctx.strokeStyle = 'rgba(255,40,40,0.18)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.strokeStyle = lg; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.fillStyle = 'rgba(255,70,70,0.95)'; ctx.beginPath(); ctx.arc(x1, y1, 3, 0, 6.283); ctx.fill(); ctx.fillStyle = 'rgba(255,60,60,0.25)'; ctx.beginPath(); ctx.arc(x1, y1, 7, 0, 6.283); ctx.fill();
      }
      if (G.furyT > 0) { ctx.fillStyle = 'rgba(255,90,40,' + (0.18 + 0.1 * Math.sin(G.time * 14)) + ')'; ctx.beginPath(); ctx.arc(P.x, P.y, 26, 0, 6.283); ctx.fill(); }
      drawPlayer();
      if (P.reloadT > 0 && P.reloadMax > 0) { const k = 1 - P.reloadT / P.reloadMax; ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(P.x - 19, P.y - P.r - 17, 38, 7); ctx.fillStyle = '#5ac8ff'; ctx.fillRect(P.x - 18, P.y - P.r - 16, 36 * k, 5); ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('RECARREGANDO', P.x, P.y - P.r - 22); }
      // balas
      for (const b of G.bullets) { ctx.strokeStyle = b.color || '#ffe9a0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.022, b.y - b.vy * 0.022); ctx.stroke(); }
      // partículas
      for (const p of G.parts) { ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
      ctx.globalAlpha = 1;
      // barras de vida dos zumbis + textos
      for (const z of G.zombies) {
        if (z.boss || z.barT <= 0) continue;
        drawBar(z.x - 16, z.y - z.r - 12, 32, 5, z.hp / z.max, '#e04040', Math.min(1, z.barT / 0.6));
      }
      for (const z of G.zombies) if (z.boss) drawBar(z.x - 40, z.y - z.r - 16, 80, 7, z.hp / z.max, '#c040ff', 1);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const t of G.texts) { ctx.globalAlpha = clamp(t.life / 0.4, 0, 1); ctx.font = 'bold 13px sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(t.t, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.t, t.x, t.y); }
      ctx.globalAlpha = 1;

      // escuridão em volta do jogador
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const psx = (P.x - camera.x + shx) * s, psy = (P.y - camera.y + shy) * s;
      const R1 = 230 * s * (camera.s > 0 ? 1 : 1), R2 = 620 * s;
      if (save.light !== false && !DF.noLight) drawLighting(psx, psy, shx, shy);
      else {
        const g = ctx.createRadialGradient(psx, psy, R1, psx, psy, R2);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,8,' + lv.theme.dark + ')');
        ctx.fillStyle = g; ctx.fillRect(0, 0, camera.vw, camera.vh);
      }
      if (G.holy) {
        const k = 1 - G.holy.t, sx = (G.holy.x - camera.x) * s, sy = (G.holy.y - camera.y) * s, rr = G.holy.R * s * Math.min(1, k * 2.2);
        ctx.save(); ctx.globalAlpha = Math.max(0, G.holy.t);
        const hgr = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(1, rr)); hgr.addColorStop(0, 'rgba(255,250,210,0.95)'); hgr.addColorStop(0.7, 'rgba(255,225,120,0.45)'); hgr.addColorStop(1, 'rgba(255,200,60,0)');
        ctx.fillStyle = hgr; ctx.beginPath(); ctx.arc(sx, sy, rr, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#fff6c0'; const L1 = rr * 0.9, W1 = Math.max(4, rr * 0.07);
        ctx.fillRect(sx - W1, sy - L1 * 0.75, W1 * 2, L1 * 1.5); ctx.fillRect(sx - L1 * 0.5, sy - L1 * 0.28 - W1, L1, W1 * 2);
        ctx.restore();
      }
      if (G.whiteFlash > 0) { ctx.fillStyle = 'rgba(255,255,235,' + Math.min(0.75, G.whiteFlash) + ')'; ctx.fillRect(0, 0, camera.vw, camera.vh); }
      if (G.hurtFlash > 0) {
        const hg = ctx.createRadialGradient(camera.vw / 2, camera.vh / 2, Math.min(camera.vw, camera.vh) * 0.3, camera.vw / 2, camera.vh / 2, Math.max(camera.vw, camera.vh) * 0.7);
        hg.addColorStop(0, 'rgba(200,0,0,0)'); hg.addColorStop(1, 'rgba(200,0,0,' + (G.hurtFlash * 1.6) + ')'); ctx.fillStyle = hg; ctx.fillRect(0, 0, camera.vw, camera.vh);
      }
      if (P.hp / P.maxHp < 0.3 && G.state === 'play') {
        const a = 0.12 + 0.08 * Math.sin(G.time * 6);
        const hg = ctx.createRadialGradient(camera.vw / 2, camera.vh / 2, Math.min(camera.vw, camera.vh) * 0.35, camera.vw / 2, camera.vh / 2, Math.max(camera.vw, camera.vh) * 0.7);
        hg.addColorStop(0, 'rgba(160,0,0,0)'); hg.addColorStop(1, 'rgba(160,0,0,' + a + ')'); ctx.fillStyle = hg; ctx.fillRect(0, 0, camera.vw, camera.vh);
      }
      // setas: barricadas sob ataque e chefe fora da tela
      const arrow = (wx, wy, col) => {
        const sx = (wx - camera.x) * s, sy = (wy - camera.y) * s; const m = 26;
        if (sx > m && sx < camera.vw - m && sy > m && sy < camera.vh - m) return;
        const ax = clamp(sx, m, camera.vw - m), ay = clamp(sy, m + 50, camera.vh - m);
        const ang = Math.atan2(sy - camera.vh / 2, sx - camera.vw / 2);
        ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill(); ctx.restore();
      };
      for (let i = 0; i < bars.length; i++) { const b = bars[i]; if (b && b.atk > 0) arrow((i % MW) * TILE + TILE / 2, ((i / MW) | 0) * TILE + TILE / 2, 'rgba(255,200,60,0.95)'); }
      if (G.boss) arrow(G.boss.x, G.boss.y, 'rgba(200,80,255,0.95)');
      { const ot = objTarget(); if (ot) arrow(ot.x, ot.y, 'rgba(80,230,255,0.95)'); }
      // radar
      { const RR = 54, rx = 14 + RR, ry = 96 + RR + 12, WR = 900;
        ctx.save(); ctx.translate(rx, ry);
        ctx.fillStyle = 'rgba(4,16,8,0.7)'; ctx.beginPath(); ctx.arc(0, 0, RR, 0, 6.283); ctx.fill();
        ctx.strokeStyle = 'rgba(80,255,140,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.strokeStyle = 'rgba(80,255,140,0.2)'; ctx.beginPath(); ctx.arc(0, 0, RR * 0.5, 0, 6.283); ctx.moveTo(-RR, 0); ctx.lineTo(RR, 0); ctx.moveTo(0, -RR); ctx.lineTo(0, RR); ctx.stroke();
        const sw = G.time * 2.2; ctx.strokeStyle = 'rgba(80,255,140,0.5)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(sw) * RR, Math.sin(sw) * RR); ctx.stroke();
        const dot = (wx, wy, col, r, edge) => {
          let dx = (wx - P.x) / WR * RR, dy = (wy - P.y) / WR * RR; const d = Math.hypot(dx, dy);
          if (d > RR - 3) { if (!edge) return; dx = dx / d * (RR - 3); dy = dy / d * (RR - 3); }
          ctx.fillStyle = col; ctx.beginPath(); ctx.arc(dx, dy, r, 0, 6.283); ctx.fill();
        };
        for (const t of G.towers) dot(t.x, t.y, '#5aa8ff', 2.2);
        for (const L of G.loot) dot(L.x, L.y, '#ffd23f', 2);
        for (const z of G.zombies) dot(z.x, z.y, z.boss ? '#c040ff' : '#ff4040', z.boss ? 4.5 : 2.2, z.boss);
        { const ot = objTarget(); if (ot) dot(ot.x, ot.y, '#50e6ff', 3.4, true); }
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, 6.283); ctx.fill();
        ctx.restore(); }
    }
    // ----- iluminação dinâmica: lanterna em cone + brilho em volta, bloqueada por paredes
    let lightCv = null, lctx = null, grain = null;
    function drawLighting(psx, psy, shx, shy) {
      const s = camera.s, dpr = camera.dpr;
      const LS = DF.flatSprites ? 0.25 : 0.4, lw = Math.ceil(canvas.width * LS), lh = Math.ceil(canvas.height * LS);
      if (!lightCv || lightCv.width !== lw || lightCv.height !== lh) { lightCv = document.createElement('canvas'); lightCv.width = lw; lightCv.height = lh; lctx = lightCv.getContext('2d'); }
      lctx.globalCompositeOperation = 'source-over'; lctx.setTransform(dpr * LS, 0, 0, dpr * LS, 0, 0);
      lctx.clearRect(0, 0, camera.vw, camera.vh);
      lctx.fillStyle = 'rgba(2,4,12,' + Math.max(0.6, lv.theme.dark + 0.18) + ')'; lctx.fillRect(0, 0, camera.vw, camera.vh);
      lctx.globalCompositeOperation = 'destination-out';
      const N = 120, BASE = 215, CONE = 560, half = 0.5;
      const pts = [];
      for (let i = 0; i < N; i++) {
        const a = (i / N) * 6.283;
        const da = Math.abs(Math.atan2(Math.sin(a - P.angle), Math.cos(a - P.angle)));
        const mr = BASE + (da < half ? (CONE - BASE) * Math.pow(Math.cos(da / half * 1.5708), 0.6) : 0);
        const ca = Math.cos(a), sa = Math.sin(a); let r = 10;
        const blk = (rr) => { const ti = tileAt(P.x + ca * rr, P.y + sa * rr); return ti < 0 || isBlockType(ti); };
        for (; r < mr; r += 12) { if (blk(r)) { let lo = Math.max(10, r - 12), hi = r; for (let k = 0; k < 5; k++) { const mid = (lo + hi) / 2; if (blk(mid)) hi = mid; else lo = mid; } r = hi; break; } }
        r = Math.min(r, mr); pts.push([(P.x + ca * r - camera.x + shx) * s, (P.y + sa * r - camera.y + shy) * s]);
      }
      const lg = lctx.createRadialGradient(psx, psy, 10 * s, psx, psy, CONE * s);
      lg.addColorStop(0, 'rgba(0,0,0,0.97)'); lg.addColorStop(0.35, 'rgba(0,0,0,0.8)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = lg; lctx.beginPath(); pts.forEach((p, i) => (i ? lctx.lineTo(p[0], p[1]) : lctx.moveTo(p[0], p[1]))); lctx.closePath(); lctx.fill();
      const glow = (wx, wy, r, a) => { const x = (wx - camera.x + shx) * s, y = (wy - camera.y + shy) * s; const g = lctx.createRadialGradient(x, y, 2, x, y, r * s); g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); lctx.fillStyle = g; lctx.beginPath(); lctx.arc(x, y, r * s, 0, 6.283); lctx.fill(); };
      if (P.flash > 0) glow(P.x + Math.cos(P.angle) * 40, P.y + Math.sin(P.angle) * 40, 150, 0.65);
      for (const f of G.fires) glow(f.x, f.y, f.r * 1.5, 0.7);
      for (const t of G.towers) glow(t.x, t.y, t.flash > 0 ? 130 : 70, t.flash > 0 ? 0.6 : 0.35);
      for (const b of G.boxes) glow(b.x, b.y, 80, 0.5);
      for (const L of G.loot) glow(L.x, L.y, 48, 0.45);
      for (const r of G.rockets) glow(r.x, r.y, 90, 0.7);
      if (G.holy) glow(G.holy.x, G.holy.y, G.holy.R * 1.4, 0.9 * G.holy.t);
      for (const g of G.grenFly) if (g.t >= 0 && g.type === 'fire') glow(g.x, g.y, 70, 0.6);
      for (const z of G.zombies) if (z.burnT > 0) glow(z.x, z.y, 70, 0.5);
      for (const zp of G.zaps) glow(zp.x1, zp.y1, 90, 0.7);
      if (!DF.flatSprites) { lctx.globalCompositeOperation = 'source-over'; const wg = lctx.createRadialGradient(psx, psy, 10 * s, psx, psy, CONE * s); wg.addColorStop(0, 'rgba(255,225,170,0.13)'); wg.addColorStop(1, 'rgba(255,225,170,0)'); lctx.fillStyle = wg; lctx.beginPath(); pts.forEach((p, k) => (k ? lctx.lineTo(p[0], p[1]) : lctx.moveTo(p[0], p[1]))); lctx.closePath(); lctx.fill(); }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low'; ctx.drawImage(lightCv, 0, 0, canvas.width, canvas.height); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function drawBar(x, y, w, h, pct, color, alpha) {
      ctx.globalAlpha = alpha; ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      ctx.fillStyle = '#3a1010'; ctx.fillRect(x, y, w, h); ctx.fillStyle = color; ctx.fillRect(x, y, w * clamp(pct, 0, 1), h); ctx.globalAlpha = 1;
    }
    function drawZombie(z) {
      const alpha = z.born > 0 ? 1 - z.born / 0.35 * 0.7 : 1;
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(z.x, z.y);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(2, 4, z.r * 1.05, z.r * 0.85, 0, 0, 6.283); ctx.fill();
      ctx.rotate(z.face);
      DF.sprites.zombie(ctx, z, G.time);
      ctx.restore();
      if (z.rootT > 0) { ctx.strokeStyle = '#b5bcc2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(z.x, z.y, z.r + 4, 0, 6.283); ctx.stroke(); }
    }
    const hurtSkin = Object.assign({}, skin, { body: '#ffffff' });
    function drawPlayer() {
      ctx.save(); ctx.translate(P.x, P.y);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(2, 4, P.r + 2, P.r * 0.9, 0, 0, 6.283); ctx.fill();
      ctx.rotate(P.angle);
      const blink = P.hurtT > 0 && Math.floor(G.time * 20) % 2;
      DF.sprites.player(ctx, blink ? hurtSkin : skin, curW().id, P.walk, { flash: P.flash > 0 });
      ctx.restore();
    }
    // desenho para pré-visualização de skin (usado pela loja)

    // ----- loop
    let raf = 0, last = 0, running = true;
    function frame(t) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
      if (!G.paused) update(dt);
      render();
      if (opts.onHud) opts.onHud(G);
    }
    resize();
    window.addEventListener('resize', resize);
    computeFlow();
    raf = requestAnimationFrame((t) => { last = t; frame(t); });

    const api = {
      G,
      stop() { running = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); },
      pause(v) { G.paused = v === undefined ? !G.paused : v; return G.paused; },
      step(dt) { update(dt); },
      render, resize
    };
    return api;
  }

  DF.Engine = { create };
  DF.drawSkinPreview = function (cv, skin, wid) {
    const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height);
    c.save(); c.translate(cv.width / 2 - 14, cv.height / 2); c.scale(2.3, 2.3);
    DF.sprites.player(c, skin, wid || 'rifle', 0);
    c.restore();
  };
})();

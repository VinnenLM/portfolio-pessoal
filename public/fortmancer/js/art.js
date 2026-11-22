'use strict';
/* ============================================================
   FORTMANCER — pixel art procedural
   Sprites em grades de texto, contorno automático, cenários e castelos gerados em código.
   ============================================================ */
const Art = (() => {
  const OUT = '#150f22';
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const rect = (x, col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  const hex = c => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`; };
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  /* ---------- sprites ---------- */
  const SPR = {};
  const PAL_COMMON = { s: '#f3c9a0', S: '#d49b73', e: '#1a1a2e', w: '#f2f2f2', t: '#8a5a2b', b: '#4a3020', k: '#1b1626' };

  const GRIDS = {
    mage: [
      '.....HH.....gg..',
      '....HhHH....gg..',
      '...HHhHHH...t...',
      '..HHHHHHHH..t...',
      '.yyyyyyyyyy.t...',
      '...ssssssS..t...',
      '...sssssesw.t...',
      '..HHHhHHHwwst...',
      '..HHhHHHHHHHt...',
      '..HHHHHhHHHdt...',
      '..HhHHHHHHHdt...',
      '..HHHHHHHHHdt...',
      '..dHHHHHHHHdt...',
      '..ddddddddddt...',
      '...bb....bb.t...',
      '..bbb....bbbt...',
    ],
    slime: [
      '................',
      '................',
      '................',
      '................',
      '......gggg......',
      '....ggGGGGgg....',
      '...gGGGgggggg...',
      '..ggGgggggggdd..',
      '..ggwpgggwpggdd.',
      '..ggwpgggwpggdd.',
      '.gggggggggggggdd',
      '.ggggggggggggggd',
      '.dggggggggggggdd',
      '..dddggggggdddd.',
      '...dddddddddd...',
      '................',
    ],
    bat: [
      '................',
      '................',
      '.......p..p.....',
      'pp....pp..pp..pp',
      'ppp..pppppppp.pp',
      'pPpp.ppeeppp.pPp',
      'pPppppppppppPppp',
      '.pPpp.ppppp.ppP.',
      '..pp..p.w.pp.pp.',
      '...p...p..p..p..',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    goblin: [
      '................',
      '.....gggggg.....',
      '.....gGgggg.....',
      '..gggegegggggg..',
      '...gggwgwgggg...',
      '......gggg......',
      '.TT...cccccc....',
      '.TTt.gcCccCcg...',
      '..tt.gccccccg...',
      '...t.gcCccCcg...',
      '...t..cccccc....',
      '......cCccCc....',
      '.....gg....gg...',
      '.....gg....gg...',
      '....bbb...bbb...',
      '................',
    ],
    skeleton: [
      '................',
      '.....wwwwww.....',
      '....wwwwwwww....',
      '....wkkwwkkw....',
      '....wkewwkew....',
      '....wwwwwwww....',
      '.....wkwkwk.....',
      '.....wwwwww.....',
      '.S...wWwwWw.....',
      '.s..wwWwwWww....',
      '.s...wWwwWw.....',
      'sss..wwwwww.....',
      '.t....WwwW......',
      '....wwW..Www....',
      '....w......w....',
      '...ww......ww...',
    ],
    witch: [
      '.......PP.......',
      '......PPPp......',
      '.....PPPPPp.....',
      '....PPPPPPPp....',
      '..yyyyyyyyyyyy..',
      '.oo..gggggGg....',
      'oooo.egggeggG...',
      '.oo..gggggGg....',
      '..t..PPPPPPPP...',
      '..t.PPpPPPPpPP..',
      '..t.PPPPPPPPPP..',
      '..t.PpPPPPPPpP..',
      '..t.PPPPPPPPPP..',
      '..t.DDDDDDDDDD..',
      '..t..bb....bb...',
      '..t.bbb...bbb...',
    ],
    ogre: [
      '................',
      '.....gggggg.....',
      '....gGggggGg....',
      '....ggeggegg....',
      '....gggggggg....',
      '...wgggmmgggw...',
      '....gggggggg....',
      '..gggcccccgggg..',
      '.gggGcccccGgggg.',
      '.gggGcCccCcGggg.',
      'ggg.GcccccG.ggg.',
      'gg..cccccccc..gg',
      '....ccCccCcc....',
      '....gg....gg....',
      '....gg....gg....',
      '...bbb....bbb...',
    ],
    troll: [
      '....mmmmmm......',
      '...mmMmmMmm.....',
      '...mggggggm.....',
      '....gegggeg.....',
      '....gggggggg....',
      '...ggwgggwgg....',
      '..gggggggggg....',
      '.gggGgggggGggg..',
      'gggGggmmmggGggg.',
      'ggg.GgmggmGg.ggg',
      'gg..GggggggG..gg',
      'gg...gggggg...gg',
      'g....ggddgg....g',
      '....ggg..ggg....',
      '....ggg..ggg....',
      '...dddd..dddd...',
    ],
    darkmage: [
      '.....kkkk.......',
      '....kKKKKk......',
      '...kKKKKKKk.....',
      '...kKkkkkKk.....',
      '...kkeekkekk....',
      '...kKkkkkKk.....',
      '....kKKKKk......',
      '..o.kKKKKKk.....',
      '.ooKkKKppKKk....',
      '.oo.kKKppKKk....',
      '..t.kKKppKKKk...',
      '..t.kKKKKKKKk...',
      '..t.kKKKKKKKk...',
      '..t.kkKKKKKkk...',
      '..t..kkkkkkk....',
      '..t.............',
    ],
    demon: [
      'hh....yyyy....hh',
      'hHh..yYyyYy..hHh',
      '.hHh.rrrrrr.hHh.',
      '..hhrrrrrrrrhh..',
      '...rrerrrrerr...',
      '...rrrrRRrrrr...',
      '...rrkwkkwkrr...',
      'W..rrrrrrrrrr..W',
      'WW.rrrrRRrrrr.WW',
      'WWWrrRrrrrRrrWWW',
      'WWWrrRrrrrRrrWWW',
      '.WW.rrrrrrrr.WW.',
      '..W.rrRrrRrr.W..',
      '....rrr..rrr....',
      '....rrr..rrr....',
      '...kkkk..kkkk...',
    ],
  };

  const PALS = {
    slime:    { g: '#5fd46a', G: '#a5f0a0', d: '#2e9c4c', w: '#ffffff', p: '#1a2a1e' },
    bat:      { p: '#7a4fb3', P: '#4d2f7d', e: '#ff4d6d', w: '#fff' },
    goblin:   { g: '#7bbf3a', G: '#a6e062', c: '#8a5a2b', C: '#5e3a1a', e: '#ffe14d', w: '#fff6d0', t: '#9a6a35', T: '#6b4420', b: '#4a3020' },
    skeleton: { w: '#e9e4d2', W: '#b9b29a', k: '#1b1626', e: '#ff4d4d', S: '#d8dde6', s: '#aab2c2', t: '#6b4420' },
    witch:    { P: '#7b3fb0', p: '#a56ae0', D: '#3f1f66', y: '#f4c542', g: '#8fd16a', G: '#6aa84a', e: '#1a1a2e', o: '#d56bff', t: '#6b4420', b: '#2a1a3a' },
    ogre:     { g: '#9a9a45', G: '#c4c468', c: '#7a4a2a', C: '#5a3318', e: '#1a1a2e', w: '#f6f1d4', m: '#5a2a1a', b: '#3a2a1a' },
    troll:    { g: '#5f8fa8', G: '#8cc0d8', d: '#3b6076', m: '#4fa84a', M: '#2f7a30', e: '#ffe14d', w: '#f6f1d4' },
    darkmage: { k: '#1d1630', K: '#33284f', p: '#9d4edd', e: '#ff3d6e', o: '#b86bff', t: '#4a3a5a' },
    demon:    { r: '#d8402e', R: '#9a2a24', h: '#4a2a2a', H: '#7a4a3a', y: '#ffd166', Y: '#d19a2a', e: '#ffe14d', k: '#2a0a0e', w: '#fff', W: '#7a1d24' },
  };

  function bake(rows, pal) {
    const h = rows.length, w = rows[0].length;
    const c = mk(w + 2, h + 2), x = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
      const ch = rows[y][i];
      if (!ch || ch === '.') continue;
      const col = pal[ch] || PAL_COMMON[ch];
      if (!col) continue;
      x.fillStyle = col; x.fillRect(i + 1, y + 1, 1, 1);
    }
    const id = x.getImageData(0, 0, w + 2, h + 2), d = id.data, W2 = w + 2, H2 = h + 2;
    const solid = (i, j) => i >= 0 && j >= 0 && i < W2 && j < H2 && d[(j * W2 + i) * 4 + 3] > 0;
    const o = hex(OUT);
    const add = [];
    for (let j = 0; j < H2; j++) for (let i = 0; i < W2; i++)
      if (!solid(i, j) && (solid(i - 1, j) || solid(i + 1, j) || solid(i, j - 1) || solid(i, j + 1))) add.push(i, j);
    for (let k = 0; k < add.length; k += 2) { const p = (add[k + 1] * W2 + add[k]) * 4; d[p] = o[0]; d[p + 1] = o[1]; d[p + 2] = o[2]; d[p + 3] = 255; }
    x.putImageData(id, 0, 0);
    let foot = H2;
    for (let j = H2 - 1; j >= 0; j--) { let any = false; for (let i = 0; i < W2; i++) if (d[(j * W2 + i) * 4 + 3] > 0) { any = true; break; } if (any) { foot = j + 1; break; } }
    return { n: c, f: tint(c, '#ffffff'), i: tint(c, 'rgba(120,215,255,.62)'), p: tint(c, 'rgba(120,255,120,.45)'), w: W2, h: H2, foot };
  }
  function tint(c, col) { const v = mk(c.width, c.height), x = v.getContext('2d'); x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = col; x.fillRect(0, 0, v.width, v.height); return v; }

  /* ---------- magos (skins) ---------- */
  const MAGE_PAL = {
    apprentice: { H: '#3b5bdb', h: '#5c7cfa', d: '#2b3f9e', y: '#f4c542', g: '#7ee0ff' },
    pyro:       { H: '#d9342b', h: '#ff6b4a', d: '#8f1d1d', y: '#ffd166', g: '#ff9f1c' },
    cryo:       { H: '#2aa7c9', h: '#7fe0f5', d: '#1b6f8c', y: '#e8f7ff', g: '#c8f4ff' },
    necro:      { H: '#5a3d8a', h: '#8a5fc9', d: '#35224f', y: '#7bd88f', g: '#7bff9c' },
    archmage:   { H: '#e8e8f4', h: '#ffffff', d: '#a9a9c4', y: '#f4c542', g: '#ffe066' },
  };
  const mageCache = {};
  function mage(id) { return mageCache[id] || (mageCache[id] = bake(GRIDS.mage, Object.assign({}, MAGE_PAL[id] || MAGE_PAL.apprentice))); }
  const magePalette = id => MAGE_PAL[id] || MAGE_PAL.apprentice;

  /* ---------- pets ---------- */
  const PETS = {
    fairy:  { rows: ['..ww..ww..', '.www..www.', '.wwwyywww.', '..wwyyww..', '...yssy...', '...yeey...', '....yy....', '...y..y...'], pal: { w: '#e8f6ff', y: '#ffe066', s: '#ffd9b3', e: '#222' }, shot: '#ffe066' },
    dragon: { rows: ['..w..rr...', '.www.rrr..', '.wwwrrrre.', '..wrrrrrr.', '...rryyrrr', '...rryyrr.', '..rrrrrr..', '..rR..Rr..'], pal: { w: '#c0392b', r: '#e04a3a', R: '#9a2a24', y: '#ffd166', e: '#fff' }, shot: '#ff7a1a' },
    owl:    { rows: ['.Oo....oO.', '.OooooooO.', 'OowwoowwoO', 'OoweBBewoO', '.OooooooO.', '..OooooO..', '...b..b...'], pal: { o: '#9aa4b8', O: '#6b7488', w: '#fff', e: '#1a1a2e', B: '#ffb347', b: '#ffb347' }, shot: '#9fe8ff' },
    slimey: { rows: ['..........', '...gggg...', '..gGggggg.', '.ggwpggwpg', '.gggggggdg', '.gggggggdd', '..dddddd..'], pal: { g: '#5fd46a', G: '#a5f0a0', d: '#2e9c4c', w: '#fff', p: '#1a2a1e' }, shot: '#7bff7b' },
  };
  const petCache = {};
  function pet(id) { if (!PETS[id]) return null; return petCache[id] || (petCache[id] = bake(PETS[id].rows, PETS[id].pal)); }

  /* ---------- castelos ---------- */
  const CASTLES = {
    stone:    { stone: '#a3a9bf', lt: '#c8cde0', dk: '#6b7189', roof: '#c0392b', glow: '#ffd86b', flag: '#e63946', door: '#8a5a2b' },
    crystal:  { stone: '#9ec9ee', lt: '#d8efff', dk: '#5d86b8', roof: '#4cc9f0', glow: '#9ff0ff', flag: '#4895ef', door: '#4f6f9a' },
    dark:     { stone: '#6b5b8e', lt: '#9482bd', dk: '#3d2f5c', roof: '#2a1a40', glow: '#c77dff', flag: '#9d4edd', door: '#3a2a52' },
    volcanic: { stone: '#5c4a4a', lt: '#8a7070', dk: '#352a2a', roof: '#e85d04', glow: '#ff9f1c', flag: '#ff4d00', door: '#5a2a1a' },
    gold:     { stone: '#e6c35c', lt: '#fff0a8', dk: '#a9822a', roof: '#c0392b', glow: '#fffbe0', flag: '#ffffff', door: '#8a5a2b' },
  };
  const castleCache = {};
  const CH = 160; // altura do canvas do castelo (chão em y=160)
  function bakeCastle(id) {
    const p = CASTLES[id] || CASTLES.stone;
    const c = mk(104, CH), x = c.getContext('2d');
    const bricks = (x0, y0, w, h) => {
      rect(x, p.stone, x0, y0, w, h);
      for (let yy = 0; yy < h; yy += 6) {
        const row = (yy / 6) | 0;
        rect(x, p.lt, x0, y0 + yy, w, 1);
        rect(x, p.dk, x0, y0 + yy + 5, w, 1);
        for (let xx = (row % 2) * 6; xx < w; xx += 12) rect(x, p.dk, x0 + xx, y0 + yy + 1, 1, 4);
      }
      rect(x, 'rgba(0,0,0,.16)', x0 + w - 4, y0, 4, h);
      rect(x, 'rgba(255,255,255,.10)', x0, y0, 3, h);
    };
    const outline = (x0, y0, w, h) => { x.strokeStyle = OUT; x.lineWidth = 1; x.strokeRect(x0 + .5, y0 + .5, w - 1, h - 1); };
    // muralha
    bricks(46, 92, 52, CH - 92); outline(46, 92, 52, CH - 92);
    for (let i = 0; i < 4; i++) { const mx = 46 + i * 14; bricks(mx, 82, 10, 10); outline(mx, 82, 10, 10); }
    // torre
    bricks(2, 28, 46, CH - 28); outline(2, 28, 46, CH - 28);
    for (let i = 0; i < 3; i++) { const mx = 2 + i * 18; bricks(mx, 18, 10, 10); outline(mx, 18, 10, 10); }
    rect(x, p.dk, 2, 28, 46, 3); // piso
    // janelas em arco
    const win = (wx, wy, ww, hh) => { rect(x, OUT, wx - 1, wy - 1, ww + 2, hh + 2); rect(x, p.glow, wx, wy + 2, ww, hh - 2); rect(x, p.glow, wx + 1, wy, ww - 2, 2); rect(x, 'rgba(0,0,0,.25)', wx + ww - 2, wy + 2, 2, hh - 2); rect(x, OUT, wx + (ww >> 1), wy + 2, 1, hh - 2); };
    win(18, 56, 10, 18); win(18, 96, 10, 18);
    win(58, 100, 6, 10); win(82, 100, 6, 10);
    // portão
    rect(x, OUT, 61, CH - 40, 24, 40);
    rect(x, p.door, 63, CH - 38, 20, 38);
    for (let i = 0; i < 4; i++) rect(x, 'rgba(0,0,0,.28)', 63 + i * 5, CH - 38, 1, 38);
    rect(x, '#2f2f3a', 63, CH - 30, 20, 2); rect(x, '#2f2f3a', 63, CH - 14, 20, 2);
    rect(x, OUT, 61, CH - 42, 24, 2); rect(x, OUT, 63, CH - 44, 20, 2);
    rect(x, '#d8d8e8', 80, CH - 20, 2, 2);
    // base do chão
    rect(x, 'rgba(0,0,0,.25)', 0, CH - 3, 104, 3);
    // faixa mágica (runas)
    for (let i = 0; i < 5; i++) rect(x, p.roof, 6 + i * 8, 72, 4, 2);
    for (let i = 0; i < 6; i++) rect(x, p.roof, 50 + i * 8, 100, 4, 2);
    return { c, p };
  }
  const castle = id => castleCache[id] || (castleCache[id] = bakeCastle(id));
  // rachaduras por nível de dano
  const CRACKS = [
    [[[56, 100], [58, 108], [55, 116], [58, 124]], [[88, 130], [86, 138], [89, 146]]],
    [[[14, 80], [17, 88], [14, 96], [17, 104]], [[36, 120], [34, 130], [37, 140]], [[70, 98], [72, 106]]],
    [[[8, 40], [11, 50], [8, 60]], [[40, 60], [38, 70], [41, 82], [38, 90]], [[50, 140], [53, 148], [50, 156]], [[88, 96], [90, 108]]],
  ];
  function drawCracks(ctx, ox, oy, tier) {
    ctx.fillStyle = 'rgba(21,15,34,.85)';
    for (let t = 0; t < tier; t++) for (const seg of CRACKS[t]) for (let i = 0; i < seg.length - 1; i++) {
      let [x0, y0] = seg[i]; const [x1, y1] = seg[i + 1]; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let k = 0; k <= n; k++) ctx.fillRect(ox + Math.round(lerp(x0, x1, k / n)), oy + Math.round(lerp(y0, y1, k / n)), 1, 1);
    }
  }

  /* ---------- cenários ---------- */
  function ridge(ctx, col, hi, base, amp, seed, fq) {
    const R = rng(seed), p1 = R() * 6, p2 = R() * 6, p3 = R() * 6;
    const ys = [];
    for (let i = 0; i < W; i++) {
      const y = Math.round(base + Math.sin(i * fq + p1) * amp + Math.sin(i * fq * 2.3 + p2) * amp * .5 + Math.sin(i * fq * 5.1 + p3) * amp * .2);
      ys.push(y); rect(ctx, col, i, y, 1, GY - y + 6); if (hi) rect(ctx, hi, i, y, 1, 1);
    }
    return ys;
  }
  function pine(ctx, px, py, h, c1, c2) {
    rect(ctx, '#2a1a12', px - 1, py - 4, 2, 4);
    for (let yy = py - h; yy < py - 3; yy++) {
      const t = (yy - (py - h)) / (h - 3);
      const half = Math.round(t * h * .27) + 1 + ((yy - (py - h)) % 5 === 0 ? 1 : 0);
      rect(ctx, c1, px - half, yy, half, 1); rect(ctx, c2, px, yy, half, 1);
    }
  }
  function roundTree(ctx, px, py, r, c1, c2) {
    rect(ctx, '#4a2e18', px - 1, py - r, 3, r);
    const cy = py - r - r * .6;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      rect(ctx, (dx + dy < -r * .3) ? c1 : c2, Math.round(px + dx), Math.round(cy + dy), 1, 1);
    }
  }
  function grave(ctx, px, py, c1, c2) {
    rect(ctx, c2, px, py - 9, 7, 9); rect(ctx, c1, px, py - 9, 3, 9);
    rect(ctx, 'rgba(0,0,0,0)', px, py - 9, 1, 1);
    ctx.clearRect(px, py - 9, 1, 1); ctx.clearRect(px + 6, py - 9, 1, 1);
    rect(ctx, OUT, px + 2, py - 6, 3, 1); rect(ctx, OUT, px + 3, py - 7, 1, 4);
  }
  function deadTree(ctx, px, py, h, col) {
    rect(ctx, col, px, py - h, 3, h);
    for (let i = 0; i < 4; i++) { const dir = i % 2 ? 1 : -1; const by = py - h + 4 + i * 6; for (let k = 0; k < 6 + i; k++) rect(ctx, col, px + 1 + dir * k, by - (k >> 1), 2, 2); }
  }
  function mountainPeak(ctx, cx, top, hw, c1, c2, snow) {
    for (let y = top; y < GY + 6; y++) {
      const t = (y - top) / (GY + 6 - top), half = Math.round(t * hw + (y % 7 === 0 ? 2 : 0));
      rect(ctx, c1, cx - half, y, half, 1); rect(ctx, c2, cx, y, half, 1);
      if (snow && t < .22) { rect(ctx, '#f4f8ff', cx - half, y, Math.round(half * .9), 1); rect(ctx, '#c8d6ee', cx, y, Math.round(half * .8), 1); }
    }
  }

  function bakeMap(m) {
    const back = mk(W, H), front = mk(W, H), b = back.getContext('2d'), f = front.getContext('2d');
    const R = rng(m.seed);
    // céu em faixas
    const n = m.sky.length;
    for (let y = 0; y < GY + 8; y++) {
      const t = clamp(y / GY, 0, 1) * (n - 1), i = Math.min(Math.floor(t), n - 2), fr = Math.round((t - i) * 9) / 9;
      rect(b, mix(m.sky[i], m.sky[i + 1], fr), 0, y, W, 1);
    }
    if (m.stars) for (let i = 0; i < 90; i++) { const sy = Math.floor(R() * 120); rect(b, `rgba(255,255,255,${.3 + R() * .7})`, Math.floor(R() * W), sy, 1, 1); if (R() < .15) rect(b, 'rgba(255,255,255,.5)', Math.floor(R() * W), sy, 2, 1); }
    // sol / lua com halo
    const o = m.orb;
    for (let r = o.r * 2.6; r > o.r; r -= 3) { b.fillStyle = o.g; b.beginPath(); b.arc(o.x, o.y, r, 0, TAU); b.fill(); }
    b.fillStyle = o.c; b.beginPath(); b.arc(o.x, o.y, o.r, 0, TAU); b.fill();
    if (m.id === 'grave') { b.fillStyle = 'rgba(120,110,170,.35)'; [[-5, -4, 4], [4, 3, 3], [-2, 6, 2]].forEach(k => { b.beginPath(); b.arc(o.x + k[0], o.y + k[1], k[2], 0, TAU); b.fill(); }); }
    // montanhas distantes
    ridge(b, m.far, mix(m.far, '#ffffff', .18), 118, 24, m.seed + 1, .011);
    if (m.id === 'volcano') { // glow no horizonte
      for (let i = 0; i < 40; i++) rect(b, `rgba(255,${90 + i * 2},30,${.012 + i * .0009})`, 0, GY - 70 + i, W, 1);
    }
    // camada média
    const mc = m.midc;
    if (m.mid === 'hills') {
      const ys = ridge(f, mc[0], mix(mc[0], '#c8f08a', .35), 146, 14, m.seed + 2, .017);
      for (let px = 6; px < W; px += irand(18, 30)) { const py = ys[px] + 8; if (R() < .9) roundTree(f, px, py, irand(7, 10), mc[1], mc[2]); }
      const ys2 = ridge(f, mc[1], mix(mc[1], '#b8e07a', .3), 170, 8, m.seed + 3, .023);
      for (let px = 14; px < W; px += irand(40, 70)) pine(f, px, ys2[px] + 5, irand(18, 26), mc[2], mix(mc[2], '#000000', .25));
    } else if (m.mid === 'pines') {
      ridge(f, mc[0], mix(mc[0], '#6aa88a', .25), 150, 12, m.seed + 2, .02);
      for (let px = 4; px < W; px += irand(10, 17)) pine(f, px, 158 + irand(0, 6), irand(30, 46), mc[1], mc[2]);
      for (let px = 10; px < W; px += irand(16, 26)) pine(f, px, 178 + irand(0, 6), irand(36, 56), mc[2], mix(mc[2], '#000', .3));
    } else if (m.mid === 'graves') {
      ridge(f, mc[0], mix(mc[0], '#8a82c0', .3), 160, 8, m.seed + 2, .02);
      for (let px = 20; px < W; px += irand(60, 110)) deadTree(f, px, 176, irand(26, 40), mc[2]);
      for (let px = 6; px < W; px += irand(16, 30)) grave(f, px, 184 + irand(0, 8), mix(mc[0], '#c8c4e8', .35), mc[1]);
      for (let k = 0; k < 4; k++) rect(f, 'rgba(150,130,220,.07)', 0, 168 + k * 6, W, 5);
    } else if (m.mid === 'crags') {
      for (let px = -10; px < W + 20; px += irand(60, 90)) mountainPeak(f, px + irand(0, 30), irand(70, 110), irand(46, 70), mc[0], mc[1], true);
      ridge(f, mc[1], mix(mc[1], '#e0b0a0', .25), 168, 8, m.seed + 4, .03);
      for (let px = 8; px < W; px += irand(30, 60)) { const rw = irand(10, 20); rect(f, mc[2], px, 184, rw, 12); rect(f, mix(mc[2], '#fff', .15), px, 184, rw, 2); }
    } else if (m.mid === 'volcano') {
      const vx = 300;
      for (let y = 68; y < GY + 6; y++) {
        const t = (y - 68) / (GY - 62), half = Math.round(10 + t * 120);
        rect(f, mc[0], vx - half, y, half, 1); rect(f, mc[1], vx, y, half, 1);
      }
      rect(f, '#ff8a1f', vx - 10, 66, 20, 3); rect(f, '#ffd24a', vx - 6, 66, 12, 1);
      for (let i = 0; i < 5; i++) { let lx = vx - 6 + i * 3; for (let y = 70; y < 170; y += 2) { lx += irand(-1, 1); rect(f, i % 2 ? '#ff6a1a' : '#ff9a2a', lx, y, 2, 2); } }
      mountainPeak(f, 90, 120, 70, mc[0], mc[1], false);
      mountainPeak(f, 440, 130, 60, mc[0], mc[1], false);
      ridge(f, mc[1], '#6a3a30', 176, 6, m.seed + 5, .03);
    }
    // chão
    const g = m.gnd;
    rect(f, g[0], 0, GY - 2, W, 5); rect(f, mix(g[0], '#ffffff', .22), 0, GY - 2, W, 1);
    rect(f, g[1], 0, GY + 3, W, 4);
    rect(f, g[2], 0, GY + 7, W, H - GY - 7);
    for (let i = 0; i < 260; i++) rect(f, R() < .5 ? g[3] : mix(g[2], '#fff', .12), Math.floor(R() * W), GY + 8 + Math.floor(R() * (H - GY - 8)), irand(1, 3), 1);
    for (let i = 0; i < 12; i++) rect(f, g[3], 0, GY + 9 + i * 5, W, 1);
    rect(f, 'rgba(0,0,0,.25)', 0, H - 12, W, 12);
    for (let px = 0; px < W; px += irand(5, 11)) { rect(f, g[0], px, GY - 5, 1, 4); rect(f, g[1], px + 1, GY - 4, 1, 3); }
    if (m.id === 'plain') for (let i = 0; i < 18; i++) { const px = Math.floor(R() * W); rect(f, pick(['#ff6b9d', '#ffe066', '#fff']), px, GY - 5, 2, 2); rect(f, '#2f6a2f', px, GY - 3, 1, 3); }
    if (m.id === 'volcano') for (let i = 0; i < 9; i++) { let lx = Math.floor(R() * W), ly = GY + 8; for (let k = 0; k < 6; k++) { lx += irand(-4, 4); ly += irand(3, 8); rect(f, '#ff6a1a', lx, ly, 3, 1); rect(f, '#ffd24a', lx + 1, ly, 1, 1); } }
    if (m.id === 'mount') for (let i = 0; i < 14; i++) rect(f, '#c8b89a', Math.floor(R() * W), GY + 10 + Math.floor(R() * 40), 3, 2);
    return { back, front };
  }
  const mapCache = {};
  const map = m => mapCache[m.id] || (mapCache[m.id] = bakeMap(m));

  /* ---------- init ---------- */
  function init() {
    for (const k of Object.keys(PALS)) {
      GRIDS[k].forEach((r, i) => { if (r.length !== 16) console.warn('sprite', k, 'linha', i, 'tem', r.length); });
      SPR[k] = bake(GRIDS[k], PALS[k]);
    }
  }
  // coroa dos chefes
  function crown(ctx, cx, y) {
    rect(ctx, OUT, cx - 6, y - 5, 13, 7);
    rect(ctx, '#ffd166', cx - 5, y - 3, 11, 4);
    for (const dx of [-5, -1, 3]) rect(ctx, '#ffd166', cx + dx, y - 5, 3, 3);
    rect(ctx, '#ff4d6d', cx - 1, y - 2, 3, 2); rect(ctx, '#fff3b0', cx - 5, y - 3, 11, 1);
  }

  return { init, SPR, mage, magePalette, pet, PETS, castle, CASTLES, CH, drawCracks, map, crown, rect, mix, rng, tint, MAGE_PAL, bake, GRIDS, PALS };
})();

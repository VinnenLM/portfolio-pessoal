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

  /* ---------- primitivas pixel (nada de arcos suaves) ---------- */
  const px = {
    disc(x, col, cx0, cy0, r) {
      x.fillStyle = col; cx0 = Math.round(cx0); cy0 = Math.round(cy0); const R = Math.max(0, r), R2 = R * R + R * .8, n = Math.floor(R);
      for (let dy = -n; dy <= n; dy++) { const w = Math.floor(Math.sqrt(Math.max(0, R2 - dy * dy))); x.fillRect(cx0 - w, cy0 + dy, w * 2 + 1, 1); }
    },
    ring(x, col, cx0, cy0, r, w) {
      w = w || 1; x.fillStyle = col; cx0 = Math.round(cx0); cy0 = Math.round(cy0);
      const ro = r + w / 2, ri = Math.max(0, r - w / 2), n = Math.ceil(ro);
      for (let dy = -n; dy <= n; dy++) {
        const wo = Math.round(Math.sqrt(Math.max(0, ro * ro - dy * dy)));
        if (wo <= 0 && Math.abs(dy) > ro) continue;
        const wi = Math.abs(dy) < ri ? Math.round(Math.sqrt(Math.max(0, ri * ri - dy * dy))) : -1;
        if (wi <= 0) x.fillRect(cx0 - wo, cy0 + dy, wo * 2 + 1, 1);
        else { x.fillRect(cx0 - wo, cy0 + dy, wo - wi + 1, 1); x.fillRect(cx0 + wi, cy0 + dy, wo - wi + 1, 1); }
      }
    },
    ell(x, col, cx0, cy0, rx, ry) {
      x.fillStyle = col; cx0 = Math.round(cx0); cy0 = Math.round(cy0); const n = Math.floor(ry);
      for (let dy = -n; dy <= n; dy++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + .01)))); x.fillRect(cx0 - w, cy0 + dy, w * 2 + 1, 1); }
    },
    ellRing(x, col, cx0, cy0, rx, ry, dash) {
      x.fillStyle = col; cx0 = Math.round(cx0); cy0 = Math.round(cy0);
      const steps = Math.max(24, Math.round((rx + ry) * 3));
      for (let i = 0; i < steps; i++) { if (dash && (i % dash)) continue; const a = i / steps * TAU; x.fillRect(Math.round(cx0 + Math.cos(a) * rx), Math.round(cy0 + Math.sin(a) * ry), 1, 1); }
    },
    line(x, col, x0, y0, x1, y1, w) {
      w = w || 1; x.fillStyle = col; x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy, n = 0;
      for (;;) {
        x.fillRect(x0 - (w >> 1), y0 - (w >> 1), w, w);
        if ((x0 === x1 && y0 === y1) || n++ > 600) break;
        const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; }
      }
    },
    // brilho em xadrez (pixel art, sem transparência suave)
    halo(x, col, cx0, cy0, r, phase) {
      x.fillStyle = col; cx0 = Math.round(cx0); cy0 = Math.round(cy0); const n = Math.floor(r), ph = phase | 0;
      for (let dy = -n; dy <= n; dy++) { const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy))); for (let dx = -w; dx <= w; dx++) if (((dx + dy + ph) & 1) === 0) x.fillRect(cx0 + dx, cy0 + dy, 1, 1); }
    },
    tri(x, col, cx0, by, hw, h) { // triângulo apontando pra cima, base em by
      x.fillStyle = col; for (let i = 0; i < h; i++) { const w = Math.round(hw * (1 - i / h)); x.fillRect(Math.round(cx0) - w, Math.round(by) - i - 1, w * 2 + 1, 1); }
    },
  };

  /* ---------- texto em pixel (fonte pixel + limiar de alfa = bordas nítidas) ---------- */
  const tcache = new Map();
  function pixText(s, col, size, outline) {
    const key = s + '|' + col + '|' + size + '|' + outline;
    let t = tcache.get(key); if (t) return t;
    const font = `400 ${size}px "Tiny5", monospace`;
    const m = mk(2, 2).getContext('2d'); m.font = font; const tw = Math.ceil(m.measureText(s).width), cw = tw + 6, ch = size + 8;
    const c = mk(cw, ch), g = c.getContext('2d'); g.font = font; g.textBaseline = 'alphabetic'; g.fillStyle = '#000'; g.fillText(s, 3, size + 2);
    const src = g.getImageData(0, 0, cw, ch).data, mask = new Uint8Array(cw * ch);
    for (let i = 0; i < cw * ch; i++) mask[i] = src[i * 4 + 3] > 100 ? 1 : 0;
    const out = g.createImageData(cw, ch), d = out.data, fc = hex(col.length === 4 ? '#' + col[1] + col[1] + col[2] + col[2] + col[3] + col[3] : col), oc = hex(outline || OUT);
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      const k = j * cw + i; let v = 0;
      if (mask[k]) v = 1; else { for (let dj = -1; dj <= 1 && !v; dj++) for (let di = -1; di <= 1; di++) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < cw && b < ch && mask[b * cw + a]) { v = 2; break; } } }
      if (v) { const cc = v === 1 ? fc : oc; d[k * 4] = cc[0]; d[k * 4 + 1] = cc[1]; d[k * 4 + 2] = cc[2]; d[k * 4 + 3] = 255; }
    }
    g.clearRect(0, 0, cw, ch); g.putImageData(out, 0, 0);
    t = { c, w: tw, ox: 3, by: size + 2 };
    if (tcache.size > 400) tcache.clear();
    tcache.set(key, t); return t;
  }
  function text(ctx, s, x, y, col, size, align, outline) {
    const t = pixText(String(s), col, size || 8, outline);
    let lx = x; if (align === 'center') lx = x - t.w / 2; else if (align === 'right') lx = x - t.w;
    ctx.drawImage(t.c, Math.round(lx) - t.ox, Math.round(y) - t.by);
  }

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

  /* ---------- ícones pixel (10x10, contorno automático) ---------- */
  const IPAL = { r: '#ff5a4a', R: '#a82a34', o: '#ff9a2a', O: '#c25a14', y: '#ffd84a', Y: '#c9901a', w: '#ffffff', W: '#c8cfe0', c: '#8fe8ff', C: '#3aa7d8', B: '#2a5fc0', g: '#6bdc7a', G: '#2e9c4c', d: '#17703a', p: '#c58bff', P: '#7a3bd0', m: '#ff8fb0', M: '#c03a78', n: '#b07a3a', N: '#6e4520', k: '#3a3150', s: '#c0c6d6', S: '#7a8298', t: '#f4c9a0' };
  const ICONS = {
    fire: ['....o.....', '...oo.o...', '...oro.o..', '..orrroo..', '.orryrro..', '.orryyrro.', '.orryyyro.', '.orryyyro.', '..orrrro..', '...oooo...'],
    frost: ['....cc....', '.c..cc..c.', '..c.cc.c..', '...cccc...', 'cccccwcccc', 'cccccwcccc', '...cccc...', '..c.cc.c..', '.c..cc..c.', '....cc....'],
    bolt: ['.....yyy..', '....yyy...', '...yyy....', '..yyyyyy..', '...yyyy...', '.....yy...', '....yy....', '...yy.....', '..yy......', '..y.......'],
    meteor: ['.......o..', '......oo.o', '.....ooo.o', '....oooo..', '...orroo..', '..orrrroo.', '.orryyrro.', '.orywyyro.', '..orrrro..', '...oooo...'],
    poison: ['...kkkk...', '....SS....', '....SS....', '...SggS...', '..SggwgS..', '.SgGgggGS.', '.SgggggGS.', '.SgGggGgS.', '..SgggGS..', '...SSSS...'],
    roots: ['...gg.gg..', '..gGggGgg.', '..gggggg..', '...gGgg...', '....nn....', '....nn....', '...nnNn...', '..nn.nNn..', '.nN...nn..', 'nN.....nN.'],
    light: ['....yy....', '.y..yy..y.', '..y.yy.y..', '...wwww...', 'yyywwwwyyy', 'yyywwwwyyy', '...wwww...', '..y.yy.y..', '.y..yy..y.', '....yy....'],
    heart: ['..........', '.rr....rr.', 'rwrr..rrrr', 'rwrrrrrrrr', 'rrrrrrrrrr', 'rrrrrrrrrR', '.rrrrrrrR.', '..rrrrrR..', '...rrrR...', '....rR....'],
    coin: ['...yyyy...', '..ywyyyY..', '.ywyyyyyY.', '.yyyYYyyY.', '.yyyYyyyY.', '.yyyYyyyY.', '.yyyYYyyY.', '.yyyyyyyY.', '..yyyyYY..', '...YYYY...'],
    gem: ['..........', '..cccccc..', '.cwcccccC.', 'cwcccccccC', 'CcccccccCC', '.CcccccCC.', '..CcccCC..', '...CcCC...', '....CC....', '..........'],
    gear: ['....SS....', '.S.SSSS.S.', '.SSSSSSSS.', '..SSkkSS..', 'SSSkkkkSSS', 'SSSkkkkSSS', '..SSkkSS..', '.SSSSSSSS.', '.S.SSSS.S.', '....SS....'],
    full: ['wwww..wwww', 'wW......Ww', 'ww......ww', 'w........w', '..........', '..........', 'w........w', 'ww......ww', 'wW......Ww', 'wwww..wwww'],
    play: ['..........', '.ww.......', '.wwww.....', '.wwwwww...', '.wwwwwwww.', '.wwwwwwww.', '.wwwwww...', '.wwww.....', '.ww.......', '..........'],
    pause: ['..........', '.www..www.', '.www..www.', '.www..www.', '.www..www.', '.www..www.', '.www..www.', '.www..www.', '.www..www.', '..........'],
    left: ['..........', '....w.....', '...ww.....', '..wwwwwww.', '.wwwwwwww.', '.wwwwwwww.', '..wwwwwww.', '...ww.....', '....w.....', '..........'],
    retry: ['...wwww...', '..wwwwww..', '.ww....ww.', '.w......w.', '.w....wwww', '.ww....ww.', '..ww....w.', '...wwwwww.', '....wwww..', '..........'],
    lock: ['...SSSS...', '..S....S..', '..S....S..', '.yyyyyyyy.', '.yyyYYyyy.', '.yyyYYyyy.', '.yyyyyyyy.', '.yyyyyyyy.', '.YYYYYYYY.', '..........'],
    unlock: ['...SSSS...', '..S....S..', '..S.......', '.yyyyyyyy.', '.yyyYYyyy.', '.yyyYYyyy.', '.yyyyyyyy.', '.yyyyyyyy.', '.YYYYYYYY.', '..........'],
    check: ['..........', '.......gg.', '......ggg.', '.....ggg..', '.gg.ggg...', '.gggggg...', '..gggg....', '...gg.....', '..........', '..........'],
    star: ['....yy....', '....yy....', '...yyyy...', 'yyyyyyyyyy', '.yyyyyyyy.', '..yyyyyy..', '..yyyyyy..', '.yyyy.yyy.', '.yyy...yy.', '.y.......y'],
    warn: ['....rr....', '...rrrr...', '...rwwr...', '..rrwwrr..', '..rrwwrr..', '.rrrrrrrr.', '.rrrwwrrr.', 'rrrrrrrrrr', 'rrrrrrrrrr', '..........'],
    sword: ['.......ww.', '......www.', '.....www..', '....www...', '.y.www....', '..yww.....', '..nyy.....', '.nn..y....', 'nn........', 'n.........'],
    castle: ['s.s.ss.s.s', 'sssssssss.', '.sSsssSss.', '.ssskssss.', '.sSsksSss.', '.ssskssss.', '.ssskssss.', '.sSsksSss.', '.ssSkSsss.', '.ssSkSsss.'],
    inf: ['..........', '.pp....pp.', 'pppp..pppp', 'pp..pp..pp', 'pp..pp..pp', 'pppp..pppp', '.pp....pp.', '..........', '..........', '..........'],
    skull: ['..wwwwww..', '.wwwwwwww.', 'wwwwwwwwww', 'wkkwwwwkkw', 'wkkwwwwkkw', 'wwwwkkwwww', '.wwwwwwww.', '..wkwkwk..', '..wwwwww..', '..........'],
    wand: ['......y...', '.....yyy..', '.y..yyyyy.', '..y..yyy..', '....y.y...', '...nn.....', '..nn......', '.nn.......', 'nn........', 'n.........'],
    chev: ['..........', 'yy..yy....', '.yy..yy...', '..yy..yy..', '...yy..yy.', '...yy..yy.', '..yy..yy..', '.yy..yy...', 'yy..yy....', '..........'],
    crit: ['....yy....', '.y..yy..y.', '..y.yy.y..', 'y..yyyy..y', 'yyyyywyyyy', 'yyyyywyyyy', 'y..yyyy..y', '..y.yy.y..', '.y..yy..y.', '....yy....'],
    spikes: ['..........', '..........', '..s..s..s.', '..s..s..s.', '.ws.ws.ws.', '.ss.ss.ss.', '.sS.sS.sS.', 'ssSssSssS.', 'SSSSSSSSS.', '..........'],
    rfrost: ['..........', '...cccc...', '..cCCCCc..', '.cC.cc.Cc.', '.cCcwwcCc.', '.cCcwwcCc.', '.cC.cc.Cc.', '..cCCCCc..', '...cccc...', '..........'],
    rfire: ['..........', '...oooo...', '..oOOOOo..', '.oO.rr.Oo.', '.oOrrrrOo.', '.oOryyrOo.', '.oO.rr.Oo.', '..oOOOOo..', '...oooo...', '..........'],
    bomb: ['.......yy.', '......y.y.', '.....nn...', '...kkkk...', '..kkkkkk..', '.kkwkkkkk.', '.kwkkkkkk.', '.kkkkkkkk.', '..kkkkkk..', '...kkkk...'],
    wall: ['ssssSssss.', 'SSSSSSSSS.', 'sssSssssS.', 'SSSSSSSSS.', 'ssSssssSs.', 'SSSSSSSSS.', 'sssSsssSs.', 'SSSSSSSSS.', 'ssSssssSs.', 'SSSSSSSSS.'],
    shield: ['..........', '.CCCCCCCC.', '.CcccccCC.', '.CcwcccCC.', '.CccccccC.', '.CcccccCC.', '..CcccCC..', '..CcccCC..', '...CccC...', '....CC....'],
    thorns: ['..p....p..', '..pp..pp..', '...pppp...', '.pppwwppp.', '..ppwwpp..', '.pppwwppp.', '...pppp...', '..pp..pp..', '..p....p..', '..........'],
    paw: ['..p....p..', '.ppp..ppp.', '.ppp..ppp.', '..p.pp.p..', '...pppp...', '..pppppp..', '.pppppppp.', '.pppppppp.', '..pp..pp..', '..........'],
    hat: ['....P.....', '...PP.....', '...PPP....', '..PPPP....', '..PPyP....', '.PPPPPP...', 'PPPPPPPPP.', 'PPPPPPPPP.', '..........', '..........'],
    clover: ['..gg..gg..', '.gGgggGgg.', '.gggggggg.', '..gggggg..', '.gggGgggg.', '.gGgggGgg.', '..gg..gg..', '....gg....', '....GG....', '...GG.....'],
    multi: ['..........', '.cc.cc.cc.', '.cc.cc.cc.', '..........', '.cc.cc.cc.', '.cc.cc.cc.', '..........', '.cc.cc.cc.', '.cc.cc.cc.', '..........'],
    pierce: ['..........', '..........', '......w...', '.....www..', 'sssssssswW', '.....www..', '......w...', '..........', '..........', '..........'],
    drop: ['....g.....', '....gg....', '...ggg....', '..ggggg...', '.ggwgggg..', '.gggggGg..', '.gggggGg..', '..ggggG...', '...GGG....', '..........'],
    plus: ['...rrrr...', '...rrrr...', '...rrrr...', 'rrrrrrrrrr', 'rrrrrrrrrr', '...rrrr...', '...rrrr...', '...rrrr...', '..........', '..........'],
    bow: ['..nn......', '...nn.....', '....nn..w.', '.....n..w.', '.....nn.w.', '.....nn.w.', '.....n..w.', '....nn..w.', '...nn.....', '..nn......'],
    cross: ['....ww....', '....ww....', '....ww....', 'wwwwwwwwww', 'wwwwwwwwww', '....ww....', '....ww....', '....ww....', '....ww....', '..........'],
    ballista: ['n........n', 'nn......nn', '.nn....nn.', '..nnnnnn..', 'wwwwwwwwwS', '..nNNNNn..', '..nN..Nn..', '.nN....Nn.', '.sN....Ns.', '..........'],
    snow: ['....cc....', '..c.cc.c..', '...cccc...', 'ccccwwcccc', 'ccccwwcccc', '...cccc...', '..c.cc.c..', '....cc....', '..........', '..........'],
    ally: ['..........', '...tt.....', '..tttt....', '...tt.....', '..gggg....', '.gggggg...', '.gggggg...', '..g..g....', '..n..n....', '..........'],
  };
  const iconCache = {}, iconURLs = {};
  function icon(name) {
    if (iconCache[name]) return iconCache[name];
    const g = ICONS[name] || ICONS.star;
    return (iconCache[name] = bake(g, IPAL));
  }
  function iconURL(name) { return iconURLs[name] || (iconURLs[name] = icon(name).n.toDataURL()); }

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

  /* ---------- aliados (suportes do castelo) ---------- */
  const ALLY_GRIDS = {
    archer: [
      '................',
      '.....GGGGG......',
      '....GgggggG.....',
      '....GgsssgG.n...',
      '....Ggsesg.n.w..',
      '.....Gsss.n..w..',
      '....GGggGGn..w..',
      '...GgggggGgn.w..',
      '...ggggggggn.w..',
      '...gGggggGg.n.w.',
      '..nggggggggn.w..',
      '..nnnnnnnnn.n...',
      '....gg..gg..n...',
      '....gg..gg......',
      '...nnn..nnn.....',
      '................',
    ],
    cleric: [
      '..y.............',
      '.yyy...wwwww....',
      '..y...wwwwwww...',
      '..t...wsssssw...',
      '..t...wsesesw...',
      '..t....sssss....',
      '..t...wwwwwww...',
      '..t..wwWwwwWww..',
      '..t..wwWyyyWww..',
      '..t..wwWwyWwww..',
      '..t..wwWwyWwww..',
      '..t..wwwWwWwww..',
      '..t..wyyyyyyyw..',
      '..t..wwwwwwwww..',
      '..t...bb...bb...',
      '..t..bbb...bbb..',
    ],
    ballista: [
      '................',
      '................',
      '................',
      '..n..........n..',
      '..nn........nn..',
      '...nn......nn...',
      '....nnnnnnnn....',
      '..wwwwwwwwwwwS..',
      '....nnNNNNnn....',
      '....nN.nn.Nn....',
      '...nN..nn..Nn...',
      '...nN..nn..Nn...',
      '..nnN..nn..NNn..',
      '..sN...nn...Ns..',
      '.sss..nnnn..sss.',
      '................',
    ],
    frostmage: [
      '....cc..........',
      '...cCCc.....cc..',
      '..cCCCCc...c..c.',
      '.BBBBBBBB..c..c.',
      '...ssssS....cc..',
      '...sesesS...t...',
      '..bbbbbbbb..t...',
      '..bBbbbbBbb.t...',
      '..bbbwbbbbb.t...',
      '..bbbbbbbbb.t...',
      '..bBbbbbbbB.t...',
      '..BBBBBBBBB.t...',
      '...bb...bb..t...',
      '...nn...nn..t...',
      '..nnn...nnn.t...',
      '................',
    ],
  };
  const ALLY_PAL = {
    archer: { G: '#2f7a3a', g: '#4fae56', s: '#f3c9a0', e: '#1a1a2e', n: '#8a5a2b', w: '#f2f2f2' },
    cleric: { w: '#f4f4ff', W: '#c8cfe8', s: '#f3c9a0', e: '#1a1a2e', y: '#ffd84a', t: '#c9901a', b: '#8a5a2b' },
    ballista: { n: '#b07a3a', N: '#6e4520', w: '#d8d8e8', S: '#9aa2b8', s: '#7a8298' },
    frostmage: { c: '#aaf0ff', C: '#5fc3e8', B: '#3a7fd0', b: '#6fb4f0', s: '#f3c9a0', S: '#d49b73', e: '#1a1a2e', t: '#9a6a35', w: '#fff', n: '#4a3020' },
  };
  const allyCache = {};
  function ally(id) { return allyCache[id] || (allyCache[id] = bake(ALLY_GRIDS[id], ALLY_PAL[id])); }

  /* ---------- castelos ---------- */
  const CASTLES = {
    stone:    { stone: '#a3a9bf', lt: '#c8cde0', dk: '#6b7189', roof: '#c0392b', glow: '#ffd86b', flag: '#e63946', door: '#8a5a2b', trim: '#e8c04a' },
    crystal:  { stone: '#9ec9ee', lt: '#d8efff', dk: '#5d86b8', roof: '#3fb8e8', glow: '#aaf4ff', flag: '#4895ef', door: '#4f6f9a', trim: '#e8f8ff' },
    dark:     { stone: '#6b5b8e', lt: '#9482bd', dk: '#3d2f5c', roof: '#4a2a70', glow: '#d28dff', flag: '#9d4edd', door: '#3a2a52', trim: '#c77dff' },
    volcanic: { stone: '#5c4a4a', lt: '#8a7070', dk: '#352a2a', roof: '#e85d04', glow: '#ffb02a', flag: '#ff4d00', door: '#5a2a1a', trim: '#ff9f1c' },
    gold:     { stone: '#e6c35c', lt: '#fff0a8', dk: '#a9822a', roof: '#c0392b', glow: '#fffbe0', flag: '#ffffff', door: '#8a5a2b', trim: '#fff6c0' },
  };
  const castleCache = {};
  const CH = 174, CW = 112, CTOP = 14;      // canvas: chão em y=160 (+CTOP), sobra no topo p/ telhados
  const TIER_AT = [3, 6, 10, 15];           // melhorias do castelo necessárias p/ cada nível visual
  const tierFor = n => TIER_AT.filter(t => n >= t).length;
  function bakeCastle(id, tier) {
    const p = Object.assign({}, CASTLES[id] || CASTLES.stone);
    p.lt2 = mix(p.stone, p.lt, .5); p.dk2 = mix(p.stone, p.dk, .45);
    const c = mk(CW, CH), x = c.getContext('2d'); x.translate(0, CTOP);
    const R = rng(7 + tier * 13 + id.length), gold = '#ffd84a', goldD = '#b8861a';
    const O = (a, b, w, h) => { rect(x, OUT, a, b, w, 1); rect(x, OUT, a, b + h - 1, w, 1); rect(x, OUT, a, b, 1, h); rect(x, OUT, a + w - 1, b, 1, h); };
    const stone = (x0, y0, w, h) => {
      rect(x, p.dk, x0, y0, w, h);
      for (let yy = 0, row = 0; yy < h; yy += 6, row++) {
        const bh = Math.min(6, h - yy); let bx = x0 - ((row * 7 + 3) % 11);
        while (bx < x0 + w) {
          const bw = 9 + Math.floor(R() * 5), a = Math.max(bx, x0), b = Math.min(bx + bw, x0 + w);
          if (b - a > 1) {
            const t = R(), col = t < .2 ? p.lt2 : t < .36 ? p.dk2 : p.stone;
            rect(x, col, a + 1, y0 + yy + 1, b - a - 1, bh - 1);
            rect(x, mix(col, '#ffffff', .3), a + 1, y0 + yy + 1, b - a - 1, 1);
            if (bh > 3) rect(x, mix(col, '#000000', .2), a + 1, y0 + yy + bh - 1, b - a - 1, 1);
            if (R() < .09) rect(x, mix(col, '#000000', .35), a + 2 + Math.floor(R() * Math.max(1, b - a - 4)), y0 + yy + 2, 1, 2);
          }
          bx += bw;
        }
      }
      rect(x, 'rgba(255,255,255,.08)', x0, y0, 2, h); rect(x, 'rgba(0,0,0,.22)', x0 + w - 4, y0, 4, h);
    };
    const arch = (col, x0, y0, w, h) => {
      const r = w / 2; x.fillStyle = col;
      for (let yy = 0; yy < h; yy++) {
        if (yy < r) { const dy = r - yy - .5, half = Math.ceil(Math.sqrt(Math.max(0, r * r - dy * dy))); x.fillRect(x0 + r - half, y0 + yy, half * 2, 1); }
        else x.fillRect(x0, y0 + yy, w, 1);
      }
    };
    const cone = (cxm, baseY, w, h, col) => {
      for (let i = 0; i < h; i++) { const half = Math.max(1, Math.round((i + 1) / h * w / 2)); rect(x, OUT, cxm - half - 1, baseY - h + i, half * 2 + 2, 1); }
      for (let i = 0; i < h; i++) {
        const half = Math.max(0, Math.round((i + 1) / h * w / 2)), yy = baseY - h + i;
        rect(x, mix(col, '#ffffff', .22), cxm - half, yy, half, 1); rect(x, col, cxm, yy, half + 1, 1); rect(x, mix(col, '#000000', .25), cxm + Math.ceil(half * .45), yy, Math.ceil(half * .55) + 1, 1);
        if (i % 4 === 3) rect(x, mix(col, '#000000', .38), cxm - half, yy, half * 2 + 1, 1);
      }
      rect(x, OUT, cxm - w / 2 - 3, baseY, w + 7, 3); rect(x, mix(col, '#000000', .3), cxm - w / 2 - 2, baseY, w + 5, 2); rect(x, tier >= 4 ? gold : p.lt, cxm - w / 2 - 2, baseY, w + 5, 1);
      rect(x, OUT, cxm - 1, baseY - h - 4, 3, 5); rect(x, tier >= 3 ? gold : p.lt, cxm, baseY - h - 3, 1, 3);
    };
    const merlons = (x0, y0, n, mw, step, h) => {
      for (let i = 0; i < n; i++) { const mx = x0 + i * step; stone(mx, y0, mw, h); O(mx, y0, mw, h); rect(x, tier >= 4 ? gold : p.lt, mx + 1, y0 + 1, mw - 2, 1); }
    };
    const win = (wx, wy, ww, hh) => {
      arch(OUT, wx - 1, wy - 1, ww + 2, hh + 2); arch(p.glow, wx, wy, ww, hh);
      rect(x, 'rgba(0,0,0,.2)', wx, wy + Math.round(hh * .6), ww, Math.round(hh * .4)); rect(x, 'rgba(255,255,255,.4)', wx + 1, wy + 2, 2, 2);
      rect(x, OUT, wx + (ww >> 1) - (ww % 2 ? 0 : 1), wy + 1, ww % 2 ? 1 : 2, hh - 1); rect(x, OUT, wx, wy + (hh >> 1), ww, 1);
      rect(x, OUT, wx - 2, wy + hh, ww + 4, 3); rect(x, p.lt, wx - 2, wy + hh, ww + 4, 1); rect(x, p.dk, wx - 1, wy + hh + 1, ww + 2, 1);
    };
    const slit = (sx, sy) => { rect(x, OUT, sx - 1, sy - 1, 4, 11); rect(x, '#0d0a16', sx, sy, 2, 9); rect(x, p.dk, sx - 1, sy - 2, 4, 1); rect(x, p.glow, sx, sy + 3, 1, 1); };
    const banner = (bx, by, w, h, col) => {
      rect(x, OUT, bx - 2, by - 3, w + 4, 3); rect(x, '#8a5a2b', bx - 1, by - 2, w + 2, 1);
      rect(x, OUT, bx - 1, by, w + 2, h + 1); rect(x, col, bx, by, w, h);
      rect(x, mix(col, '#000000', .25), bx + w - 2, by, 2, h); rect(x, gold, bx, by, w, 1); rect(x, gold, bx, by + h - 3, w, 1);
      for (let i = 0; i < w / 2; i++) rect(x, OUT, bx + i, by + h - i - 1 + 1, 1, 0);
      const mx = bx + (w >> 1), my = by + (h >> 1) - 1;
      rect(x, gold, mx, my - 3, 1, 7); rect(x, gold, mx - 2, my, 5, 1); rect(x, '#ffffff', mx, my, 1, 1);
      for (let i = 0; i < Math.floor(w / 2); i++) { x.clearRect(bx + i, by + h - 1 - i + (w >> 1) - 1, 1, 1); }
    };
    const shield = (sx, sy) => {
      rect(x, OUT, sx, sy, 9, 10); rect(x, p.flag, sx + 1, sy + 1, 7, 7); rect(x, gold, sx + 4, sy + 1, 1, 8); rect(x, gold, sx + 1, sy + 4, 7, 1);
      rect(x, OUT, sx + 2, sy + 8, 5, 1); rect(x, OUT, sx + 3, sy + 9, 3, 1); rect(x, mix(p.flag, '#fff', .35), sx + 1, sy + 1, 2, 2);
    };

    /* ----- torre principal ----- */
    stone(4, 30, 48, 130); O(4, 30, 48, 130);
    merlons(4, 20, 4, 9, 13, 11);
    rect(x, p.dk, 5, 30, 46, 3); rect(x, OUT, 4, 33, 48, 1);
    for (let i = 0; i < 8; i++) { rect(x, p.dk2, 6 + i * 6, 34, 4, 3); rect(x, OUT, 6 + i * 6, 37, 4, 1); }   // mata-cães
    for (let i = 0; i < 5; i++) rect(x, p.roof, 10 + i * 8, 84, 4, 2);                                              // runas
    win(22, 52, 10, 20); win(22, 100, 10, 20);
    slit(10, 88); slit(42, 88); slit(10, 128); slit(42, 128);
    // base reforçada
    rect(x, p.dk2, 2, 150, 52, 10); rect(x, p.lt2, 2, 150, 52, 1); O(2, 150, 52, 10);
    for (let i = 0; i < 9; i++) rect(x, p.dk, 4 + i * 6, 152, 1, 8);

    /* ----- muralha ----- */
    stone(52, 96, 56, 64); O(52, 96, 56, 64);
    merlons(54, 88, 4, 10, 14, 8);
    rect(x, p.dk, 53, 96, 54, 3); rect(x, OUT, 52, 99, 56, 1);
    rect(x, p.dk2, 50, 150, 58, 10); rect(x, p.lt2, 50, 150, 58, 1); O(50, 150, 58, 10);
    for (let i = 0; i < 9; i++) rect(x, p.dk, 52 + i * 6, 152, 1, 8);
    for (let i = 0; i < 40; i++) rect(x, mix(p.stone, '#3f7a3a', .45), 4 + Math.floor(R() * 100), 140 + Math.floor(R() * 14), 1 + Math.floor(R() * 2), 1); // musgo
    slit(92, 112);

    /* ----- portão ----- */
    const gx = 60, gw = 22, gh = 42, gt = 160 - gh, frame = tier >= 3 ? gold : p.lt;
    if (tier >= 1) {
      arch(OUT, gx - 5, gt - 5, gw + 10, gh + 5); arch(frame, gx - 4, gt - 4, gw + 8, gh + 4);
      for (let k = 0; k < 11; k++) { const a = Math.PI + k / 10 * Math.PI, rx = gx + gw / 2 + Math.cos(a) * (gw / 2 + 2), ry = gt + gw / 2 + Math.sin(a) * (gw / 2 + 2); rect(x, tier >= 3 ? goldD : p.dk, Math.round(rx), Math.round(ry), 1, 3); }
      rect(x, OUT, gx + gw / 2 - 3, gt - 7, 6, 6); rect(x, tier >= 3 ? gold : p.lt, gx + gw / 2 - 2, gt - 6, 4, 4); rect(x, '#ffffff', gx + gw / 2 - 2, gt - 6, 1, 1);
    }
    arch(OUT, gx - 1, gt - 1, gw + 2, gh + 1); arch('#120c1c', gx, gt, gw, gh);
    const doorTop = tier >= 2 ? gt + 13 : gt + 1;
    if (tier >= 2) { // grade levantada
      for (let yy = gt + 1; yy < doorTop; yy++) for (let xx = gx + 1; xx < gx + gw - 1; xx++) { const dx = xx - gx - gw / 2 + .5, dy = yy - gt - gw / 2; if (yy >= gt + gw / 2 || dx * dx + dy * dy < (gw / 2 - 1) * (gw / 2 - 1)) { if ((xx - gx) % 3 === 0 || (yy - gt) % 4 === 0) rect(x, '#7a7a96', xx, yy, 1, 1); } }
      for (let xx = gx + 2; xx < gx + gw - 2; xx += 3) rect(x, '#d8d8ea', xx, doorTop - 3, 1, 3);
    }
    arch(p.door, gx + 1, doorTop, gw - 2, gt + gh - doorTop);
    if (tier >= 2) { rect(x, p.door, gx + 1, doorTop, gw - 2, 3); }
    for (let i = 1; i < 5; i++) rect(x, mix(p.door, '#000000', .3), gx + 1 + i * 4, doorTop, 1, gt + gh - doorTop);
    for (let i = 0; i < 18; i += 2) rect(x, mix(p.door, '#ffffff', .12), gx + 2 + (i % 5) * 4, doorTop + 2 + i * 2, 1, 2);
    rect(x, OUT, gx + gw / 2 - 1, doorTop, 1, gt + gh - doorTop);
    const bandY = [gt + 17, gt + 33];
    for (const by of bandY) { rect(x, '#2a2a3a', gx + 1, by, gw - 2, 3); rect(x, '#5a5a78', gx + 1, by, gw - 2, 1); for (let xx = gx + 3; xx < gx + gw - 2; xx += 4) rect(x, '#b8b8d0', xx, by + 1, 1, 1); }
    rect(x, '#d8d8e8', gx + gw / 2 - 4, gt + 26, 2, 3); rect(x, '#d8d8e8', gx + gw / 2 + 2, gt + 26, 2, 3);
    rect(x, 'rgba(0,0,0,.28)', gx + gw - 5, doorTop, 4, gt + gh - doorTop);
    if (tier >= 1) { rect(x, p.dk, gx - 8, 150, 38, 2); }  // soleira
    rect(x, '#3b3140', gx, 158, gw, 2);

    /* ----- bandeiras e escudos ----- */
    if (tier >= 1) { banner(7, 40, 8, 26, p.flag); banner(41, 40, 8, 26, p.flag); }
    if (tier >= 1) { rect(x, '#3a2a1a', 58, 118, 2, 6); rect(x, '#3a2a1a', 84, 118, 2, 6); rect(x, OUT, 57, 117, 4, 1); rect(x, OUT, 83, 117, 4, 1); }
    if (tier >= 3) { shield(55, 102); shield(65, 102); shield(75, 102); banner(7, 96, 8, 22, p.roof); banner(41, 96, 8, 22, p.roof); }

    /* ----- torre do portão (nível 2+) ----- */
    if (tier >= 2) {
      stone(92, 64, 16, 96); O(92, 64, 16, 96);
      rect(x, 'rgba(255,255,255,.14)', 93, 64, 4, 96); rect(x, 'rgba(0,0,0,.3)', 102, 64, 5, 96);
      rect(x, OUT, 90, 60, 20, 5); rect(x, p.dk2, 91, 60, 18, 4); rect(x, p.lt, 91, 60, 18, 1); for (let i = 0; i < 5; i++) rect(x, OUT, 92 + i * 4, 64, 1, 1);
      win(97, 78, 5, 11); slit(99, 106); win(97, 126, 5, 11);
      for (let i = 0; i < 3; i++) rect(x, p.roof, 94 + i * 5, 96, 3, 2);
      cone(100, 60, 20, 22, p.roof);
    }
    /* ----- guarita da torre (nível 3+) ----- */
    if (tier >= 3) {
      for (let i = 0; i < 5; i++) { rect(x, OUT, 0 + i, 30 + i * 2, 12 - i * 2, 2); rect(x, p.dk2, 1 + i, 30 + i * 2, 10 - i * 2, 1); }
      stone(0, 8, 13, 24); O(0, 8, 13, 24); rect(x, 'rgba(255,255,255,.14)', 1, 8, 3, 24); rect(x, 'rgba(0,0,0,.3)', 8, 8, 4, 24);
      win(4, 14, 5, 10);
      rect(x, OUT, -1, 5, 15, 4); rect(x, p.dk2, 0, 5, 13, 3); rect(x, p.lt, 0, 5, 13, 1);
      cone(6, 5, 14, 16, p.roof);
    }
    /* ----- ouro e detalhes finais (nível 4) ----- */
    if (tier >= 4) {
      rect(x, OUT, 4, 38, 48, 4); rect(x, goldD, 5, 38, 46, 3); rect(x, gold, 5, 38, 46, 1);
      rect(x, OUT, 52, 100, 56, 4); rect(x, goldD, 53, 100, 54, 3); rect(x, gold, 53, 100, 54, 1);
      rect(x, gold, 92, 76, 16, 1);
      // pináculo dourado no canto da torre
      rect(x, OUT, 47, -2, 5, 24); rect(x, goldD, 48, -1, 3, 21); rect(x, gold, 48, -1, 1, 21);
      rect(x, OUT, 45, -6, 9, 6); rect(x, gold, 46, -5, 7, 4); rect(x, '#ffffff', 47, -5, 2, 1); rect(x, '#ff4d6d', 49, -4, 2, 2);
    }
    // sombra de contato no chão
    rect(x, 'rgba(0,0,0,.28)', 0, 157, CW, 3);
    return { c, p, tier, torches: tier >= 1 ? [[59, 116], [85, 116]] : [], pole: tier >= 4 ? [49, -6] : [47, 20] };
  }
  const castle = (id, tier) => { const k = id + ':' + (tier || 0); return castleCache[k] || (castleCache[k] = bakeCastle(id, tier || 0)); };
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
      for (let k = 0; k <= n; k++) ctx.fillRect(ox + Math.round(lerp(x0, x1, k / n)), oy + CTOP + Math.round(lerp(y0, y1, k / n)), 1, 1);
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
    for (let r = o.r * 2.4, k = 0; r > o.r; r -= 4, k++) px.halo(b, o.g, o.x, o.y, r, k);
    px.disc(b, o.c, o.x, o.y, o.r);
    px.disc(b, mix(o.c, '#ffffff', .5), o.x - o.r * .3, o.y - o.r * .3, o.r * .45);
    if (m.id === 'grave') { [[-5, -4, 4], [4, 3, 3], [-2, 6, 2]].forEach(k => px.disc(b, 'rgba(120,110,170,.45)', o.x + k[0], o.y + k[1], k[2])); }
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
    try { document.fonts.load('400 8px "Tiny5"').then(() => tcache.clear()); } catch (e) { }
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

  return { init, SPR, mage, magePalette, pet, PETS, castle, CASTLES, CH, CW, CTOP, tierFor, TIER_AT, drawCracks, map, crown, rect, mix, rng, tint, MAGE_PAL, bake, GRIDS, PALS, px, text, icon, iconURL, ICONS, ally };
})();

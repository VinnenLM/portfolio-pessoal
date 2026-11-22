/* Deadfront - modelos (vetoriais, vista de cima) de jogador, zumbis e torres.
   Todos são desenhados olhando para +x, com origem no centro do personagem. */
(function () {
  const DF = window.DF;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgb(' + clamp((n >> 16) + amt, 0, 255) + ',' + clamp(((n >> 8) & 255) + amt, 0, 255) + ',' + clamp((n & 255) + amt, 0, 255) + ')';
  }
  const OUT = 'rgba(0,0,0,0.65)';
  const _pc = {};
  function parseC(f) {
    if (typeof f !== 'string') return null; let r = _pc[f]; if (r !== undefined) return r;
    let m = /^#([0-9a-f]{6})$/i.exec(f);
    if (m) { const n = parseInt(m[1], 16); r = [n >> 16, (n >> 8) & 255, n & 255]; }
    else { m = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(f); r = m ? [+m[1], +m[2], +m[3]] : null; }
    return (_pc[f] = r);
  }
  const mixc = (a, d) => 'rgb(' + clamp(a[0] + d, 0, 255) + ',' + clamp(a[1] + d, 0, 255) + ',' + clamp(a[2] + d, 0, 255) + ')';
  function ell(c, x, y, rx, ry, fill, stroke, rot) {
    c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
    if (fill) {
      const pc = rx >= 3 && ry >= 3 && !DF.flatSprites ? parseC(fill) : null;
      if (pc) { const g = c.createRadialGradient(x - rx * 0.38, y - ry * 0.38, 0, x, y, Math.max(rx, ry) * 1.08); g.addColorStop(0, mixc(pc, 38)); g.addColorStop(0.6, fill); g.addColorStop(1, mixc(pc, -34)); c.fillStyle = g; }
      else c.fillStyle = fill;
      c.fill();
    }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.6; c.stroke(); }
  }
  function rect(c, x, y, w, h, fill, stroke, r) {
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, h, r || 0); else c.rect(x, y, w, h);
    if (fill) {
      const pc = w >= 3 && h >= 3 && !DF.flatSprites ? parseC(fill) : null;
      if (pc) { const g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, mixc(pc, 34)); g.addColorStop(0.45, fill); g.addColorStop(1, mixc(pc, -32)); c.fillStyle = g; }
      else c.fillStyle = fill;
      c.fill();
    }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.4; c.stroke(); }
  }
  function limb(c, x0, y0, x1, y1, w, color) {
    c.lineCap = 'round';
    c.strokeStyle = OUT; c.lineWidth = w + 2.4; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.strokeStyle = color; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.lineCap = 'butt';
  }

  // ---------------------------------------------------------------- armas na mão
  function gun(c, id) {
    switch (id) {
      case 'smg':
        rect(c, 8, -3.5, 7, 7, '#2b2e32', OUT, 1); rect(c, 14, -4, 17, 8, '#d6c27a', OUT, 1.5);
        rect(c, 31, -3, 8, 6, '#6d7479', OUT, 1); rect(c, 39, -1.4, 3, 2.8, '#9aa2a8'); rect(c, 18, -5, 10, 2, '#8b9298'); break;
      case 'shotgun':
        rect(c, 6, -4, 10, 8, '#8a5a32', OUT, 2); rect(c, 15, -4.5, 10, 9, '#3b3f44', OUT, 1);
        rect(c, 25, -2.5, 24, 5, '#8b9298', OUT, 1); rect(c, 30, -4.5, 12, 9, '#c98b5a', OUT, 2); break;
      case 'rifle':
        rect(c, 4, -3.5, 10, 7, '#3b3f44', OUT, 2); rect(c, 13, -4.5, 16, 9, '#8fb36b', OUT, 1.5);
        rect(c, 28, -3.5, 14, 7, '#4a5156', OUT, 1); rect(c, 42, -1.5, 6, 3, '#9aa2a8'); rect(c, 16, -6, 10, 2.5, '#4a5156'); break;
      case 'sniper':
        rect(c, 2, -4, 14, 8, '#8a5a32', OUT, 2); rect(c, 15, -4, 14, 8, '#4a5156', OUT, 1);
        rect(c, 28, -1.8, 28, 3.6, '#8b9298', OUT, 1); rect(c, 17, -7.5, 18, 4.5, '#1f2326', OUT, 2); rect(c, 33, -7, 2.5, 3.5, '#7fb4d6'); break;
      case 'revolver':
        rect(c, 10, -3, 12, 6, '#d0d4d8', OUT, 1.5); ell(c, 15, 0, 4.6, 4.4, '#9aa2a8', OUT); rect(c, 22, -1.8, 12, 3.6, '#8b9298', OUT, 1); break;
      case 'ak':
        rect(c, 2, -3.5, 11, 7, '#8a5a32', OUT, 2); rect(c, 12, -4, 16, 8, '#3b3f44', OUT, 1); rect(c, 27, -3.5, 15, 7, '#8a5a32', OUT, 1.5); rect(c, 42, -1.4, 7, 2.8, '#9aa2a8'); rect(c, 16, -5.6, 8, 2, '#4a5156'); break;
      case 'minigun':
        rect(c, 6, -6, 10, 12, '#4a5156', OUT, 2); rect(c, 16, -5, 30, 2.6, '#b0b8be', OUT, 1); rect(c, 16, -1.3, 30, 2.6, '#b0b8be', OUT, 1); rect(c, 16, 2.4, 30, 2.6, '#b0b8be', OUT, 1); rect(c, 34, -6, 3, 12, '#6d7479', OUT, 1); rect(c, 0, -5, 7, 10, '#7a8a55', OUT, 2); break;
      case 'flamer':
        ell(c, 6, 0, 7, 8.4, '#c0392b', OUT); ell(c, 5, -1, 3.4, 4.4, '#e2594a'); rect(c, 12, -3.2, 18, 6.4, '#2b2e32', OUT, 1.5); rect(c, 30, -4, 10, 8, '#6d7479', OUT, 1.5); ell(c, 41, 0, 1.6, 1.6, '#4cc2ff'); break;
      case 'rpg':
        rect(c, 0, -6, 7, 12, '#2b2e32', OUT, 2); rect(c, 6, -5, 42, 10, '#7a8a55', OUT, 3); ell(c, 49, 0, 4.6, 4.2, '#c0392b', OUT); rect(c, 22, -7, 10, 3.5, '#4a5156', OUT, 1); break;
      default: // pistola
        rect(c, 12, -3, 14, 6, '#c9ced2', OUT, 1.5); rect(c, 26, -1.8, 5, 3.6, '#8b9298'); rect(c, 13, -4, 3, 1.5, '#555');
    }
  }
  DF.sprites = { gun };

  // ---------------------------------------------------------------- jogador
  DF.sprites.player = function (c, skin, wid, walk, opt) {
    opt = opt || {};
    const sw = Math.sin(walk || 0);
    // botas
    const bt = skin.boots || '#1c1d1f', bw = skin.boots ? 8 : 6;
    ell(c, -1 + sw * 5, -6, bw, 4, bt, OUT); ell(c, -1 - sw * 5, 6, bw, 4, bt, OUT);
    // mochila
    rect(c, -17, -8.5, 10, 17, shade(skin.body, -50), OUT, 3); rect(c, -15, -5, 5, 10, shade(skin.body, -30));
    // tronco
    ell(c, 0, 0, 9.5, 14.5, skin.body, OUT);
    ell(c, 1.5, -1, 5.5, 9, shade(skin.body, 22));
    if (skin.dots) { ell(c, -3, -6, 2.4, 2.4, skin.dots); ell(c, 3, 3, 2.6, 2.6, skin.dots); ell(c, -4, 6, 2.2, 2.2, skin.dots); ell(c, 5, -5, 2, 2, skin.dots); }
    // ombros
    ell(c, 2, -12.5, 4.6, 4.2, shade(skin.body, -18), OUT); ell(c, 2, 12.5, 4.6, 4.2, shade(skin.body, -18), OUT);
    // braços até a arma
    limb(c, 3, -12, 17, -3.5, 5.2, skin.body); limb(c, 3, 12, 24, 3.2, 5.2, skin.body);
    gun(c, wid);
    ell(c, 18, -3.5, 3.4, 3.4, skin.head, OUT); ell(c, 25, 3.2, 3.4, 3.4, skin.head, OUT);
    // cabeça (vista de cima: quase só cabelo)
    ell(c, 1, 0, 8.2, 8.6, skin.hair || '#3a2a1c', OUT);
    ell(c, -0.5, -1.6, 4, 3.2, shade(skin.hair || '#3a2a1c', 26));
    const ac = skin.accColor || '#333';
    if (skin.acc === 'cap') {
      ell(c, 0.5, 0, 8.6, 9, ac, OUT); ell(c, 10, 0, 4.6, 6.6, shade(ac, -20), OUT); ell(c, -1, 0, 3, 4, shade(ac, 18));
    } else if (skin.acc === 'band') {
      rect(c, -1.5, -8.6, 4.4, 17.2, ac, OUT, 1);
      c.strokeStyle = ac; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-1, -6); c.quadraticCurveTo(-10, -9 + sw * 2, -15, -4 + sw * 3); c.moveTo(-1, 6); c.quadraticCurveTo(-10, 9 - sw * 2, -15, 5 - sw * 3); c.stroke();
    } else if (skin.acc === 'helmet') {
      ell(c, 0.5, 0, 9.6, 10, ac, OUT); ell(c, -1, -1, 5, 6, shade(ac, 22));
      rect(c, 5.5, -7, 3.6, 14, '#10151a', OUT, 1.5); rect(c, 6.2, -5, 1.4, 10, '#5fc3e8');
    } else if (skin.acc === 'visor') {
      rect(c, 3.5, -7.6, 6, 15.2, ac, OUT, 2); rect(c, 4.6, -5.6, 2, 11.2, '#ffe0fb');
      ell(c, -1, 0, 3, 8, shade(skin.hair || '#7a2a6a', 15));
    } else if (skin.acc === 'clown') {
      // gola colorida (vermelho, amarelo, azul, verde-água) + cabeça branca e nariz vermelho
      const cols = ['#e8341c', '#ffd23f', '#2f6fe0', '#18b6a4'];
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ell(c, -0.5 + Math.cos(a) * 8.6, Math.sin(a) * 9, 4.4, 4.4, cols[i % 4], OUT); }
      ell(c, 0.5, 0, 8.2, 8.6, '#ffffff', OUT); ell(c, -2, -2, 3, 3, 'rgba(0,0,0,0.06)');
      ell(c, 7.4, 0, 3.4, 3.4, ac, OUT); ell(c, 6.6, -0.9, 1, 1, 'rgba(255,255,255,0.8)');
    } else if (skin.acc === 'crown') {
      ell(c, 0, 0, 9.4, 9.8, ac, OUT);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ell(c, Math.cos(a) * 8.6, Math.sin(a) * 8.6, 2.2, 2.2, '#ffd25a', OUT); }
      ell(c, 0, 0, 3.6, 3.6, '#e53935', OUT);
    }
    if (opt.flash) { // clarão do tiro
      const mz = (DF.WEAPONS[wid] || {}).muzzle || 30;
      ell(c, mz + 3, 0, 8, 5, 'rgba(255,225,140,0.95)'); ell(c, mz + 1, 0, 4, 3, '#fff');
    }
  };

  // ---------------------------------------------------------------- zumbis
  const SHIRTS = ['#6b4a3a', '#3d5470', '#6f6a3a', '#5e3a62'];
  const SKINS_Z = { walker: '#86a578', runner: '#a9b36a', spitter: '#6fb6a0', brute: '#8f7566' };
  function clawHand(c, x, y, s, color) {
    ell(c, x, y, 3.3 * s, 3 * s, color, OUT);
    c.strokeStyle = '#d9d2c0'; c.lineWidth = 1.2; c.beginPath();
    for (let k = -1; k <= 1; k++) { c.moveTo(x + 2 * s, y + k * 1.7 * s); c.lineTo(x + 5.2 * s, y + k * 2.2 * s); }
    c.stroke();
  }
  function blood(c, x, y, r) { ell(c, x, y, r, r * 0.7, 'rgba(140,16,20,0.85)'); }
  const NEWBOSS = { swat: 1, ice: 1, fire: 1, electric: 1, necro: 1, twin: 1, shadow: 1 };
  function rrectS(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath(); }
  DF.sprites.zombie = function (c, z, time) {
    const t = z.type, boss = z.boss;
    if (t === 'worm') {
      const lunge = z.atkAnim > 0 ? Math.sin((1 - z.atkAnim / 0.4) * Math.PI) * 4 : 0;
      for (let i = 5; i >= 0; i--) {
        const sx = -i * 4 + lunge, sy = Math.sin((z.walk || 0) * 1.7 - i * 0.9) * 2.6, rr = 3.5 - i * 0.28;
        ell(c, sx, sy, rr, rr, i % 2 ? '#d99a9a' : '#e8b4b0', 'rgba(70,20,20,0.7)');
      }
      ell(c, 2.6 + lunge, 0, 3.4, 3.2, '#efc0b8', OUT); ell(c, 4.3 + lunge, -1.4, 0.9, 0.9, '#111'); ell(c, 4.3 + lunge, 1.4, 0.9, 0.9, '#111');
      if (z.flash > 0) ell(c, 0, 0, 8, 5, 'rgba(255,255,255,0.5)');
      return;
    }
    const swing = Math.sin(z.walk || 0);
    const v = z.v || 0;
    const base = (t === 'brute' || boss) ? 21 : t === 'runner' ? 12 : 14;
    const s = z.r / base;
    const A = z.atkAnim > 0 ? Math.sin((1 - z.atkAnim / 0.4) * Math.PI) : 0; // 0..1..0 durante o golpe
    const R = A * 9, X = 1 - 1.6 * A;
    c.save(); c.scale(s, s); c.translate(A * 3, 0);
    const skin = SKINS_Z[t] || '#8f7566';
    const shirt = t === 'runner' ? '#8a2e2e' : t === 'spitter' ? '#4b6b4f' : SHIRTS[v % SHIRTS.length];
    if (t === 'bomber') {
      const hot = z.hp < z.max * 0.5, pulse = 0.5 + 0.5 * Math.sin(time * (hot ? 16 : 6) + v);
      ell(c, -2 + swing * 5, -7, 6, 3.6, '#2a2420', OUT); ell(c, -2 - swing * 5, 7, 6, 3.6, '#2a2420', OUT);
      limb(c, 3, -12, 17 + swing * 3 + R, -6 * X, 4.4, skin); limb(c, 3, 12, 17 - swing * 3 + R, 6 * X, 4.4, skin);
      clawHand(c, 19 + swing * 3 + R, -6 * X, 1, skin); clawHand(c, 19 - swing * 3 + R, 6 * X, 1, skin);
      ell(c, -1, 0, 14, 15.5, '#8f4527', OUT);
      ell(c, 0, 0, 10, 11, 'rgba(255,' + (100 + pulse * 110 | 0) + ',30,' + (0.5 + 0.45 * pulse) + ')');
      c.strokeStyle = 'rgba(255,210,90,' + (0.5 + 0.5 * pulse) + ')'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-6, -6); c.lineTo(-1, -1); c.lineTo(-5, 4); c.moveTo(1, -2); c.lineTo(6, 2); c.lineTo(3, 8); c.stroke();
      rect(c, -5, -14, 3, 28, '#3a2a20'); for (let k = 0; k < 3; k++) rect(c, 4, -9 + k * 6.4, 8, 3.6, '#c1272d', OUT, 1);
      ell(c, 7, 0, 5.8, 6.2, skin, OUT); c.fillStyle = '#2b2118'; c.beginPath(); c.arc(5.8, 0, 6, Math.PI * 0.5, Math.PI * 1.5); c.fill();
      ell(c, 11, 0, 2, 2.8, '#3a0c0e'); ell(c, 9.4, -2.8, 1.3, 1.3, '#ffee66'); ell(c, 9.4, 2.8, 1.3, 1.3, '#ffee66');
    } else if (t === 'carrier') {
      ell(c, -2 + swing * 3, -8, 6, 3.6, '#2a2420', OUT); ell(c, -2 - swing * 3, 8, 6, 3.6, '#2a2420', OUT);
      ell(c, -1, 0, 15.5, 17.5, '#bfa98a', OUT);
      ell(c, 1, -2, 10, 12, '#d3bfa2');
      c.strokeStyle = 'rgba(190,90,100,0.85)'; c.lineWidth = 2.2; c.lineCap = 'round';
      for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(-9, k * 5); c.quadraticCurveTo(-1, k * 5 + Math.sin(time * 5 + k * 1.7) * 3.4, 8, k * 4.6 + Math.sin(time * 4 + k) * 2); c.stroke(); }
      c.lineCap = 'butt';
      for (const [bx, by, br] of [[-6, -9, 3.2], [3, 8, 3.8], [-3, 4, 2.6]]) { ell(c, bx, by, br, br, '#e0a9a9', 'rgba(110,40,50,0.8)'); ell(c, bx - 0.6, by - 0.6, br * 0.35, br * 0.35, 'rgba(255,255,255,0.6)'); }
      limb(c, 4, -13, 14 + swing * 2 + R, -6 * X, 4, skin); limb(c, 4, 13, 14 - swing * 2 + R, 6 * X, 4, skin);
      clawHand(c, 16 + swing * 2 + R, -6 * X, 0.9, skin); clawHand(c, 16 - swing * 2 + R, 6 * X, 0.9, skin);
      ell(c, 8, 0, 5.8, 6.2, skin, OUT); ell(c, 12.2, 0, 2.2, 3.2, '#3a0c0e'); ell(c, 10, -2.7, 1.2, 1.2, '#f0f0c8'); ell(c, 10, 2.7, 1.2, 1.2, '#f0f0c8');
    } else if (t === 'totem') {
      const p = 0.6 + 0.4 * Math.sin(time * 4);
      ell(c, 0, 0, 14, 14, '#2c302a', OUT); ell(c, 0, 0, 10, 10, '#4a5046');
      c.strokeStyle = 'rgba(120,255,160,' + p + ')'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 7, 0, TAU); c.moveTo(-5, -5); c.lineTo(5, 5); c.moveTo(5, -5); c.lineTo(-5, 5); c.stroke();
      ell(c, 0, 0, 3, 3, 'rgba(160,255,190,' + p + ')');
      if (z.flash > 0) ell(c, 0, 0, 14, 14, 'rgba(255,255,255,0.5)');
    } else if (t === 'spiderling' || boss === 'spider') {
      const big = boss ? 1.9 : 1, legC = boss ? '#17171b' : '#151515';
      c.strokeStyle = legC; c.lineWidth = 2 * big; c.lineCap = 'round';
      for (let k = 0; k < 4; k++) for (const sy of [-1, 1]) {
        const ph = Math.sin((z.walk || 0) * 2 + k * 1.3 + (sy > 0 ? 1.6 : 0)) * 3 * big, fx = (5 - k * 3.4) * big;
        c.beginPath(); c.moveTo(1 * big, sy * 3 * big); c.lineTo(fx + 4 * big, sy * (9 * big + ph)); c.lineTo(fx + 1 * big, sy * 15 * big); c.stroke();
      }
      c.lineCap = 'butt';
      ell(c, -5 * big, 0, 7.5 * big, 6.5 * big, boss ? '#26262d' : '#222', OUT);
      if (boss) { c.fillStyle = '#c0182a'; c.beginPath(); c.moveTo(-14 * big, 0); c.lineTo(-7 * big, -3 * big); c.lineTo(-4 * big, 0); c.lineTo(-7 * big, 3 * big); c.fill(); ell(c, -8 * big, 0, 2.2, 2.2, '#ff5a5a'); }
      ell(c, 4 * big, 0, 5 * big, 4.6 * big, boss ? '#32323a' : '#2c2c2c', OUT);
      for (const [ex, ey] of [[7, -2], [7, 2], [5.5, -3.4], [5.5, 3.4]]) ell(c, ex * big, ey * big, 0.9 * big, 0.9 * big, '#ff3030');
      if (boss) { c.strokeStyle = '#d8d0c0'; c.lineWidth = 2; c.beginPath(); c.moveTo(9 * big, -2); c.lineTo(13 * big, -3.5); c.moveTo(9 * big, 2); c.lineTo(13 * big, 3.5); c.stroke(); }
      if (z.enraged) ell(c, 0, 0, 22 * big, 22 * big, 'rgba(255,40,30,0.15)');
    } else if (NEWBOSS[boss] || t === 'clone') {
      const sw = swing, def = z.def;
      let body = def.color, skin2 = '#8fa08a', shoulder = null, hx = 26, leg = '#222';
      if (boss === 'swat') { body = '#2f3b52'; skin2 = '#2a3140'; leg = '#151a24'; }
      else if (boss === 'ice') { body = '#8fd0ee'; skin2 = '#cfeefa'; leg = '#4a7fa0'; }
      else if (boss === 'fire') { body = '#8a2f10'; skin2 = '#e0661c'; leg = '#4a1a0a'; }
      else if (boss === 'electric') { body = '#3a3d48'; skin2 = '#c8b840'; leg = '#202228'; }
      else if (boss === 'necro') { body = '#4a2a66'; skin2 = '#cfd6c0'; leg = '#2a1a3a'; hx = 20; }
      else if (boss === 'twin') { skin2 = '#cdb8a8'; leg = shade(body, -50); }
      else if (boss === 'shadow' || t === 'clone') { body = '#150d26'; skin2 = '#241638'; leg = '#0c0816'; }
      // aura / efeitos de fundo
      if (boss === 'ice') { ell(c, 0, 0, 30, 30, 'rgba(160,220,255,0.12)'); c.fillStyle = '#e6f8ff'; for (let k = 0; k < 6; k++) { const a = Math.PI * 0.6 + k * 0.5; c.beginPath(); c.moveTo(Math.cos(a) * 10, Math.sin(a) * 10 - 1); c.lineTo(Math.cos(a) * 26, Math.sin(a) * 26); c.lineTo(Math.cos(a) * 10, Math.sin(a) * 10 + 2); c.fill(); } }
      if (boss === 'fire') { for (let k = 0; k < 6; k++) { const fl = 10 + 6 * Math.sin(time * 9 + k * 2); c.fillStyle = k % 2 ? '#ffb02a' : '#ff5a1a'; c.beginPath(); c.moveTo(-8, -10 + k * 4); c.lineTo(-8 - fl - 8, -12 + k * 4.4); c.lineTo(-8, -6 + k * 4); c.fill(); } }
      if (boss === 'electric') { c.strokeStyle = 'rgba(255,240,100,0.85)'; c.lineWidth = 1.6; for (let k = 0; k < 4; k++) { const a = time * 7 + k * 1.6, r1 = 18, r2 = 28 + Math.sin(time * 15 + k) * 4; c.beginPath(); c.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); c.lineTo(Math.cos(a + 0.2) * (r1 + r2) / 2, Math.sin(a + 0.2) * (r1 + r2) / 2 + 3); c.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); c.stroke(); } }
      if (boss === 'shadow' || t === 'clone') { for (let k = 0; k < 4; k++) { const a = time * 2 + k * 1.57; ell(c, -14 + Math.cos(a) * 5 - k * 3, Math.sin(a) * 12, 5 - k, 4 - k * 0.6, 'rgba(70,40,120,0.28)'); } }
      if (boss === 'necro') { ell(c, 0, 0, 24, 24, 'rgba(120,255,160,0.07)'); }
      // pernas, tronco, ombros
      ell(c, -2 + sw * 6, -9, 8, 5, leg, OUT); ell(c, -2 - sw * 6, 9, 8, 5, leg, OUT);
      const bodyW = boss === 'necro' ? 16 : 13, bodyH = boss === 'necro' ? 20 : 18;
      ell(c, 0, 0, bodyW, bodyH, body, OUT); ell(c, 2, -2, bodyW * 0.55, bodyH * 0.6, shade(body, 18));
      if (boss === 'swat') { rect(c, -4, -11, 11, 22, '#1b2230', OUT, 3); rect(c, -1, -6, 5, 12, '#3a4a68'); for (const sy of [-1, 1]) rect(c, 6, sy * 8 - 1.5, 5, 3, '#c9a227'); }
      if (boss === 'fire') { c.strokeStyle = '#ffb02a'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-6, -8); c.lineTo(0, -2); c.lineTo(-4, 4); c.moveTo(2, -6); c.lineTo(6, 2); c.lineTo(2, 9); c.stroke(); }
      if (boss === 'electric') { c.fillStyle = '#ffe14a'; c.beginPath(); c.moveTo(1, -9); c.lineTo(-4, 1); c.lineTo(0, 1); c.lineTo(-2, 9); c.lineTo(5, -2); c.lineTo(1, -2); c.closePath(); c.fill(); }
      if (boss === 'necro') { c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.moveTo(-14, -8); c.quadraticCurveTo(-26, 0, -14, 8); c.fill(); }
      if (boss === 'twin') { rect(c, -2, -12, 4, 24, shade(body, 40), OUT, 1); }
      ell(c, 2, -16, 6.5, 5.5, shade(body, -22), OUT); ell(c, 2, 16, 6.5, 5.5, shade(body, -22), OUT);
      // braços e mãos
      const armX = boss === 'swat' ? 24 : hx;
      limb(c, 4, -14, armX + sw * 2 + R, -(boss === 'swat' ? 4 : 8) * X, 6.5, skin2); limb(c, 4, 14, armX - sw * 2 + R, (boss === 'swat' ? 4 : 8) * X, 6.5, skin2);
      if (boss === 'swat') { rect(c, 10, -2.6, 30, 5.2, '#14171d', OUT, 1.5); rect(c, 30, -3.6, 8, 2.4, '#14171d'); ell(c, armX + sw * 2, -4, 4, 4, '#222a38', OUT); ell(c, armX - sw * 2, 4, 4, 4, '#222a38', OUT); if (z.mode === 'act' && z.kind === 'burst') ell(c, 42, 0, 6, 4, 'rgba(255,225,140,0.95)'); }
      else if (boss === 'necro') { ell(c, armX + sw * 2, -8 * X, 4, 4, skin2, OUT); ell(c, armX - sw * 2, 8 * X, 4, 4, skin2, OUT); c.strokeStyle = '#5a3a2a'; c.lineWidth = 3; c.beginPath(); c.moveTo(26, 10); c.lineTo(26, -22); c.stroke(); ell(c, 26, -24, 5, 5, 'rgba(120,255,160,' + (0.6 + 0.4 * Math.sin(time * 5)) + ')', OUT); }
      else if (boss === 'fire') { clawHand(c, armX + sw * 2 + R, -8 * X, 1.5, '#ff7a22'); clawHand(c, armX - sw * 2 + R, 8 * X, 1.5, '#ff7a22'); ell(c, armX + 4, -8 * X, 5, 5, 'rgba(255,160,40,0.55)'); ell(c, armX + 4, 8 * X, 5, 5, 'rgba(255,160,40,0.55)'); }
      else { clawHand(c, armX + sw * 2 + R, -8 * X, 1.5, shade(skin2, -10)); clawHand(c, armX - sw * 2 + R, 8 * X, 1.5, shade(skin2, -10)); }
      // cabeça
      const headC = boss === 'swat' ? '#0f1319' : boss === 'necro' ? '#d8dccb' : boss === 'ice' ? '#d6f2ff' : boss === 'fire' ? '#d4561a' : boss === 'electric' ? '#e8d86a' : boss === 'shadow' || t === 'clone' ? '#1a1030' : shade(skin2, 6);
      ell(c, 4, 0, 8.8, 9.2, headC, OUT);
      if (boss === 'swat') { rect(c, 6, -7, 5, 14, '#4a90b8', OUT, 2); ell(c, 0, 0, 8.6, 9, '#222a38', OUT); rect(c, 6, -7, 5, 14, '#4a90b8', OUT, 2); }
      if (boss === 'necro') { c.fillStyle = '#3a1f52'; c.beginPath(); c.arc(2, 0, 11, Math.PI * 0.5, Math.PI * 1.5); c.fill(); ell(c, 9, -3, 2, 2.4, '#6fff9a'); ell(c, 9, 3, 2, 2.4, '#6fff9a'); rect(c, 11, -2, 2, 4, '#222'); }
      else if (boss === 'ice') { c.fillStyle = '#ffffff'; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(1, k * 3.4 - 1.4); c.lineTo(-7 - Math.abs(k) * 1.2, k * 4.4); c.lineTo(1, k * 3.4 + 1.4); c.fill(); } ell(c, 8, -3.6, 1.8, 1.8, '#2a6cff'); ell(c, 8, 3.6, 1.8, 1.8, '#2a6cff'); }
      else if (boss === 'fire') { for (let k = 0; k < 5; k++) { const fl = 8 + 4 * Math.sin(time * 10 + k); c.fillStyle = k % 2 ? '#ffd23f' : '#ff7a1a'; c.beginPath(); c.moveTo(0, (k - 2) * 3.2 - 2); c.lineTo(-fl - 2, (k - 2) * 4); c.lineTo(0, (k - 2) * 3.2 + 2); c.fill(); } ell(c, 8, -3.6, 1.8, 1.8, '#ffee66'); ell(c, 8, 3.6, 1.8, 1.8, '#ffee66'); ell(c, 11, 0, 2, 2.6, '#3a0c0e'); }
      else if (boss === 'electric') { c.strokeStyle = '#ffe14a'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -6); c.lineTo(-7, -9 + Math.sin(time * 20) * 3); c.moveTo(0, 6); c.lineTo(-7, 9 + Math.cos(time * 20) * 3); c.stroke(); ell(c, 8, -3.6, 1.9, 1.9, '#ffffff'); ell(c, 8, 3.6, 1.9, 1.9, '#ffffff'); ell(c, 11, 0, 2, 2.6, '#3a3000'); }
      else if (boss === 'twin') { c.fillStyle = def.color; c.beginPath(); c.arc(3, 0, 9.4, Math.PI * 0.5, Math.PI * 1.5); c.fill(); ell(c, 8, -3.8, 1.8, 1.8, '#fff'); ell(c, 8, 3.8, 1.8, 1.8, '#fff'); ell(c, 11, 0, 2, 2.8, '#3a0c0e'); ell(c, 8, -3.8, 0.8, 0.8, def.color); ell(c, 8, 3.8, 0.8, 0.8, def.color); }
      else if (boss === 'shadow' || t === 'clone') { ell(c, 8, -3.4, 2.2, 1.6, '#c07aff'); ell(c, 8, 3.4, 2.2, 1.6, '#c07aff'); ell(c, 8, -3.4, 4.2, 3.4, 'rgba(190,120,255,0.25)'); ell(c, 8, 3.4, 4.2, 3.4, 'rgba(190,120,255,0.25)'); }
      if (boss === 'swat' && z.shield) { c.fillStyle = 'rgba(120,190,230,0.45)'; c.strokeStyle = '#d8e8f2'; c.lineWidth = 2; rrectS(c, 20, -22, 9, 44, 4); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(22, -18, 2.5, 22); c.fillStyle = '#e8e8e8'; c.fillRect(22, 8, 5, 3); }
      if (z.ward) { c.strokeStyle = 'rgba(160,100,255,' + (0.4 + 0.3 * Math.sin(time * 6)) + ')'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, 25, 0, TAU); c.stroke(); }
      if (z.enraged) ell(c, 0, 0, 22, 24, 'rgba(255,40,30,0.18)');
    } else if (t === 'brute' || boss) {
      // pernas
      ell(c, -2 + swing * 6, -9, 8, 5, '#2a2320', OUT); ell(c, -2 - swing * 6, 9, 8, 5, '#2a2320', OUT);
      // tentáculos do chefe final
      if (boss === 'mega') {
        c.strokeStyle = '#7b3f8e'; c.lineWidth = 5; c.lineCap = 'round';
        for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(-8, k * 6); c.quadraticCurveTo(-24, k * 10 + Math.sin(time * 4 + k) * 6, -34, k * 14 + Math.sin(time * 3 + k) * 8); c.stroke(); }
        c.lineCap = 'butt';
      }
      // espinhos nas costas
      if (boss) { c.fillStyle = boss === 'summoner' ? '#aef0d4' : '#e9e2cc'; for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(-10, k * 6 - 2); c.lineTo(-24 - Math.abs(k) * -1, k * 7); c.lineTo(-10, k * 6 + 2); c.fill(); } }
      const bodyC = boss === 'mega' ? '#7b4a8a' : boss === 'charger' ? '#a04a4a' : boss === 'summoner' ? '#4a9a88' : shirt;
      ell(c, 0, 0, 14, 19, bodyC, OUT);
      ell(c, 2, -2, 8, 12, shade(bodyC, 20));
      if (boss === 'mega') { c.strokeStyle = 'rgba(240,225,200,0.8)'; c.lineWidth = 1.6; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(-2, k * 5); c.quadraticCurveTo(4, k * 5 - 3, 10, k * 5); c.stroke(); } }
      blood(c, 4, 6, 4); blood(c, -3, -8, 3);
      // ombreiras com espinhos
      ell(c, 2, -17, 7, 6, '#5d5a58', OUT); ell(c, 2, 17, 7, 6, '#5d5a58', OUT);
      c.fillStyle = '#cfcac0'; for (const sy of [-1, 1]) for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-1 + k * 4, sy * 21); c.lineTo(1 + k * 4, sy * 27); c.lineTo(3 + k * 4, sy * 21); c.fill(); }
      // braços e punhos enormes
      limb(c, 4, -16, 26 + swing * 2 + R * 1.3, -8 * X, 9, skin); limb(c, 4, 16, 26 - swing * 2 + R * 1.3, 8 * X, 9, skin);
      ell(c, 28 + swing * 2 + R * 1.3, -8 * X, 6.6 + A * 1.5, 6.2 + A * 1.5, shade(skin, -10), OUT); ell(c, 28 - swing * 2 + R * 1.3, 8 * X, 6.6 + A * 1.5, 6.2 + A * 1.5, shade(skin, -10), OUT);
      // cabeça
      ell(c, 4, 0, 9, 9.4, shade(skin, 10), OUT);
      c.fillStyle = '#2b2118'; c.beginPath(); c.arc(2.4, 0, 9.2, Math.PI * 0.5, Math.PI * 1.5); c.fill();
      ell(c, 11, 0, 3.4, 4.6, '#3a0c0e'); c.fillStyle = '#e8e0cc'; for (let k = -1; k <= 1; k++) c.fillRect(11.5, k * 2.2 - 0.6, 2, 1.3);
      const eyeC = boss === 'summoner' ? '#aaffd8' : '#ff3030';
      ell(c, 8, -4.2, 1.9, 1.9, eyeC); ell(c, 8, 4.2, 1.9, 1.9, eyeC);
      if (boss === 'summoner') { ell(c, 5.5, -7.2, 1.3, 1.3, eyeC); ell(c, 5.5, 7.2, 1.3, 1.3, eyeC); ell(c, 10.5, 0, 1.3, 1.3, '#aaffd8'); }
      if (boss === 'charger') { c.strokeStyle = '#efe8d5'; c.lineWidth = 3.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(4, -8); c.quadraticCurveTo(14, -18, 22, -12); c.moveTo(4, 8); c.quadraticCurveTo(14, 18, 22, 12); c.stroke(); c.lineCap = 'butt'; }
      if (boss === 'smasher') { c.fillStyle = '#efe8d5'; for (const sy of [-1, 1]) { c.beginPath(); c.moveTo(1, sy * 8); c.lineTo(8, sy * 15); c.lineTo(8, sy * 8); c.fill(); } }
      if (boss === 'summoner') { c.fillStyle = '#9ff0cf'; for (let k = 0; k < 7; k++) { const a = Math.PI * 0.55 + k * 0.55; c.beginPath(); c.moveTo(Math.cos(a) * 8 - 1, Math.sin(a) * 8); c.lineTo(Math.cos(a) * 15 - 1, Math.sin(a) * 15); c.lineTo(Math.cos(a + 0.18) * 8 - 1, Math.sin(a + 0.18) * 8); c.fill(); } }
      if (boss === 'mega') { ell(c, 6, 0, 2, 2, '#fff'); }
      if (z.enraged) ell(c, 0, 0, 22, 24, 'rgba(255,40,30,0.18)');
    } else if (t === 'spitter') {
      ell(c, -2 + swing * 4, -6, 6, 3.6, '#2a2c26', OUT); ell(c, -2 - swing * 4, 6, 6, 3.6, '#2a2c26', OUT);
      ell(c, -1, 0, 12.5, 15, shirt, OUT);
      const pulse = 0.75 + 0.25 * Math.sin(time * 6 + v);
      for (const [px, py, pr] of [[-4, -5, 4.5], [-2, 5, 5.2], [2, 0, 3.4]]) { ell(c, px, py, pr, pr, 'rgba(120,255,170,' + pulse + ')', 'rgba(20,80,50,0.8)'); ell(c, px - 1, py - 1, pr * 0.35, pr * 0.35, 'rgba(255,255,255,0.7)'); }
      limb(c, 3, -11, 15 + swing * 2 + R, -6 * X, 4.6, skin); limb(c, 3, 11, 15 - swing * 2 + R, 6 * X, 4.6, skin);
      clawHand(c, 17 + swing * 2 + R, -6 * X, 1, skin); clawHand(c, 17 - swing * 2 + R, 6 * X, 1, skin);
      ell(c, 4, 0, 7.4, 7.8, skin, OUT); c.fillStyle = '#26352a'; c.beginPath(); c.arc(2.6, 0, 7.6, Math.PI * 0.5, Math.PI * 1.5); c.fill();
      ell(c, 9.5, 0, 3.2, 4.4, '#0a3a22'); ell(c, 10, 0, 1.8, 2.6, '#7dffb0');
      ell(c, 6.5, -4, 1.5, 1.5, '#d8ffe8'); ell(c, 6.5, 4, 1.5, 1.5, '#d8ffe8');
    } else if (t === 'runner') {
      ell(c, -2 + swing * 6, -5, 5.6, 3.2, '#2a2420', OUT); ell(c, -2 - swing * 6, 5, 5.6, 3.2, '#2a2420', OUT);
      ell(c, 0, 0, 7.6, 11, shirt, OUT); ell(c, -2, 0, 5, 8, shade(shirt, -22));
      blood(c, 2, 3, 2.6);
      limb(c, 3, -9, 19 + swing * 3 + R, -4 * X, 3.6, skin); limb(c, 3, 9, 19 - swing * 3 + R, 4 * X, 3.6, skin);
      clawHand(c, 21 + swing * 3 + R, -4 * X, 0.9, skin); clawHand(c, 21 - swing * 3 + R, 4 * X, 0.9, skin);
      ell(c, 5, 0, 6.4, 6.8, skin, OUT); c.fillStyle = '#35301f'; c.beginPath(); c.arc(3.6, 0, 6.6, Math.PI * 0.5, Math.PI * 1.5); c.fill();
      ell(c, 9.6, 0, 2.6, 3.6, '#3a0c0e'); ell(c, 7.4, -3.2, 1.4, 1.4, '#ffee66'); ell(c, 7.4, 3.2, 1.4, 1.4, '#ffee66');
    } else { // walker
      ell(c, -2 + swing * 5, -6, 6, 3.6, '#2a2420', OUT); ell(c, -2 - swing * 5, 6, 6, 3.6, '#2a2420', OUT);
      ell(c, 0, 0, 9, 13, shirt, OUT); ell(c, -1, 0, 6, 9, shade(shirt, -20));
      // rasgos na roupa mostrando a carne
      ell(c, 3, -4 + v, 3.2, 2.4, skin); blood(c, 1, 4, 3); blood(c, -3, -6, 2);
      limb(c, 3, -11, 17 + swing * 3 + R, -5.5 * X, 4.2, skin); limb(c, 3, 11, 17 - swing * 3 + R, 5.5 * X, 4.2, skin);
      c.strokeStyle = shirt; c.lineWidth = 5.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(3, -11); c.lineTo(8, -8.5); c.moveTo(3, 11); c.lineTo(8, 8.5); c.stroke(); c.lineCap = 'butt';
      clawHand(c, 19 + swing * 3 + R, -5.5 * X, 1, skin); clawHand(c, 19 - swing * 3 + R, 5.5 * X, 1, skin);
      ell(c, 4, 0, 7.4, 7.8, skin, OUT);
      c.fillStyle = ['#2b2118', '#4a4a4a', '#5a4020', '#1c1c1c'][v % 4]; c.beginPath(); c.arc(2.6, 0, 7.6, Math.PI * 0.45, Math.PI * 1.55); c.fill();
      ell(c, 9, 0, 2.8, 3.8, '#3a0c0e'); ell(c, 11.4, 1.6, 1.1, 1.5, 'rgba(160,20,24,0.9)');
      ell(c, 6.6, -3.6, 1.6, 1.6, '#f0f0c8'); ell(c, 6.6, 3.6, 1.6, 1.6, '#f0f0c8'); ell(c, 7, -3.6, 0.8, 0.8, '#c01818'); ell(c, 7, 3.6, 0.8, 0.8, '#c01818');
    }
    if (z.flash > 0) { ell(c, 0, 0, base * 0.8, base * 1.05, 'rgba(255,255,255,0.55)'); ell(c, 4, 0, base * 0.55, base * 0.55, 'rgba(255,255,255,0.55)'); }
    c.restore();
    if (z.burnT > 0) {
      const f = 0.5 + 0.5 * Math.sin(time * 30);
      ell(c, 0, 0, z.r * 1.1, z.r * 1.1, 'rgba(255,' + (120 + f * 80 | 0) + ',20,0.38)');
      ell(c, -3, 0, z.r * 0.6, z.r * 0.6, 'rgba(255,220,80,0.35)');
    }
  };

  // ---------------------------------------------------------------- torres
  DF.sprites.tower = function (c, t, time) {
    // base: sacos de areia em volta
    ell(c, 0, 2, 20, 18, 'rgba(0,0,0,0.3)');
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ell(c, Math.cos(a) * 15, Math.sin(a) * 15, 6, 4.4, '#a88f5a', 'rgba(70,55,25,0.9)', a + Math.PI / 2); }
    ell(c, 0, 0, 13, 13, '#4b5157', OUT); ell(c, 0, 0, 10, 10, '#6d7479');
    c.save(); c.rotate(t.angle);
    const rec = t.recoil || 0;
    if (t.type === 'mg') {
      rect(c, -8, -7, 14, 14, '#c9a15a', OUT, 3);
      rect(c, 4 - rec, -5.5, 20, 3.4, '#2b2e32', OUT, 1); rect(c, 4 - rec, 2.1, 20, 3.4, '#2b2e32', OUT, 1);
      rect(c, 14 - rec, -6, 5, 12, '#6d7479', OUT, 1);
      rect(c, -12, -4, 5, 8, '#8a6a30', OUT, 1);
      if (t.flash > 0) { ell(c, 24, -3.8, 5, 3, 'rgba(255,225,140,0.95)'); ell(c, 24, 3.8, 5, 3, 'rgba(255,225,140,0.95)'); }
    } else if (t.type === 'flame') {
      ell(c, -5, 0, 8, 9, '#c0392b', OUT); ell(c, -6, -1, 4, 5, '#e2594a');
      rect(c, 2, -3, 16, 6, '#2b2e32', OUT, 2); rect(c, 15, -4.5, 5, 9, '#6d7479', OUT, 1);
      if (t.flash > 0 || t.firing) { const f = 0.6 + 0.4 * Math.sin(time * 40); ell(c, 24, 0, 6 + f * 3, 4, 'rgba(255,170,30,0.95)'); ell(c, 24, 0, 3, 2.4, '#fff3a0'); }
      else ell(c, 21, 0, 1.6, 1.6, '#4cc2ff');
    } else if (t.type === 'tesla') {
      ell(c, 0, 0, 12, 12, '#2f3f57', OUT);
      for (let k = 0; k < 3; k++) ell(c, 0, 0, 10 - k * 2.6, 10 - k * 2.6, null, '#7fb8ff');
      const pu = 0.6 + 0.4 * Math.sin(time * 9); ell(c, 0, 0, 5.4, 5.4, 'rgba(120,190,255,' + pu + ')'); ell(c, 0, 0, 2.6, 2.6, '#ffffff');
      if (t.flash > 0) ell(c, 0, 0, 17, 17, 'rgba(160,215,255,0.45)');
    } else if (t.type === 'railgun') {
      ell(c, -5, 0, 8, 8, '#3a4248', OUT);
      rect(c, -8, -4, 40 - rec, 8, '#9aa2a8', OUT, 2); rect(c, 18 - rec, -5.5, 14, 11, '#4a5156', OUT, 2); rect(c, 4, -2, 20, 1.8, '#4d9fff'); rect(c, 4, 0.4, 20, 1.8, '#4d9fff');
      rect(c, -12, -6, 6, 12, '#2b2e32', OUT, 2);
      if (t.flash > 0) { ell(c, 36, 0, 10, 3.4, 'rgba(160,215,255,0.95)'); ell(c, 34, 0, 5, 2, '#fff'); }
    } else {
      ell(c, -6, 0, 8, 8, '#5a6247', OUT);
      rect(c, -10, -5.5, 36 - rec, 11, '#7a8a55', OUT, 4); rect(c, 22 - rec, -7, 6, 14, '#2b2e32', OUT, 2); rect(c, -14, -7, 5, 14, '#2b2e32', OUT, 2);
      rect(c, 0, -3, 14, 2, 'rgba(255,255,255,0.18)');
      if (t.flash > 0) { ell(c, 32, 0, 8, 5, 'rgba(255,200,100,0.95)'); ell(c, -17, 0, 6, 4, 'rgba(255,230,160,0.7)'); }
    }
    c.restore();
  };
  DF.sprites.rocket = function (c, r) {
    c.save(); c.rotate(Math.atan2(r.vy, r.vx));
    ell(c, -8, 0, 7, 2.6, 'rgba(255,170,60,0.85)'); ell(c, -11, 0, 4, 1.6, 'rgba(255,240,170,0.9)');
    rect(c, -5, -2.6, 12, 5.2, '#8d9a6a', OUT, 2); ell(c, 8, 0, 3, 2.6, '#c0392b', OUT);
    c.restore();
  };
})();

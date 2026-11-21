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
  function ell(c, x, y, rx, ry, fill, stroke, rot) {
    c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.6; c.stroke(); }
  }
  function rect(c, x, y, w, h, fill, stroke, r) {
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, h, r || 0); else c.rect(x, y, w, h);
    if (fill) { c.fillStyle = fill; c.fill(); }
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
    ell(c, -1 + sw * 5, -6, 6, 3.6, '#1c1d1f', OUT); ell(c, -1 - sw * 5, 6, 6, 3.6, '#1c1d1f', OUT);
    // mochila
    rect(c, -17, -8.5, 10, 17, shade(skin.body, -50), OUT, 3); rect(c, -15, -5, 5, 10, shade(skin.body, -30));
    // tronco
    ell(c, 0, 0, 9.5, 14.5, skin.body, OUT);
    ell(c, 1.5, -1, 5.5, 9, shade(skin.body, 22));
    // ombros
    ell(c, 2, -12.5, 4.6, 4.2, shade(skin.body, -18), OUT); ell(c, 2, 12.5, 4.6, 4.2, shade(skin.body, -18), OUT);
    // braços até a arma
    limb(c, 3, -12, 17, -3.5, 5.2, skin.body); limb(c, 3, 12, 24, 3.2, 5.2, skin.body);
    gun(c, wid);
    ell(c, 18, -3.5, 3.4, 3.4, skin.head, OUT); ell(c, 25, 3.2, 3.4, 3.4, skin.head, OUT);
    // cabeça
    ell(c, 1, 0, 8, 8.4, skin.head, OUT);
    ell(c, 1, -8, 1.8, 2.4, skin.head, OUT); ell(c, 1, 8, 1.8, 2.4, skin.head, OUT);
    c.fillStyle = skin.hair || '#3a2a1c'; c.beginPath(); c.arc(0.4, 0, 8.3, Math.PI * 0.5, Math.PI * 1.5); c.fill();
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
  DF.sprites.zombie = function (c, z, time) {
    const t = z.type, boss = z.boss;
    const swing = Math.sin(z.walk || 0);
    const v = z.v || 0;
    const base = (t === 'brute' || boss) ? 21 : t === 'runner' ? 12 : 14;
    const s = z.r / base;
    c.save(); c.scale(s, s);
    const skin = SKINS_Z[t] || '#8f7566';
    const shirt = t === 'runner' ? '#8a2e2e' : t === 'spitter' ? '#4b6b4f' : SHIRTS[v % SHIRTS.length];
    if (t === 'brute' || boss) {
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
      limb(c, 4, -16, 26 + swing * 2, -8, 9, skin); limb(c, 4, 16, 26 - swing * 2, 8, 9, skin);
      ell(c, 28 + swing * 2, -8, 6.6, 6.2, shade(skin, -10), OUT); ell(c, 28 - swing * 2, 8, 6.6, 6.2, shade(skin, -10), OUT);
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
      limb(c, 3, -11, 15 + swing * 2, -6, 4.6, skin); limb(c, 3, 11, 15 - swing * 2, 6, 4.6, skin);
      clawHand(c, 17 + swing * 2, -6, 1, skin); clawHand(c, 17 - swing * 2, 6, 1, skin);
      ell(c, 4, 0, 7.4, 7.8, skin, OUT); c.fillStyle = '#26352a'; c.beginPath(); c.arc(2.6, 0, 7.6, Math.PI * 0.5, Math.PI * 1.5); c.fill();
      ell(c, 9.5, 0, 3.2, 4.4, '#0a3a22'); ell(c, 10, 0, 1.8, 2.6, '#7dffb0');
      ell(c, 6.5, -4, 1.5, 1.5, '#d8ffe8'); ell(c, 6.5, 4, 1.5, 1.5, '#d8ffe8');
    } else if (t === 'runner') {
      ell(c, -2 + swing * 6, -5, 5.6, 3.2, '#2a2420', OUT); ell(c, -2 - swing * 6, 5, 5.6, 3.2, '#2a2420', OUT);
      ell(c, 0, 0, 7.6, 11, shirt, OUT); ell(c, -2, 0, 5, 8, shade(shirt, -22));
      blood(c, 2, 3, 2.6);
      limb(c, 3, -9, 19 + swing * 3, -4, 3.6, skin); limb(c, 3, 9, 19 - swing * 3, 4, 3.6, skin);
      clawHand(c, 21 + swing * 3, -4, 0.9, skin); clawHand(c, 21 - swing * 3, 4, 0.9, skin);
      ell(c, 5, 0, 6.4, 6.8, skin, OUT); c.fillStyle = '#35301f'; c.beginPath(); c.arc(3.6, 0, 6.6, Math.PI * 0.5, Math.PI * 1.5); c.fill();
      ell(c, 9.6, 0, 2.6, 3.6, '#3a0c0e'); ell(c, 7.4, -3.2, 1.4, 1.4, '#ffee66'); ell(c, 7.4, 3.2, 1.4, 1.4, '#ffee66');
    } else { // walker
      ell(c, -2 + swing * 5, -6, 6, 3.6, '#2a2420', OUT); ell(c, -2 - swing * 5, 6, 6, 3.6, '#2a2420', OUT);
      ell(c, 0, 0, 9, 13, shirt, OUT); ell(c, -1, 0, 6, 9, shade(shirt, -20));
      // rasgos na roupa mostrando a carne
      ell(c, 3, -4 + v, 3.2, 2.4, skin); blood(c, 1, 4, 3); blood(c, -3, -6, 2);
      limb(c, 3, -11, 17 + swing * 3, -5.5, 4.2, skin); limb(c, 3, 11, 17 - swing * 3, 5.5, 4.2, skin);
      c.strokeStyle = shirt; c.lineWidth = 5.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(3, -11); c.lineTo(8, -8.5); c.moveTo(3, 11); c.lineTo(8, 8.5); c.stroke(); c.lineCap = 'butt';
      clawHand(c, 19 + swing * 3, -5.5, 1, skin); clawHand(c, 19 - swing * 3, 5.5, 1, skin);
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

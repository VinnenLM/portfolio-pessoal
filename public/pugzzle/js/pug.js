/* Pugzzle - arte dos pugs (SVG) e catálogo de skins.
   Desenho original em estilo kawaii: cabeça larga e achatada, orelhas triangulares
   caídas nos cantos, máscara em volta dos olhos, olhos grandes com brilho e
   focinho em dois lóbulos.
   Os grupos .tilt / .look / .eyes / .blink / .jaw aceitam as variáveis CSS
   --rot, --lx, --ly, --ex, --ey (olhar) e as classes .bark (latido). */
(function (root) {
  'use strict';

  const BASE = { face: '#fcd9a8', ear: '#b08577', mask: '#b08577', line: '#5e2f20', eye: '#4a2519' };

  // acessórios: back = atrás da cabeça, front = por cima, face = sobre o rosto
  const ACC = {
    bone: { front: (L) =>
      `<path d="M24 37 Q22 8 51 8 Q80 8 77 37 Q50 31 24 37 Z" fill="#e0605a" stroke="${L}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<path d="M51 9 Q41 20 43 33 M51 9 Q63 20 62 33" fill="none" stroke="#b94640" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M58 33 Q84 24 95 36 Q96 42 88 42 Q72 38 56 40 Z" fill="#c94c46" stroke="${L}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<path d="M62 35 Q80 30 90 37" fill="none" stroke="#fff" stroke-width="2" opacity=".5" stroke-linecap="round"/>` +
      `<circle cx="51" cy="8.5" r="3.4" fill="#b94640" stroke="${L}" stroke-width="2"/>` +
      `<path d="M30 24 Q36 15 46 13" fill="none" stroke="#fff" stroke-width="3" opacity=".5" stroke-linecap="round"/>` },
    bruxa: { front: (L) =>
      `<ellipse cx="50" cy="33" rx="36" ry="8" fill="#3a2a5c" stroke="${L}" stroke-width="2.6"/>` +
      `<path d="M31 32 Q42 18 47 3 Q60 7 58 18 Q64 26 69 32 Z" fill="#4b3573" stroke="${L}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<path d="M32 30 Q50 38 68 30 L67 25 Q50 32 33 25 Z" fill="#f2c94c" stroke="${L}" stroke-width="2" stroke-linejoin="round"/>` +
      `<circle cx="50" cy="31" r="2.4" fill="#fff6c8"/>` },
    palhaco: {
      back: (L) =>
        `<circle cx="13" cy="38" r="11" fill="#f2722f" stroke="${L}" stroke-width="2.6"/><circle cx="21" cy="25" r="10" fill="#ff8a3d" stroke="${L}" stroke-width="2.6"/>` +
        `<circle cx="87" cy="38" r="11" fill="#f2722f" stroke="${L}" stroke-width="2.6"/><circle cx="79" cy="25" r="10" fill="#ff8a3d" stroke="${L}" stroke-width="2.6"/>`,
      front: (L) =>
        `<path d="M37 28 L50 3 L63 28 Z" fill="#5b8def" stroke="${L}" stroke-width="2.6" stroke-linejoin="round"/>` +
        `<path d="M43 17 L57 17" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="50" cy="3.5" r="4.4" fill="#f2c94c" stroke="${L}" stroke-width="2"/>`,
      face: (L) =>
        `<circle cx="50" cy="60.5" r="7.6" fill="#e8302a" stroke="${L}" stroke-width="2.2"/><circle cx="47.4" cy="57.8" r="2.1" fill="#fff" opacity=".8"/>` },
    rei: { front: (L) =>
      `<path d="M29 29 L32 8 L41 20 L50 4 L59 20 L68 8 L71 29 Z" fill="#f2c94c" stroke="${L}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<circle cx="50" cy="20" r="3.2" fill="#e0605a" stroke="${L}" stroke-width="1.6"/>` +
      `<circle cx="38" cy="22" r="2.2" fill="#5b8def"/><circle cx="62" cy="22" r="2.2" fill="#5b8def"/>` },
    oculos: { face: (L) =>
      `<g class="shades">` +
      `<rect x="20" y="48" width="26" height="16" rx="7" fill="#16120f" stroke="${L}" stroke-width="2.2"/>` +
      `<rect x="54" y="48" width="26" height="16" rx="7" fill="#16120f" stroke="${L}" stroke-width="2.2"/>` +
      `<rect x="45" y="53" width="10" height="3.6" fill="#16120f"/>` +
      `<path d="M25 53 L34 53 M59 53 L68 53" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".5"/></g>` },
    cartola: { front: (L) =>
      `<ellipse cx="50" cy="32" rx="33" ry="6.5" fill="#2b2b33" stroke="${L}" stroke-width="2.6"/>` +
      `<rect x="32" y="3" width="36" height="28" rx="3.5" fill="#2b2b33" stroke="${L}" stroke-width="2.6"/>` +
      `<rect x="32" y="20" width="36" height="6.5" fill="#c0392b" stroke="${L}" stroke-width="2"/>` },
    chef: { front: (L) =>
      `<path d="M30 32 Q16 28 22 17 Q22 4 38 9 Q50 -1 62 9 Q78 4 78 17 Q84 28 70 32 Z" fill="#fff" stroke="${L}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<rect x="30" y="27" width="40" height="8" rx="2.5" fill="#f1f1f1" stroke="${L}" stroke-width="2.2"/>` },
    laco: { front: (L) =>
      `<path d="M50 26 C44 8 20 8 22 25 C24 40 42 40 50 26 Z" fill="#f49ac2" stroke="${L}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<path d="M50 26 C56 8 80 8 78 25 C76 40 58 40 50 26 Z" fill="#f49ac2" stroke="${L}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<path d="M30 20 Q36 15 42 20 M70 20 Q64 15 58 20" fill="none" stroke="#fff" stroke-width="2.4" opacity=".6" stroke-linecap="round"/>` +
      `<circle cx="50" cy="26" r="6" fill="#e06fa3" stroke="${L}" stroke-width="2.4"/>` },
  };

  // preços em pontos (1 ponto por fase vencida)
  const SKINS = [
    { id: 'classico', name: 'Clássico', price: 0 },
    { id: 'laco', name: 'Lacinho', price: 10, acc: 'laco' },
    { id: 'bone', name: 'Boné', price: 10, acc: 'bone' },
    { id: 'bruxa', name: 'Bruxa', price: 15, acc: 'bruxa' },
    { id: 'palhaco', name: 'Palhaço', price: 15, acc: 'palhaco' },
    { id: 'cinza', name: 'Pug cinza', price: 15, face: '#dfe2e8', ear: '#8b8f99', mask: '#8b8f99', line: '#3d4048', eye: '#2a2d33' },
    { id: 'gordinho', name: 'Gordinho', price: 20, fat: true },
    { id: 'preto', name: 'Pug preto', price: 20, face: '#625956', ear: '#2b2523', mask: '#4d4440', line: '#120d0b', eye: '#150d0a' },
    { id: 'oculos', name: 'Descolado', price: 25, acc: 'oculos' },
    { id: 'chef', name: 'Chef', price: 25, acc: 'chef' },
    { id: 'cartola', name: 'Cartola', price: 30, acc: 'cartola' },
    { id: 'rei', name: 'Rei Pug', price: 40, acc: 'rei' },
  ];

  const HEAD = 'M50 26 C65 26 79 28 85 36 C90 43 91 53 90 62 C89 77 76 87 50 87 C24 87 11 77 10 62 C9 53 10 43 15 36 C21 28 35 26 50 26 Z';
  const HEAD_FAT = 'M50 21 C68 21 85 24 92 35 C98 46 98 64 91 77 C84 90 68 93 50 93 C32 93 16 90 9 77 C2 64 2 46 8 35 C15 24 32 21 50 21 Z';
  const EAR = 'M31 27 C19 24 7 30 4 41 C3 50 7 57 13 57 C21 53 28 42 31 27 Z';

  function svg(skin, cls) {
    const k = Object.assign({}, BASE, skin);
    const L = k.line, fat = !!skin.fat;
    const acc = skin.acc ? ACC[skin.acc] : null;
    const dy = fat ? -7 : -3; // acessórios sobem um pouco na cabeça maior
    const fy = fat ? 3 : 0;   // rosto um pouco mais baixo no gordinho
    const blinkDelay = (-Math.random() * 5).toFixed(2);
    const st = (w) => `stroke="${L}" stroke-width="${w || 3}" stroke-linejoin="round" stroke-linecap="round"`;
    const soft = (d, w, o) => `<path d="${d}" fill="none" stroke="${k.ear}" stroke-width="${w || 2.4}" stroke-linecap="round" opacity="${o || 0.65}"/>`;

    // orelhas: triângulos arredondados caídos, por cima da cabeça (espelhadas)
    const ear = (m) => {
      const t = m ? `translate(100 0) scale(-1 1) translate(0 ${fat ? -2 : 0})` : `translate(0 ${fat ? -2 : 0})`;
      return `<g transform="${t}"><path d="${EAR}" fill="${k.ear}" ${st(3)}/>` +
             `<path d="M9 39 Q7 47 11 52" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".3"/></g>`;
    };

    const eyeCx = fat ? 30 : 31.5;
    const eye = (cx) =>
      `<circle cx="${cx}" cy="55" r="9.6" fill="${k.eye}"/>` +
      `<circle cx="${cx - 3.2}" cy="51.4" r="3.3" fill="#fff"/><circle cx="${cx + 3.8}" cy="60" r="1.3" fill="#fff" opacity=".9"/>` +
      `<ellipse cx="${cx + 3.8}" cy="57.4" rx="3.5" ry="2.3" transform="rotate(-35 ${cx + 3.8} 57.4)" fill="#ff7fae" opacity=".92"/>`;

    const maskD = fat
      ? 'M13 57 C13 46 28 43 50 48 C72 43 87 46 87 57 C87 69 74 73 50 73 C26 73 13 69 13 57 Z'
      : 'M17 56 C17 46 30 43 50 48 C70 43 83 46 83 56 C83 67 72 71 50 71 C28 71 17 67 17 56 Z';

    const brows = fat
      ? soft('M26 40 Q33 36 41 39 M59 39 Q67 36 74 40 M39 31 Q50 27 61 31 M44 25 Q50 22 56 25', 2.4, 0.6)
      : soft('M27 40.5 Q33 37 40 39.5 M60 39.5 Q67 37 73 40.5', 2.4, 0.65);

    // dobrinhas do gordinho: bochechas, papada e testa enrugada
    const folds = fat
      ? soft('M19 66 Q25 70 22 78 M81 66 Q75 70 78 78', 2.4, 0.7) +
        `<path d="M30 83 Q50 90 70 83" fill="none" stroke="${L}" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>` +
        `<path d="M36 89 Q50 93 64 89" fill="none" stroke="${L}" stroke-width="2.2" stroke-linecap="round" opacity=".5"/>` +
        `<circle cx="20" cy="66" r="7" fill="#ff8fb0" opacity=".4"/><circle cx="80" cy="66" r="7" fill="#ff8fb0" opacity=".4"/>`
      : '';

    return `<svg class="${cls || 'pug'}" viewBox="-8 -15 116 116" overflow="visible" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<g class="tilt">` +
      (acc && acc.back ? `<g transform="translate(0 ${dy})">${acc.back(L)}</g>` : '') +
      `<path d="${fat ? HEAD_FAT : HEAD}" fill="${k.face}" ${st(3)}/>` +
      `<g class="look"><g transform="translate(0 ${fy})"><path d="${maskD}" fill="${k.mask}"/></g></g>` +
      ear(false) + ear(true) +
      `<g class="look"><g transform="translate(0 ${fy})">` +
        brows +
        soft('M50 41 L50 48', 2.4, 0.7) +
        `<g class="eyes"><g class="blink" style="animation-delay:${blinkDelay}s">${eye(eyeCx)}${eye(100 - eyeCx)}</g></g>` +
        // boca (abre ao latir), depois os dois lóbulos do focinho e o nariz
        `<g class="jaw"><path d="M40.5 72 Q50 88 59.5 72 Z" fill="#7a4a3e" ${st(2.4)}/>` +
        `<path d="M46 77 Q50 87 54 77 Q50 74.5 46 77Z" fill="#ff8fae"/></g>` +
        `<ellipse cx="43" cy="68.5" rx="10.4" ry="8.4" transform="rotate(-14 43 68.5)" fill="${k.mask}" ${st(2.6)}/>` +
        `<ellipse cx="57" cy="68.5" rx="10.4" ry="8.4" transform="rotate(14 57 68.5)" fill="${k.mask}" ${st(2.6)}/>` +
        `<path d="M50 64.5 L50 70" stroke="${L}" stroke-width="2.4" stroke-linecap="round"/>` +
        `<path d="M44.5 59 Q50 56 55.5 59 Q54.5 64.5 50 65 Q45.5 64.5 44.5 59Z" fill="${k.eye}" stroke="${L}" stroke-width="1.8" stroke-linejoin="round"/>` +
        `<ellipse cx="48" cy="59.4" rx="2.2" ry="1" fill="#fff" opacity=".55"/>` +
        folds +
        (acc && acc.face ? acc.face(L) : '') +
      `</g></g>` +
      (acc && acc.front ? `<g transform="translate(0 ${dy})">${acc.front(L)}</g>` : '') +
      `</g></svg>`;
  }

  const byId = (id) => SKINS.find((s) => s.id === id) || SKINS[0];
  root.PugArt = { SKINS, svg, byId };
})(typeof self !== 'undefined' ? self : this);

/* Pugzzle - arte dos pugs (SVG) e catálogo de skins.
   Desenho original em estilo kawaii: orelhas caídas, máscara em volta dos olhos,
   olhos grandes com brilho e focinho em dois lóbulos.
   Os grupos .tilt / .look / .eyes / .blink aceitam as variáveis CSS
   --rot, --lx, --ly, --ex, --ey para o pug "olhar" para outro pug. */
(function (root) {
  'use strict';

  const BASE = { face: '#fcd9a8', ear: '#b08577', mask: '#b08577', line: '#5e2f20', eye: '#4a2519' };

  // acessórios: back = atrás da cabeça, front = por cima (y já pensado para a cabeça normal)
  const ACC = {
    bone: { front: (L) =>
      `<path d="M22 38 Q22 9 52 9 Q80 9 78 38 Z" fill="#e0605a" stroke="${L}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<path d="M60 37 Q92 32 97 43 Q80 46 60 41 Z" fill="#b94640" stroke="${L}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<circle cx="50" cy="10" r="3.6" fill="#b94640" stroke="${L}" stroke-width="2"/>` +
      `<path d="M26 32 Q50 26 76 32" fill="none" stroke="#fff" stroke-width="3" opacity=".55" stroke-linecap="round"/>` },
    bruxa: { front: (L) =>
      `<ellipse cx="50" cy="34" rx="36" ry="8.5" fill="#3a2a5c" stroke="${L}" stroke-width="2.6"/>` +
      `<path d="M30 33 Q42 18 47 3 Q60 7 58 18 Q64 26 70 33 Z" fill="#4b3573" stroke="${L}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<path d="M31 31 Q50 39 69 31 L68 26 Q50 33 32 26 Z" fill="#f2c94c" stroke="${L}" stroke-width="2" stroke-linejoin="round"/>` +
      `<circle cx="50" cy="32" r="2.4" fill="#fff6c8"/>` },
    palhaco: {
      back: (L) => `<circle cx="14" cy="42" r="12" fill="#f2722f" stroke="${L}" stroke-width="2.6"/><circle cx="86" cy="42" r="12" fill="#f2722f" stroke="${L}" stroke-width="2.6"/>` +
            `<circle cx="25" cy="25" r="10" fill="#f2722f" stroke="${L}" stroke-width="2.6"/><circle cx="75" cy="25" r="10" fill="#f2722f" stroke="${L}" stroke-width="2.6"/>`,
      front: (L) => `<path d="M38 28 L50 3 L62 28 Z" fill="#5b8def" stroke="${L}" stroke-width="2.6" stroke-linejoin="round"/><circle cx="50" cy="4" r="4.6" fill="#f2c94c" stroke="${L}" stroke-width="2"/>` +
             `<circle cx="50" cy="62" r="8.5" fill="#e8302a" stroke="${L}" stroke-width="2.4"/><circle cx="47.3" cy="59.4" r="2.2" fill="#fff" opacity=".75"/>` },
    rei: { front: (L) =>
      `<path d="M28 31 L31 9 L41 21 L50 5 L59 21 L69 9 L72 31 Z" fill="#f2c94c" stroke="${L}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<circle cx="50" cy="22" r="3.2" fill="#e0605a" stroke="${L}" stroke-width="1.6"/>` +
      `<circle cx="37" cy="24" r="2.2" fill="#5b8def"/><circle cx="63" cy="24" r="2.2" fill="#5b8def"/>` },
    oculos: { front: (L) =>
      `<rect x="21" y="49" width="25" height="16" rx="7" fill="#16120f" stroke="${L}" stroke-width="2.2"/>` +
      `<rect x="54" y="49" width="25" height="16" rx="7" fill="#16120f" stroke="${L}" stroke-width="2.2"/>` +
      `<rect x="45" y="54" width="10" height="3.6" fill="#16120f"/>` +
      `<path d="M26 54 L34 54 M59 54 L67 54" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".5"/>` },
    cartola: { front: (L) =>
      `<ellipse cx="50" cy="33" rx="33" ry="7" fill="#2b2b33" stroke="${L}" stroke-width="2.6"/>` +
      `<rect x="32" y="4" width="36" height="28" rx="3.5" fill="#2b2b33" stroke="${L}" stroke-width="2.6"/>` +
      `<rect x="32" y="21" width="36" height="6.5" fill="#c0392b" stroke="${L}" stroke-width="2"/>` },
    chef: { front: (L) =>
      `<path d="M29 33 Q15 29 21 18 Q21 5 38 10 Q50 0 62 10 Q79 5 79 18 Q85 29 71 33 Z" fill="#fff" stroke="${L}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<rect x="29" y="28" width="42" height="8" rx="2.5" fill="#f1f1f1" stroke="${L}" stroke-width="2.2"/>` },
    laco: { front: (L) =>
      `<path d="M50 27 L32 15 L32 39 Z M50 27 L68 15 L68 39 Z" fill="#f49ac2" stroke="${L}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<circle cx="50" cy="27" r="5.5" fill="#e06fa3" stroke="${L}" stroke-width="2.2"/>` },
  };

  const SKINS = [
    { id: 'classico', name: 'Clássico', price: 0 },
    { id: 'laco', name: 'Lacinho', price: 2, acc: 'laco' },
    { id: 'bone', name: 'Boné', price: 2, acc: 'bone' },
    { id: 'bruxa', name: 'Bruxa', price: 3, acc: 'bruxa' },
    { id: 'palhaco', name: 'Palhaço', price: 3, acc: 'palhaco' },
    { id: 'cinza', name: 'Pug cinza', price: 3, face: '#dfe2e8', ear: '#8b8f99', mask: '#8b8f99', line: '#3d4048', eye: '#2a2d33' },
    { id: 'gordinho', name: 'Gordinho', price: 3, fat: true },
    { id: 'preto', name: 'Pug preto', price: 4, face: '#625956', ear: '#2b2523', mask: '#3d3532', line: '#120d0b', eye: '#150d0a' },
    { id: 'oculos', name: 'Descolado', price: 4, acc: 'oculos' },
    { id: 'chef', name: 'Chef', price: 4, acc: 'chef' },
    { id: 'cartola', name: 'Cartola', price: 5, acc: 'cartola' },
    { id: 'rei', name: 'Rei Pug', price: 6, acc: 'rei' },
  ];

  function svg(skin, cls) {
    const k = Object.assign({}, BASE, skin);
    const L = k.line, fat = !!skin.fat;
    const rx = fat ? 41 : 36, ry = fat ? 37 : 30, cy = fat ? 55 : 58;
    const acc = skin.acc ? ACC[skin.acc] : null;
    const dy = fat ? -9 : -3; // acessórios sobem um pouco na cabeça maior
    const blinkDelay = (-Math.random() * 5).toFixed(2);
    const stroke = `stroke="${L}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

    // orelhas grandes e caídas (espelhadas)
    const ear = (m) => {
      const X = (x) => (m ? 100 - x : x);
      return `<path d="M${X(31)} 29 C${X(14)} 22 ${X(2)} 36 ${X(4)} 55 C${X(5)} 64 ${X(11)} 69 ${X(18)} 66 C${X(27)} 62 ${X(33)} 50 ${X(36)} 37 Z" fill="${k.ear}" ${stroke}/>` +
             `<path d="M${X(12)} 40 Q${X(9)} 50 ${X(13)} 58" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".28"/>`;
    };

    const folds = fat
      ? // dobrinhas: papada, bochechas e testa
        `<path d="M33 85 Q50 92 67 85" fill="none" stroke="${L}" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>` +
        `<path d="M38 91 Q50 95 62 91" fill="none" stroke="${L}" stroke-width="2.2" stroke-linecap="round" opacity=".6"/>` +
        `<path d="M16 63 Q22 67 19 75" fill="none" stroke="${L}" stroke-width="2.2" stroke-linecap="round" opacity=".6"/>` +
        `<path d="M84 63 Q78 67 81 75" fill="none" stroke="${L}" stroke-width="2.2" stroke-linecap="round" opacity=".6"/>`
      : '';
    const chin = fat ? `<ellipse cx="50" cy="88" rx="28" ry="10" fill="${k.face}" ${stroke}/>` : '';
    const brows = fat
      ? `<path d="M27 41 Q33 36 40 40 M60 40 Q67 36 73 41 M40 32 Q50 28 60 32 M44 26 Q50 23 56 26" fill="none" stroke="${k.ear}" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>`
      : `<path d="M28 43 Q34 39 40 42 M60 42 Q66 39 72 43" fill="none" stroke="${k.ear}" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>`;
    const eyeCx = fat ? 32 : 34;

    const eye = (cx) =>
      `<circle cx="${cx}" cy="57" r="9.2" fill="${k.eye}"/>` +
      `<circle cx="${cx - 3}" cy="53.4" r="3.2" fill="#fff"/><circle cx="${cx + 3.6}" cy="62" r="1.3" fill="#fff" opacity=".9"/>` +
      `<ellipse cx="${cx + 3.6}" cy="59.4" rx="3.4" ry="2.3" transform="rotate(-35 ${cx + 3.6} 59.4)" fill="#ff7fae" opacity=".92"/>`;

    return `<svg class="${cls || 'pug'}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<g class="tilt">` +
      (acc && acc.back ? `<g transform="translate(0 ${dy})">${acc.back(L)}</g>` : '') +
      ear(false) + ear(true) +
      chin +
      `<ellipse cx="50" cy="${cy}" rx="${rx}" ry="${ry}" fill="${k.face}" ${stroke}/>` +
      folds +
      (fat ? `<circle cx="22" cy="69" r="7" fill="#ff8fb0" opacity=".42"/><circle cx="78" cy="69" r="7" fill="#ff8fb0" opacity=".42"/>` : '') +
      `<g class="look">` +
        `<path d="M${fat ? 15 : 19} 58 C${fat ? 15 : 19} 44 33 40 50 46 C67 40 ${fat ? 85 : 81} 44 ${fat ? 85 : 81} 58 C${fat ? 85 : 81} 69 70 73 50 73 C30 73 ${fat ? 15 : 19} 69 ${fat ? 15 : 19} 58Z" fill="${k.mask}"/>` +
        brows +
        `<path d="M50 41 L50 49" stroke="${k.ear}" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>` +
        `<g class="eyes"><g class="blink" style="animation-delay:${blinkDelay}s">${eye(eyeCx)}${eye(100 - eyeCx)}</g></g>` +
        // boca aberta e língua, depois os dois lóbulos do focinho e o nariz
        `<path d="M40 74 Q50 90 60 74 Z" fill="#7a4a3e" ${stroke.replace('stroke-width="3"', 'stroke-width="2.4"')}/>` +
        `<path d="M45.5 80 Q50 90 54.5 80 Q50 77 45.5 80Z" fill="#ff8fae"/>` +
        `<ellipse cx="42.5" cy="71" rx="10.6" ry="8.6" transform="rotate(-12 42.5 71)" fill="${k.mask}" ${stroke.replace('stroke-width="3"', 'stroke-width="2.6"')}/>` +
        `<ellipse cx="57.5" cy="71" rx="10.6" ry="8.6" transform="rotate(12 57.5 71)" fill="${k.mask}" ${stroke.replace('stroke-width="3"', 'stroke-width="2.6"')}/>` +
        `<path d="M50 66 L50 72" stroke="${L}" stroke-width="2.4" stroke-linecap="round"/>` +
        `<path d="M44 61 Q50 58 56 61 Q55 66.5 50 67 Q45 66.5 44 61Z" fill="${k.eye}" stroke="${L}" stroke-width="1.8" stroke-linejoin="round"/>` +
        `<ellipse cx="48" cy="61.2" rx="2.2" ry="1" fill="#fff" opacity=".55"/>` +
      `</g>` +
      (acc && acc.front ? `<g transform="translate(0 ${dy})">${acc.front(L)}</g>` : '') +
      `</g></svg>`;
  }

  const byId = (id) => SKINS.find((s) => s.id === id) || SKINS[0];
  root.PugArt = { SKINS, svg, byId };
})(typeof self !== 'undefined' ? self : this);

/* Pugzzle - arte dos pugs (SVG) e catálogo de skins */
(function (root) {
  'use strict';

  const O = '#1f1510'; // contorno
  const st = `stroke="${O}" stroke-width="2.5" stroke-linejoin="round"`;

  // acessórios: back = atrás da cabeça, front = por cima
  const ACC = {
    bone: { front:
      `<path d="M22 38 Q22 8 52 8 Q80 8 78 38 Z" fill="#e0605a" ${st}/>` +
      `<path d="M60 37 Q92 32 97 43 Q80 46 60 41 Z" fill="#b94640" ${st}/>` +
      `<circle cx="50" cy="9" r="3.5" fill="#b94640" ${st}/>` +
      `<path d="M24 33 Q50 27 77 33" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/>` },
    bruxa: { front:
      `<ellipse cx="50" cy="33" rx="35" ry="8" fill="#3a2a5c" ${st}/>` +
      `<path d="M30 32 Q42 17 47 3 Q60 6 58 17 Q64 25 70 32 Z" fill="#4b3573" ${st}/>` +
      `<path d="M31 30 Q50 38 69 30 L68 25 Q50 32 32 25 Z" fill="#f2c94c" ${st}/>` },
    palhaco: {
      back: `<circle cx="17" cy="42" r="12" fill="#f2722f" ${st}/><circle cx="83" cy="42" r="12" fill="#f2722f" ${st}/>` +
            `<circle cx="27" cy="27" r="10" fill="#f2722f" ${st}/><circle cx="73" cy="27" r="10" fill="#f2722f" ${st}/>`,
      front: `<path d="M38 31 L50 5 L62 31 Z" fill="#5b8def" ${st}/><circle cx="50" cy="5" r="4.5" fill="#f2c94c" ${st}/>` +
             `<circle cx="50" cy="63" r="8.5" fill="#e8302a" ${st}/><circle cx="47.5" cy="60.5" r="2" fill="#fff" opacity=".7"/>` },
    rei: { front:
      `<path d="M28 34 L31 12 L41 24 L50 8 L59 24 L69 12 L72 34 Z" fill="#f2c94c" ${st}/>` +
      `<circle cx="50" cy="26" r="3" fill="#e0605a" stroke="${O}" stroke-width="1.5"/>` +
      `<circle cx="36" cy="28" r="2.2" fill="#5b8def"/><circle cx="64" cy="28" r="2.2" fill="#5b8def"/>` },
    oculos: { front:
      `<rect x="24" y="45" width="24" height="15" rx="6" fill="#16120f" ${st}/>` +
      `<rect x="52" y="45" width="24" height="15" rx="6" fill="#16120f" ${st}/>` +
      `<rect x="47" y="50" width="6" height="3.5" fill="#16120f"/>` +
      `<path d="M28 49 L35 49 M56 49 L63 49" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".5"/>` },
    cartola: { front:
      `<ellipse cx="50" cy="33" rx="32" ry="6.5" fill="#2b2b33" ${st}/>` +
      `<rect x="32" y="6" width="36" height="27" rx="3" fill="#2b2b33" ${st}/>` +
      `<rect x="32" y="22" width="36" height="6" fill="#c0392b" ${st}/>` },
    chef: { front:
      `<path d="M30 34 Q16 30 22 19 Q22 6 38 11 Q50 1 62 11 Q78 6 78 19 Q84 30 70 34 Z" fill="#fff" ${st}/>` +
      `<rect x="30" y="29" width="40" height="7" rx="2" fill="#f1f1f1" ${st}/>` },
    laco: { front:
      `<path d="M50 28 L33 17 L33 38 Z M50 28 L67 17 L67 38 Z" fill="#f49ac2" ${st}/>` +
      `<circle cx="50" cy="28" r="5" fill="#e06fa3" ${st}/>` },
  };

  const SKINS = [
    { id: 'classico', name: 'Clássico', price: 0, fur: '#e8c48a', ear: '#3b2a22', muzzle: '#3b2a22' },
    { id: 'laco', name: 'Lacinho', price: 2, fur: '#e8c48a', ear: '#3b2a22', muzzle: '#3b2a22', acc: 'laco' },
    { id: 'bone', name: 'Boné', price: 2, fur: '#e8c48a', ear: '#3b2a22', muzzle: '#3b2a22', acc: 'bone' },
    { id: 'bruxa', name: 'Bruxa', price: 3, fur: '#e8c48a', ear: '#3b2a22', muzzle: '#3b2a22', acc: 'bruxa' },
    { id: 'palhaco', name: 'Palhaço', price: 3, fur: '#e8c48a', ear: '#3b2a22', muzzle: '#3b2a22', acc: 'palhaco' },
    { id: 'cinza', name: 'Pug cinza', price: 3, fur: '#b8bcc2', ear: '#565b63', muzzle: '#454a52' },
    { id: 'gordinho', name: 'Gordinho', price: 3, fur: '#e8c48a', ear: '#3b2a22', muzzle: '#3b2a22', fat: true },
    { id: 'preto', name: 'Pug preto', price: 4, fur: '#4a4440', ear: '#26211e', muzzle: '#26211e' },
    { id: 'oculos', name: 'Descolado', price: 4, fur: '#e8c48a', ear: '#3b2a22', muzzle: '#3b2a22', acc: 'oculos' },
    { id: 'chef', name: 'Chef', price: 4, fur: '#e8c48a', ear: '#3b2a22', muzzle: '#3b2a22', acc: 'chef' },
    { id: 'cartola', name: 'Cartola', price: 5, fur: '#e8c48a', ear: '#3b2a22', muzzle: '#3b2a22', acc: 'cartola' },
    { id: 'rei', name: 'Rei Pug', price: 6, fur: '#e8c48a', ear: '#3b2a22', muzzle: '#3b2a22', acc: 'rei', fat: true },
  ];

  function svg(skin, cls) {
    const w = skin.fat ? 40 : 34, h = skin.fat ? 34 : 30;
    const lx = 50 - w + 6, rx = 50 + w - 6;
    const acc = skin.acc ? ACC[skin.acc] : null;
    const eyeSpread = skin.fat ? 15 : 14;
    return `<svg class="${cls || 'pug'}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      (acc && acc.back ? acc.back : '') +
      `<path d="M${lx} 32 Q${lx - 15} 50 ${lx - 2} 68 Q${lx + 10} 60 ${lx + 12} 38 Z" fill="${skin.ear}" ${st}/>` +
      `<path d="M${rx} 32 Q${rx + 15} 50 ${rx + 2} 68 Q${rx - 10} 60 ${rx - 12} 38 Z" fill="${skin.ear}" ${st}/>` +
      `<ellipse cx="50" cy="58" rx="${w}" ry="${h}" fill="${skin.fur}" stroke="${O}" stroke-width="3"/>` +
      (skin.fat ? `<circle cx="${50 - w + 9}" cy="68" r="7" fill="#f08aa0" opacity=".45"/><circle cx="${50 + w - 9}" cy="68" r="7" fill="#f08aa0" opacity=".45"/>` : '') +
      `<path d="M37 39 Q44 34 50 39 Q56 34 63 39 M43 45 Q50 41 57 45" fill="none" stroke="rgba(50,28,14,.5)" stroke-width="2" stroke-linecap="round"/>` +
      `<circle cx="${50 - eyeSpread}" cy="55" r="8.5" fill="#fff" stroke="${O}" stroke-width="2"/>` +
      `<circle cx="${50 + eyeSpread}" cy="55" r="8.5" fill="#fff" stroke="${O}" stroke-width="2"/>` +
      `<circle cx="${50 - eyeSpread + 1}" cy="56" r="5.2" fill="#0e0a08"/><circle cx="${50 + eyeSpread - 1}" cy="56" r="5.2" fill="#0e0a08"/>` +
      `<circle cx="${50 - eyeSpread + 3}" cy="54" r="1.8" fill="#fff"/><circle cx="${50 + eyeSpread - 3}" cy="54" r="1.8" fill="#fff"/>` +
      `<ellipse cx="50" cy="71" rx="19" ry="14" fill="${skin.muzzle}" stroke="${O}" stroke-width="2"/>` +
      `<ellipse cx="50" cy="64" rx="7" ry="4.6" fill="#0e0a08"/><ellipse cx="48" cy="62.6" rx="2.2" ry="1.2" fill="#fff" opacity=".6"/>` +
      `<path d="M50 68 L50 72 M42 74 Q46 78 50 72 Q54 78 58 74" fill="none" stroke="#9a7a66" stroke-width="1.8" stroke-linecap="round"/>` +
      `<path d="M47 77 Q50 88 53 77 Z" fill="#f08aa0" stroke="${O}" stroke-width="1.5"/>` +
      (acc && acc.front ? acc.front : '') +
      `</svg>`;
  }

  const byId = (id) => SKINS.find((s) => s.id === id) || SKINS[0];
  root.PugArt = { SKINS, svg, byId };
})(typeof self !== 'undefined' ? self : this);

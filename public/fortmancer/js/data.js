'use strict';
/* ============================================================
   FORTMANCER — dados do jogo (inimigos, habilidades, mapas, loja)
   ============================================================ */
const W = 480, H = 270, GY = 206, CASTLE_X = 108;
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = a => a[Math.floor(Math.random() * a.length)];
const lerp = (a, b, t) => a + (b - a) * t;
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : Math.floor(n).toString();

/* ---------- Inimigos (do mais fraco ao mais forte) ---------- */
const ENEMY = {
  slime:    { name: 'Slime',            sprite: 'slime',    hp: 20,  spd: 24, dmg: 4,  rate: 1.2, gold: 2,  cost: 2,  w: 14, h: 12 },
  bat:      { name: 'Morcego',          sprite: 'bat',      hp: 12,  spd: 54, dmg: 3,  rate: 1.0, gold: 3,  cost: 3,  w: 14, h: 9, fly: true, fy: 150 },
  goblin:   { name: 'Goblin',           sprite: 'goblin',   hp: 34,  spd: 40, dmg: 6,  rate: 1.0, gold: 3,  cost: 4,  w: 12, h: 15 },
  skeleton: { name: 'Esqueleto',        sprite: 'skeleton', hp: 62,  spd: 32, dmg: 9,  rate: 1.1, gold: 5,  cost: 6,  w: 12, h: 16 },
  witch:    { name: 'Bruxa',            sprite: 'witch',    hp: 80,  spd: 28, dmg: 10, rate: 2.2, gold: 9,  cost: 9,  w: 12, h: 16, ranged: true, range: 150, shot: '#b86bff' },
  ogre:     { name: 'Ogro',             sprite: 'ogre',     hp: 240, spd: 20, dmg: 24, rate: 1.6, gold: 14, cost: 14, w: 26, h: 32, scale: 2 },
  darkmage: { name: 'Mago das Trevas',  sprite: 'darkmage', hp: 170, spd: 26, dmg: 14, rate: 2.4, gold: 16, cost: 16, w: 12, h: 16, ranged: true, range: 172, shot: '#ff3d6e', summon: { type: 'skeleton', every: 7, n: 1 } },
  troll:    { name: 'Troll',            sprite: 'troll',    hp: 420, spd: 22, dmg: 30, rate: 1.5, gold: 22, cost: 22, w: 28, h: 34, scale: 2, regen: 0.02 },
};

/* ---------- Chefes ---------- */
const BOSSES = [
  { id: 'slimeking',  name: 'Rei Slime',          base: 'slime',    scale: 3, hp: 780,  spd: 15, dmg: 16,  rate: 1.4, gold: 60,  w: 44, h: 38, crown: true, die: { spawn: 'slime', n: 6 } },
  { id: 'goblinlord', name: 'Senhor Goblin',      base: 'goblin',   scale: 3, hp: 1150, spd: 26, dmg: 22,  rate: 1.1, gold: 80,  w: 38, h: 48, crown: true, summon: { type: 'goblin', every: 8, n: 3 } },
  { id: 'lich',       name: 'Rei Esqueleto',      base: 'skeleton', scale: 3, hp: 1650, spd: 20, dmg: 30,  rate: 1.2, gold: 100, w: 38, h: 50, crown: true, summon: { type: 'skeleton', every: 7, n: 2 } },
  { id: 'ogrechief',  name: 'Ogro Chefe',         base: 'ogre',     scale: 3, hp: 3000, spd: 14, dmg: 70,  rate: 1.8, gold: 130, w: 46, h: 58, crown: true },
  { id: 'trollking',  name: 'Rei Troll',          base: 'troll',    scale: 3, hp: 3900, spd: 16, dmg: 80,  rate: 1.6, gold: 170, w: 48, h: 60, crown: true, regen: 0.012 },
  { id: 'witchqueen', name: 'Rainha Bruxa',       base: 'witch',    scale: 3, hp: 3800, spd: 18, dmg: 45,  rate: 2.0, gold: 200, w: 38, h: 50, crown: true, ranged: true, range: 190, shot: '#d86bff', summon: { type: 'bat', every: 5, n: 3 } },
  { id: 'archmage',   name: 'Arquimago Sombrio',  base: 'darkmage', scale: 3, hp: 5600, spd: 16, dmg: 60,  rate: 1.8, gold: 260, w: 38, h: 50, crown: true, ranged: true, range: 205, shot: '#ff3d6e', summon: { type: 'witch', every: 10, n: 1 } },
  { id: 'demonking',  name: 'Rei Demônio',        base: 'demon',    scale: 3, hp: 8500, spd: 14, dmg: 110, rate: 1.5, gold: 400, w: 48, h: 60, ranged: true, range: 170, shot: '#ff7a1a', summon: { type: 'ogre', every: 12, n: 1 } },
];

/* ---------- Habilidades ativas ---------- */
const SKILLS = {
  fire:   { name: 'Bola de Fogo',      icon: 'fire',   color: '#ff7a1a', key: '1', unlock: 0,   base: 70,  grow: 1.55, desc: 'Explode ao atingir o alvo e queima os inimigos.' },
  frost:  { name: 'Nova de Gelo',      icon: 'frost',  color: '#7fe0ff', key: '2', unlock: 90,  base: 60,  grow: 1.55, desc: 'Onda gelada em volta do mago: dano e lentidão.' },
  bolt:   { name: 'Relâmpago',         icon: 'bolt',   color: '#ffe066', key: '3', unlock: 160, base: 90,  grow: 1.55, desc: 'Raio que salta entre vários inimigos.' },
  meteor: { name: 'Chuva de Meteoros', icon: 'meteor', color: '#ff4d6d', key: '4', unlock: 320, base: 150, grow: 1.6,  desc: 'Meteoros caem do céu esmagando a horda.' },
  poison: { name: 'Nuvem Venenosa',    icon: 'poison', color: '#7bdc4a', key: '5', unlock: 140, base: 85,  grow: 1.55, desc: 'Frasco que cria uma nuvem tóxica: dano contínuo em área.' },
  roots:  { name: 'Raízes do Druida',  icon: 'roots',  color: '#4fae56', key: '6', unlock: 200, base: 105, grow: 1.55, desc: 'Raízes prendem os inimigos no chão e os ferem.' },
  light:  { name: 'Luz Sagrada',       icon: 'light',  color: '#fff0a0', key: '7', unlock: 260, base: 125, grow: 1.55, desc: 'Pilar de luz: cura o castelo, restaura a barreira e fere os inimigos.' },
};
const SKILL_KEYS = Object.keys(SKILLS);
const SKILL_MAX = 8;
const skillStats = (id, l) => {
  const g = l - 1;
  switch (id) {
    case 'fire':   return { dmg: 38 * (1 + .35 * g), radius: 30 + 3 * l, cd: 2.8 * Math.pow(.93, g), burn: 4 * l };
    case 'frost':  return { dmg: 20 * (1 + .30 * g), radius: 118 + 8 * l, cd: 9 * Math.pow(.92, g), slow: .55, dur: 3 + .3 * l };
    case 'bolt':   return { dmg: 40 * (1 + .35 * g), chain: 3 + Math.floor(l / 2), cd: 5.5 * Math.pow(.93, g) };
    case 'meteor': return { dmg: 85 * (1 + .40 * g), radius: 40, n: 3 + Math.floor(l / 2), cd: 15 * Math.pow(.93, g) };
    case 'poison': return { dmg: 11 * (1 + .35 * g), radius: 32 + 2.5 * l, dur: 5 + .35 * l, cd: 8 * Math.pow(.93, g) };
    case 'roots':  return { dmg: 12 * (1 + .30 * g), n: 3 + Math.floor(l / 2), dur: 2.2 + .3 * l, cd: 11 * Math.pow(.93, g) };
    case 'light':  return { heal: .08 + .015 * l, dmg: 30 * (1 + .35 * g), radius: 120 + 6 * l, cd: 16 * Math.pow(.93, g) };
  }
};
const skillText = (id, l) => {
  const s = skillStats(id, l);
  switch (id) {
    case 'poison': return `${Math.round(s.dmg)} dano/s · ${s.dur.toFixed(1)}s`;
    case 'roots':  return `prende ${s.n} · ${s.dur.toFixed(1)}s`;
    case 'light':  return `cura ${Math.round(s.heal * 100)}% · dano ${Math.round(s.dmg)}`;
    default:       return `Dano ${Math.round(s.dmg)}`;
  }
};
// nível visual do efeito da habilidade (0-3), cresce com o nível da skill
const fxTier = l => l >= 7 ? 3 : l >= 5 ? 2 : l >= 3 ? 1 : 0;

/* ---------- Melhorias da partida (compradas com ouro) ---------- */
const UPGRADES = {
  // mago
  dmg:     { group: 'mago',   name: 'Poder Arcano',  icon: 'wand', desc: '+15% de dano em tudo', base: 22, grow: 1.33, max: 20 },
  spd:     { group: 'mago',   name: 'Cadência',      icon: 'chev', desc: '+10% de velocidade de ataque', base: 24, grow: 1.34, max: 15 },
  crit:    { group: 'mago',   name: 'Crítico',       icon: 'crit', desc: '+5% chance de crítico (x2)', base: 40, grow: 1.45, max: 10 },
  gold:    { group: 'mago',   name: 'Ganância',      icon: 'coin', desc: '+10% de ouro dos monstros', base: 35, grow: 1.5, max: 10 },
  pet:     { group: 'mago',   name: 'Treino do Pet', icon: 'paw', desc: '+25% de dano do pet', base: 35, grow: 1.45, max: 10 },
  // castelo
  wall:    { group: 'castelo', name: 'Muralha',       icon: 'wall', desc: '+25% de vida máxima do castelo', base: 32, grow: 1.4, max: 15 },
  barrier: { group: 'castelo', name: 'Barreira Mágica', icon: 'shield', desc: 'Escudo que absorve dano e recarrega', base: 55, grow: 1.5, max: 10 },
  thorns:  { group: 'castelo', name: 'Espinhos Arcanos', icon: 'thorns', desc: 'Reflete dano em quem ataca a muralha', base: 45, grow: 1.5, max: 10 },
};
const upCost = (id, lvl) => Math.round(UPGRADES[id].base * Math.pow(UPGRADES[id].grow, lvl));

/* ---------- Armadilhas (cada espaço do caminho tem 1 tipo fixo) ---------- */
const TRAPS = {
  spikes: { name: 'Espinhos',      icon: 'spikes', color: '#c0c6d6', cost: 55,  desc: 'Fere quem passa por cima.' },
  frost:  { name: 'Runa de Gelo',  icon: 'rfrost', color: '#7fe0ff', cost: 70,  desc: 'Deixa os inimigos lentos.' },
  fire:   { name: 'Runa de Fogo',  icon: 'rfire',  color: '#ff7a1a', cost: 80,  desc: 'Incendeia quem pisa nela.' },
  bomb:   { name: 'Bomba Arcana',  icon: 'bomb',   color: '#ff4d6d', cost: 100, desc: 'Explode com inimigos por perto (recarrega).' },
};
const TRAP_ORDER = ['spikes', 'frost', 'fire', 'bomb'];
const TRAP_X = [136, 196, 260, 330];
const TRAP_MAX = 5;
const trapCost = (type, lvl) => Math.round(TRAPS[type].cost * (lvl === 0 ? 1 : Math.pow(1.6, lvl)));

/* ---------- Aliados (suportes que ficam no castelo) ---------- */
const ALLIES = {
  archer:    { name: 'Arqueiro',          icon: 'bow',      unlock: 90,  base: 70,  grow: 1.5,  max: 8, x: 58, cy: 96, desc: 'Dispara flechas rápidas no inimigo mais próximo.' },
  frostmage: { name: 'Aprendiz de Gelo',  icon: 'snow',     unlock: 190, base: 120, grow: 1.5,  max: 8, x: 70, cy: 96, desc: 'Estilhaços de gelo que deixam os inimigos lentos.' },
  ballista:  { name: 'Balista',           icon: 'ballista', unlock: 230, base: 140, grow: 1.55, max: 8, x: 84, cy: 96, desc: 'Virote pesado que atravessa vários inimigos.' },
  cleric:    { name: 'Clérigo',           icon: 'cross',    unlock: 150, base: 100, grow: 1.5,  max: 8, x: 40, cy: 30, desc: 'Cura o castelo aos poucos e atira luz sagrada.' },
};
const allyCost = (id, l) => l === 0 ? ALLIES[id].unlock : Math.round(ALLIES[id].base * Math.pow(ALLIES[id].grow, l - 1));
const allyStats = (id, l) => {
  const g = l - 1;
  switch (id) {
    case 'archer':    return { dmg: 7 * (1 + .35 * g), cd: .85 / (1 + .09 * g), n: l >= 5 ? 2 : 1 };
    case 'frostmage': return { dmg: 6 * (1 + .3 * g), cd: 1.5 / (1 + .08 * g), slow: .3 + .03 * g, dur: 1.6 };
    case 'ballista':  return { dmg: 40 * (1 + .4 * g), cd: 3.4 / (1 + .07 * g), pierce: 2 + Math.floor(l / 3) };
    case 'cleric':    return { heal: .012 + .004 * l, cd: 4.2, dmg: 6 * (1 + .3 * g), hcd: 1.9 / (1 + .06 * g) };
  }
};
const allyText = (id, l) => {
  const s = allyStats(id, l);
  switch (id) {
    case 'archer':    return `Dano ${Math.round(s.dmg)} · ${(1 / s.cd).toFixed(1)} tiros/s`;
    case 'frostmage': return `Dano ${Math.round(s.dmg)} · lentidão ${Math.round(s.slow * 100)}%`;
    case 'ballista':  return `Dano ${Math.round(s.dmg)} · atravessa ${s.pierce}`;
    case 'cleric':    return `Cura ${(s.heal * 100).toFixed(1)}% a cada ${s.cd}s`;
  }
};

/* ---------- Cartas (modo infinito / boss rush) ---------- */
const CARDS = [
  { id: 'power',   name: 'Poder Arcano',       rar: 0, icon: 'wand',   desc: '+20% de dano global.' },
  { id: 'cadence', name: 'Cadência',           rar: 0, icon: 'chev',   desc: '+15% de velocidade de ataque.' },
  { id: 'multi',   name: 'Projéteis Duplos',   rar: 1, icon: 'multi',  desc: '+1 projétil no ataque básico.', max: 3 },
  { id: 'pierce',  name: 'Perfurante',         rar: 1, icon: 'pierce', desc: 'Projéteis atravessam +1 inimigo.', max: 4 },
  { id: 'crit',    name: 'Olho Arcano',        rar: 0, icon: 'crit',   desc: '+10% de chance de crítico.' },
  { id: 'fireR',   name: 'Fogo: Explosão',     rar: 0, icon: 'fire',   desc: 'Bola de Fogo com +25% de área.', req: 'fire' },
  { id: 'fireB',   name: 'Fogo: Brasas',       rar: 0, icon: 'fire',   desc: 'Queimadura +50% mais forte.', req: 'fire' },
  { id: 'fireD',   name: 'Fogo: Dupla',        rar: 2, icon: 'fire',   desc: 'Lança uma bola de fogo extra.', req: 'fire', max: 3 },
  { id: 'frostF',  name: 'Gelo: Congelar',     rar: 1, icon: 'frost',  desc: '+20% de chance de congelar tudo.', req: 'frost', max: 5 },
  { id: 'frostC',  name: 'Gelo: Geada',        rar: 0, icon: 'frost',  desc: 'Nova de Gelo recarrega 20% mais rápido.', req: 'frost', max: 4 },
  { id: 'boltC',   name: 'Raio: Cadeia',       rar: 1, icon: 'bolt',   desc: 'Relâmpago salta +2 vezes.', req: 'bolt' },
  { id: 'boltS',   name: 'Raio: Tempestade',   rar: 2, icon: 'bolt',   desc: 'Relâmpago +40% de dano e recarga 20% menor.', req: 'bolt', max: 3 },
  { id: 'metR',    name: 'Meteoro: Chuva',     rar: 1, icon: 'meteor', desc: '+2 meteoros por chuva.', req: 'meteor' },
  { id: 'metP',    name: 'Meteoro: Cratera',   rar: 0, icon: 'meteor', desc: '+30% de dano dos meteoros.', req: 'meteor' },
  { id: 'poisA',   name: 'Veneno: Corrosivo',  rar: 0, icon: 'poison', desc: 'Nuvem venenosa com +40% de dano.', req: 'poison' },
  { id: 'poisB',   name: 'Veneno: Densa',      rar: 1, icon: 'poison', desc: 'Nuvem 30% maior e 30% mais longa.', req: 'poison', max: 3 },
  { id: 'rootA',   name: 'Raízes: Espinhos',   rar: 0, icon: 'roots',  desc: 'Raízes com +50% de dano.', req: 'roots' },
  { id: 'rootB',   name: 'Raízes: Enredar',    rar: 1, icon: 'roots',  desc: '+1 inimigo preso e +0,6s de duração.', req: 'roots', max: 3 },
  { id: 'lightH',  name: 'Luz: Bênção',        rar: 1, icon: 'light',  desc: 'Luz Sagrada cura +40%.', req: 'light', max: 3 },
  { id: 'lightR',  name: 'Luz: Radiante',      rar: 0, icon: 'light',  desc: 'Luz Sagrada +40% de dano e recarga 15% menor.', req: 'light', max: 3 },
  { id: 'allyUp',  name: 'Treino de Aliados',  rar: 1, icon: 'ally',   desc: '+30% de dano e velocidade dos aliados.', ally: true, max: 4 },
  { id: 'trap',    name: 'Armadilhas Afiadas', rar: 0, icon: 'spikes', desc: '+40% de dano das armadilhas.' },
  { id: 'regen',   name: 'Muralha Viva',       rar: 1, icon: 'heart',  desc: 'Castelo regenera 1 de vida por segundo.' },
  { id: 'greed',   name: 'Chuva de Ouro',      rar: 0, icon: 'coin',   desc: '+25% de ouro.' },
  { id: 'siphon',  name: 'Sifão de Vida',      rar: 2, icon: 'drop',   desc: 'Cada morte cura 1 de vida do castelo.', max: 5 },
  { id: 'thorn',   name: 'Reflexo',            rar: 0, icon: 'thorns', desc: '+10 de dano refletido.' },
  { id: 'pet',     name: 'Pet Furioso',        rar: 0, icon: 'paw',    desc: '+50% de dano do pet.' },
  { id: 'shield',  name: 'Cúpula',             rar: 1, icon: 'shield', desc: '+60 de escudo máximo.' },
];
const RARITY = [{ n: 'Comum', c: '#8fd3ff' }, { n: 'Rara', c: '#c58bff' }, { n: 'Épica', c: '#ffc857' }];

/* ---------- Mapas ---------- */
const MAPS = [
  { id: 'plain',  name: 'Planície Verde',    desc: 'Slimes, goblins e morcegos.',            hp: 1.0, gold: 1.0, start: 60,
    pool: [['slime', 1], ['goblin', 2], ['bat', 3], ['skeleton', 7]], boss: 0, amb: 'clouds', seed: 11,
    sky: ['#4aa8e8', '#86caf2', '#c8ecfa'], far: '#8bb3dc', mid: 'hills', midc: ['#4f9a45', '#3c7f38', '#2f6a2f'], gnd: ['#5ab04a', '#4b9a3c', '#8a5e38', '#6d4628'], orb: { x: 380, y: 52, r: 14, c: '#fff3b0', g: 'rgba(255,240,170,.25)' } },
  { id: 'forest', name: 'Floresta Sombria',  desc: 'Goblins, esqueletos e bruxas à espreita.', hp: 1.15, gold: 1.2, start: 100,
    pool: [['goblin', 1], ['bat', 2], ['skeleton', 3], ['witch', 6], ['ogre', 9]], boss: 1, amb: 'fireflies', seed: 23,
    sky: ['#24405a', '#3f6b78', '#8fb094'], far: '#31566a', mid: 'pines', midc: ['#1d4a34', '#153a28', '#0f2e20'], gnd: ['#3d7a3a', '#2f6430', '#5e4630', '#46321f'], orb: { x: 90, y: 60, r: 11, c: '#e8f0d0', g: 'rgba(220,240,200,.18)' } },
  { id: 'grave',  name: 'Cemitério Assombrado', desc: 'Mortos-vivos e magia sombria.',         hp: 1.3, gold: 1.4, start: 150,
    pool: [['skeleton', 1], ['bat', 1], ['goblin', 1], ['witch', 3], ['ogre', 5], ['darkmage', 7]], boss: 2, amb: 'wisps', seed: 37, stars: true,
    sky: ['#0e0a22', '#211844', '#4b3a78'], far: '#2a2150', mid: 'graves', midc: ['#2c2a44', '#232038', '#1a182b'], gnd: ['#4b5a4e', '#3a483e', '#4a4150', '#322b38'], orb: { x: 360, y: 56, r: 16, c: '#e6e3ff', g: 'rgba(190,180,255,.22)' } },
  { id: 'mount',  name: 'Montanha dos Ogros', desc: 'Ogros, trolls e muito músculo.',          hp: 1.5, gold: 1.65, start: 220,
    pool: [['goblin', 1], ['skeleton', 1], ['bat', 2], ['ogre', 3], ['witch', 5], ['troll', 6], ['darkmage', 8]], boss: 4, amb: 'clouds', seed: 49,
    sky: ['#d9644f', '#f0a65c', '#f8dc98'], far: '#a5586a', mid: 'crags', midc: ['#7a6275', '#5f4a63', '#473650'], gnd: ['#a08a6c', '#8a7658', '#6b5642', '#4f3e30'], orb: { x: 120, y: 74, r: 22, c: '#fff1c2', g: 'rgba(255,220,150,.3)' } },
  { id: 'volcano', name: 'Reino das Trevas',  desc: 'O Rei Demônio e seu exército.',          hp: 1.8, gold: 1.9, start: 300,
    pool: [['skeleton', 1], ['goblin', 1], ['witch', 1], ['ogre', 2], ['troll', 4], ['darkmage', 5]], boss: 7, amb: 'embers', seed: 61,
    sky: ['#1a050c', '#561220', '#d1501c'], far: '#3c0f1a', mid: 'volcano', midc: ['#2a1218', '#1d0c12', '#12070b'], gnd: ['#4a3a3e', '#352a2d', '#2a2022', '#1a1315'], orb: { x: 240, y: 40, r: 18, c: '#ff4d2a', g: 'rgba(255,80,40,.28)' } },
];
const CAMPAIGN_WAVES = 10;

/* ---------- Loja permanente (gemas) ---------- */
const SKINS = {
  mage: [
    { id: 'apprentice', name: 'Aprendiz',   cost: 0,   desc: 'Sem bônus.' },
    { id: 'pyro',       name: 'Piromante',  cost: 60,  desc: '+20% dano de fogo e queimadura.' },
    { id: 'cryo',       name: 'Criomante',  cost: 60,  desc: 'Lentidão e congelamento mais fortes.' },
    { id: 'necro',      name: 'Necromante', cost: 100, desc: '+12% ouro e cura 0,5 por morte.' },
    { id: 'archmage',   name: 'Arquimago',  cost: 200, desc: '+8% de dano em tudo.' },
  ],
  castle: [
    { id: 'stone',    name: 'Pedra Clássica', cost: 0,   desc: 'O bom e velho castelo.' },
    { id: 'crystal',  name: 'Cristal Gélido', cost: 50,  desc: 'Muralhas de cristal azul.' },
    { id: 'dark',     name: 'Fortaleza Sombria', cost: 80, desc: 'Torres violeta e janelas mágicas.' },
    { id: 'volcanic', name: 'Forja Vulcânica', cost: 90, desc: 'Pedra negra e brasas.' },
    { id: 'gold',     name: 'Palácio Dourado', cost: 120, desc: 'Digno de um arquimago.' },
  ],
  pet: [
    { id: 'none',   name: 'Sem pet',        cost: 0,  desc: '' },
    { id: 'slimey', name: 'Slimezinho',     cost: 30, desc: 'Cospe gosma venenosa.' },
    { id: 'fairy',  name: 'Fada Faísca',    cost: 40, desc: 'Dispara faíscas rápidas.' },
    { id: 'owl',    name: 'Coruja Gélida',  cost: 60, desc: 'Seus tiros deixam lento.' },
    { id: 'dragon', name: 'Dragãozinho',    cost: 80, desc: 'Cospe fogo que queima.' },
  ],
};
/* ---------- Escala de dificuldade ---------- */
const waveScale = w => 1 + 0.12 * (w - 1) + 0.008 * (w - 1) * (w - 1);

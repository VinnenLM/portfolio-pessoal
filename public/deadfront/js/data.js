/* Deadfront - dados estáticos: armas, zumbis, mapas, loja */
(function () {
  const DF = (window.DF = window.DF || {});
  DF.TILE = 48;

  // ---------- Armas ----------
  // dmg por tiro, rate = intervalo entre tiros (s), mag = pente, reload (s), spread (rad), pellets, pierce, range (px), speed (px/s)
  DF.WEAPONS = {
    pistol:  { name: 'Pistola',   dmg: 20, rate: 0.30, mag: 12, reload: 1.0, spread: 0.04, pellets: 1, pierce: 1, range: 520, speed: 950, reserve: Infinity, price: 0,   color: '#bfc5c9', icon: '🔫', muzzle: 30 },
    smg:     { name: 'SMG',       dmg: 11, rate: 0.085, mag: 30, reload: 1.5, spread: 0.12, pellets: 1, pierce: 1, range: 480, speed: 950, reserve: 120, price: 150, color: '#d6c27a', icon: '🔫', muzzle: 36 },
    shotgun: { name: 'Escopeta',  dmg: 12, rate: 0.85, mag: 6,  reload: 1.8, spread: 0.32, pellets: 7, pierce: 1, range: 330, speed: 850, reserve: 36,  price: 260, color: '#c98b5a', icon: '💥', muzzle: 48 },
    rifle:   { name: 'Fuzil',     dmg: 22, rate: 0.115, mag: 30, reload: 1.7, spread: 0.07, pellets: 1, pierce: 1, range: 640, speed: 1050, reserve: 150, price: 420, color: '#8fb36b', icon: '🔫', muzzle: 46 },
    sniper:  { name: 'Sniper',    dmg: 90, rate: 0.75, mag: 5,  reload: 2.0, spread: 0.01, pellets: 1, pierce: 4, range: 900, speed: 1500, reserve: 30,  price: 650, color: '#7fb4d6', icon: '🎯', muzzle: 58 }
  };
  DF.WEAPON_ORDER = ['pistol', 'smg', 'shotgun', 'rifle', 'sniper'];

  // ---------- Barricadas ----------
  DF.MATERIALS = {
    wood:  { name: 'Madeira', hp: 130, cost: 8,  color: '#9a6b3a', dark: '#6b4624', icon: '🪵' },
    iron:  { name: 'Ferro',   hp: 380, cost: 22, color: '#8d96a0', dark: '#59616a', icon: '🔩' },
    steel: { name: 'Aço',     hp: 900, cost: 50, color: '#6fa0c8', dark: '#3c6286', icon: '🛡️' }
  };
  DF.MATERIAL_ORDER = ['wood', 'iron', 'steel'];

  // ---------- Armadilhas ----------
  DF.TRAPS = {
    spike: { name: 'Espinhos',  icon: '✴️', desc: 'Fere quem pisa' },
    mine:  { name: 'Mina',      icon: '💣', desc: 'Explode ao contato' },
    bear:  { name: 'Armadilha de urso', icon: '🪤', desc: 'Prende o zumbi' }
  };
  DF.TRAP_ORDER = ['spike', 'mine', 'bear'];

  // ---------- Zumbis ----------
  // hp base (multiplicado pela dificuldade da fase), speed px/s, r raio, dmg contra jogador, bdmg contra barricada
  DF.ZOMBIES = {
    walker:  { name: 'Zumbi',    hp: 55,  speed: 58,  r: 14, dmg: 9,  bdmg: 14, cd: 0.9, color: '#6fa05a', scrap: 2 },
    runner:  { name: 'Corredor', hp: 32,  speed: 118, r: 12, dmg: 7,  bdmg: 9,  cd: 0.7, color: '#a8b24a', scrap: 2 },
    spitter: { name: 'Cuspidor', hp: 48,  speed: 52,  r: 14, dmg: 6,  bdmg: 8,  cd: 0.9, color: '#4fb0a0', scrap: 3, ranged: true },
    brute:   { name: 'Bruto',    hp: 280, speed: 40,  r: 21, dmg: 22, bdmg: 46, cd: 1.1, color: '#8a5a4a', scrap: 6 },
    // bosses
    boss_smasher: { name: 'Colosso',        hp: 5600, speed: 66, r: 30, dmg: 34, bdmg: 100,  cd: 1.0, color: '#7a4a3a', scrap: 40, boss: 'smasher' },
    boss_charger: { name: 'Alfa Predador',  hp: 6200, speed: 92, r: 26, dmg: 30, bdmg: 90,  cd: 0.9, color: '#a04040', scrap: 40, boss: 'charger' },
    boss_spitter: { name: 'Rainha Ácida',   hp: 7000, speed: 66, r: 28, dmg: 24, bdmg: 70,  cd: 1.0, color: '#3f9a8a', scrap: 40, boss: 'summoner' },
    boss_mega:    { name: 'Patient Zero',   hp: 11000, speed: 80, r: 32, dmg: 38, bdmg: 120, cd: 0.9, color: '#6a3a7a', scrap: 60, boss: 'mega' }
  };

  // ---------- Mapas ----------
  // rooms: retângulos interiores (área segura). doors: [lado, offset, largura] relativo à sala.
  // walls: retângulos de parede internos. obst: [x,y,w,h,tipo] obstáculos (bloqueiam jogador, zumbis e tiros).
  DF.LEVELS = [
    {
      id: 'mansion', name: 'Mansão Blackwood', blurb: 'Uma mansão antiga cercada pela floresta. Poucas entradas, mas elas são largas.',
      w: 38, h: 26, waves: 5, hpScale: 1.0, countScale: 1.0, boss: 'boss_smasher', start: [19, 12],
      theme: { floor: '#6b4f3a', floor2: '#5f4532', wall: '#241a13', wallTop: '#3a2b20', out: '#2c4a2a', out2: '#264024', dark: 0.55 },
      rooms: [{ x: 8, y: 5, w: 22, h: 14, doors: [['N', 4, 2], ['N', 16, 2], ['W', 6, 2], ['E', 6, 2]] }],
      walls: [[18, 5, 1, 4], [18, 15, 1, 4]],
      obst: [[11, 8, 3, 2, 'table'], [23, 8, 3, 2, 'table'], [10, 14, 2, 2, 'piano'], [24, 14, 4, 1, 'sofa'], [14, 5, 2, 1, 'shelf'], [22, 5, 2, 1, 'shelf'], [20, 16, 2, 2, 'crate']]
    },
    {
      id: 'airport', name: 'Aeroporto Internacional', blurb: 'Terminal amplo e um saguão ao sul. Mais portas para vigiar.',
      w: 40, h: 28, waves: 6, hpScale: 1.3, countScale: 1.15, boss: 'boss_charger', start: [20, 11],
      theme: { floor: '#7d8288', floor2: '#6f747a', wall: '#22262b', wallTop: '#3b4148', out: '#3a3d40', out2: '#34373a', dark: 0.45 },
      rooms: [
        { x: 5, y: 6, w: 30, h: 9, doors: [['N', 6, 3], ['N', 20, 3], ['W', 3, 2], ['E', 3, 2]] },
        { x: 14, y: 15, w: 12, h: 5, doors: [['S', 5, 2]] }
      ],
      walls: [],
      obst: [[8, 8, 8, 1, 'counter'], [24, 8, 8, 1, 'counter'], [8, 12, 4, 1, 'seats'], [14, 12, 4, 1, 'seats'], [22, 12, 4, 1, 'seats'], [28, 12, 4, 1, 'seats'], [18, 9, 4, 2, 'belt'], [16, 17, 2, 2, 'crate'], [22, 17, 2, 2, 'crate']]
    },
    {
      id: 'barracks', name: 'Quartel Militar', blurb: 'Paredes grossas, portões largos e muitos zumbis. Segure a linha.',
      w: 40, h: 30, waves: 6, hpScale: 1.6, countScale: 1.3, boss: 'boss_spitter', start: [20, 14],
      theme: { floor: '#6a7058', floor2: '#5f654f', wall: '#1d2018', wallTop: '#33382b', out: '#3d4a2e', out2: '#374429', dark: 0.5 },
      rooms: [{ x: 8, y: 6, w: 24, h: 16, doors: [['N', 4, 3], ['N', 17, 3], ['S', 3, 3], ['S', 18, 3], ['W', 6, 3], ['E', 6, 3]] }],
      walls: [[10, 13, 5, 1], [25, 13, 5, 1], [19, 6, 1, 3], [19, 19, 1, 3]],
      obst: [[12, 8, 4, 2, 'truck'], [24, 8, 4, 2, 'truck'], [12, 17, 4, 2, 'truck'], [24, 17, 4, 2, 'truck'], [17, 11, 6, 1, 'sandbag'], [17, 16, 6, 1, 'sandbag'], [10, 10, 1, 2, 'crate'], [29, 10, 1, 2, 'crate']]
    },
    {
      id: 'hospital', name: 'Hospital St. Mercy', blurb: 'Duas alas ligadas por um corredor. A origem do surto está aqui.',
      w: 42, h: 30, waves: 7, hpScale: 1.95, countScale: 1.5, boss: 'boss_mega', start: [19, 13],
      theme: { floor: '#9aa8a6', floor2: '#8b9997', wall: '#222a2a', wallTop: '#3d4a4a', out: '#2a3a36', out2: '#253431', dark: 0.62 },
      rooms: [
        { x: 6, y: 6, w: 12, h: 16, doors: [['N', 5, 2], ['W', 7, 2], ['S', 5, 2]] },
        { x: 24, y: 6, w: 12, h: 16, doors: [['N', 5, 2], ['E', 7, 2], ['S', 5, 2]] },
        { x: 18, y: 12, w: 6, h: 4, doors: [] }
      ],
      walls: [],
      obst: [[8, 9, 2, 3, 'bed'], [14, 9, 2, 3, 'bed'], [8, 16, 2, 3, 'bed'], [14, 16, 2, 3, 'bed'], [26, 9, 2, 3, 'bed'], [32, 9, 2, 3, 'bed'], [26, 16, 2, 3, 'bed'], [32, 16, 2, 3, 'bed'], [11, 13, 2, 1, 'cart'], [29, 13, 2, 1, 'cart']]
    }
  ];

  // ---------- Skins ----------
  DF.SKINS = [
    { id: 'default', name: 'Sobrevivente', price: 0,   body: '#3d6fb5', head: '#e0b48c', hair: '#4a3224', acc: 'none' },
    { id: 'camo',    name: 'Camuflado',    price: 120, body: '#55663a', head: '#d9a97f', hair: '#2d2218', acc: 'cap',     accColor: '#3f4d2b' },
    { id: 'red',     name: 'Vermelho Sangue', price: 160, body: '#a82a2a', head: '#e0b48c', hair: '#1c1c1c', acc: 'band',  accColor: '#111' },
    { id: 'swat',    name: 'SWAT',         price: 300, body: '#23272e', head: '#c99d78', hair: '#222', acc: 'helmet',  accColor: '#3b4350' },
    { id: 'neon',    name: 'Neon',         price: 380, body: '#16c7a6', head: '#f0c9a4', hair: '#7a2a6a', acc: 'visor',   accColor: '#ff3df0' },
    { id: 'gold',    name: 'Veterano Dourado', price: 700, body: '#c79a2c', head: '#e6bd96', hair: '#d8d0c0', acc: 'crown', accColor: '#ffe27a' }
  ];

  // ---------- Melhorias (loja) ----------
  // cada nível custa base * (nível+1)
  DF.UPGRADES = [
    { id: 'hp',      name: 'Vida máxima',        desc: '+15 de vida por nível',            max: 5, base: 70,  icon: '❤️' },
    { id: 'speed',   name: 'Velocidade',         desc: '+6% de velocidade por nível',      max: 4, base: 80,  icon: '👟' },
    { id: 'reload',  name: 'Recarga rápida',     desc: '-10% no tempo de recarga',         max: 4, base: 90,  icon: '⚡' },
    { id: 'ammo',    name: 'Munição extra',      desc: '+25% de munição inicial',          max: 4, base: 80,  icon: '🎒' },
    { id: 'barrier', name: 'Barricadas reforçadas', desc: '+20% de vida das barricadas',   max: 5, base: 90,  icon: '🧱' },
    { id: 'scrap',   name: 'Sucata inicial',     desc: '+30 de sucata ao começar',         max: 5, base: 60,  icon: '🔧' },
    { id: 'medkit',  name: 'Kit médico',         desc: '+8 de cura e +1 kit inicial/2 níveis', max: 4, base: 100, icon: '🩹' },
    { id: 'loot',    name: 'Loot mais frequente',desc: 'Caixas aparecem mais rápido',      max: 4, base: 110, icon: '📦' }
  ];
  DF.WEAPON_UP_MAX = 5; // nível de upgrade por arma: +12% dano por nível
  DF.weaponUpCost = (id, lvl) => Math.round((DF.WEAPONS[id].price * 0.5 + 60) * (lvl + 1));
  DF.STEEL_PRICE = 220;

  // ---------- Torres automáticas ----------
  DF.TOWERS = {
    mg:      { name: 'Metralhadora', cost: 55,  price: 180, hp: 170, range: 340, dmg: 8,   rate: 0.11, desc: 'Rajadas rápidas de balas. Boa contra quase tudo.' },
    flame:   { name: 'Lança-chamas', cost: 80,  price: 320, hp: 210, range: 150, dmg: 6,   rate: 0.07, desc: 'Queima todos na frente. Curto alcance.' },
    bazooka: { name: 'Bazuca',       cost: 125, price: 520, hp: 150, range: 430, dmg: 130, rate: 1.7,  splash: 85, desc: 'Foguete com explosão em área. Lento, mas devastador.' }
  };
  DF.TOWER_ORDER = ['mg', 'flame', 'bazooka'];
  DF.TOWER_MAX = 5;
  DF.TOWER_UP_MAX = 5; // +15% de dano e +5% de cadência por nível
  DF.towerUpCost = (id, lvl) => Math.round(DF.TOWERS[id].price * 0.45 + 50) * (lvl + 1);

  // ---------- Ícones SVG ----------
  const S = '<svg class="wico" viewBox="0 0 72 32" xmlns="http://www.w3.org/2000/svg" stroke="#0b0d0b" stroke-width="1.2" stroke-linejoin="round">';
  const WSVG = {
    pistol: S + '<rect x="14" y="8" width="40" height="9" rx="2" fill="#c9ced2"/><rect x="54" y="10" width="7" height="5" fill="#8b9298"/><polygon points="18,17 32,17 29,30 20,30" fill="#3b3f44"/><path d="M32 17q0 6-6 6" fill="none"/><rect x="16" y="5" width="4" height="3" fill="#8b9298"/><rect x="49" y="5" width="3" height="3" fill="#8b9298"/></svg>',
    smg: S + '<rect x="2" y="10" width="11" height="6" fill="#3b3f44"/><rect x="12" y="9" width="38" height="9" rx="2" fill="#d6c27a"/><rect x="14" y="6" width="28" height="3" fill="#8b9298"/><rect x="50" y="10" width="16" height="7" fill="#6d7479"/><rect x="66" y="12" width="5" height="3" fill="#8b9298"/><rect x="26" y="18" width="7" height="13" fill="#2b2e32"/><polygon points="38,18 45,18 43,29 37,29" fill="#3b3f44"/></svg>',
    shotgun: S + '<polygon points="2,12 14,10 14,21 4,27" fill="#8a5a32"/><rect x="14" y="8" width="12" height="12" fill="#3b3f44"/><rect x="26" y="9" width="44" height="4" fill="#8b9298"/><rect x="26" y="14" width="36" height="3" fill="#6d7479"/><rect x="34" y="13" width="15" height="7" rx="2" fill="#c98b5a"/><polygon points="20,20 27,20 25,29 19,29" fill="#2b2e32"/></svg>',
    rifle: S + '<polygon points="2,10 17,11 17,20 2,23" fill="#3b3f44"/><rect x="17" y="9" width="22" height="11" fill="#8fb36b"/><rect x="20" y="5" width="14" height="4" fill="#4a5156"/><rect x="39" y="10" width="18" height="8" fill="#4a5156"/><rect x="57" y="12" width="14" height="3" fill="#8b9298"/><polygon points="26,20 33,20 35,31 28,31" fill="#2b2e32"/><polygon points="37,20 43,20 41,28 36,28" fill="#3b3f44"/></svg>',
    sniper: S + '<polygon points="2,11 22,11 22,20 2,25" fill="#8a5a32"/><rect x="22" y="10" width="16" height="9" fill="#4a5156"/><rect x="38" y="12" width="33" height="3" fill="#8b9298"/><rect x="24" y="3" width="24" height="6" rx="2" fill="#1f2326"/><rect x="46" y="4" width="3" height="4" fill="#7fb4d6"/><path d="M50 15L45 29M53 15L58 29" fill="none" stroke="#8b9298" stroke-width="2"/></svg>'
  };
  const TS = '<svg class="wico tico" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" stroke="#0b0d0b" stroke-width="1.2" stroke-linejoin="round">';
  const TSVG = {
    mg: TS + '<circle cx="18" cy="20" r="11" fill="#6d7479"/><circle cx="18" cy="20" r="6" fill="#c9a15a"/><rect x="22" y="14" width="16" height="4" fill="#2b2e32"/><rect x="22" y="22" width="16" height="4" fill="#2b2e32"/></svg>',
    flame: TS + '<circle cx="16" cy="20" r="11" fill="#6d7479"/><rect x="8" y="12" width="14" height="16" rx="4" fill="#c0392b"/><rect x="22" y="17" width="9" height="6" fill="#2b2e32"/><path d="M31 20q3-6 8-2q-3 2-3 2q3 2 3 4q-5 4-8-4z" fill="#ff9f1c"/></svg>',
    bazooka: TS + '<circle cx="16" cy="20" r="11" fill="#5a6247"/><rect x="6" y="15" width="30" height="10" rx="3" fill="#7a8a55"/><rect x="2" y="13" width="7" height="14" fill="#2b2e32"/><circle cx="36" cy="20" r="4" fill="#d9a441"/></svg>'
  };
  DF.weaponSVG = (id) => WSVG[id] || '';
  DF.towerSVG = (id) => TSVG[id] || '';
})();

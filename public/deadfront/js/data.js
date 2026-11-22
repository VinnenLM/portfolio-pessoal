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
    revolver:{ name: 'Revólver',  dmg: 58, rate: 0.5,  mag: 6,  reload: 1.6, spread: 0.025, pellets: 1, pierce: 2, range: 560, speed: 1100, reserve: 48,  price: 200,  color: '#d9d9d9', icon: '🔫', muzzle: 36 },
    ak:      { name: 'AK-47',     dmg: 32, rate: 0.13, mag: 30, reload: 1.9, spread: 0.09, pellets: 1, pierce: 1, range: 620, speed: 1050, reserve: 150, price: 520,  color: '#d9a15a', icon: '🔫', muzzle: 48 },
    minigun: { name: 'Minigun',   dmg: 15, rate: 0.05, mag: 120, reload: 3.6, spread: 0.16, pellets: 1, pierce: 1, range: 520, speed: 1000, reserve: 360, price: 950,  color: '#b0b8be', icon: '🔫', muzzle: 48 },
    flamer:  { name: 'Lança-chamas', kind: 'flame', dmg: 7, rate: 0.06, mag: 80, reload: 2.4, spread: 0, pellets: 1, pierce: 1, range: 175, speed: 0, reserve: 240, price: 780, color: '#ff9f1c', icon: '🔥', muzzle: 42 },
    rpg:     { name: 'Lança-foguetes', kind: 'rocket', dmg: 120, rate: 1.1, mag: 2, reload: 2.4, spread: 0, pellets: 1, pierce: 1, range: 560, speed: 420, splash: 90, reserve: 14, price: 1100, color: '#7a8a55', icon: '🚀', muzzle: 44 },
    sniper:  { name: 'Sniper',    dmg: 90, rate: 0.75, mag: 5,  reload: 2.0, spread: 0.01, pellets: 1, pierce: 4, range: 900, speed: 1500, reserve: 30,  price: 650, color: '#7fb4d6', icon: '🎯', muzzle: 58 }
  };
  DF.WEAPON_ORDER = ['pistol', 'revolver', 'smg', 'shotgun', 'rifle', 'ak', 'flamer', 'sniper', 'minigun', 'rpg'];

  // ---------- Barricadas ----------
  DF.MATERIALS = {
    wood:  { name: 'Madeira', hp: 130, cost: 8,  color: '#9a6b3a', dark: '#6b4624', icon: '' },
    iron:  { name: 'Ferro',   hp: 380, cost: 22, color: '#8d96a0', dark: '#59616a', icon: '' },
    steel: { name: 'Aço',     hp: 900, cost: 50, color: '#6fa0c8', dark: '#3c6286', icon: '' }
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
    bomber:  { name: 'Explosivo', hp: 85,  speed: 60,  r: 16, dmg: 8,  bdmg: 16, cd: 0.9, color: '#c8602a', scrap: 3, bomb: true },
    carrier: { name: 'Hospedeiro', hp: 140, speed: 48, r: 17, dmg: 10, bdmg: 18, cd: 1.0, color: '#b9a58a', scrap: 4, brood: true },
    worm:    { name: 'Verme',    hp: 14,  speed: 108, r: 6,  dmg: 4,  bdmg: 3,  cd: 0.6, color: '#d9a0a0', scrap: 0 },
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

  // Mapas de ondas: escala 1.5x em cada eixo (área ~2.25x maior)
  (function () {
    const K = 1.5, r = (v) => Math.round(v * K);
    DF.LEVELS.forEach((lv) => {
      lv.w = r(lv.w); lv.h = r(lv.h); lv.start = [r(lv.start[0]), r(lv.start[1])];
      lv.rooms = lv.rooms.map((q) => ({ x: r(q.x), y: r(q.y), w: r(q.w), h: r(q.h), doors: q.doors.map(([sd, off, wd]) => [sd, r(off), wd + 1]) }));
      lv.walls = lv.walls.map(([x, y, w, h]) => [r(x), r(y), w === 1 ? 1 : r(w), h === 1 ? 1 : r(h)]);
      lv.obst = lv.obst.map(([x, y, w, h, t]) => [r(x), r(y), w === 1 ? 1 : r(w), h === 1 ? 1 : r(h), t]);
    });
  })();

  // Missão: corredor longo e linear, do terminal ao helicóptero (sempre para leste)
  DF.LEVELS.push({
    id: 'airport-run', name: 'Aeroporto: Fuga', mission: true, open: true, unlock: 3,
    blurb: 'Siga em linha reta pelo aeroporto até o helicóptero. Chefe no final.',
    w: 152, h: 40, waves: 1, hpScale: 1.5, countScale: 1, boss: 'boss_charger', start: [6, 19],
    theme: { floor: '#7d8288', floor2: '#70757b', wall: '#22262b', wallTop: '#3b4148', out: '#4a4d50', out2: '#44474a', dark: 0.5 },
    rooms: [
      { x: 3, y: 8, w: 40, h: 24, doors: [['E', 10, 3]] },
      { x: 56, y: 9, w: 36, h: 22, doors: [['W', 9, 3], ['E', 9, 3]] },
      { x: 105, y: 10, w: 22, h: 20, doors: [['W', 8, 3], ['E', 8, 3]] }
    ],
    walls: [[49, 1, 1, 17], [49, 21, 1, 18], [98, 1, 1, 17], [98, 21, 1, 18], [132, 1, 1, 17], [132, 21, 1, 18]],
    gates: [{ x: 49, y: 18, h: 3 }, { x: 98, y: 18, h: 3 }, { x: 132, y: 18, h: 3 }],
    heli: { x: 144.5, y: 19.5, call: 6 },
    keys: [{ x: 26.5, y: 12.5 }, { x: 80.5, y: 24.5 }, { x: 110.5, y: 23.5 }],
    obst: [
      [49, 18, 1, 3, 'gate'], [98, 18, 1, 3, 'gate'], [132, 18, 1, 3, 'gate'],
      [6, 10, 10, 1, 'counter'], [24, 10, 10, 1, 'counter'], [6, 29, 10, 1, 'counter'], [24, 29, 10, 1, 'counter'],
      [8, 14, 4, 1, 'seats'], [16, 14, 4, 1, 'seats'], [28, 14, 4, 1, 'seats'], [8, 25, 4, 1, 'seats'], [18, 25, 4, 1, 'seats'], [30, 25, 4, 1, 'seats'],
      [20, 27, 6, 2, 'belt'], [37, 11, 2, 2, 'crate'], [37, 27, 2, 2, 'crate'],
      [60, 11, 10, 4, 'plane'], [76, 11, 8, 3, 'plane'], [60, 26, 10, 4, 'plane'], [76, 27, 9, 3, 'plane'], [87, 14, 2, 2, 'crate'], [87, 24, 2, 2, 'crate'], [72, 15, 2, 1, 'crate'], [72, 25, 2, 1, 'crate'],
      [108, 12, 4, 1, 'counter'], [118, 12, 4, 1, 'counter'], [108, 27, 4, 1, 'counter'], [118, 27, 4, 1, 'counter'], [113, 15, 2, 2, 'crate'], [113, 23, 2, 2, 'crate'],
      [45, 12, 3, 2, 'truck'], [45, 26, 3, 2, 'truck'], [52, 16, 1, 2, 'barrier'], [52, 23, 1, 2, 'barrier'],
      [94, 13, 3, 3, 'tank'], [94, 26, 3, 2, 'truck'], [101, 16, 1, 2, 'barrier'], [101, 23, 1, 2, 'barrier'],
      [136, 9, 9, 3, 'plane'], [136, 28, 9, 3, 'plane'], [129, 15, 1, 2, 'barrier'], [129, 23, 1, 2, 'barrier'], [139, 14, 2, 1, 'crate'], [139, 25, 2, 1, 'crate']
    ],
    decor: [['pad', 144.5, 19.5], ['dash', 129, 19, 12, 0.18, '#e8e8e8'], ['dash', 4, 19, 38, 0.1, '#e6c13a']],
    objectives: [
      { type: 'pickup', key: 0, x: 26.5, y: 12.5, text: 'Pegue o cartão de acesso no terminal' },
      { type: 'reach', gate: 0, x: 47.5, y: 19.5, text: 'Abra o portão leste com o cartão' },
      { type: 'pickup', key: 1, x: 80.5, y: 24.5, text: 'Pegue o cartão no hangar' },
      { type: 'reach', gate: 1, x: 96.5, y: 19.5, text: 'Abra o portão do pátio' },
      { type: 'pickup', key: 2, x: 110.5, y: 23.5, text: 'Pegue o cartão na torre de controle' },
      { type: 'reach', gate: 2, x: 130.5, y: 19.5, text: 'Abra o portão da pista' },
      { type: 'boss', x: 138.5, y: 19.5, r: 9, text: 'Derrote o chefe!' },
      { type: 'reach', x: 144.5, y: 19.5, text: 'Embarque no helicóptero!', win: true }
    ],
    groups: [
      { x: 18, y: 19, n: 8, trig: 15 }, { x: 30, y: 21, n: 9, trig: 14 }, { x: 40, y: 19, n: 7, trig: 13 },
      { x: 46, y: 21, n: 10, trig: 14 }, { x: 66, y: 19, n: 9, trig: 14 }, { x: 80, y: 20, n: 11, trig: 14 }, { x: 90, y: 19, n: 8, trig: 13 },
      { x: 94, y: 20, n: 10, trig: 14 }, { x: 110, y: 19, n: 10, trig: 14 }, { x: 120, y: 20, n: 9, trig: 13 }, { x: 126, y: 19, n: 8, trig: 13 },
      { x: 134, y: 17, n: 9, trig: 13 }, { x: 134, y: 22, n: 9, trig: 13 }
    ]
  });

  // ---------- Skins ----------
  DF.SKINS = [
    { id: 'default', name: 'Sobrevivente', price: 0,   body: '#3d6fb5', head: '#e0b48c', hair: '#4a3224', acc: 'none' },
    { id: 'camo',    name: 'Camuflado',    price: 120, body: '#55663a', head: '#d9a97f', hair: '#2d2218', acc: 'cap',     accColor: '#3f4d2b' },
    { id: 'red',     name: 'Vermelho Sangue', price: 160, body: '#a82a2a', head: '#e0b48c', hair: '#1c1c1c', acc: 'band',  accColor: '#111' },
    { id: 'swat',    name: 'SWAT',         price: 300, body: '#23272e', head: '#c99d78', hair: '#222', acc: 'helmet',  accColor: '#3b4350' },
    { id: 'neon',    name: 'Neon',         price: 380, body: '#16c7a6', head: '#f0c9a4', hair: '#7a2a6a', acc: 'visor',   accColor: '#ff3df0' },
    { id: 'clown',   name: 'Palhaço',      price: 450, body: '#1fa5b8', head: '#ffffff', hair: '#ffffff', acc: 'clown', accColor: '#e53935', boots: '#d4141c' }
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
    { id: 'gfrag',   name: 'Granadas comuns',    desc: '+1 granada comum ao começar',     max: 5, base: 60,  icon: '💣' },
    { id: 'gfire',   name: 'Granadas de fogo',   desc: '+1 granada de fogo ao começar',   max: 4, base: 120, icon: '🔥' },
    { id: 'gholy',   name: 'Granadas santas',    desc: '+1 granada santa ao começar',     max: 3, base: 260, icon: '✝️' },
    { id: 'loot',    name: 'Loot mais frequente',desc: 'Caixas aparecem mais rápido',      max: 4, base: 110, icon: '📦' }
  ];
  DF.WEAPON_UP_MAX = 5; // nível de upgrade por arma: +12% dano por nível
  DF.weaponUpCost = (id, lvl) => Math.round((DF.WEAPONS[id].price * 0.5 + 60) * (lvl + 1));
  DF.STEEL_PRICE = 220;

  // ---------- Granadas ----------
  DF.GRENADES = {
    frag: { name: 'Granada',          r: 115, dmg: 170, color: '#7a8a55' },
    fire: { name: 'Granada de fogo',  r: 105, dmg: 50,  color: '#e2592b' },
    holy: { name: 'Granada Santa',    r: 270, dmg: 560, color: '#ffe9a0' }
  };
  DF.GRENADE_ORDER = ['frag', 'fire', 'holy'];

  // ---------- Torres automáticas ----------
  DF.TOWERS = {
    mg:      { name: 'Metralhadora', cost: 55,  price: 180, hp: 170, range: 340, dmg: 8,   rate: 0.11, mag: 140, desc: 'Rajadas rápidas de balas. Boa contra quase tudo. Munição limitada: chegue perto para reabastecer.' },
    flame:   { name: 'Lança-chamas', cost: 80,  price: 320, hp: 210, range: 150, dmg: 6,   rate: 0.07, mag: 170, desc: 'Queima todos na frente. Curto alcance.' },
    bazooka: { name: 'Bazuca',       cost: 125, price: 520, hp: 150, range: 430, dmg: 130, rate: 1.7,  splash: 85, mag: 14, desc: 'Foguete com explosão em área. Lento, mas devastador.' }
  };
  DF.TOWER_ORDER = ['mg', 'flame', 'bazooka'];
  // torres exclusivas do Engenheiro
  DF.TOWERS.tesla = { name: 'Tesla', cost: 70, price: 0, hp: 160, range: 250, dmg: 26, rate: 0.6, chain: 3, mag: 45, eng: true, desc: 'Raio que salta entre zumbis. Só do Engenheiro.' };
  DF.TOWERS.railgun = { name: 'Sniper', cost: 95, price: 0, hp: 130, range: 640, dmg: 110, rate: 1.25, mag: 14, eng: true, desc: 'Tiro perfurante de longo alcance. Só do Engenheiro.' };
  DF.ENG_TOWERS = ['tesla', 'railgun'];
  DF.ALL_TOWERS = DF.TOWER_ORDER.concat(DF.ENG_TOWERS);
  // ---------- Classes ----------
  DF.CLASSES = {
    fighter:   { name: 'Combatente', desc: '+20% de dano com todas as armas. Habilidade: Fúria (8s com +80% de dano, tiro 2x mais rápido e munição infinita).', skill: 'Fúria', cd: 35, cost: 0, color: '#d4541c' },
    medic:     { name: 'Médico', desc: '+2 kits médicos e cura mais forte. Habilidade: Caixa de cura em área (cura quem estiver perto).', skill: 'Caixa de cura', cd: 18, cost: 30, color: '#3ddc84' },
    engineer:  { name: 'Engenheiro', desc: 'Torres mais baratas e fortes, +2 torres, torres exclusivas (Tesla, Sniper). Habilidade: Caixa de munição (reabastece em área você e as torres).', skill: 'Caixa de munição', cd: 15, cost: 40, color: '#4d9fff' },
    grenadier: { name: 'Granadeiro', desc: 'Granadas 50% mais fortes e maiores, gera granadas sozinho (a cada 8s sem nenhuma) e zumbis dropam mais granadas. Habilidade: Bombardeio.', skill: 'Bombardeio', cd: 25, cost: 0, color: '#c9a227' }
  };
  DF.CLASS_ORDER = ['fighter', 'medic', 'engineer', 'grenadier'];
  DF.LASER_PRICE = 350;
  DF.TOWER_MAX = 5;
  DF.TOWER_UP_MAX = 5; // +15% de dano e +5% de cadência por nível
  DF.towerUpCost = (id, lvl) => Math.round(DF.TOWERS[id].price * 0.45 + 50) * (lvl + 1);


  // ---------- Habilidades do modo infinito (escolha a cada 3 ondas e após cada chefe) ----------
  DF.PERKS = [
    { id: 'dmg',    name: 'Mais dano',         desc: '+15% de dano com todas as armas',          icon: '💥', max: 6 },
    { id: 'rate',   name: 'Cadência',          desc: 'Atira 10% mais rápido',                    icon: '⚡', max: 5 },
    { id: 'reload', name: 'Recarga veloz',     desc: '-15% no tempo de recarga',                 icon: '🔄', max: 4 },
    { id: 'ammo',   name: 'Mais munição',      desc: '+40% de munição reserva das armas agora', icon: '🎒', max: 5 },
    { id: 'speed',  name: 'Pernas rápidas',    desc: '+8% de velocidade',                        icon: '👟', max: 5 },
    { id: 'hp',     name: 'Vida extra',        desc: '+25 de vida máxima e cura 25',             icon: '❤️', max: 6 },
    { id: 'regen',  name: 'Regeneração',       desc: 'Recupera 1 de vida por segundo (por nível)', icon: '✚', max: 3 },
    { id: 'slot',   name: 'Slot de torre',     desc: '+1 torre ao mesmo tempo',                  icon: '🗼', max: 4 },
    { id: 'tdmg',   name: 'Torres reforçadas', desc: '+25% de dano das torres',                  icon: '🔫', max: 4 },
    { id: 'medkit', name: 'Kit médico',        desc: '+2 kits agora e curam +10 a mais',         icon: '🩹', max: 4 },
    { id: 'gren',   name: 'Arsenal de granadas', desc: '+3 granadas comuns e +1 de fogo',        icon: '💣', max: 4 },
    { id: 'scrap',  name: 'Catador',           desc: '+100 de sucata agora e +25% de sucata por zumbi', icon: '🔧', max: 4 },
    { id: 'wall',   name: 'Barricadas duras',  desc: '+30% de vida das barricadas',              icon: '🧱', max: 4 }
  ];
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
  WSVG.revolver = S + '<polygon points="14,12 28,12 28,18 24,30 14,30" fill="#6b4524"/><rect x="22" y="9" width="30" height="7" rx="2" fill="#d0d4d8"/><rect x="50" y="10" width="15" height="5" fill="#8b9298"/><circle cx="27" cy="12" r="7" fill="#9aa2a8"/><rect x="18" y="6" width="4" height="3" fill="#8b9298"/></svg>';
  WSVG.ak = S + '<polygon points="2,10 18,11 18,20 2,24" fill="#8a5a32"/><rect x="18" y="9" width="22" height="10" fill="#3b3f44"/><rect x="40" y="10" width="16" height="8" fill="#8a5a32"/><rect x="56" y="12" width="14" height="3" fill="#8b9298"/><polygon points="27,19 35,19 40,31 31,31" fill="#2b2e32"/><polygon points="42,18 48,18 47,27 42,27" fill="#3b3f44"/></svg>';
  WSVG.minigun = S + '<rect x="2" y="14" width="9" height="15" fill="#7a8a55"/><rect x="9" y="8" width="17" height="14" rx="2" fill="#4a5156"/><rect x="26" y="8" width="42" height="3" fill="#b0b8be"/><rect x="26" y="13" width="42" height="3" fill="#b0b8be"/><rect x="26" y="18" width="42" height="3" fill="#b0b8be"/><rect x="48" y="6" width="4" height="17" fill="#6d7479"/><polygon points="14,22 21,22 19,30 13,30" fill="#2b2e32"/></svg>';
  WSVG.flamer = S + '<circle cx="14" cy="17" r="10" fill="#c0392b"/><circle cx="14" cy="17" r="5" fill="#e2594a"/><rect x="24" y="12" width="26" height="9" rx="2" fill="#2b2e32"/><rect x="50" y="9" width="12" height="15" fill="#6d7479"/><path d="M62 16q4-7 9-1q-3 2-3 2q3 2 3 4q-6 3-9-5z" fill="#ff9f1c"/><polygon points="30,21 36,21 34,30 29,30" fill="#3b3f44"/></svg>';
  WSVG.rpg = S + '<rect x="2" y="7" width="9" height="17" fill="#2b2e32"/><rect x="8" y="9" width="54" height="13" rx="3" fill="#7a8a55"/><ellipse cx="64" cy="15.5" rx="7" ry="6" fill="#c0392b"/><polygon points="30,22 37,22 35,31 29,31" fill="#3b3f44"/><rect x="40" y="5" width="10" height="4" fill="#4a5156"/></svg>';
  DF.weaponSVG = (id) => realize(WSVG[id]) || '';
  const I = '<svg class="wico ico" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke="#0b0d0b" stroke-width="1.2" stroke-linejoin="round">';
  const MSVG = {
    wood: I + '<rect x="2" y="3" width="20" height="5" fill="#9a6b3a"/><rect x="2" y="9.5" width="20" height="5" fill="#b27d44"/><rect x="2" y="16" width="20" height="5" fill="#9a6b3a"/><circle cx="5" cy="5.5" r=".9" fill="#ddd"/><circle cx="19" cy="18.5" r=".9" fill="#ddd"/></svg>',
    iron: I + '<rect x="2" y="2" width="20" height="20" rx="2" fill="#8d96a0"/><path d="M2 2L22 22M22 2L2 22" stroke="#59616a" stroke-width="2"/><circle cx="5" cy="5" r="1.2" fill="#ddd"/><circle cx="19" cy="5" r="1.2" fill="#ddd"/><circle cx="5" cy="19" r="1.2" fill="#ddd"/><circle cx="19" cy="19" r="1.2" fill="#ddd"/></svg>',
    steel: I + '<rect x="2" y="2" width="20" height="20" rx="3" fill="#6fa0c8"/><rect x="6" y="6" width="12" height="12" fill="none" stroke="#3c6286" stroke-width="2"/><rect x="4" y="3.5" width="16" height="3" fill="rgba(255,255,255,.35)" stroke="none"/></svg>'
  };
  const TRSVG = {
    spike: I + '<circle cx="12" cy="12" r="3" fill="#6d7479"/><path d="M12 1l2 8-2 3-2-3zM12 23l2-8-2-3-2 3zM1 12l8-2 3 2-3 2zM23 12l-8-2-3 2 3 2zM4 4l6 4 1 3-3-1zM20 20l-6-4-1-3 3 1zM20 4l-4 6-3 1 1-3zM4 20l4-6 3-1-1 3z" fill="#c9ced2"/></svg>',
    mine: I + '<circle cx="12" cy="13" r="9" fill="#3a3d40"/><circle cx="12" cy="13" r="4" fill="#d4141c"/><rect x="10" y="2" width="4" height="4" fill="#6d7479"/></svg>',
    bear: I + '<path d="M3 14a9 9 0 0 1 18 0" fill="none" stroke="#c9ced2" stroke-width="3"/><path d="M3 14l3 5 2-5 2 5 2-5 2 5 2-5 2 5 3-5" fill="none" stroke="#c9ced2" stroke-width="1.6"/><rect x="10" y="12" width="4" height="4" fill="#6b7075"/></svg>'
  };
  const GSVG = {
    frag: I + '<ellipse cx="12" cy="14" rx="7" ry="8" fill="#7a8a55"/><rect x="9" y="3" width="6" height="4" fill="#4a5156"/><path d="M5 12h14M5 16h14M9 7l-1 14M15 7l1 14" stroke="#4d5a3a" stroke-width="1" fill="none"/><circle cx="19" cy="5" r="2" fill="none" stroke="#c9ced2" stroke-width="1.4"/></svg>',
    fire: I + '<ellipse cx="12" cy="14" rx="7" ry="8" fill="#c0392b"/><rect x="9" y="3" width="6" height="4" fill="#4a5156"/><path d="M12 8q4 3 1 7q-1-3-3-2q-2 3 2 6q-6-1-5-6q2-2 3-5z" fill="#ffb347"/></svg>',
    holy: I + '<ellipse cx="12" cy="14" rx="7" ry="8" fill="#f1e2a4"/><rect x="9" y="3" width="6" height="4" fill="#c9a15a"/><path d="M10.4 9h3.2v3h3v3.2h-3V20h-3.2v-4.8h-3V12h3z" fill="#b3141c" stroke="none"/></svg>'
  };
  DF.matSVG = (id) => realize(MSVG[id]) || '';
  DF.trapSVG = (id) => realize(TRSVG[id]) || '';
  DF.grenSVG = (id) => realize(GSVG[id]) || '';
  TSVG.tesla = TS + '<circle cx="18" cy="20" r="11" fill="#3b4f6b"/><circle cx="18" cy="20" r="6" fill="#4d9fff"/><path d="M22 12l6 6-5 1 7 9" fill="none" stroke="#bfe3ff" stroke-width="2.4"/><circle cx="18" cy="20" r="2.6" fill="#fff"/></svg>';
  TSVG.railgun = TS + '<circle cx="14" cy="20" r="10" fill="#4a5156"/><rect x="8" y="17" width="30" height="6" rx="2" fill="#9aa2a8"/><rect x="4" y="15" width="8" height="10" fill="#2b2e32"/><rect x="20" y="12" width="8" height="4" fill="#4d9fff"/></svg>';
  const CSV = {
    fighter: I + '<circle cx="12" cy="12" r="10" fill="#d4541c"/><path d="M7 15l5-9 5 9-5-2z" fill="#ffd27a"/><path d="M12 8v6" stroke="#7a2a08" stroke-width="1.6"/></svg>',
    medic: I + '<circle cx="12" cy="12" r="10" fill="#e8f5ec"/><path d="M10 5h4v5h5v4h-5v5h-4v-5H5v-4h5z" fill="#d4141c" stroke="none"/></svg>',
    engineer: I + '<circle cx="12" cy="12" r="10" fill="#3a6fb8"/><path d="M7 16l6-6a3.5 3.5 0 1 1 3 3l-6 6z" fill="#e8c840"/><circle cx="15.5" cy="8.5" r="1.4" fill="#2b2e32"/></svg>',
    grenadier: I + '<circle cx="12" cy="12" r="10" fill="#8a7a2a"/><ellipse cx="12" cy="14" rx="5" ry="6" fill="#7a8a55"/><rect x="10" y="5" width="4" height="3" fill="#4a5156"/></svg>'
  };
  DF.classSVG = (id) => realize(CSV[id]) || '';
  // ---------- realismo: gradiente metálico automático em todos os ícones ----------
  let gid = 0;
  function realize(svg) {
    if (!svg) return svg; const U = 'u' + (++gid) + '_';
    const cols = {}; svg.replace(/fill="(#[0-9a-fA-F]{6})"/g, (m, c) => { cols[c.toLowerCase()] = 1; return m; });
    const mix = (c, a) => { const n = parseInt(c.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, v + a)); return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')'; };
    let defs = '<defs>';
    for (const c in cols) defs += '<linearGradient id="' + U + c.slice(1) + '" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="' + mix(c, 38) + '"/><stop offset="0.5" stop-color="' + c + '"/><stop offset="1" stop-color="' + mix(c, -42) + '"/></linearGradient>';
    defs += '</defs>';
    return svg.replace(/fill="(#[0-9a-fA-F]{6})"/g, (m, c) => 'fill="url(#' + U + c.slice(1).toLowerCase() + ')"').replace(/(<svg[^>]*>)/, '$1' + defs);
  }
  DF.towerSVG = (id) => realize(TSVG[id]) || '';
})();

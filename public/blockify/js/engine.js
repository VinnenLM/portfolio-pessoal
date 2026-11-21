// Motor do jogo: porta fiel do GameEngine.kt do app Android.
// Mesmas regras, mesmos números e as mesmas 1000 fases (gerador idêntico ao do Kotlin).

import { KRandom, randomSeed } from "./random.js";

export const GRID = 8;
export const TOTAL_LEVELS = 1000;
export const COLOR_COUNT = 8;
export const MAX_BONUS = 9;

export const KIND_NORMAL = 0;
export const KIND_BONUS = 1; // bloco forte que guarda um bônus
export const KIND_GEM = 2; // bloco forte que é objetivo da fase
export const KIND_STONE = 3; // pedra comum (modo difícil)
export const SPECIAL_HP = 2;

export const STONE_EVERY = 5000;

export const Mode = { LEVELS: "LEVELS", INFINITE: "INFINITE", HARD: "HARD" };
export const isEndless = (m) => m !== Mode.LEVELS;

export const Goal = { SCORE: "SCORE", GEMS: "GEMS" };

export const Bonus = [
  { id: 0, key: "ROTATE", icon: "🔄", label: "Girar", hint: "Toque nas peças para girar. O bônus só é gasto ao encaixar a peça girada" },
  { id: 1, key: "LINE", icon: "➖", label: "Linha", hint: "Toque numa linha do tabuleiro para cortá-la" },
  { id: 2, key: "BOMB", icon: "💣", label: "Bomba", hint: "Toque onde a bomba vai explodir (3x3)" },
  { id: 3, key: "SHUFFLE", icon: "🔀", label: "Trocar", hint: "" },
];
export const ROTATE = 0, LINE = 1, BOMB = 2, SHUFFLE = 3;
const BONUS_COUNT = 4;

const RULES = {
  NORMAL: { lines: 3, combo: 10, scoreStep: 5000 },
  HARD: { lines: 4, combo: 15, scoreStep: 8000 },
};
const rulesOf = (mode) => (mode === Mode.HARD ? RULES.HARD : RULES.NORMAL);

// ---------------------------------------------------------------- peças

export class Piece {
  constructor(cells, color) {
    this.cells = cells; // [{r, c}] normalizadas e ordenadas
    this.color = color;
    this.rows = Math.max(...cells.map((c) => c.r)) + 1;
    this.cols = Math.max(...cells.map((c) => c.c)) + 1;
  }
  get size() { return this.cells.length; }
  key() { return this.cells.map((c) => `${c.r},${c.c}`).join(";"); }
  rotated() {
    return new Piece(Piece.normalize(this.cells.map((c) => ({ r: c.c, c: this.rows - 1 - c.r }))), this.color);
  }
  static normalize(cells) {
    const minR = Math.min(...cells.map((c) => c.r));
    const minC = Math.min(...cells.map((c) => c.c));
    return cells.map((c) => ({ r: c.r - minR, c: c.c - minC })).sort((a, b) => a.r - b.r || a.c - b.c);
  }
  static parse(pattern, color) {
    const cells = [];
    pattern.split("/").forEach((line, r) => {
      [...line].forEach((ch, c) => { if (ch === "X") cells.push({ r, c }); });
    });
    return new Piece(Piece.normalize(cells), color);
  }
}

export const Shapes = {
  defs: [
    { pattern: "X", weight: 2, fromLevel: 1, name: "quadradinho" },
    { pattern: "XX", weight: 4, fromLevel: 1, name: "dupla" },
    { pattern: "XXX", weight: 4, fromLevel: 1, name: "barra de 3" },
    { pattern: "XX/XX", weight: 4, fromLevel: 1, name: "quadrado 2x2" },
    { pattern: "X./XX", weight: 4, fromLevel: 1, name: "L pequeno" },
    { pattern: "XXXX", weight: 3, fromLevel: 5, name: "barra de 4" },
    { pattern: "X./X./XX", weight: 3, fromLevel: 10, name: "L" },
    { pattern: "XXX/.X.", weight: 3, fromLevel: 15, name: "T" },
    { pattern: "XXX/XXX", weight: 2, fromLevel: 25, name: "retângulo 2x3" },
    { pattern: ".XX/XX.", weight: 2, fromLevel: 30, name: "S" },
    { pattern: "XX./.XX", weight: 2, fromLevel: 30, name: "Z" },
    { pattern: "XXXXX", weight: 2, fromLevel: 40, name: "barra de 5" },
    { pattern: "X../X../XXX", weight: 2, fromLevel: 50, name: "L grande" },
    { pattern: "X./.X", weight: 1, fromLevel: 70, name: "diagonal" },
    { pattern: "XXX/XXX/XXX", weight: 1, fromLevel: 100, name: "quadrado 3x3" },
  ],
  random(rng, level = Infinity) {
    const pool = this.defs.filter((d) => d.fromLevel <= level);
    let roll = rng.nextInt(pool.reduce((s, d) => s + d.weight, 0));
    let def = pool[pool.length - 1];
    for (const d of pool) {
      if (roll < d.weight) { def = d; break; }
      roll -= d.weight;
    }
    let piece = Piece.parse(def.pattern, 1 + rng.nextInt(COLOR_COUNT));
    const turns = rng.nextInt(4);
    for (let i = 0; i < turns; i++) piece = piece.rotated();
    return piece;
  },
  unlockedAt(level) {
    return level <= 1 ? [] : this.defs.filter((d) => d.fromLevel === level);
  },
};

export function levelSpec(level) {
  const d = level - 1;
  const tier = Math.min(d, 40);
  const wave = d % 10;
  const gemLevel = level >= 3 && level % 3 === 0;
  const bonusBlocks = level >= 2 && level % 4 === 2 ? (wave >= 7 ? 2 : 1) : 0;
  const idiv = (a, b) => Math.trunc(a / b);
  return {
    level,
    goal: gemLevel ? Goal.GEMS : Goal.SCORE,
    targetScore: 250 + tier * 40 + wave * 25,
    gems: gemLevel ? 2 + idiv(tier, 15) + idiv(wave, 4) : 0,
    bonusBlocks,
    prefilled: gemLevel ? Math.min(3 + idiv(tier, 3) + idiv(wave, 2), 16) : Math.min(5 + idiv(tier, 2) + wave, 26),
  };
}

const grid = () => Array.from({ length: GRID }, () => new Array(GRID).fill(0));

// ---------------------------------------------------------------- motor

export class GameEngine {
  constructor(mode, { level = 1, startBonuses = null, seed = randomSeed(), infiniteBonus = false, freeRotate } = {}) {
    this.mode = mode;
    this.level = level;
    this.infiniteBonus = infiniteBonus;
    this.freeRotate = freeRotate ?? mode === Mode.INFINITE;
    this.rng = new KRandom(seed);

    this.spec = mode === Mode.LEVELS ? levelSpec(level) : null;
    this.goal = this.spec ? this.spec.goal : Goal.SCORE;

    this.board = grid();
    this.kind = grid();
    this.hp = grid();
    this.bonusIn = grid();

    this.tray = [null, null, null];
    this.trayRot = [0, 0, 0];
    this.trayOrig = [null, null, null];
    this.reserve = new Array(BONUS_COUNT).fill(0);
    this.bonuses = startBonuses
      ? Array.from({ length: BONUS_COUNT }, (_, i) => Math.min(MAX_BONUS, Math.max(0, startBonuses[i] ?? 0)))
      : new Array(BONUS_COUNT).fill(1);

    this.score = 0;
    this.combo = 0;
    this.linesTotal = 0;
    this.elapsedMs = 0;
    this.target = this.spec ? this.spec.targetScore : 0;
    this.gemsTotal = this.spec ? this.spec.gems : 0;
    this.gemsLeft = 0;
    this.levelComplete = false;
    this.gameOver = false;
    this.stuck = false;
    this.movesSinceClear = 0;
    this.rules = rulesOf(mode);
    this.nextScoreBonus = this.rules.scoreStep;
    this.nextStoneAt = STONE_EVERY;
    this.shapeLevel = mode === Mode.LEVELS ? level : Infinity;
    this.autoRefill = true;

    if (this.spec) this.generateLevel(this.spec);
    this.refillTray();
    this.updateState();
  }

  // ---------- fases ----------

  lineSpecials(r, c) {
    let row = 0, col = 0;
    for (let i = 0; i < GRID; i++) {
      if (this.kind[r][i] !== KIND_NORMAL && this.board[r][i] !== 0) row++;
      if (this.kind[i][c] !== KIND_NORMAL && this.board[i][c] !== 0) col++;
    }
    return row < 2 && col < 2;
  }

  lineHasRoom(r, c) {
    let row = 0, col = 0;
    for (let i = 0; i < GRID; i++) {
      if (this.board[r][i] !== 0) row++;
      if (this.board[i][c] !== 0) col++;
    }
    return row < GRID - 2 && col < GRID - 2;
  }

  generateLevel(s) {
    const lr = new KRandom(s.level * 7919 + 17);
    const placeSpecial = (k, count) => {
      let placed = 0, attempts = 0;
      while (placed < count && attempts < 3000) {
        attempts++;
        const r = lr.nextInt(GRID);
        const c = lr.nextInt(GRID);
        if (this.board[r][c] !== 0 || !this.lineSpecials(r, c) || !this.lineHasRoom(r, c)) continue;
        this.board[r][c] = 1 + lr.nextInt(COLOR_COUNT);
        this.kind[r][c] = k;
        this.hp[r][c] = SPECIAL_HP;
        if (k === KIND_BONUS) this.bonusIn[r][c] = this.weightedBonus(lr);
        placed++;
      }
      if (k === KIND_GEM) this.gemsLeft = placed;
    };
    placeSpecial(KIND_GEM, s.gems);
    placeSpecial(KIND_BONUS, s.bonusBlocks);

    let placed = 0, attempts = 0;
    while (placed < s.prefilled && attempts < 3000) {
      attempts++;
      const r = lr.nextInt(GRID);
      const c = lr.nextInt(GRID);
      if (this.board[r][c] !== 0 || !this.lineHasRoom(r, c)) continue;
      this.board[r][c] = 1 + lr.nextInt(COLOR_COUNT);
      placed++;
    }
  }

  // ---------- salvar / retomar ----------

  static pieceStr(p) {
    return p == null ? "-" : `${p.color}:` + p.cells.map((c) => `${c.r}${c.c}`).join(".");
  }
  static parsePiece(s) {
    if (s === "-") return null;
    const [color, cells] = s.split(":");
    return new Piece(cells.split(".").map((x) => ({ r: +x[0], c: +x[1] })), +color);
  }
  static gridStr(g) { return g.map((row) => row.join(",")).join(","); }
  static parseGrid(s, g) {
    const v = s.split(",").map(Number);
    if (v.length !== GRID * GRID || v.some((n) => !Number.isInteger(n))) throw new Error("grid");
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) g[r][c] = v[r * GRID + c];
  }

  saveState() {
    const E = GameEngine;
    return [
      ["v", "1"], ["mode", this.mode], ["ib", this.infiniteBonus ? "1" : "0"], ["level", this.level],
      ["score", this.score], ["combo", this.combo], ["lines", this.linesTotal], ["time", Math.floor(this.elapsedMs)],
      ["gems", this.gemsLeft], ["msc", this.movesSinceClear], ["nsb", this.nextScoreBonus], ["nst", this.nextStoneAt],
      ["board", E.gridStr(this.board)], ["kind", E.gridStr(this.kind)], ["hp", E.gridStr(this.hp)], ["bin", E.gridStr(this.bonusIn)],
      ["tray", this.tray.map(E.pieceStr).join(";")], ["orig", this.trayOrig.map(E.pieceStr).join(";")],
      ["bonus", this.bonuses.join(",")],
    ].map(([k, v]) => `${k}=${v}`).join("|");
  }

  applyState(m) {
    const int = (k) => { const n = parseInt(m[k], 10); if (Number.isNaN(n)) throw new Error(k); return n; };
    this.score = int("score");
    this.combo = int("combo");
    this.linesTotal = int("lines");
    this.elapsedMs = int("time");
    this.gemsLeft = int("gems");
    this.movesSinceClear = int("msc");
    this.nextScoreBonus = (Math.trunc(this.score / this.rules.scoreStep) + 1) * this.rules.scoreStep;
    this.nextStoneAt = m.nst != null ? int("nst") : (Math.trunc(this.score / STONE_EVERY) + 1) * STONE_EVERY;
    GameEngine.parseGrid(m.board, this.board);
    GameEngine.parseGrid(m.kind, this.kind);
    GameEngine.parseGrid(m.hp, this.hp);
    GameEngine.parseGrid(m.bin, this.bonusIn);
    const t = m.tray.split(";").map(GameEngine.parsePiece);
    const o = m.orig.split(";").map(GameEngine.parsePiece);
    for (let i = 0; i < 3; i++) { this.tray[i] = t[i]; this.trayOrig[i] = o[i]; this.trayRot[i] = 0; }
    if (this.tray.every((p) => p == null)) this.refillTray();
    m.bonus.split(",").map(Number).forEach((v, i) => { if (i < BONUS_COUNT) this.bonuses[i] = v; });
    this.gameOver = false;
    this.levelComplete = false;
    this.checkLevelGoal();
    this.updateState();
  }

  static parseMap(s) {
    const m = {};
    for (const kv of s.split("|")) {
      const i = kv.indexOf("=");
      if (i > 0) m[kv.slice(0, i)] = kv.slice(i + 1);
    }
    return m;
  }

  static restore(state, mode, level, infiniteBonus) {
    try {
      const m = GameEngine.parseMap(state);
      if (m.v !== "1" || m.mode !== mode) return null;
      if (mode === Mode.LEVELS && parseInt(m.level, 10) !== level) return null;
      const e = new GameEngine(mode, { level, infiniteBonus: infiniteBonus || m.ib === "1" });
      e.applyState(m);
      return e.gameOver || e.levelComplete ? null : e;
    } catch (err) {
      return null;
    }
  }

  static peekScore(state) {
    if (!state) return null;
    const n = parseInt(GameEngine.parseMap(state).score, 10);
    return Number.isNaN(n) ? null : n;
  }

  // ---------- cenário montado (tutorial) ----------

  loadScenario(filled, specials, pieces, bonusCounts) {
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
      this.board[r][c] = 0; this.kind[r][c] = KIND_NORMAL; this.hp[r][c] = 0; this.bonusIn[r][c] = 0;
    }
    for (const [r, c, color] of filled) this.board[r][c] = color;
    for (const s of specials) {
      if (this.board[s.r][s.c] === 0) this.board[s.r][s.c] = 7;
      this.kind[s.r][s.c] = s.kind;
      this.hp[s.r][s.c] = s.hp ?? SPECIAL_HP;
      this.bonusIn[s.r][s.c] = s.bonus ?? LINE;
    }
    for (let i = 0; i < 3; i++) {
      this.tray[i] = pieces[i] ?? null;
      this.trayOrig[i] = this.tray[i];
      this.trayRot[i] = 0;
    }
    for (let i = 0; i < BONUS_COUNT; i++) this.bonuses[i] = bonusCounts[i] ?? 0;
    this.combo = 0;
    this.movesSinceClear = 0;
    this.gameOver = false;
    this.levelComplete = false;
    this.updateState();
  }

  // ---------- peças ----------

  canPlace(p, row, col) {
    for (const cell of p.cells) {
      const r = row + cell.r, c = col + cell.c;
      if (r < 0 || c < 0 || r >= GRID || c >= GRID) return false;
      if (this.board[r][c] !== 0) return false;
    }
    return true;
  }

  fitsAnywhere(p) {
    for (let row = 0; row <= GRID - p.rows; row++)
      for (let col = 0; col <= GRID - p.cols; col++) if (this.canPlace(p, row, col)) return true;
    return false;
  }

  refillTray() {
    this.trayRot.fill(0);
    for (let attempt = 0; attempt < 40; attempt++) {
      const set = [0, 1, 2].map(() => Shapes.random(this.rng, this.shapeLevel));
      if (attempt === 39 || set.some((p) => this.fitsAnywhere(p))) {
        for (let i = 0; i < 3; i++) { this.tray[i] = set[i]; this.trayOrig[i] = set[i]; }
        return;
      }
    }
  }

  // ---------- golpes ----------

  hitCells(cells) {
    const removed = [], cracked = [], bonusesFromBlocks = [], gemsDestroyed = [];
    for (const cl of cells) {
      const { r, c } = cl;
      if (this.board[r][c] === 0) continue;
      if (this.kind[r][c] !== KIND_NORMAL && this.hp[r][c] > 1) {
        this.hp[r][c]--;
        cracked.push(cl);
        continue;
      }
      removed.push({ cell: cl, color: this.board[r][c] });
      if (this.kind[r][c] === KIND_BONUS) {
        const b = this.bonusIn[r][c];
        this.addBonus(b);
        bonusesFromBlocks.push({ cell: cl, bonus: b });
      } else if (this.kind[r][c] === KIND_GEM) {
        this.gemsLeft--;
        gemsDestroyed.push(cl);
      }
      this.board[r][c] = 0;
      this.kind[r][c] = KIND_NORMAL;
      this.hp[r][c] = 0;
      this.bonusIn[r][c] = 0;
    }
    return { removed, cracked, bonusesFromBlocks, gemsDestroyed, get hitCount() { return removed.length + cracked.length; } };
  }

  place(slot, row, col) {
    if (this.gameOver || this.levelComplete) return null;
    const p = this.tray[slot];
    if (!p || !this.canPlace(p, row, col)) return null;

    const usedRotation = this.isRotated(slot);
    if (usedRotation) this.consume(ROTATE);

    const placed = p.cells.map((c) => ({ r: row + c.r, c: col + c.c }));
    for (const c of placed) this.board[c.r][c.c] = p.color;
    this.tray[slot] = null;
    this.trayOrig[slot] = null;
    this.trayRot[slot] = 0;

    const fullRows = [], fullCols = [];
    for (let i = 0; i < GRID; i++) {
      if (this.board[i].every((v) => v !== 0)) fullRows.push(i);
      let colFull = true;
      for (let r = 0; r < GRID; r++) if (this.board[r][i] === 0) { colFull = false; break; }
      if (colFull) fullCols.push(i);
    }
    const lines = fullRows.length + fullCols.length;

    const seen = new Set(), toHit = [];
    const add = (r, c) => { const k = r * GRID + c; if (!seen.has(k)) { seen.add(k); toHit.push({ r, c }); } };
    fullRows.forEach((r) => { for (let c = 0; c < GRID; c++) add(r, c); });
    fullCols.forEach((c) => { for (let r = 0; r < GRID; r++) add(r, c); });
    const hit = this.hitCells(toHit);

    let points = placed.length;
    const earned = hit.bonusesFromBlocks.map((b) => b.bonus);
    let boardCleared = false;

    if (lines > 0) {
      this.combo++;
      this.movesSinceClear = 0;
      this.linesTotal += lines;
      points += 80 * lines * lines * Math.max(1, this.combo);
      points += hit.cracked.length * 10 + hit.gemsDestroyed.length * 50;
      if (this.board.every((line) => line.every((v) => v === 0))) {
        boardCleared = true;
        points += 500;
      }
      if (lines >= this.rules.lines) earned.push(this.grantRandom());
      if (this.combo >= this.rules.combo && this.combo % this.rules.combo === 0) earned.push(this.grantRandom());
    } else {
      this.movesSinceClear++;
      if (this.movesSinceClear >= 3) this.combo = 0;
    }

    this.score += points;
    while (this.score >= this.nextScoreBonus) {
      earned.push(this.grantRandom());
      this.nextScoreBonus += this.rules.scoreStep;
    }

    const stones = [];
    if (this.mode === Mode.HARD) while (this.score >= this.nextStoneAt) {
      stones.push(...this.spawnStones(this.stonesFor(this.nextStoneAt)));
      this.nextStoneAt += STONE_EVERY;
    }

    if (this.tray.every((t) => t == null) && this.autoRefill) this.refillTray();
    this.checkLevelGoal();
    this.updateState();

    return { placedCells: placed, hit, linesCleared: lines, points, combo: this.combo, boardCleared, bonusesEarned: earned, usedRotation, stones };
  }

  stonesFor(at) { return at >= 60000 ? 4 : at >= 25000 ? 3 : 2; }

  spawnStones(count) {
    const free = [];
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (this.board[r][c] === 0) free.push({ r, c });
    this.rng.shuffle(free);
    const out = [];
    for (const cl of free) {
      if (out.length >= count) break;
      const { r, c } = cl;
      if (!this.lineSpecials(r, c) || !this.lineHasRoom(r, c)) continue;
      this.board[r][c] = 1;
      this.kind[r][c] = KIND_STONE;
      this.hp[r][c] = SPECIAL_HP;
      const trayPieces = this.tray.filter((t) => t != null);
      if (trayPieces.length > 0 && !trayPieces.some((t) => this.fitsAnywhere(t))) {
        this.board[r][c] = 0; this.kind[r][c] = KIND_NORMAL; this.hp[r][c] = 0;
        continue;
      }
      out.push(cl);
    }
    return out;
  }

  checkLevelGoal() {
    if (this.mode !== Mode.LEVELS) return;
    this.levelComplete = this.goal === Goal.SCORE ? this.score >= this.target : this.gemsLeft <= 0;
  }

  // ---------- bônus ----------

  has(b) {
    return this.infiniteBonus || (b === ROTATE && this.freeRotate) || this.bonuses[b] > 0 || this.reserve[b] > 0;
  }
  available(b) { return this.bonuses[b] + this.reserve[b]; }
  canUse(b) { return this.has(b) && !this.gameOver && !this.levelComplete; }

  consume(b) {
    if (this.infiniteBonus || (b === ROTATE && this.freeRotate)) return;
    if (this.bonuses[b] > 0) this.bonuses[b]--;
    else if (this.reserve[b] > 0) this.reserve[b]--;
  }

  forceFail() {
    if (this.levelComplete) return;
    this.stuck = true;
    this.gameOver = true;
  }

  addBonus(b) { this.bonuses[b] = Math.min(MAX_BONUS, this.bonuses[b] + 1); }

  weightedBonus(r) {
    const n = r.nextInt(10);
    return n <= 2 ? ROTATE : n <= 5 ? LINE : n <= 7 ? BOMB : SHUFFLE;
  }

  grantRandom() {
    let b = this.weightedBonus(this.rng);
    while (this.freeRotate && b === ROTATE) b = this.weightedBonus(this.rng);
    this.addBonus(b);
    return b;
  }

  levelReward() { return this.grantRandom(); }

  rotatedCount() { return [0, 1, 2].filter((i) => this.isRotated(i)).length; }

  isRotated(slot) {
    const p = this.tray[slot], o = this.trayOrig[slot];
    if (!p || !o) return false;
    return p.key() !== o.key();
  }

  canRotate(slot) {
    const p = this.tray[slot];
    return !!p && p.rotated().key() !== p.key();
  }

  rotate(slot) {
    const p = this.tray[slot];
    if (!p || this.gameOver || this.levelComplete) return false;
    if (!this.canRotate(slot)) return false;
    if (!this.infiniteBonus && !this.freeRotate && !this.isRotated(slot) && this.rotatedCount() >= this.available(ROTATE)) return false;
    this.tray[slot] = p.rotated();
    this.trayRot[slot] = (this.trayRot[slot] + 1) % 4;
    this.updateState();
    return true;
  }

  useLine(row) {
    if (!this.canUse(LINE) || row < 0 || row >= GRID) return null;
    const cells = [];
    for (let c = 0; c < GRID; c++) if (this.board[row][c] !== 0) cells.push({ r: row, c });
    return this.useHit(cells, LINE);
  }

  useBomb(row, col) {
    if (!this.canUse(BOMB)) return null;
    const cells = [];
    for (let r = row - 1; r <= row + 1; r++)
      for (let c = col - 1; c <= col + 1; c++)
        if (r >= 0 && r < GRID && c >= 0 && c < GRID && this.board[r][c] !== 0) cells.push({ r, c });
    return this.useHit(cells, BOMB);
  }

  useHit(cells, b) {
    if (cells.length === 0) return null;
    this.consume(b);
    const hit = this.hitCells(cells);
    this.score += hit.hitCount * 2;
    this.checkLevelGoal();
    this.updateState();
    return hit;
  }

  useShuffle() {
    if (!this.canUse(SHUFFLE)) return false;
    this.consume(SHUFFLE);
    this.refillTray();
    this.updateState();
    return true;
  }

  // ---------- estado ----------

  updateState() {
    const noFit = !this.tray.some((p) => p != null && this.fitsAnywhere(p));
    this.stuck = !this.levelComplete && noFit;
    this.gameOver = this.gameOver || (this.stuck && !this.anyBonusCanHelp());
  }

  anyBonusCanHelp() {
    if (this.has(LINE) || this.has(BOMB) || this.has(SHUFFLE)) return true;
    if (!this.has(ROTATE)) return false;
    return this.tray.some((p) => {
      if (!p) return false;
      let q = p;
      for (let i = 0; i < 3; i++) { q = q.rotated(); if (this.fitsAnywhere(q)) return true; }
      return false;
    });
  }
}

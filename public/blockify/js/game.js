// Tela do jogo em <canvas> (porta do GameView.kt): mesmo layout, animações e regras de toque.
import {
  GRID, TOTAL_LEVELS, KIND_NORMAL, KIND_GEM, KIND_STONE, Mode, isEndless, Goal, Bonus, Shapes, GameEngine,
  STONE_EVERY, ROTATE, LINE, BOMB, SHUFFLE,
} from "./engine.js";
import * as Tutorial from "./tutorial.js";
import { TutAction } from "./tutorial.js";
import { current, coinsFor } from "./skins.js";
import { drawBlock, drawSpecial, colorOf, lighten, shade, withAlpha, UI_FONT, EMOJI_FONT } from "./painter.js";
import { store } from "./store.js";
import { Sound, Sfx, vibrate } from "./sound.js";

const LINE_DUR = 0.4, BOMB_FUSE = 0.7, STUCK_LIMIT = 5;
const P_SQUARE = 0, P_PIXEL = 1, P_CIRCLE = 2, P_RING = 3, P_STAR = 4, P_SHARD = 5, P_DIAMOND = 6, P_QUAD = 7;

const C = {
  gold: "#ffd23f", green: "#3ddc84", red: "#ff4d5e", cyan: "#2ec4f1", pink: "#ff6fb5", purple: "#b15cff",
  panel: "#2e3470", dim: "#b8bce8", dark: "#1b1f4b", white: "#ffffff", card: "#20255a", button: "#3a4090",
};

const formatTime = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const fmt = (n) => n.toLocaleString("pt-BR");
const rect = (l, t, r, b) => ({ l, t, r, b, get cx() { return (this.l + this.r) / 2; }, get cy() { return (this.t + this.b) / 2; }, get w() { return this.r - this.l; }, get h() { return this.b - this.t; } });
const inside = (rc, x, y) => rc && x >= rc.l && x <= rc.r && y >= rc.t && y <= rc.b;
const rnd = (a, b) => a + Math.random() * (b - a);

export class Game {
  constructor(canvas, mode, { tutorial = false, onExit }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.mode = mode;
    this.onExit = onExit;
    this.d = 1;
    this.touchSlop = 8;

    this.dragSlot = -1; this.dragActive = false; this.downX = 0; this.downY = 0; this.dragX = 0; this.dragY = 0;
    this.dragTarget = null; this.pendingBonus = null;
    this.particles = []; this.texts = []; this.clears = [];
    this.word = null; this.lineFx = null; this.bombFx = null;
    this.shakeT = 0; this.flashT = -1; this.comboValue = 0; this.comboT = -1; this.stuckT = 0;
    this.overlay = null; this.pendingOverlay = null; this.pendingOverlayT = 0; this.overlayButtonRects = [];
    this.tutStep = -1; this.tutNextT = 0; this.tutT = 0; this.skipRect = null; this.tutButtonRect = null;
    this.lastBreakSound = 0;
    this.overlayPress = -1;
    this.token = 0; // invalida timers de partidas antigas
    this.running = true;
    this.last = 0;

    this.resize();
    if (tutorial) this.startTutorial(); else this.startGame();
    this.bindInput();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  destroy() {
    this.running = false;
    this.unbind?.();
  }

  // =====================================================================
  // ciclo do jogo
  // =====================================================================

  isTutorial() { return this.tutStep >= 0; }
  restBonus() { return !this.isTutorial() && this.engine && this.engine.freeRotate ? ROTATE : null; }
  step() { return Tutorial.steps[this.tutStep]; }

  clearFx() {
    this.particles = []; this.texts = []; this.clears = [];
    this.word = null; this.lineFx = null; this.bombFx = null;
    this.comboT = -1; this.flashT = -1; this.shakeT = 0;
    this.overlay = null; this.pendingOverlay = null; this.pendingBonus = this.restBonus();
    this.dragSlot = -1; this.dragTarget = null; this.dragActive = false;
    this.token++;
  }

  startTutorial() {
    this.engine = new GameEngine(Mode.INFINITE, { freeRotate: false });
    this.engine.autoRefill = false;
    this.tutStep = 0;
    this.clearFx();
    this.tutNextT = 0; this.tutT = 0;
    this.step().setup(this.engine);
  }

  completeTutorialStep() {
    if (!this.isTutorial() || this.tutNextT > 0) return;
    this.pendingBonus = this.restBonus();
    this.tutNextT = 1.4;
    Sound.play(Sfx.BONUS, 1.2, 0.6);
  }

  nextTutorialStep() {
    this.tutStep++;
    this.tutT = 0;
    if (this.tutStep >= Tutorial.steps.length) { this.finishTutorial(); return; }
    this.pendingBonus = this.restBonus();
    this.step().setup(this.engine);
  }

  finishTutorial() {
    store.tutorialDone = true;
    this.tutStep = -1;
    this.startGame();
  }

  startGame(fresh = false) {
    this.tutStep = -1;
    if (fresh) store.clearGame(this.mode);
    const savedState = fresh ? null : store.loadGame(this.mode);
    const saved = savedState ? GameEngine.restore(savedState, this.mode, store.currentLevel, store.infiniteBonus) : null;
    this.engine = saved || (this.mode === Mode.LEVELS
      ? new GameEngine(Mode.LEVELS, { level: store.currentLevel, startBonuses: store.loadBonuses(), infiniteBonus: store.infiniteBonus })
      : new GameEngine(this.mode, { infiniteBonus: store.infiniteBonus }));
    store.loadReserve().forEach((v, i) => (this.engine.reserve[i] = v));
    this.stuckT = 0;
    this.clearFx();
    if (saved) this.overlay = this.resumeOverlay();
    else this.showIntro();
  }

  resumeOverlay() {
    const e = this.engine;
    return {
      title: "Partida salva",
      lines: [this.modeName(), e.goal === Goal.GEMS ? `💎 ${e.gemsTotal - e.gemsLeft} / ${e.gemsTotal}  •  ${fmt(e.score)} pts` : `Pontuação: ${fmt(e.score)}`, `Tempo: ${formatTime(e.elapsedMs)}`],
      buttons: [["Continuar", () => (this.overlay = null)], ["Nova partida", () => this.startGame(true)], ["Menu", () => this.exit()]],
      accent: C.green, isPause: true,
    };
  }

  /** Guarda a partida em andamento (ao sair ou trocar de aba). */
  saveProgress() {
    if (this.isTutorial() || !this.engine) return;
    this.syncReserve();
    const e = this.engine;
    if (e.gameOver || e.levelComplete || this.pendingOverlay) store.clearGame(this.mode);
    else store.saveGame(this.mode, e.saveState());
  }

  exit() {
    this.saveProgress();
    this.onExit();
  }

  showIntro() {
    const cx = this.W / 2, cy = this.boardTop + this.boardSize * 0.45, d = this.d, e = this.engine;
    if (this.mode === Mode.LEVELS) {
      this.addText(`Fase ${e.level}`, cx, cy, C.gold, 40 * d, 1.6);
      this.addText(e.goal === Goal.GEMS ? `Destrua ${e.gemsTotal} 💎` : `Faça ${fmt(e.target)} pontos`, cx, cy + 44 * d, C.white, 22 * d, 1.6, 0.15);
      const novas = Shapes.unlockedAt(e.level);
      if (novas.length) {
        this.addText("✨ Peça nova: " + novas.map((n) => n.name).join(" e "), cx, cy + 84 * d, C.cyan, 18 * d, 2.2, 0.4);
        Sound.play(Sfx.BONUS, 1, 0.7);
      }
    } else if (this.mode === Mode.HARD) {
      this.addText("Infinito difícil 🔥", cx, cy, C.red, 34 * d, 1.8);
      this.addText(`Pedras a cada ${STONE_EVERY / 1000} mil pontos`, cx, cy + 40 * d, C.white, 18 * d, 1.8, 0.15);
    } else {
      this.addText("Modo infinito", cx, cy, C.gold, 36 * d, 1.4);
    }
  }

  modeName() {
    return this.mode === Mode.LEVELS ? `Fase ${this.engine.level}` : this.mode === Mode.INFINITE ? "Modo infinito" : "Infinito difícil 🔥";
  }

  syncReserve() { if (!this.isTutorial()) store.saveReserve(this.engine.reserve); }
  coinsLine(coins) { return this.engine.infiniteBonus ? "☕ Casual: sem moedas" : `+${fmt(coins)} 🪙 moedas`; }
  payCoins() {
    if (this.engine.infiniteBonus) return 0;
    const n = coinsFor(this.engine.score);
    if (n > 0) store.coins = store.coins + n;
    return n;
  }

  animBusy() { return this.lineFx != null || this.bombFx != null; }
  isRunning() {
    if (this.isTutorial()) return this.overlay == null;
    return this.overlay == null && this.pendingOverlay == null && !this.engine.gameOver && !this.engine.levelComplete;
  }

  pauseGame() {
    if (this.isTutorial() || !this.isRunning()) return;
    this.dragSlot = -1; this.dragTarget = null;
    this.overlay = this.pauseOverlay();
  }

  pauseOverlay() {
    return {
      title: "Pausado",
      lines: [this.modeName()],
      buttons: [
        ["Continuar", () => (this.overlay = null)],
        [store.musicOn ? "🎵 Música: ligada" : "🎵 Música: desligada", () => { store.musicOn = !store.musicOn; Sound.refreshMusic(); this.overlay = this.pauseOverlay(); }],
        [store.sfxOn ? "🔊 Efeitos: ligados" : "🔇 Efeitos: desligados", () => { store.sfxOn = !store.sfxOn; store.voiceOn = store.sfxOn; this.overlay = this.pauseOverlay(); }],
        ["Reiniciar", () => this.startGame(true)],
        ["Menu", () => this.exit()],
      ],
      accent: C.cyan, isPause: true,
    };
  }

  /** Botão voltar / Esc. Retorna true se tratou. */
  handleBack() {
    const ov = this.overlay;
    if (this.isTutorial()) { this.finishTutorial(); return true; }
    // pausado: voltar de novo sai para o menu (a partida fica salva)
    if (ov) return false;
    if (this.pendingBonus !== this.restBonus()) { this.pendingBonus = this.restBonus(); return true; }
    if (this.isRunning()) { this.pauseGame(); return true; }
    return false;
  }

  afterAction() {
    if (this.isTutorial()) return;
    if (this.engine.levelComplete) this.onLevelComplete();
    else if (this.engine.gameOver) this.onGameOver();
  }

  showOverlaySoon(ov, delay = 1.0) {
    this.pendingOverlay = ov;
    this.pendingOverlayT = delay;
    this.dragSlot = -1;
    this.pendingBonus = this.restBonus();
  }

  onLevelComplete() {
    const e = this.engine;
    store.clearGame(this.mode);
    const lvl = e.level;
    const reward = Bonus[e.levelReward()];
    store.saveBonuses(e.bonuses);
    const finished = lvl >= TOTAL_LEVELS;
    store.currentLevel = finished ? TOTAL_LEVELS : lvl + 1;
    store.maxLevel = Math.max(store.maxLevel, store.currentLevel);
    Sound.play(Sfx.WIN);
    this.syncReserve();
    const coins = this.payCoins();
    this.showOverlaySoon({
      title: finished ? "Você zerou o Blockify!" : `Fase ${lvl} concluída!`,
      lines: [`Pontuação: ${fmt(e.score)}`, `Tempo: ${formatTime(e.elapsedMs)}`, `Bônus ganho: ${reward.icon} ${reward.label}`, this.coinsLine(coins)],
      buttons: [[finished ? "Jogar de novo" : "Próxima fase", () => this.startGame(true)], ["Menu", () => this.exit()]],
      accent: C.green,
    });
  }

  onGameOver(timeout = false) {
    const e = this.engine;
    Sound.play(Sfx.LOSE);
    store.clearGame(this.mode);
    this.syncReserve();
    const coins = this.payCoins();
    if (isEndless(this.mode)) {
      const best = store.highFor(this.mode);
      const record = e.score > best && !e.infiniteBonus;
      if (record) store.setHigh(this.mode, e.score);
      this.showOverlaySoon({
        title: timeout ? "Tempo esgotado!" : "Fim de jogo",
        lines: [`Pontuação: ${fmt(e.score)}`, record ? "🏆 Novo recorde!" : e.infiniteBonus ? "Modo casual: recorde não conta" : `Recorde: ${fmt(best)}`, `Tempo: ${formatTime(e.elapsedMs)}`, this.coinsLine(coins)],
        buttons: [["Jogar de novo", () => this.startGame(true)], ["Menu", () => this.exit()]],
        accent: C.pink,
      });
    } else {
      store.saveBonuses(e.bonuses);
      const progress = e.goal === Goal.GEMS ? `Gemas: ${e.gemsTotal - e.gemsLeft} / ${e.gemsTotal}` : `Pontuação: ${fmt(e.score)} / ${fmt(e.target)}`;
      this.showOverlaySoon({
        title: "Missão falhou!",
        lines: [`Fase ${e.level}`, progress, timeout ? "O tempo para usar um bônus acabou" : "Sem espaço e sem bônus", this.coinsLine(coins)],
        buttons: [["Tentar de novo", () => this.startGame(true)], ["Menu", () => this.exit()]],
        accent: C.red,
      });
    }
  }

  // =====================================================================
  // layout
  // =====================================================================

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const box = this.canvas.getBoundingClientRect();
    this.W = Math.max(280, box.width);
    this.H = Math.max(480, box.height);
    this.canvas.width = Math.round(this.W * dpr);
    this.canvas.height = Math.round(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const d = this.d, w = this.W, h = this.H;
    const pad = 14 * d, hudH = 126 * d, bonusH = 64 * d, trayMin = 130 * d;
    this.hudTop = pad;
    const avail = h - 2 * pad - hudH - bonusH - trayMin - 24 * d;
    this.cell = Math.min(w - 2 * pad, avail) / GRID;
    this.boardSize = this.cell * GRID;
    this.boardLeft = (w - this.boardSize) / 2;
    this.boardTop = this.hudTop + hudH;
    this.pauseRect = rect(pad, this.hudTop, pad + 44 * d, this.hudTop + 44 * d);

    const bTop = this.boardTop + this.boardSize + 16 * d, bw = 66 * d, gap = 12 * d;
    const total = 4 * bw + 3 * gap, start = (w - total) / 2;
    this.bonusRects = [0, 1, 2, 3].map((i) => rect(start + i * (bw + gap), bTop, start + i * (bw + gap) + bw, bTop + bonusH - 8 * d));
    const trayTop = bTop + bonusH + 4 * d, trayBottom = h - pad, slotW = (w - 2 * pad) / 3;
    this.slotRects = [0, 1, 2].map((i) => rect(pad + i * slotW, trayTop, pad + (i + 1) * slotW, trayBottom));
    this.trayCell = Math.min(this.cell * 0.6, Math.min(slotW, trayBottom - trayTop) / 5.6);
  }

  // =====================================================================
  // laço e atualização
  // =====================================================================

  loop(now) {
    if (!this.running) return;
    const dt = this.last ? Math.min((now - this.last) / 1000, 0.05) : 0;
    this.last = now;
    this.update(dt);
    this.draw();
    requestAnimationFrame(this.loop);
  }

  update(dt) {
    const e = this.engine;
    if (this.isRunning()) e.elapsedMs += dt * 1000;

    if (this.isTutorial()) {
      this.tutT += dt;
      if (this.tutNextT > 0) {
        this.tutNextT -= dt;
        if (this.tutNextT <= 0 && !this.animBusy()) this.nextTutorialStep();
        else if (this.tutNextT <= 0) this.tutNextT = 0.05;
      }
    }

    if (!this.isTutorial() && this.isRunning() && e.stuck && !this.animBusy()) {
      if (this.pendingBonus === this.restBonus()) this.stuckT += dt;
      if (this.stuckT >= STUCK_LIMIT) {
        this.stuckT = 0;
        e.forceFail();
        this.onGameOver(true);
      }
    } else if (!e.stuck) this.stuckT = 0;

    const g = 1400 * this.d;
    this.particles = this.particles.filter((p) => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += g * p.gravity * dt; p.rot += p.spin * dt; p.life -= dt;
      return p.life > 0;
    });
    this.texts = this.texts.filter((t) => (t.t += dt) <= t.dur + t.delay);
    this.clears = this.clears.filter((c) => (c.t += dt) <= 0.45);
    if (this.word && (this.word.t += dt) > 1.4) this.word = null;
    if (this.comboT >= 0 && (this.comboT += dt) > 1.3) this.comboT = -1;
    if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);
    if (this.flashT >= 0 && (this.flashT += dt) > 0.35) this.flashT = -1;

    const fx = this.lineFx;
    if (fx) {
      fx.t += dt;
      const bladeX = this.boardLeft - this.cell + (this.boardSize + 2 * this.cell) * (fx.t / LINE_DUR);
      const passed = fx.cells.filter((it) => this.boardLeft + it.cell.c * this.cell + this.cell / 2 < bladeX);
      if (passed.length) {
        this.spawnClearFx(passed, 5);
        fx.cells = fx.cells.filter((it) => !passed.includes(it));
      }
      if (fx.t >= LINE_DUR) {
        if (fx.cells.length) this.spawnClearFx(fx.cells, 5);
        this.lineFx = null;
        if (this.isTutorial() && this.step().action === TutAction.LINE) this.completeTutorialStep();
        this.afterAction();
      }
    }

    const bf = this.bombFx;
    if (bf) {
      bf.t += dt;
      if (!bf.exploded && bf.t >= BOMB_FUSE) {
        bf.exploded = true;
        Sound.play(Sfx.BOOM);
        vibrate(true);
        this.shakeT = 0.35;
        this.flashT = 0;
        this.spawnClearFx(bf.cells, 7);
        this.spawnExplosion(this.boardLeft + bf.center.c * this.cell + this.cell / 2, this.boardTop + bf.center.r * this.cell + this.cell / 2);
        this.onHit(bf.hit);
        this.addText(`+${bf.hit.hitCount * 2}`, this.boardLeft + bf.center.c * this.cell + this.cell / 2, this.boardTop + bf.center.r * this.cell, C.gold, 24 * this.d);
      }
      if (bf.t >= BOMB_FUSE + 0.35) {
        this.bombFx = null;
        if (this.isTutorial() && this.step().action === TutAction.BOMB) this.completeTutorialStep();
        this.afterAction();
      }
    }

    if (this.pendingOverlay) {
      this.pendingOverlayT -= dt;
      if (this.pendingOverlayT <= 0) { this.overlay = this.pendingOverlay; this.pendingOverlay = null; }
    }
  }

  // =====================================================================
  // desenho
  // =====================================================================

  font(size, italic = false) { return `${italic ? "italic " : ""}bold ${size}px ${EMOJI_FONT}`; }

  /** Moeda desenhada (o emoji 🪙 não existe em sistemas mais antigos). */
  drawCoin(cx, cy, r) {
    const c = this.ctx;
    const g = c.createRadialGradient(cx - r * 0.3, cy - r * 0.4, 0, cx, cy, r);
    g.addColorStop(0, "#fff6c2"); g.addColorStop(0.35, "#ffd23f"); g.addColorStop(1, "#f0a500");
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "#c98a00"; c.lineWidth = r * 0.18; c.beginPath(); c.arc(cx, cy, r * 0.92, 0, Math.PI * 2); c.stroke();
    c.lineWidth = r * 0.12; c.beginPath(); c.arc(cx, cy, r * 0.55, 0, Math.PI * 2); c.stroke();
  }

  text(s, x, y, size, color, align = "center", alpha = 1) {
    const c = this.ctx;
    if (s.includes("🪙")) return this.textWithCoins(s, x, y, size, color, align, alpha);
    c.save();
    c.globalAlpha *= alpha;
    c.font = this.font(size);
    c.fillStyle = color;
    c.textAlign = align;
    c.textBaseline = "alphabetic";
    c.fillText(s, x, y);
    c.restore();
  }

  textWithCoins(s, x, y, size, color, align, alpha) {
    const c = this.ctx, parts = s.split("🪙"), coinW = size * 1.05;
    c.save();
    c.globalAlpha *= alpha;
    c.font = this.font(size);
    c.textBaseline = "alphabetic";
    c.textAlign = "left";
    const total = parts.reduce((w, p) => w + c.measureText(p).width, 0) + coinW * (parts.length - 1);
    let px = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
    parts.forEach((p, i) => {
      if (i > 0) { this.drawCoin(px + coinW / 2, y - size * 0.36, size * 0.42); px += coinW; }
      c.fillStyle = color;
      c.fillText(p, px, y);
      px += c.measureText(p).width;
    });
    c.restore();
  }

  outlined(s, x, y, size, color, outlineColor, alpha = 1) {
    const c = this.ctx;
    c.save();
    c.globalAlpha *= alpha;
    c.font = this.font(size);
    c.textAlign = "center";
    c.lineJoin = "round";
    c.lineWidth = size * 0.14;
    c.strokeStyle = outlineColor;
    c.strokeText(s, x, y);
    c.fillStyle = color;
    c.fillText(s, x, y);
    c.restore();
  }

  rr(l, t, w, h, r, fill, stroke, lw) {
    const c = this.ctx;
    c.beginPath();
    c.roundRect(l, t, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
  }

  draw() {
    const c = this.ctx, W = this.W, H = this.H;
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, current.background.top);
    bg.addColorStop(1, current.background.bottom);
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);

    c.save();
    if (this.shakeT > 0) {
      const m = (this.shakeT / 0.35) * 9 * this.d;
      c.translate((Math.random() - 0.5) * 2 * m, (Math.random() - 0.5) * 2 * m);
    }
    this.drawHud();
    this.drawBoard();
    this.drawClearFx();
    this.drawLineFx();
    this.drawBombFx();
    c.restore();

    this.drawBonusBar();
    this.drawTray();
    this.drawDragged();
    this.drawParticles();
    this.drawFlash();
    this.drawStuckCountdown();
    if (this.isTutorial()) this.drawTutorialGuides();
    this.drawWord();
    this.drawCombo();
    this.drawTexts();
    if (this.overlay) this.drawOverlay(this.overlay);
  }

  progressBar(cx, top, width, prog, color) {
    const d = this.d, left = cx - width / 2;
    this.rr(left, top, width, 9 * d, 5 * d, current.background.board);
    if (prog > 0) this.rr(left, top, width * Math.min(1, prog), 9 * d, 5 * d, color);
  }

  drawHud() {
    if (this.isTutorial()) { this.drawTutorialPanel(); return; }
    const d = this.d, w = this.W, pad = 14 * d, e = this.engine, top = this.hudTop;
    const pr = this.pauseRect;
    this.rr(pr.l, pr.t, pr.w, pr.h, 12 * d, C.panel);
    this.rr(pr.cx - 8 * d, pr.cy - 9 * d, 5 * d, 18 * d, 2 * d, C.white);
    this.rr(pr.cx + 3 * d, pr.cy - 9 * d, 5 * d, 18 * d, 2 * d, C.white);

    this.text("⏱ " + formatTime(e.elapsedMs), w - pad, top + 28 * d, 16 * d, C.dim, "right");

    if (this.mode === Mode.HARD) {
      this.text(`🔥 👑 ${fmt(Math.max(store.highHard, e.score))}`, w / 2, top + 26 * d, 20 * d, C.red);
      this.text(fmt(e.score), w / 2, top + 76 * d, 44 * d, C.white);
      this.text(`Linhas: ${e.linesTotal}  •  pedras em ${fmt(e.nextStoneAt - e.score)}`, w / 2, top + 102 * d, 13 * d, C.dim);
    } else if (this.mode === Mode.INFINITE) {
      this.text(`👑 ${fmt(Math.max(store.highInfinite, e.score))}`, w / 2, top + 26 * d, 20 * d, C.gold);
      this.text(fmt(e.score), w / 2, top + 76 * d, 44 * d, C.white);
      this.text(`Linhas: ${e.linesTotal}`, w / 2, top + 102 * d, 13 * d, C.dim);
    } else if (e.goal === Goal.GEMS) {
      this.text(`FASE ${e.level}`, w / 2, top + 26 * d, 20 * d, C.gold);
      const done = e.gemsTotal - e.gemsLeft;
      this.text(`💎 ${done} / ${e.gemsTotal}`, w / 2, top + 70 * d, 34 * d, C.white);
      this.progressBar(w / 2, top + 82 * d, w * 0.55, done / Math.max(1, e.gemsTotal), C.purple);
      this.text(`Destrua as gemas  •  ${fmt(e.score)} pts`, w / 2, top + 106 * d, 13 * d, C.dim);
    } else {
      this.text(`FASE ${e.level}`, w / 2, top + 26 * d, 20 * d, C.gold);
      this.text(fmt(e.score), w / 2, top + 72 * d, 40 * d, C.white);
      this.progressBar(w / 2, top + 82 * d, w * 0.55, e.score / e.target, C.green);
      this.text(`Meta: ${fmt(e.target)}`, w / 2, top + 106 * d, 13 * d, C.dim);
    }

    const pb = this.pendingBonus;
    const hint = (pb != null && pb === this.restBonus() ? null : pb != null ? Bonus[pb].hint : null) ||
      (e.stuck && this.isRunning() && !this.animBusy() ? "Sem espaço! Use um bônus" : null);
    if (e.infiniteBonus) this.text("☕ Casual", pad, top + 66 * d, 12 * d, C.cyan, "left");
    if (hint) this.text(hint, w / 2, this.boardTop - 9 * d, (hint.length > 40 ? 11 : 13) * d, pb !== this.restBonus() ? C.cyan : C.red);
  }

  drawCellBlock(r, col, x, y, s, alpha = 1) {
    const e = this.engine, v = e.board[r][col], k = e.kind[r][col];
    if (k === KIND_NORMAL) drawBlock(this.ctx, x, y, s, colorOf(v), alpha);
    else drawSpecial(this.ctx, x, y, s, k, e.hp[r][col], k === KIND_GEM ? "💎" : k === KIND_STONE ? "" : Bonus[e.bonusIn[r][col]].icon, alpha);
  }

  drawBoard() {
    const d = this.d, e = this.engine, cell = this.cell, L = this.boardLeft, T = this.boardTop, S = this.boardSize;
    this.rr(L - 6 * d, T - 6 * d, S + 12 * d, S + 12 * d, 14 * d, current.background.board);
    const gap = cell * 0.05;
    for (let r = 0; r < GRID; r++) for (let col = 0; col < GRID; col++) {
      const x = L + col * cell, y = T + r * cell;
      if (e.board[r][col] === 0) this.rr(x + gap, y + gap, cell - 2 * gap, cell - 2 * gap, cell * 0.14, current.background.empty);
      else this.drawCellBlock(r, col, x, y, cell);
    }
    if (this.pendingBonus === LINE || this.pendingBonus === BOMB) {
      this.ctx.save(); this.ctx.globalAlpha = 0.63;
      this.rr(L - 6 * d, T - 6 * d, S + 12 * d, S + 12 * d, 14 * d, null, C.cyan, 2 * d);
      this.ctx.restore();
    }
    // sombra da peça arrastada + linhas que serão limpas
    const t = this.dragTarget;
    const p = this.dragSlot >= 0 && this.dragActive ? e.tray[this.dragSlot] : null;
    if (t && p) {
      const color = colorOf(p.color);
      const ghost = new Set(p.cells.map((c) => (t.r + c.r) * GRID + (t.c + c.c)));
      const filled = (r, c) => e.board[r][c] !== 0 || ghost.has(r * GRID + c);
      const hl = new Set();
      for (let i = 0; i < GRID; i++) {
        let rowFull = true, colFull = true;
        for (let j = 0; j < GRID; j++) { if (!filled(i, j)) rowFull = false; if (!filled(j, i)) colFull = false; }
        if (rowFull) for (let j = 0; j < GRID; j++) hl.add(i * GRID + j);
        if (colFull) for (let j = 0; j < GRID; j++) hl.add(j * GRID + i);
      }
      hl.forEach((k) => {
        const r = Math.floor(k / GRID), c = k % GRID;
        if (e.board[r][c] !== 0 && e.kind[r][c] !== KIND_NORMAL) return;
        drawBlock(this.ctx, L + c * cell, T + r * cell, cell, color);
      });
      ghost.forEach((k) => drawBlock(this.ctx, L + (k % GRID) * cell, T + Math.floor(k / GRID) * cell, cell, color, 0.43));
    }
  }

  drawClearFx() {
    for (const fx of this.clears) {
      const p = fx.t / 0.45, s = this.cell * (1 - 0.5 * p);
      drawBlock(this.ctx, fx.x + (this.cell - s) / 2, fx.y + (this.cell - s) / 2, s, lighten(fx.color, 0.3 * (1 - p)), Math.max(0, 1 - p));
    }
  }

  drawLineFx() {
    const fx = this.lineFx;
    if (!fx) return;
    const c = this.ctx, d = this.d, cell = this.cell;
    for (const it of fx.cells) drawBlock(c, this.boardLeft + it.cell.c * cell, this.boardTop + it.cell.r * cell, cell, colorOf(it.color));
    const p = Math.min(1, fx.t / LINE_DUR);
    const y = this.boardTop + fx.row * cell + cell / 2;
    const bladeX = this.boardLeft - cell + (this.boardSize + 2 * cell) * p;
    const startX = this.boardLeft - 6 * d;
    if (bladeX > startX) {
      const gr = c.createLinearGradient(startX, 0, bladeX, 0);
      gr.addColorStop(0, "rgba(0,229,255,0)");
      gr.addColorStop(1, "rgba(191,246,255,0.8)");
      this.rr(startX, y - cell * 0.1, bladeX - startX, cell * 0.2, cell * 0.1, gr);
    }
    c.save();
    c.lineCap = "round";
    c.globalAlpha = 0.35; c.strokeStyle = C.cyan; c.lineWidth = 10 * d;
    c.beginPath(); c.moveTo(bladeX - cell * 0.25, y + cell * 0.65); c.lineTo(bladeX + cell * 0.25, y - cell * 0.65); c.stroke();
    c.globalAlpha = 1; c.strokeStyle = C.white; c.lineWidth = 4 * d;
    c.beginPath(); c.moveTo(bladeX - cell * 0.25, y + cell * 0.65); c.lineTo(bladeX + cell * 0.25, y - cell * 0.65); c.stroke();
    c.restore();
  }

  drawBomb(cx, cy, r, t) {
    const c = this.ctx;
    const gr = c.createRadialGradient(cx - r * 0.35, cy - r * 0.35, 0, cx - r * 0.35, cy - r * 0.35, r * 1.4);
    gr.addColorStop(0, "#5a5f7a"); gr.addColorStop(1, "#101225");
    c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = "rgba(255,255,255,0.59)"; c.beginPath(); c.arc(cx - r * 0.38, cy - r * 0.38, r * 0.18, 0, Math.PI * 2); c.fill();
    c.save();
    const nx = cx + r * 0.6, ny = cy - r * 0.835;
    c.translate(nx, ny); c.rotate((35 * Math.PI) / 180);
    this.rr(-r * 0.25, -r * 0.215, r * 0.5, r * 0.43, r * 0.1, "#3a3f5c");
    c.restore();
    const fx0 = cx + r * 0.75, fy0 = cy - r;
    c.save();
    c.lineCap = "round"; c.strokeStyle = "#c9a26b"; c.lineWidth = r * 0.12;
    c.beginPath(); c.moveTo(fx0, fy0); c.quadraticCurveTo(fx0 + r * 0.5, fy0 - r * 0.6, fx0 + r * 0.15, fy0 - r * 0.9); c.stroke();
    c.restore();
    const sx = fx0 + r * 0.15, sy = fy0 - r * 0.9, flick = 0.7 + 0.3 * Math.abs(Math.sin(t * 40));
    c.fillStyle = "#ff9f1c"; c.beginPath(); c.arc(sx, sy, r * 0.28 * flick, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#fff3b0"; c.beginPath(); c.arc(sx, sy, r * 0.13 * flick, 0, Math.PI * 2); c.fill();
  }

  drawBombFx() {
    const fx = this.bombFx;
    if (!fx) return;
    const c = this.ctx, d = this.d, cell = this.cell;
    const cx = this.boardLeft + fx.center.c * cell + cell / 2, cy = this.boardTop + fx.center.r * cell + cell / 2;
    if (!fx.exploded) {
      for (const it of fx.cells) drawBlock(c, this.boardLeft + it.cell.c * cell, this.boardTop + it.cell.r * cell, cell, colorOf(it.color));
      const pulse = 0.5 + 0.5 * Math.sin(fx.t * 18);
      this.rr(cx - cell * 1.5, cy - cell * 1.5, cell * 3, cell * 3, cell * 0.25, withAlpha(C.red, (40 + 50 * pulse) / 255));
      const drop = Math.min(1, fx.t / 0.25);
      const bounce = drop < 1 ? (1 - drop) * -cell * 2.5 : Math.abs(Math.sin((fx.t - 0.25) * 14)) * -cell * 0.12 * (1 - (fx.t - 0.25) / BOMB_FUSE);
      const wobble = Math.sin(fx.t * 35) * (fx.t / BOMB_FUSE) * 2.5 * d;
      const grow = 1 + 0.18 * (fx.t / BOMB_FUSE);
      this.drawBomb(cx + wobble, cy + bounce, cell * 0.55 * grow, fx.t);
    } else {
      const p = Math.min(1, Math.max(0, (fx.t - BOMB_FUSE) / 0.35)), a = 1 - p;
      c.fillStyle = withAlpha("#ffd23f", a * 0.6); c.beginPath(); c.arc(cx, cy, cell * (0.6 + 1.8 * p), 0, Math.PI * 2); c.fill();
      c.fillStyle = `rgba(255,255,255,${a * 0.8})`; c.beginPath(); c.arc(cx, cy, cell * (0.3 + 1.1 * p), 0, Math.PI * 2); c.fill();
      c.strokeStyle = withAlpha("#ff9f1c", a); c.lineWidth = 6 * d * (1 - p) + 1;
      c.beginPath(); c.arc(cx, cy, cell * (0.8 + 2.2 * p), 0, Math.PI * 2); c.stroke();
    }
  }

  drawStuckCountdown() {
    const e = this.engine;
    if (!e.stuck || !this.isRunning() || this.animBusy() || this.stuckT <= 0) return;
    const c = this.ctx, d = this.d;
    const left = STUCK_LIMIT - this.stuckT, cx = this.boardLeft + this.boardSize / 2, cy = this.boardTop + this.boardSize / 2, r = this.cell * 1.3;
    c.fillStyle = "rgba(0,0,0,0.59)"; c.beginPath(); c.arc(cx, cy, r * 1.15, 0, Math.PI * 2); c.fill();
    c.save(); c.lineCap = "round"; c.lineWidth = 8 * d;
    c.strokeStyle = C.button; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = left > 1 ? C.gold : C.red;
    c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (left / STUCK_LIMIT)); c.stroke();
    c.restore();
    const n = Math.max(1, Math.ceil(left)), pulse = 1 + 0.15 * (left - Math.floor(left));
    this.outlined(String(n), cx, cy + 18 * d * pulse, 52 * d * pulse, C.white, C.dark);
    if (this.pendingBonus !== this.restBonus()) this.text("pausado", cx, cy + r + 22 * d, 13 * d, C.dim);
  }

  // ---------- tutorial ----------

  drawTutorialPanel() {
    const d = this.d, w = this.W, pad = 14 * d, top = this.hudTop, bottom = this.boardTop - 18 * d;
    this.rr(pad, top, w - 2 * pad, bottom - top, 18 * d, C.card, C.cyan, 2 * d);
    const st = this.step();
    this.text(`🎓 ${this.tutStep + 1}/${Tutorial.steps.length}  ${st.title}`, pad + 16 * d, top + 30 * d, 17 * d, C.gold, "left");
    this.skipRect = rect(w - pad - 78 * d, top + 10 * d, w - pad - 10 * d, top + 40 * d);
    this.rr(this.skipRect.l, this.skipRect.t, this.skipRect.w, this.skipRect.h, 15 * d, C.button);
    this.text("Pular", this.skipRect.cx, this.skipRect.cy + 5 * d, 13 * d, C.white);
    const lines = st.text.split("\n"), size = (lines.length > 2 ? 14 : 15.5) * d;
    lines.forEach((line, i) => this.text(line, pad + 16 * d, top + 58 * d + i * size * 1.35, size, C.white, "left"));
    if (this.tutNextT > 0) this.text("✔ Muito bem!", w - pad - 16 * d, bottom - 10 * d, 14 * d, C.green, "right");
  }

  cellCenter(cl) { return [this.boardLeft + cl.c * this.cell + this.cell / 2, this.boardTop + cl.r * this.cell + this.cell / 2]; }
  fingerFor(p, at) { return [this.boardLeft + at.c * this.cell + (p.cols * this.cell) / 2, this.boardTop + at.r * this.cell + p.rows * this.cell + this.cell]; }

  pulseCells(cells) {
    const a = 0.5 + 0.5 * Math.sin(this.tutT * 6), d = this.d, c = this.ctx;
    for (const cl of cells) {
      const x = this.boardLeft + cl.c * this.cell, y = this.boardTop + cl.r * this.cell;
      c.save();
      c.globalAlpha = (40 + 70 * a) / 255;
      this.rr(x + 2 * d, y + 2 * d, this.cell - 4 * d, this.cell - 4 * d, this.cell * 0.16, C.white);
      c.globalAlpha = (140 + 115 * a) / 255;
      this.rr(x + 2 * d, y + 2 * d, this.cell - 4 * d, this.cell - 4 * d, this.cell * 0.16, null, C.white, 2.5 * d);
      c.restore();
    }
  }

  ringAround(r) {
    const a = 0.5 + 0.5 * Math.sin(this.tutT * 6), d = this.d;
    this.rr(r.l - 4 * d, r.t - 4 * d, r.w + 8 * d, r.h + 8 * d, 16 * d, null, C.gold, (3 + 2 * a) * d);
  }

  drawHand(x, y, scale = 1, alpha = 1) {
    const size = 42 * this.d * scale;
    this.text("👆", x + size * 0.08, y + size * 0.95, size, C.white, "center", alpha);
  }

  tapHand(x, y) {
    const k = this.tutT % 1;
    const press = k < 0.25 ? 1 - k * 0.6 : 0.85 + 0.15 * ((k - 0.25) / 0.75);
    this.drawHand(x, y + (1 - press) * 30 * this.d, press);
  }

  dragHand(p, fromX, fromY, toX, toY) {
    const k = this.tutT % 1.8;
    let prog, alpha = 1;
    if (k < 0.25) prog = 0; else if (k < 1.2) prog = (k - 0.25) / 0.95; else if (k < 1.5) prog = 1; else { prog = 1; alpha = 1 - (k - 1.5) / 0.3; }
    const e = prog * prog * (3 - 2 * prog);
    const hx = fromX + (toX - fromX) * e, hy = fromY + (toY - fromY) * e;
    if (k >= 0.25) this.drawPiece(p, hx - (p.cols * this.cell) / 2, hy - p.rows * this.cell - this.cell, this.cell, alpha * 0.45);
    this.drawHand(hx, hy, k < 0.25 ? 1 - k * 0.5 : 0.88, alpha);
  }

  drawTutorialGuides() {
    const st = this.step(), d = this.d;
    if (st.action === TutAction.CONTINUE) {
      const w = this.W;
      this.tutButtonRect = rect(w / 2 - 120 * d, this.boardTop + this.boardSize * 0.42, w / 2 + 120 * d, this.boardTop + this.boardSize * 0.42 + 56 * d);
      const r = this.tutButtonRect;
      this.rr(r.l, r.t, r.w, r.h, 18 * d, C.green);
      this.text("Começar a jogar!", r.cx, r.cy + 7 * d, 20 * d, C.dark);
      this.tapHand(r.cx, r.b - 10 * d);
      return;
    }
    if (this.tutNextT > 0 || this.animBusy() || (this.dragSlot >= 0 && this.dragActive)) return;
    const slotR = this.slotRects[st.slot], piece = this.engine.tray[st.slot];
    const dragGuide = () => {
      this.pulseCells(st.targets);
      if (!st.placeAt || !piece) return;
      const [tx, ty] = this.fingerFor(piece, st.placeAt);
      this.dragHand(piece, slotR.cx, slotR.cy, tx, ty);
    };
    const tapBonus = (b) => { const r = this.bonusRects[b]; this.ringAround(r); this.tapHand(r.cx, r.b - 12 * d); };
    if (st.action === TutAction.PLACE_CLEAR) dragGuide();
    else if (st.action === TutAction.ROTATE_PLACE) {
      const rotated = this.engine.isRotated(st.slot);
      if (!rotated && this.pendingBonus !== ROTATE) tapBonus(ROTATE);
      else if (!rotated) { this.ringAround(slotR); this.tapHand(slotR.cx, slotR.cy); }
      else dragGuide();
    } else if (st.action === TutAction.LINE || st.action === TutAction.BOMB) {
      if (this.pendingBonus !== st.bonus) tapBonus(st.bonus);
      else {
        let area = st.targets;
        if (st.action === TutAction.BOMB) {
          area = [];
          for (const t of st.targets) for (let rr = t.r - 1; rr <= t.r + 1; rr++) for (let cc = t.c - 1; cc <= t.c + 1; cc++)
            if (rr >= 0 && rr < GRID && cc >= 0 && cc < GRID) area.push({ r: rr, c: cc });
        }
        this.pulseCells(area);
        const [x, y] = this.cellCenter(st.action === TutAction.LINE ? st.targets[GRID / 2] : st.targets[0]);
        this.tapHand(x, y);
      }
    } else if (st.action === TutAction.SHUFFLE) tapBonus(SHUFFLE);
  }

  drawFlash() {
    if (this.flashT < 0) return;
    this.ctx.fillStyle = `rgba(255,255,255,${Math.max(0, (1 - this.flashT / 0.35) * 0.43)})`;
    this.ctx.fillRect(0, 0, this.W, this.H);
  }

  // ---------- bônus e bandeja ----------

  bonusAvailable(b) {
    const e = this.engine;
    return Math.max(0, b === ROTATE ? e.bonuses[b] - e.rotatedCount() : e.bonuses[b]);
  }
  freeBonus(b) { return this.engine.infiniteBonus || (b === ROTATE && this.engine.freeRotate); }

  drawBonusBar() {
    const d = this.d, e = this.engine, c = this.ctx;
    for (const b of Bonus) {
      const r = this.bonusRects[b.id];
      const count = this.freeBonus(b.id) ? 1 : this.bonusAvailable(b.id);
      const usable = e.has(b.id), active = this.pendingBonus === b.id;
      c.save(); c.globalAlpha = usable ? 1 : 0.47;
      this.rr(r.l, r.t, r.w, r.h, 14 * d, active ? "#4a52b8" : C.panel);
      c.restore();
      if (active) this.rr(r.l, r.t, r.w, r.h, 14 * d, null, C.gold, 3 * d);
      const alpha = usable ? 1 : 0.43;
      this.text(b.icon, r.cx, r.t + r.h * 0.52, 22 * d, C.white, "center", alpha);
      this.text(b.label, r.cx, r.b - 6 * d, 11 * d, C.dim, "center", alpha);
      const bx = r.r - 4 * d, by = r.t + 4 * d;
      c.fillStyle = count > 0 ? C.red : "#555a88"; c.beginPath(); c.arc(bx, by, 10 * d, 0, Math.PI * 2); c.fill();
      this.text(this.freeBonus(b.id) ? "∞" : String(this.bonusAvailable(b.id)), bx, by + 4 * d, 12 * d, C.white);
      const res = e.reserve[b.id];
      if (res > 0 && !this.freeBonus(b.id)) {
        this.rr(r.l - 6 * d, r.t - 8 * d, 34 * d, 16 * d, 8 * d, C.purple);
        this.text(`🎒${res}`, r.l + 11 * d, r.t + 4 * d, 10 * d, C.white);
      }
    }
  }

  drawPiece(p, x, y, s, alpha = 1) {
    const color = colorOf(p.color);
    for (const cl of p.cells) drawBlock(this.ctx, x + cl.c * s, y + cl.r * s, s, color, alpha);
  }

  drawTray() {
    const d = this.d, e = this.engine;
    for (let i = 0; i < 3; i++) {
      if (i === this.dragSlot && this.dragActive) continue;
      const p = e.tray[i];
      if (!p) continue;
      const r = this.slotRects[i], rotated = e.isRotated(i);
      // no Infinito o Girar fica sempre ativo: aí só destaca a peça já girada
      const rotateMode = this.pendingBonus === ROTATE && this.pendingBonus !== this.restBonus();
      if (rotateMode || rotated) {
        const bh = Math.min(r.h - 12 * d, r.w * 1.1);
        this.rr(r.l + 6 * d, r.cy - bh / 2, r.w - 12 * d, bh, 16 * d, "rgba(74,82,184,0.2)", rotated ? C.gold : C.cyan, 2 * d);
      }
      const pw = p.cols * this.trayCell, ph = p.rows * this.trayCell;
      this.drawPiece(p, r.cx - pw / 2, r.cy - ph / 2, this.trayCell, e.fitsAnywhere(p) ? 1 : 0.35);
      if (rotated) this.text("🔄", r.r - 18 * d, r.t + 26 * d, 15 * d, C.white);
    }
  }

  dragOrigin(p) { return [this.dragX - (p.cols * this.cell) / 2, this.dragY - p.rows * this.cell - this.cell]; }

  drawDragged() {
    if (this.dragSlot < 0 || !this.dragActive) return;
    const p = this.engine.tray[this.dragSlot];
    if (!p) return;
    const [x, y] = this.dragOrigin(p);
    this.drawPiece(p, x, y, this.cell);
  }

  drawParticles() {
    const c = this.ctx, d = this.d;
    for (const p of this.particles) {
      const k = Math.min(1, Math.max(0, p.life / p.maxLife)), h = p.size / 2;
      c.save();
      c.globalAlpha = k;
      c.fillStyle = p.color;
      switch (p.shape) {
        case P_PIXEL: c.fillRect(p.x - h, p.y - h, p.size, p.size); break;
        case P_CIRCLE: c.beginPath(); c.arc(p.x, p.y, h, 0, Math.PI * 2); c.fill(); break;
        case P_RING:
          c.strokeStyle = p.color; c.lineWidth = 3 * d * k + 1;
          c.beginPath(); c.arc(p.x, p.y, h * (1.6 - 0.8 * k), 0, Math.PI * 2); c.stroke();
          break;
        case P_STAR: {
          const tw = 0.5 + 0.5 * Math.sin((p.maxLife - p.life) * 30 + p.rot);
          c.globalAlpha = k * tw;
          const r = h * (0.6 + 0.4 * tw), q = r * 0.22;
          c.beginPath();
          c.moveTo(p.x, p.y - r); c.lineTo(p.x + q, p.y - q); c.lineTo(p.x + r, p.y); c.lineTo(p.x + q, p.y + q);
          c.lineTo(p.x, p.y + r); c.lineTo(p.x - q, p.y + q); c.lineTo(p.x - r, p.y); c.lineTo(p.x - q, p.y - q);
          c.closePath(); c.fill();
          break;
        }
        case P_SHARD: case P_DIAMOND: case P_QUAD: {
          const v = p.pts;
          c.translate(p.x, p.y);
          c.rotate((p.rot * Math.PI) / 180);
          c.beginPath();
          c.moveTo(v[0] * p.size, v[1] * p.size);
          for (let i = 2; i < v.length; i += 2) c.lineTo(v[i] * p.size, v[i + 1] * p.size);
          c.closePath();
          if (p.shape === P_SHARD) c.globalAlpha = k * 0.55;
          c.fill();
          if (p.shape !== P_QUAD) { c.globalAlpha = k * 0.8; c.strokeStyle = C.white; c.lineWidth = 1.2 * d; c.stroke(); }
          break;
        }
        default:
          c.beginPath(); c.roundRect(p.x - h, p.y - h, p.size, p.size, p.size * 0.25); c.fill();
      }
      c.restore();
    }
  }

  drawWord() {
    const w = this.word;
    if (!w) return;
    const c = this.ctx, d = this.d, t = w.t;
    const scale = t < 0.15 ? 0.3 + (t / 0.15) * 0.95 : t < 0.28 ? 1.25 - ((t - 0.15) / 0.13) * 0.25 : 1;
    const alpha = t < 1.05 ? 1 : Math.max(0, 1 - (t - 1.05) / 0.35);
    const cx = this.boardLeft + this.boardSize / 2, cy = this.boardTop + this.boardSize * 0.4 - t * 12 * d;
    let size = 60 * d;
    c.font = this.font(size, true);
    const maxW = this.boardSize * 0.92, tw = c.measureText(w.text).width;
    if (tw > maxW) size *= maxW / tw;
    size *= scale;
    c.save();
    c.globalAlpha = alpha;
    c.translate(cx, cy);
    c.rotate((-6 * Math.PI) / 180);
    c.font = this.font(size, true);
    c.textAlign = "center";
    c.lineJoin = "round";
    c.lineWidth = size * 0.2; c.strokeStyle = "#2a0f5c"; c.strokeText(w.text, 0, 0);
    c.lineWidth = size * 0.07; c.strokeStyle = C.white; c.strokeText(w.text, 0, 0);
    const half = c.measureText(w.text).width / 2, shift = t * half * 1.2;
    const gr = c.createLinearGradient(-half * 2 - shift, -size, half * 2 - shift, 0);
    const stops = [...w.colors, ...[...w.colors].reverse().slice(1)];
    stops.forEach((col, i) => gr.addColorStop(i / (stops.length - 1), col));
    c.fillStyle = gr;
    c.fillText(w.text, 0, 0);
    c.restore();
  }

  drawCombo() {
    if (this.comboT < 0) return;
    const pop = 1 + 0.35 * (1 - Math.min(1, this.comboT * 5));
    const a = this.comboT < 0.9 ? 1 : Math.max(0, 1 - (this.comboT - 0.9) / 0.4);
    this.outlined(`Combo ${this.comboValue}`, this.boardLeft + this.boardSize / 2, this.boardTop + this.boardSize * 0.58, 34 * this.d * pop, C.gold, "#5a1e8c", a);
  }

  drawTexts() {
    for (const t of this.texts) {
      if (t.t < t.delay) continue;
      const p = (t.t - t.delay) / t.dur;
      const a = p < 0.6 ? 1 : Math.max(0, 1 - (p - 0.6) / 0.4);
      this.outlined(t.text, t.x, t.y - 50 * this.d * p, t.size, t.color, C.dark, a);
    }
  }

  drawOverlay(ov) {
    const c = this.ctx, d = this.d, w = this.W, h = this.H;
    c.fillStyle = "rgba(0,0,0,0.67)";
    c.fillRect(0, 0, w, h);
    const cw = Math.min(w - 48 * d, 340 * d), btnH = 48 * d;
    const ch = 36 * d + 40 * d + ov.lines.length * 28 * d + 16 * d + ov.buttons.length * (btnH + 10 * d) + 12 * d;
    const left = (w - cw) / 2, top = (h - ch) / 2;
    this.rr(left, top, cw, ch, 24 * d, C.card, ov.accent, 3 * d);
    let y = top + 56 * d;
    this.text(ov.title, w / 2, y, (ov.title.length > 16 ? 22 : 28) * d, ov.accent);
    y += 20 * d;
    for (const line of ov.lines) { y += 28 * d; this.text(line, w / 2, y, 17 * d, C.white); }
    y += 24 * d;
    this.overlayButtonRects = ov.buttons.map(([label], i) => {
      const r = rect(left + 24 * d, y, left + cw - 24 * d, y + btnH);
      this.rr(r.l, r.t, r.w, r.h, 16 * d, i === 0 ? ov.accent : C.button);
      this.text(label, r.cx, r.cy + 6 * d, 17 * d, i === 0 ? C.dark : C.white);
      y += btnH + 10 * d;
      return r;
    });
  }

  // =====================================================================
  // efeitos
  // =====================================================================

  addText(text, x, y, color, size, dur = 1, delay = 0) { this.texts.push({ text, x, y, color, size, t: 0, dur, delay }); }

  P(x, y, vx, vy, color, size, life, shape = P_SQUARE, rot = 0, spin = 0, gravity = 1, pts = null) {
    this.particles.push({ x, y, vx, vy, color, size, life, maxLife: life, shape, rot, spin, gravity, pts });
  }

  playBreakSound() {
    const sfx = { flat: Sfx.THUD, retro: Sfx.PIXEL, glass: Sfx.SHATTER, bubble: Sfx.POP, jewel: Sfx.JEWEL }[current.style.id];
    if (!sfx) return;
    const now = performance.now();
    if (now - this.lastBreakSound < 60) return;
    this.lastBreakSound = now;
    Sound.play(sfx, 0.92 + Math.random() * 0.16, 0.8);
  }

  /** Efeito de destruição conforme o estilo de bloco. cells: [{cell, color}] */
  spawnClearFx(cells, burst = 3) {
    if (!cells.length) return;
    const styleId = current.style.id, d = this.d, cell = this.cell;
    if (styleId === "candy") return this.spawnCandyFx(cells, burst);
    this.playBreakSound();
    for (const { cell: cl, color: ci } of cells) {
      if (this.particles.length > 1100) break;
      const color = colorOf(ci), x = this.boardLeft + cl.c * cell, y = this.boardTop + cl.r * cell, cx = x + cell / 2, cy = y + cell / 2;
      if (styleId === "flat") {
        for (let q = 0; q < 4; q++) {
          const qx = q % 2 === 0 ? -1 : 1, qy = q < 2 ? -1 : 1, life = rnd(0.6, 0.9);
          this.P(cx + (qx * cell) / 4, cy + (qy * cell) / 4, qx * rnd(60, 160) * d, (qy * 60 - rnd(150, 320)) * d, color, cell * 0.46, life,
            P_QUAD, 0, rnd(-260, 260), 1, [-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]);
        }
      } else if (styleId === "retro") {
        const ps = cell / 4;
        for (let i = 0; i < 16; i++) {
          const px = x + (i % 4) * ps + ps / 2, py = y + Math.floor(i / 4) * ps + ps / 2, life = rnd(0.45, 0.8);
          const c2 = i % 5 === 0 ? lighten(color, 0.4) : i % 3 === 0 ? shade(color, 0.7) : color;
          this.P(px, py, ((px - cx) / cell) * rnd(300, 600) * d, (((py - cy) / cell) * 300 - rnd(150, 380)) * d, c2, ps * 0.92, life, P_PIXEL);
        }
      } else if (styleId === "glass") {
        const ox = rnd(-0.12, 0.12), oy = rnd(-0.12, 0.12);
        const rim = [-0.5, -0.5, 0, -0.5, 0.5, -0.5, 0.5, 0, 0.5, 0.5, 0, 0.5, -0.5, 0.5, -0.5, 0];
        for (let k = 0; k < 8; k++) {
          const ax = rim[k * 2], ay = rim[k * 2 + 1], bx = rim[(k * 2 + 2) % 16], by = rim[(k * 2 + 3) % 16];
          const mx = (ox + ax + bx) / 3, my = (oy + ay + by) / 3, life = rnd(0.5, 0.85);
          this.P(cx + mx * cell, cy + my * cell, mx * rnd(500, 900) * d, (my * 500 - rnd(120, 300)) * d, lighten(color, 0.25), cell, life,
            P_SHARD, 0, rnd(-400, 400), 0.9, [ox - mx, oy - my, ax - mx, ay - my, bx - mx, by - my]);
        }
        for (let i = 0; i < 3; i++) { const life = rnd(0.3, 0.5); this.P(cx, cy, rnd(-250, 250) * d, rnd(-350, -100) * d, C.white, rnd(3, 5) * d, life, P_CIRCLE); }
      } else if (styleId === "bubble") {
        this.P(cx, cy, 0, 0, lighten(color, 0.4), cell * 0.9, 0.3, P_RING, 0, 0, 0);
        for (let i = 0; i < 7; i++) {
          const ang = rnd(0, 6.283), sp = rnd(150, 380) * d, l2 = rnd(0.35, 0.6);
          this.P(cx + Math.cos(ang) * cell * 0.35, cy + Math.sin(ang) * cell * 0.35, Math.cos(ang) * sp, Math.sin(ang) * sp - 80 * d, lighten(color, 0.3), rnd(3, 7) * d, l2, P_CIRCLE, 0, 0, 0.6);
        }
      } else if (styleId === "jewel") {
        for (let i = 0; i < 6; i++) {
          const ang = rnd(0, 6.283), sp = rnd(220, 520) * d, life = rnd(0.55, 0.9);
          this.P(cx, cy, Math.cos(ang) * sp, Math.sin(ang) * sp - 150 * d, i % 2 === 0 ? lighten(color, 0.35) : color, cell * rnd(0.22, 0.34), life,
            P_DIAMOND, rnd(0, 360), rnd(-300, 300), 0.8, [0, -0.6, 0.4, 0, 0, 0.6, -0.4, 0]);
        }
        for (let i = 0; i < 3; i++) {
          const life = rnd(0.6, 0.95);
          this.P(cx + rnd(-0.5, 0.5) * cell, cy + rnd(-0.5, 0.5) * cell, rnd(-30, 30) * d, rnd(-60, -20) * d, C.white, rnd(9, 14) * d, life, P_STAR, rnd(0, 6), 0, 0);
        }
      } else this.clears.push({ x, y, color, t: 0 });
    }
  }

  spawnCandyFx(cells, burst) {
    const d = this.d, cell = this.cell;
    for (const { cell: cl, color: ci } of cells) {
      const color = colorOf(ci), x = this.boardLeft + cl.c * cell, y = this.boardTop + cl.r * cell;
      this.clears.push({ x, y, color, t: 0 });
      if (this.particles.length < 1100) for (let i = 0; i < burst; i++) {
        const life = 0.5 + Math.random() * 0.5;
        this.P(x + cell / 2, y + cell / 2, (Math.random() - 0.5) * 500 * d, -(150 + Math.random() * 450) * d, lighten(color, 0.2), (4 + Math.random() * 6) * d, life);
      }
    }
  }

  spawnExplosion(x, y) {
    const colors = ["#ffd23f", "#ff9f1c", "#ff4d5e", "#ffffff"], d = this.d;
    for (let i = 0; i < 40; i++) {
      const ang = Math.random() * 6.2832, sp = (250 + Math.random() * 650) * d, life = 0.4 + Math.random() * 0.5;
      this.P(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp - 200 * d, colors[Math.floor(Math.random() * 4)], (4 + Math.random() * 8) * d, life);
    }
  }

  onHit(hit) {
    const d = this.d;
    if (hit.cracked.length) {
      Sound.play(Sfx.CRACK);
      for (const cl of hit.cracked) {
        const [x, y] = this.cellCenter(cl);
        for (let i = 0; i < 6; i++) { const life = 0.35 + Math.random() * 0.3; this.P(x, y, (Math.random() - 0.5) * 300 * d, -(100 + Math.random() * 250) * d, "#9aa0b8", (3 + Math.random() * 4) * d, life); }
      }
    }
    hit.bonusesFromBlocks.forEach(({ cell: cl, bonus }, i) => {
      const [x, y] = this.cellCenter(cl);
      this.addText(`+1 ${Bonus[bonus].icon}`, x, y, C.cyan, 24 * d, 1.2, i * 0.15);
    });
    if (hit.bonusesFromBlocks.length) Sound.play(Sfx.BONUS);
    hit.gemsDestroyed.forEach((cl, i) => {
      const [x, y] = this.cellCenter(cl);
      this.addText("💎", x, y, C.purple, 30 * d, 1.1, i * 0.1);
      for (let k = 0; k < 14; k++) { const life = 0.5 + Math.random() * 0.5; this.P(x, y, (Math.random() - 0.5) * 600 * d, -(200 + Math.random() * 500) * d, k % 2 === 0 ? C.purple : "#e6d2ff", (4 + Math.random() * 5) * d, life); }
    });
  }

  announceBonuses(list) {
    list.forEach((b, i) => { const r = this.bonusRects[b]; this.addText(`+1 ${Bonus[b].icon}`, r.cx, r.t - 6 * this.d, C.cyan, 20 * this.d, 1.1, i * 0.25); });
    if (list.length) Sound.play(Sfx.BONUS);
  }

  showWord(lines) {
    const [text, colors] = lines >= 4 ? ["Perfeito!", ["#ff4d5e", "#ff9f1c", "#ffd23f", "#3ddc84", "#2ec4f1", "#4d7cfe", "#b15cff"]]
      : lines === 3 ? ["Excelente!", ["#ff9f1c", "#ff6fb5", "#b15cff", "#ff6fb5"]]
      : lines === 2 ? ["Ótimo!", ["#2ec4f1", "#4d7cfe", "#b15cff", "#2ec4f1"]]
      : ["Bom!", ["#3ddc84", "#ffd23f", "#3ddc84"]];
    this.word = { text, colors, t: 0 };
    Sound.speakLines(lines);
  }

  onMove(res) {
    const d = this.d, e = this.engine;
    if (res.usedRotation) this.syncReserve();
    if (res.stones.length) {
      Sound.play(Sfx.CRACK, 0.8);
      this.addText("⚠ Pedras!", this.boardLeft + this.boardSize / 2, this.boardTop + this.boardSize * 0.2, C.red, 26 * d, 1.3, 0.3);
      for (const cl of res.stones) {
        const [x, y] = this.cellCenter(cl);
        for (let i = 0; i < 8; i++) { const life = 0.4 + Math.random() * 0.3; this.P(x, y, (Math.random() - 0.5) * 280 * d, -(80 + Math.random() * 220) * d, "#9aa0b8", (3 + Math.random() * 4) * d, life); }
      }
    }
    const cx = res.placedCells.reduce((s, c) => s + this.boardLeft + c.c * this.cell + this.cell / 2, 0) / res.placedCells.length;
    const cy = res.placedCells.reduce((s, c) => s + this.boardTop + c.r * this.cell + this.cell / 2, 0) / res.placedCells.length;
    if (res.linesCleared > 0) {
      vibrate(true);
      Sound.play(Sfx.CLEAR, 1 + 0.12 * (Math.min(res.linesCleared, 5) - 1) + 0.04 * Math.min(res.combo, 6));
      this.spawnClearFx(res.hit.removed);
      this.onHit(res.hit);
      this.addText(`+${fmt(res.points)}`, cx, cy, C.gold, 30 * d);
      this.showWord(res.linesCleared);
      if (res.combo >= 2) { this.comboValue = res.combo; this.comboT = 0; }
      if (res.boardCleared) this.addText("Tabuleiro limpo! +500", this.boardLeft + this.boardSize / 2, this.boardTop + this.boardSize * 0.78, C.green, 24 * d, 1.4, 0.3);
    } else {
      vibrate(false);
      Sound.play(Sfx.PLACE);
      this.addText(`+${res.points}`, cx, cy, C.white, 18 * d, 0.7);
    }
    const others = [...res.bonusesEarned];
    for (const b of res.hit.bonusesFromBlocks) { const i = others.indexOf(b.bonus); if (i >= 0) others.splice(i, 1); }
    this.announceBonuses(others);
    if (res.usedRotation && this.pendingBonus === ROTATE && !e.freeRotate) this.pendingBonus = this.restBonus();
    if (this.isTutorial()) {
      const st = this.step();
      if (res.linesCleared >= st.minLines && (st.action === TutAction.PLACE_CLEAR || (st.action === TutAction.ROTATE_PLACE && res.usedRotation))) this.completeTutorialStep();
    }
    this.afterAction();
  }

  // =====================================================================
  // toque
  // =====================================================================

  boardCellAt(x, y) {
    if (x < this.boardLeft || y < this.boardTop || x >= this.boardLeft + this.boardSize || y >= this.boardTop + this.boardSize) return null;
    return { r: Math.min(GRID - 1, Math.floor((y - this.boardTop) / this.cell)), c: Math.min(GRID - 1, Math.floor((x - this.boardLeft) / this.cell)) };
  }

  updateDragTarget() {
    const p = this.engine.tray[this.dragSlot];
    if (!p || !this.dragActive) { this.dragTarget = null; return; }
    const [x, y] = this.dragOrigin(p);
    const col = Math.round((x - this.boardLeft) / this.cell), row = Math.round((y - this.boardTop) / this.cell);
    this.dragTarget = this.engine.canPlace(p, row, col) ? { r: row, c: col } : null;
  }

  onBonusTap(b) {
    const r = this.bonusRects[b], d = this.d, e = this.engine;
    Sound.play(Sfx.CLICK);
    if (this.isTutorial() && this.step().bonus !== b) { this.addText("Siga a mãozinha 👆", r.cx, r.t - 6 * d, C.dim, 15 * d, 0.9); return; }
    if (!e.has(b)) { this.addText(`Sem ${Bonus[b].label.toLowerCase()}`, r.cx, r.t - 6 * d, C.dim, 15 * d, 0.8); return; }
    if (this.pendingBonus === b) { this.pendingBonus = this.restBonus(); return; }
    if (b === SHUFFLE) {
      this.pendingBonus = this.restBonus();
      if (e.useShuffle()) {
        this.syncReserve();
        vibrate(true);
        Sound.play(Sfx.SLASH, 1.4, 0.6);
        this.addText("Peças trocadas!", this.W / 2, this.slotRects[0].t + 10 * d, C.cyan, 20 * d);
        if (this.isTutorial() && this.step().action === TutAction.SHUFFLE) this.completeTutorialStep();
        this.afterAction();
      }
    } else this.pendingBonus = b;
  }

  rotateSlot(slot) {
    const r = this.slotRects[slot], d = this.d, e = this.engine;
    if (!e.canRotate(slot)) { this.addText("Essa peça não gira", r.cx, r.t + 10 * d, C.dim, 14 * d, 0.9); return; }
    if (e.rotate(slot)) { vibrate(false); Sound.play(Sfx.CLICK, 1.3); }
    else this.addText("Sem girar suficiente", r.cx, r.t + 10 * d, C.dim, 14 * d, 0.9);
    if (!e.has(ROTATE)) this.pendingBonus = this.restBonus();
  }

  handleBoardBonusTap(b, x, y) {
    const cl = this.boardCellAt(x, y), d = this.d, e = this.engine;
    if (this.isTutorial() && (!cl || !Tutorial.allowBoardTap(this.step(), cl))) { this.addText("Toque na área brilhando", x, y, C.dim, 15 * d, 0.9); return; }
    if (!cl) { this.pendingBonus = this.restBonus(); return; }
    if (b === LINE) {
      const hit = e.useLine(cl.r);
      if (!hit) { this.addText("Linha vazia", x, y, C.dim, 16 * d, 0.8); return; }
      Sound.play(Sfx.SLASH);
      vibrate(true);
      this.syncReserve();
      this.lineFx = { row: cl.r, cells: [...hit.removed], t: 0 };
      this.onHit(hit);
      this.addText(`+${hit.hitCount * 2}`, this.boardLeft + this.boardSize / 2, this.boardTop + cl.r * this.cell, C.gold, 22 * d, 0.9, 0.2);
    } else {
      const hit = e.useBomb(cl.r, cl.c);
      if (!hit) { this.addText("Nada aqui", x, y, C.dim, 16 * d, 0.8); return; }
      Sound.play(Sfx.FUSE);
      this.syncReserve();
      this.bombFx = { center: cl, cells: hit.removed, hit, t: 0, exploded: false };
    }
    this.pendingBonus = this.restBonus();
  }

  pointer(ev) {
    const b = this.canvas.getBoundingClientRect();
    return [ev.clientX - b.left, ev.clientY - b.top];
  }

  down(x, y) {
    const ov = this.overlay;
    if (ov) {
      // os botões da pausa/fim agem ao soltar o dedo (ver up), como botões normais
      this.overlayPress = this.overlayButtonRects.findIndex((r) => inside(r, x, y));
      return;
    }
    if (this.isTutorial()) {
      if (inside(this.skipRect, x, y)) { Sound.play(Sfx.CLICK); this.finishTutorial(); return; }
      if (this.tutNextT > 0 || this.animBusy()) return;
      if (this.step().action === TutAction.CONTINUE) {
        if (inside(this.tutButtonRect, x, y)) { Sound.play(Sfx.WIN); this.finishTutorial(); }
        return;
      }
    }
    if (!this.isRunning() || this.animBusy()) return;
    if (!this.isTutorial() && inside(this.pauseRect, x, y)) { Sound.play(Sfx.CLICK); this.pauseGame(); return; }
    for (const b of Bonus) if (inside(this.bonusRects[b.id], x, y)) { this.onBonusTap(b.id); return; }
    const pb = this.pendingBonus;
    if (pb === LINE || pb === BOMB) { this.handleBoardBonusTap(pb, x, y); return; }
    for (let i = 0; i < 3; i++) {
      if (inside(this.slotRects[i], x, y) && this.engine.tray[i]) {
        this.dragSlot = i;
        this.downX = this.dragX = x;
        this.downY = this.dragY = y;
        this.dragActive = pb !== ROTATE;
        this.updateDragTarget();
        return;
      }
    }
    if (pb === ROTATE) this.pendingBonus = this.restBonus();
  }

  move(x, y) {
    if (this.dragSlot < 0) return;
    this.dragX = x; this.dragY = y;
    if (!this.dragActive && (Math.abs(x - this.downX) > this.touchSlop || Math.abs(y - this.downY) > this.touchSlop)) this.dragActive = true;
    this.updateDragTarget();
  }

  up(x, y) {
    const ov = this.overlay, pressed = this.overlayPress;
    this.overlayPress = -1;
    if (ov && pressed >= 0) {
      const idx = this.overlayButtonRects.findIndex((r) => inside(r, x, y));
      if (idx === pressed && idx < ov.buttons.length) { Sound.play(Sfx.CLICK); ov.buttons[idx][1](); }
      return;
    }
    if (this.dragSlot < 0) return;
    const t = this.dragTarget, slot = this.dragSlot, wasDrag = this.dragActive;
    this.dragSlot = -1; this.dragTarget = null; this.dragActive = false;
    if (!wasDrag && this.pendingBonus === ROTATE) this.rotateSlot(slot);
    else if (t) {
      if (this.isTutorial() && !Tutorial.allowPlace(this.step(), slot, t.r, t.c))
        this.addText("Solte no espaço brilhando", this.W / 2, this.boardTop + this.boardSize * 0.5, C.dim, 16 * this.d, 1);
      else {
        const res = this.engine.place(slot, t.r, t.c);
        if (res) this.onMove(res);
      }
    }
  }

  bindInput() {
    const cv = this.canvas;
    const onDown = (ev) => { ev.preventDefault(); Sound.unlock(); cv.setPointerCapture?.(ev.pointerId); this.down(...this.pointer(ev)); };
    const onMove = (ev) => { ev.preventDefault(); this.move(...this.pointer(ev)); };
    const onUp = (ev) => { ev.preventDefault(); this.up(...this.pointer(ev)); };
    const onCancel = () => { this.dragSlot = -1; this.dragTarget = null; this.dragActive = false; };
    const onResize = () => this.resize();
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onCancel);
    window.addEventListener("resize", onResize);
    this.unbind = () => {
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("resize", onResize);
    };
  }
}

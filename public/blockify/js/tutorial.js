// Roteiro do tutorial (porta do Tutorial.kt).
import { GRID, KIND_BONUS, KIND_NORMAL, Piece, ROTATE, LINE, BOMB, SHUFFLE } from "./engine.js";

export const TutAction = { PLACE_CLEAR: "PLACE_CLEAR", LINE: "LINE", BOMB: "BOMB", ROTATE_PLACE: "ROTATE_PLACE", SHUFFLE: "SHUFFLE", CONTINUE: "CONTINUE" };

const bonus = ({ rotate = 0, line = 0, bomb = 0, shuffle = 0 } = {}) => [rotate, line, bomb, shuffle];
const row = (r, from, to, color) => { const o = []; for (let c = from; c <= to; c++) o.push([r, c, color]); return o; };
const col = (c, from, to, color) => { const o = []; for (let r = from; r <= to; r++) o.push([r, c, color]); return o; };
const decor = [[1, 1, 8], [2, 1, 8], [1, 2, 6], [3, 5, 2]];

const currentCells = (e) => {
  const o = [];
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (e.board[r][c] !== 0 && e.kind[r][c] === KIND_NORMAL) o.push([r, c, e.board[r][c]]);
  return o;
};
const currentSpecials = (e) => {
  const o = [];
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++)
    if (e.board[r][c] !== 0 && e.kind[r][c] !== KIND_NORMAL) o.push({ r, c, kind: e.kind[r][c], bonus: e.bonusIn[r][c], hp: e.hp[r][c] });
  return o;
};

export const steps = [
  {
    title: "Encaixe as peças",
    text: "Arraste a peça até o espaço brilhando\npara completar a linha.",
    action: TutAction.PLACE_CLEAR,
    setup: (e) => e.loadScenario([...row(7, 0, 4, 5), ...row(6, 0, 1, 3), ...decor], [], [null, Piece.parse("XXX", 4), null], bonus()),
    targets: [{ r: 7, c: 5 }, { r: 7, c: 6 }, { r: 7, c: 7 }],
    placeAt: { r: 7, c: 5 }, slot: 1, minLines: 1,
  },
  {
    title: "Linhas e colunas",
    text: "Colunas também contam!\nComplete as duas de uma vez.",
    action: TutAction.PLACE_CLEAR,
    setup: (e) => e.loadScenario([...row(7, 0, 5, 1), ...col(7, 0, 5, 6), ...decor], [], [null, Piece.parse(".X/XX", 3), null], bonus()),
    targets: [{ r: 6, c: 7 }, { r: 7, c: 6 }, { r: 7, c: 7 }],
    placeAt: { r: 6, c: 6 }, slot: 1, minLines: 2,
  },
  {
    title: "Blocos de pedra",
    text: "Blocos de pedra são fortes: o 1º golpe\nracha, o 2º quebra. Complete a linha.",
    action: TutAction.PLACE_CLEAR,
    setup: (e) => e.loadScenario([...row(7, 0, 5, 2), ...decor], [{ r: 7, c: 2, kind: KIND_BONUS, bonus: BOMB }], [null, Piece.parse("XX", 5), null], bonus()),
    targets: [{ r: 7, c: 6 }, { r: 7, c: 7 }],
    placeAt: { r: 7, c: 6 }, slot: 1, minLines: 1,
  },
  {
    title: "Bônus Linha",
    text: "Rachou! Toque em ➖ Linha e depois\nna linha do bloco para quebrá-lo.",
    action: TutAction.LINE,
    setup: (e) => e.loadScenario(currentCells(e), currentSpecials(e), [null, null, null], bonus({ line: 1 })),
    targets: [...Array(GRID).keys()].map((c) => ({ r: 7, c })),
    bonus: LINE, slot: 1, minLines: 1,
  },
  {
    title: "Bônus Bomba",
    text: "O bloco te deu uma bomba! Toque em\n💣 e depois no meio do grupo.",
    action: TutAction.BOMB,
    setup: (e) => {
      const cluster = [];
      for (let r = 2; r <= 4; r++) for (let c = 2; c <= 4; c++) cluster.push([r, c, 1 + ((r + c) % 8)]);
      e.loadScenario([...cluster, [6, 6, 4], [6, 7, 4]], [], [null, null, null], bonus({ bomb: Math.max(1, e.bonuses[BOMB]) }));
    },
    targets: [{ r: 3, c: 3 }],
    bonus: BOMB, slot: 1, minLines: 1,
  },
  {
    title: "Bônus Girar",
    text: "Toque em 🔄, toque na peça para girar\ne arraste para completar a coluna.",
    action: TutAction.ROTATE_PLACE,
    setup: (e) => e.loadScenario([...col(7, 0, 4, 7), ...decor], [], [null, Piece.parse("XXX", 2), null], bonus({ rotate: 1 })),
    targets: [{ r: 5, c: 7 }, { r: 6, c: 7 }, { r: 7, c: 7 }],
    placeAt: { r: 5, c: 7 }, bonus: ROTATE, slot: 1, minLines: 1,
  },
  {
    title: "Bônus Trocar",
    text: "Não gostou das peças? Toque em\n🔀 Trocar para receber outras.",
    action: TutAction.SHUFFLE,
    setup: (e) => e.loadScenario(decor, [], [Piece.parse("X./.X", 6), Piece.parse("XXXXX", 1), Piece.parse("XXX/.X.", 8)], bonus({ shuffle: 1 })),
    targets: [], bonus: SHUFFLE, slot: 1, minLines: 1,
  },
  {
    title: "Pronto!",
    text: "Sem espaço? Você tem 5 segundos\npara usar um bônus. Ganhe mais com\ncombos, fases e blocos de pedra!",
    action: TutAction.CONTINUE,
    setup: (e) => e.loadScenario(decor, [], [null, null, null], bonus()),
    targets: [], slot: 1, minLines: 1,
  },
];

export function allowPlace(step, slot, row, col) {
  if (!step.placeAt) return false;
  return slot === step.slot && row === step.placeAt.r && col === step.placeAt.c;
}

export function allowBoardTap(step, cell) {
  if (step.action === TutAction.LINE) return step.targets.some((t) => t.r === cell.r);
  if (step.action === TutAction.BOMB) return step.targets.some((t) => Math.abs(t.r - cell.r) <= 1 && Math.abs(t.c - cell.c) <= 1);
  return false;
}

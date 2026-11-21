// Desenho dos blocos (porta do BlockPainter.kt): 6 estilos, blocos especiais e rachaduras.
import { KIND_GEM } from "./engine.js";
import { current } from "./skins.js";

const toRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

export const shade = (c, f) => { const [r, g, b] = toRgb(c); return toHex(r * f, g * f, b * f); };
export const lighten = (c, f) => { const [r, g, b] = toRgb(c); return toHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f); };
export const withAlpha = (c, a) => { const [r, g, b] = toRgb(c); return `rgba(${r},${g},${b},${a})`; };

export const colorOf = (index, colors = current.palette.colors) => colors[Math.max(0, Math.min(colors.length - 1, index - 1))];

const STONE = "#7b8098";
const GEM_STONE = "#6a3fa8";

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
}

/** Bloco no estilo escolhido na loja. alpha de 0 a 1. */
export function drawBlock(ctx, x, y, s, color, alpha = 1, styleId = current.style.id) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  switch (styleId) {
    case "flat": drawFlat(ctx, x, y, s, color); break;
    case "retro": drawRetro(ctx, x, y, s, color); break;
    case "glass": drawGlass(ctx, x, y, s, color); break;
    case "bubble": drawBubble(ctx, x, y, s, color); break;
    case "jewel": drawJewel(ctx, x, y, s, color); break;
    default: drawCandy(ctx, x, y, s, color);
  }
  ctx.restore();
}

function drawCandy(ctx, x, y, s, color) {
  const i = s * 0.04, r = s * 0.16;
  ctx.fillStyle = shade(color, 0.7);
  rrect(ctx, x + i, y + i, s - 2 * i, s - 2 * i, r); ctx.fill();
  ctx.fillStyle = color;
  rrect(ctx, x + i + s * 0.06, y + i + s * 0.05, s - 2 * i - s * 0.12, s - 2 * i - s * 0.18, r * 0.8); ctx.fill();
  ctx.save();
  ctx.globalAlpha *= 0.85;
  ctx.fillStyle = lighten(color, 0.55);
  rrect(ctx, x + s * 0.2, y + s * 0.14, s * 0.32, s * 0.09, s * 0.05); ctx.fill();
  ctx.restore();
}

function drawFlat(ctx, x, y, s, color) {
  const i = s * 0.05;
  ctx.fillStyle = color;
  rrect(ctx, x + i, y + i, s - 2 * i, s - 2 * i, s * 0.2); ctx.fill();
  ctx.save();
  ctx.globalAlpha *= 0.8;
  ctx.strokeStyle = lighten(color, 0.3);
  ctx.lineWidth = s * 0.05;
  rrect(ctx, x + i + s * 0.06, y + i + s * 0.06, s - 2 * i - s * 0.12, s - 2 * i - s * 0.12, s * 0.14); ctx.stroke();
  ctx.restore();
}

function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]);
  ctx.closePath();
}

function drawRetro(ctx, x, y, s, color) {
  const i = s * 0.03, l = x + i, t = y + i, r = x + s - i, b = y + s - i, bev = s * 0.16;
  ctx.fillStyle = lighten(color, 0.45);
  poly(ctx, [l, t, r, t, r - bev, t + bev, l + bev, b - bev, l, b]); ctx.fill();
  ctx.fillStyle = shade(color, 0.55);
  poly(ctx, [r, t, r, b, l, b, l + bev, b - bev, r - bev, t + bev]); ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(l + bev, t + bev, r - l - 2 * bev, b - t - 2 * bev);
}

function drawGlass(ctx, x, y, s, color) {
  const i = s * 0.06;
  ctx.save();
  ctx.globalAlpha *= 0.38;
  ctx.fillStyle = color;
  rrect(ctx, x + i, y + i, s - 2 * i, s - 2 * i, s * 0.16); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = lighten(color, 0.35);
  ctx.lineWidth = s * 0.08;
  rrect(ctx, x + i, y + i, s - 2 * i, s - 2 * i, s * 0.16); ctx.stroke();
  ctx.save();
  ctx.globalAlpha *= 0.55;
  ctx.fillStyle = "#ffffff";
  poly(ctx, [x + s * 0.22, y + s * 0.62, x + s * 0.62, y + s * 0.22, x + s * 0.74, y + s * 0.22, x + s * 0.22, y + s * 0.74]); ctx.fill();
  ctx.restore();
}

function drawBubble(ctx, x, y, s, color) {
  const cx = x + s / 2, cy = y + s / 2;
  ctx.fillStyle = shade(color, 0.7);
  ctx.beginPath(); ctx.arc(cx, cy + s * 0.02, s * 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(cx, cy - s * 0.02, s * 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.globalAlpha *= 0.9;
  ctx.fillStyle = lighten(color, 0.7);
  ctx.beginPath(); ctx.ellipse(cx - s * 0.13, cy - s * 0.23, s * 0.11, s * 0.07, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawJewel(ctx, x, y, s, color) {
  const i = s * 0.04, l = x + i, t = y + i, r = x + s - i, b = y + s - i, cut = s * 0.22;
  ctx.fillStyle = shade(color, 0.6);
  poly(ctx, [l + cut, t, r - cut, t, r, t + cut, r, b - cut, r - cut, b, l + cut, b, l, b - cut, l, t + cut]); ctx.fill();
  const cx = x + s / 2, cy = y + s / 2, k = s * 0.36, m = s * 0.15;
  ctx.fillStyle = lighten(color, 0.25);
  poly(ctx, [cx, cy - k, cx + k, cy, cx, cy + k, cx - k, cy]); ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(cx - m, cy - m, 2 * m, 2 * m);
  ctx.save();
  ctx.globalAlpha *= 0.8;
  ctx.fillStyle = lighten(color, 0.75);
  poly(ctx, [cx, cy - k, cx - m, cy - m, cx - k, cy]); ctx.fill();
  ctx.restore();
}

/** Bloco forte: pedra com moldura metálica, rebites, ícone e rachadura (hp 1). */
export function drawSpecial(ctx, x, y, s, kind, hp, icon, alpha = 1) {
  const base = kind === KIND_GEM ? GEM_STONE : STONE;
  drawBlock(ctx, x, y, s, base, alpha);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = lighten(base, 0.6);
  ctx.lineWidth = s * 0.07;
  rrect(ctx, x + s * 0.12, y + s * 0.11, s * 0.76, s * 0.69, s * 0.12); ctx.stroke();
  ctx.fillStyle = lighten(base, 0.75);
  const rv = s * 0.045;
  for (const [px, py] of [[0.2, 0.19], [0.8, 0.19], [0.2, 0.72], [0.8, 0.72]]) {
    ctx.beginPath(); ctx.arc(x + s * px, y + s * py, rv, 0, Math.PI * 2); ctx.fill();
  }
  if (icon) {
    ctx.font = `${s * 0.42}px ${EMOJI_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(icon, x + s / 2, y + s * 0.6);
  }
  ctx.restore();
  if (hp <= 1) drawCrack(ctx, x, y, s, alpha);
}

export function drawCrack(ctx, x, y, s, alpha = 1) {
  const p = (px, py) => [x + s * px, y + s * py];
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(...p(0.18, 0.12)); ctx.lineTo(...p(0.38, 0.34)); ctx.lineTo(...p(0.3, 0.5)); ctx.lineTo(...p(0.55, 0.62)); ctx.lineTo(...p(0.5, 0.85));
    ctx.moveTo(...p(0.38, 0.34)); ctx.lineTo(...p(0.66, 0.28)); ctx.lineTo(...p(0.84, 0.4));
    ctx.moveTo(...p(0.55, 0.62)); ctx.lineTo(...p(0.8, 0.7));
  };
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.globalAlpha *= alpha;
  path(); ctx.strokeStyle = "#15172e"; ctx.lineWidth = s * 0.075; ctx.stroke();
  ctx.globalAlpha *= 0.55;
  path(); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = s * 0.025; ctx.stroke();
  ctx.restore();
}

export const UI_FONT = `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
// a fonte normal vem primeiro (espaços e números); emojis caem nas fontes de emoji
export const EMOJI_FONT = `${UI_FONT}, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"`;

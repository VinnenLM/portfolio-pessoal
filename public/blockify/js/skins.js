// Catálogo da loja (porta do Skins.kt): mesmos ids e preços do app Android.
import { Bonus, ROTATE, LINE, BOMB, SHUFFLE } from "./engine.js";

const hex = (n) => "#" + n.toString(16).padStart(8, "0").slice(2);

export const palettes = [
  { id: "classic", name: "Clássico", price: 0, colors: [0xFFFF4D5E, 0xFFFF9F1C, 0xFFFFD23F, 0xFF3DDC84, 0xFF2EC4F1, 0xFF4D7CFE, 0xFFB15CFF, 0xFFFF6FB5].map(hex) },
  { id: "neon", name: "Neon", price: 800, colors: [0xFFFF2E88, 0xFFFF7A00, 0xFFF5FF00, 0xFF39FF14, 0xFF00F0FF, 0xFF3D5AFE, 0xFFD400FF, 0xFFFF00C8].map(hex) },
  { id: "pastel", name: "Pastel", price: 800, colors: [0xFFFFADAD, 0xFFFFD6A5, 0xFFFDFFB6, 0xFFCAFFBF, 0xFF9BF6FF, 0xFFA0C4FF, 0xFFBDB2FF, 0xFFFFC6FF].map(hex) },
  { id: "ocean", name: "Oceano", price: 800, colors: [0xFF03045E, 0xFF0077B6, 0xFF00B4D8, 0xFF90E0EF, 0xFF48CAE4, 0xFF0096C7, 0xFF2A9D8F, 0xFF76C893].map(hex) },
  { id: "fire", name: "Fogo", price: 800, colors: [0xFFD00000, 0xFFE85D04, 0xFFF48C06, 0xFFFFBA08, 0xFFDC2F02, 0xFFFAA307, 0xFF9D0208, 0xFFFF6B35].map(hex) },
  { id: "forest", name: "Floresta", price: 800, colors: [0xFF2D6A4F, 0xFF40916C, 0xFF52B788, 0xFF95D5B2, 0xFF8D6E63, 0xFFB08968, 0xFFDDB892, 0xFF6A994E].map(hex) },
];

export const styles = [
  { id: "candy", name: "Doce", price: 0, description: "Brilhante e em relevo. Encolhe ao sumir" },
  { id: "flat", name: "Liso", price: 1000, description: "Simples e arredondado. Parte em 4 pedaços" },
  { id: "retro", name: "Retrô", price: 1200, description: "Estilo fliperama. Desfaz em pixels" },
  { id: "glass", name: "Vidro", price: 1500, description: "Transparente. Estilhaça em cacos" },
  { id: "bubble", name: "Bolha", price: 1500, description: "Bolinhas redondas. Estouram" },
  { id: "jewel", name: "Joia", price: 2000, description: "Pedra preciosa. Quebra em lascas brilhantes" },
];

export const backgrounds = [
  { id: "night", name: "Noite", price: 0, top: "#1b1f4b", bottom: "#2d2a78", board: "#141838", empty: "#242a5e" },
  { id: "sunset", name: "Pôr do sol", price: 600, top: "#3a1c4a", bottom: "#b0476b", board: "#2a1030", empty: "#47204f" },
  { id: "forest", name: "Mata", price: 600, top: "#0f2a22", bottom: "#1f5a3a", board: "#0b1f18", empty: "#1c3a2e" },
  { id: "deep", name: "Fundo do mar", price: 600, top: "#0b2540", bottom: "#1a5c8a", board: "#081a30", empty: "#15365a" },
  { id: "carbon", name: "Carbono", price: 600, top: "#151515", bottom: "#2c2c2c", board: "#0e0e0e", empty: "#262626" },
];

export const bonusOffers = [
  { bonus: ROTATE, price: 250, description: "Gira peças" },
  { bonus: LINE, price: 400, description: "Corta uma linha" },
  { bonus: BOMB, price: 500, description: "Explode uma área 3x3" },
  { bonus: SHUFFLE, price: 300, description: "Troca as 3 peças" },
].map((o) => ({ ...o, info: Bonus[o.bonus] }));

export const CASUAL_ID = "casual";
export const CASUAL_PRICE = 50000;
export const POINTS_PER_COIN = 10;
export const coinsFor = (score) => Math.floor(score / POINTS_PER_COIN);

export const findPalette = (id) => palettes.find((p) => p.id === id) || palettes[0];
export const findStyle = (id) => styles.find((s) => s.id === id) || styles[0];
export const findBackground = (id) => backgrounds.find((b) => b.id === id) || backgrounds[0];

/** Seleção atual (aplicada a partir do que está salvo). */
export const current = { palette: palettes[0], style: styles[0], background: backgrounds[0] };

export function applySkins(paletteId, styleId, backgroundId) {
  current.palette = findPalette(paletteId);
  current.style = findStyle(styleId);
  current.background = findBackground(backgroundId);
}

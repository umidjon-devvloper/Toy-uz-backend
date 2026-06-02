// ============================================================
//  OG rasm generatori — to'yxona rasm YUKLAMAGANDA, ulashilgan
//  havola previewi uchun chiroyli rasm (1200×630 PNG) yasaydi.
//  Ism + sana + to'yxona nomi har taklifnomada o'zgaradi.
//  Telegram/Facebook faqat raster (PNG) tushunadi — shuning uchun
//  SVG ni @resvg/resvg-js bilan PNG ga aylantiramiz (font ichida).
// ============================================================
import { Resvg } from "@resvg/resvg-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONT_GV = join(__dirname, "../assets/fonts/GreatVibes-Regular.ttf");
const FONT_EB = join(__dirname, "../assets/fonts/EBGaramond.ttf");

// Fontlarni bir marta o'qiymiz
let fontBuffers = null;
const fonts = () => {
  if (!fontBuffers) fontBuffers = [readFileSync(FONT_GV), readFileSync(FONT_EB)];
  return fontBuffers;
};

const UZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getDate()}-${UZ_MONTHS[dt.getMonth()]}, ${dt.getFullYear()}`;
};

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// 3 ta premium palitra (shablon)
const PALETTES = {
  gold: { bg1: "#fbf7ef", bg2: "#f3e7cf", line: "#e0cfa8", accent: "#c2873a", accentDark: "#8a5a24", sub: "#9a8a6b", ink: "#4a3f2c", heroInk: "#5a4527" },
  maroon: { bg1: "#3a141d", bg2: "#1f070d", line: "rgba(216,177,90,.4)", accent: "#d8b15a", accentDark: "#ecca81", sub: "#c79e86", ink: "#f0dcc8", heroInk: "#f4e3c4" },
  blush: { bg1: "#fdf3f1", bg2: "#f6dcd8", line: "#eccfca", accent: "#c46d72", accentDark: "#9b5360", sub: "#b08e86", ink: "#6b4a4a", heroInk: "#7a4e52" },
};

// Dizayn kalitiga qarab mos palitra (kohesiya uchun), aks holda id bo'yicha barqaror tanlov
const DARK = new Set(["shohona-marun", "tungi-elegant", "zumrad-lux", "vintage-sepiya"]);
const ROSE = new Set(["gulli-bahor", "atirgul-zar"]);
function pickPalette(designKey, id) {
  if (designKey && DARK.has(designKey)) return PALETTES.maroon;
  if (designKey && ROSE.has(designKey)) return PALETTES.blush;
  if (designKey) return PALETTES.gold;
  // dizaynsiz — id bo'yicha aylantiramiz
  const sum = String(id || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return [PALETTES.gold, PALETTES.maroon, PALETTES.blush][sum % 3];
}

// kichik oltin yurakcha (SVG path)
const heart = (cx, cy, s, color) =>
  `<path transform="translate(${cx - 8 * s},${cy - 7 * s}) scale(${s})" fill="${color}" d="M8 14 C8 14 0 9 0 4 C0 1.5 2 0 4 0 C6 0 7.2 1.4 8 2.6 C8.8 1.4 10 0 12 0 C14 0 16 1.5 16 4 C16 9 8 14 8 14 Z"/>`;

// burchak naqshi
const corner = (x, y, sx, sy, color) =>
  `<path d="M ${x} ${y + sy * 34} L ${x} ${y} L ${x + sx * 34} ${y}" stroke="${color}" stroke-width="2" fill="none"/>` +
  `<circle cx="${x + sx * 6}" cy="${y + sy * 6}" r="2.5" fill="${color}"/>`;

function buildSvg(data, p) {
  const groom = esc(data.groomName || "");
  const bride = esc(data.brideName || "");
  const maxLen = Math.max(groom.length, bride.length, 1);
  const nameSize = Math.max(56, Math.min(104, Math.round(880 / maxLen)));
  const dateLine = esc([fmtDate(data.weddingDate), data.weddingTime].filter(Boolean).join("  •  "));
  const venue = esc(data.venueName || data.address || "");

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="80%">
      <stop offset="0%" stop-color="${p.bg1}"/>
      <stop offset="100%" stop-color="${p.bg2}"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="34" y="34" width="1132" height="562" fill="none" stroke="${p.line}" stroke-width="1.5"/>
  <rect x="46" y="46" width="1108" height="538" fill="none" stroke="${p.accent}" stroke-width="1" opacity="0.55"/>
  ${corner(34, 34, 1, 1, p.accent)}
  ${corner(1166, 34, -1, 1, p.accent)}
  ${corner(34, 596, 1, -1, p.accent)}
  ${corner(1166, 596, -1, -1, p.accent)}

  <text x="600" y="138" text-anchor="middle" font-family="EB Garamond" font-size="27" letter-spacing="9" fill="${p.sub}">NIKOH TO'YI TAKLIFNOMASI</text>
  <g>
    <line x1="500" y1="170" x2="572" y2="170" stroke="${p.accent}" stroke-width="1.2"/>
    ${heart(600, 170, 1.5, p.accent)}
    <line x1="628" y1="170" x2="700" y2="170" stroke="${p.accent}" stroke-width="1.2"/>
  </g>

  <text x="600" y="${290}" text-anchor="middle" font-family="Great Vibes" font-size="${nameSize}" fill="${p.heroInk}">${groom}</text>
  <text x="600" y="${336}" text-anchor="middle" font-family="EB Garamond" font-size="24" letter-spacing="6" fill="${p.accent}">VA</text>
  <text x="600" y="${410}" text-anchor="middle" font-family="Great Vibes" font-size="${nameSize}" fill="${p.heroInk}">${bride}</text>

  <line x1="510" y1="450" x2="690" y2="450" stroke="${p.line}" stroke-width="1"/>
  <text x="600" y="498" text-anchor="middle" font-family="EB Garamond" font-size="34" fill="${p.ink}">${dateLine}</text>
  ${venue ? `<text x="600" y="546" text-anchor="middle" font-family="EB Garamond" font-style="italic" font-size="30" fill="${p.accentDark}">${venue}</text>` : ""}
</svg>`;
}

// --- Oddiy kesh (id+ma'lumot bo'yicha) ---
const cache = new Map(); // key -> Buffer
const cacheKey = (d, palName) =>
  [d.groomName, d.brideName, d.weddingDate, d.weddingTime, d.venueName, d.address, palName].join("|");

export function renderOgPng(data) {
  const p = pickPalette(data.designKey, data.id);
  const palName = p === PALETTES.maroon ? "m" : p === PALETTES.blush ? "b" : "g";
  const key = cacheKey(data, palName);
  if (cache.has(key)) return cache.get(key);

  const svg = buildSvg(data, p);
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
    font: { fontBuffers: fonts(), loadSystemFonts: false, defaultFontFamily: "EB Garamond" },
  }).render().asPng();

  if (cache.size > 300) cache.delete(cache.keys().next().value); // sodda LRU
  cache.set(key, png);
  return png;
}

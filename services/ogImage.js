// ============================================================
//  OG rasm generatori — to'yxona rasm YUKLAMAGANDA, ulashilgan
//  havola previewi uchun chiroyli rasm (1200×630 PNG) yasaydi.
//  Ism + sana + to'yxona nomi har taklifnomada o'zgaradi.
//
//  MUHIM: matnni resvg'ning font rendereriga tashlamaymiz —
//  uning o'rniga opentype.js bilan matnni VEKTOR <path> larga
//  aylantiramiz. Sababi: @resvg/resvg-js'ning `fontBuffers` opsiyasi
//  ba'zi serverlarda (Linux/Railway) matnni chizmaydi — natijada
//  faqat ramka chiqib, ism/sana ko'rinmay qoladi. Vektor path esa
//  font talab qilmaydi — har qanday platformada bir xil chiqadi.
// ============================================================
import { Resvg } from "@resvg/resvg-js";
import opentype from "opentype.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONT_GV = join(__dirname, "../assets/fonts/GreatVibes-Regular.ttf"); // ism (script)
const FONT_EB = join(__dirname, "../assets/fonts/EBGaramond.ttf"); // matn (serif)

// Buffer → aniq o'lchamli ArrayBuffer (Node bufferlari poollanishi mumkin)
const toArrayBuffer = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

// Fontlarni bir marta opentype bilan o'qiymiz
let OT = null;
const otFonts = () => {
  if (!OT) {
    OT = {
      script: opentype.parse(toArrayBuffer(readFileSync(FONT_GV))),
      serif: opentype.parse(toArrayBuffer(readFileSync(FONT_EB))),
    };
  }
  return OT;
};

const UZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getDate()}-${UZ_MONTHS[dt.getMonth()]}, ${dt.getFullYear()}`;
};

// Path buyruqlarini ANIQ bo'shliqlar bilan seriyalashtiramiz.
// (opentype'ning toPathData'si raqamlarni ajratuvchisiz qo'shadi — resvg
//  buni chalkashtirib, matnni ko'zgu/artefaktga aylantiradi.)
const rnd = (n) => Number(n.toFixed(2));
function cmdsToD(cmds) {
  let d = "";
  for (const c of cmds) {
    if (c.type === "M") d += `M ${rnd(c.x)} ${rnd(c.y)} `;
    else if (c.type === "L") d += `L ${rnd(c.x)} ${rnd(c.y)} `;
    else if (c.type === "C") d += `C ${rnd(c.x1)} ${rnd(c.y1)} ${rnd(c.x2)} ${rnd(c.y2)} ${rnd(c.x)} ${rnd(c.y)} `;
    else if (c.type === "Q") d += `Q ${rnd(c.x1)} ${rnd(c.y1)} ${rnd(c.x)} ${rnd(c.y)} `;
    else if (c.type === "Z") d += "Z ";
  }
  return d.trim();
}

// ---- Matnni markazlashtirilgan vektor <path> ga aylantiradi ----
// spacing > 0 bo'lsa harf-orasi qo'shiladi (eyebrow / "VA" uchun).
// skew (gradus) — faux kursiv (to'yxona nomi uchun).
// Har belgini charToGlyph orqali olamiz — bu opentype'ning GSUB/bidi
// feature dvigatelini chetlab o'tadi (ba'zi fontlarda u qo'llab-quvvatlanmaydi).
function textPath({ font, text, size, cx, y, color, spacing = 0, skew = 0 }) {
  const s = String(text || "");
  if (!s) return "";
  const scale = size / font.unitsPerEm;
  const chars = [...s];
  const glyphs = chars.map((ch) => font.charToGlyph(ch));
  const adv = glyphs.map((g) => (g.advanceWidth || 0) * scale);
  const total = adv.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
  let x = cx - total / 2;
  // MUHIM: har glyph alohida <path> bo'lishi kerak — resvg bitta <path> ichidagi
  // ko'p sonli subpath'ni to'liq render qilmaydi (matn yarmida kesilib qoladi).
  let paths = "";
  glyphs.forEach((g, i) => {
    const d = cmdsToD(g.getPath(x, y, size).commands);
    if (d) paths += `<path fill="${color}" d="${d}"/>`;
    x += adv[i] + spacing;
  });
  // faux kursiv — matnni o'z bazaviy nuqtasi atrofida qiyalashtiramiz
  return skew
    ? `<g transform="translate(${cx} ${y}) skewX(${skew}) translate(${-cx} ${-y})">${paths}</g>`
    : paths;
}

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
  const { script, serif } = otFonts();
  const groom = data.groomName || "";
  const bride = data.brideName || "";
  const maxLen = Math.max(groom.length, bride.length, 1);
  const nameSize = Math.max(56, Math.min(104, Math.round(880 / maxLen)));
  const dateLine = [fmtDate(data.weddingDate), data.weddingTime].filter(Boolean).join("  •  ");
  const venue = data.venueName || data.address || "";

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

  ${textPath({ font: serif, text: "NIKOH TO'YI TAKLIFNOMASI", size: 27, cx: 600, y: 138, color: p.sub, spacing: 9 })}
  <g>
    <line x1="500" y1="170" x2="572" y2="170" stroke="${p.accent}" stroke-width="1.2"/>
    ${heart(600, 170, 1.5, p.accent)}
    <line x1="628" y1="170" x2="700" y2="170" stroke="${p.accent}" stroke-width="1.2"/>
  </g>

  ${textPath({ font: script, text: groom, size: nameSize, cx: 600, y: 290, color: p.heroInk })}
  ${textPath({ font: serif, text: "VA", size: 24, cx: 600, y: 336, color: p.accent, spacing: 6 })}
  ${textPath({ font: script, text: bride, size: nameSize, cx: 600, y: 410, color: p.heroInk })}

  <line x1="510" y1="450" x2="690" y2="450" stroke="${p.line}" stroke-width="1"/>
  ${textPath({ font: serif, text: dateLine, size: 34, cx: 600, y: 498, color: p.ink })}
  ${venue ? textPath({ font: serif, text: venue, size: 30, cx: 600, y: 546, color: p.accentDark, skew: -10 }) : ""}
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
  // Matn endi vektor path — font kerak emas, faqat shakllar chiziladi
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();

  if (cache.size > 300) cache.delete(cache.keys().next().value); // sodda LRU
  cache.set(key, png);
  return png;
}

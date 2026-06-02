// ============================================================
//  10 ta PREMIUM nikoh to'yi taklifnoma dizaynini bazaga kiritadi (upsert).
//  Ishga tushirish:  cd backend  →  node seedDesigns.js
//  Qayta ishlatish xavfsiz — har dizayn `key` bo'yicha yangilanadi.
// ============================================================
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import Design from "./models/Design.js";
import mongoose from "mongoose";

dotenv.config();

// --- Har dizayn uchun yengil SVG preview (admin tanlash thumbnaili + zaxira og:image) ---
function preview(t) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='800' viewBox='0 0 640 800'>` +
    `<rect width='640' height='800' fill='${t.previewBg || t.bg}'/>` +
    `<rect x='30' y='30' width='580' height='740' fill='none' stroke='${t.accent}' stroke-width='2' opacity='.55'/>` +
    `<rect x='44' y='44' width='552' height='712' fill='none' stroke='${t.accent}' stroke-width='1' opacity='.3'/>` +
    `<text x='320' y='250' text-anchor='middle' font-family='Georgia,serif' font-size='28' letter-spacing='6' fill='${t.previewSub || t.sub}'>NIKOH TO&#39;YI</text>` +
    `<text x='320' y='360' text-anchor='middle' font-family='Georgia,serif' font-style='italic' font-size='62' fill='${t.accentDark || t.accent}'>Aziz &amp; Malika</text>` +
    `<text x='320' y='430' text-anchor='middle' font-family='Arial' font-size='20' letter-spacing='6' fill='${t.previewSub || t.sub}'>12 IYUN 2026</text>` +
    `<text x='320' y='560' text-anchor='middle' font-family='Georgia,serif' font-size='90' fill='${t.accent}' opacity='.45'>&#10084;</text>` +
    `<text x='320' y='720' text-anchor='middle' font-family='Arial' font-size='17' letter-spacing='4' fill='${t.previewSub || t.sub}'>${t.name.toUpperCase()}</text>` +
    `</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

// 12 ta suzuvchi yurakcha/gul (CSS animatsiyali)
const PETALS = Array.from({ length: 12 }, (_, i) =>
  `<span>${i % 3 === 0 ? "&#10047;" : "&#10084;"}</span>`
).join("");

// --- Barcha dizaynlar uchun umumiy HTML (placeholder + widgetlar) ---
const HTML = `
<div class="frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
<div class="petals" aria-hidden="true">${PETALS}</div>

<div class="inv">
  <section class="hero">
    <div class="cover" data-toy="cover"></div>
    <div class="veil"></div>
    <div class="hero-c">
      <div class="eyebrow">NIKOH TO&#39;YI TAKLIFNOMASI</div>
      <h1 class="names"><span class="n1">{{groomName}}</span><span class="amp">va</span><span class="n2">{{brideName}}</span></h1>
      <div class="hr"><span></span>&#10084;<span></span></div>
      <div class="date">{{weddingDate}}</div>
      <div class="time">soat {{weddingTime}}</div>
      <div class="place">{{venueName}}</div>
    </div>
    <div class="cue"><i></i></div>
  </section>

  <section class="sec greeting">
    <div class="orn">&#10047;</div>
    <div class="greet-t">Assalomu alaykum, aziz mehmon!</div>
    <p class="greet">Sizni <b>{{groomName}}</b> va <b>{{brideName}}</b>ning nikoh to&#39;yi tantanasiga taklif etamiz. Shu quvonchli kunimizda Siz bilan diydorlashishdan chin dildan mamnun bo&#39;lamiz.</p>
    <p class="desc">{{description}}</p>
  </section>

  <section class="sec">
    <div class="sec-t">To&#39;yga qancha qoldi</div>
    <div data-toy="countdown"></div>
  </section>

  <section class="sec">
    <div class="sec-t">Xotira lavhalari</div>
    <div data-toy="gallery"></div>
  </section>

  <section class="sec">
    <div class="sec-t">To&#39;y manzili</div>
    <p class="addr">{{address}}</p>
    <div data-toy="map"></div>
  </section>

  <footer class="foot">
    <div class="orn small">&#10047;</div>
    <div class="foot-names">{{groomName}} &amp; {{brideName}}</div>
    <div class="foot-sub">Sizni shu quvonchli kunimizda ko&#39;rishdan baxtiyormiz</div>
  </footer>
</div>`;

// --- Mavzu (theme) asosida to'liq CSS yasaydi ---
const buildCss = (t) => {
  const namesCss = t.namesUpper
    ? `text-transform:uppercase;letter-spacing:.12em;`
    : `letter-spacing:${t.namesSpacing || ".005em"};`;
  return `
*{box-sizing:border-box}
/* Scrollbarni yashirish (toza ko'rinish) */
html{scrollbar-width:none;-ms-overflow-style:none}
html::-webkit-scrollbar,body::-webkit-scrollbar,.inv::-webkit-scrollbar{width:0;height:0;display:none}
body{background:${t.bg}}
.inv{position:relative;font-family:${t.body};color:${t.ink};background:${t.bg};overflow-x:hidden;}

/* ===== Chetlardagi naqshli ramka ===== */
.frame{position:fixed;inset:12px;z-index:5;pointer-events:none;border:1px solid ${t.line};}
.frame::after{content:"";position:absolute;inset:6px;border:1px solid ${t.accent};opacity:.4;}
.frame i{position:absolute;width:26px;height:26px;}
.frame i::before{content:"";position:absolute;width:26px;height:2px;background:${t.accent};}
.frame i::after{content:"";position:absolute;width:2px;height:26px;background:${t.accent};}
.frame i:nth-child(1){top:-1px;left:-1px}
.frame i:nth-child(2){top:-1px;right:-1px}.frame i:nth-child(2)::before{right:0}.frame i:nth-child(2)::after{right:0}
.frame i:nth-child(3){bottom:-1px;left:-1px}.frame i:nth-child(3)::before{bottom:0}.frame i:nth-child(3)::after{bottom:0}
.frame i:nth-child(4){bottom:-1px;right:-1px}.frame i:nth-child(4)::before{bottom:0;right:0}.frame i:nth-child(4)::after{bottom:0;right:0}

/* ===== Suzuvchi yurakchalar (optimallashtirilgan) ===== */
.petals{position:fixed;inset:0;z-index:1;pointer-events:none;overflow:hidden}
.petals span{position:absolute;bottom:-26px;color:${t.heart || t.accent};opacity:0;will-change:transform,opacity;animation:rise linear infinite}
.petals span:nth-child(1){left:5%;font-size:13px;animation-duration:14s;animation-delay:-2s}
.petals span:nth-child(2){left:14%;font-size:18px;animation-duration:17s;animation-delay:-8s}
.petals span:nth-child(3){left:23%;font-size:11px;animation-duration:12s;animation-delay:-1s}
.petals span:nth-child(4){left:33%;font-size:16px;animation-duration:19s;animation-delay:-10s}
.petals span:nth-child(5){left:43%;font-size:12px;animation-duration:15s;animation-delay:-4s}
.petals span:nth-child(6){left:52%;font-size:20px;animation-duration:21s;animation-delay:-12s}
.petals span:nth-child(7){left:61%;font-size:13px;animation-duration:13s;animation-delay:-3s}
.petals span:nth-child(8){left:70%;font-size:17px;animation-duration:18s;animation-delay:-9s}
.petals span:nth-child(9){left:78%;font-size:12px;animation-duration:16s;animation-delay:-6s}
.petals span:nth-child(10){left:86%;font-size:19px;animation-duration:22s;animation-delay:-14s}
.petals span:nth-child(11){left:92%;font-size:12px;animation-duration:14s;animation-delay:-5s}
.petals span:nth-child(12){left:48%;font-size:14px;animation-duration:23s;animation-delay:-16s}
@keyframes rise{0%{transform:translateY(0) translateX(0) rotate(0);opacity:0}12%{opacity:.5}50%{transform:translateY(-52vh) translateX(18px) rotate(180deg)}88%{opacity:.32}100%{transform:translateY(-106vh) translateX(-12px) rotate(360deg);opacity:0}}

/* ===== HERO ===== */
.hero{position:relative;min-height:100vh;min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:48px 26px;overflow:hidden;}
.cover{position:absolute;inset:0;background:${t.coverFallback};background-size:cover;background-position:center;}
.veil{position:absolute;inset:0;background:${t.veil};}
.hero-c{position:relative;z-index:3;animation:fu 1.1s ease both;max-width:560px;}
.eyebrow{font-size:11px;font-weight:400;letter-spacing:.44em;text-transform:uppercase;color:${t.heroSub};margin:0 0 24px;padding-left:.44em;}
.names{margin:0;line-height:1.06;color:${t.heroInk};font-family:${t.names};font-weight:${t.namesWeight || 400};font-size:${t.namesSize};text-shadow:0 2px 22px rgba(0,0,0,.18);${namesCss}}
.names .n1,.names .n2{display:block;}
.names .amp{display:block;font-family:${t.body};font-weight:400;font-size:${t.ampSize || "13px"};letter-spacing:.42em;text-transform:uppercase;color:${t.accent};margin:${t.ampGap || ".16em 0"};opacity:.92;}
.hr{display:flex;align-items:center;justify-content:center;gap:14px;color:${t.accent};margin:26px 0 4px;font-size:13px;}
.hr span{display:block;height:1px;width:54px;background:linear-gradient(90deg,transparent,${t.accent});}
.hr span:last-child{background:linear-gradient(270deg,transparent,${t.accent});}
.date{font-family:${t.serif};font-weight:500;font-size:27px;letter-spacing:.01em;color:${t.heroInk};margin-top:14px;}
.time{font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:${t.heroSub};margin-top:8px;}
.place{font-size:14px;color:${t.heroSub};margin-top:16px;}
.cue{position:absolute;bottom:30px;left:50%;transform:translateX(-50%);z-index:3;}
.cue i{display:block;width:12px;height:12px;border-right:2px solid ${t.heroSub};border-bottom:2px solid ${t.heroSub};transform:rotate(45deg);animation:bob 1.6s ease-in-out infinite;opacity:.85;}

/* ===== SECTIONS ===== */
.sec{position:relative;z-index:2;padding:60px 28px;max-width:700px;margin:0 auto;text-align:center;}
.sec-t{position:relative;display:inline-block;font-family:${t.serif};font-size:27px;color:${t.accentDark};margin-bottom:30px;padding:0 18px;}
.sec-t::before,.sec-t::after{content:"";position:absolute;top:55%;width:26px;height:1px;background:${t.line};}
.sec-t::before{right:100%;}
.sec-t::after{left:100%;}
.greeting{padding-top:70px;}
.orn{font-size:28px;color:${t.accent};opacity:.85;margin-bottom:16px;}
.orn.small{font-size:20px;margin-bottom:18px;}
.greet-t{font-family:${t.serif};font-size:23px;color:${t.accentDark};margin-bottom:14px;}
.greet{font-family:${t.serif};font-size:19px;line-height:1.85;color:${t.sub};margin:0 auto;max-width:520px;}
.greet b{color:${t.accentDark};font-weight:600;font-style:italic;}
.desc{font-family:${t.serif};font-style:italic;font-size:18px;line-height:1.75;color:${t.sub};margin:18px auto 0;max-width:500px;}
.desc:empty{display:none;}
.addr{font-size:16px;line-height:1.7;color:${t.sub};margin:0 0 22px;}
[data-toy="countdown"].toy-countdown{gap:12px;}
.toy-cd-box{background:${t.panel};border:1px solid ${t.line};border-radius:16px;min-width:72px;padding:16px 10px;}
.toy-cd-num{font-family:${t.serif};font-size:32px;font-weight:600;color:${t.accentDark};}
.toy-cd-lbl{color:${t.sub};margin-top:6px;}
.toy-gimg{border:3px solid ${t.panel};box-shadow:0 18px 40px ${t.shadow};border-radius:18px;}
.toy-map-btn{background:${t.accent};color:${t.onAccent};box-shadow:0 12px 30px ${t.shadow};font-family:${t.body};letter-spacing:.02em;}
.toy-map-btn:hover{filter:brightness(1.05);}

/* ===== FOOTER ===== */
.foot{position:relative;z-index:2;padding:56px 26px 84px;text-align:center;background:${t.footBg};border-top:1px solid ${t.line};}
.foot-names{font-family:${t.names};font-weight:${t.namesWeight || 400};font-size:38px;color:${t.accentDark};line-height:1;}
.foot-sub{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:${t.sub};margin-top:14px;}

@keyframes fu{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
@keyframes bob{0%,100%{transform:rotate(45deg) translate(0,0)}50%{transform:rotate(45deg) translate(4px,4px)}}
@media(prefers-reduced-motion:reduce){.hero-c,.cue i{animation:none!important}.petals{display:none}}
`;
};

// --- Umumiy sozlamalar (har mavzu ustidan yozadi) ---
// Professional to'y tipografiyasi:
//   names → Playfair Display (nafis, yuqori kontrastli serif)
//   serif → Cormorant Garamond (matn/sarlavha)
//   body  → Jost (toza geometrik sans — yorliq/harf oralig'i uchun)
const base = {
  body: "'Jost',system-ui,sans-serif",
  serif: "'Cormorant Garamond',serif",
  names: "'Playfair Display',serif",
  namesSize: "clamp(44px,12.5vw,74px)",
  namesWeight: 600,
  namesUpper: false,
  namesSpacing: ".005em",
  ampSize: "13px",
  ampGap: ".16em 0",
  onAccent: "#fff",
  shadow: "rgba(20,20,20,.18)",
};

// --- 10 ta premium mavzu ---
const THEMES = [
  {
    key: "oltin-klassik", name: "Oltin Klassik",
    bg: "#faf6ee", ink: "#4a3f2c", sub: "#9a8a6b", accent: "#c2873a", accentDark: "#8a5a24",
    line: "#e7d8bd", panel: "#fffdf8", footBg: "#f3ead7",
    heroInk: "#fff", heroSub: "#f1e6cf", heart: "#d8a45a",
    veil: "linear-gradient(180deg,rgba(40,28,12,.45),rgba(40,28,12,.65))",
    coverFallback: "linear-gradient(150deg,#caa260,#9a6f30 55%,#6f4a1c)",
    shadow: "rgba(135,83,40,.22)",
  },
  {
    key: "shohona-marun", name: "Shohona Marun",
    bg: "#2a0f16", ink: "#f0dcc8", sub: "#c79e86", accent: "#d8b15a", accentDark: "#e7c976",
    line: "rgba(216,177,90,.28)", panel: "rgba(255,255,255,.05)", footBg: "#220b11",
    heroInk: "#f6e4c8", heroSub: "#d6ad7e", heart: "#d8b15a",
    veil: "linear-gradient(180deg,rgba(28,8,14,.55),rgba(28,8,14,.78))",
    coverFallback: "linear-gradient(160deg,#5e1a26,#3a0f18 60%,#1f070d)",
    shadow: "rgba(0,0,0,.45)", previewBg: "#2a0f16", previewSub: "#c79e86",
  },
  {
    key: "minimal-oq", name: "Minimal Oq",
    bg: "#ffffff", ink: "#1b1b1b", sub: "#8a8a8a", accent: "#b9a36a", accentDark: "#1b1b1b",
    line: "#e9e9e9", panel: "#fafafa", footBg: "#fafafa",
    heroInk: "#fff", heroSub: "#ececec", heart: "#cdbd92",
    veil: "linear-gradient(180deg,rgba(0,0,0,.32),rgba(0,0,0,.5))",
    coverFallback: "linear-gradient(160deg,#9a9a9a,#5e5e5e)",
    shadow: "rgba(0,0,0,.12)",
    names: "'Cormorant Garamond',serif", namesSize: "clamp(42px,12vw,68px)", namesWeight: 500, namesUpper: true, ampSize: "13px", ampGap: ".22em 0",
  },
  {
    key: "gulli-bahor", name: "Gulli Bahor",
    bg: "#fdf2f1", ink: "#6b4a4a", sub: "#bb8f8f", accent: "#dd8b8b", accentDark: "#c46d72",
    line: "#f3dcd9", panel: "#fff7f6", footBg: "#fbe7e5",
    heroInk: "#fff", heroSub: "#fbe2df", heart: "#e79ca0",
    veil: "linear-gradient(180deg,rgba(120,60,60,.32),rgba(120,60,60,.55))",
    coverFallback: "linear-gradient(150deg,#f0a9ab,#d4787f 60%,#a85763)",
    shadow: "rgba(196,109,114,.22)",
  },
  {
    key: "tungi-elegant", name: "Tungi Elegant",
    bg: "#101015", ink: "#e7e3da", sub: "#9b948a", accent: "#c9af6e", accentDark: "#dcc488",
    line: "rgba(201,175,110,.26)", panel: "rgba(255,255,255,.05)", footBg: "#0b0b0f",
    heroInk: "#f0e7cf", heroSub: "#bdae89", heart: "#c9af6e",
    veil: "linear-gradient(180deg,rgba(8,8,12,.5),rgba(8,8,12,.78))",
    coverFallback: "linear-gradient(160deg,#26262e,#121217 60%,#070709)",
    shadow: "rgba(0,0,0,.5)", previewBg: "#101015", previewSub: "#9b948a",
  },
  {
    key: "atirgul-zar", name: "Atirgul Zar",
    bg: "#f8ece8", ink: "#5b4a45", sub: "#b08e86", accent: "#b76e79", accentDark: "#9b5360",
    line: "#eed6cf", panel: "#fdf5f2", footBg: "#f3ddd6",
    heroInk: "#fff", heroSub: "#f6ddd6", heart: "#c98793",
    veil: "linear-gradient(180deg,rgba(90,50,55,.3),rgba(90,50,55,.55))",
    coverFallback: "linear-gradient(150deg,#d79aa0,#b76e79 60%,#8a4f5a)",
    shadow: "rgba(155,83,96,.22)",
  },
  {
    key: "zumrad-lux", name: "Zumrad Lux",
    bg: "#0c241e", ink: "#e6f0ea", sub: "#9fbcae", accent: "#d4b25f", accentDark: "#e6c879",
    line: "rgba(212,178,95,.26)", panel: "rgba(255,255,255,.05)", footBg: "#081a16",
    heroInk: "#f3e6c6", heroSub: "#b9d0c2", heart: "#d4b25f",
    veil: "linear-gradient(180deg,rgba(6,22,18,.5),rgba(6,22,18,.78))",
    coverFallback: "linear-gradient(160deg,#16463a,#0c2a22 60%,#06140f)",
    shadow: "rgba(0,0,0,.45)", previewBg: "#0c241e", previewSub: "#9fbcae",
  },
  {
    key: "shampan-marvarid", name: "Shampan Marvarid",
    bg: "#f7f1e7", ink: "#5a5043", sub: "#a99a80", accent: "#c6a86a", accentDark: "#a3854f",
    line: "#e9ddc8", panel: "#fffdf8", footBg: "#f1e7d4",
    heroInk: "#fff", heroSub: "#f0e6d2", heart: "#cdb37a",
    veil: "linear-gradient(180deg,rgba(70,58,38,.3),rgba(70,58,38,.52))",
    coverFallback: "linear-gradient(150deg,#dac79b,#bda06a 60%,#8f7444)",
    shadow: "rgba(163,133,79,.2)",
  },
  {
    key: "zamonaviy-terra", name: "Zamonaviy Terra",
    bg: "#fbf6f1", ink: "#2e2a25", sub: "#9a8b7d", accent: "#c06f52", accentDark: "#a4543a",
    line: "#ece1d6", panel: "#fff", footBg: "#f4e9df",
    heroInk: "#fff", heroSub: "#f3e3d8", heart: "#cf8669",
    veil: "linear-gradient(180deg,rgba(60,40,30,.34),rgba(60,40,30,.56))",
    coverFallback: "linear-gradient(150deg,#d99576,#c06f52 60%,#8f4a32)",
    shadow: "rgba(164,84,58,.2)",
    names: "'Cormorant Garamond',serif", namesSize: "clamp(46px,13vw,74px)", namesWeight: 600, namesUpper: true, ampSize: "13px", ampGap: ".2em 0",
  },
  {
    key: "vintage-sepiya", name: "Vintage Sepiya",
    bg: "#efe6d1", ink: "#574627", sub: "#9a8454", accent: "#9c7b3f", accentDark: "#7c5f2a",
    line: "#dcc89f", panel: "#f6efdd", footBg: "#e7dabd",
    heroInk: "#fbf3df", heroSub: "#e3cfa3", heart: "#b1934f",
    veil: "linear-gradient(180deg,rgba(50,38,16,.42),rgba(50,38,16,.62))",
    coverFallback: "linear-gradient(150deg,#b69a64,#8a6c38 60%,#5e4622)",
    shadow: "rgba(124,95,42,.22)",
    names: "'Cormorant Garamond',serif", namesSize: "clamp(46px,13vw,76px)", namesWeight: 600, namesUpper: false, ampSize: "13px", ampGap: ".18em 0",
  },
];

const run = async () => {
  await connectDB();
  let i = 0;
  for (const raw of THEMES) {
    const t = { ...base, ...raw };
    const doc = {
      key: t.key,
      name: t.name,
      preview: preview(t),
      html: HTML,
      css: buildCss(t),
      order: i,
      status: "active",
    };
    await Design.findOneAndUpdate({ key: t.key }, { $set: doc }, { upsert: true, new: true, setDefaultsOnInsert: true });
    console.log(`  ✓ ${String(++i).padStart(2, "0")}. ${t.name}`);
  }
  console.log(`\n✅ ${THEMES.length} ta premium dizayn bazaga kiritildi (yangilandi).`);
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((e) => { console.error("❌", e.message); process.exit(1); });

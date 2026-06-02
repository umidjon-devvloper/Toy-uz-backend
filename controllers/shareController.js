import Invitation from "../models/Invitation.js";
import "../models/Design.js"; // populate("design") uchun model ro'yxatdan o'tishi shart
import { renderOgPng } from "../services/ogImage.js";

// Backendning o'z bazaviy manzili (og rasm shu yerdan beriladi).
// Tartib: SHARE_BASE_URL → Railway public domeni → so'rovning o'z hosti.
const selfBase = (req) => {
  const explicit = (process.env.SHARE_BASE_URL || "").trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const railway = (process.env.RAILWAY_PUBLIC_DOMAIN || "").trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (railway) return `https://${railway}`;
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0];
  return `${proto}://${req.get("host")}`;
};

// HTML-escape (atribut/matn xavfsizligi uchun)
const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Frontend (SPA) bazaviy manzili — odamlar shu yerga yo'naltiriladi
const clientUrl = () =>
  ((process.env.CLIENT_URL || "http://localhost:5173").split(",")[0] || "").trim().replace(/\/$/, "");

// ============ TELEGRAM / SEO PREVIEW SAHIFASI ============
// GET /i/:id  (backend, /api dan tashqarida)
// Telegram bot / qidiruv robotlari og:* meta'ni o'qiydi; oddiy brauzer SPA'ga yo'naltiriladi.
export const sharePage = async (req, res) => {
  try {
    const inv = await Invitation.findById(req.params.id)
      .select("groomName brideName weddingDate weddingTime venueName address images design")
      .populate("design", "preview name");

    const target = `${clientUrl()}/i/${req.params.id}`;

    if (!inv) {
      // Topilmasa ham SPA'ga yuboramiz (u "topilmadi" ekranini ko'rsatadi)
      return res
        .status(404)
        .set("Content-Type", "text/html; charset=utf-8")
        .send(redirectHtml(target, "Taklifnoma topilmadi", "TOY.UZ", "", target));
    }

    const title = `${inv.groomName} & ${inv.brideName}`;
    const dateStr = inv.weddingDate
      ? new Date(inv.weddingDate).toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" })
      : "";
    const place = inv.venueName || inv.address || "";
    const description = [dateStr, inv.weddingTime, place].filter(Boolean).join(" • ");
    // og:image — o'zi yuklagan rasm bo'lsa o'sha, bo'lmasa o'zimiz generate qiladigan
    // chiroyli taklifnoma rasmi (ism + sana + to'yxona) /og/:id.png orqali beriladi.
    const image = inv.images?.[0] || `${selfBase(req)}/og/${req.params.id}.png`;

    res
      .set("Content-Type", "text/html; charset=utf-8")
      .send(redirectHtml(target, title, "To'y taklifnomasi • TOY.UZ", description, target, image));
  } catch (error) {
    res.status(500).send("Xatolik");
  }
};

// ============ GENERATE QILINGAN OG RASM ============
// GET /og/:id.png — to'yxona rasm yuklamaganda, ism+sana+joy bilan chiroyli
// 1200×630 PNG yasab beradi. Telegram/Facebook shu URL ni og:image qilib o'qiydi.
export const ogImage = async (req, res) => {
  try {
    const inv = await Invitation.findById(req.params.id)
      .select("groomName brideName weddingDate weddingTime venueName address design")
      .populate("design", "key");

    if (!inv) return res.status(404).end();

    const png = renderOgPng({
      id: String(inv._id),
      groomName: inv.groomName,
      brideName: inv.brideName,
      weddingDate: inv.weddingDate,
      weddingTime: inv.weddingTime,
      venueName: inv.venueName,
      address: inv.address,
      designKey: inv.design?.key || "",
    });

    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=86400");
    res.send(png);
  } catch (error) {
    res.status(500).end();
  }
};

function redirectHtml(target, title, siteName, description, url, image = "") {
  const t = esc(title);
  const d = esc(description);
  const u = esc(url);
  const img = esc(image);
  const imgTags = img
    ? `<meta property="og:image" content="${img}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:image" content="${img}" />`
    : "";
  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${t} — ${esc(siteName)}</title>
  <meta name="description" content="${d}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${esc(siteName)}" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:url" content="${u}" />
  ${imgTags}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <link rel="canonical" href="${u}" />
  <meta http-equiv="refresh" content="0; url=${u}" />
  <script>window.location.replace(${JSON.stringify(target)});</script>
</head>
<body style="font-family:sans-serif;text-align:center;padding:40px;color:#6b5a3e;background:#faf6ef">
  <p>${t}</p>
  <p><a href="${u}">Taklifnomani ochish →</a></p>
</body>
</html>`;
}

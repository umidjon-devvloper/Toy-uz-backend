import TelegramBot from "node-telegram-bot-api";
import User from "../models/User.js";
import Venue from "../models/Venue.js";

let bot = null;

// Login kutilayotgan chatlar (oddiy xotira sessiyasi)
const awaitingLogin = new Set();

const clientUrl = () => ((process.env.CLIENT_URL || "http://localhost:5173").split(",")[0] || "").trim().replace(/\/$/, "");
// Taklifnoma havolasi — backend OG sahifasiga ishora qiladi (Telegram og:image/og:title o'qiydi),
// odam ochsa SPA'ga yo'naltiriladi. SHARE_BASE_URL bo'lmasa frontend manzili ishlatiladi.
const shareBase = () => ((process.env.SHARE_BASE_URL || "").trim().replace(/\/$/, "") || clientUrl());
const inviteUrl = (id) => `${shareBase()}/i/${id}`;

// WebApp (Mini App) manzili — Telegram faqat HTTPS qabul qiladi
const webAppUrl = () => {
  const u = (process.env.WEBAPP_URL || clientUrl() || "").trim().replace(/\/$/, "");
  return u;
};
const webAppReady = () => webAppUrl().startsWith("https://");

// Panelni ochish tugmasi (web_app) — faqat HTTPS bo'lsa (gap tagida chiqadi)
const panelKeyboard = () =>
  webAppReady()
    ? { reply_markup: { inline_keyboard: [[{ text: "🚀 Panelni ochish", web_app: { url: webAppUrl() } }]] } }
    : {};

// Pastdagi "chetdagi" menyu tugmasini web_app qilamiz. chatId berilsa — o'sha chatga,
// berilmasa — barcha foydalanuvchilar uchun standart (default).
const setMenuButton = (chatId) => {
  if (!bot || !webAppReady()) return;
  const params = { menu_button: { type: "web_app", text: "Panel", web_app: { url: webAppUrl() } } };
  if (chatId) params.chat_id = chatId;
  bot.setChatMenuButton(params).catch((e) => console.error("menu button:", e.message));
};

// ============ BOTNI ISHGA TUSHIRISH ============
export const initBot = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("ℹ️  TELEGRAM_BOT_TOKEN yo'q — Telegram bot o'chirilgan.");
    return null;
  }

  bot = new TelegramBot(token, { polling: true });
  console.log("🤖 Telegram bot ishga tushdi");
  if (webAppReady()) {
    console.log("🟢 WebApp yoqilgan:", webAppUrl());
    setMenuButton(); // hammaga "chetdagi" menyu tugmasi
  } else {
    console.log("🟡 WebApp o'chiq (WEBAPP_URL https emas):", webAppUrl());
  }

  // /start — kirish taklifi (yoki allaqachon ulangan bo'lsa panel tugmasi)
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    setMenuButton(chatId); // chetdagi menyu tugmasi shu chatga
    const connected = await Venue.findOne({ telegramChatId: String(chatId) });
    if (connected) {
      bot.sendMessage(
        chatId,
        `🏛️ *${connected.name}*\n\nSiz allaqachon ulangansiz. Panelni oching 👇`,
        { parse_mode: "Markdown", ...panelKeyboard() }
      );
      return;
    }
    awaitingLogin.add(chatId);
    bot.sendMessage(
      chatId,
      "🎉 *TOY.UZ* botiga xush kelibsiz!\n\n" +
        "To'yxona hisobingizni ulash uchun *login* va *parolingizni* bitta xabarda yuboring:\n\n" +
        "`login parol`\n\nMasalan: `tojbek 12345`",
      { parse_mode: "Markdown" }
    );
  });

  // /stop — uzish
  bot.onText(/\/stop/, async (msg) => {
    const chatId = String(msg.chat.id);
    const venue = await Venue.findOne({ telegramChatId: chatId });
    if (venue) {
      venue.telegramChatId = "";
      venue.telegramUsername = "";
      await venue.save();
      bot.sendMessage(chatId, "🔌 Hisob uzildi. Endi taklifnomalar bu chatga kelmaydi.");
    } else {
      bot.sendMessage(chatId, "Bu chat hech qaysi to'yxonaga ulanmagan.");
    }
  });

  // Login/parol xabarini qabul qilish
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();
    if (text.startsWith("/")) return; // buyruqlarni o'tkazib yuboramiz

    if (!awaitingLogin.has(chatId)) {
      // Ulanmagan bo'lsa eslatma
      const venue = await Venue.findOne({ telegramChatId: String(chatId) });
      if (!venue) {
        bot.sendMessage(chatId, "Ulanish uchun /start ni bosing.");
      }
      return;
    }

    const parts = text.split(/\s+/);
    if (parts.length < 2) {
      bot.sendMessage(chatId, "Format noto'g'ri. `login parol` ko'rinishida yuboring.", { parse_mode: "Markdown" });
      return;
    }
    const [login, password] = [parts[0].toLowerCase(), parts.slice(1).join(" ")];

    try {
      const user = await User.findOne({ login, role: "venue_admin" });
      if (!user || !(await user.matchPassword(password))) {
        bot.sendMessage(chatId, "❌ Login yoki parol noto'g'ri. Qaytadan urinib ko'ring.");
        return;
      }
      if (!user.venue) {
        bot.sendMessage(chatId, "❌ Bu hisobga to'yxona biriktirilmagan.");
        return;
      }
      const venue = await Venue.findById(user.venue);
      venue.telegramChatId = String(chatId);
      venue.telegramUsername = msg.from?.username || msg.from?.first_name || "";
      await venue.save();
      awaitingLogin.delete(chatId);

      bot.sendMessage(
        chatId,
        `✅ Ulandi!\n\n🏛️ *${venue.name}*\n\n` +
          `Endi har bir tasdiqlangan taklifnoma shu chatga avtomatik keladi.\n` +
          (webAppReady()
            ? `Quyidagi tugma orqali panelni oching — login/parolsiz avtomatik kirasiz 👇`
            : ``),
        { parse_mode: "Markdown", ...panelKeyboard() }
      );

      // Pastdagi menyu tugmasini ham "Panel" (web_app) qilamiz
      if (webAppReady()) {
        bot
          .setChatMenuButton({
            chat_id: chatId,
            menu_button: { type: "web_app", text: "Panel", web_app: { url: webAppUrl() } },
          })
          .catch(() => {});
      }
    } catch (e) {
      bot.sendMessage(chatId, "Xatolik yuz berdi, keyinroq urinib ko'ring.");
    }
  });

  bot.on("polling_error", (e) => console.error("Telegram polling xatosi:", e.code || e.message));

  return bot;
};

export const getBot = () => bot;

// ============ TASDIQLANGAN TAKLIFNOMANI TELEGRAMGA YUBORISH ============
// Admin qabul qilganda chaqiriladi
export const sendInvitationToTelegram = async (venue, inv) => {
  try {
    if (!bot || !venue?.telegramChatId) return false;

    const url = inviteUrl(inv._id);
    const dateStr = new Date(inv.weddingDate).toLocaleDateString("uz-UZ");
    const caption =
      `✅ *Taklifnoma tasdiqlandi!*\n\n` +
      `💍 ${inv.groomName} & ${inv.brideName}\n` +
      `📅 ${dateStr} • ${inv.weddingTime}\n` +
      (inv.venueName || inv.address ? `📍 ${inv.venueName || inv.address}\n` : "") +
      (inv.description ? `\n📝 ${inv.description}\n` : "") +
      `\n🔗 Taklifnoma havolasi:\n${url}`;

    const photo = inv.images?.[0];
    if (photo) {
      await bot.sendPhoto(venue.telegramChatId, photo, { caption, parse_mode: "Markdown" });
    } else {
      await bot.sendMessage(venue.telegramChatId, caption, { parse_mode: "Markdown" });
    }
    return true;
  } catch (e) {
    console.error("Telegramga yuborishda xato:", e.message);
    return false;
  }
};

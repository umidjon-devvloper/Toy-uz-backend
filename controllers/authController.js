import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import Venue from "../models/Venue.js";

const genToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { login, password } = req.body;
    console.log(login)
    if (!login || !password) {
      return res.status(400).json({ message: "Login va parol kiriting" });
    }
    const user = await User.findOne({ login: login.toLowerCase() });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Login yoki parol noto'g'ri" });
    }
    if (user.status === "inactive") {
      return res.status(403).json({ message: "Hisob bloklangan" });
    }
    res.json({
      _id: user._id,
      name: user.name,
      login: user.login,
      role: user.role,
      venue: user.venue,
      token: genToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ TELEGRAM WEBAPP AVTO-KIRISH ============
// POST /api/auth/telegram   { initData }
// Telegram WebApp ochilganda initData yuboriladi; uni bot token bilan tekshiramiz
export const telegramLogin = async (req, res) => {
  try {
    const { initData } = req.body;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!initData) return res.status(400).json({ message: "initData yo'q" });
    if (!botToken) return res.status(500).json({ message: "Bot sozlanmagan (TELEGRAM_BOT_TOKEN)" });

    // 1. initData ichidagi hash ni ajratamiz
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    params.delete("hash");

    // 2. data_check_string — qolgan kalitlar alifbo tartibida "key=value\n"
    const dataCheckString = [...params.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join("\n");

    // 3. Telegram algoritmi bo'yicha hash hisoblaymiz
    const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const computed = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    if (computed !== hash) {
      return res.status(401).json({ message: "initData yaroqsiz (imzo to'g'ri kelmadi)" });
    }

    // 4. (ixtiyoriy) eskirganini tekshirish — 24 soat
    const authDate = Number(params.get("auth_date") || 0);
    if (authDate && Date.now() / 1000 - authDate > 86400) {
      return res.status(401).json({ message: "Sessiya eskirgan, qaytadan oching" });
    }

    // 5. Telegram foydalanuvchisi → chat_id orqali to'yxonani topamiz
    const tgUser = JSON.parse(params.get("user") || "{}");
    if (!tgUser.id) return res.status(400).json({ message: "Telegram foydalanuvchi topilmadi" });

    const venue = await Venue.findOne({ telegramChatId: String(tgUser.id) });
    if (!venue || !venue.admin) {
      return res.status(404).json({
        message: "Bu Telegram hisobi ulanmagan. Botda /start bosib, login va parolingiz bilan kiring.",
      });
    }
    const user = await User.findById(venue.admin);
    if (!user) return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    if (user.status === "inactive") return res.status(403).json({ message: "Hisob bloklangan" });

    res.json({
      _id: user._id,
      name: user.name,
      login: user.login,
      role: user.role,
      venue: user.venue,
      token: genToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  res.json(req.user);
};

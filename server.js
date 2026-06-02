import http from "http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import routes from "./routes/index.js";
import { initSocket } from "./config/socket.js";
import { initBot } from "./services/telegramBot.js";
import { sharePage, ogImage } from "./controllers/shareController.js";

dotenv.config();
connectDB();

const app = express();

// CLIENT_URL bir nechta domen bo'lishi mumkin (vergul bilan): "https://app.vercel.app,http://localhost:5173"
const allowedOrigins = ("https://toyuzfrontend.vercel.app")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // origin yo'q (Postman, server-to-server) yoki ruxsat etilgan ro'yxatda bo'lsa — ruxsat
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => res.json({ message: "TOY.UZ API ishlayapti 🎉" }));
app.use("/api", routes);

// Telegram / SEO preview sahifasi (og:image, og:title) — odamlar SPA'ga yo'naltiriladi
app.get("/i/:id", sharePage);

// Generate qilingan og:image (to'yxona rasm yuklamaganda) — chiroyli taklifnoma PNG
app.get("/og/:id.png", ogImage);

// 404
app.use((req, res) => res.status(404).json({ message: "Endpoint topilmadi" }));

// HTTP server + Socket.IO (real-time)
const server = http.createServer(app);
initSocket(server);

// Telegram bot (TELEGRAM_BOT_TOKEN bo'lsa ishga tushadi)
initBot();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server ${PORT}-portda ishlayapti (real-time yoqilgan)`));

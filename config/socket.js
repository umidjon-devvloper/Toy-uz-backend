import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

let io = null;

// Xona nomlari
const SUPER_ROOM = "superadmins";
const venueRoom = (venueId) => `venue:${venueId}`;

// Socket.IO ni HTTP serverga ulaymiz
export const initSocket = (server) => {
  const allowed = (process.env.CLIENT_URL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: allowed.length ? allowed : "*",
      credentials: true,
    },
  });

  // Har bir ulanishda tokenni tekshiramiz (xuddi protect middleware kabi)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Token yo'q"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      if (!user || user.status === "inactive") {
        return next(new Error("Foydalanuvchi yaroqsiz"));
      }
      socket.user = user;
      next();
    } catch (e) {
      next(new Error("Avtorizatsiya xatosi"));
    }
  });

  io.on("connection", (socket) => {
    const u = socket.user;
    // Rolga qarab xonaga qo'shamiz
    if (u.role === "super_admin") {
      socket.join(SUPER_ROOM);
    } else if (u.role === "venue_admin" && u.venue) {
      socket.join(venueRoom(u.venue));
    }
    console.log(`🔌 Ulandi: ${u.login} (${u.role})`);

    socket.on("disconnect", () => {
      console.log(`❌ Uzildi: ${u.login}`);
    });
  });

  return io;
};

export const getIO = () => io;

// Super adminlarga (bizga) xabar — taklifnoma keldi / yangilandi
export const emitToSuperAdmins = (event, payload) => {
  if (io) io.to(SUPER_ROOM).emit(event, payload);
};

// Aniq bir to'yxona adminiga xabar — qabul qilindi / rad etildi
export const emitToVenue = (venueId, event, payload) => {
  if (io) io.to(venueRoom(venueId)).emit(event, payload);
};

import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Token tekshirish
export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return res.status(401).json({ message: "Avtorizatsiya yo'q, token topilmadi" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) {
      return res.status(401).json({ message: "Foydalanuvchi topilmadi" });
    }
    if (req.user.status === "inactive") {
      return res.status(403).json({ message: "Hisob bloklangan" });
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token yaroqsiz" });
  }
};

// Faqat Super Admin
export const superAdminOnly = (req, res, next) => {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({ message: "Faqat Bosh admin uchun ruxsat" });
  }
  next();
};

// Faqat to'yxona admini
export const venueAdminOnly = (req, res, next) => {
  if (req.user?.role !== "venue_admin") {
    return res.status(403).json({ message: "Faqat to'yxona admini uchun ruxsat" });
  }
  next();
};

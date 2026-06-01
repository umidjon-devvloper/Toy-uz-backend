import express from "express";
import { login, getMe, telegramLogin } from "../controllers/authController.js";
import {
  createVenue, getVenues, updateVenue, deleteVenue,
  getStats, getVenueBilling, markPaid, payMonth,
  adjustManualDebt, deletePaidInvitations,
  getIncomingInvitations, acceptInvitation, rejectInvitation,
  getInvitationById, adminUpdateInvitation,
} from "../controllers/adminController.js";
import {
  myStats, myInvitations, createInvitation, updateInvitation,
  sendInvitation, deleteInvitation, publicInvitation,
} from "../controllers/venueController.js";
import {
  listDesigns, adminListDesigns, createDesign, updateDesign, deleteDesign,
} from "../controllers/designController.js";
import {
  listMusic, adminListMusic, createMusic, updateMusic, deleteMusic,
} from "../controllers/musicController.js";
import { protect, superAdminOnly, venueAdminOnly } from "../middleware/auth.js";

const router = express.Router();

// --- AUTH ---
router.post("/auth/login", login);
router.post("/auth/telegram", telegramLogin); // Telegram WebApp avto-kirish
router.get("/auth/me", protect, getMe);

// --- SUPER ADMIN ---
router.post("/admin/venues", protect, superAdminOnly, createVenue);
router.get("/admin/venues", protect, superAdminOnly, getVenues);
router.put("/admin/venues/:id", protect, superAdminOnly, updateVenue);
router.delete("/admin/venues/:id", protect, superAdminOnly, deleteVenue);
router.get("/admin/stats", protect, superAdminOnly, getStats);
router.get("/admin/venues/:id/billing", protect, superAdminOnly, getVenueBilling);
router.put("/admin/invitations/:id/pay", protect, superAdminOnly, markPaid);
router.put("/admin/venues/:id/pay-month", protect, superAdminOnly, payMonth);
router.put("/admin/venues/:id/adjust-debt", protect, superAdminOnly, adjustManualDebt);
router.delete("/admin/venues/:id/paid-invitations", protect, superAdminOnly, deletePaidInvitations);
// Real-time taklifnoma oqimi (inbox) + qabul qilish / rad etish + to'liq tahrir
router.get("/admin/invitations", protect, superAdminOnly, getIncomingInvitations);
router.get("/admin/invitations/:id", protect, superAdminOnly, getInvitationById);
router.put("/admin/invitations/:id", protect, superAdminOnly, adminUpdateInvitation);
router.put("/admin/invitations/:id/accept", protect, superAdminOnly, acceptInvitation);
router.put("/admin/invitations/:id/reject", protect, superAdminOnly, rejectInvitation);
// Dizaynlar (HTML/CSS kod) boshqaruvi
router.get("/admin/designs", protect, superAdminOnly, adminListDesigns);
router.post("/admin/designs", protect, superAdminOnly, createDesign);
router.put("/admin/designs/:id", protect, superAdminOnly, updateDesign);
router.delete("/admin/designs/:id", protect, superAdminOnly, deleteDesign);
// Musiqa boshqaruvi
router.get("/admin/music", protect, superAdminOnly, adminListMusic);
router.post("/admin/music", protect, superAdminOnly, createMusic);
router.put("/admin/music/:id", protect, superAdminOnly, updateMusic);
router.delete("/admin/music/:id", protect, superAdminOnly, deleteMusic);

// --- VENUE ADMIN ---
router.get("/venue/stats", protect, venueAdminOnly, myStats);
router.get("/venue/invitations", protect, venueAdminOnly, myInvitations);
router.post("/venue/invitations", protect, venueAdminOnly, createInvitation);
router.put("/venue/invitations/:id", protect, venueAdminOnly, updateInvitation);
router.put("/venue/invitations/:id/send", protect, venueAdminOnly, sendInvitation);
router.delete("/venue/invitations/:id", protect, venueAdminOnly, deleteInvitation);

// --- DIZAYN / MUSIQA (autentifikatsiya talab qiladi — to'yxona admin tanlovi uchun) ---
router.get("/designs", protect, listDesigns);
router.get("/music", protect, listMusic);

// --- PUBLIC (mehmonlar) ---
router.get("/public/invitation/:id", publicInvitation);

export default router;

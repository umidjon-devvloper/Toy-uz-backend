import express from "express";
import { login, getMe, telegramLogin } from "../controllers/authController.js";
import {
  createVenue, getVenues, updateVenue, deleteVenue,
  getStats, getVenueBilling, markPaid, payMonth,
  getIncomingInvitations, acceptInvitation, rejectInvitation,
} from "../controllers/adminController.js";
import {
  myStats, myInvitations, createInvitation, updateInvitation,
  sendInvitation, deleteInvitation, publicInvitation, submitRsvp,
} from "../controllers/venueController.js";
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
// Real-time taklifnoma oqimi (inbox) + qabul qilish / rad etish
router.get("/admin/invitations", protect, superAdminOnly, getIncomingInvitations);
router.put("/admin/invitations/:id/accept", protect, superAdminOnly, acceptInvitation);
router.put("/admin/invitations/:id/reject", protect, superAdminOnly, rejectInvitation);

// --- VENUE ADMIN ---
router.get("/venue/stats", protect, venueAdminOnly, myStats);
router.get("/venue/invitations", protect, venueAdminOnly, myInvitations);
router.post("/venue/invitations", protect, venueAdminOnly, createInvitation);
router.put("/venue/invitations/:id", protect, venueAdminOnly, updateInvitation);
router.put("/venue/invitations/:id/send", protect, venueAdminOnly, sendInvitation);
router.delete("/venue/invitations/:id", protect, venueAdminOnly, deleteInvitation);

// --- PUBLIC (mehmonlar) ---
router.get("/public/invitation/:id", publicInvitation);
router.post("/public/invitation/:id/rsvp", submitRsvp);

export default router;

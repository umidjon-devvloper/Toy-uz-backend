import Invitation from "../models/Invitation.js";
import Venue from "../models/Venue.js";
import "../models/Design.js"; // populate("design")
import "../models/Music.js"; // populate("music")
import { emitToSuperAdmins } from "../config/socket.js";

// ============ TO'YXONA ADMIN DASHBOARD ============
// GET /api/venue/stats
export const myStats = async (req, res) => {
  try {
    const venueId = req.user.venue;
    const total = await Invitation.countDocuments({ venue: venueId });
    const sent = await Invitation.countDocuments({ venue: venueId, status: "sent" });
    const draft = await Invitation.countDocuments({ venue: venueId, status: "draft" });
    const guestsAgg = await Invitation.aggregate([
      { $match: { venue: venueId, status: "sent" } },
      { $group: { _id: null, g: { $sum: "$rsvpGuests" } } },
    ]);
    res.json({
      total,
      sent,
      draft,
      guests: guestsAgg[0]?.g || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ MENING TAKLIFNOMALARIM ============
// GET /api/venue/invitations
export const myInvitations = async (req, res) => {
  try {
    const list = await Invitation.find({ venue: req.user.venue }).sort("-createdAt");
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ YANGI TAKLIFNOMA (qoralama) ============
// POST /api/venue/invitations
export const createInvitation = async (req, res) => {
  try {
    const data = { ...req.body, venue: req.user.venue, createdBy: req.user._id, status: "draft" };
    if (!data.design) delete data.design; // bo'sh string ObjectId cast xatosini oldini olish
    if (!data.music) delete data.music;

    // Joylashuv to'yxona darajasidan meros (to'yxona admin alohida kiritmaydi)
    const venue = await Venue.findById(req.user.venue);
    if (venue) {
      if (!data.venueName) data.venueName = venue.name || "";
      if (!data.address) data.address = venue.address || "";
      if (!data.mapLink) data.mapLink = venue.mapLink || "";
    }

    const inv = await Invitation.create(data);
    res.status(201).json(inv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ TAKLIFNOMANI TAHRIRLASH ============
// PUT /api/venue/invitations/:id
//  • Qoralama (draft) — to'liq tahrir, cheklovsiz.
//  • Yuborilgan (sent) — faqat ism (kuyov/kelin) va soat, va faqat BIR MARTA.
export const updateInvitation = async (req, res) => {
  try {
    const inv = await Invitation.findOne({ _id: req.params.id, venue: req.user.venue });
    if (!inv) return res.status(404).json({ message: "Topilmadi" });

    if (inv.status === "draft") {
      // Qoralama — barcha maydonlar
      const fields = [
        "groomName", "brideName", "weddingDate", "weddingTime", "venueName",
        "address", "mapLink", "images", "description", "template", "design", "music",
      ];
      fields.forEach((f) => {
        if (req.body[f] === undefined) return;
        if (f === "design" || f === "music") inv[f] = req.body[f] || null;
        else inv[f] = req.body[f];
      });
      await inv.save();
      return res.json(inv);
    }

    // Yuborilgan — bir martalik cheklangan tahrir (faqat ism + soat)
    if (inv.venueEditUsed) {
      return res.status(403).json({ message: "Bu taklifnoma allaqachon bir marta tahrirlangan. Qo'shimcha o'zgartirish uchun bosh admin bilan bog'laning." });
    }
    const allowed = ["groomName", "brideName", "weddingTime"];
    let changed = false;
    allowed.forEach((f) => {
      if (req.body[f] !== undefined && req.body[f] !== inv[f]) {
        inv[f] = req.body[f];
        changed = true;
      }
    });
    if (!changed) {
      return res.status(400).json({ message: "Hech qanday o'zgarish kiritilmadi (faqat ism va soatni tahrirlash mumkin)." });
    }
    inv.venueEditUsed = true;
    await inv.save();
    res.json(inv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ TAKLIFNOMANI YUBORISH (HISOBGA OLINADI) ============
// PUT /api/venue/invitations/:id/send
export const sendInvitation = async (req, res) => {
  try {
    const inv = await Invitation.findOne({ _id: req.params.id, venue: req.user.venue });
    if (!inv) return res.status(404).json({ message: "Topilmadi" });
    if (inv.status === "sent") {
      return res.status(400).json({ message: "Allaqachon yuborilgan" });
    }
    // Joriy to'yxona narxini "muzlatib" qo'yamiz
    const venue = await Venue.findById(req.user.venue);
    inv.status = "sent";
    inv.sentAt = new Date();
    inv.priceSnapshot = venue.pricePerInvitation;
    inv.acceptStatus = "pending"; // Super admin qabul qilishini kutadi
    inv.acceptedAt = null;
    inv.rejectReason = "";
    await inv.save();

    // 🔴 REAL-TIME: super adminlarga (bizga) darhol yetkazamiz
    emitToSuperAdmins("invitation:incoming", {
      invitation: inv.toObject(),
      venue: { _id: venue._id, name: venue.name, phone: venue.phone, pricePerInvitation: venue.pricePerInvitation },
      at: inv.sentAt,
    });

    res.json({ message: "Taklifnoma yuborildi va hisobga olindi", invitation: inv });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ TAKLIFNOMANI O'CHIRISH (faqat qoralama) ============
// DELETE /api/venue/invitations/:id
export const deleteInvitation = async (req, res) => {
  try {
    const inv = await Invitation.findOne({ _id: req.params.id, venue: req.user.venue });
    if (!inv) return res.status(404).json({ message: "Topilmadi" });
    if (inv.status === "sent") {
      return res.status(400).json({ message: "Yuborilgan taklifnomani o'chirib bo'lmaydi" });
    }
    await inv.deleteOne();
    res.json({ message: "O'chirildi" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ OMMAVIY TAKLIFNOMA KO'RISH (mehmonlar uchun) ============
// GET /api/public/invitation/:id
export const publicInvitation = async (req, res) => {
  try {
    const inv = await Invitation.findById(req.params.id)
      .select(
        "groomName brideName weddingDate weddingTime venueName address mapLink images description template design music status"
      )
      .populate("design", "key name preview html css")
      .populate("music", "name url cover");
    if (!inv) return res.status(404).json({ message: "Topilmadi" });
    res.json(inv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

import Invitation from "../models/Invitation.js";
import Venue from "../models/Venue.js";
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
    const inv = await Invitation.create(data);
    res.status(201).json(inv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ TAKLIFNOMANI TAHRIRLASH ============
// PUT /api/venue/invitations/:id
export const updateInvitation = async (req, res) => {
  try {
    const inv = await Invitation.findOne({ _id: req.params.id, venue: req.user.venue });
    if (!inv) return res.status(404).json({ message: "Topilmadi" });
    // Yuborilgan taklifnomaning narxi/statusiga tegmaymiz, faqat ma'lumotlar
    const fields = ["groomName", "brideName", "weddingDate", "weddingTime", "venueName", "address", "mapLink", "images", "description", "template"];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) inv[f] = req.body[f];
    });
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
    const inv = await Invitation.findById(req.params.id).select(
      "groomName brideName weddingDate weddingTime venueName address mapLink images description template status"
    );
    if (!inv) return res.status(404).json({ message: "Topilmadi" });
    res.json(inv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ RSVP (mehmon javob beradi) ============
// POST /api/public/invitation/:id/rsvp   { guests: 2 }
export const submitRsvp = async (req, res) => {
  try {
    const inv = await Invitation.findById(req.params.id);
    if (!inv) return res.status(404).json({ message: "Topilmadi" });
    inv.rsvpGuests += Number(req.body.guests || 1);
    await inv.save();
    res.json({ message: "Rahmat! Javobingiz qabul qilindi" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

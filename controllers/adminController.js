import User from "../models/User.js";
import Venue from "../models/Venue.js";
import Invitation from "../models/Invitation.js";
import { emitToVenue, emitToSuperAdmins } from "../config/socket.js";
import { sendInvitationToTelegram } from "../services/telegramBot.js";

// Tasodifiy parol generator
const genPassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let p = "";
  for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
};

// ============ TO'YXONA + ADMIN QO'SHISH ============
// POST /api/admin/venues
export const createVenue = async (req, res) => {
  try {
    const { name, login, password, pricePerInvitation, phone, address, mapLink, status } = req.body;

    if (!name || !login) {
      return res.status(400).json({ message: "To'yxona nomi va login majburiy" });
    }
    const exists = await User.findOne({ login: login.toLowerCase() });
    if (exists) {
      return res.status(400).json({ message: "Bu login band" });
    }

    const finalPassword = password || genPassword();

    // 1. To'yxona yaratish
    const venue = await Venue.create({
      name,
      pricePerInvitation: pricePerInvitation || 200000,
      phone: phone || "",
      address: address || "",
      mapLink: mapLink || "",
      status: status || "active",
    });

    // 2. Admin yaratish va to'yxonaga biriktirish
    const admin = await User.create({
      name,
      login: login.toLowerCase(),
      password: finalPassword,
      role: "venue_admin",
      venue: venue._id,
      status: status || "active",
    });

    venue.admin = admin._id;
    await venue.save();

    res.status(201).json({
      venue,
      admin: { _id: admin._id, login: admin.login, name: admin.name },
      plainPassword: finalPassword, // Faqat yaratish vaqtida ko'rsatiladi
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ BARCHA TO'YXONALAR + STATISTIKA ============
// GET /api/admin/venues
export const getVenues = async (req, res) => {
  try {
    const venues = await Venue.find().populate("admin", "login name status").sort("-createdAt");

    // Har bir to'yxona uchun yuborilgan taklifnomalar sonini va qarzini hisoblash
    const now = new Date();
    const result = await Promise.all(
      venues.map(async (v) => {
        const sentCount = await Invitation.countDocuments({ venue: v._id, status: "sent" });
        const finishedCount = await Invitation.countDocuments({
          venue: v._id, status: "sent", weddingDate: { $lt: now },
        });
        const unpaidAgg = await Invitation.aggregate([
          { $match: { venue: v._id, status: "sent", isPaid: false } },
          { $group: { _id: null, debt: { $sum: "$priceSnapshot" }, count: { $sum: 1 } } },
        ]);
        const invoiceDebt = unpaidAgg[0]?.debt || 0;
        const unpaidCount = unpaidAgg[0]?.count || 0;
        const manualDebt = v.manualDebt || 0;
        return {
          ...v.toObject(),
          sentCount,
          finishedCount,
          unpaidCount,
          invoiceDebt,      // taklifnomalardan kelib chiqqan qarz
          manualDebt,       // qo'lda tuzatma
          debt: invoiceDebt + manualDebt, // umumiy qarz
        };
      })
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ TO'YXONANI TAHRIRLASH ============
// PUT /api/admin/venues/:id
export const updateVenue = async (req, res) => {
  try {
    const { name, pricePerInvitation, phone, address, mapLink, status, newPassword, telegramChatId } = req.body;
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ message: "To'yxona topilmadi" });

    if (name !== undefined) venue.name = name;
    if (pricePerInvitation !== undefined) venue.pricePerInvitation = pricePerInvitation;
    if (phone !== undefined) venue.phone = phone;
    if (address !== undefined) venue.address = address;
    if (mapLink !== undefined) venue.mapLink = mapLink;
    if (status !== undefined) venue.status = status;
    if (telegramChatId !== undefined) venue.telegramChatId = telegramChatId; // qo'lda ulash/uzish
    await venue.save();

    // Bog'liq adminni ham yangilash
    if (venue.admin) {
      const admin = await User.findById(venue.admin);
      if (admin) {
        if (name !== undefined) admin.name = name;
        if (status !== undefined) admin.status = status;
        if (newPassword) admin.password = newPassword; // pre-save hash qiladi
        await admin.save();
      }
    }
    res.json(venue);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ TO'YXONANI O'CHIRISH ============
// DELETE /api/admin/venues/:id
export const deleteVenue = async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ message: "To'yxona topilmadi" });

    await User.deleteOne({ _id: venue.admin });
    await Invitation.deleteMany({ venue: venue._id });
    await venue.deleteOne();
    res.json({ message: "To'yxona, admin va taklifnomalar o'chirildi" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ UMUMIY DASHBOARD STATISTIKASI ============
// GET /api/admin/stats
export const getStats = async (req, res) => {
  try {
    const now = new Date();
    const totalVenues = await Venue.countDocuments();
    const activeVenues = await Venue.countDocuments({ status: "active" });
    const totalInvitations = await Invitation.countDocuments();
    const totalSent = await Invitation.countDocuments({ status: "sent" });
    // Tugagan to'ylar — sanasi o'tib ketgan yuborilgan taklifnomalar
    const finishedWeddings = await Invitation.countDocuments({ status: "sent", weddingDate: { $lt: now } });
    const totalGuestsAgg = await Invitation.aggregate([
      { $match: { status: "sent" } },
      { $group: { _id: null, guests: { $sum: "$rsvpGuests" } } },
    ]);

    // Umumiy qarz (to'lanmagan taklifnomalar + qo'lda tuzatmalar)
    const debtAgg = await Invitation.aggregate([
      { $match: { status: "sent", isPaid: false } },
      { $group: { _id: null, debt: { $sum: "$priceSnapshot" } } },
    ]);
    const manualAgg = await Venue.aggregate([
      { $group: { _id: null, m: { $sum: "$manualDebt" } } },
    ]);
    const manualDebtTotal = manualAgg[0]?.m || 0;

    // Oylik daromad grafigi (oxirgi 6 oy)
    const monthly = await Invitation.aggregate([
      { $match: { status: "sent" } },
      {
        $group: {
          _id: { y: { $year: "$sentAt" }, m: { $month: "$sentAt" } },
          count: { $sum: 1 },
          sum: { $sum: "$priceSnapshot" },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
      { $limit: 12 },
    ]);

    res.json({
      totalVenues,
      activeVenues,
      totalInvitations,
      totalSent,
      finishedWeddings,
      totalGuests: totalGuestsAgg[0]?.guests || 0,
      totalDebt: (debtAgg[0]?.debt || 0) + manualDebtTotal,
      invoiceDebt: debtAgg[0]?.debt || 0,
      manualDebtTotal,
      monthly,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ BITTA TO'YXONA HISOB-KITOBI (batafsil) ============
// GET /api/admin/venues/:id/billing
export const getVenueBilling = async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ message: "To'yxona topilmadi" });

    // Oy bo'yicha guruhlash
    const byMonth = await Invitation.aggregate([
      { $match: { venue: venue._id, status: "sent" } },
      {
        $group: {
          _id: { y: { $year: "$sentAt" }, m: { $month: "$sentAt" } },
          count: { $sum: 1 },
          total: { $sum: "$priceSnapshot" },
          paid: { $sum: { $cond: ["$isPaid", "$priceSnapshot", 0] } },
          unpaid: { $sum: { $cond: ["$isPaid", 0, "$priceSnapshot"] } },
        },
      },
      { $sort: { "_id.y": -1, "_id.m": -1 } },
    ]);

    const invitations = await Invitation.find({ venue: venue._id, status: "sent" })
      .sort("-sentAt")
      .select("groomName brideName weddingDate sentAt priceSnapshot isPaid rsvpGuests");

    res.json({ venue, byMonth, invitations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ TO'LOVNI BELGILASH ============
// PUT /api/admin/invitations/:id/pay   { isPaid: true/false }
export const markPaid = async (req, res) => {
  try {
    const inv = await Invitation.findById(req.params.id);
    if (!inv) return res.status(404).json({ message: "Taklifnoma topilmadi" });
    inv.isPaid = req.body.isPaid;
    await inv.save();
    res.json(inv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ BUTUN OY BO'YICHA TO'LANGAN DEB BELGILASH ============
// PUT /api/admin/venues/:id/pay-month   { year, month }
export const payMonth = async (req, res) => {
  try {
    const { year, month } = req.body;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const r = await Invitation.updateMany(
      { venue: req.params.id, status: "sent", sentAt: { $gte: start, $lt: end } },
      { isPaid: true }
    );
    res.json({ message: "Oy to'langan deb belgilandi", modified: r.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ QO'LDA QARZ TUZATMASI (+ / −) ============
// PUT /api/admin/venues/:id/adjust-debt   { delta }  yoki  { set }
// delta — qarzga qo'shiladi (manfiy bo'lsa kamayadi); set — to'g'ridan-to'g'ri qiymat o'rnatadi.
export const adjustManualDebt = async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ message: "To'yxona topilmadi" });

    if (req.body.set !== undefined) {
      venue.manualDebt = Number(req.body.set) || 0;
    } else {
      venue.manualDebt = (venue.manualDebt || 0) + (Number(req.body.delta) || 0);
    }
    await venue.save();
    res.json({ message: "Qarz tuzatildi", manualDebt: venue.manualDebt });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ TO'LANGAN TAKLIFNOMALARNI O'CHIRISH (tozalash) ============
// DELETE /api/admin/venues/:id/paid-invitations
// To'yxona pulni to'lagach, to'langan taklifnomalarni bazadan o'chiramiz;
// to'lanmaganlari (qarzdorlar) qoladi. Ixtiyoriy { year, month } bilan faqat shu oy.
export const deletePaidInvitations = async (req, res) => {
  try {
    const filter = { venue: req.params.id, status: "sent", isPaid: true };
    const { year, month } = req.body || {};
    if (year && month) {
      filter.sentAt = { $gte: new Date(year, month - 1, 1), $lt: new Date(year, month, 1) };
    }
    const r = await Invitation.deleteMany(filter);
    res.json({ message: "To'langan taklifnomalar o'chirildi", deleted: r.deletedCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ KELAYOTGAN TAKLIFNOMALAR OQIMI (real-time inbox) ============
// GET /api/admin/invitations?accept=pending|accepted|rejected|all
export const getIncomingInvitations = async (req, res) => {
  try {
    const { accept = "all" } = req.query;
    const filter = { status: "sent" }; // faqat yuborilganlar
    if (accept !== "all") filter.acceptStatus = accept;

    const list = await Invitation.find(filter)
      .populate("venue", "name phone pricePerInvitation")
      .sort("-sentAt")
      .limit(200);

    // Tezkor sanoqlar (badge / kartochkalar uchun)
    const counts = {
      pending: await Invitation.countDocuments({ status: "sent", acceptStatus: "pending" }),
      accepted: await Invitation.countDocuments({ status: "sent", acceptStatus: "accepted" }),
      rejected: await Invitation.countDocuments({ status: "sent", acceptStatus: "rejected" }),
    };

    res.json({ list, counts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ TAKLIFNOMANI QABUL QILISH ============
// PUT /api/admin/invitations/:id/accept
export const acceptInvitation = async (req, res) => {
  try {
    const inv = await Invitation.findById(req.params.id);
    if (!inv) return res.status(404).json({ message: "Taklifnoma topilmadi" });
    if (inv.status !== "sent") {
      return res.status(400).json({ message: "Faqat yuborilgan taklifnomani qabul qilish mumkin" });
    }
    inv.acceptStatus = "accepted";
    inv.acceptedAt = new Date();
    inv.rejectReason = "";
    await inv.save();

    // 🟢 REAL-TIME: to'yxona adminiga "qabul qilindi" deb xabar beramiz
    emitToVenue(inv.venue, "invitation:accepted", { id: inv._id, acceptedAt: inv.acceptedAt });
    // Boshqa super adminlar paneli ham yangilansin
    emitToSuperAdmins("invitation:updated", { id: inv._id, acceptStatus: "accepted", acceptedAt: inv.acceptedAt });

    // 📨 TELEGRAM: tasdiqlangan taklifnoma URL + rasm bilan to'yxona chatiga boradi
    const venue = await Venue.findById(inv.venue);
    let telegramSent = false;
    if (venue) telegramSent = await sendInvitationToTelegram(venue, inv);

    res.json({ message: "Taklifnoma qabul qilindi", invitation: inv, telegramSent });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ TAKLIFNOMANI RAD ETISH ============
// PUT /api/admin/invitations/:id/reject   { reason }
export const rejectInvitation = async (req, res) => {
  try {
    const inv = await Invitation.findById(req.params.id);
    if (!inv) return res.status(404).json({ message: "Taklifnoma topilmadi" });
    if (inv.status !== "sent") {
      return res.status(400).json({ message: "Faqat yuborilgan taklifnomani rad etish mumkin" });
    }
    inv.acceptStatus = "rejected";
    inv.acceptedAt = null;
    inv.rejectReason = req.body.reason || "";
    await inv.save();

    emitToVenue(inv.venue, "invitation:rejected", { id: inv._id, reason: inv.rejectReason });
    emitToSuperAdmins("invitation:updated", { id: inv._id, acceptStatus: "rejected" });

    res.json({ message: "Taklifnoma rad etildi", invitation: inv });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ BITTA TAKLIFNOMA (superadmin to'liq tahrir uchun) ============
// GET /api/admin/invitations/:id
export const getInvitationById = async (req, res) => {
  try {
    const inv = await Invitation.findById(req.params.id)
      .populate("venue", "name phone")
      .populate("design", "key name preview")
      .populate("music", "name url");
    if (!inv) return res.status(404).json({ message: "Taklifnoma topilmadi" });
    res.json(inv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ TAKLIFNOMANI TO'LIQ TAHRIRLASH (faqat superadmin) ============
// PUT /api/admin/invitations/:id
// Superadmin istalgan maydonni tahrirlay oladi (to'yxonaning bir martalik cheklovi tegmaydi).
export const adminUpdateInvitation = async (req, res) => {
  try {
    const inv = await Invitation.findById(req.params.id);
    if (!inv) return res.status(404).json({ message: "Taklifnoma topilmadi" });

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

    // To'yxona panelini ham jonli yangilaymiz
    emitToVenue(inv.venue, "invitation:updated", { id: inv._id });
    res.json({ message: "Taklifnoma yangilandi", invitation: inv });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
  {
    venue: { type: mongoose.Schema.Types.ObjectId, ref: "Venue", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // To'y ma'lumotlari
    groomName: { type: String, required: true }, // Kuyov ismi
    brideName: { type: String, required: true }, // Kelin ismi
    weddingDate: { type: Date, required: true }, // To'y sanasi
    weddingTime: { type: String, default: "18:00" }, // Vaqti
    venueName: { type: String, default: "" }, // To'yxona nomi (matn)
    address: { type: String, default: "" }, // Manzil
    mapLink: { type: String, default: "" }, // Google Map havolasi
    images: [{ type: String }], // Rasmlar (Firebase URL)
    description: { type: String, default: "" }, // Batafsil ma'lumot / matn (to'yxona yozadi)
    template: { type: String, default: "classic" }, // Taklifnoma dizayni

    // HISOB-KITOB UCHUN MUHIM:
    // draft = qoralama (hisobga olinmaydi)
    // sent = yuborildi (HISOBGA OLINADI)
    status: {
      type: String,
      enum: ["draft", "sent"],
      default: "draft",
    },
    sentAt: { type: Date, default: null }, // Qachon yuborilgan (hisob oyi shu bo'yicha)
    priceSnapshot: { type: Number, default: 0 }, // Yuborilgan paytdagi narx (keyin narx o'zgarsa ham buzilmaydi)

    // QABUL QILISH JARAYONI (Super Admin / biz):
    // pending  = yuborildi, biz qabul qilishimizni kutyapti
    // accepted = biz qabul qildik
    // rejected = biz rad etdik (qaytarib yuborildi)
    acceptStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    acceptedAt: { type: Date, default: null }, // Qachon qabul qilindi
    rejectReason: { type: String, default: "" }, // Rad etilsa — sababi

    // To'lov holati (Super Admin belgilaydi)
    isPaid: { type: Boolean, default: false },

    // RSVP / mehmonlar
    rsvpGuests: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Tezroq qidirish uchun indekslar
invitationSchema.index({ venue: 1, status: 1, sentAt: 1 });
invitationSchema.index({ status: 1, acceptStatus: 1, sentAt: -1 }); // Super admin oqimi uchun

const Invitation = mongoose.model("Invitation", invitationSchema);
export default Invitation;

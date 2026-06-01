import mongoose from "mongoose";

const venueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // To'yxona nomi
    pricePerInvitation: { type: Number, required: true, default: 200000 }, // Har bir taklifnoma narxi (so'm)
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // Biriktirilgan admin
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" }, // Lokatsiya nomi / manzil matni
    mapLink: { type: String, default: "" }, // Google karta havolasi
    note: { type: String, default: "" },

    // Telegram bot integratsiyasi:
    // telegramChatId — taklifnoma yuboriladigan chat (bot login orqali yoki admin panelda qo'lda ulanadi)
    telegramChatId: { type: String, default: "" },
    telegramUsername: { type: String, default: "" }, // kim ulagani (ixtiyoriy ko'rsatish uchun)

    // Qo'lda qarz tuzatmasi (bosh admin "+ / −" tugmalari bilan o'zgartiradi).
    // Umumiy qarz = (to'lanmagan taklifnomalar summasi) + manualDebt.
    // Masalan to'yxona qisman to'lasa yoki kelishuv bo'lsa — shu yerda tuzatiladi.
    manualDebt: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Venue = mongoose.model("Venue", venueSchema);
export default Venue;

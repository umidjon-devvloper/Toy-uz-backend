import mongoose from "mongoose";

// Fon musiqasi — superadmin admin panelda MP3 yuklaydi (Firebase URL),
// to'yxona admin tanlaydi, public taklifnoma sahifasida ijro etiladi.
const musicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // qo'shiq nomi
    url: { type: String, required: true }, // MP3 (Firebase) URL
    cover: { type: String, default: "" }, // ixtiyoriy muqova rasmi
    order: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

musicSchema.index({ status: 1, order: 1 });

const Music = mongoose.model("Music", musicSchema);
export default Music;

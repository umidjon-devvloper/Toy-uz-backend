import mongoose from "mongoose";

// Taklifnoma dizayni — superadmin admin panelda HTML/CSS kod sifatida kiritadi.
// To'yxona admin shu dizaynlardan birini tanlaydi, public sahifa shu kodni render qiladi.
//
// HTML ichida placeholder'lar (frontend almashtiradi):
//   matn:  {{groomName}} {{brideName}} {{weddingDate}} {{weddingTime}}
//          {{venueName}} {{address}} {{description}}
//   havola: {{mapLink}}
// Maxsus widget nuqtalari (bo'sh konteyner — React jonli to'ldiradi):
//   <div data-toy="cover"></div>      → birinchi rasm hero fon
//   <div data-toy="countdown"></div>  → jonli teskari sanoq
//   <div data-toy="gallery"></div>    → rasm galereyasi (inv.images)
//   <div data-toy="map"></div>        → "Xaritada ochish" tugmasi
const designSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true }, // noyob slug
    name: { type: String, required: true, trim: true }, // ko'rinadigan nom
    preview: { type: String, default: "" }, // preview rasm (tanlash + default og:image)
    html: { type: String, default: "" }, // placeholder'li HTML (body)
    css: { type: String, default: "" }, // shu dizaynga tegishli CSS
    defaultMusic: { type: mongoose.Schema.Types.ObjectId, ref: "Music", default: null },
    order: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

designSchema.index({ status: 1, order: 1 });

const Design = mongoose.model("Design", designSchema);
export default Design;

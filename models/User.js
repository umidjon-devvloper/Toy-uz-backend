import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // To'yxona nomi yoki shaxs ismi
    login: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["super_admin", "venue_admin"],
      default: "venue_admin",
    },
    // To'yxona admini bilan bog'liq maydonlar:
    venue: { type: mongoose.Schema.Types.ObjectId, ref: "Venue", default: null },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

// Parolni saqlashdan oldin hash qilish
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Parolni tekshirish metodi
userSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;

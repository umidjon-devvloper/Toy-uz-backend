import dotenv from "dotenv";
import connectDB from "./config/db.js";
import User from "./models/User.js";

dotenv.config();

const run = async () => {
  await connectDB();
  const exists = await User.findOne({ role: "super_admin" });
  if (exists) {
    console.log("⚠️  Super Admin allaqachon mavjud:", exists.login);
    process.exit(0);
  }
  const admin = await User.create({
    name: "Bosh Admin",
    login: "superadmin",
    password: "admin123", // ⚠️ Kirgandan keyin o'zgartiring!
    role: "super_admin",
  });
  console.log("✅ Super Admin yaratildi:");
  console.log("   Login: superadmin");
  console.log("   Parol: admin123");
  process.exit(0);
};

run();

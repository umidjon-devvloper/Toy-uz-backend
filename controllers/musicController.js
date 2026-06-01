import Music from "../models/Music.js";

// ============ PUBLIC / VENUE: aktiv qo'shiqlar ============
// GET /api/music
export const listMusic = async (req, res) => {
  try {
    const items = await Music.find({ status: "active" })
      .sort({ order: 1, createdAt: 1 })
      .select("name url cover");
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ SUPER ADMIN: barcha qo'shiqlar ============
// GET /api/admin/music
export const adminListMusic = async (req, res) => {
  try {
    const items = await Music.find().sort({ order: 1, createdAt: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ SUPER ADMIN: yangi qo'shiq ============
// POST /api/admin/music
export const createMusic = async (req, res) => {
  try {
    const { name, url, cover, order, status } = req.body;
    if (!name || !url) return res.status(400).json({ message: "Nom va audio (url) majburiy" });
    const item = await Music.create({
      name,
      url,
      cover: cover || "",
      order: order ?? 0,
      status: status || "active",
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ SUPER ADMIN: qo'shiqni tahrirlash ============
// PUT /api/admin/music/:id
export const updateMusic = async (req, res) => {
  try {
    const item = await Music.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Qo'shiq topilmadi" });
    const { name, url, cover, order, status } = req.body;
    if (name !== undefined) item.name = name;
    if (url !== undefined) item.url = url;
    if (cover !== undefined) item.cover = cover;
    if (order !== undefined) item.order = order;
    if (status !== undefined) item.status = status;
    await item.save();
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ SUPER ADMIN: qo'shiqni o'chirish ============
// DELETE /api/admin/music/:id
export const deleteMusic = async (req, res) => {
  try {
    const item = await Music.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Qo'shiq topilmadi" });
    await item.deleteOne();
    res.json({ message: "Qo'shiq o'chirildi" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

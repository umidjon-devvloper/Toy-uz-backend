import Design from "../models/Design.js";

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// ============ PUBLIC / VENUE: aktiv dizaynlar ro'yxati ============
// GET /api/designs
export const listDesigns = async (req, res) => {
  try {
    const designs = await Design.find({ status: "active" })
      .sort({ order: 1, createdAt: 1 })
      .select("key name preview html css defaultMusic")
      .populate("defaultMusic", "name url cover");
    res.json(designs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ SUPER ADMIN: barcha dizaynlar ============
// GET /api/admin/designs
export const adminListDesigns = async (req, res) => {
  try {
    const designs = await Design.find().sort({ order: 1, createdAt: 1 }).populate("defaultMusic", "name");
    res.json(designs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ SUPER ADMIN: yangi dizayn ============
// POST /api/admin/designs
export const createDesign = async (req, res) => {
  try {
    const { name, key, preview, html, css, defaultMusic, order, status } = req.body;
    if (!name) return res.status(400).json({ message: "Dizayn nomi majburiy" });

    const finalKey = slugify(key || name);
    if (!finalKey) return res.status(400).json({ message: "Kalit (key) noto'g'ri" });
    const exists = await Design.findOne({ key: finalKey });
    if (exists) return res.status(400).json({ message: "Bu kalit (key) band" });

    const design = await Design.create({
      name,
      key: finalKey,
      preview: preview || "",
      html: html || "",
      css: css || "",
      defaultMusic: defaultMusic || null,
      order: order ?? 0,
      status: status || "active",
    });
    res.status(201).json(design);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ SUPER ADMIN: dizaynni tahrirlash ============
// PUT /api/admin/designs/:id
export const updateDesign = async (req, res) => {
  try {
    const design = await Design.findById(req.params.id);
    if (!design) return res.status(404).json({ message: "Dizayn topilmadi" });

    const { name, key, preview, html, css, defaultMusic, order, status } = req.body;
    if (name !== undefined) design.name = name;
    if (key !== undefined) {
      const finalKey = slugify(key);
      if (finalKey && finalKey !== design.key) {
        const clash = await Design.findOne({ key: finalKey, _id: { $ne: design._id } });
        if (clash) return res.status(400).json({ message: "Bu kalit (key) band" });
        design.key = finalKey;
      }
    }
    if (preview !== undefined) design.preview = preview;
    if (html !== undefined) design.html = html;
    if (css !== undefined) design.css = css;
    if (defaultMusic !== undefined) design.defaultMusic = defaultMusic || null;
    if (order !== undefined) design.order = order;
    if (status !== undefined) design.status = status;
    await design.save();
    res.json(design);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ SUPER ADMIN: dizaynni o'chirish ============
// DELETE /api/admin/designs/:id
export const deleteDesign = async (req, res) => {
  try {
    const design = await Design.findById(req.params.id);
    if (!design) return res.status(404).json({ message: "Dizayn topilmadi" });
    await design.deleteOne();
    res.json({ message: "Dizayn o'chirildi" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

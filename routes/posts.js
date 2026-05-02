const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const db = require("../db");
const { authMiddleware } = require("../middleware");
const upload = require("../upload");

// GET /api/posts
router.get("/", async (req, res) => {
  const { search, category } = req.query;
  let query = `
    SELECT p.id, u.username AS author, c.name AS category, p.title, p.body, p.tag,
      p.media_url, p.media_type, p.created_at,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count
    FROM posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (category && category !== "All") { query += " AND c.name = ?"; params.push(category); }
  if (search) {
    query += " AND (p.title LIKE ? OR p.body LIKE ? OR p.tag LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  query += " ORDER BY p.created_at DESC";
  try {
    const [posts] = await db.query(query, params);
    for (const post of posts) {
      const [reactions] = await db.query(
        "SELECT type, COUNT(*) as count FROM reactions WHERE post_id = ? GROUP BY type",
        [post.id]
      );
      post.reactions = { like: 0, love: 0, haha: 0, fire: 0 };
      reactions.forEach(r => { post.reactions[r.type] = r.count; });
    }
    res.json(posts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/posts/:id
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id, u.username AS author, c.name AS category, p.title, p.body, p.tag,
        p.media_url, p.media_type, p.created_at
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Post not found" });
    const post = rows[0];
    const [reactions] = await db.query(
      "SELECT type, COUNT(*) as count FROM reactions WHERE post_id = ? GROUP BY type",
      [post.id]
    );
    post.reactions = { like: 0, love: 0, haha: 0, fire: 0 };
    reactions.forEach(r => { post.reactions[r.type] = r.count; });
    const [comments] = await db.query(`
      SELECT c.id, u.username AS author, c.body, c.created_at
      FROM comments c JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ? ORDER BY c.created_at ASC
    `, [post.id]);
    post.comments = comments;
    res.json(post);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/posts (with optional file upload)
router.post("/", authMiddleware, upload.single("media"), async (req, res) => {
  const { title, body, tag, category } = req.body;
  // Title is optional if media is attached
  if (!title && !req.file) return res.status(400).json({ error: "Add a title or attach a photo/video" });
  try {
    const [catRows] = await db.query("SELECT id FROM categories WHERE name = ?", [category || "General"]);
    const categoryId = catRows.length > 0 ? catRows[0].id : null;
    let mediaUrl = null;
    let mediaType = null;
    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
      mediaType = req.file.mimetype.startsWith("image") ? "image" : "video";
    }
    const [result] = await db.query(
      "INSERT INTO posts (user_id, category_id, title, body, tag, media_url, media_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [req.user.id, categoryId, title, body || "", tag || "", mediaUrl, mediaType]
    );
    res.json({ id: result.insertId, message: "Post created" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/posts/:id
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT user_id, media_url FROM posts WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Post not found" });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: "Not your post" });
    // Delete file from disk if exists
    if (rows[0].media_url) {
      const filePath = path.join(__dirname, rows[0].media_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.query("DELETE FROM posts WHERE id = ?", [req.params.id]);
    res.json({ message: "Post deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const db = require("../db");
const { authMiddleware } = require("../middleware");

// Middleware to check admin role
async function adminOnly(req, res, next) {
  try {
    const [rows] = await db.query("SELECT role FROM users WHERE id = ?", [req.user.id]);
    if (rows.length === 0 || rows[0].role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/admin/users - get all users
router.get("/users", authMiddleware, adminOnly, async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT u.id, u.username, u.bio, u.role, u.banned, u.joined_at,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS post_count,
        (SELECT COUNT(*) FROM comments WHERE user_id = u.id) AS comment_count
      FROM users u
      ORDER BY u.joined_at DESC
    `);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/posts/:id - admin delete any post
router.delete("/posts/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id FROM posts WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Post not found" });
    await db.query("DELETE FROM posts WHERE id = ?", [req.params.id]);
    res.json({ message: "Post deleted by admin" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/comments/:id - admin delete any comment
router.delete("/comments/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id FROM comments WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Comment not found" });
    await db.query("DELETE FROM comments WHERE id = ?", [req.params.id]);
    res.json({ message: "Comment deleted by admin" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/ban/:id - ban a user
router.post("/ban/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT role FROM users WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    if (rows[0].role === "admin") return res.status(403).json({ error: "Cannot ban another admin" });
    await db.query("UPDATE users SET banned = 1 WHERE id = ?", [req.params.id]);
    res.json({ message: "User banned" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/unban/:id - unban a user
router.post("/unban/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.query("UPDATE users SET banned = 0 WHERE id = ?", [req.params.id]);
    res.json({ message: "User unbanned" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id - delete user and all their content
router.delete("/users/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT role FROM users WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    if (rows[0].role === "admin") return res.status(403).json({ error: "Cannot delete another admin" });
    await db.query("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ message: "User and all their content deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, adminOnly };

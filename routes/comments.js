const express = require("express");
const router = express.Router();
const db = require("../db");
const { authMiddleware } = require("../middleware");

// POST /api/comments - add comment (auth required)
router.post("/", authMiddleware, async (req, res) => {
  const { post_id, body } = req.body;
  if (!post_id || !body) return res.status(400).json({ error: "post_id and body required" });
  try {
    const [result] = await db.query(
      "INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)",
      [post_id, req.user.id, body]
    );
    res.json({ id: result.insertId, message: "Comment added" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/comments/:id - delete comment (auth required, own comments only)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT user_id FROM comments WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Comment not found" });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: "Not your comment" });
    await db.query("DELETE FROM comments WHERE id = ?", [req.params.id]);
    res.json({ message: "Comment deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

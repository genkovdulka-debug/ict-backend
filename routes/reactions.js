const express = require("express");
const router = express.Router();
const db = require("../db");
const { authMiddleware } = require("../middleware");

// POST /api/reactions/toggle - toggle a reaction (auth required)
router.post("/toggle", authMiddleware, async (req, res) => {
  const { post_id, type } = req.body;
  const validTypes = ["like", "love", "haha", "fire"];
  if (!post_id || !type || !validTypes.includes(type)) {
    return res.status(400).json({ error: "post_id and valid type required" });
  }
  try {
    const [existing] = await db.query(
      "SELECT id FROM reactions WHERE post_id = ? AND user_id = ? AND type = ?",
      [post_id, req.user.id, type]
    );
    if (existing.length > 0) {
      await db.query("DELETE FROM reactions WHERE post_id = ? AND user_id = ? AND type = ?",
        [post_id, req.user.id, type]);
      res.json({ action: "removed" });
    } else {
      await db.query("INSERT INTO reactions (post_id, user_id, type) VALUES (?, ?, ?)",
        [post_id, req.user.id, type]);
      res.json({ action: "added" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reactions/:post_id/mine - get current user's reactions on a post
router.get("/:post_id/mine", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT type FROM reactions WHERE post_id = ? AND user_id = ?",
      [req.params.post_id, req.user.id]
    );
    res.json(rows.map(r => r.type));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

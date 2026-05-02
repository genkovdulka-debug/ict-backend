const express = require("express");
const router = express.Router();
const db = require("../db");
const { authMiddleware } = require("../middleware");

// GET /api/users/:username - get user profile
router.get("/:username", async (req, res) => {
  try {
    const [rows] = await db.query(
     "SELECT id, username, bio, joined_at, role, banned FROM users WHERE username = ?",
      [req.params.username]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    const user = rows[0];

    const [postCount] = await db.query(
      "SELECT COUNT(*) AS count FROM posts WHERE user_id = ?", [user.id]
    );
    const [commentCount] = await db.query(
      "SELECT COUNT(*) AS count FROM comments WHERE user_id = ?", [user.id]
    );
    const [reactionsReceived] = await db.query(`
      SELECT COUNT(*) AS count FROM reactions r
      JOIN posts p ON r.post_id = p.id
      WHERE p.user_id = ?
    `, [user.id]);
    const [userPosts] = await db.query(`
      SELECT p.id, p.title, p.body, p.tag, c.name AS category, p.created_at,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `, [user.id]);

    res.json({
      ...user,
      post_count: postCount[0].count,
      comment_count: commentCount[0].count,
      reactions_received: reactionsReceived[0].count,
      posts: userPosts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/me/bio - update own bio (auth required)
router.put("/me/bio", authMiddleware, async (req, res) => {
  const { bio } = req.body;
  try {
    await db.query("UPDATE users SET bio = ? WHERE id = ?", [bio, req.user.id]);
    res.json({ message: "Bio updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

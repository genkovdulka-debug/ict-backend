const express = require("express");
const router = express.Router();
const db = require("../db");
const { authMiddleware } = require("../middleware");

// Send message
router.post("/:id", authMiddleware, async (req, res) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: "Message cannot be empty" });
  try {
    await db.query(
      "INSERT INTO messages (sender_id, receiver_id, body) VALUES (?, ?, ?)",
      [req.user.id, req.params.id, body]
    );
    res.json({ message: "Message sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get conversation with a user
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT m.*, u.username AS sender_name FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (m.sender_id=? AND m.receiver_id=?) OR (m.sender_id=? AND m.receiver_id=?)
      ORDER BY m.created_at ASC
    `, [req.user.id, req.params.id, req.params.id, req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all conversations
router.get("/", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.username,
        (SELECT body FROM messages WHERE (sender_id=? AND receiver_id=u.id) OR (sender_id=u.id AND receiver_id=?) ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM messages WHERE (sender_id=? AND receiver_id=u.id) OR (sender_id=u.id AND receiver_id=?) ORDER BY created_at DESC LIMIT 1) AS last_time,
        (SELECT COUNT(*) FROM messages WHERE sender_id=u.id AND receiver_id=? AND is_read=0) AS unread
      FROM users u
      WHERE u.id IN (
        SELECT CASE WHEN sender_id=? THEN receiver_id ELSE sender_id END FROM messages WHERE sender_id=? OR receiver_id=?
      ) AND u.id != ?
      ORDER BY last_time DESC
    `, [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark messages as read
router.put("/read/:id", authMiddleware, async (req, res) => {
  try {
    await db.query(
      "UPDATE messages SET is_read=1 WHERE sender_id=? AND receiver_id=?",
      [req.params.id, req.user.id]
    );
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
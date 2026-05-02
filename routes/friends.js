const express = require("express");
const router = express.Router();
const db = require("../db");
const { authMiddleware } = require("../middleware");

// Send friend request
router.post("/request/:id", authMiddleware, async (req, res) => {
  const receiverId = req.params.id;
  const requesterId = req.user.id;
  if (requesterId === parseInt(receiverId)) return res.status(400).json({ error: "Cannot add yourself" });
  try {
    await db.query(
      "INSERT IGNORE INTO friends (requester_id, receiver_id, status) VALUES (?, ?, 'pending')",
      [requesterId, receiverId]
    );
    res.json({ message: "Friend request sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept friend request
router.put("/accept/:id", authMiddleware, async (req, res) => {
  try {
    await db.query(
      "UPDATE friends SET status='accepted' WHERE requester_id=? AND receiver_id=?",
      [req.params.id, req.user.id]
    );
    res.json({ message: "Friend request accepted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Decline friend request
router.put("/decline/:id", authMiddleware, async (req, res) => {
  try {
    await db.query(
      "UPDATE friends SET status='declined' WHERE requester_id=? AND receiver_id=?",
      [req.params.id, req.user.id]
    );
    res.json({ message: "Friend request declined" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unfriend
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await db.query(
      "DELETE FROM friends WHERE (requester_id=? AND receiver_id=?) OR (requester_id=? AND receiver_id=?)",
      [req.user.id, req.params.id, req.params.id, req.user.id]
    );
    res.json({ message: "Unfriended" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my friends list
router.get("/list", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.username FROM friends f
      JOIN users u ON (
        CASE WHEN f.requester_id = ? THEN f.receiver_id ELSE f.requester_id END = u.id
      )
      WHERE (f.requester_id = ? OR f.receiver_id = ?) AND f.status = 'accepted'
    `, [req.user.id, req.user.id, req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get pending friend requests
router.get("/requests", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT f.id, f.requester_id, u.username FROM friends f
      JOIN users u ON f.requester_id = u.id
      WHERE f.receiver_id = ? AND f.status = 'pending'
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get friendship status with a user
router.get("/status/:id", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM friends WHERE (requester_id=? AND receiver_id=?) OR (requester_id=? AND receiver_id=?)",
      [req.user.id, req.params.id, req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.json({ status: "none" });
    res.json({ status: rows[0].status, requester_id: rows[0].requester_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
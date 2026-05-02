const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { SECRET } = require("../middleware");

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  const { username, password, bio } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });
  if (password.length < 4) return res.status(400).json({ error: "Password too short (min 4)" });
  try {
    const [existing] = await db.query("SELECT id FROM users WHERE username = ?", [username]);
    if (existing.length > 0) return res.status(409).json({ error: "Username already taken" });
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (username, password, bio, role) VALUES (?, ?, ?, 'user')",
      [username, hashed, bio || "New ICT Community member."]
    );
    const token = jwt.sign({ id: result.insertId, username, role: "user" }, SECRET, { expiresIn: "7d" });
    res.json({ token, username, id: result.insertId, role: "user" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
    if (rows.length === 0) return res.status(401).json({ error: "Wrong username or password" });
    const user = rows[0];
    if (user.banned) return res.status(403).json({ error: "Your account has been banned by an administrator." });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Wrong username or password" });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: "7d" });
    res.json({ token, username: user.username, id: user.id, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

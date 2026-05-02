const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// Serve uploaded files publicly
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth",      require("./routes/auth"));
app.use("/api/posts",     require("./routes/posts"));
app.use("/api/comments",  require("./routes/comments"));
app.use("/api/reactions", require("./routes/reactions"));
app.use("/api/users",     require("./routes/users"));
app.use("/api/admin",     require("./routes/admin").router);

app.get("/", (req, res) => res.json({ message: "ICT Community API is running!" }));
app.use("/api/friends", require("./routes/friends"));
app.use("/api/messages", require("./routes/messages"));
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`ICT Community backend running at http://localhost:${PORT}`);
});


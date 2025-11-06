// routes/user.js
const express = require("express");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Simple JWT middleware for /user routes
router.use((req, res, next) => {
  try {
    const auth = req.headers["authorization"] || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Not authenticated" });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { _id: payload.id, name: payload.name, picture: payload.picture };
    next();
  } catch (e) {
    return res.status(401).json({ message: "Not authenticated" });
  }
});

// GET /user/history
router.get("/history", async (req, res) => {
  try {
    // Fetch user and their history
    const user = await User.findById(req.user._id).select("gameHistory name picture");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      name: user.name,
      picture: user.picture,
      history: user.gameHistory,
    });
  } catch (err) {
    console.error("Error fetching user history:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  name: String,
  email: String, 
  picture: String,
  gameHistory: [
    {
      opponentName: String,
      opponentId: String,
      myScore: Number,
      opponentScore: Number,
      result: { type: String, enum: ["win", "loss", "draw"] },
      date: { type: Date, default: Date.now },
      roomId: String,
    },
  ],
});

module.exports = mongoose.model("User", UserSchema);
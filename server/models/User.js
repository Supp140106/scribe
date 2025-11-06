const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, index: true },
    picture: { type: String },
    // Will store game summaries; keeping flexible for now
    gameHistory: { type: [Object], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
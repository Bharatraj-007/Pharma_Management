const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
  type: { type: String, enum: ["individual", "group"], default: "individual", required: true },
  name: { type: String, trim: true }, // For group chats
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
  groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Group creator
  company: { type: String, required: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model("Conversation", conversationSchema);

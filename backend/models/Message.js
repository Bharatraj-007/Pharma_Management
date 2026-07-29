const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    company: { type: String, index: true, required: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["text", "image", "video", "file", "voice"], default: "text", required: true },
    text: { type: String, trim: true }, // Optional for media messages
    mediaUrl: { type: String }, // Link to static file uploads
    fileName: { type: String }, // For documents
    duration: { type: Number }, // For video/voice in seconds
    timestamp: { type: Date, default: () => new Date(), index: true },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Deletion tracking
    deletedForEveryone: { type: Boolean, default: false },
    deletedByName: { type: String }, // Name of user who deleted for everyone
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }] // Per-user "delete for me"
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);

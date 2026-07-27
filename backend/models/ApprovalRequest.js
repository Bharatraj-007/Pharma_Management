const mongoose = require("mongoose");

const approvalRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  workerName: { type: String, required: true },
  company: { type: String, required: true },
  type: { type: String, enum: ["email", "phone"], required: true },
  oldValue: { type: String, default: "" },
  newValue: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
}, { timestamps: true });

module.exports = mongoose.model("ApprovalRequest", approvalRequestSchema);

const mongoose = require("mongoose");

const leaveRequestSchema = new mongoose.Schema({
  worker: { type: String, required: true },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["Sick", "Casual", "Paid", "Unpaid"], required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  reason: { type: String },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  remarks: { type: String, default: "Submitted" },
  company: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);

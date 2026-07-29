const mongoose = require("mongoose");

const AdvanceRequestSchema = new mongoose.Schema({
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  amountRequested: { type: Number, required: true },
  qrCodeImageUrl: { type: String },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
  paymentMethod: { type: String, enum: ["cash", "online"] },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approvedDate: { type: Date },
  deductedFromMonth: { type: String, required: true, index: true } // format: YYYY-MM
}, { timestamps: true });

module.exports = mongoose.model("AdvanceRequest", AdvanceRequestSchema);

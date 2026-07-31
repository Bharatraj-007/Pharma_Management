const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  company: { type: String, required: true, index: true },
  type: { type: String, enum: ["income", "expense"], required: true, index: true },
  category: { type: String, required: true }, // e.g., 'Dispatch Sale', 'Raw Material', 'Salary', 'Transport', 'Maintenance'
  relatedDispatchId: { type: mongoose.Schema.Types.ObjectId, ref: "Dispatch" },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, default: "" },
  date: { type: Date, default: Date.now, index: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  addedByName: { type: String, default: "System" },
  paymentMethod: { type: String, enum: ["cash", "online", "bank_transfer"], default: "online" },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  deletedAt: { type: Date }
}, { timestamps: true });

transactionSchema.index({ company: 1, date: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);

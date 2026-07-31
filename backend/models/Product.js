const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  company: { type: String, required: true, index: true },
  productName: { type: String, required: true, trim: true },
  size: { type: String, default: "" },
  weightKg: { type: Number, default: 0 },
  numberOfColors: { type: Number, default: 1 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  deletedAt: { type: Date }
}, { timestamps: true });

productSchema.index({ company: 1, isDeleted: 1 });

module.exports = mongoose.model("Product", productSchema);

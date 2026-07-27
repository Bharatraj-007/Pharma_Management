const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema({
  date: { type: String, required: true }, // format: YYYY-MM-DD
  reason: { type: String, required: true },
  company: { type: String, required: true }
}, { timestamps: true });

// Ensure unique holiday per date per company
holidaySchema.index({ date: 1, company: 1 }, { unique: true });

module.exports = mongoose.model("Holiday", holidaySchema);

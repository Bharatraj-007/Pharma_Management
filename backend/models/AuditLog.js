const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ["create", "edit", "delete", "start", "complete", "consume", "swap"],
    required: true
  },
  itemType: {
    type: String,
    enum: ["foil", "cylinder", "task"],
    required: true
  },
  company: String,
  itemId: String,
  barcode: String,
  qrPayload: String,
  changedBy: String,
  changedByRole: String,
  before: Object,
  after: Object,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("AuditLog", auditLogSchema);

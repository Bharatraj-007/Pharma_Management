const mongoose = require('mongoose');

const qrScanLogSchema = new mongoose.Schema({
  company: String,
  taskId: { type: mongoose.Schema.Types.ObjectId, index: true },
  foilQrPayload: String,
  scannedBy: String,
  scannedByRole: String,
  // valid | invalid | mismatch | not-found | consumed | error
  validationResult: { type: String, index: true },
  details: String
}, { timestamps: true });

module.exports = mongoose.model('QrScanLog', qrScanLogSchema);


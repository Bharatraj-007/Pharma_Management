const mongoose = require('mongoose');

const barcodeScanLogSchema = new mongoose.Schema({
  company: String,
  taskId: { type: mongoose.Schema.Types.ObjectId, index: true },
  foilBarcode: String,
  scannedBy: String,
  scannedByRole: String,
  // valid | invalid | mismatch | not-found | consumed | already-used | error
  validationResult: { type: String, index: true },
  details: String
}, { timestamps: true });

module.exports = mongoose.model('BarcodeScanLog', barcodeScanLogSchema);


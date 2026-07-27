const mongoose = require("mongoose");

const foilSchema = new mongoose.Schema({
  company: String,
  materialKind: {
    type: String,
    default: "foil"
  },
  type: { type: String, required: true },
  size: String,
  weight: Number,
  remainingWeight: Number,
  // QR payload stores all human-readable details so workers can scan and see info.
  // Example: qr:<company>|<type>|<size>|<weightKg>|<version>|<serial>
  qrPayload: { type: String, required: true },
  // Keep version/serial separately for easier DB updates.
  version: { type: Number, default: 1 },
  serial: { type: String, default: '0000' }
});





module.exports = mongoose.model("Foil", foilSchema);

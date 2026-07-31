const mongoose = require("mongoose");

const clientProductSchema = new mongoose.Schema({
  clientCompany: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

clientProductSchema.index({ clientCompany: 1, name: 1 });

module.exports = mongoose.model("ClientProduct", clientProductSchema);

const mongoose = require("mongoose");

const clientCompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
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

clientCompanySchema.index({ name: 1 });

module.exports = mongoose.model("ClientCompany", clientCompanySchema);

const mongoose = require("mongoose");

const taskFileSchema = new mongoose.Schema({
  clientCompany: {
    type: String,
    required: true,
    index: true
  },
  productName: {
    type: String,
    default: "",
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  originalFileUrl: {
    type: String,
    required: true
  },
  previewFileUrl: {
    type: String,
    default: ""
  },
  thumbnailUrl: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    enum: ["processing", "ready", "failed"],
    default: "processing"
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

taskFileSchema.index({ clientCompany: 1, fileName: 1 });

module.exports = mongoose.model("TaskFile", taskFileSchema);

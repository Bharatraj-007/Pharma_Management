const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  // New task creation fields
  product_name: String,
  image_path: String,
  foil_type: String,
  size: String,
  required_kg: Number,
  colourCount: {
    type: Number,
    min: 1,
    max: 8,
    default: 1
  },

  // Client company & assigned reference CDR sample
  clientCompany: String,
  referenceFileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TaskFile"
  },
  
  
  // Original fields
  foil_qrPayload: String,
  foil_start_image_path: String,

  // Assigned foil at task creation / validation
  assigned_foil_qrPayload: String,
  foilUsage: [{
    foilId: { type: mongoose.Schema.Types.ObjectId, ref: "Foil" },
    foilQrPayload: String,
    colourNumber: Number,
    startWeight: Number,
    usedWeight: { type: Number, default: 0 },
    remainingWeight: Number,
    isSwap: { type: Boolean, default: false },
    swappedFromFoilId: { type: mongoose.Schema.Types.ObjectId, ref: "Foil" },
    scannedAt: { type: Date, default: Date.now },
    completedAt: Date,
    workerName: String,
    notes: String
  }],
  foilSwapEvents: [{
    colourNumber: Number,
    oldFoilId: { type: mongoose.Schema.Types.ObjectId, ref: "Foil" },
    newFoilId: { type: mongoose.Schema.Types.ObjectId, ref: "Foil" },
    reason: String,
    workerName: String,
    createdAt: { type: Date, default: Date.now }
  }],


  cylinder_barcode: String,
  // (Not converted to QR in this change; you only asked barcode system removal for foil/workflow.)

  worker_name: String,
  company: {
    type: String,
    default: 'bharath'
  },
  
  used_kg: Number,
  waste_kg: Number,
  remaining_kg: Number,
  waste_image_path: String,
  
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in-progress', 'completed'],
    default: 'pending'
  },
  completedAt: Date
}, { timestamps: true });

taskSchema.index({ company: 1, status: 1 });
taskSchema.index({ worker_name: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ completedAt: 1 });

module.exports = mongoose.model("Task", taskSchema);

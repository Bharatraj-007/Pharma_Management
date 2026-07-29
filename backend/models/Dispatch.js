const mongoose = require("mongoose");

const dispatchSchema = new mongoose.Schema({
  company: {
    type: String,
    required: true,
    index: true
  },
  productType: {
    type: String,
    required: true,
    enum: ['cylinder', 'foil', 'roll'],
    index: true
  },

  // Common fields
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  destinationType: { type: String, enum: ['internal', 'external'], default: 'external' },
  destinationCompany: { type: String, required: true },
  dispatchDate: { type: Date, default: Date.now },
  deliveryMethod: { type: String, required: true }, // 'Rapido' | 'VRL' | 'A1 Transport' | 'Own Vehicle' | 'Other'
  customDeliveryMethod: { type: String, default: "" },
  status: { type: String, enum: ['pending', 'dispatched', 'delivered'], default: 'dispatched' },
  dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dispatchedByName: { type: String, default: "" },
  remarks: { type: String, default: "" },

  // Cylinder-specific (Company 3 / Vel Gravure)
  numberOfColors: Number,
  size: String,
  manufacturer: String,

  // Foil-specific (Company 1 / Bharath Enterprises)
  colors: [{ type: String }],
  weightKg: Number,
  dimensions: String,

  // Roll-specific (Company 2 / Shree Ganaapathy Roto Prints)
  rollColors: [{ type: String }],
  rollWeightKg: Number,
  rollSize: String
}, { timestamps: true });

dispatchSchema.index({ company: 1, dispatchDate: -1 });
dispatchSchema.index({ status: 1 });

module.exports = mongoose.model("Dispatch", dispatchSchema);

const mongoose = require("mongoose");

const cylinderSchema = new mongoose.Schema({
  company: String,
  cylinderKind: {
    type: String,
    default: "standard"
  },
  year: Number,
  pharma_company: String,
  product_name: String,
  colors: Number,
  manufacturer: String,
  size_inches: Number,
  manufacture_date: Date,
  barcode: String
});

module.exports = mongoose.model("Cylinder", cylinderSchema);


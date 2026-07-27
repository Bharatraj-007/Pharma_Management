const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  phone: String,
  dob: Date,
  age: Number,
  joiningDate: Date,
  idProofType: String, // aadhar / pan
  idProofNumber: String,
  password: String, // hashed
  role: String,
  company: String, // bharath, shree_ganaapathy, vel
  otp: String,
  otpVerified: { type: Boolean, default: false },
  status: { type: String, default: "pending" }
});

module.exports = mongoose.model("UserRequest", requestSchema);


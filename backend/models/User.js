const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  employeeNo: { type: String, unique: true, sparse: true },
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String, // ceo, admin, manager, worker
  company: String, // bharath, shree_ganaapathy, vel
  department: { type: String, default: "" },
  shiftTiming: { type: String, default: "" },
  phone: { type: String, default: "" },
  dob: { type: String, default: "" },         // YYYY-MM-DD
  joiningDate: { type: String, default: "" },  // YYYY-MM-DD
  gender: { type: String, default: "" },
  bloodGroup: { type: String, default: "" },
  address: { type: String, default: "" },
  permanentAddress: { type: String, default: "" },
  idProofType: { type: String, default: "" },  // aadhar, passport, driving_license
  idProofNumber: { type: String, default: "" },
  idProofUrl: { type: String, default: "" },   // path to secure upload
  emergencyContact: { type: String, default: "" }, // format: name - number
  emergencyContactName: { type: String, default: "" },
  emergencyContactNumber: { type: String, default: "" },
  profilePhoto: { type: String, default: "" },
  reportingManager: { type: String, default: "" },
  employmentType: { type: String, default: "Full-time" }, // Full-time / Part-time / Contract
  salaryRate: { type: Number, default: 0 },       // amount per hour or day
  salaryType: { type: String, enum: ["hourly", "daily"], default: "daily" },
  currency: { type: String, default: "INR" },
  
  // Settings & Preferences
  twoFactorEnabled: { type: Boolean, default: false },
  pushNotifications: { type: Boolean, default: true },
  attendanceReminders: { type: Boolean, default: true },
  taskAlerts: { type: Boolean, default: true },
  language: { type: String, default: "en" },
  timezone: { type: String, default: "UTC" },
  
  lastActive: { type: Date, default: Date.now },
  
  // Security Logs
  loginActivity: [{
    timestamp: { type: Date, default: Date.now },
    ip: String,
    device: String
  }],
  
  // Company Configuration (Admin/CEO only)
  companyName: { type: String, default: "" },
  companyLogo: { type: String, default: "" },
  companyAddress: { type: String, default: "" },
  workingDays: [{ type: String }],
  holidays: [{ type: String }] // Array of YYYY-MM-DD date strings
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);

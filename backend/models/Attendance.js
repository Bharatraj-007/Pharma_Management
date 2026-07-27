const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  empNo: { type: String, default: "" },
  workerName: { type: String, required: true },
  company: { type: String, required: true },
  date: { type: String, required: true },
  checkIn: { type: String, default: null },
  checkOut: { type: String, default: null },
  status: { type: String, default: "Present" },
  extraHours: { type: Number, default: 0 },
  totalHours: { type: Number, default: 0 },
  overtime: { type: Number, default: 0 },
  remarks: { type: String, default: "" },
  markedBy: { type: String },
  markedByRole: { type: String },
  workerRole: { type: String, default: "worker" },
  hoursWorked: { type: Number, default: 0 },
  earnings: { type: Number, default: 0 },
  salaryRate: { type: Number, default: 0 },
  salaryType: { type: String, default: "daily" }
}, { timestamps: true });

attendanceSchema.index({ workerName: 1, company: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);

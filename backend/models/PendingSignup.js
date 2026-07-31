const mongoose = require("mongoose");

const pendingSignupSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  name: String,
  email: {
    type: String,
    required: true,
    index: true
  },
  phone: {
    type: String,
    default: ""
  },
  dob: {
    type: String,
    default: ""
  },
  age: {
    type: Number,
    default: 0
  },
  dateOfJoining: {
    type: String,
    default: ""
  },
  company: {
    type: String,
    required: true,
    default: "bharath"
  },
  idProofType: {
    type: String,
    default: ""
  },
  idProofNumber: {
    type: String,
    default: ""
  },
  passwordHash: {
    type: String,
    required: true
  },
  requestedRole: {
    type: String,
    enum: ["ceo", "admin", "manager", "worker"],
    default: "worker"
  },

  // Step 1: Self verification
  selfOtp: {
    type: String,
    default: ""
  },
  selfOtpExpiresAt: {
    type: Date
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },

  // Step 2: Approval
  approverUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  approverRole: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    enum: ["pending_self_verification", "pending_approval", "approved", "rejected"],
    default: "pending_self_verification"
  },
  rejectionReason: {
    type: String,
    default: ""
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  decidedAt: {
    type: Date
  }
});

pendingSignupSchema.index({ email: 1, status: 1 });

module.exports = mongoose.model("PendingSignup", pendingSignupSchema);

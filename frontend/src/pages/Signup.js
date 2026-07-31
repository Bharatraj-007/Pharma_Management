import { useState } from "react";
import API_BASE_URL from "../config";

function Signup() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dob: "",
    age: "",
    joiningDate: "",
    company: "bharath",
    idProofType: "",
    idProofNumber: "",
    password: "",
    confirmPassword: "",
    role: "worker"
  });

  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "idProofType") {
      setForm((prev) => ({ ...prev, idProofType: value, idProofNumber: "" }));
    } else if (name === "idProofNumber") {
      let formatted = value;
      if (form.idProofType === "aadhar") {
        formatted = value.replace(/\D/g, "").slice(0, 12);
      } else if (form.idProofType === "pan") {
        formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
      }
      setForm((prev) => ({ ...prev, idProofNumber: formatted }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // 🔐 Password validation (8+ characters, must include at least 1 number)
  const isStrongPassword = (password) => {
    return /^(?=.*\d).{8,}$/.test(password || "");
  };

  // 📩 Send OTP
  const sendOtp = async () => {
    setError("");
    setSuccess("");

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError("First Name, Last Name, and Email are compulsory.");
      return;
    }
    const cleanPhone = (form.phone || "").replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setError("Phone number is compulsory and must be exactly 10 digits.");
      return;
    }
    if (!form.dob || !form.age || Number(form.age) <= 0 || !form.joiningDate) {
      setError("DOB, Age, and Date of Joining are compulsory.");
      return;
    }
    if (!form.idProofType) {
      setError("Please select an ID Proof Type (Aadhaar or PAN) first.");
      return;
    }
    if (!form.idProofNumber.trim()) {
      setError("ID Proof Number is compulsory.");
      return;
    }
    const cleanId = form.idProofNumber.trim().toUpperCase();
    if (form.idProofType === "aadhar") {
      if (!/^\d{12}$/.test(cleanId)) {
        setError("Aadhaar Card number must be exactly 12 digits (e.g. 123456789012).");
        return;
      }
    } else if (form.idProofType === "pan") {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanId)) {
        setError("PAN Card format must be 5 letters, 4 numbers, and 1 letter (e.g. AAAPB1234C).");
        return;
      }
    }
    if (!isStrongPassword(form.password)) {
      setError("Password must be at least 8 characters long and include at least one number.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/signup/send-self-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");

      setSuccess(data.message || "OTP sent successfully to your email!");
      setShowOtp(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔢 Verify OTP
  const verifyOtp = async () => {
    setError("");
    setSuccess("");

    if (!otp.trim()) {
      setError("Please enter the 6-digit OTP code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/signup/verify-self-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "OTP verification failed");

      setSuccess("Identity verified! Account request submitted for approval.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sp-auth-page">
      <div className="sp-auth-card sp-auth-card-wide animate-fade">
        <h2>Create Account</h2>
        <p className="sp-subtitle">Step 1: Enter your details to request access</p>

        {error && <div className="sp-alert sp-alert-danger">{error}</div>}
        {success && <div className="sp-alert sp-alert-success">{success}</div>}

        <div className="sp-form-row">
          <div className="sp-form-group">
            <label className="sp-label">First Name *</label>
            <input name="firstName" value={form.firstName} placeholder="First Name" className="sp-input" onChange={handleChange} />
          </div>
          <div className="sp-form-group">
            <label className="sp-label">Last Name *</label>
            <input name="lastName" value={form.lastName} placeholder="Last Name" className="sp-input" onChange={handleChange} />
          </div>
          <div className="sp-form-group">
            <label className="sp-label">Email *</label>
            <input name="email" value={form.email} placeholder="Email address" className="sp-input" onChange={handleChange} />
          </div>
          <div className="sp-form-group">
            <label className="sp-label">Phone *</label>
            <input name="phone" value={form.phone} placeholder="10-digit mobile number" className="sp-input" onChange={handleChange} maxLength={10} />
          </div>
          <div className="sp-form-group">
            <label className="sp-label">Date of Birth *</label>
            <input type="date" name="dob" value={form.dob} className="sp-input" onChange={handleChange} />
          </div>
          <div className="sp-form-group">
            <label className="sp-label">Age *</label>
            <input name="age" value={form.age} placeholder="Age" className="sp-input" onChange={handleChange} type="number" />
          </div>
          <div className="sp-form-group">
            <label className="sp-label">Date of Joining *</label>
            <input type="date" name="joiningDate" value={form.joiningDate} className="sp-input" onChange={handleChange} />
          </div>
          <div className="sp-form-group">
            <label className="sp-label">Company *</label>
            <select name="company" value={form.company} className="sp-select" onChange={handleChange}>
              <option value="bharath">Bharath Enterprises</option>
              <option value="shree_ganaapathy">Shree Ganaapathy Roto Prints</option>
              <option value="vel">Vel Gravure</option>
            </select>
          </div>
          <div className="sp-form-group">
            <label className="sp-label">Role *</label>
            <select name="role" value={form.role} className="sp-select" onChange={handleChange}>
              <option value="worker">Worker</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
              <option value="ceo">CEO</option>
            </select>
          </div>
          <div className="sp-form-group">
            <label className="sp-label">ID Proof Type *</label>
            <select name="idProofType" value={form.idProofType} className="sp-select" onChange={handleChange}>
              <option value="">Select ID Proof</option>
              <option value="aadhar">Aadhaar Card</option>
              <option value="pan">PAN Card</option>
            </select>
          </div>
          <div className="sp-form-group">
            <label className="sp-label">
              ID Number * {!form.idProofType && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>(Select ID Proof First)</span>}
            </label>
            <input
              name="idProofNumber"
              value={form.idProofNumber}
              disabled={!form.idProofType}
              placeholder={
                !form.idProofType
                  ? "🔒 Select ID Proof Type First"
                  : form.idProofType === "aadhar"
                  ? "Enter 12-digit Aadhaar (e.g. 123456789012)"
                  : "Enter 10-character PAN (e.g. AAAPB1234C)"
              }
              className={`sp-input ${!form.idProofType ? "sp-input-disabled" : ""}`}
              onChange={handleChange}
              style={{
                backgroundColor: !form.idProofType ? "#f1f5f9" : "#ffffff",
                cursor: !form.idProofType ? "not-allowed" : "text"
              }}
              maxLength={form.idProofType === "aadhar" ? 12 : form.idProofType === "pan" ? 10 : 30}
            />
          </div>
          <div className="sp-form-group">
            <label className="sp-label">Password *</label>
            <input type="password" name="password" value={form.password} placeholder="Min 8 chars with 1 number" className="sp-input" onChange={handleChange} />
          </div>
          <div className="sp-form-group">
            <label className="sp-label">Confirm Password *</label>
            <input type="password" name="confirmPassword" value={form.confirmPassword} placeholder="Confirm Password" className="sp-input" onChange={handleChange} />
          </div>
        </div>

        {!showOtp ? (
          <button className="sp-btn sp-btn-primary sp-btn-lg sp-btn-block mt-4" onClick={sendOtp} disabled={loading}>
            {loading ? "Sending Verification OTP..." : "Send Verification OTP"}
          </button>
        ) : (
          <>
            <div className="sp-form-group mt-4">
              <label className="sp-label">Enter 6-Digit Verification OTP sent to {form.email}</label>
              <input placeholder="Enter 6-digit OTP" value={otp} className="sp-input" onChange={(e) => setOtp(e.target.value)} maxLength={6} />
            </div>
            <button className="sp-btn sp-btn-success sp-btn-lg sp-btn-block" onClick={verifyOtp} disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP & Submit for Approval"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Signup;

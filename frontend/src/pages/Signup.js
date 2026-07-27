import { useState } from "react";
import API_BASE_URL from "../config";

function Signup() {
  const [form, setForm] = useState({});
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 🔐 Password validation
  const isStrongPassword = (password) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(password);
  };

  // 📩 Send OTP
  const sendOtp = async () => {
    if (!isStrongPassword(form.password)) {
      alert("Password must be 8+ chars with A-Z, a-z, number & symbol");
      return;
    }
    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    const res = await fetch(`${API_BASE_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    alert(await res.text());
    setShowOtp(true);
  };

  // 🔢 Verify OTP
  const verifyOtp = async () => {
    const res = await fetch(`${API_BASE_URL}/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, otp })
    });
    alert(await res.text());
  };

  return (
    <div className="sp-auth-page">
      <div className="sp-auth-card sp-auth-card-wide animate-fade">
        <h2>Create Account</h2>

        <div className="sp-form-row">
          <div className="sp-form-group">
            <label className="sp-label">First Name</label>
            <input name="firstName" placeholder="First Name" className="sp-input" onChange={handleChange} />
          </div>
          <div className="sp-form-group">
            <label className="sp-label">Last Name</label>
            <input name="lastName" placeholder="Last Name" className="sp-input" onChange={handleChange} />
          </div>
          <div className="sp-form-group">
            <label className="sp-label">Email</label>
            <input name="email" placeholder="Email" className="sp-input" onChange={handleChange} />
          </div>
          <div className="sp-form-group">
            <label className="sp-label">Phone</label>
            <input name="phone" placeholder="Phone" className="sp-input" onChange={handleChange} />
          </div>
          <div className="sp-form-group">
            <label className="sp-label">Date of Birth</label>
            <input type="date" name="dob" className="sp-input" onChange={handleChange} />
          </div>
          <div className="sp-form-group">
            <label className="sp-label">Age</label>
            <input name="age" placeholder="Age" className="sp-input" onChange={handleChange} />
          </div>
          <div className="sp-form-group">
            <label className="sp-label">Date of Joining</label>
            <input type="date" name="joiningDate" className="sp-input" onChange={handleChange} />
          </div>
          <div className="sp-form-group">
            <label className="sp-label">Company</label>
            <select name="company" className="sp-select" onChange={handleChange}>
              <option value="">Select Company</option>
              <option value="bharath">Bharath Enterprises</option>
              <option value="shree_ganaapathy">Shree Ganaapathy Roto Prints</option>
              <option value="vel">Vel Gravure</option>
            </select>
          </div>
          <div className="sp-form-group">
            <label className="sp-label">ID Proof</label>
            <select name="idProofType" className="sp-select" onChange={handleChange}>
              <option value="">Select ID Proof</option>
              <option value="aadhar">Aadhar</option>
              <option value="pan">PAN</option>
            </select>
          </div>
          <div className="sp-form-group">
            <label className="sp-label">ID Number</label>
            <input name="idProofNumber" placeholder="ID Number" className="sp-input" onChange={handleChange} />
          </div>
          <div className="sp-form-group">
            <label className="sp-label">Password</label>
            <input type="password" name="password" placeholder="Password" className="sp-input" onChange={handleChange} />
          </div>
          <div className="sp-form-group">
            <label className="sp-label">Confirm Password</label>
            <input type="password" name="confirmPassword" placeholder="Confirm Password" className="sp-input" onChange={handleChange} />
          </div>
          <div className="sp-form-group">
            <label className="sp-label">Role</label>
            <select name="role" className="sp-select" onChange={handleChange}>
              <option value="worker">Worker</option>
              <option value="manager">Manager</option>
            </select>
          </div>
        </div>

        {!showOtp ? (
          <button className="sp-btn sp-btn-primary sp-btn-lg sp-btn-block mt-4" onClick={sendOtp}>
            Send OTP
          </button>
        ) : (
          <>
            <div className="sp-form-group mt-4">
              <label className="sp-label">Enter OTP</label>
              <input placeholder="Enter OTP" className="sp-input" onChange={(e) => setOtp(e.target.value)} />
            </div>
            <button className="sp-btn sp-btn-success sp-btn-lg sp-btn-block" onClick={verifyOtp}>
              Verify OTP
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Signup;

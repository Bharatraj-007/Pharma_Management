import { useState } from "react";
import API_BASE_URL from "../config";

function VerifyOTP() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const verify = async () => {
    const res = await fetch(`${API_BASE_URL}/verify-otp`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ email, otp })
    });
    alert(await res.text());
  };

  return (
    <div className="sp-auth-page">
      <div className="sp-auth-card animate-fade">
        <h2>Verify OTP</h2>
        <div className="sp-form-group">
          <label className="sp-label">Email</label>
          <input placeholder="Email" className="sp-input" onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="sp-form-group">
          <label className="sp-label">OTP Code</label>
          <input placeholder="Enter 6-digit OTP" className="sp-input" onChange={e => setOtp(e.target.value)} />
        </div>
        <button className="sp-btn sp-btn-primary sp-btn-lg sp-btn-block mt-3" onClick={verify}>
          Verify OTP
        </button>
      </div>
    </div>
  );
}

export default VerifyOTP;

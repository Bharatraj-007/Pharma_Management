import { useState } from "react";
import API_BASE_URL from "../config";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        alert("Login failed");
        return;
      }

      const data = await res.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("name", data.name);
      if (data.id) localStorage.setItem("userId", data.id);
      if (data.company) localStorage.setItem("company", data.company);
      if (data.companyName) localStorage.setItem("companyName", data.companyName);

      window.location.href = "/dashboard";
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sp-auth-page">
      <div className="sp-auth-card animate-fade">
        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>💊</div>
        <h2>Smart Pharma Login</h2>

        <div className="sp-form-group">
          <label className="sp-label">Email</label>
          <input
            type="email"
            placeholder="Enter Email"
            className="sp-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="sp-form-group">
          <label className="sp-label">Password</label>
          <input
            type="password"
            placeholder="Enter Password"
            className="sp-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          className="sp-btn sp-btn-primary sp-btn-lg sp-btn-block mt-3"
          onClick={login}
          disabled={loading}
        >
          {loading ? "⏳ Signing in..." : "Sign In"}
        </button>
      </div>
    </div>
  );
}

export default Login;

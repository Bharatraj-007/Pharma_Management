import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="sp-auth-page">
      <div className="sp-auth-card animate-fade" style={{ textAlign: "center" }}>
        <div style={{ fontSize: "5rem", marginBottom: "var(--space-4)" }}>🚫</div>
        <h1 style={{ fontSize: "var(--font-3xl)", margin: 0 }}>404</h1>
        <p className="text-muted mt-2 mb-5">The page you're looking for doesn't exist.</p>
        <Link to="/dashboard" className="sp-btn sp-btn-primary sp-btn-lg">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFound;

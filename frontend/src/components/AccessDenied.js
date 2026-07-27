import { Link } from "react-router-dom";

function AccessDenied() {
  return (
    <div className="sp-content">
      <div className="sp-card sp-card-center animate-fade">
        <h1>Access Denied</h1>
        <p>You do not have permission to view this page.</p>
        <Link to="/dashboard" className="sp-btn sp-btn-primary mt-4">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default AccessDenied;

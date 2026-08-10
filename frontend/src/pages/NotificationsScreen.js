import React, { useState, useEffect } from "react";
import API_BASE_URL from "../config";

function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("token");

  const fetchNotifications = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: { Authorization: token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load notifications.");
      setNotifications(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/read`, {
        method: "PUT",
        headers: { Authorization: token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark notifications read.");
      setSuccess("All notifications marked as read.");
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>🔔 Notifications History</h1>
          <p>View all real-time alerts, task assignments, and system updates.</p>
        </div>
        <button
          className="sp-btn sp-btn-secondary"
          onClick={handleMarkAllRead}
          disabled={notifications.filter(n => !n.isRead).length === 0}
        >
          ✅ Mark All as Read
        </button>
      </div>

      {error && <div className="sp-alert sp-alert-danger mb-4">{error}</div>}
      {success && <div className="sp-alert sp-alert-success mb-4">{success}</div>}

      <div className="sp-card" style={{ padding: "20px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div className="sp-loading-spinner" style={{ margin: "auto" }}></div>
            <p className="text-muted mt-3">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
            <span style={{ fontSize: "40px" }}>📭</span>
            <p className="mt-3">You don't have any notifications yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {notifications.map((n) => (
              <div
                key={n._id}
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  borderLeft: `4px solid ${
                    n.type === "task" ? "var(--color-primary)" : n.type === "chat" ? "var(--color-success)" : "var(--color-warning)"
                  }`,
                  background: n.isRead ? "var(--color-bg)" : "rgba(29, 78, 216, 0.05)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <p style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: n.isRead ? "normal" : "bold", color: "var(--color-text)" }}>
                    {n.message}
                  </p>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background:
                          n.type === "task" ? "rgba(29, 78, 216, 0.1)" : n.type === "chat" ? "rgba(22, 163, 74, 0.1)" : "rgba(202, 138, 4, 0.1)",
                        color:
                          n.type === "task" ? "var(--color-primary)" : n.type === "chat" ? "var(--color-success)" : "var(--color-warning)"
                      }}
                    >
                      {n.type.replace("_", " ")}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                      {new Date(n.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
                {!n.isRead && (
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-primary)" }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsScreen;

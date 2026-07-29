import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import API_BASE_URL from "../config";

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const company = localStorage.getItem("company");

  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: { Authorization: token }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchNotifications();

    const interval = setInterval(() => {
      if (localStorage.getItem("token")) {
        fetchNotifications();
      }
    }, 15000);

    const handleRealtimeNotification = (notif) => {
      setNotifications(prev => [notif, ...prev]);
    };

    const setupSocketListener = () => {
      if (window.socket) {
        window.socket.on("notification", handleRealtimeNotification);
      } else {
        setTimeout(setupSocketListener, 1000);
      }
    };
    setupSocketListener();

    return () => {
      clearInterval(interval);
      if (window.socket) {
        window.socket.off("notification", handleRealtimeNotification);
      }
    };
  }, [token]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/notifications/read`, {
        method: "PUT",
        headers: { Authorization: token }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const logout = () => {
    if (window.socket) {
      window.socket.disconnect();
      window.socket = null;
    }
    localStorage.clear();
    navigate("/");
  };

  const getCompanyName = (code) => {
    switch (code) {
      case "vel":
        return "Vel Gravure";
      case "bharath":
        return "Bharath Enterprises";
      case "shree_ganaapathy":
        return "Shree Ganaapathy Roto Prints";
      default:
        return code;
    }
  };

  const toggleSidebar = () => {
    window.dispatchEvent(new Event("sidebarToggle"));
  };

  return (
    <div className="sp-navbar">
      <div className="sp-navbar-left">
        {token && (
          <button
            onClick={toggleSidebar}
            className="sp-btn sp-btn-icon sp-hamburger-btn"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
        )}
        <div className="sp-navbar-brand">
          <h2>💊 Smart Pharma</h2>
          {(['super_admin', 'ceo'].includes(localStorage.getItem("role"))) ? (
            <select
              value={localStorage.getItem("activeCompany") || company || "all"}
              onChange={(e) => {
                const val = e.target.value;
                localStorage.setItem("activeCompany", val);
                window.dispatchEvent(new Event("companyChanged"));
                window.location.reload();
              }}
              style={{
                marginLeft: '12px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid var(--color-primary)',
                fontWeight: 'bold',
                fontSize: '13px',
                backgroundColor: '#eff6ff',
                color: 'var(--color-primary)',
                cursor: 'pointer'
              }}
            >
              <option value="all">🏢 All Companies (Super Admin)</option>
              <option value="bharath">Pharma Printing (Bharath - Co 1)</option>
              <option value="shree_ganaapathy">Commercial Printing (Shree - Co 2)</option>
              <option value="vel">Cylinder Mfg (Vel Gravure - Co 3)</option>
            </select>
          ) : (
            company && <span className="company-badge">{getCompanyName(company)}</span>
          )}
        </div>
      </div>

      <div className="nav-actions" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {token && (
          <div className="notification-bell-container" style={{ position: "relative" }}>
            <button
              onClick={() => {
                setShowDropdown(!showDropdown);
                if (!showDropdown && unreadCount > 0) {
                  markAllRead();
                }
              }}
              style={{
                background: "none",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                position: "relative",
                padding: "4px"
              }}
            >
              🔔
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-2px",
                    right: "-2px",
                    background: "var(--color-danger)",
                    color: "white",
                    borderRadius: "50%",
                    padding: "2px 6px",
                    fontSize: "10px",
                    fontWeight: "bold"
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {showDropdown && (
              <div
                className="sp-card"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "35px",
                  width: "280px",
                  maxHeight: "360px",
                  overflowY: "auto",
                  zIndex: 1000,
                  boxShadow: "var(--shadow-lg)",
                  padding: "8px",
                  background: "#fff"
                }}
              >
                <div style={{ padding: "6px 8px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "bold" }}>
                  <span>Notifications</span>
                  <Link to="/notifications" onClick={() => setShowDropdown(false)} style={{ color: "var(--color-primary)", textDecoration: "underline" }}>View All</Link>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: "12px", textAlign: "center", color: "var(--color-text-muted)", fontSize: "12px" }}>No notifications</div>
                  ) : (
                    notifications.slice(0, 5).map((notif) => (
                      <div
                        key={notif._id}
                        style={{
                          padding: "8px",
                          borderRadius: "4px",
                          background: notif.isRead ? "none" : "rgba(29, 78, 216, 0.05)",
                          borderBottom: "1px solid var(--color-border-light)",
                          fontSize: "12px"
                        }}
                      >
                        <p style={{ margin: 0, color: "var(--color-text)", fontWeight: notif.isRead ? 400 : 700 }}>{notif.message}</p>
                        <span style={{ fontSize: "9px", color: "var(--color-text-muted)" }}>
                          {new Date(notif.createdAt).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {!token ? (
          <>
            <Link to="/login">
              <button className="sp-btn sp-btn-nav-solid sp-btn-sm">Login</button>
            </Link>
            <Link to="/signup">
              <button className="sp-btn sp-btn-nav sp-btn-sm">Sign Up</button>
            </Link>
          </>
        ) : (
          <button onClick={logout} className="sp-btn sp-btn-nav-danger sp-btn-sm">
            Logout
          </button>
        )}
      </div>
    </div>
  );
}

export default Navbar;

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SidebarMenu from "./SidebarMenu";
import { usePermissions } from "../hooks/usePermissions";
import { MENU_ITEMS } from "../permissions";
import { io } from "socket.io-client";
import API_BASE_URL from "../config";

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { hasAccess } = usePermissions();

  const rawName = localStorage.getItem("name") || "User";
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const name = (role === "ceo" || rawName === "System CEO") ? "CEO (Owner / System Head)" : rawName;
  const companyName = localStorage.getItem("companyName") || "Bharath Enterprises";
  const formattedRole = role ? role.toUpperCase() : "UNKNOWN";

  const handleLogout = () => {
    if (window.socket) {
      window.socket.disconnect();
      window.socket = null;
    }
    localStorage.clear();
    navigate("/");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const getUserIdFromToken = (t) => {
      try {
        const base64Url = t.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        return JSON.parse(window.atob(base64)).id;
      } catch { return null; }
    };

    const myUserId = localStorage.getItem("userId") || getUserIdFromToken(token);
    if (!myUserId) return;

    const socketUrl = API_BASE_URL.replace("/api", "");

    if (!window.socket) {
      const newSocket = io(socketUrl, {
        transports: ["polling", "websocket"]
      });

      newSocket.on("connect", () => {
        newSocket.emit("join", myUserId);
      });

      window.socket = newSocket;
    } else {
      if (window.socket.disconnected) {
        window.socket.connect();
      }
      window.socket.emit("join", myUserId);
    }
  }, []);

  useEffect(() => {
    const handleToggle = () => setSidebarOpen((prev) => !prev);
    window.addEventListener("sidebarToggle", handleToggle);

    return () => {
      window.removeEventListener("sidebarToggle", handleToggle);
    };
  }, []);

  const closeSidebar = () => setSidebarOpen(false);

  const handleMoreClick = () => {
    window.dispatchEvent(new Event("sidebarToggle"));
  };

  // Extract the primary mobile bottom nav links based on permission
  const bottomNavKeys = ["dashboard", "tasks", "stock", "chat"];
  const bottomItems = MENU_ITEMS.filter(
    (item) => bottomNavKeys.includes(item.key) && hasAccess(item.key)
  );

  return (
    <div className={`sp-layout${sidebarOpen ? " sp-layout-sidebar-open" : ""}`}>
      {/* Sidebar - Persistent on laptop, slides in on mobile */}
      <aside className={`sp-sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="sidebar-brand">Smart Pharma</div>

        <div className="user-card">
          <div className="user-name">{name}</div>
          <div className="user-role">{formattedRole}</div>
          {companyName && <div className="user-company">{companyName}</div>}
        </div>

        <SidebarMenu onNavigate={closeSidebar} />

        {/* Sidebar Logout (Pushed to bottom via margin-top: auto) */}
        <div className="nav-link nav-link-logout" onClick={handleLogout} style={{ cursor: "pointer" }}>
          <span>🚪</span>
          <span>Logout</span>
        </div>
      </aside>

      <div className={`sp-sidebar-backdrop${sidebarOpen ? " active" : ""}`} onClick={closeSidebar} />

      {/* Content */}
      <main className="sp-content animate-fade">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar (Hidden on Laptop via CSS) */}
      <nav className="sp-bottom-nav">
        {bottomItems.map((item) => (
          <Link
            key={item.key}
            to={item.path}
            className={`sp-bottom-nav-item${location.pathname === item.path ? " active" : ""}`}
          >
            <span className="sp-bottom-nav-icon">{item.icon}</span>
            <span className="sp-bottom-nav-label">{item.label}</span>
          </Link>
        ))}
        <button className="sp-bottom-nav-item sp-bottom-nav-more" onClick={handleMoreClick}>
          <span className="sp-bottom-nav-icon">☰</span>
          <span className="sp-bottom-nav-label">More</span>
        </button>
      </nav>
    </div>
  );
}

export default Layout;

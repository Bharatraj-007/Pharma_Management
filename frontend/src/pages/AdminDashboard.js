import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL, { safeJson } from "../config";

function AdminDashboard() {
  const adminName = localStorage.getItem("name") || "Admin";
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard/summary`, {
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error("Unable to load dashboard information");
      const json = await safeJson(res);
      setData(json);
    } catch (err) {
      setError(err.message || "Unable to load dashboard information");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();

    // 10-second periodic refetch
    const interval = setInterval(fetchData, 10000);

    // Refetch on window focus
    const onFocus = () => fetchData();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [token, fetchData]);

  if (loading) {
    return (
      <div className="sp-loading-container">
        <div className="sp-loading-spinner"></div>
        <p className="sp-loading-text">Loading Admin Dashboard...</p>
      </div>
    );
  }

  const companyName = data?.companyName || "Bharath Enterprises";
  const totalUsers = data?.totalUsers ?? 0;
  const totalTasks = data?.totalTasks ?? { total: 0, done: 0, pending: 0 };
  const inventoryItems = data?.inventoryItems ?? { total: 0, foils: 0, cylinders: 0 };
  const pendingRequests = data?.pendingRequests ?? 0;
  const todayTasks = data?.todayTasks ?? 0;
  const taskStatus = data?.taskStatus ?? { pending: 0, inProgress: 0, completed: 0 };
  const attendanceStatus = data?.attendanceStatus || "not_marked";
  const notifications = data?.notifications || [];

  const attendanceBadgeClass = 
    attendanceStatus === "present" ? "sp-badge-success" :
    attendanceStatus === "completed" ? "sp-badge-primary" : "sp-badge-warning";

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back, Admin {adminName}</h1>
        <p>{companyName} control panel for users, tasks, inventory, and reports.</p>
      </div>

      <div className="sp-card mb-5">
        <div className="sp-card-header">
          <div>
            <h3>Welcome back, Admin {adminName}</h3>
            <p className="mt-2 text-sm text-muted">
              Live company information from the database.
            </p>
          </div>
          <span className="sp-badge sp-badge-primary">ADMIN</span>
        </div>
      </div>

      {error && <div className="sp-alert sp-alert-danger mb-5">{error}</div>}

      {/* Section: Company Overview */}
      <h2 className="mb-3 text-lg font-bold" style={{ fontSize: "1.25rem", color: "var(--color-text)" }}>Company Overview</h2>
      <div className="sp-card-grid mb-5">
        <div className="sp-card">
          <p className="text-sm text-muted">Total Users</p>
          <h2>{totalUsers}</h2>
          <p className="mt-2 text-sm text-muted">Approved staff in this company</p>
        </div>
        <div className="sp-card">
          <p className="text-sm text-muted">Total Tasks</p>
          <h2>{totalTasks.total}</h2>
          <p className="mt-2 text-sm text-muted">{totalTasks.done} completed · {totalTasks.pending} pending/in progress</p>
        </div>
        <div className="sp-card">
          <p className="text-sm text-muted">Inventory Items</p>
          <h2>{inventoryItems.total}</h2>
          <p className="mt-2 text-sm text-muted">{inventoryItems.foils} foils · {inventoryItems.cylinders} cylinders</p>
        </div>
        <div className="sp-card">
          <p className="text-sm text-muted">Pending Requests</p>
          <h2>{pendingRequests}</h2>
          <p className="mt-2 text-sm text-muted">Verified signup requests waiting for approval</p>
        </div>
      </div>

      {/* Section: Today's Activity */}
      <h2 className="mb-3 text-lg font-bold" style={{ fontSize: "1.25rem", color: "var(--color-text)" }}>Today's Activity</h2>
      <div className="sp-card-grid mb-5">
        <div className="sp-card">
          <h3>Today's Tasks</h3>
          <p className="text-sm text-muted">Assigned tasks for today</p>
          <div className="mt-4">
            <h2>{todayTasks}</h2>
            <p className="text-muted">Tasks due or started today</p>
          </div>
        </div>

        <div className="sp-card">
          <h3>Task Status</h3>
          <div className="dashboard-status-grid">
            <div className="sp-card sp-card-condensed sp-card-primary">
              <span className="text-muted">Pending</span>
              <strong>{taskStatus.pending}</strong>
            </div>
            <div className="sp-card sp-card-condensed sp-card-accent">
              <span className="text-muted">In Progress</span>
              <strong>{taskStatus.inProgress}</strong>
            </div>
            <div className="sp-card sp-card-condensed sp-card-success">
              <span className="text-muted">Completed</span>
              <strong>{taskStatus.completed}</strong>
            </div>
          </div>
        </div>

        <div className="sp-card">
          <h3>Attendance</h3>
          <p className="text-sm text-muted">Status for today</p>
          <div className="mt-4">
            <span className={`sp-badge ${attendanceBadgeClass}`}>
              {attendanceStatus.toUpperCase().replace('_', ' ')}
            </span>
            <p className="mt-3 text-sm text-muted">
              {attendanceStatus === "not_marked" 
                ? "Mark attendance in the Attendance section." 
                : `Status is currently ${attendanceStatus.replace('_', ' ')}.`}
            </p>
          </div>
        </div>
      </div>

      {/* Section: Notifications */}
      {notifications.length > 0 && (
        <div className="sp-card mb-5">
          <div className="sp-card-header">
            <h3>Notifications</h3>
            <span className="sp-badge sp-badge-primary">{notifications.length} new</span>
          </div>
          <div className="sp-card-grid" style={{ gridTemplateColumns: "1fr", gap: "var(--space-3)" }}>
            {notifications.map((notif, idx) => (
              <div key={idx} className="sp-card sp-card-condensed sp-card-surface">
                <p className="text-sm text-muted">
                  {notif.type === "task" ? "📋 TASK" : "🗓️ LEAVE"}
                </p>
                <p>{notif.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section: Quick Actions */}
      <div className="sp-card mb-5">
        <div className="sp-card-header">
          <h3>Quick Actions</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="sp-btn sp-btn-primary" onClick={() => navigate("/tasks")}>View Tasks</button>
          <button className="sp-btn sp-btn-secondary" onClick={() => navigate("/attendance")}>Open Attendance</button>
          <button className="sp-btn sp-btn-success" onClick={() => navigate("/leave")}>Apply Leave</button>
          <button className="sp-btn sp-btn-outline" onClick={() => navigate("/stock")}>Manage Inventory</button>
          <button className="sp-btn sp-btn-warning" onClick={() => navigate("/user-management")}>Approve Requests</button>
        </div>
      </div>

      {/* Footer Helper Text */}
      <div className="sp-card">
        <div className="sp-card-header">
          <h3>Information</h3>
          <span className="sp-badge sp-badge-success">Active</span>
        </div>
        <p>Use the sidebar to create tasks, manage inventory, approve users, and review audit logs.</p>
        <p>All counters above reflect live data from MongoDB. Data syncs automatically every 10 seconds.</p>
      </div>
    </div>
  );
}

export default AdminDashboard;

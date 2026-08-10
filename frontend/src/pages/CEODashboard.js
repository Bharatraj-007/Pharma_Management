import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL, { safeJson } from "../config";

function CEODashboard() {
  const rawName = localStorage.getItem("name") || "CEO";
  const name = (rawName === "System CEO" || rawName === "CEO") ? "CEO (Owner / System Head)" : rawName;
  const token = localStorage.getItem("token");
  const activeCompany = localStorage.getItem("activeCompany") || "bharath";
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard/summary?activeCompany=${encodeURIComponent(activeCompany)}`, {
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
  }, [token, activeCompany]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    const onFocus = () => fetchData();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchData]);



  const companyName = data?.companyName || "Bharath Enterprises";
  const totalUsers = data?.totalUsers ?? 0;
  const totalTasks = data?.totalTasks ?? { total: 0, done: 0, pending: 0 };
  const inventoryItems = data?.inventoryItems ?? { total: 0, foils: 0, cylinders: 0 };
  const pendingRequests = data?.pendingRequests ?? 0;
  const todayTasks = data?.todayTasks ?? 0;
  const taskStatus = data?.taskStatus ?? { pending: 0, inProgress: 0, completed: 0 };
  const attendanceStatus = data?.attendanceStatus || "not_marked";

  return (
    <div style={{ gap: "24px", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: "16px" }}>
        <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "800", color: "#1e293b" }}>Welcome back, {name}</h1>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
          {companyName} control panel for users, tasks, inventory, and reports.
        </p>
      </div>

      {error && <div className="sp-alert sp-alert-danger">{error}</div>}

      {/* Section 1: Company Overview */}
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#1e293b", marginBottom: "16px" }}>Company Overview</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          <div className="sp-card">
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Total Users</p>
            <h2 style={{ margin: "8px 0 4px", fontSize: "32px", fontWeight: "800", color: "#1e293b" }}>{totalUsers}</h2>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Approved staff in this company</p>
          </div>

          <div className="sp-card">
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Total Tasks</p>
            <h2 style={{ margin: "8px 0 4px", fontSize: "32px", fontWeight: "800", color: "#1e293b" }}>{totalTasks.total}</h2>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>{totalTasks.done} completed · {totalTasks.pending} pending</p>
          </div>

          <div className="sp-card">
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Inventory Items</p>
            <h2 style={{ margin: "8px 0 4px", fontSize: "32px", fontWeight: "800", color: "#1e293b" }}>{inventoryItems.total}</h2>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>{inventoryItems.foils} foils · {inventoryItems.cylinders} cylinders</p>
          </div>

          <div className="sp-card">
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Pending Requests</p>
            <h2 style={{ margin: "8px 0 4px", fontSize: "32px", fontWeight: "800", color: "#1e293b" }}>{pendingRequests}</h2>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Signup requests waiting for approval</p>
          </div>
        </div>
      </div>

      {/* Section 2: Today's Activity */}
      <div style={{ marginTop: "12px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#1e293b", marginBottom: "16px" }}>Today's Activity</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          <div className="sp-card">
            <h3 style={{ marginTop: 0, fontSize: "15px", fontWeight: "700" }}>Today's Tasks</h3>
            <h2 style={{ margin: "8px 0 4px", fontSize: "32px", fontWeight: "800", color: "#1e293b" }}>{todayTasks}</h2>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Tasks due or started today</p>
          </div>

          <div className="sp-card">
            <h3 style={{ marginTop: 0, fontSize: "15px", fontWeight: "700" }}>Task Status Breakdown</h3>
            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <div style={{ flex: 1, padding: "10px", borderRadius: "8px", backgroundColor: "#fef3c7", textAlign: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#92400e" }}>Pending</span>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#92400e", marginTop: "2px" }}>{taskStatus.pending}</div>
              </div>
              <div style={{ flex: 1, padding: "10px", borderRadius: "8px", backgroundColor: "#eef2ff", textAlign: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#3730a3" }}>In Progress</span>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#3730a3", marginTop: "2px" }}>{taskStatus.inProgress}</div>
              </div>
              <div style={{ flex: 1, padding: "10px", borderRadius: "8px", backgroundColor: "#d1fae5", textAlign: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#065f46" }}>Completed</span>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#065f46", marginTop: "2px" }}>{taskStatus.completed}</div>
              </div>
            </div>
          </div>

          <div className="sp-card">
            <h3 style={{ marginTop: 0, fontSize: "15px", fontWeight: "700" }}>Today's Attendance</h3>
            <span
              className={`sp-badge ${
                attendanceStatus === "present" ? "sp-badge-success" : attendanceStatus === "completed" ? "sp-badge-primary" : "sp-badge-warning"
              }`}
              style={{ margin: "8px 0", display: "inline-block" }}
            >
              {attendanceStatus.toUpperCase().replace("_", " ")}
            </span>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
              {attendanceStatus === "not_marked"
                ? "Mark attendance in the Attendance section."
                : `Status is currently ${attendanceStatus.replace("_", " ")}.`}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="sp-card" style={{ marginTop: "12px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "16px", fontSize: "16px" }}>⚡ Quick Actions</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button className="sp-btn sp-btn-primary" onClick={() => navigate("/tasks")}>View Tasks</button>
          <button className="sp-btn sp-btn-secondary" onClick={() => navigate("/attendance")}>Open Attendance</button>
          <button className="sp-btn sp-btn-success" onClick={() => navigate("/leave")}>Apply Leave</button>
          <button className="sp-btn sp-btn-secondary" onClick={() => navigate("/stock")}>Manage Inventory</button>
          <button className="sp-btn sp-btn-warning" onClick={() => navigate("/user-management")}>Approve Requests</button>
        </div>
      </div>
    </div>
  );
}

export default CEODashboard;

import { useEffect, useState } from "react";
import API_BASE_URL from "../config";
import { usePermissions } from "../hooks/usePermissions";

function DashboardPage() {
  const { role, isRole, can } = usePermissions();
  const userName = localStorage.getItem("name") || "Worker";

  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setError("");
      try {
        const token = localStorage.getItem("token");
        const [tasksRes, attendanceRes] = await Promise.all([
fetch(`${API_BASE_URL}/tasks`, { headers: { Authorization: token } }),
          fetch(`${API_BASE_URL}/attendance?date=${new Date().toISOString().split("T")[0]}`, { headers: { Authorization: token } }),
        ]);

        if (!tasksRes.ok || !attendanceRes.ok) {
          throw new Error("Could not load dashboard data.");
        }

        const tasksData = await tasksRes.json();
        const attendanceData = await attendanceRes.json();
        const ownTasks = role === "worker" ? tasksData.filter((task) => task.worker_name === userName) : tasksData;

        setTasks(Array.isArray(ownTasks) ? ownTasks : []);
        setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
      } catch (err) {
        setError(err.message || "Dashboard data failed to load.");
      }
    };

    fetchData();
  }, [role, userName]);

  const todaysTasks = tasks.filter((task) => {
    const today = new Date().toDateString();
    return new Date(task.createdAt || task.updatedAt || Date.now()).toDateString() === today;
  });

  const pendingCount = tasks.filter((task) => task.status === "pending").length;
  const inProgressCount = tasks.filter((task) => task.status === "in-progress").length;
  const completedCount = tasks.filter((task) => task.status === "completed").length;

  const todayAttendance = attendance.find((record) => record.date === new Date().toISOString().split("T")[0]);
  const attendanceStatus = todayAttendance ? todayAttendance.status : "Not Marked";
  const attendanceBadgeClass = attendanceStatus === "present"
    ? "sp-badge-success"
    : attendanceStatus === "completed"
    ? "sp-badge-primary"
    : "sp-badge-warning";
  const attendanceNote = todayAttendance
    ? "Checked in at " + (todayAttendance.checkIn || "-")
    : "Mark attendance in the Attendance section.";

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back, {userName}</h1>
        <p>
          {isRole("worker")
            ? "Here is your task performance and attendance summary for today."
            : "This is your company dashboard overview with live activity and approvals."}
        </p>
      </div>

      {error && <div className="sp-alert sp-alert-danger">{error}</div>}

      <div className="sp-card-grid mb-5">
        <div className="sp-card">
          <h3>Today's Tasks</h3>
          <p className="text-sm text-muted">Assigned tasks for today</p>
          <div className="mt-4">
            <h2>{todaysTasks.length}</h2>
            <p className="text-muted">Tasks due or started today</p>
          </div>
        </div>

        <div className="sp-card">
          <h3>Task Status</h3>
          <div className="dashboard-status-grid">
            <div className="sp-card sp-card-condensed sp-card-primary">
              <span className="text-muted">Pending</span>
              <strong>{pendingCount}</strong>
            </div>
            <div className="sp-card sp-card-condensed sp-card-accent">
              <span className="text-muted">In Progress</span>
              <strong>{inProgressCount}</strong>
            </div>
            <div className="sp-card sp-card-condensed sp-card-success">
              <span className="text-muted">Completed</span>
              <strong>{completedCount}</strong>
            </div>
          </div>
        </div>

        <div className="sp-card">
          <h3>Attendance</h3>
          <p className="text-sm text-muted">Status for today</p>
          <div className="mt-4">
            <span className={"sp-badge " + attendanceBadgeClass}>
              {attendanceStatus.toUpperCase()}
            </span>
            <p className="mt-3">{attendanceNote}</p>
          </div>
        </div>
      </div>

      <div className="sp-card mb-5">
        <div className="sp-card-header">
          <h3>Notifications</h3>
          <span className="sp-badge sp-badge-primary">{todaysTasks.length + attendance.length} new</span>
        </div>
        <div className="sp-card-grid" style={{ gridTemplateColumns: "1fr", gap: "var(--space-3)" }}>
          <div className="sp-card sp-card-condensed sp-card-surface">
            <p className="text-sm text-muted">New task assigned</p>
            <p>You have {pendingCount} pending tasks to start.</p>
          </div>
          {can("approveLeave") && (
            <div className="sp-card sp-card-condensed sp-card-surface">
              <p className="text-sm text-muted">Leave approvals</p>
              <p>Review team leave requests and respond before your next shift.</p>
            </div>
          )}
        </div>
      </div>

      <div className="sp-card">
        <div className="sp-card-header">
          <h3>Quick Actions</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="sp-btn sp-btn-primary">View Tasks</button>
          <button className="sp-btn sp-btn-secondary">Open Attendance</button>
          <button className="sp-btn sp-btn-success">Apply Leave</button>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;

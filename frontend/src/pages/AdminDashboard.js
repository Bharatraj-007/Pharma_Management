import { useEffect, useState } from "react";
import API_BASE_URL from "../config";

function AdminDashboard() {
  const companyName = localStorage.getItem("companyName") || "Bharath Enterprises";
  const adminName = localStorage.getItem("name") || "Admin";
  const token = localStorage.getItem("token");
  const [dashboardData, setDashboardData] = useState({
    staff: [],
    tasks: [],
    foils: [],
    cylinders: [],
    requests: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError("");

      try {
        const endpoints = ["staff", "tasks", "foils", "cylinders", "requests"];
        const responses = await Promise.all(
          endpoints.map((endpoint) =>
            fetch(`${API_BASE_URL}/${endpoint}`, {
              headers: { Authorization: token },
            })
          )
        );

        const failedResponse = responses.find((response) => !response.ok);
        if (failedResponse) {
          throw new Error("Unable to load dashboard information");
        }

        const [staff, tasks, foils, cylinders, requests] = await Promise.all(
          responses.map((response) => response.json())
        );

        setDashboardData({
          staff: Array.isArray(staff) ? staff : [],
          tasks: Array.isArray(tasks) ? tasks : [],
          foils: Array.isArray(foils) ? foils : [],
          cylinders: Array.isArray(cylinders) ? cylinders : [],
          requests: Array.isArray(requests) ? requests : [],
        });
      } catch (err) {
        setError(err.message || "Unable to load dashboard information");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token]);

  const { staff, tasks, foils, cylinders, requests } = dashboardData;
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const pendingTasks = tasks.filter((task) => task.status !== "completed").length;
  const totalInventory = foils.length + cylinders.length;

  const summaryCards = [
    { label: "Total Users", value: staff.length, note: "Approved staff in this company" },
    { label: "Total Tasks", value: tasks.length, note: `${completedTasks} completed, ${pendingTasks} pending/in progress` },
    { label: "Inventory Items", value: totalInventory, note: `${foils.length} foils, ${cylinders.length} cylinders` },
    { label: "Pending Requests", value: requests.length, note: "Verified signup requests waiting for approval" },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>{companyName} control panel for users, tasks, inventory, and reports.</p>
      </div>

      <div className="sp-card mb-5">
        <div className="sp-card-header">
          <div>
            <h3>Welcome, {adminName}</h3>
            <p className="mt-2">
              {loading ? "Loading live company information..." : "Live company information from the database."}
            </p>
          </div>
          <span className="sp-badge sp-badge-primary">ADMIN</span>
        </div>
      </div>

      {error && <div className="sp-alert sp-alert-error">{error}</div>}

      <div className="flex gap-5 flex-wrap mb-5">
        {summaryCards.map((card) => (
          <div key={card.label} className="sp-card" style={{ flex: "1 1 200px" }}>
            <p className="text-sm text-muted">{card.label}</p>
            <h2>{loading ? "..." : card.value}</h2>
            <p className="mt-2">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="sp-card">
        <div className="sp-card-header">
          <h3>Admin Information</h3>
          <span className="sp-badge sp-badge-success">Active</span>
        </div>

        <p>Total approved users, tasks, stock items, and pending requests now update from the real backend.</p>
        <p>Use the sidebar pages to create tasks, manage inventory, approve users, and review audit logs.</p>
      </div>
    </div>
  );
}

export default AdminDashboard;

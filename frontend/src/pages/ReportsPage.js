import { useEffect, useState } from "react";
import API_BASE_URL from "../config";
import { usePermissions } from "../hooks/usePermissions";

function ReportsPage() {
  const { role } = usePermissions();
  const [range, setRange] = useState("weekly");
  const [foilUsage, setFoilUsage] = useState([]);
  const [foilLoading, setFoilLoading] = useState(false);

  const summary = {
    completed: role === "worker" ? 12 : 84,
    hours: role === "worker" ? 42 : 312,
    onTime: role === "worker" ? 88 : 92,
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setFoilLoading(true);
    fetch(`${API_BASE_URL}/reports/foil-usage`, {
      headers: { Authorization: token }
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setFoilUsage(Array.isArray(data) ? data : []))
      .catch(() => setFoilUsage([]))
      .finally(() => setFoilLoading(false));
  }, []);

  const totalFoilUsed = foilUsage.reduce((sum, row) => sum + Number(row.totalFoilUsed || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1>Reports</h1>
        <p>{role === "worker" ? "Your performance and productivity summaries." : "Team and company analytics for your role."}</p>
      </div>

      <div className="sp-card-grid mb-5">
        <div className="sp-card sp-card-condensed sp-card-success">
          <p className="text-sm">Completed Tasks</p>
          <h2>{summary.completed}</h2>
        </div>
        <div className="sp-card sp-card-condensed sp-card-primary">
          <p className="text-sm">Hours Worked</p>
          <h2>{summary.hours}</h2>
        </div>
        <div className="sp-card sp-card-condensed sp-card-accent">
          <p className="text-sm">On-Time Rate</p>
          <h2>{summary.onTime}%</h2>
        </div>
      </div>

      <div className="sp-card mb-5">
        <div className="sp-card-header">
          <h3>Performance Overview</h3>
          <select className="sp-select" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="text-muted">Data updates based on your role scope. Worker sees personal data; supervisors and admins see broader team/company trends.</div>
      </div>

      <div className="sp-card mb-5">
        <div className="sp-card-header">
          <h3>Foil Consumption</h3>
          <span className="sp-badge sp-badge-primary">{totalFoilUsed.toFixed(2)} KG used</span>
        </div>
        {foilLoading ? (
          <p className="text-muted">Loading foil usage...</p>
        ) : foilUsage.length === 0 ? (
          <p className="text-muted">No foil consumption recorded yet.</p>
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Worker</th>
                  <th>Colours</th>
                  <th>Expected KG</th>
                  <th>Used KG</th>
                  <th>Variance</th>
                </tr>
              </thead>
              <tbody>
                {foilUsage.slice(0, 20).map((row) => (
                  <tr key={row.taskId}>
                    <td>{row.productName || row.taskId}</td>
                    <td>{row.workerName || "Unassigned"}</td>
                    <td>{row.colourCount} Colour Job</td>
                    <td>{Number(row.expectedUsage || 0).toFixed(2)}</td>
                    <td>{Number(row.totalFoilUsed || 0).toFixed(2)}</td>
                    <td>{Number(row.variance || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {role !== "worker" && (
        <div className="sp-card">
          <h3>Executive Analytics</h3>
          <p className="text-muted">Company-wide metrics, attendance patterns, and productivity snapshots for senior users.</p>
        </div>
      )}
    </div>
  );
}

export default ReportsPage;

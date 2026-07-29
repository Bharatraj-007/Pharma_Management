import { useEffect, useState } from "react";
import API_BASE_URL from "../config";
import { usePermissions } from "../hooks/usePermissions";

function ReportsPage() {
  const { role } = usePermissions();
  const [range, setRange] = useState("weekly");
  const [foilUsage, setFoilUsage] = useState([]);
  const [foilLoading, setFoilLoading] = useState(false);

  // Advance reports states
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [advanceLogs, setAdvanceLogs] = useState([]);
  const [advanceLoading, setAdvanceLoading] = useState(false);

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

  const fetchAdvanceReport = async () => {
    if (role !== "admin" && role !== "ceo") return;
    setAdvanceLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/advance/report?month=${reportMonth}`, {
        headers: { Authorization: token }
      });
      if (res.ok) {
        const data = await res.json();
        setAdvanceLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdvanceLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvanceReport();
  }, [reportMonth, role]);

  const handleDownload = async (format) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/advance/report/export?month=${reportMonth}&format=${format}`, {
        headers: { Authorization: token }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Advance_Report_${reportMonth}.${format === "pdf" ? "pdf" : "xlsx"}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert("Failed to export report");
      }
    } catch (err) {
      console.error(err);
    }
  };

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

      {/* Monthly Advance Report section (Admin/CEO only) */}
      {(role === "admin" || role === "ceo") && (
        <div className="sp-card mb-5">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "12px", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ margin: 0 }}>💸 Monthly Salary Advance Report</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="month"
                className="sp-input"
                style={{ width: "auto", marginBottom: 0, padding: "6px 12px" }}
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
              />
              <button
                className="sp-btn sp-btn-secondary sp-btn-sm"
                onClick={() => handleDownload("excel")}
                disabled={advanceLogs.filter(a => a.status === "approved").length === 0}
              >
                📥 Export Excel
              </button>
              <button
                className="sp-btn sp-btn-secondary sp-btn-sm"
                onClick={() => handleDownload("pdf")}
                disabled={advanceLogs.filter(a => a.status === "approved").length === 0}
              >
                📄 Export PDF
              </button>
            </div>
          </div>

          {advanceLoading ? (
            <p className="text-muted">Loading advance report...</p>
          ) : advanceLogs.length === 0 ? (
            <p className="text-muted">No salary advances requested for this month.</p>
          ) : (
            <div className="sp-table-wrap">
              <table className="sp-table">
                <thead>
                  <tr>
                    <th>Worker Name</th>
                    <th>Employee No</th>
                    <th>Amount Requested</th>
                    <th>Payment Method</th>
                    <th>Approved By</th>
                    <th>Date / Status</th>
                  </tr>
                </thead>
                <tbody>
                  {advanceLogs.map((row) => (
                    <tr key={row._id}>
                      <td><strong>{row.workerName}</strong></td>
                      <td>{row.employeeNo}</td>
                      <td>₹{row.amountRequested}</td>
                      <td>
                        <span className={`sp-badge ${row.paymentMethod === "online" ? "sp-badge-accent" : row.paymentMethod === "cash" ? "sp-badge-primary" : ""}`}>
                          {row.paymentMethod.toUpperCase()}
                        </span>
                      </td>
                      <td>{row.approvedBy}</td>
                      <td>
                        <span style={{
                          fontWeight: "bold",
                          color: row.status === "approved" ? "var(--color-success)" : row.status === "rejected" ? "var(--color-danger)" : "var(--color-warning)"
                        }}>
                          {row.status.toUpperCase()}
                        </span>
                        {row.status === "approved" && <span style={{ fontSize: "11px", color: "var(--color-text-muted)", marginLeft: "8px" }}>({row.date})</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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

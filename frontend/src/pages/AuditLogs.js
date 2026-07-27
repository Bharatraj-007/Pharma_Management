import { useEffect, useState } from "react";
import API_BASE_URL from "../config";

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE_URL}/audit-logs`, {
          headers: { Authorization: localStorage.getItem("token") }
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "Unable to load audit logs");
        }
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || "Unable to load audit logs");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>🔍 Audit Logs</h1>
        <p>Worker start and completion events are shown here for admin, manager, and CEO.</p>
      </div>

      {loading && <p className="text-muted animate-pulse">Loading logs...</p>}
      {error && <div className="sp-alert sp-alert-error">{error}</div>}
      {!loading && !error && logs.length === 0 && <p className="text-muted">No audit logs found.</p>}

      {!loading && !error && logs.length > 0 && (
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Type</th>
                <th>Item</th>
                <th>Changed By</th>
                <th>Role</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td><span className="sp-badge sp-badge-primary">{log.action}</span></td>
                  <td>{log.itemType}</td>
                  <td>{log.itemId || "—"}</td>
                  <td>{log.changedBy}</td>
                  <td><span className="sp-badge sp-badge-neutral">{log.changedByRole}</span></td>
                  <td>
                    {log.after?.status
                      ? `Status: ${log.after.status}`
                      : log.after?.company
                      ? `Company: ${log.after.company}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AuditLogs;

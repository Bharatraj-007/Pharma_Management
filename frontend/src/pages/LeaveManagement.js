import { useState, useEffect, useCallback } from "react";
import { usePermissions } from "../hooks/usePermissions";
import API_BASE_URL from "../config";

function LeaveManagement() {
  const { role, can } = usePermissions();
  const token = localStorage.getItem("token");

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({ type: "Sick", from: "", to: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    Authorization: token
  };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/leave`, {
        headers: { Authorization: token }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      } else {
        throw new Error("Failed to fetch leave requests.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.from || !form.to) {
      setError("Please fill in from and to dates.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/leave`, {
        method: "POST",
        headers,
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Leave request submitted successfully!");
        setForm({ type: "Sick", from: "", to: "", reason: "" });
        fetchRequests();
      } else {
        throw new Error(data.error || "Failed to submit request");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id, status) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/leave/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Leave request successfully ${status.toLowerCase()}!`);
        fetchRequests();
      } else {
        throw new Error(data.error || "Failed to update status");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Leave Management</h1>
        <p>{role === "worker" ? "Apply for leave and view your leave history." : "View and manage leave requests for your team or company."}</p>
      </div>

      {error && <div className="sp-alert sp-alert-danger mb-4">{error}</div>}
      {success && <div className="sp-alert sp-alert-success mb-4">{success}</div>}

      {role === "worker" && (
        <div className="sp-card mb-5">
          <h3>Apply for Leave</h3>
          <form onSubmit={handleSubmit} className="sp-form-row">
            <div className="sp-form-group">
              <label className="sp-label">Leave Type</label>
              <select className="sp-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="Sick">Sick</option>
                <option value="Casual">Casual</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>
            <div className="sp-form-group">
              <label className="sp-label">From</label>
              <input type="date" className="sp-input" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} required />
            </div>
            <div className="sp-form-group">
              <label className="sp-label">To</label>
              <input type="date" className="sp-input" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} required />
            </div>
            <div className="sp-form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="sp-label">Reason</label>
              <textarea className="sp-input" rows="3" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
            <button type="submit" className="sp-btn sp-btn-primary sp-btn-lg" style={{ gridColumn: "1 / -1" }} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Leave Request"}
            </button>
          </form>
        </div>
      )}

      <div className="sp-card">
        <div className="sp-card-header">
          <h3>Leave Requests</h3>
          <span className="sp-badge sp-badge-primary">{requests.length} total</span>
        </div>
        <div className="sp-table-wrap">
          {loading && requests.length === 0 ? (
            <div className="p-4 text-muted animate-pulse">Loading leave requests...</div>
          ) : (
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Type</th>
                  <th>Range</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  {can("approveLeave") && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request._id}>
                    <td>{request.worker}</td>
                    <td>{request.type}</td>
                    <td>{request.from} → {request.to}</td>
                    <td>{request.reason || "—"}</td>
                    <td>
                      <span className={`sp-badge ${request.status === "Approved" ? "sp-badge-success" : request.status === "Rejected" ? "sp-badge-danger" : "sp-badge-warning"}`}>
                        {request.status}
                      </span>
                    </td>
                    <td>{request.remarks}</td>
                    {can("approveLeave") && (
                      <td className="actions">
                        {request.status === "Pending" && (
                          <>
                            <button className="sp-btn sp-btn-success sp-btn-sm mr-2" onClick={() => updateStatus(request._id, "Approved")}>Approve</button>
                            <button className="sp-btn sp-btn-danger sp-btn-sm" onClick={() => updateStatus(request._id, "Rejected")}>Reject</button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={can("approveLeave") ? 7 : 6} className="empty-cell text-center p-4">No leave requests found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default LeaveManagement;

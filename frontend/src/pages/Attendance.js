import { useCallback, useEffect, useState } from "react";
import API_BASE_URL from "../config";
import { usePermissions } from "../hooks/usePermissions";

function Attendance() {
  const { isRole } = usePermissions();
  const userRole = (localStorage.getItem("role") || "worker").toLowerCase();
  const loggedInName = localStorage.getItem("name") || "Worker";
  const isAdminOrCeo = ["admin", "ceo"].includes(userRole);

  const [attendance, setAttendance] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [currentTime, setCurrentTime] = useState("");
  const [selectedWorker, setSelectedWorker] = useState(userRole === "worker" ? loggedInName : "");
  const [selectedStatus, setSelectedStatus] = useState("Present");
  const [notes, setNotes] = useState("");

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterWorker, setFilterWorker] = useState("All");

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({
    status: "",
    checkIn: "",
    checkOut: "",
    extraHours: 0,
    notes: "",
    empNo: "",
  });

  // 1. Real-time running clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-GB", { hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch attendance list with search & filters
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const query = new URLSearchParams();
      
      if (fromDate && toDate) {
        query.set("from", fromDate);
        query.set("to", toDate);
      } else {
        query.set("date", new Date().toISOString().split("T")[0]);
      }
      
      if (searchQuery) query.set("search", searchQuery);
      if (filterStatus && filterStatus !== "All") query.set("status", filterStatus);
      if (filterWorker && filterWorker !== "All") query.set("workerName", filterWorker);

      const res = await fetch(`${API_BASE_URL}/attendance?${query.toString()}`, {
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error("Unable to load attendance records.");
      const data = await res.json();
      setAttendance(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Attendance load failed.");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, searchQuery, filterStatus, filterWorker]);

  // 3. Fetch workers list (for admin/manager/ceo dropdown)
  const fetchWorkers = useCallback(async () => {
    if (userRole === "worker") return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/workers`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const data = await res.json();
        setWorkers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load workers list:", err);
    }
  }, [userRole]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  // 4. Mark attendance (Check-In / Absent / Half Day)
  const submitAttendance = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");
    if (!selectedWorker) {
      setError("Please select a worker first.");
      return;
    }
    setActionLoading(true);

    try {
      const token = localStorage.getItem("token");
      const body = {
        workerName: selectedWorker,
        date: formDate,
        status: selectedStatus,
        notes,
        extraHours: 0,
      };

      const res = await fetch(`${API_BASE_URL}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to mark attendance.");
      }

      setSuccess("Attendance marked successfully!");
      setNotes("");
      fetchAttendance();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Check-Out trigger
  const handleCheckOut = async (record) => {
    setError("");
    setSuccess("");
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const body = {
        workerName: record.workerName,
        date: record.date,
        status: "checkout",
      };

      const res = await fetch(`${API_BASE_URL}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to check out.");
      }

      setSuccess("Checked out successfully!");
      fetchAttendance();
    } catch (err) {
      setError(err.message || "Check-out failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Delete Record (Admin/CEO only)
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/attendance/${id}`, {
        method: "DELETE",
        headers: { Authorization: token },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to delete record.");
      }
      setSuccess("Attendance record deleted.");
      fetchAttendance();
    } catch (err) {
      setError(err.message);
    }
  };

  // 7. Save Edited Record (Admin/CEO only)
  const saveEdit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/attendance/${editingRecord._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({
          status: editForm.status,
          checkIn: editForm.checkIn || null,
          checkOut: editForm.checkOut || null,
          notes: editForm.notes,
          extraHours: Number(editForm.extraHours || 0),
          empNo: editForm.empNo,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to update record.");
      }

      setSuccess("Attendance record updated successfully!");
      setEditingRecord(null);
      fetchAttendance();
    } catch (err) {
      setError(err.message);
    }
  };

  // Calculate statistics for today's records
  const stats = attendance.reduce(
    (acc, record) => {
      const statusLower = (record.status || "").toLowerCase();
      if (["present", "early", "on time", "late", "on-time"].includes(statusLower)) {
        acc.present += 1;
      } else if (statusLower === "absent") {
        acc.absent += 1;
      } else if (statusLower === "half-day" || statusLower === "half day") {
        acc.halfDay += 1;
      }
      acc.totalHours += record.totalHours || record.hoursWorked || 0;
      acc.totalPay += record.earnings || 0;
      return acc;
    },
    { present: 0, absent: 0, halfDay: 0, totalHours: 0, totalPay: 0 }
  );

  return (
    <div>
      <div className="page-header">
        <h1>Attendance Tracking</h1>
        <p>Real-time employee check-in, status check, and check-out management.</p>
      </div>

      {error && <div className="sp-alert sp-alert-danger">{error}</div>}
      {success && <div className="sp-alert sp-alert-success">{success}</div>}

      {/* Summary Cards */}
      <div className="sp-card-grid mb-5" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        <div className="sp-card sp-card-condensed" style={{ textAlign: "center" }}>
          <h2 style={{ color: "#16a34a", fontSize: "2rem", marginBottom: "4px" }}>{stats.present}</h2>
          <span className="text-muted text-xs uppercase font-bold tracking-wider">Present</span>
        </div>
        <div className="sp-card sp-card-condensed" style={{ textAlign: "center" }}>
          <h2 style={{ color: "#dc2626", fontSize: "2rem", marginBottom: "4px" }}>{stats.absent}</h2>
          <span className="text-muted text-xs uppercase font-bold tracking-wider">Absent</span>
        </div>
        <div className="sp-card sp-card-condensed" style={{ textAlign: "center" }}>
          <h2 style={{ color: "#d97706", fontSize: "2rem", marginBottom: "4px" }}>{stats.halfDay}</h2>
          <span className="text-muted text-xs uppercase font-bold tracking-wider">Half Day</span>
        </div>
        <div className="sp-card sp-card-condensed" style={{ textAlign: "center" }}>
          <h2 style={{ color: "#4f46e5", fontSize: "2rem", marginBottom: "4px" }}>{stats.totalHours.toFixed(1)}h</h2>
          <span className="text-muted text-xs uppercase font-bold tracking-wider">Total Hours</span>
        </div>
        <div className="sp-card sp-card-condensed" style={{ backgroundColor: "#10b981", color: "#fff", textAlign: "center" }}>
          <h2 style={{ fontSize: "2rem", marginBottom: "4px", fontWeight: "800" }}>₹{Math.round(stats.totalPay)}</h2>
          <span className="text-xs uppercase font-bold tracking-wider" style={{ color: "rgba(255,255,255,0.8)" }}>Total Pay</span>
        </div>
      </div>

      <div className="sp-card-grid mb-5" style={{ gridTemplateColumns: "1fr" }}>
        {/* Form Container */}
        <div className="sp-card">
          <div className="sp-card-header">
            <h3>✏️ Mark Attendance</h3>
          </div>
          <form onSubmit={submitAttendance}>
            <div className="sp-card-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
              <div className="sp-form-group">
                <label className="sp-label">Date</label>
                <input
                  type="date"
                  className="sp-input"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>

              <div className="sp-form-group">
                <label className="sp-label">Current Time</label>
                <input
                  type="text"
                  className="sp-input"
                  value={currentTime}
                  readOnly
                  style={{ backgroundColor: "#f1f5f9", fontWeight: "700" }}
                />
              </div>

              <div className="sp-form-group">
                <label className="sp-label">Worker *</label>
                {userRole === "worker" ? (
                  <input
                    type="text"
                    className="sp-input"
                    value={loggedInName}
                    readOnly
                    style={{ backgroundColor: "#f1f5f9" }}
                  />
                ) : (
                  <select
                    className="sp-select"
                    value={selectedWorker}
                    onChange={(e) => setSelectedWorker(e.target.value)}
                    required
                  >
                    <option value="">Select Worker</option>
                    {workers.map((w) => (
                      <option key={w._id} value={w.name}>
                        {w.name} ({w.role})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="sp-form-group">
                <label className="sp-label">Status *</label>
                <select
                  className="sp-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  required
                >
                  <option value="Present">Present (Auto Time check)</option>
                  <option value="Absent">Absent</option>
                  <option value="Half Day">Half Day</option>
                </select>
              </div>
            </div>

            <div className="sp-form-group mt-4">
              <label className="sp-label">Notes</label>
              <textarea
                className="sp-input"
                placeholder="Remarks..."
                rows="2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="mt-4">
              <button
                type="submit"
                className="sp-btn sp-btn-success"
                disabled={actionLoading}
                style={{ width: "100%", padding: "12px", fontSize: "1rem" }}
              >
                {actionLoading ? "Processing..." : "✅ Mark Attendance (Check-In)"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Records Table */}
      <div className="sp-card">
        <div className="sp-card-header" style={{ display: "block" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3>📅 Attendance Records ({fromDate} to {toDate})</h3>
            <button className="sp-btn sp-btn-primary sp-btn-sm" onClick={fetchAttendance} type="button">
              🔄 Refresh
            </button>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "8px" }}>
            <div className="sp-form-group" style={{ margin: 0 }}>
              <label className="sp-label" style={{ fontSize: "0.8rem" }}>Search Employee</label>
              <input
                type="text"
                placeholder="Name or Emp No..."
                className="sp-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="sp-form-group" style={{ margin: 0 }}>
              <label className="sp-label" style={{ fontSize: "0.8rem" }}>From Date</label>
              <input
                type="date"
                className="sp-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            
            <div className="sp-form-group" style={{ margin: 0 }}>
              <label className="sp-label" style={{ fontSize: "0.8rem" }}>To Date</label>
              <input
                type="date"
                className="sp-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <div className="sp-form-group" style={{ margin: 0 }}>
              <label className="sp-label" style={{ fontSize: "0.8rem" }}>Status</label>
              <select
                className="sp-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Half Day">Half Day</option>
                <option value="Paid Leave">Paid Leave</option>
                <option value="Leave">Leave</option>
              </select>
            </div>

            {userRole !== "worker" && (
              <div className="sp-form-group" style={{ margin: 0 }}>
                <label className="sp-label" style={{ fontSize: "0.8rem" }}>Employee / Manager</label>
                <select
                  className="sp-select"
                  value={filterWorker}
                  onChange={(e) => setFilterWorker(e.target.value)}
                >
                  <option value="All">All Staff</option>
                  {workers.map((w) => (
                    <option key={w._id} value={w.name}>
                      {w.name} ({w.role})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-muted p-4">Loading attendance records...</p>
        ) : attendance.length === 0 ? (
          <p className="text-muted p-4" style={{ textAlign: "center" }}>No records found for this date.</p>
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Status</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours</th>
                  <th>Rate</th>
                  <th>Earnings</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record) => {
                  const statusLower = (record.status || "").toLowerCase();
                  let badgeClass = "sp-badge-neutral";
                  if (statusLower === "early" || statusLower === "on time" || statusLower === "on-time" || statusLower === "present") {
                    badgeClass = "sp-badge-success";
                  } else if (statusLower === "late") {
                    badgeClass = "sp-badge-warning";
                  } else if (statusLower === "absent") {
                    badgeClass = "sp-badge-danger";
                  } else if (statusLower === "half-day" || statusLower === "half day") {
                    badgeClass = "sp-badge-primary";
                  }

                  return (
                    <tr key={record._id}>
                      <td>
                        <strong>{record.workerName}</strong>
                        <div className="text-xs text-muted">{record.workerRole?.toUpperCase()}</div>
                      </td>
                      <td>
                        <span className={`sp-badge ${badgeClass}`}>{record.status}</span>
                      </td>
                      <td>{record.checkIn || "—"}</td>
                      <td>{record.checkOut || "—"}</td>
                      <td>{record.hoursWorked ? `${record.hoursWorked.toFixed(2)}h` : "—"}</td>
                      <td>₹{record.salaryRate || 0}/{record.salaryType}</td>
                      <td>
                        <strong>₹{record.earnings ? Math.round(record.earnings) : 0}</strong>
                      </td>
                      <td style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {record.remarks || "—"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {/* Check Out button if check-in exists but no check-out */}
                          {record.checkIn && !record.checkOut && (
                            <button
                              type="button"
                              className="sp-btn sp-btn-success"
                              style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                              onClick={() => handleCheckOut(record)}
                              disabled={actionLoading}
                            >
                              Check Out
                            </button>
                          )}

                          {/* Edit and Delete action only for Admin & CEO */}
                          {isAdminOrCeo ? (
                            <>
                              <button
                                type="button"
                                className="sp-btn sp-btn-warning"
                                style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                                onClick={() => {
                                  setEditingRecord(record);
                                  setEditForm({
                                    status: record.status,
                                    checkIn: record.checkIn || "",
                                    checkOut: record.checkOut || "",
                                    extraHours: record.extraHours || 0,
                                    notes: record.remarks || "",
                                    empNo: record.empNo || "",
                                  });
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="sp-btn sp-btn-danger"
                                style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                                onClick={() => handleDelete(record._id)}
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <span className="text-muted text-xs">No edit rights</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Record Modal (Admin/CEO only) */}
      {editingRecord && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div className="sp-card" style={{ width: "500px", padding: "24px" }}>
            <div className="sp-card-header" style={{ marginBottom: "16px" }}>
              <h3>✏️ Edit Attendance: {editingRecord.workerName}</h3>
            </div>
            <form onSubmit={saveEdit}>
              <div className="sp-form-group">
                <label className="sp-label">Emp No</label>
                <input
                  type="text"
                  className="sp-input"
                  value={editForm.empNo}
                  onChange={(e) => setEditForm({ ...editForm, empNo: e.target.value })}
                />
              </div>

              <div className="sp-form-group">
                <label className="sp-label">Status</label>
                <select
                  className="sp-select"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="Present">Present</option>
                  <option value="Early">Early</option>
                  <option value="On Time">On Time</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Leave">Leave</option>
                </select>
              </div>

              <div className="sp-form-group">
                <label className="sp-label">Check In Time (HH:MM:SS)</label>
                <input
                  type="text"
                  className="sp-input"
                  placeholder="e.g. 08:45:00"
                  value={editForm.checkIn}
                  onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })}
                />
              </div>

              <div className="sp-form-group">
                <label className="sp-label">Check Out Time (HH:MM:SS)</label>
                <input
                  type="text"
                  className="sp-input"
                  placeholder="e.g. 17:00:00"
                  value={editForm.checkOut}
                  onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })}
                />
              </div>

              <div className="sp-form-group">
                <label className="sp-label">Extra Hours</label>
                <input
                  type="number"
                  step="0.1"
                  className="sp-input"
                  value={editForm.extraHours}
                  onChange={(e) => setEditForm({ ...editForm, extraHours: e.target.value })}
                />
              </div>

              <div className="sp-form-group">
                <label className="sp-label">Notes</label>
                <textarea
                  className="sp-input"
                  rows="2"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button type="submit" className="sp-btn sp-btn-success" style={{ flex: 1 }}>
                  Save Changes
                </button>
                <button
                  type="button"
                  className="sp-btn sp-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setEditingRecord(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Attendance;

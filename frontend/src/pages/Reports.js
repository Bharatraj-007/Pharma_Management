import { useEffect, useState, useCallback } from "react";
import API_BASE_URL from "../config";

function Reports() {
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");
  const isManager = ["admin", "manager", "ceo"].includes(role);
  const canEdit = ["admin", "ceo"].includes(role);
  const isCeo = role === "ceo";
  const isAdmin = role === "admin";

  const canEditRecord = (record) => {
    if (isCeo) return true;
    if (isAdmin) return (record.workerRole || "worker") !== "ceo";
    return false;
  };

  const [activeTab, setActiveTab] = useState("attendance");

  // Attendance state
  const [workers, setWorkers] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [exportFrom, setExportFrom] = useState(new Date().toISOString().split("T")[0]);
  const [exportTo, setExportTo] = useState(new Date().toISOString().split("T")[0]);
  const [filterWorker, setFilterWorker] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [markForm, setMarkForm] = useState({ workerName: "", status: "present", notes: "", extraHours: 0 });
  const [marking, setMarking] = useState(false);

  // Salary state
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [salaryEditing, setSalaryEditing] = useState(null); // id of staff being edited
  const [salaryForm, setSalaryForm] = useState({ salaryRate: 0, salaryType: "daily" });

  const headers = { "Content-Type": "application/json", Authorization: token };

  const fetchWorkers = useCallback(async () => {
    if (!isManager) return;
    try {
      const res = await fetch(`${API_BASE_URL}/workers`, { headers: { Authorization: token } });
      if (res.ok) setWorkers(await res.json());
    } catch (err) { console.error(err); }
  }, [isManager, token]);

  const fetchAttendance = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams();
      if (selectedDate) query.set("date", selectedDate);
      if (filterWorker) query.set("workerName", filterWorker);
      if (filterStatus) query.set("status", filterStatus);
      const res = await fetch(`${API_BASE_URL}/attendance?${query.toString()}`, { headers: { Authorization: token } });
      if (!res.ok) throw new Error("Failed to load");
      setRecords(await res.json());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [selectedDate, filterWorker, filterStatus, token]);

  const fetchStaff = useCallback(async () => {
    if (!canEdit) return;
    setStaffLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/staff`, { headers: { Authorization: token } });
      if (res.ok) setStaff(await res.json());
    } catch (err) { console.error(err); }
    finally { setStaffLoading(false); }
  }, [canEdit, token]);

  useEffect(() => { fetchWorkers(); fetchAttendance(); fetchStaff(); }, [fetchWorkers, fetchAttendance, fetchStaff]);

  const getCurrentTime = () => new Date().toLocaleTimeString("en-GB", { hour12: false });

  const markAttendance = async (e) => {
    e.preventDefault();
    if (!markForm.workerName) return alert("Select a worker");
    setMarking(true);
    try {
      const body = {
        workerName: markForm.workerName,
        date: selectedDate,
        status: markForm.status,
        notes: markForm.notes,
        extraHours: markForm.status === "od" ? Number(markForm.extraHours || 0) : 0
      };
      const res = await fetch(`${API_BASE_URL}/attendance`, { method: "POST", headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      alert(`✅ ${data.message}`);
      setMarkForm({ workerName: "", status: "present", notes: "", extraHours: 0 });
      fetchAttendance();
    } catch (err) { alert("❌ " + err.message); }
    finally { setMarking(false); }
  };

  const markCheckOut = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/${id}`, { method: "PUT", headers, body: JSON.stringify({ checkOut: getCurrentTime() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      alert("✅ Check-out marked — Earnings calculated!");
      fetchAttendance();
    } catch (err) { alert("❌ " + err.message); }
  };

  const deleteRecord = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/${id}`, { method: "DELETE", headers: { Authorization: token } });
      if (!res.ok) throw new Error("Failed");
      fetchAttendance();
    } catch (err) { alert("❌ " + err.message); }
  };

  const downloadReport = async (type) => {
    try {
      const query = new URLSearchParams();
      if (exportFrom) query.set("from", exportFrom);
      if (exportTo) query.set("to", exportTo);
      if (filterWorker) query.set("workerName", filterWorker);
      if (filterStatus) query.set("status", filterStatus);
      query.set("type", type);
      const res = await fetch(`${API_BASE_URL}/attendance/export?${query.toString()}`, {
        headers: { Authorization: token }
      });
      if (!res.ok) throw new Error("Report download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_report.${type}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("❌ " + err.message);
    }
  };

  const updateSalary = async (staffId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/staff/${staffId}/salary`, {
        method: "PUT", headers, body: JSON.stringify(salaryForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      alert("✅ Salary updated!");
      setSalaryEditing(null);
      fetchStaff();
    } catch (err) { alert("❌ " + err.message); }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case "present": return "sp-badge sp-badge-success";
      case "absent": return "sp-badge sp-badge-danger";
      case "half-day": return "sp-badge sp-badge-warning";
      case "late": return "sp-badge sp-badge-primary";
      default: return "sp-badge sp-badge-neutral";
    }
  };

  const presentCount = records.filter(r => r.status === "present" || r.status === "late").length;
  const absentCount = records.filter(r => r.status === "absent").length;
  const halfDayCount = records.filter(r => r.status === "half-day").length;
  const totalEarnings = records.reduce((sum, r) => sum + (r.earnings || 0), 0);
  const totalHours = records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1>📈 Reports</h1>
        <p>Attendance, salary & analytics</p>
      </div>

      <div className="sp-tabs">
        <button className={`sp-tab${activeTab === "attendance" ? " active" : ""}`} onClick={() => setActiveTab("attendance")}>📋 Attendance</button>
        {canEdit && <button className={`sp-tab${activeTab === "salary" ? " active" : ""}`} onClick={() => setActiveTab("salary")}>💰 Salary Management</button>}
        <button className={`sp-tab${activeTab === "production" ? " active" : ""}`} onClick={() => setActiveTab("production")}>📊 Production</button>
      </div>

      {/* ========== ATTENDANCE TAB ========== */}
      {activeTab === "attendance" && (
        <div className="animate-fade">
          {/* Summary Cards */}
          <div className="flex gap-4 flex-wrap mb-5">
            <div className="sp-card" style={{ flex: "1 1 120px", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-success)" }}>{presentCount}</div>
              <p className="text-sm" style={{ margin: 0 }}>Present</p>
            </div>
            <div className="sp-card" style={{ flex: "1 1 120px", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-danger)" }}>{absentCount}</div>
              <p className="text-sm" style={{ margin: 0 }}>Absent</p>
            </div>
            <div className="sp-card" style={{ flex: "1 1 120px", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-warning)" }}>{halfDayCount}</div>
              <p className="text-sm" style={{ margin: 0 }}>Half Day</p>
            </div>
            <div className="sp-card" style={{ flex: "1 1 120px", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-primary)" }}>{totalHours.toFixed(1)}h</div>
              <p className="text-sm" style={{ margin: 0 }}>Total Hours</p>
            </div>
            <div className="sp-card" style={{ flex: "1 1 120px", textAlign: "center", background: "linear-gradient(135deg, var(--color-success), #059669)", color: "#fff", border: "none" }}>
              <div style={{ fontSize: "2rem", fontWeight: 800 }}>₹{totalEarnings.toFixed(0)}</div>
              <p className="text-sm" style={{ margin: 0, opacity: 0.9 }}>Total Pay</p>
            </div>
          </div>

          {/* Mark Attendance */}
          {isManager && (
            <div className="sp-card mb-5">
              <h3 className="mb-4">✏️ Mark Attendance</h3>
              <form onSubmit={markAttendance}>
                <div className="sp-form-row">
                  <div className="sp-form-group">
                    <label className="sp-label">Date</label>
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="sp-input" />
                  </div>
                  <div className="sp-form-group">
                    <label className="sp-label">Current Time</label>
                    <input type="text" value={getCurrentTime()} readOnly className="sp-input" style={{ background: "var(--color-surface-alt)", fontFamily: "monospace", fontWeight: 600 }} />
                  </div>
                </div>
                <div className="sp-form-row">
                  <div className="sp-form-group">
                    <label className="sp-label">Worker *</label>
                    <select value={markForm.workerName} onChange={e => setMarkForm({ ...markForm, workerName: e.target.value })} className="sp-select" required>
                      <option value="">Select Worker</option>
                      {workers.map(w => <option key={w._id} value={w.name}>{w.employeeNo ? `${w.employeeNo} - ` : ""}{w.name} ({w.role})</option>)}
                    </select>
                  </div>
                  <div className="sp-form-group">
                    <label className="sp-label">Status *</label>
                    <select value={markForm.status} onChange={e => setMarkForm({ ...markForm, status: e.target.value })} className="sp-select">
                      <option value="present">✅ Present</option>
                      <option value="absent">❌ Absent</option>
                      <option value="half-day">⏰ Half Day</option>
                      <option value="od">📄 OD</option>
                      <option value="wfh">🏠 WFH</option>
                      <option value="late">🕐 Late</option>
                    </select>
                  </div>
                </div>
                <div className="sp-form-group">
                  <label className="sp-label">Notes</label>
                  <input type="text" placeholder="Remarks..." value={markForm.notes} onChange={e => setMarkForm({ ...markForm, notes: e.target.value })} className="sp-input" />
                </div>
                <button type="submit" disabled={marking} className="sp-btn sp-btn-success sp-btn-lg sp-btn-block">
                  {marking ? "⏳ Marking..." : "✅ Mark Attendance (Check-In)"}
                </button>
              </form>
            </div>
          )}

          {/* Attendance Table */}
          <div className="sp-card mb-5">
            <div className="sp-card-header">
              <div>
                <h3>📅 Attendance — {selectedDate}</h3>
                <div className="text-sm text-muted">Filter by worker, status, or date range before exporting.</div>
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="sp-input" style={{ width: "auto" }} />
                <select value={filterWorker} onChange={e => setFilterWorker(e.target.value)} className="sp-select" style={{ width: 220 }}>
                  <option value="">All workers</option>
                  {workers.map(w => <option key={w._id} value={w.name}>{w.employeeNo ? `${w.employeeNo} - ` : ""}{w.name}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="sp-select" style={{ width: 160 }}>
                  <option value="">All statuses</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="half-day">Half-day</option>
                  <option value="od">OD</option>
                  <option value="wfh">WFH</option>
                  <option value="late">Late</option>
                </select>
                <button onClick={fetchAttendance} className="sp-btn sp-btn-primary sp-btn-sm">Refresh</button>
              </div>
            </div>
            <div className="sp-card-body" style={{ paddingTop: 0, marginTop: 10 }}>
              <div className="flex gap-2 items-center flex-wrap">
                <label className="sp-label" style={{ margin: 0 }}>Export range</label>
                <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)} className="sp-input" style={{ width: 170 }} />
                <span>to</span>
                <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)} className="sp-input" style={{ width: 170 }} />
                <button className="sp-btn sp-btn-secondary sp-btn-sm" onClick={() => downloadReport("xlsx")}>Download Excel</button>
                <button className="sp-btn sp-btn-secondary sp-btn-sm" onClick={() => downloadReport("pdf")}>Download PDF</button>
              </div>
            </div>

            {loading && <p className="text-muted animate-pulse">Loading...</p>}
            {error && <div className="sp-alert sp-alert-error">{error}</div>}

            {!loading && !error && (
              <div className="sp-table-wrap">
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th>Emp No</th>
                      <th>Worker</th>
                      <th>Status</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Hours</th>
                      <th>Rate</th>
                      <th>Earnings</th>
                      <th>Notes</th>
                      {canEdit && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {records.length === 0 ? (
                      <tr><td className="empty-cell" colSpan={canEdit ? 9 : 8}>No records</td></tr>
                    ) : (
                      records.map(rec => (
                        <tr key={rec._id}>
                          <td>{rec.empNo || "—"}</td>
                          <td>
                            <strong>{rec.workerName}</strong>
                            {rec.workerRole && rec.workerRole !== "worker" && (
                              <span className="sp-badge sp-badge-neutral" style={{ marginLeft: 6 }}>{rec.workerRole}</span>
                            )}
                          </td>
                          <td><span className={getStatusBadge(rec.status)}>{rec.status}</span></td>
                          <td style={{ fontFamily: "monospace" }}>{rec.checkIn || "—"}</td>
                          <td style={{ fontFamily: "monospace" }}>{rec.checkOut || "—"}</td>
                          <td style={{ fontFamily: "monospace", fontWeight: 600 }}>
                            {rec.hoursWorked ? `${rec.hoursWorked}h` : "—"}
                          </td>
                          <td className="text-sm">
                            {rec.salaryRate > 0 ? (
                              <span>₹{rec.salaryRate}/{rec.salaryType === "hourly" ? "hr" : "day"}</span>
                            ) : "—"}
                          </td>
                          <td style={{ fontWeight: 700, color: rec.earnings > 0 ? "var(--color-success)" : "inherit" }}>
                            {rec.earnings > 0 ? `₹${rec.earnings.toFixed(0)}` : "—"}
                          </td>
                          <td className="text-sm">{rec.remarks || "—"}</td>
                          {canEdit && (
                            <td>
                              <div className="actions">
                                {canEditRecord(rec) && rec.checkIn && !rec.checkOut && rec.status !== "absent" && (
                                  <button className="sp-btn sp-btn-warning sp-btn-sm" onClick={() => markCheckOut(rec._id)}>Check Out</button>
                                )}
                                {canEditRecord(rec) && (
                                  <button className="sp-btn sp-btn-danger sp-btn-sm" onClick={() => deleteRecord(rec._id)}>Delete</button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== SALARY MANAGEMENT TAB ========== */}
      {activeTab === "salary" && canEdit && (
        <div className="animate-fade">
          <div className="sp-card mb-5">
            <div className="sp-card-header">
              <h3>💰 Set Salary Rates</h3>
              <button onClick={fetchStaff} className="sp-btn sp-btn-primary sp-btn-sm">Refresh</button>
            </div>
            <p className="text-sm text-muted mb-4">Set hourly or daily pay rates for each staff member. Earnings are auto-calculated on check-out.</p>

            {staffLoading ? (
              <p className="text-muted animate-pulse">Loading staff...</p>
            ) : (
              <div className="sp-table-wrap">
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Pay Type</th>
                      <th>Rate (₹)</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.length === 0 ? (
                      <tr><td className="empty-cell" colSpan="5">No staff</td></tr>
                    ) : (
                      staff.map(s => (
                        <tr key={s._id}>
                          <td><strong>{s.name}</strong></td>
                          <td><span className={getStatusBadge(s.role === "ceo" ? "absent" : s.role === "admin" ? "late" : s.role === "manager" ? "half-day" : "present")}>{s.role?.toUpperCase()}</span></td>
                          <td>
                            {salaryEditing === s._id ? (
                              <select value={salaryForm.salaryType} onChange={e => setSalaryForm({ ...salaryForm, salaryType: e.target.value })} className="sp-select" style={{ width: 120 }}>
                                <option value="daily">Per Day</option>
                                <option value="hourly">Per Hour</option>
                              </select>
                            ) : (
                              <span className="sp-badge sp-badge-neutral">{s.salaryType === "hourly" ? "Per Hour" : "Per Day"}</span>
                            )}
                          </td>
                          <td>
                            {salaryEditing === s._id ? (
                              <input type="number" value={salaryForm.salaryRate} onChange={e => setSalaryForm({ ...salaryForm, salaryRate: e.target.value })} className="sp-input" style={{ width: 120 }} min="0" step="1" />
                            ) : (
                              <span style={{ fontWeight: 700, fontSize: "var(--font-lg)" }}>
                                {s.salaryRate > 0 ? `₹${s.salaryRate}` : <span className="text-muted">Not set</span>}
                              </span>
                            )}
                          </td>
                          <td>
                            {salaryEditing === s._id ? (
                              <div className="flex gap-2">
                                <button className="sp-btn sp-btn-success sp-btn-sm" onClick={() => updateSalary(s._id)}>Save</button>
                                <button className="sp-btn sp-btn-secondary sp-btn-sm" onClick={() => setSalaryEditing(null)}>Cancel</button>
                              </div>
                            ) : (
                              <button className="sp-btn sp-btn-primary sp-btn-sm" onClick={() => { setSalaryEditing(s._id); setSalaryForm({ salaryRate: s.salaryRate || 0, salaryType: s.salaryType || "daily" }); }}>
                                ✏️ Set Rate
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="sp-card">
            <h3>📖 How Salary Calculation Works</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
              <div className="sp-card" style={{ background: "var(--color-surface-alt)" }}>
                <h4>💵 Per Day</h4>
                <ul className="text-sm" style={{ paddingLeft: 20 }}>
                  <li>≥ 8 hours worked → Full day pay</li>
                  <li>&lt; 4 hours worked → Half day pay</li>
                  <li>Absent → ₹0</li>
                </ul>
              </div>
              <div className="sp-card" style={{ background: "var(--color-surface-alt)" }}>
                <h4>⏱️ Per Hour</h4>
                <ul className="text-sm" style={{ paddingLeft: 20 }}>
                  <li>Pay = Hours Worked × Hourly Rate</li>
                  <li>Calculated on check-out</li>
                  <li>Absent → ₹0</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== PRODUCTION TAB ========== */}
      {activeTab === "production" && (
        <div className="flex gap-5 flex-wrap animate-fade">
          <div className="sp-card" style={{ flex: "1 1 200px" }}>
            <h3>📊 Daily Production</h3>
            <p className="mt-2">Track daily output metrics across all lines.</p>
          </div>
          <div className="sp-card" style={{ flex: "1 1 200px" }}>
            <h3>📦 Foil Usage</h3>
            <p className="mt-2">Monitor foil consumption per production batch.</p>
          </div>
          <div className="sp-card" style={{ flex: "1 1 200px" }}>
            <h3>🗑️ Waste Analysis</h3>
            <p className="mt-2">Track waste ratios and optimize material usage.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;

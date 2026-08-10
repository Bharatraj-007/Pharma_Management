import { useEffect, useState, useMemo } from "react";
import API_BASE_URL from "../config";

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company: 'bharath',
    product_name: '',
    foil_type: 'blister',
    size: '',
    required_kg: '',
    colourCount: '1',
    worker_name: ''
  });
  const [image, setImage] = useState(null);

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const isManager = ['admin', 'manager', 'ceo'].includes(role);
  const isAdminOrCeo = ['admin', 'ceo'].includes(role);

  const companies = [
    { value: 'bharath', label: 'Bharath Enterprises' },
    { value: 'shree_ganaapathy', label: 'Shree Ganaapathy Roto Prints' },
    { value: 'vel', label: 'Vel Gravure' }
  ];

  const [workers, setWorkers] = useState([]);
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState("All");

  useEffect(() => {
    fetchWorkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkerFilter]);

  const fetchWorkers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/workers`, {
        headers: { Authorization: token }
      });
      if (res.ok) {
        const data = await res.json();
        setWorkers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load workers:", err);
    }
  };

  const fetchTasks = async () => {
    try {
      let url = `${API_BASE_URL}/tasks`;
      if (selectedWorkerFilter && selectedWorkerFilter !== "All") {
        url += `?assignedTo=${selectedWorkerFilter}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: token }
      });
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const updateTask = async (taskId, updates) => {
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { Authorization: token },
        body: (() => {
          const fd = new FormData();
          if (updates.product_name !== undefined) fd.append('product_name', updates.product_name);
          if (updates.size !== undefined) fd.append('size', updates.size);
          if (updates.required_kg !== undefined) fd.append('required_kg', updates.required_kg);
          if (updates.colourCount !== undefined) fd.append('colourCount', updates.colourCount);
          return fd;
        })()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.details || data?.message || 'Update failed');
      fetchTasks();
    } catch (err) {
      alert(err.message);
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: token }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.details || data?.message || 'Delete failed');
      fetchTasks();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product_name || !formData.size || !formData.required_kg || !formData.colourCount || !formData.worker_name) {
      alert("Please fill all required fields (including Number of Colours and Worker name)");
      return;
    }
    setLoading(true);
    const data = new FormData();
    data.append('company', formData.company);
    data.append('product_name', formData.product_name);
    data.append('size', formData.size);
    data.append('required_kg', formData.required_kg);
    data.append('colourCount', formData.colourCount);
    data.append('foil_type', formData.foil_type);
    if (formData.worker_name) data.append('worker_name', formData.worker_name);
    if (image) data.append('image', image);

    try {
      const res = await fetch(`${API_BASE_URL}/tasks-create`, {
        method: 'POST',
        headers: { Authorization: token },
        body: data
      });
      if (res.ok) {
        alert("✅ Task created!");
        setFormData({ company: 'bharath', product_name: '', size: '', required_kg: '', colourCount: '1', foil_type: 'blister', worker_name: '' });
        setImage(null);
        fetchTasks();
        setShowForm(false);
      } else {
        let errText = "";
        try { errText = await res.text(); } catch (e) { /* ignore */ }
        alert(`Error creating task: ${errText || res.status}`);
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'completed') return 'sp-badge sp-badge-success';
    if (status === 'in-progress') return 'sp-badge sp-badge-primary';
    return 'sp-badge sp-badge-warning';
  };

  const getFoilUsageTotal = (task) =>
    (task.foilUsage || []).reduce((sum, entry) => sum + Number(entry.usedWeight || 0), 0);

  const renderFoilUsageSummary = (task) => {
    const usage = task.foilUsage || [];
    if (!usage.length) return null;
    const grouped = usage.reduce((acc, entry) => {
      const key = entry.colourNumber || 1;
      acc[key] = acc[key] || [];
      acc[key].push(entry);
      return acc;
    }, {});

    return (
      <div className="sp-completion-box mt-3">
        <h4>Foil Usage</h4>
        {Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).map((colour) => (
          <div key={colour} className="mb-2">
            <strong>Colour {colour}</strong>
            {grouped[colour].map((entry) => (
              <p key={entry._id || entry.foilQrPayload} className="text-sm" style={{ margin: "4px 0" }}>
                {entry.isSwap ? "Replacement roll" : "Initial roll"}: {entry.foilQrPayload || entry.foilId}
                {" | "}Start {Number(entry.startWeight || 0).toFixed(2)} KG
                {" | "}Used {Number(entry.usedWeight || 0).toFixed(2)} KG
                {" | "}Remaining {Number(entry.remainingWeight ?? entry.startWeight ?? 0).toFixed(2)} KG
              </p>
            ))}
          </div>
        ))}
        <p className="text-sm"><strong>Total Consumed:</strong> {getFoilUsageTotal(task).toFixed(2)} KG</p>
      </div>
    );
  };

  const startTaskWithFoils = async (task) => {
    const colourCount = Number(task.colourCount || 1);
    const foilScans = [];
    for (let colourNumber = 1; colourNumber <= colourCount; colourNumber += 1) {
      const qrPayload = prompt(`Scan foil for Colour ${colourNumber} of ${colourCount}`);
      if (qrPayload === null) return;
      if (!qrPayload.trim()) return alert(`Foil QR is required for Colour ${colourNumber}`);
      foilScans.push({ colourNumber, qrPayload: qrPayload.trim() });
    }

    try {
      const formData = new FormData();
      formData.append("foilScans", JSON.stringify(foilScans));
      const resp = await fetch(`${API_BASE_URL}/tasks/${task._id}/start`, {
        method: "POST",
        headers: { Authorization: token },
        body: formData
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || data?.error || "Failed to start task");
      alert(data?.message || "Task started");
      fetchTasks();
    } catch (e) {
      alert(e.message);
    }
  };

  const completeTaskWithFoilUsage = async (task) => {
    const usage = task.foilUsage || [];
    if (!usage.length) return alert("Start the task and scan foil rolls before completing it.");

    const foilUsage = [];
    for (const entry of usage) {
      const label = `Colour ${entry.colourNumber}${entry.isSwap ? " replacement" : ""}`;
      const usedWeight = prompt(`Enter foil used KG for ${label}\n${entry.foilQrPayload || ""}`);
      if (usedWeight === null) return;
      if (usedWeight === "" || Number(usedWeight) < 0) return alert("Used KG must be zero or greater");
      foilUsage.push({ usageId: entry._id, usedWeight: Number(usedWeight) });
    }

    const totalUsed = foilUsage.reduce((sum, entry) => sum + Number(entry.usedWeight || 0), 0);
    const wasteKg = prompt("Enter Waste KG:", String(task.waste_kg || 0));
    if (wasteKg === null) return;
    const remainingKg = prompt("Enter Remaining KG:", "0");
    if (remainingKg === null) return;

    try {
      const formData = new FormData();
      formData.append("foilUsage", JSON.stringify(foilUsage));
      formData.append("used_kg", totalUsed);
      formData.append("waste_kg", wasteKg || 0);
      formData.append("remaining_kg", remainingKg || 0);
      const resp = await fetch(`${API_BASE_URL}/tasks/${task._id}/consume`, {
        method: "POST",
        headers: { Authorization: token },
        body: formData
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || data?.error || "Failed to complete task");
      alert("Task completed successfully!");
      fetchTasks();
    } catch (e) {
      alert(e.message);
    }
  };

  const recordFoilSwap = async (task) => {
    const colourNumber = prompt(`Which colour needs a new foil roll? (1-${task.colourCount || 1})`);
    if (colourNumber === null) return;
    const foilQrPayload = prompt(`Scan new foil roll for Colour ${colourNumber}`);
    if (foilQrPayload === null) return;
    if (!foilQrPayload.trim()) return alert("New foil QR payload is required");

    try {
      const resp = await fetch(`${API_BASE_URL}/tasks/${task._id}/foil-swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ colourNumber, foil_qrPayload: foilQrPayload.trim(), reason: "Foil ran out" })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || data?.error || "Failed to record foil swap");
      alert(data?.message || "Foil swap recorded");
      fetchTasks();
    } catch (e) {
      alert(e.message);
    }
  };

  const { totalAssigned, totalCompleted, totalPending } = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "completed").length;
    const pending = total - completed;
    return { totalAssigned: total, totalCompleted: completed, totalPending: pending };
  }, [tasks]);

  return (
    <div>
      <div className="page-header">
        <h1>📋 Tasks</h1>
      </div>

      {/* Employee/Manager Filter Dropdown */}
      <div className="sp-card mb-5" style={{ background: "var(--color-surface-alt)", padding: "20px", borderRadius: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <label className="sp-label" style={{ margin: 0, fontWeight: 700 }}>🔍 Filter by Employee/Manager:</label>
          <select
            className="sp-select"
            value={selectedWorkerFilter}
            onChange={(e) => setSelectedWorkerFilter(e.target.value)}
            style={{ width: "auto", minWidth: "220px" }}
          >
            <option value="All">🌐 Show All Tasks</option>
            {workers.map((w) => (
              <option key={w._id} value={w._id}>
                👤 {w.name} ({w.role})
              </option>
            ))}
          </select>
        </div>

        {selectedWorkerFilter !== "All" && (
          <div className="sp-card-grid mt-4" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            <div className="sp-card" style={{ background: "#fff", textAlign: "center", padding: "16px", borderRadius: "6px" }}>
              <h2 style={{ margin: 0, color: "var(--color-primary)", fontSize: "2rem" }}>{totalAssigned}</h2>
              <span className="text-muted text-xs uppercase font-bold tracking-wider">Total Assigned</span>
            </div>
            <div className="sp-card" style={{ background: "#fff", textAlign: "center", padding: "16px", borderRadius: "6px" }}>
              <h2 style={{ margin: 0, color: "var(--color-success)", fontSize: "2rem" }}>{totalCompleted}</h2>
              <span className="text-muted text-xs uppercase font-bold tracking-wider">Tasks Completed</span>
            </div>
            <div className="sp-card" style={{ background: "#fff", textAlign: "center", padding: "16px", borderRadius: "6px" }}>
              <h2 style={{ margin: 0, color: "var(--color-warning)", fontSize: "2rem" }}>{totalPending}</h2>
              <span className="text-muted text-xs uppercase font-bold tracking-wider">Tasks Pending</span>
            </div>
          </div>
        )}
      </div>

      {isManager && (
        <div className="mb-5">
          <button
            onClick={() => setShowForm(!showForm)}
            className={`sp-btn ${showForm ? 'sp-btn-secondary' : 'sp-btn-success'}`}
          >
            {showForm ? "✖ Hide Form" : "➕ Create New Task"}
          </button>
        </div>
      )}

      {showForm && isManager && (
        <form onSubmit={handleSubmit} className="sp-card mb-5 animate-fade" encType="multipart/form-data">
          <h3 className="mb-4">New Task</h3>

          <div className="sp-form-group">
            <label className="sp-label">Company *</label>
            <select
              value={formData.company}
              onChange={(e) => setFormData({...formData, company: e.target.value})}
              className="sp-select"
            >
              {companies.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="sp-form-group">
            <label className="sp-label">Product Name *</label>
            <input
              required
              placeholder="e.g., Aspirin Blister Pack"
              value={formData.product_name}
              onChange={(e) => setFormData({...formData, product_name: e.target.value})}
              className="sp-input"
            />
          </div>

            <div className="sp-form-group">
              <label className="sp-label">Foil Type *</label>
            <select
              value={formData.foil_type}
              onChange={(e) => setFormData({ ...formData, foil_type: e.target.value })}
              className="sp-select"
            >
              <option value="blister">Blister</option>
              <option value="alualu">Alu-Alu</option>
              <option value="wrapper">Wrapper</option>
              <option value="pouch">Pouch</option>
              <option value="laminated">Laminated</option>
              <option value="roll">Roll</option>
            </select>
          </div>

          <div className="sp-form-row">
            <div className="sp-form-group">
              <label className="sp-label">Size *</label>
              <input
                required placeholder="e.g., 10x5 cm"
                value={formData.size}
                onChange={(e) => setFormData({...formData, size: e.target.value})}
                className="sp-input"
              />
            </div>
            <div className="sp-form-group">
              <label className="sp-label">Required KG *</label>
              <input
                required type="number" placeholder="e.g., 25"
                value={formData.required_kg}
                onChange={(e) => setFormData({...formData, required_kg: e.target.value})}
                className="sp-input"
              />
            </div>
          </div>

          <div className="sp-form-group">
            <label className="sp-label">Number of Colours *</label>
            <select
              required
              value={formData.colourCount}
              onChange={(e) => setFormData({ ...formData, colourCount: e.target.value })}
              className="sp-select"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
                <option key={count} value={count}>{count} Colour Job</option>
              ))}
            </select>
          </div>

          <div className="sp-form-group">
            <label className="sp-label">Worker Name *</label>
            <select
              required
              value={formData.worker_name}
              onChange={(e) => setFormData({ ...formData, worker_name: e.target.value })}
              className="sp-select"
            >
              <option value="" disabled>Select worker</option>
              {workers.map((w) => (
                <option key={w._id} value={w.name}>
                  {w.name} ({w.role})
                </option>
              ))}
              <option value={`Worker (${formData.company === 'shree_ganaapathy' ? 'shree' : formData.company})`}>
                Default Worker ({formData.company === 'shree_ganaapathy' ? 'shree' : formData.company})
              </option>
            </select>
          </div>

          <div className="sp-form-group">
            <label className="sp-label">Sample Image</label>
            <input
              type="file" accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
              className="sp-input"
            />
          </div>

          <button type="submit" disabled={loading} className="sp-btn sp-btn-success sp-btn-lg sp-btn-block">
            {loading ? "⏳ Creating..." : "✅ Create Task"}
          </button>
        </form>
      )}

      <div>
        <h2 className="mb-4">Task List ({tasks.length})</h2>
        {tasks.length === 0 ? (
          <p className="text-muted">{isManager ? "No tasks yet. Create one above!" : "No tasks. Check with manager."}</p>
        ) : (
          tasks.map(task => (
            <div key={task._id} className="sp-card mb-4 animate-fade">
              <div className="flex items-center justify-between mb-3">
                <h3>{task.product_name || 'Stock Task'}</h3>
                <span className={getStatusBadge(task.status)}>{task.status}</span>
              </div>

              {task.image_path && (
                <img
                  src={task.image_path.startsWith("http") ? task.image_path : `${API_BASE_URL}/${task.image_path}`}
                  alt="sample"
                  style={{ maxWidth: "150px", borderRadius: "8px", marginBottom: "12px" }}
                />
              )}

              <div className="flex flex-wrap gap-4 text-sm mb-3">
                <p><strong>Company:</strong> {task.company}</p>
                <p><strong>Size:</strong> {task.size}</p>
                <p><strong>Required:</strong> {task.required_kg} KG</p>
                <p><strong>Job Type:</strong> {task.colourCount || 1} Colour Job</p>
                {task.worker_name && <p><strong>Worker:</strong> {task.worker_name}</p>}
                {task.status === "completed" && task.completedAt && (
                  <p><strong>Completed At:</strong> {new Date(task.completedAt).toLocaleString("en-IN")}</p>
                )}
              </div>

              {renderFoilUsageSummary(task)}

              <div className="flex gap-2 flex-wrap mt-3">
                {isAdminOrCeo && (
                  <>
                    <button
                      type="button"
                      className="sp-btn sp-btn-warning sp-btn-sm"
                      onClick={() => {
                        const next = prompt('Update product name', task.product_name || '');
                        if (next === null) return;
                        updateTask(task._id, { product_name: next });
                      }}
                    >Edit</button>
                    <button
                      type="button"
                      className="sp-btn sp-btn-danger sp-btn-sm"
                      onClick={() => deleteTask(task._id)}
                    >Delete</button>
                  </>
                )}
                <button
                  type="button"
                  className="sp-btn sp-btn-primary sp-btn-sm"
                  onClick={() => startTaskWithFoils(task)}
                  disabled={task.status === 'in-progress' || task.status === 'completed'}
                >Start</button>
                {task.status === 'in-progress' && (
                  <button
                    type="button"
                    className="sp-btn sp-btn-warning sp-btn-sm"
                    onClick={() => recordFoilSwap(task)}
                  >Foil Ran Out</button>
                )}
                <button
                  type="button"
                  className="sp-btn sp-btn-success sp-btn-sm"
                  onClick={() => completeTaskWithFoilUsage(task)}
                  disabled={task.status === 'completed'}
                >Complete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Tasks;

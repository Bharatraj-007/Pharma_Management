import { useEffect, useState, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import API_BASE_URL from "../config";

function WorkerDashboard() {
  const [tasks, setTasks] = useState([]);
  const [scanningTaskId, setScanningTaskId] = useState(null);
  const [inputMode, setInputMode] = useState({}); // taskId -> 'manual' | 'scan'
  const [taskAlerts, setTaskAlerts] = useState({});
  const scannerRef = useRef(null);

  const loadTasks = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("role");
      const workerName =
        localStorage.getItem("worker_name") || localStorage.getItem("name");

      const res = await fetch(`${API_BASE_URL}/tasks`, {
        headers: { Authorization: token }
      });
      const data = await res.json();
      const allTasks = Array.isArray(data) ? data : [];

      if (role === "worker" && workerName) {
        setTasks(allTasks.filter((t) => t.worker_name === workerName));
      } else {
        setTasks(allTasks);
      }
    } catch (err) {
      console.log(err);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        // ignore
      }
      scannerRef.current = null;
    }
    setScanningTaskId(null);
  }, []);

  const startScanner = useCallback(async (taskId) => {
    // Stop any existing scanner first
    await stopScanner();

    const containerId = `qr-reader-${taskId}`;

    // Small delay to ensure DOM element is ready
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;
        setScanningTaskId(taskId);

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            // Successfully scanned — put the value in the input
            const qrInput = document.getElementById(`start-foil-qr-${taskId}`);
            if (qrInput) {
              qrInput.value = decodedText;
            }
            // Stop scanning after successful read
            stopScanner();
            setTaskAlert(taskId, 'success', `QR scanned: ${decodedText}`);
          },
          () => {
            // Ignore scan failures (no QR in frame)
          }
        );
      } catch (err) {
        console.error("Scanner error:", err);
        setTaskAlert(taskId, 'error', "Camera error: " + (err?.message || err));
        setScanningTaskId(null);
      }
    }, 300);
  }, [stopScanner]);

  const getInputMode = (taskId) => inputMode[taskId] || "manual";

  const setTaskInputMode = (taskId, mode) => {
    if (mode !== "scan") {
      stopScanner();
    }
    setInputMode(prev => ({ ...prev, [taskId]: mode }));
  };

  const setTaskAlert = (taskId, type, message) => {
    setTaskAlerts(prev => ({ ...prev, [taskId]: { type, message } }));
  };

  const clearTaskAlert = (taskId) => {
    setTaskAlerts(prev => {
      const { [taskId]: _, ...rest } = prev;
      return rest;
    });
  };

  const startTask = async (task) => {
    try {
      const taskId = task._id;
      const fileInput = document.getElementById(`start-foil-image-${taskId}`);
      const barcodeInput = document.getElementById(`start-foil-qr-${taskId}`);

      const file = fileInput?.files?.[0];
      const barcode = barcodeInput?.value;

      if (!file) return alert("Please upload foil image");

      // Stop scanner if running
      await stopScanner();

      const colourCount = Number(task.colourCount || 1);
      const foilScans = [];
      if (barcode?.trim()) {
        foilScans.push({ colourNumber: 1, qrPayload: barcode.trim() });
      }
      if (!foilScans.length && colourCount === 1 && task.assigned_foil_qrPayload) {
        foilScans.push({ colourNumber: 1, qrPayload: task.assigned_foil_qrPayload });
      }
      for (let colourNumber = 2; colourNumber <= colourCount; colourNumber += 1) {
        const qrPayload = prompt(`Scan foil for Colour ${colourNumber} of ${colourCount}`);
        if (qrPayload === null) return;
        if (!qrPayload.trim()) {
          setTaskAlert(taskId, 'error', `Foil QR is required for Colour ${colourNumber}`);
          return;
        }
        foilScans.push({ colourNumber, qrPayload: qrPayload.trim() });
      }

      const formData = new FormData();
      if (file) formData.append("foil_image", file);
      if (barcode?.trim()) formData.append("foil_qrPayload", barcode.trim());
      formData.append("foilScans", JSON.stringify(foilScans));

      const token = localStorage.getItem("token");
      const resp = await fetch(`${API_BASE_URL}/tasks/${taskId}/start`, {
        method: "POST",
        headers: { Authorization: token },
        body: formData
      });

      let errorMsg = "Failed to start task";
      if (!resp.ok) {
        try {
          const errData = await resp.json();
          errorMsg = errData.error || errData.message || errorMsg;
        } catch {
          const errText = await resp.text().catch(() => "");
          errorMsg = errText || `Error ${resp.status}`;
        }
        setTaskAlert(taskId, 'error', errorMsg);
        return;
      }

      setTaskAlert(taskId, 'success', 'Task started');
      await loadTasks();
    } catch (err) {
      console.error(err);
      setTaskAlert(taskId, 'error', "Failed to start task: " + err.message);
    }
  };

  const completeTask = async (task) => {
    try {
      const taskId = task._id;
      clearTaskAlert(taskId);
      const fileInput = document.getElementById(`waste-image-${taskId}`);
      const usedKgEl = document.getElementById(`used-kg-${taskId}`);
      const wasteKgEl = document.getElementById(`waste-kg-${taskId}`);
      const remainingKgEl = document.getElementById(`remaining-kg-${taskId}`);

      const file = fileInput?.files?.[0];
      const usedKg = usedKgEl?.value;
      const wasteKg = wasteKgEl?.value;
      const remainingKg = remainingKgEl?.value;

      const usage = task.foilUsage || [];
      if (!usage.length) {
        setTaskAlert(taskId, 'error', 'Start the task and scan foil rolls before completing it');
        return;
      }
      if (!usedKg || !wasteKg || !remainingKg) {
        setTaskAlert(taskId, 'error', 'Please fill used/waste/remaining KG');
        return;
      }

      const totalUsed = Number(usedKg);
      const defaultPerRoll = usage.length ? Number((totalUsed / usage.length).toFixed(3)) : 0;
      const foilUsage = [];
      for (const entry of usage) {
        const answer = prompt(
          `Enter foil used KG for Colour ${entry.colourNumber}${entry.isSwap ? " replacement" : ""}`,
          String(defaultPerRoll)
        );
        if (answer === null) return;
        if (answer === "" || Number(answer) < 0) {
          setTaskAlert(taskId, 'error', 'Used foil weight must be zero or greater');
          return;
        }
        foilUsage.push({ usageId: entry._id, usedWeight: Number(answer) });
      }

      const formData = new FormData();
      if (file) formData.append("waste_image", file);
      formData.append("used_kg", usedKg);
      formData.append("waste_kg", wasteKg);
      formData.append("remaining_kg", remainingKg);
      formData.append("foilUsage", JSON.stringify(foilUsage));

      const token = localStorage.getItem("token");
      const resp = await fetch(`${API_BASE_URL}/tasks/${taskId}/consume`, {
        method: "POST",
        headers: { Authorization: token },
        body: formData
      });

      let errorMsg = "Failed to complete task";
      if (!resp.ok) {
        try {
          const errData = await resp.json();
          errorMsg = errData.error || errData.message || errorMsg;
        } catch {
          const errText = await resp.text().catch(() => "");
          errorMsg = errText || `Error ${resp.status}`;
        }
        setTaskAlert(taskId, 'error', errorMsg);
        return;
      }

      setTaskAlert(taskId, 'success', 'Task completed');
      await loadTasks();
    } catch (err) {
      console.error(err);
      setTaskAlert(taskId, 'error', "Failed to complete task: " + err.message);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'completed') return 'sp-badge sp-badge-success';
    if (status === 'in-progress') return 'sp-badge sp-badge-primary';
    return 'sp-badge sp-badge-warning';
  };

  const renderFoilUsageSummary = (task) => {
    const usage = task.foilUsage || [];
    if (!usage.length) return null;
    const total = usage.reduce((sum, entry) => sum + Number(entry.usedWeight || 0), 0);
    return (
      <div className="sp-completion-box mb-3">
        <h4>Foil Usage</h4>
        {usage.map((entry) => (
          <p key={entry._id || entry.foilQrPayload} className="text-sm">
            <strong>Colour {entry.colourNumber}</strong>{entry.isSwap ? " replacement" : ""}: {entry.foilQrPayload}
            {" | "}Used {Number(entry.usedWeight || 0).toFixed(2)} KG
            {" | "}Remaining {Number(entry.remainingWeight ?? entry.startWeight ?? 0).toFixed(2)} KG
          </p>
        ))}
        <p className="text-sm"><strong>Total:</strong> {total.toFixed(2)} KG</p>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1>👷 Worker Dashboard</h1>
      </div>

      {tasks.length === 0 ? (
        <p className="text-muted">No tasks available</p>
      ) : (
        tasks.map((task) => (
          <div key={task._id} className="sp-card mb-4 animate-fade">
            <div className="flex items-center justify-between mb-3">
              <h3>{task.product_name}</h3>
              <span className={getStatusBadge(task.status)}>{task.status}</span>
            </div>

            <div className="flex flex-col gap-2 text-sm mb-3">
              <p><strong>Worker:</strong> {task.worker_name}</p>
              <p><strong>Foil:</strong> {task.foil_qrPayload}</p>
              <p><strong>Cylinder:</strong> {task.cylinder_barcode}</p>
              <p><strong>Company:</strong> {task.company}</p>
              <p><strong>Job Type:</strong> {task.colourCount || 1} Colour Job</p>
              {task.colors && <p><strong>Colors:</strong> {task.colors}</p>}
            </div>

            {renderFoilUsageSummary(task)}

            {task.status === 'completed' && (
              <div className="sp-completion-box">
                <h4>✅ Completion Details</h4>
                <p className="text-sm"><strong>Used Foil:</strong> {task.used_kg} KG</p>
                <p className="text-sm"><strong>Waste Foil:</strong> {task.waste_kg} KG</p>
                <p className="text-sm"><strong>Remaining Foil:</strong> {task.remaining_kg} KG</p>
              </div>
            )}

            {/* ===== FOIL INPUT SECTION (pending tasks only) ===== */}
            {taskAlerts[task._id] && (
              <div className={`sp-alert ${taskAlerts[task._id].type === 'success' ? 'sp-alert-success' : 'sp-alert-danger'} mb-3`}>
                {taskAlerts[task._id].message}
              </div>
            )}

            {task.status === 'pending' && Boolean(task.assigned_foil_qrPayload || task.foil_type || task.required_kg) && (
              <div className="sp-card mt-3 mb-3" style={{ background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-100)' }}>
                <label className="sp-label mb-3" style={{ fontSize: 'var(--font-md)' }}>
                  📋 Foil Details to Start Task
                </label>

                {/* Foil Image Upload */}
                <div className="sp-form-group">
                  <label className="sp-label">Foil Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sp-input"
                    id={`start-foil-image-${task._id}`}
                  />
                </div>

                {/* Input Mode Toggle */}
                <div className="sp-form-group">
                  <label className="sp-label">QR Payload</label>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      className={`sp-btn sp-btn-sm ${getInputMode(task._id) === 'manual' ? 'sp-btn-primary' : 'sp-btn-secondary'}`}
                      onClick={() => setTaskInputMode(task._id, 'manual')}
                    >
                      ✏️ Manual Entry
                    </button>
                    <button
                      type="button"
                      className={`sp-btn sp-btn-sm ${getInputMode(task._id) === 'scan' ? 'sp-btn-primary' : 'sp-btn-secondary'}`}
                      onClick={() => {
                        setTaskInputMode(task._id, 'scan');
                        startScanner(task._id);
                      }}
                    >
                      📷 Scan QR Code
                    </button>
                  </div>

                  {/* Manual Input */}
                  {getInputMode(task._id) === 'manual' && (
                    <input
                      type="text"
                      placeholder="Type or paste foil QR payload (e.g. qr:bharath|blister|100|50|1|1)"
                      id={`start-foil-qr-${task._id}`}
                      className="sp-input"
                    />
                  )}

                  {/* QR Scanner */}
                  {getInputMode(task._id) === 'scan' && (
                    <div className="animate-fade">
                      <div
                        id={`qr-reader-${task._id}`}
                        style={{
                          width: '100%',
                          maxWidth: 400,
                          margin: '0 auto',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          border: '2px solid var(--color-primary)',
                        }}
                      ></div>

                      {scanningTaskId === task._id && (
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-sm animate-pulse" style={{ color: 'var(--color-primary)', margin: 0 }}>
                            📸 Point camera at QR code...
                          </p>
                          <button
                            type="button"
                            className="sp-btn sp-btn-danger sp-btn-sm"
                            onClick={stopScanner}
                          >
                            ✖ Stop Camera
                          </button>
                        </div>
                      )}

                      {/* Hidden input to store scanned value */}
                      <input
                        type="hidden"
                        id={`start-foil-qr-${task._id}`}
                      />

                      {/* Show scanned result */}
                      {!scanningTaskId && document.getElementById(`start-foil-qr-${task._id}`)?.value && (
                        <div className="sp-alert sp-alert-success mt-3">
                          ✅ Scanned: <strong>{document.getElementById(`start-foil-qr-${task._id}`)?.value}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button
                className={`sp-btn sp-btn-sm ${task.status === 'pending' ? 'sp-btn-primary' : 'sp-btn-secondary'}`}
                onClick={() => startTask(task)}
                disabled={task.status === 'in-progress' || task.status === 'completed'}
              >
                {task.status === 'in-progress' ? 'Started' : task.status === 'completed' ? 'Completed' : '▶ Start Task'}
              </button>
              {task.status !== 'completed' && (
                <button
                  className="sp-btn sp-btn-success sp-btn-sm"
                  onClick={() => document.getElementById(`waste-${task._id}`)?.scrollIntoView({ behavior: "smooth" })}
                >
                  Complete
                </button>
              )}
            </div>

            {task.status !== 'completed' && (
              <div id={`waste-${task._id}`} className="flex flex-col gap-3 mt-4">
                <input type="file" accept="image/*,application/pdf" className="sp-input" id={`waste-image-${task._id}`} />
                <div className="sp-form-row">
                  <input type="number" placeholder="Used KG" step="0.01" min="0" id={`used-kg-${task._id}`} className="sp-input" />
                  <input type="number" placeholder="Waste KG" step="0.01" min="0" id={`waste-kg-${task._id}`} className="sp-input" />
                </div>
                <input type="number" placeholder="Remaining KG" step="0.01" min="0" id={`remaining-kg-${task._id}`} className="sp-input" />
                <button className="sp-btn sp-btn-success sp-btn-block" onClick={() => completeTask(task)}>
                  Submit Waste & Complete
                </button>
              </div>
            )}

            {task.image_path && (
              <iframe
                src={`${API_BASE_URL}/${task.image_path}`}

                width="100%"
                height="300px"
                title="PDF"
                style={{ marginTop: '12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}
              ></iframe>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default WorkerDashboard;

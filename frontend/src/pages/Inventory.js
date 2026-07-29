import { useCallback, useEffect, useState } from "react";
import Barcode from "react-barcode";
import API_BASE_URL from "../config";

function Stock() {
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const company = localStorage.getItem("company") || "bharath";
  const companyName =
    localStorage.getItem("companyName") ||
    {
      bharath: "Bharath Enterprises",
      shree_ganaapathy: "Shree Ganaapathy Roto Prints",
      vel: "Vel Gravure"
    }[company] ||
    "Bharath Enterprises";

  const companyConfig = {
    bharath: {
      hasMaterial: true,
      materialLabel: "Foil",
      materialTypeLabel: "Foil Type",
      materialOptions: [
        { value: "blister", label: "Blister" },
        { value: "alualu", label: "Alu-Alu" }
      ],
      cylinderLabel: "Cylinder"
    },
    shree_ganaapathy: {
      hasMaterial: true,
      materialLabel: "Plastic",
      materialTypeLabel: "Plastic Type",
      materialOptions: [
        { value: "wrapper", label: "Wrapper Cover" },
        { value: "pouch", label: "Pouch" },
        { value: "laminated", label: "Laminated Roll" },
        { value: "roll", label: "Plastic Roll" }
      ],
      cylinderLabel: "Plastic Cylinder"
    },
    vel: {
      hasMaterial: false,
      materialLabel: "Foil",
      materialTypeLabel: "Foil Type",
      materialOptions: [],
      cylinderLabel: "Cylinder"
    }
  };

  const inventoryConfig = companyConfig[company] || companyConfig.bharath;
  const [activeTab, setActiveTab] = useState(inventoryConfig.hasMaterial ? "foil" : "cylinder");

  // ✅ Role-based access control (frontend safety; backend is authoritative)
  const allowedRoles = ["ceo", "admin", "manager"];
  const isAuthorized = allowedRoles.includes(role);
  const canViewLogs = allowedRoles.includes(role);

  // ========== FOIL STATE ==========
  const [foilType, setFoilType] = useState(inventoryConfig.materialOptions[0]?.value || "");
  const [foilSize, setFoilSize] = useState("");
  const [foilWeight, setFoilWeight] = useState("");
  // generatedQr is no longer used directly; UI rendering uses lastFoilLabel?.qrPayload

  const [showLabel, setShowLabel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastFoilLabel, setLastFoilLabel] = useState(null);
  const [qrImageError, setQrImageError] = useState("");
  const [previewFoil, setPreviewFoil] = useState(null); // for viewing/printing existing foil labels
  const [successMessage, setSuccessMessage] = useState("");
  const [editFoilData, setEditFoilData] = useState(null);
  const [showEditFoilModal, setShowEditFoilModal] = useState(false);
  const [editCylinderData, setEditCylinderData] = useState(null);
  const [showEditCylinderModal, setShowEditCylinderModal] = useState(false);

  const getTodayDateStr = () => new Date().toISOString().split('T')[0];
  const getYesterdayDateStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  // ========== CYLINDER STATE (barcode-based UI retained) ==========
  const [cylinderClientCompany, setCylinderClientCompany] = useState("");
  const [cylinderProduct, setCylinderProduct] = useState("");
  const [cylinderColors, setCylinderColors] = useState("");
  const [cylinderSize, setCylinderSize] = useState("");
  const [cylinderManufacturer, setCylinderManufacturer] = useState(company === "vel" ? "Vel Gravure" : "");
  const [cylinderDate, setCylinderDate] = useState("");
  const [cylinderBarcode, setCylinderBarcode] = useState("");
  const [showCylinderLabel, setShowCylinderLabel] = useState(false);
  const [cylinderLoading, setCylinderLoading] = useState(false);
  const [lastCylinderLabel, setLastCylinderLabel] = useState(null);

  // ========== STOCK LIST STATE ==========
  const [foils, setFoils] = useState([]);
  const [cylinders, setCylinders] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [foilFilter, setFoilFilter] = useState("all");
  const [cylinderFilter, setCylinderFilter] = useState("all");
  const [stockLogs, setStockLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: localStorage.getItem("token")
  };

  useEffect(() => {
    if (!inventoryConfig.hasMaterial && activeTab === "foil") {
      setActiveTab("cylinder");
    }
  }, [activeTab, inventoryConfig.hasMaterial]);

  const fetchStockLogs = useCallback(async () => {
    if (!canViewLogs) return;

    setLogsLoading(true);
    setLogsError("");

    try {
      const response = await fetch(`${API_BASE_URL}/stock-logs`, {
        headers: { Authorization: localStorage.getItem("token") }
      });

      if (!response.ok) throw new Error("Unable to load stock change logs");
      const data = await response.json();
      setStockLogs(data);
    } catch (err) {
      setLogsError(err.message);
    } finally {
      setLogsLoading(false);
    }
  }, [canViewLogs]);

  const fetchStock = useCallback(async () => {
    setStockLoading(true);
    setStockError("");

    try {
      const [foilResponse, cylinderResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/foils`, {
          headers: { Authorization: localStorage.getItem("token") }
        }),
        fetch(`${API_BASE_URL}/cylinders`, {
          headers: { Authorization: localStorage.getItem("token") }
        })
      ]);

      if (!foilResponse.ok || !cylinderResponse.ok) {
        throw new Error("Unable to load stock list");
      }

      const [foilData, cylinderData] = await Promise.all([foilResponse.json(), cylinderResponse.json()]);
      setFoils(foilData);
      setCylinders(cylinderData);
      fetchStockLogs();
    } catch (err) {
      setStockError(err.message);
    } finally {
      setStockLoading(false);
    }
  }, [fetchStockLogs]);

  useEffect(() => {
    if (isAuthorized) {
      fetchStock();
      fetchStockLogs();
    }
  }, [fetchStock, fetchStockLogs, isAuthorized]);

  const normalize = (value) => String(value || "").toLowerCase();
  const currentSearch = normalize(searchTerm);
  const getMaterialTypeLabel = (value) =>
    inventoryConfig.materialOptions.find((option) => option.value === value)?.label || value;

  const filteredFoils = foils.filter((foil) => {
    const matchesFilter = foilFilter === "all" || foil.type === foilFilter;
    const searchableText = [foil.type, foil.size, foil.weight, foil.qrPayload]
      .map(normalize)
      .join(" ");
    return matchesFilter && searchableText.includes(currentSearch);
  });

  const filteredCylinders = cylinders.filter((cylinder) => {
    const matchesFilter =
      cylinderFilter === "all" ||
      (cylinderFilter === "one-four" && Number(cylinder.colors) >= 1 && Number(cylinder.colors) <= 4) ||
      (cylinderFilter === "five-eight" && Number(cylinder.colors) >= 5 && Number(cylinder.colors) <= 8) ||
      (cylinderFilter === "nine-plus" && Number(cylinder.colors) >= 9);

    const searchableText = [
      cylinder.product_name,
      cylinder.colors,
      cylinder.size_inches,
      cylinder.manufacturer,
      cylinder.barcode
    ]
      .map(normalize)
      .join(" ");

    return matchesFilter && searchableText.includes(currentSearch);
  });

  const addFoil = async () => {
    setQrImageError("");

    if (!inventoryConfig.hasMaterial) {
      alert(`${companyName} uses cylinder stock only`);
      return;
    }

    if (!foilType || !foilSize || !foilWeight) {
      alert("❌ Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/add-foil`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          type: foilType,
          size: foilSize,
          weight: Number(foilWeight)
        })
      });

      if (!response.ok) {
        alert("❌ Error adding foil");
        return;
      }

      const data = await response.json();

      const qrPayload = data.qrPayload || data.foil?.qrPayload || "";

      setLastFoilLabel(
        data.foil || {
          type: foilType,
          size: foilSize,
          weight: Number(foilWeight),
          qrPayload,
          version: data.foil?.version || 1,
          serial: data.foil?.serial || "1",
          company: companyName
        }
      );

      setSuccessMessage("QR Created Successfully.");
      setShowLabel(true);
      fetchStock();

      // Reset form
      setFoilSize("");
      setFoilWeight("");
      setFoilType(inventoryConfig.materialOptions[0]?.value || "");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    // Print even if QR image fails to load.

    // Ensure the QR <img> finishes loading before printing,
    // otherwise the print dialog may start with a blank QR.
    const labelEl = document.getElementById("printLabel");
    const cylinderEl = document.getElementById("printCylinderLabel");

    // If neither label is present, just print.
    if (!labelEl && !cylinderEl) {
      window.print();
      return;
    }

    const container = labelEl || cylinderEl;
    const img = container?.querySelector("img");

    if (!img) {
      window.print();
      return;
    }

    // If already loaded, print immediately.
    if (img.complete && img.naturalWidth > 0) {
      window.print();
      return;
    }

    await new Promise((resolve) => {
      const done = () => resolve();
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });

      // Safety timeout in case server is slow/unreachable.
      setTimeout(done, 3000);
    });

    window.print();
  };

  const foilPreviewData = previewFoil || lastFoilLabel;

  const editFoil = (foil) => {
    setEditFoilData({
      ...foil,
      type: foil.type || "",
      size: foil.size || "",
      weight: foil.weight || ""
    });
    setShowEditFoilModal(true);
    setSuccessMessage("");
  };

  const saveFoilEdit = async () => {
    if (!editFoilData) return;
    const { _id, type, size, weight } = editFoilData;
    if (!type || !size || !weight) {
      alert("Please fill all foil fields.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/foils/${_id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          type: type.trim(),
          size: size.trim(),
          weight: Number(weight)
        })
      });

      if (!response.ok) throw new Error(await response.text());
      setShowEditFoilModal(false);
      setEditFoilData(null);
      setSuccessMessage("Foil updated successfully.");
      fetchStock();
    } catch (err) {
      alert("Error updating foil: " + err.message);
    }
  };

  const deleteFoil = async (foil) => {
    const label = foil.qrPayload || foil.barcode || "this foil";
    if (!window.confirm(`Are you sure you want to delete ${label}?`)) return;

    try {
      const response = await fetch(`${API_BASE_URL}/foils/${foil._id}`, {
        method: "DELETE",
        headers: { Authorization: localStorage.getItem("token") }
      });

      if (!response.ok) throw new Error(await response.text());
      setSuccessMessage("Foil deleted successfully.");
      fetchStock();
    } catch (err) {
      alert("Error deleting foil: " + err.message);
    }
  };

  // ========== CYLINDER FUNCTION ==========
  const addCylinder = async () => {
    if (!cylinderProduct || !cylinderColors || !cylinderSize || !cylinderManufacturer || !cylinderDate) {
      alert("❌ Please fill all required cylinder fields");
      return;
    }

    setCylinderLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/add-cylinder`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          client_company: cylinderClientCompany || (company === "vel" ? "Printing Client" : companyName),
          product_name: cylinderProduct,
          colors: Number(cylinderColors),
          size_inches: Number(cylinderSize),
          manufacturer: cylinderManufacturer,
          manufacture_date: cylinderDate
        })
      });

      if (!response.ok) {
        alert("❌ Error adding cylinder");
        return;
      }

      const data = await response.json();
      setCylinderBarcode(data.barcode);
      setLastCylinderLabel(
        data.cylinder || {
          client_company: cylinderClientCompany || "Printing Client",
          product_name: cylinderProduct,
          colors: Number(cylinderColors),
          size_inches: Number(cylinderSize),
          manufacturer: cylinderManufacturer,
          manufacture_date: cylinderDate,
          barcode: data.barcode,
          company: companyName
        }
      );

      setSuccessMessage("Barcode Generated.");
      setShowCylinderLabel(true);
      fetchStock();

      setCylinderClientCompany("");
      setCylinderProduct("");
      setCylinderColors("");
      setCylinderSize("");
      setCylinderManufacturer(company === "vel" ? "Vel Gravure" : "");
      setCylinderDate("");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setCylinderLoading(false);
    }
  };

  const editCylinder = (cylinder) => {
    setEditCylinderData({
      ...cylinder,
      product_name: cylinder.product_name || "",
      colors: cylinder.colors || "",
      size_inches: cylinder.size_inches || "",
      manufacturer: cylinder.manufacturer || "",
      manufacture_date: cylinder.manufacture_date ? new Date(cylinder.manufacture_date).toISOString().split('T')[0] : ""
    });
    setShowEditCylinderModal(true);
    setSuccessMessage("");
  };

  const saveCylinderEdit = async () => {
    if (!editCylinderData) return;
    const { _id, product_name, colors, size_inches, manufacturer, manufacture_date } = editCylinderData;

    try {
      const response = await fetch(`${API_BASE_URL}/cylinders/${_id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          product_name: product_name.trim(),
          colors: Number(colors),
          size_inches: Number(size_inches),
          manufacturer: manufacturer.trim(),
          manufacture_date
        })
      });

      if (!response.ok) throw new Error(await response.text());
      setShowEditCylinderModal(false);
      setEditCylinderData(null);
      setSuccessMessage("Cylinder updated successfully.");
      fetchStock();
    } catch (err) {
      alert("Error updating cylinder: " + err.message);
    }
  };

  const deleteCylinder = async (cylinder) => {
    if (!window.confirm(`Are you sure you want to delete this item?`)) return;

    try {
      const response = await fetch(`${API_BASE_URL}/cylinders/${cylinder._id}`, {
        method: "DELETE",
        headers: { Authorization: localStorage.getItem("token") }
      });

      if (!response.ok) throw new Error(await response.text());
      setSuccessMessage("Cylinder deleted successfully.");
      fetchStock();
    } catch (err) {
      alert("Error deleting cylinder: " + err.message);
    }
  };

  return (
    <div style={containerStyle}>
      <div className="page-header"><h1>📦 Stock Management</h1></div>

      {/* 🔐 ACCESS CONTROL */}
      {!isAuthorized && (
        <div className="sp-access-denied">
          <h2>🚫 Access Denied</h2>
          <p>You do not have permission to access this page.</p>
          <p>
            Only <strong>Admin and Manager</strong> can manage stock.
          </p>
          <p>Your role: <strong>{role?.toUpperCase() || "Unknown"}</strong></p>
        </div>
      )}

      {isAuthorized && (
        <>
          <div className="sp-tabs">
            {company === "bharath" && (
              <button className={`sp-tab${activeTab === "foil" ? " active" : ""}`} onClick={() => setActiveTab("foil")}>
                🔶 Foil Stock
              </button>
            )}
            {company === "shree_ganaapathy" && (
              <button className={`sp-tab${activeTab === "foil" ? " active" : ""}`} onClick={() => setActiveTab("foil")}>
                Plastic Stock
              </button>
            )}
            {company !== "shree_ganaapathy" && (
              <button className={`sp-tab${activeTab === "cylinder" ? " active" : ""}`} onClick={() => setActiveTab("cylinder")}>
                🔷 Cylinder Stock
              </button>
            )}
            {company === "shree_ganaapathy" && (
              <button className={`sp-tab${activeTab === "cylinder" ? " active" : ""}`} onClick={() => setActiveTab("cylinder")}>
                Plastic Cylinder Stock
              </button>
            )}
          </div>

          {/* ========== FOIL TAB ========== */}
          {successMessage && (
            <div className="sp-alert sp-alert-success" style={{ marginBottom: 20 }}>
              {successMessage}
            </div>
          )}

          {showEditFoilModal && editFoilData && (
            <div style={modalBackdropStyle}>
              <div style={modalStyle}>
                <h3>Edit {inventoryConfig.materialLabel} Stock</h3>
                <div className="sp-form-group">
                  <label className="sp-label">{inventoryConfig.materialTypeLabel}</label>
                  <select
                    value={editFoilData.type}
                    onChange={(e) => setEditFoilData({ ...editFoilData, type: e.target.value })}
                    className="sp-select"
                  >
                    <option value="">Select Type</option>
                    {inventoryConfig.materialOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sp-form-group">
                  <label className="sp-label">Size</label>
                  <input
                    className="sp-input"
                    value={editFoilData.size}
                    onChange={(e) => setEditFoilData({ ...editFoilData, size: e.target.value })}
                  />
                </div>
                <div className="sp-form-group">
                  <label className="sp-label">Weight</label>
                  <input
                    className="sp-input"
                    type="number"
                    value={editFoilData.weight}
                    onChange={(e) => setEditFoilData({ ...editFoilData, weight: e.target.value })}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button className="sp-btn sp-btn-secondary" onClick={() => setShowEditFoilModal(false)}>
                    Cancel
                  </button>
                  <button className="sp-btn sp-btn-primary" onClick={saveFoilEdit}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {showEditCylinderModal && editCylinderData && (
            <div style={modalBackdropStyle}>
              <div style={modalStyle}>
                <h3>Edit {inventoryConfig.cylinderLabel} Stock</h3>
                <div className="sp-form-group">
                  <label className="sp-label">Product Name</label>
                  <input
                    className="sp-input"
                    value={editCylinderData.product_name}
                    onChange={(e) => setEditCylinderData({ ...editCylinderData, product_name: e.target.value })}
                  />
                </div>
                <div className="sp-form-group">
                  <label className="sp-label">Colors</label>
                  <input
                    className="sp-input"
                    type="number"
                    value={editCylinderData.colors}
                    onChange={(e) => setEditCylinderData({ ...editCylinderData, colors: e.target.value })}
                  />
                </div>
                <div className="sp-form-group">
                  <label className="sp-label">Size (inches)</label>
                  <input
                    className="sp-input"
                    type="number"
                    value={editCylinderData.size_inches}
                    onChange={(e) => setEditCylinderData({ ...editCylinderData, size_inches: e.target.value })}
                  />
                </div>
                <div className="sp-form-group">
                  <label className="sp-label">Manufacturer</label>
                  <input
                    className="sp-input"
                    value={editCylinderData.manufacturer}
                    onChange={(e) => setEditCylinderData({ ...editCylinderData, manufacturer: e.target.value })}
                  />
                </div>
                <div className="sp-form-group">
                  <label className="sp-label">Manufacture Date</label>
                  <input
                    type="date"
                    className="sp-input"
                    value={editCylinderData.manufacture_date || ""}
                    onChange={(e) => setEditCylinderData({ ...editCylinderData, manufacture_date: e.target.value })}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button className="sp-btn sp-btn-secondary" onClick={() => setShowEditCylinderModal(false)}>
                    Cancel
                  </button>
                  <button className="sp-btn sp-btn-primary" onClick={saveCylinderEdit}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {inventoryConfig.hasMaterial && activeTab === "foil" && (
            <>
              <div className="sp-card mb-5">
                <h3>➕ Add New Foil Stock</h3>

                {company === "shree_ganaapathy" && <h3>Add New Plastic Stock</h3>}

                <div className="sp-form-group">
                  <label className="sp-label">{inventoryConfig.materialTypeLabel} *</label>
                  <select value={foilType} onChange={(e) => setFoilType(e.target.value)} className="sp-select">
                    <option value="">Select Type</option>
                    {inventoryConfig.materialOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sp-form-group">
                  <label className="sp-label">Size (e.g., 10cm, 20cm) *</label>
                  <input
                    placeholder="e.g., 10cm"
                    value={foilSize}
                    onChange={(e) => setFoilSize(e.target.value)}
                    className="sp-input"
                  />
                </div>

                <div className="sp-form-group">
                  <label className="sp-label">Weight (kg) *</label>
                  <input
                    placeholder="e.g., 25"
                    type="number"
                    value={foilWeight}
                    onChange={(e) => setFoilWeight(e.target.value)}
                    className="sp-input"
                  />
                </div>

                <button onClick={addFoil} className="sp-btn sp-btn-success sp-btn-lg sp-btn-block" disabled={loading}>
                  {loading ? "⏳ Adding..." : "➕ Add Foil"}
                </button>
              </div>

              {/* Label preview — shown after adding OR when clicking Print on a table row */}
              {((showLabel && lastFoilLabel) || previewFoil) && (
                <div className="sp-label-preview animate-fade">
                  <div className="sp-label-box" id="printLabel">
                    <div style={labelHeaderStyle}>
                      <h2 style={{ margin: "0", fontSize: "24px" }}>FOIL LABEL</h2>
                    </div>

                    <div style={labelContentStyle}>
                      <div className="sp-label-row">
                        <span className="sp-label-key">Type:</span>
                        <span className="sp-label-value">{foilPreviewData?.type?.toUpperCase()}</span>
                      </div>

                      <div className="sp-label-row">
                        <span className="sp-label-key">Size:</span>
                        <span className="sp-label-value">{foilPreviewData?.size}</span>
                      </div>

                      <div className="sp-label-row">
                        <span className="sp-label-key">Weight:</span>
                        <span className="sp-label-value">{foilPreviewData?.weight} KG</span>
                      </div>

                      <div className="sp-label-row">
                        <span className="sp-label-key">Version:</span>
                        <span className="sp-label-value">V{foilPreviewData?.version ?? 1}</span>
                      </div>

                      <div className="sp-label-row">
                        <span className="sp-label-key">Serial:</span>
                        <span className="sp-label-value">{foilPreviewData?.serial}</span>
                      </div>

                      <div className="sp-label-row">
                        <span className="sp-label-key">Company:</span>
                        <span className="sp-label-value">{foilPreviewData?.company || companyName}</span>
                      </div>

                      <hr style={hrStyle} />

                      <div style={barcodeDisplayStyle}>
                        <h3 style={{ margin: "5px 0", fontSize: "14px", fontFamily: "monospace" }}>
                          {foilPreviewData?.qrPayload}
                        </h3>
                      </div>

                      <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
                        <img
                          alt="QR"
                          style={{ width: 180, height: 180 }}
                          src={
                            foilPreviewData?.qrPayload
                              ? `${API_BASE_URL}/qrs/foil/${encodeURIComponent(foilPreviewData?.qrPayload)}/label`
                              : undefined
                          }
                          onError={() => setQrImageError("Failed to load QR. Check backend /qrs route and payload.")}
                        />
                        {qrImageError && (
                          <div style={{ color: "#c62828", fontSize: "12px", marginTop: "6px" }}>
                            {qrImageError}
                          </div>
                        )}
                      </div>

                      <div style={timestampStyle}>
                        Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div className="sp-btn-group">
                    <button onClick={handlePrint} className="sp-btn sp-btn-primary">
                      🖨️ Print Label
                    </button>
                    <button
                      onClick={() => {
                        setShowLabel(false);
                        setPreviewFoil(null);
                        setQrImageError("");
                      }}
                      className="sp-btn sp-btn-danger"
                    >
                      ✖️ Close
                    </button>
                  </div>
                </div>
              )}

              <div className="sp-card mb-5">
                <div className="sp-card-header">
                  <h3>Already Added {inventoryConfig.materialLabel} Stock</h3>
                  <button type="button" onClick={fetchStock} className="sp-btn sp-btn-primary sp-btn-sm">
                    Refresh
                  </button>
                </div>

                <div className="sp-filter-row">
                  <input
                    placeholder={`Search ${inventoryConfig.materialLabel.toLowerCase()} by type, size, weight, or QR`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="sp-input"
                  />
                  <select value={foilFilter} onChange={(e) => setFoilFilter(e.target.value)} className="sp-select">
                    <option value="all">All {inventoryConfig.materialLabel.toLowerCase()} types</option>
                    {inventoryConfig.materialOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {stockLoading && <p className="text-muted animate-pulse">Loading stock...</p>}
                {stockError && <div className="sp-alert sp-alert-error">{stockError}</div>}

                {!stockLoading && !stockError && (
                  <div className="sp-table-wrap">
                    <table className="sp-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Size</th>
                          <th>Weight</th>
                          <th>QR</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFoils.length === 0 ? (
                          <tr>
                            <td className="empty-cell" colSpan="5">
                              No {inventoryConfig.materialLabel.toLowerCase()} stock found
                            </td>
                          </tr>
                        ) : (
                          filteredFoils.map((foil) => (
                            <tr key={foil._id || foil.qrPayload}>
                              <td>{getMaterialTypeLabel(foil.type)}</td>
                              <td>{foil.size}</td>
                              <td>{foil.weight} kg</td>
                              <td>
                                {foil.qrPayload ? (
                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                    <img
                                      alt="QR"
                                      style={{ width: 60, height: 60, borderRadius: 4, border: "1px solid var(--color-border)" }}
                                      src={`${API_BASE_URL}/qrs/foil/${encodeURIComponent(foil.qrPayload)}/label`}

                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                    <span className="text-xs text-muted" style={{ wordBreak: "break-all", maxWidth: 100, textAlign: "center" }}>
                                      {foil.qrPayload}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted">—</span>
                                )}
                              </td>
                              <td>
                                <div className="actions">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreviewFoil(foil);
                                      setShowLabel(false);
                                      setQrImageError("");
                                    }}
                                    className="sp-btn sp-btn-primary sp-btn-sm"
                                    title="View & Print Label"
                                  >
                                    🖨️ Print
                                  </button>
                                  <button type="button" onClick={() => editFoil(foil)} className="sp-btn sp-btn-warning sp-btn-sm">
                                    Edit
                                  </button>
                                  <button type="button" onClick={() => deleteFoil(foil)} className="sp-btn sp-btn-danger sp-btn-sm">
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ========== CYLINDER TAB ========== */}
          {activeTab === "cylinder" && (
            <div className="sp-card mb-5">
              <h3>➕ Add New Cylinder Stock</h3>
              {company !== "bharath" && <h3>Add New {inventoryConfig.cylinderLabel} Stock</h3>}

              <div className="sp-form-group">
                <label className="sp-label">{company === "vel" ? "Printing / Client Company Name *" : "Client / Pharma Company Name"}</label>
                <input
                  placeholder={company === "vel" ? "e.g., Bharath Enterprises / Shree Ganaapathy" : "e.g., Sun Pharma"}
                  value={cylinderClientCompany}
                  onChange={(e) => setCylinderClientCompany(e.target.value)}
                  className="sp-input"
                />
              </div>

              <div className="sp-form-group">
                <label className="sp-label">Product Name *</label>
                <input
                  placeholder="e.g., Aspirin Blister"
                  value={cylinderProduct}
                  onChange={(e) => setCylinderProduct(e.target.value)}
                  className="sp-input"
                />
              </div>

              <div className="sp-form-group">
                <label className="sp-label">Number of Colors *</label>
                <input placeholder="e.g., 4" type="number" value={cylinderColors} onChange={(e) => setCylinderColors(e.target.value)} className="sp-input" />
              </div>

              <div className="sp-form-group">
                <label className="sp-label">Cylinder Size (inches) *</label>
                <input placeholder="e.g., 10" type="number" value={cylinderSize} onChange={(e) => setCylinderSize(e.target.value)} className="sp-input" />
              </div>

              <div className="sp-form-group">
                <label className="sp-label">Manufacturer *</label>
                <input placeholder="e.g., Vel Gravure" value={cylinderManufacturer} onChange={(e) => setCylinderManufacturer(e.target.value)} className="sp-input" />
              </div>

              <div className="sp-form-group">
                <label className="sp-label">Manufacture Date *</label>
                <input type="date" value={cylinderDate} onKeyDown={(e) => e.preventDefault()} onChange={(e) => setCylinderDate(e.target.value)} className="sp-input" style={{ cursor: "pointer" }} />
              </div>

              <button onClick={addCylinder} className="sp-btn sp-btn-success sp-btn-lg sp-btn-block" disabled={cylinderLoading}>
                {cylinderLoading ? "⏳ Adding..." : "➕ Add Cylinder"}
              </button>

              {showCylinderLabel && lastCylinderLabel && (
                <div className="sp-label-preview animate-fade">
                  <div className="sp-label-box" id="printCylinderLabel">
                    <div style={labelHeaderStyle}>
                      <h2 style={{ margin: "0", fontSize: "24px" }}>{inventoryConfig.cylinderLabel.toUpperCase()} LABEL</h2>
                    </div>
                    <div style={labelContentStyle}>
                      <div className="sp-label-row"><span className="sp-label-key">Client Company:</span><span className="sp-label-value">{lastCylinderLabel.client_company || lastCylinderLabel.company || companyName}</span></div>
                      <div className="sp-label-row"><span className="sp-label-key">Product:</span><span className="sp-label-value">{lastCylinderLabel.product_name}</span></div>
                      <div className="sp-label-row"><span className="sp-label-key">Colors:</span><span className="sp-label-value">{lastCylinderLabel.colors}</span></div>
                      <div className="sp-label-row"><span className="sp-label-key">Cylinder Size:</span><span className="sp-label-value">{lastCylinderLabel.size_inches} IN</span></div>
                      <div className="sp-label-row"><span className="sp-label-key">Manufacturer:</span><span className="sp-label-value">{lastCylinderLabel.manufacturer}</span></div>
                      <div className="sp-label-row"><span className="sp-label-key">Manufacture Date:</span><span className="sp-label-value">{lastCylinderLabel.manufacture_date ? new Date(lastCylinderLabel.manufacture_date).toLocaleDateString() : "—"}</span></div>
                      <hr style={hrStyle} />
                      <div style={barcodeDisplayStyle}>
                        <Barcode value={lastCylinderLabel.barcode || cylinderBarcode} format="code128" width={2} height={80} displayValue={false} />
                      </div>
                      <div style={{ marginTop: 10, fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap" }}>
                        {lastCylinderLabel.barcode || cylinderBarcode}
                      </div>
                      <div style={timestampStyle}>
                        Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="sp-btn-group">
                    <button onClick={handlePrint} className="sp-btn sp-btn-primary">🖨️ Print Label</button>
                    <button onClick={() => setShowCylinderLabel(false)} className="sp-btn sp-btn-danger">✖️ Close</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cylinder list */}
          {activeTab === "cylinder" && (
            <div className="sp-card mb-5">
              <div className="sp-card-header">
                <h3>Already Added {inventoryConfig.cylinderLabel} Stock</h3>
                <button type="button" onClick={fetchStock} className="sp-btn sp-btn-primary sp-btn-sm">Refresh</button>
              </div>
              <div className="sp-filter-row">
                <input placeholder="Search cylinder by product, colors, size, manufacturer, or barcode" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="sp-input" />
                <select value={cylinderFilter} onChange={(e) => setCylinderFilter(e.target.value)} className="sp-select">
                  <option value="all">All color counts</option>
                  <option value="one-four">1 to 4 colors</option>
                  <option value="five-eight">5 to 8 colors</option>
                  <option value="nine-plus">9+ colors</option>
                </select>
              </div>
              {stockLoading && <p className="text-muted animate-pulse">Loading stock...</p>}
              {stockError && <div className="sp-alert sp-alert-error">{stockError}</div>}

              {!stockLoading && !stockError && (
                <div className="sp-table-wrap">
                  <table className="sp-table">
                    <thead>
                      <tr>
                        <th>Client Company</th>
                        <th>Product Name</th>
                        <th>Colors</th>
                        <th>Cylinder Size</th>
                        <th>Manufacturer</th>
                        <th>Barcode</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCylinders.length === 0 ? (
                        <tr>
                          <td className="empty-cell" colSpan="7">No cylinder stock found</td>
                        </tr>
                      ) : (
                        filteredCylinders.map((cylinder) => (
                          <tr key={cylinder._id || cylinder.barcode}>
                            <td><strong>{cylinder.client_company || cylinder.company || "Printing Client"}</strong></td>
                            <td>{cylinder.product_name}</td>
                            <td>{cylinder.colors}</td>
                            <td>{cylinder.size_inches} IN</td>
                            <td>{cylinder.manufacturer}</td>
                            <td><code>{cylinder.barcode}</code></td>
                            <td>
                              <div className="actions">
                                <button type="button" onClick={() => editCylinder(cylinder)} className="sp-btn sp-btn-warning sp-btn-sm">
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLastCylinderLabel(cylinder);
                                    setShowCylinderLabel(true);
                                  }}
                                  className="sp-btn sp-btn-primary sp-btn-sm"
                                >
                                  🖨️ Print
                                </button>
                                <button type="button" onClick={() => deleteCylinder(cylinder)} className="sp-btn sp-btn-danger sp-btn-sm">
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {canViewLogs && (
            <div className="sp-card">
              <div className="sp-card-header">
                <h3>Stock Edit/Delete Logs</h3>
                <button type="button" onClick={fetchStockLogs} className="sp-btn sp-btn-primary sp-btn-sm">Refresh Logs</button>
              </div>
              {logsLoading && <p className="text-muted animate-pulse">Loading logs...</p>}
              {logsError && <div className="sp-alert sp-alert-error">{logsError}</div>}
              {!logsLoading && !logsError && (
                <div className="sp-table-wrap">
                  <table className="sp-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Action</th>
                        <th>Stock</th>
                        <th>Barcode</th>
                        <th>Changed By</th>
                        <th>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockLogs.length === 0 ? (
                        <tr><td className="empty-cell" colSpan="6">No stock changes yet</td></tr>
                      ) : (
                        stockLogs.map((log) => (
                          <tr key={log._id}>
                            <td>{new Date(log.createdAt).toLocaleString()}</td>
                            <td><span className="sp-badge sp-badge-primary">{log.action}</span></td>
                            <td>{log.itemType}</td>
                            <td>{log.barcode || log.qrPayload || "—"}</td>
                            <td>{log.changedBy || "—"}</td>
                            <td><span className="sp-badge sp-badge-neutral">{log.changedByRole || "—"}</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ========== STYLE CONSTANTS (only for print label internals) ==========
const containerStyle = { maxWidth: "800px", margin: "0 auto" };
const labelHeaderStyle = { borderBottom: "2px solid #000", paddingBottom: "10px", marginBottom: "10px" };
const labelContentStyle = { padding: "10px 0" };
const hrStyle = { border: "none", borderTop: "2px solid #000", margin: "10px 0" };
const barcodeDisplayStyle = { padding: "15px", background: "var(--color-surface-alt)", borderRadius: "6px", margin: "10px 0", border: "1px solid var(--color-border)" };
const modalBackdropStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000
};

const modalStyle = {
  background: "#fff",
  borderRadius: "10px",
  padding: "24px",
  width: "100%",
  maxWidth: "500px",
  boxShadow: "0 20px 45px rgba(0,0,0,0.15)",
  position: "relative"
};

const timestampStyle = { fontSize: "11px", color: "var(--color-text-muted)", marginTop: "10px", borderTop: "1px dotted var(--color-border)", paddingTop: "10px" };

export default Stock;

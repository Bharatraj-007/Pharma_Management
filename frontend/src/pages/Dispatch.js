import React, { useState, useEffect, useCallback } from "react";
import API_BASE_URL from "../config";
import * as XLSX from "xlsx";

function Dispatch() {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");
  const userCompany = localStorage.getItem("company") || "bharath";
  const activeCompanyOverride = localStorage.getItem("activeCompany");

  // Determine actual active company for queries
  const activeCompany = (userRole === 'ceo' && activeCompanyOverride)
    ? activeCompanyOverride
    : userCompany;

  // Active view tab: 'form' or 'report'
  const [activeTab, setActiveTab] = useState("form");

  // Dispatch Form State
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [destinationType, setDestinationType] = useState("external");
  const [destinationCompany, setDestinationCompany] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("A1 Transport");
  const [customDeliveryMethod, setCustomDeliveryMethod] = useState("");
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState({ type: "", text: "" });

  // Cylinder-specific fields (Company 3 / Vel)
  const [numberOfColors, setNumberOfColors] = useState("");
  const [size, setSize] = useState("");
  const [manufacturer, setManufacturer] = useState("Vel Gravure");

  // Foil-specific fields (Company 1 / Bharath)
  const [colors, setColors] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [dimensions, setDimensions] = useState("");

  // Roll-specific fields (Company 2 / Shree Ganaapathy)
  const [rollColors, setRollColors] = useState("");
  const [rollWeightKg, setRollWeightKg] = useState("");
  const [rollSize, setRollSize] = useState("");

  // Report Filter & Data State
  const [filterCompany, setFilterCompany] = useState(activeCompany || "all");
  const [filterMode, setFilterMode] = useState("single"); // 'single' or 'range'
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split("T")[0]);
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Determine current effective company type: 'cylinder' (vel), 'roll' (shree), or 'foil' (bharath)
  const currentCompany = activeCompany === "all" ? "bharath" : activeCompany;
  const productType = (currentCompany === "vel" || currentCompany === "company3")
    ? "cylinder"
    : (currentCompany === "shree_ganaapathy" || currentCompany === "company2")
    ? "roll"
    : "foil";

  // Product Master list state & quick modal state
  const [productList, setProductList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdSize, setNewProdSize] = useState("");
  const [newProdWeight, setNewProdWeight] = useState("");
  const [newProdColors, setNewProdColors] = useState("1");
  const [addingProduct, setAddingProduct] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products?company=${currentCompany}&limit=100`, {
        headers: { Authorization: token }
      });
      if (res.ok) {
        const data = await res.json();
        setProductList(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, [token, currentCompany]);

  const [clientCompanies, setClientCompanies] = useState([]);
  const [destMode, setDestMode] = useState("predefined"); // 'predefined' | 'manual'

  useEffect(() => {
    const fetchClientCompanies = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/client-companies`, {
          headers: { Authorization: token }
        });
        if (res.ok) {
          const data = await res.json();
          setClientCompanies(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("Error fetching client companies:", e);
      }
    };
    if (token) fetchClientCompanies();
  }, [token]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSelectProduct = (prodId) => {
    setSelectedProductId(prodId);
    if (!prodId) return;
    const prod = productList.find(p => p._id === prodId);
    if (prod) {
      setProductName(prod.productName);
      if (productType === "cylinder") {
        setSize(prod.size || "");
        setNumberOfColors(String(prod.numberOfColors || 1));
      } else if (productType === "roll") {
        setRollSize(prod.size || "");
        setRollWeightKg(String(prod.weightKg || ""));
        setRollColors(`${prod.numberOfColors || 1} Colors`);
      } else {
        setDimensions(prod.size || "");
        setWeightKg(String(prod.weightKg || ""));
        setColors(`${prod.numberOfColors || 1} Colors`);
      }
    }
  };

  const handleCreateProductInline = async (e) => {
    e.preventDefault();
    if (!newProdName) return;
    setAddingProduct(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token
        },
        body: JSON.stringify({
          company: currentCompany,
          productName: newProdName,
          size: newProdSize,
          weightKg: newProdWeight ? Number(newProdWeight) : 0,
          numberOfColors: newProdColors ? Number(newProdColors) : 1
        })
      });
      if (res.ok) {
        const data = await res.json();
        setShowAddProductModal(false);
        setNewProdName("");
        setNewProdSize("");
        setNewProdWeight("");
        fetchProducts();
        if (data.product) {
          handleSelectProduct(data.product._id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingProduct(false);
    }
  };

  // Fetch Report Data
  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    try {
      let fromQuery = fromDate;
      let toQuery = toDate;
      if (filterMode === "single") {
        fromQuery = singleDate;
        toQuery = singleDate;
      }

      const queryParams = new URLSearchParams();
      if (filterCompany) queryParams.append("company", filterCompany);
      if (fromQuery) queryParams.append("from", fromQuery);
      if (toQuery) queryParams.append("to", toQuery);

      const res = await fetch(`${API_BASE_URL}/api/dispatch/report?${queryParams.toString()}`, {
        headers: { Authorization: token }
      });
      if (!res.ok) throw new Error("Failed to load dispatch report");
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setReportLoading(false);
    }
  }, [token, filterCompany, filterMode, singleDate, fromDate, toDate]);

  useEffect(() => {
    fetchReport();
    const handleCompanyChange = () => fetchReport();
    window.addEventListener("companyChanged", handleCompanyChange);
    return () => window.removeEventListener("companyChanged", handleCompanyChange);
  }, [fetchReport]);

  // Submit Dispatch Record
  const handleSubmitDispatch = async (e) => {
    e.preventDefault();
    if (!productName || !quantity || !destinationCompany || !deliveryMethod) {
      setFormMsg({ type: "error", text: "Please fill all required fields." });
      return;
    }

    setSubmitting(true);
    setFormMsg({ type: "", text: "" });

    try {
      const payload = {
        company: currentCompany,
        productType,
        productName,
        quantity: Number(quantity),
        destinationType,
        destinationCompany,
        deliveryMethod,
        customDeliveryMethod: deliveryMethod === "Other" ? customDeliveryMethod : "",
        dispatchDate,
        remarks,
        // Product-specific
        numberOfColors: numberOfColors ? Number(numberOfColors) : undefined,
        size,
        manufacturer: currentCompany === "vel" ? (manufacturer || "Vel Gravure") : undefined,
        colors: colors ? colors.split(",").map(c => c.trim()) : [],
        weightKg: weightKg ? Number(weightKg) : undefined,
        dimensions,
        rollColors: rollColors ? rollColors.split(",").map(c => c.trim()) : [],
        rollWeightKg: rollWeightKg ? Number(rollWeightKg) : undefined,
        rollSize
      };

      const res = await fetch(`${API_BASE_URL}/api/dispatch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit dispatch");

      setFormMsg({ type: "success", text: "✅ Dispatch recorded successfully!" });
      // Reset form
      setProductName("");
      setQuantity("");
      setDestinationCompany("");
      setRemarks("");
      setNumberOfColors("");
      setSize("");
      setColors("");
      setWeightKg("");
      setDimensions("");
      setRollColors("");
      setRollWeightKg("");
      setRollSize("");
      fetchReport();
    } catch (err) {
      setFormMsg({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Export Excel Client-side using SheetJS
  const exportExcel = () => {
    if (!reportData || !reportData.items) return;
    const items = reportData.items;

    const formattedData = items.map((item, idx) => ({
      "S.No": idx + 1,
      "Product Name": item.productName,
      "Colors": Array.isArray(item.colors) && item.colors.length ? item.colors.join(", ")
        : Array.isArray(item.rollColors) && item.rollColors.length ? item.rollColors.join(", ")
        : (item.numberOfColors ? `${item.numberOfColors} colors` : "-"),
      "Spec 1 (Weight/Size)": item.productType === "cylinder" ? (item.size ? `${item.size} IN` : "-")
        : item.productType === "roll" ? (item.rollWeightKg ? `${item.rollWeightKg} kg` : "-")
        : (item.weightKg ? `${item.weightKg} kg` : "-"),
      "Spec 2 (Manufacturer/Dimensions/RollSize)": item.productType === "cylinder" ? (item.manufacturer || "Vel Gravure")
        : item.productType === "roll" ? (item.rollSize || "-")
        : (item.dimensions || "-"),
      "Quantity": item.quantity,
      "Destination": item.destinationCompany,
      "Delivery Method": item.deliveryMethod === "Other" ? (item.customDeliveryMethod || "Other") : item.deliveryMethod,
      "Status": item.status,
      "Dispatch Date": new Date(item.dispatchDate).toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dispatch Report");
    XLSX.writeFile(wb, `Dispatch_Report_${filterCompany}_${filterMode === 'single' ? singleDate : fromDate + '_to_' + toDate}.xlsx`);
  };

  // Export / Print PDF Client-side
  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="sp-page-container animate-fade">
      <div className="sp-page-header">
        <div>
          <h1>🚚 Dispatch & Delivery System</h1>
          <p className="sp-subtitle">Record dispatches and view daily bill-style delivery reports</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className={`sp-btn ${activeTab === "form" ? "sp-btn-primary" : "sp-btn-neutral"}`}
            onClick={() => setActiveTab("form")}
          >
            ➕ New Dispatch
          </button>
          <button
            className={`sp-btn ${activeTab === "report" ? "sp-btn-primary" : "sp-btn-neutral"}`}
            onClick={() => setActiveTab("report")}
          >
            📄 Dispatch Bill / Report
          </button>
        </div>
      </div>

      {/* ── 1. DYNAMIC DISPATCH FORM ── */}
      {activeTab === "form" && (
        <div className="sp-card" style={{ maxWidth: "800px", margin: "0 auto", padding: "24px" }}>
          <div style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "12px", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, color: "var(--color-primary)" }}>
              {productType === "cylinder" ? "🏢 Company 3 — Cylinder Manufacturing Dispatch"
                : productType === "roll" ? "🏢 Company 2 — Roll (Commercial Printing) Dispatch"
                : "🏢 Company 1 — Foil (Pharma Printing) Dispatch"}
            </h3>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: "4px 0 0 0" }}>
              Product Type: <strong>{productType.toUpperCase()}</strong>
            </p>
          </div>

          {formMsg.text && (
            <div style={{
              padding: "12px",
              borderRadius: "6px",
              marginBottom: "16px",
              backgroundColor: formMsg.type === "success" ? "#dcfce7" : "#fee2e2",
              color: formMsg.type === "success" ? "#166534" : "#991b1b",
              fontWeight: "600"
            }}>
              {formMsg.text}
            </div>
          )}

          <form onSubmit={handleSubmitDispatch} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Product Master Searchable Dropdown */}
            <div className="sp-form-group" style={{ gridColumn: "span 2" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label className="sp-label" style={{ margin: 0 }}>Select Product from Product Master *</label>
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(true)}
                  className="sp-btn sp-btn-sm sp-btn-neutral"
                  style={{ fontSize: "11px", fontWeight: "bold" }}
                >
                  ➕ Add New Product
                </button>
              </div>
              <select
                className="sp-select"
                value={selectedProductId}
                onChange={(e) => handleSelectProduct(e.target.value)}
              >
                <option value="">-- Choose Existing Product from Catalog --</option>
                {productList.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.productName} ({p.size ? `Size: ${p.size}` : ""} {p.weightKg ? `· ${p.weightKg}kg` : ""})
                  </option>
                ))}
              </select>
            </div>

            <div className="sp-form-group" style={{ gridColumn: "span 2" }}>
              <label className="sp-label">Product Name / Item Description *</label>
              <input
                type="text"
                className="sp-input"
                placeholder={productType === "cylinder" ? "e.g. Aspirin Blister Cylinder" : productType === "roll" ? "e.g. Lay's Packaging Cover Roll" : "e.g. Paracetamol Foil 100mm"}
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />
            </div>

            {/* CYLINDER SPECIFIC FIELDS (Company 3 / Vel) */}
            {productType === "cylinder" && (
              <>
                <div className="sp-form-group">
                  <label className="sp-label">Number of Colors *</label>
                  <input
                    type="number"
                    className="sp-input"
                    placeholder="e.g. 4"
                    value={numberOfColors}
                    onChange={(e) => setNumberOfColors(e.target.value)}
                    required
                  />
                </div>
                <div className="sp-form-group">
                  <label className="sp-label">Cylinder Size (inches) *</label>
                  <input
                    type="text"
                    className="sp-input"
                    placeholder="e.g. 10.5"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    required
                  />
                </div>
                <div className="sp-form-group">
                  <label className="sp-label">Manufacturer</label>
                  <input
                    type="text"
                    className="sp-input"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* FOIL SPECIFIC FIELDS (Company 1 / Bharath) */}
            {productType === "foil" && (
              <>
                <div className="sp-form-group">
                  <label className="sp-label">Color(s) Used (comma separated)</label>
                  <input
                    type="text"
                    className="sp-input"
                    placeholder="e.g. Red, Silver, Blue"
                    value={colors}
                    onChange={(e) => setColors(e.target.value)}
                  />
                </div>
                <div className="sp-form-group">
                  <label className="sp-label">Weight (kg) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="sp-input"
                    placeholder="e.g. 25.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    required
                  />
                </div>
                <div className="sp-form-group">
                  <label className="sp-label">Dimensions / Size *</label>
                  <input
                    type="text"
                    className="sp-input"
                    placeholder="e.g. 100mm x 500m"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {/* ROLL SPECIFIC FIELDS (Company 2 / Shree Ganaapathy) */}
            {productType === "roll" && (
              <>
                <div className="sp-form-group">
                  <label className="sp-label">Roll Color(s) Used (comma separated)</label>
                  <input
                    type="text"
                    className="sp-input"
                    placeholder="e.g. Yellow, Black, Red"
                    value={rollColors}
                    onChange={(e) => setRollColors(e.target.value)}
                  />
                </div>
                <div className="sp-form-group">
                  <label className="sp-label">Roll Weight (kg) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="sp-input"
                    placeholder="e.g. 45.0"
                    value={rollWeightKg}
                    onChange={(e) => setRollWeightKg(e.target.value)}
                    required
                  />
                </div>
                <div className="sp-form-group">
                  <label className="sp-label">Roll Size / Length *</label>
                  <input
                    type="text"
                    className="sp-input"
                    placeholder="e.g. 1200mm Roll"
                    value={rollSize}
                    onChange={(e) => setRollSize(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {/* COMMON FIELDS */}
            <div className="sp-form-group">
              <label className="sp-label">Quantity *</label>
              <input
                type="number"
                className="sp-input"
                placeholder="e.g. 5"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                min="1"
              />
            </div>

            <div className="sp-form-group">
              <label className="sp-label">Destination Type</label>
              <select
                className="sp-select"
                value={destinationType}
                onChange={(e) => setDestinationType(e.target.value)}
              >
                <option value="external">External Client / Customer</option>
                <option value="internal">Internal Factory Unit</option>
              </select>
            </div>

            <div className="sp-form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label className="sp-label" style={{ margin: 0 }}>Destination Company Name *</label>
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = destMode === "predefined" ? "manual" : "predefined";
                    setDestMode(nextMode);
                    if (nextMode === "manual") setDestinationCompany("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-primary)",
                    fontSize: "12px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                >
                  {destMode === "predefined" ? "✏️ Write Manually" : "📋 Select Pre-defined Client"}
                </button>
              </div>

              {destMode === "predefined" && clientCompanies.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <select
                    className="sp-select"
                    value={destinationCompany}
                    onChange={(e) => {
                      if (e.target.value === "__manual__") {
                        setDestMode("manual");
                        setDestinationCompany("");
                      } else {
                        setDestinationCompany(e.target.value);
                      }
                    }}
                    required
                  >
                    <option value="">-- Select Pre-defined Client Company --</option>
                    {clientCompanies.map((c) => (
                      <option key={c._id || c.name} value={c.name}>
                        🏢 {c.name}
                      </option>
                    ))}
                    <option value="__manual__">✏️ Write Manually / Custom Client...</option>
                  </select>
                  {destinationCompany && (
                    <input
                      type="text"
                      className="sp-input"
                      value={destinationCompany}
                      onChange={(e) => setDestinationCompany(e.target.value)}
                      placeholder="Selected client (editable)..."
                    />
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  className="sp-input"
                  placeholder="e.g. Sun Pharma / Cipla Ltd"
                  value={destinationCompany}
                  onChange={(e) => setDestinationCompany(e.target.value)}
                  required
                />
              )}
            </div>

            <div className="sp-form-group">
              <label className="sp-label">Delivery Method *</label>
              <select
                className="sp-select"
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value)}
              >
                <option value="Rapido">🛵 Rapido</option>
                <option value="VRL">🚛 VRL Logistics</option>
                <option value="A1 Transport">🚚 A1 Transport</option>
                <option value="Own Vehicle">🚐 Own Vehicle / Factory Van</option>
                <option value="Other">📦 Other Transport</option>
              </select>
            </div>

            {deliveryMethod === "Other" && (
              <div className="sp-form-group">
                <label className="sp-label">Custom Delivery Method *</label>
                <input
                  type="text"
                  className="sp-input"
                  placeholder="Specify Transport Company Name"
                  value={customDeliveryMethod}
                  onChange={(e) => setCustomDeliveryMethod(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="sp-form-group">
              <label className="sp-label">Dispatch Date *</label>
              <input
                type="date"
                className="sp-input"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                required
              />
            </div>

            <div className="sp-form-group" style={{ gridColumn: "span 2" }}>
              <label className="sp-label">Remarks / Delivery Notes</label>
              <textarea
                className="sp-input"
                rows="2"
                placeholder="Add LR number, vehicle number, or special instructions..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              ></textarea>
            </div>

            <div style={{ gridColumn: "span 2", marginTop: "10px" }}>
              <button
                type="submit"
                className="sp-btn sp-btn-success sp-btn-lg sp-btn-block"
                disabled={submitting}
              >
                {submitting ? "⏳ Saving Dispatch Record..." : "🚀 Submit Dispatch Record"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── 2. DAILY DISPATCH BILL / REPORT ── */}
      {activeTab === "report" && (
        <div>
          {/* Filters Bar */}
          <div className="sp-card" style={{ padding: "16px", marginBottom: "20px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                {/* Company Filter (CEO sees company switcher) */}
                {userRole === 'ceo' && (
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>Company Filter</label>
                    <select
                      className="sp-select"
                      value={filterCompany}
                      onChange={(e) => setFilterCompany(e.target.value)}
                    >
                      <option value="all">🏢 All Companies</option>
                      <option value="bharath">Bharath (Company 1 - Foil)</option>
                      <option value="shree_ganaapathy">Shree Ganaapathy (Company 2 - Roll)</option>
                      <option value="vel">Vel Gravure (Company 3 - Cylinder)</option>
                    </select>
                  </div>
                )}

                {/* Date Filter Mode */}
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>Date Mode</label>
                  <select
                    className="sp-select"
                    value={filterMode}
                    onChange={(e) => setFilterMode(e.target.value)}
                  >
                    <option value="single">Single Day</option>
                    <option value="range">Date Range (From - To)</option>
                  </select>
                </div>

                {filterMode === "single" ? (
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>Select Date</label>
                    <input
                      type="date"
                      className="sp-input"
                      value={singleDate}
                      onChange={(e) => setSingleDate(e.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>From Date</label>
                      <input
                        type="date"
                        className="sp-input"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>To Date</label>
                      <input
                        type="date"
                        className="sp-input"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <button
                  className="sp-btn sp-btn-primary"
                  style={{ marginTop: "18px" }}
                  onClick={fetchReport}
                >
                  🔍 Filter Report
                </button>
              </div>

              {/* Download Buttons */}
              <div style={{ display: "flex", gap: "8px", marginTop: "18px" }}>
                <button onClick={exportExcel} className="sp-btn sp-btn-success">
                  📊 Download Excel
                </button>
                <button onClick={exportPDF} className="sp-btn sp-btn-secondary">
                  📄 Print / PDF
                </button>
              </div>
            </div>
          </div>

          {/* Bill-Style Document Container */}
          <div className="sp-card printable-bill" style={{ padding: "32px", background: "#fff", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
            {/* Bill Header */}
            <div style={{ textTransform: "uppercase", textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "16px", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "22px", letterSpacing: "1px" }}>
                {filterCompany === "vel" ? "VEL GRAVURE CYLINDER MANUFACTURING"
                  : filterCompany === "shree_ganaapathy" ? "SHREE GANAAPATHY ROTO PRINTS"
                  : filterCompany === "bharath" ? "BHARATH ENTERPRISES PHARMA PRINTING"
                  : "SMART PHARMA SYSTEM — CONSOLIDATED DISPATCH"}
              </h2>
              <h4 style={{ margin: "4px 0", color: "#475569" }}>DAILY DISPATCH BILL / DELIVERY REPORT</h4>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                Date Filter: <strong>{filterMode === "single" ? singleDate : `${fromDate} to ${toDate}`}</strong> | Generated on: {new Date().toLocaleString()}
              </p>
            </div>

            {reportLoading ? (
              <div style={{ padding: "40px", textAlign: "center" }}>⏳ Loading Dispatch Bill Report...</div>
            ) : !reportData || !reportData.items || reportData.items.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                📂 No dispatch records found for the selected filter date range.
              </div>
            ) : (
              <>
                {/* Itemized Bill Table */}
                <div style={{ overflowX: "auto" }}>
                  <table className="sp-table" style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                        <th style={{ padding: "10px", textAlign: "left" }}>S.No</th>
                        <th style={{ padding: "10px", textAlign: "left" }}>Product Name</th>
                        <th style={{ padding: "10px", textAlign: "left" }}>Colors</th>
                        {filterCompany === "vel" ? (
                          <>
                            <th style={{ padding: "10px", textAlign: "left" }}>Size (Inches)</th>
                            <th style={{ padding: "10px", textAlign: "left" }}>Manufacturer</th>
                          </>
                        ) : filterCompany === "shree_ganaapathy" ? (
                          <>
                            <th style={{ padding: "10px", textAlign: "left" }}>Weight (kg)</th>
                            <th style={{ padding: "10px", textAlign: "left" }}>Roll Size</th>
                          </>
                        ) : (
                          <>
                            <th style={{ padding: "10px", textAlign: "left" }}>Weight (kg)</th>
                            <th style={{ padding: "10px", textAlign: "left" }}>Dimensions</th>
                          </>
                        )}
                        <th style={{ padding: "10px", textAlign: "center" }}>Qty</th>
                        <th style={{ padding: "10px", textAlign: "left" }}>Destination</th>
                        <th style={{ padding: "10px", textAlign: "left" }}>Delivery Method</th>
                        <th style={{ padding: "10px", textAlign: "center" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.items.map((item, idx) => (
                        <tr key={item._id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "10px", fontWeight: "bold" }}>{idx + 1}</td>
                          <td style={{ padding: "10px", fontWeight: "600" }}>{item.productName}</td>
                          <td style={{ padding: "10px" }}>
                            {Array.isArray(item.colors) && item.colors.length ? item.colors.join(", ")
                              : Array.isArray(item.rollColors) && item.rollColors.length ? item.rollColors.join(", ")
                              : (item.numberOfColors ? `${item.numberOfColors} colors` : "-")}
                          </td>
                          {filterCompany === "vel" || item.productType === "cylinder" ? (
                            <>
                              <td style={{ padding: "10px" }}>{item.size ? `${item.size}"` : "-"}</td>
                              <td style={{ padding: "10px" }}>{item.manufacturer || "Vel Gravure"}</td>
                            </>
                          ) : filterCompany === "shree_ganaapathy" || item.productType === "roll" ? (
                            <>
                              <td style={{ padding: "10px" }}>{item.rollWeightKg ? `${item.rollWeightKg} kg` : "-"}</td>
                              <td style={{ padding: "10px" }}>{item.rollSize || "-"}</td>
                            </>
                          ) : (
                            <>
                              <td style={{ padding: "10px" }}>{item.weightKg ? `${item.weightKg} kg` : "-"}</td>
                              <td style={{ padding: "10px" }}>{item.dimensions || "-"}</td>
                            </>
                          )}
                          <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold", color: "#1d4ed8" }}>
                            {item.quantity}
                          </td>
                          <td style={{ padding: "10px" }}>{item.destinationCompany}</td>
                          <td style={{ padding: "10px" }}>
                            {item.deliveryMethod === "Other" ? (item.customDeliveryMethod || "Other") : item.deliveryMethod}
                          </td>
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            <span style={{
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: "bold",
                              backgroundColor: item.status === "delivered" ? "#dcfce7" : "#fef3c7",
                              color: item.status === "delivered" ? "#166534" : "#92400e"
                            }}>
                              {item.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Section */}
                <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "2px dashed #cbd5e1" }}>
                  <h4 style={{ margin: "0 0 12px 0", color: "#1e293b", textTransform: "uppercase" }}>
                    📊 Dispatch Report Summary
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                    <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "bold" }}>TOTAL DISPATCHED QTY</span>
                      <h2 style={{ margin: "4px 0 0 0", color: "#0f172a" }}>
                        {reportData.summary?.totalQuantity || 0} units
                      </h2>
                    </div>

                    <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "bold" }}>TOTAL BY DESTINATION</span>
                      <div style={{ fontSize: "12px", marginTop: "4px" }}>
                        {Object.entries(reportData.summary?.totalByDestination || {}).map(([dest, qty]) => (
                          <div key={dest} style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>{dest}:</span>
                            <strong>{qty}</strong>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "bold" }}>TOTAL BY DELIVERY METHOD</span>
                      <div style={{ fontSize: "12px", marginTop: "4px" }}>
                        {Object.entries(reportData.summary?.totalByDeliveryMethod || {}).map(([method, qty]) => (
                          <div key={method} style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>{method}:</span>
                            <strong>{qty}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Stamp */}
                <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between", paddingTop: "20px", fontSize: "12px", color: "#64748b" }}>
                  <div>
                    <p style={{ margin: 0 }}>Prepared By: ___________________</p>
                  </div>
                  <div>
                    <p style={{ margin: 0 }}>Authorized Stamp / Signature: ___________________</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Inline Quick Add Product Master Modal */}
      {showAddProductModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
        }}>
          <div className="sp-card" style={{ width: "400px", padding: "24px", backgroundColor: "#fff" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "var(--color-primary)" }}>➕ Add New Product Master Record</h3>
            <form onSubmit={handleCreateProductInline} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="sp-form-group">
                <label className="sp-label">1. Product Name *</label>
                <input
                  type="text"
                  className="sp-input"
                  placeholder="e.g. Paracetamol Foil 100mm"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  required
                />
              </div>
              <div className="sp-form-group">
                <label className="sp-label">2. Size / Dimensions</label>
                <input
                  type="text"
                  className="sp-input"
                  placeholder="e.g. 100mm x 500m"
                  value={newProdSize}
                  onChange={(e) => setNewProdSize(e.target.value)}
                />
              </div>
              <div className="sp-form-group">
                <label className="sp-label">3. Weight (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  className="sp-input"
                  placeholder="e.g. 25.5"
                  value={newProdWeight}
                  onChange={(e) => setNewProdWeight(e.target.value)}
                />
              </div>
              <div className="sp-form-group">
                <label className="sp-label">4. Number of Colors</label>
                <input
                  type="number"
                  className="sp-input"
                  value={newProdColors}
                  onChange={(e) => setNewProdColors(e.target.value)}
                  min="1"
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button type="submit" className="sp-btn sp-btn-success" style={{ flex: 1 }} disabled={addingProduct}>
                  {addingProduct ? "Saving..." : "💾 Save & Select"}
                </button>
                <button type="button" onClick={() => setShowAddProductModal(false)} className="sp-btn sp-btn-neutral">
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

export default Dispatch;

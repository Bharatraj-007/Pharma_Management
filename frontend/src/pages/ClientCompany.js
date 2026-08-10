import React, { useState, useEffect } from "react";
import API_BASE_URL from "../config";

function ClientCompany() {
  const token = localStorage.getItem("token");
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const isAdminOrCeo = ["admin", "ceo"].includes(role);

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");

  const [selectedCompany, setSelectedCompany] = useState(null);
  const [products, setProducts] = useState([]);
  const [newProductName, setNewProductName] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [taskFiles, setTaskFiles] = useState([]);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchCompanies = async (query = "") => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/client-companies?search=${encodeURIComponent(query)}`, {
        headers: { Authorization: token }
      });
      if (res.ok) {
        const data = await res.json();
        setCompanies(Array.isArray(data) ? data : []);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || "Failed to load client companies");
      }
    } catch (err) {
      setErrorMsg("Server error fetching client companies");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (compName) => {
    if (!compName) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/client-products?clientCompany=${encodeURIComponent(compName)}`, {
        headers: { Authorization: token }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTaskFiles = async (compName, prodName = "") => {
    if (!compName) return;
    try {
      const query = `clientCompany=${encodeURIComponent(compName)}&productName=${encodeURIComponent(prodName)}`;
      const res = await fetch(`${API_BASE_URL}/api/task-files?${query}`, {
        headers: { Authorization: token }
      });
      if (res.ok) {
        const data = await res.json();
        setTaskFiles(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) fetchCompanies();
  }, [token]);

  useEffect(() => {
    if (token && selectedCompany) {
      fetchProducts(selectedCompany.name);
      fetchTaskFiles(selectedCompany.name, selectedProduct?.name || "");
    }
  }, [token, selectedCompany, selectedProduct]);

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/client-companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ name: newCompanyName.trim() })
      });
      if (res.ok) {
        const company = await res.json();
        setNewCompanyName("");
        setShowAddCompanyModal(false);
        fetchCompanies();
        setSelectedCompany(company);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "Failed to create company");
      }
    } catch (err) {
      alert("Error creating company");
    }
  };

  const handleDeleteCompany = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this client company?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/client-companies/${id}`, {
        method: "DELETE",
        headers: { Authorization: token }
      });
      if (res.ok) {
        if (selectedCompany?._id === id) {
          setSelectedCompany(null);
          setProducts([]);
          setTaskFiles([]);
        }
        fetchCompanies();
      } else {
        alert("Failed to delete company");
      }
    } catch (err) {
      alert("Error deleting company");
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!selectedCompany || !newProductName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/client-products`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ clientCompany: selectedCompany.name, name: newProductName.trim() })
      });
      if (res.ok) {
        setNewProductName("");
        setShowAddProductModal(false);
        fetchProducts(selectedCompany.name);
      } else {
        alert("Failed to create product");
      }
    } catch (err) {
      alert("Error creating product");
    }
  };

  return (
    <div className="sp-page-container">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px" }}>🏢 Client Company Master Hub</h1>
          <p style={{ margin: "4px 0 0", color: "var(--color-text-muted)", fontSize: "14px" }}>
            Manage client accounts, registered products, and CDR sample files.
          </p>
        </div>
        {isAdminOrCeo && (
          <button className="sp-btn sp-btn-primary" onClick={() => setShowAddCompanyModal(true)}>
            + Add Client Company
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="sp-alert sp-alert-error" style={{ marginBottom: "16px" }}>
          {errorMsg}
        </div>
      )}

      {/* Top Search Filter */}
      <div className="sp-card" style={{ marginBottom: "20px", padding: "16px" }}>
        <div style={{ display: "flex", gap: "12px" }}>
          <input
            type="text"
            className="sp-input"
            placeholder="🔍 Search client company name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              fetchCompanies(e.target.value);
            }}
            style={{ flex: 1 }}
          />
        </div>
      </div>

      {/* Main Grid: Left = Companies List, Right = Details / Products / Task Files */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "20px" }}>
        {/* Companies Column */}
        <div className="sp-card" style={{ padding: "16px", maxHeight: "650px", overflowY: "auto" }}>
          <h3 style={{ marginTop: 0, marginBottom: "12px", fontSize: "16px" }}>Client Companies ({companies.length})</h3>
          {loading ? (
            <p style={{ color: "var(--color-text-muted)" }}>Loading companies...</p>
          ) : companies.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>No client companies found.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {companies.map((comp) => {
                const isSelected = selectedCompany?._id === comp._id;
                return (
                  <div
                    key={comp._id}
                    onClick={() => {
                      setSelectedCompany(comp);
                      setSelectedProduct(null);
                    }}
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      border: `1px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
                      backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: isSelected ? "700" : "500", color: isSelected ? "var(--color-primary)" : "inherit" }}>
                        🏢 {comp.name}
                      </span>
                    </div>
                    {isAdminOrCeo && (
                      <button
                        onClick={(e) => handleDeleteCompany(comp._id, e)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: "14px",
                          padding: "2px 6px"
                        }}
                        title="Delete company"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Details Panel */}
        <div>
          {!selectedCompany ? (
            <div className="sp-card" style={{ padding: "40px", textAlign: "center", color: "var(--color-text-muted)" }}>
              <h3>👈 Select a Client Company from the left panel</h3>
              <p>Select any company to view registered products, job designs, and CDR files.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Selected Company Header */}
              <div className="sp-card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h2 style={{ margin: 0, color: "var(--color-primary)" }}>🏢 {selectedCompany.name}</h2>
                    <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                      Registered Client Account
                    </span>
                  </div>
                  {isAdminOrCeo && (
                    <button className="sp-btn sp-btn-secondary sp-btn-sm" onClick={() => setShowAddProductModal(true)}>
                      + Add Product
                    </button>
                  )}
                </div>
              </div>

              {/* Registered Products */}
              <div className="sp-card" style={{ padding: "20px" }}>
                <h3 style={{ marginTop: 0, marginBottom: "12px" }}>🏷️ Products under {selectedCompany.name}</h3>
                {products.length === 0 ? (
                  <p style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>No products added yet for this client.</p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    <button
                      onClick={() => setSelectedProduct(null)}
                      className={`sp-btn ${selectedProduct === null ? "sp-btn-primary" : "sp-btn-secondary"} sp-btn-sm`}
                    >
                      All Products ({products.length})
                    </button>
                    {products.map((p) => (
                      <button
                        key={p._id}
                        onClick={() => setSelectedProduct(p)}
                        className={`sp-btn ${selectedProduct?._id === p._id ? "sp-btn-primary" : "sp-btn-secondary"} sp-btn-sm`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Task / CDR Files */}
              <div className="sp-card" style={{ padding: "20px" }}>
                <h3 style={{ marginTop: 0, marginBottom: "12px" }}>
                  📁 CDR & Artwork Files {selectedProduct ? `(Product: ${selectedProduct.name})` : ""}
                </h3>
                {taskFiles.length === 0 ? (
                  <p style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>No sample artwork or CDR files found.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {taskFiles.map((file) => (
                      <div
                        key={file._id}
                        style={{
                          padding: "12px",
                          borderRadius: "6px",
                          border: "1px solid var(--color-border)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: "600", fontSize: "14px" }}>📄 {file.fileName}</div>
                          <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                            Product: {file.productName || "General"} | Uploaded: {new Date(file.uploadedAt).toLocaleDateString()}
                          </div>
                        </div>
                        {file.fileUrl && (
                          <a
                            href={`${API_BASE_URL}${file.fileUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sp-btn sp-btn-secondary sp-btn-sm"
                          >
                            ⬇️ Download File
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Client Company */}
      {showAddCompanyModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
        >
          <div className="sp-card" style={{ width: "400px", padding: "24px", background: "#fff" }}>
            <h3 style={{ marginTop: 0 }}>Add New Client Company</h3>
            <form onSubmit={handleCreateCompany}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Client Company Name
                </label>
                <input
                  type="text"
                  className="sp-input"
                  placeholder="e.g. Sun Pharma / CIPLA"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="sp-btn sp-btn-secondary" onClick={() => setShowAddCompanyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="sp-btn sp-btn-primary">
                  Save Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Product */}
      {showAddProductModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
        >
          <div className="sp-card" style={{ width: "400px", padding: "24px", background: "#fff" }}>
            <h3 style={{ marginTop: 0 }}>Add Product for {selectedCompany?.name}</h3>
            <form onSubmit={handleCreateProduct}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Product Name
                </label>
                <input
                  type="text"
                  className="sp-input"
                  placeholder="e.g. Paracetamol 500mg Strip Foil"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="sp-btn sp-btn-secondary" onClick={() => setShowAddProductModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="sp-btn sp-btn-primary">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientCompany;

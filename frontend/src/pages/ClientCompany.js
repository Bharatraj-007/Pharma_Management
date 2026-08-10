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
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [taskFiles, setTaskFiles] = useState([]);
  const [newProductName, setNewProductName] = useState("");

  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [folderUploading, setFolderUploading] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState("");
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

  const handleFolderUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setFolderUploading(true);
    setUploadStatusMsg(`Uploading ${files.length} CDR sample files across 2-level directory structure...`);

    const formData = new FormData();
    const relativePaths = [];

    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
      relativePaths.push(files[i].webkitRelativePath || files[i].name);
    }
    formData.append("relativePaths", JSON.stringify(relativePaths));

    try {
      const res = await fetch(`${API_BASE_URL}/api/task-files/upload-folder`, {
        method: "POST",
        headers: { Authorization: token },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Folder upload failed");
      setUploadStatusMsg(data.message || "Folder uploaded & structure extracted!");
      fetchCompanies();
      if (selectedCompany) {
        fetchProducts(selectedCompany.name);
        fetchTaskFiles(selectedCompany.name, selectedProduct?.name || "");
      }
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setFolderUploading(false);
    }
  };

  const filteredCompanies = companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="sp-page-container">
      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "800", color: "#1e293b" }}>🏢 Client Company Master Hub</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
            Manage client companies, product subfolders, and CorelDRAW CDR sample files independently.
          </p>
        </div>
        {isAdminOrCeo && (
          <button className="sp-btn sp-btn-primary" onClick={() => setShowAddCompanyModal(true)}>
            + Add Company
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="sp-alert sp-alert-error" style={{ marginBottom: "16px" }}>
          {errorMsg}
        </div>
      )}

      {/* Top Search Input */}
      <div className="sp-card" style={{ marginBottom: "20px", padding: "16px" }}>
        <input
          type="text"
          className="sp-input"
          placeholder="🔍 Search client companies..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            fetchCompanies(e.target.value);
          }}
          style={{ width: "100%", maxWidth: "450px" }}
        />
      </div>

      {/* Bulk Upload Banner */}
      {isAdminOrCeo && (
        <div className="sp-card" style={{ marginBottom: "20px", padding: "18px 24px", backgroundColor: "#ffffff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div>
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "800", color: "#1e293b" }}>
                📁 Bulk Upload Folder Structure (<code style={{ backgroundColor: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>CompanyName / ProductName / sample.cdr</code>)
              </h4>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
                Upload your local folder tree containing 10+ companies and product subfolders in a single action.
              </p>
            </div>
            <input
              type="file"
              webkitdirectory="true"
              directory="true"
              multiple
              onChange={handleFolderUpload}
              style={{ fontSize: "12px" }}
            />
          </div>
          {folderUploading && (
            <p style={{ margin: "8px 0 0", fontSize: "12px", fontWeight: "bold", color: "var(--color-primary)" }}>
              ⏳ {uploadStatusMsg}
            </p>
          )}
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", fontSize: "14px" }}>
        <span
          onClick={() => { setSelectedCompany(null); setSelectedProduct(null); }}
          style={{
            cursor: "pointer",
            fontWeight: !selectedCompany ? "800" : "600",
            color: !selectedCompany ? "var(--color-primary)" : "#64748b"
          }}
        >
          All Client Companies ({companies.length})
        </span>
        {selectedCompany && (
          <>
            <span style={{ color: "#94a3b8" }}>›</span>
            <span
              onClick={() => setSelectedProduct(null)}
              style={{
                cursor: "pointer",
                fontWeight: !selectedProduct ? "800" : "600",
                color: !selectedProduct ? "var(--color-primary)" : "#64748b"
              }}
            >
              🏢 {selectedCompany.name}
            </span>
          </>
        )}
        {selectedProduct && (
          <>
            <span style={{ color: "#94a3b8" }}>›</span>
            <span style={{ fontWeight: "800", color: "var(--color-primary)" }}>
              📦 {selectedProduct.name}
            </span>
          </>
        )}
      </div>

      {/* Level 1: Client Companies Grid */}
      {!selectedCompany ? (
        <div className="sp-card" style={{ padding: "20px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "16px", fontSize: "16px", fontWeight: "700" }}>Client Companies Master</h3>
          {loading ? (
            <p style={{ color: "#64748b" }}>⏳ Loading client companies...</p>
          ) : filteredCompanies.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "13px" }}>No client companies found.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
              {filteredCompanies.map((comp) => (
                <div
                  key={comp._id}
                  onClick={() => setSelectedCompany(comp)}
                  className="sp-card-interactive"
                  style={{
                    width: "260px",
                    padding: "16px",
                    borderRadius: "12px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#f1f5f9",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "24px" }}>🏢</span>
                    <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#1e293b", flex: 1, lineHeight: "1.2" }}>
                      {comp.name}
                    </h4>
                  </div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                    Click to view Products & CDR Samples
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#334155", backgroundColor: "#e2e8f0", padding: "3px 8px", borderRadius: "10px" }}>
                      Active Client
                    </span>
                    <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                      Added {new Date(comp.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Level 2 & 3: Products & Samples for Selected Company */
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Products Filter Bar */}
          <div className="sp-card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", flex: 1, alignItems: "center" }}>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className={`sp-btn ${selectedProduct === null ? "sp-btn-primary" : "sp-btn-secondary"} sp-btn-sm`}
                  style={{ borderRadius: "20px", padding: "6px 14px", fontSize: "12px" }}
                >
                  All Products ({products.length})
                </button>
                {products.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => setSelectedProduct(p)}
                    className={`sp-btn ${selectedProduct?._id === p._id ? "sp-btn-primary" : "sp-btn-secondary"} sp-btn-sm`}
                    style={{ borderRadius: "20px", padding: "6px 14px", fontSize: "12px" }}
                  >
                    📦 {p.name}
                  </button>
                ))}
              </div>
              {isAdminOrCeo && (
                <button className="sp-btn sp-btn-secondary sp-btn-sm" onClick={() => setShowAddProductModal(true)}>
                  + Add Product
                </button>
              )}
            </div>
          </div>

          {/* Sample Files Cards Grid */}
          <div className="sp-card" style={{ padding: "20px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px", fontSize: "16px" }}>
              CDR Sample Files ({taskFiles.length})
            </h3>
            {taskFiles.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "13px" }}>No samples uploaded for this selection yet.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "16px" }}>
                {taskFiles.map((file) => (
                  <div
                    key={file._id}
                    style={{
                      padding: "12px",
                      borderRadius: "10px",
                      backgroundColor: "#f8fafc",
                      border: "1px solid var(--color-border)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center"
                    }}
                  >
                    {file.thumbnailUrl ? (
                      <img src={file.thumbnailUrl} alt={file.fileName} style={{ width: "140px", height: "110px", objectFit: "cover", borderRadius: "6px", marginBottom: "8px" }} />
                    ) : (
                      <div style={{ width: "140px", height: "110px", borderRadius: "6px", backgroundColor: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px", fontSize: "12px", color: "#64748b" }}>
                        📄 {file.fileName}
                      </div>
                    )}
                    <div style={{ fontSize: "12px", fontWeight: "700", width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {file.fileName}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "8px" }}>
                      Product: {file.productName || "General"}
                    </div>
                    <div style={{ display: "flex", gap: "6px", width: "100%", justifyContent: "center" }}>
                      {file.previewFileUrl && (
                        <button
                          className="sp-btn sp-btn-secondary sp-btn-sm"
                          onClick={() => setPreviewPdfUrl(file.previewFileUrl)}
                          style={{ fontSize: "11px", padding: "4px 8px" }}
                        >
                          👁️ Preview
                        </button>
                      )}
                      <a
                        href={`${API_BASE_URL}/api/task-files/${file._id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="sp-btn sp-btn-primary sp-btn-sm"
                        style={{ fontSize: "11px", padding: "4px 8px", textDecoration: "none" }}
                      >
                        ⬇️ .CDR
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Company Modal */}
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
                  Client Company Name *
                </label>
                <input
                  type="text"
                  className="sp-input"
                  placeholder="e.g. Goodman Pharma Ltd"
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

      {/* Add Product Modal */}
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
            <h3 style={{ marginTop: 0 }}>Add Product under {selectedCompany?.name}</h3>
            <form onSubmit={handleCreateProduct}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  className="sp-input"
                  placeholder="e.g. Paracetamol 500mg"
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

      {/* PDF Preview Modal */}
      {previewPdfUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
        >
          <div className="sp-card" style={{ width: "700px", maxWidth: "90vw", padding: "24px", background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>👁️ Converted CDR Sample Preview</h3>
              <button
                onClick={() => setPreviewPdfUrl(null)}
                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer" }}
              >
                ✖
              </button>
            </div>
            <div style={{ height: "450px", width: "100%" }}>
              <iframe src={previewPdfUrl} style={{ width: "100%", height: "100%", border: "none" }} title="PDF Preview" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <button className="sp-btn sp-btn-secondary" onClick={() => setPreviewPdfUrl(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientCompany;

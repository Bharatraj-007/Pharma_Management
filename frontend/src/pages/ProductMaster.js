import React, { useState, useEffect, useCallback } from "react";
import API_BASE_URL from "../config";

function ProductMaster() {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");
  const userCompany = localStorage.getItem("company") || "bharath";
  const activeCompanyOverride = localStorage.getItem("activeCompany");

  const activeCompany = (userRole === 'ceo' && activeCompanyOverride)
    ? activeCompanyOverride
    : userCompany;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Add Product Form State (4 simple fields)
  const [productName, setProductName] = useState("");
  const [size, setSize] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [numberOfColors, setNumberOfColors] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/products?company=${activeCompany}&page=${page}&limit=10`, {
        headers: { Authorization: token }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.data || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, activeCompany, page]);

  useEffect(() => {
    fetchProducts();
    const handleCompanyChange = () => fetchProducts();
    window.addEventListener("companyChanged", handleCompanyChange);
    return () => window.removeEventListener("companyChanged", handleCompanyChange);
  }, [fetchProducts]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!productName) {
      setMsg({ type: "error", text: "Product Name is required." });
      return;
    }

    setSubmitting(true);
    setMsg({ type: "", text: "" });
    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token
        },
        body: JSON.stringify({
          company: activeCompany === "all" ? "bharath" : activeCompany,
          productName,
          size,
          weightKg: weightKg ? Number(weightKg) : 0,
          numberOfColors: numberOfColors ? Number(numberOfColors) : 1
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add product");

      setMsg({ type: "success", text: "✅ Product added to Product Master!" });
      setProductName("");
      setSize("");
      setWeightKg("");
      setNumberOfColors("1");
      fetchProducts();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Soft-delete this product master record?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: token }
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="sp-page-container animate-fade">
      <div className="sp-page-header">
        <div>
          <h1>🏷️ Product Master Catalog</h1>
          <p className="sp-subtitle">Manage standard company products for fast, 1-click dispatch entry</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
        {/* Add Product Form (4 Fields) */}
        <div className="sp-card" style={{ padding: "20px", height: "fit-content" }}>
          <h3 style={{ margin: "0 0 16px 0", color: "var(--color-primary)" }}>➕ Add New Product</h3>
          {msg.text && (
            <div style={{
              padding: "10px",
              borderRadius: "6px",
              marginBottom: "12px",
              backgroundColor: msg.type === "success" ? "#dcfce7" : "#fee2e2",
              color: msg.type === "success" ? "#166534" : "#991b1b",
              fontWeight: "600",
              fontSize: "13px"
            }}>
              {msg.text}
            </div>
          )}
          <form onSubmit={handleAddProduct} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="sp-form-group">
              <label className="sp-label">1. Product Name *</label>
              <input
                type="text"
                className="sp-input"
                placeholder="e.g. Paracetamol Foil 100mm"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />
            </div>
            <div className="sp-form-group">
              <label className="sp-label">2. Size / Dimensions</label>
              <input
                type="text"
                className="sp-input"
                placeholder="e.g. 100mm x 500m or 10.5 IN"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
            </div>
            <div className="sp-form-group">
              <label className="sp-label">3. Weight (kg)</label>
              <input
                type="number"
                step="0.01"
                className="sp-input"
                placeholder="e.g. 25.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>
            <div className="sp-form-group">
              <label className="sp-label">4. Number of Colors</label>
              <input
                type="number"
                className="sp-input"
                placeholder="e.g. 4"
                value={numberOfColors}
                onChange={(e) => setNumberOfColors(e.target.value)}
                min="1"
              />
            </div>
            <button type="submit" className="sp-btn sp-btn-success sp-btn-block" disabled={submitting}>
              {submitting ? "⏳ Saving..." : "💾 Save Product Master"}
            </button>
          </form>
        </div>

        {/* Product Catalog List Table */}
        <div className="sp-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0 }}>Catalog ({totalCount})</h3>
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Company: <strong>{activeCompany.toUpperCase()}</strong></span>
          </div>

          {loading ? (
            <div style={{ padding: "30px", textAlign: "center" }}>⏳ Loading Product Catalog...</div>
          ) : products.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--color-text-muted)" }}>
              No products found in catalog. Add your first product on the left!
            </div>
          ) : (
            <>
              <table className="sp-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "10px", textAlign: "left" }}>Product Name</th>
                    <th style={{ padding: "10px", textAlign: "left" }}>Size</th>
                    <th style={{ padding: "10px", textAlign: "right" }}>Weight (kg)</th>
                    <th style={{ padding: "10px", textAlign: "center" }}>Colors</th>
                    <th style={{ padding: "10px", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p._id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "10px", fontWeight: "600" }}>{p.productName}</td>
                      <td style={{ padding: "10px" }}>{p.size || "-"}</td>
                      <td style={{ padding: "10px", textAlign: "right" }}>{p.weightKg ? `${p.weightKg} kg` : "-"}</td>
                      <td style={{ padding: "10px", textAlign: "center" }}>{p.numberOfColors || 1}</td>
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        <button onClick={() => handleDeleteProduct(p._id)} className="sp-btn sp-btn-danger sp-btn-sm">
                          🗑️ Soft Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination controls */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
                <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="sp-btn sp-btn-neutral sp-btn-sm">
                  ◀ Previous
                </button>
                <span style={{ fontSize: "13px" }}>Page <strong>{page}</strong> of <strong>{totalPages}</strong></span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="sp-btn sp-btn-neutral sp-btn-sm">
                  Next ▶
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductMaster;

import React, { useState, useEffect, useCallback } from "react";
import API_BASE_URL from "../config";

function Finance() {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");
  const userCompany = localStorage.getItem("company") || "bharath";
  const activeCompanyOverride = localStorage.getItem("activeCompany");

  const activeCompany = (userRole === 'ceo' && activeCompanyOverride)
    ? activeCompanyOverride
    : userCompany;

  const [period, setPeriod] = useState("month"); // 'day' or 'month'
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Add Transaction Form
  const [type, setType] = useState("income");
  const [category, setCategory] = useState("Dispatch Sale");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const fetchFinancials = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, txRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/transactions/summary?company=${activeCompany}&period=${period}`, {
          headers: { Authorization: token }
        }),
        fetch(`${API_BASE_URL}/api/transactions?company=${activeCompany}&limit=15`, {
          headers: { Authorization: token }
        })
      ]);

      if (sumRes.ok && txRes.ok) {
        const sumData = await sumRes.json();
        const txData = await txRes.json();
        setSummary(sumData);
        setTransactions(txData.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, activeCompany, period]);

  useEffect(() => {
    fetchFinancials();
    const handleCompanyChange = () => fetchFinancials();
    window.addEventListener("companyChanged", handleCompanyChange);
    return () => window.removeEventListener("companyChanged", handleCompanyChange);
  }, [fetchFinancials]);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setMsg({ type: "error", text: "Please enter a valid amount." });
      return;
    }

    setSubmitting(true);
    setMsg({ type: "", text: "" });
    try {
      const res = await fetch(`${API_BASE_URL}/api/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token
        },
        body: JSON.stringify({
          company: activeCompany === "all" ? "bharath" : activeCompany,
          type,
          category,
          amount: Number(amount),
          description,
          date,
          paymentMethod
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record transaction");

      setMsg({ type: "success", text: "✅ Financial transaction recorded!" });
      setAmount("");
      setDescription("");
      fetchFinancials();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const exportPnL = (format) => {
    window.open(`${API_BASE_URL}/api/transactions/report/export?company=${activeCompany}&format=${format}&token=${token}`, "_blank");
  };

  return (
    <div className="sp-page-container animate-fade">
      <div className="sp-page-header">
        <div>
          <h1>💵 Finance & Profit/Loss Dashboard</h1>
          <p className="sp-subtitle">Track day-wise and month-wise Income vs Expense, Net Profit, and P&L Statements</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => exportPnL("excel")} className="sp-btn sp-btn-success">
            📊 Download Excel P&L
          </button>
          <button onClick={() => exportPnL("pdf")} className="sp-btn sp-btn-secondary">
            📄 Download PDF P&L
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <div className="sp-card" style={{ padding: "16px", borderLeft: "4px solid #16a34a" }}>
          <span style={{ fontSize: "12px", color: "var(--color-text-muted)", fontWeight: "bold" }}>PERIOD</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="sp-select" style={{ marginTop: "4px" }}>
            <option value="day">Today's Performance</option>
            <option value="month">This Month's Performance</option>
          </select>
        </div>

        <div className="sp-card" style={{ padding: "16px", borderLeft: "4px solid #16a34a" }}>
          <span style={{ fontSize: "12px", color: "var(--color-text-muted)", fontWeight: "bold" }}>TOTAL INCOME</span>
          <h2 style={{ margin: "4px 0 0 0", color: "#166534" }}>₹{summary?.totalIncome || 0}</h2>
        </div>

        <div className="sp-card" style={{ padding: "16px", borderLeft: "4px solid #dc2626" }}>
          <span style={{ fontSize: "12px", color: "var(--color-text-muted)", fontWeight: "bold" }}>TOTAL EXPENSES</span>
          <h2 style={{ margin: "4px 0 0 0", color: "#991b1b" }}>₹{summary?.totalExpense || 0}</h2>
        </div>

        <div className="sp-card" style={{ padding: "16px", borderLeft: `4px solid ${(summary?.netProfit || 0) >= 0 ? '#2563eb' : '#dc2626'}` }}>
          <span style={{ fontSize: "12px", color: "var(--color-text-muted)", fontWeight: "bold" }}>NET PROFIT / LOSS</span>
          <h2 style={{ margin: "4px 0 0 0", color: (summary?.netProfit || 0) >= 0 ? "#1d4ed8" : "#991b1b" }}>
            ₹{summary?.netProfit || 0}
          </h2>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
        {/* Record Transaction Form */}
        <div className="sp-card" style={{ padding: "20px", height: "fit-content" }}>
          <h3 style={{ margin: "0 0 16px 0", color: "var(--color-primary)" }}>➕ Record New Transaction</h3>
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
          <form onSubmit={handleAddTransaction} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="sp-form-group">
              <label className="sp-label">Transaction Type *</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="sp-select">
                <option value="income">🟢 Income (Receivable)</option>
                <option value="expense">🔴 Expense (Payable)</option>
              </select>
            </div>

            <div className="sp-form-group">
              <label className="sp-label">Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="sp-select">
                {type === "income" ? (
                  <>
                    <option value="Dispatch Sale">Dispatch Sale / Client Order</option>
                    <option value="Cylinder Service">Cylinder Service / Engraving</option>
                    <option value="Other Income">Other Income</option>
                  </>
                ) : (
                  <>
                    <option value="Raw Material">Raw Material (Foil / Roll / Copper)</option>
                    <option value="Salary">Salary & Wages</option>
                    <option value="Transport">Transport & Freight</option>
                    <option value="Maintenance">Machine Repair & Maintenance</option>
                    <option value="Utility">Electricity & Factory Bills</option>
                    <option value="Other Expense">Other Expense</option>
                  </>
                )}
              </select>
            </div>

            <div className="sp-form-group">
              <label className="sp-label">Amount (INR) *</label>
              <input
                type="number"
                step="0.01"
                className="sp-input"
                placeholder="e.g. 15000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="sp-form-group">
              <label className="sp-label">Payment Method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="sp-select">
                <option value="online">Online / UPI</option>
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            <div className="sp-form-group">
              <label className="sp-label">Date *</label>
              <input
                type="date"
                className="sp-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="sp-form-group">
              <label className="sp-label">Description / Remarks</label>
              <textarea
                className="sp-input"
                rows="2"
                placeholder="Invoice number or notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>

            <button type="submit" className="sp-btn sp-btn-success sp-btn-block" disabled={submitting}>
              {submitting ? "⏳ Saving..." : "💾 Save Transaction"}
            </button>
          </form>
        </div>

        {/* Transaction History Table */}
        <div className="sp-card" style={{ padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px 0" }}>Recent Transactions</h3>
          {loading ? (
            <div style={{ padding: "30px", textAlign: "center" }}>⏳ Loading Financial Log...</div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--color-text-muted)" }}>
              No transactions recorded yet.
            </div>
          ) : (
            <table className="sp-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "10px", textAlign: "left" }}>Date</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Category</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Method</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Amount</th>
                  <th style={{ padding: "10px", textAlign: "center" }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t._id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "10px" }}>{new Date(t.date).toLocaleDateString()}</td>
                    <td style={{ padding: "10px", fontWeight: "600" }}>{t.category}</td>
                    <td style={{ padding: "10px" }}>{t.paymentMethod.toUpperCase()}</td>
                    <td style={{ padding: "10px", textAlign: "right", fontWeight: "bold", color: t.type === "income" ? "#166534" : "#991b1b" }}>
                      {t.type === "income" ? "+" : "-"}₹{t.amount}
                    </td>
                    <td style={{ padding: "10px", textAlign: "center" }}>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontSize: "11px",
                        fontWeight: "bold",
                        backgroundColor: t.type === "income" ? "#dcfce7" : "#fee2e2",
                        color: t.type === "income" ? "#166534" : "#991b1b"
                      }}>
                        {t.type.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default Finance;

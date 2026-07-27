function CEODashboard() {
  return (
    <div>
      <div className="page-header">
        <h1>🏢 CEO Dashboard</h1>
        <p>High-level overview of company operations</p>
      </div>

      <div className="flex gap-5 flex-wrap">
        <div className="sp-card" style={{ flex: '1 1 200px' }}>
          <h3>📊 Total Production</h3>
          <p className="mt-2">Aggregate output across all plants.</p>
        </div>
        <div className="sp-card" style={{ flex: '1 1 200px' }}>
          <h3>💰 Profit Analysis</h3>
          <p className="mt-2">Revenue and margin tracking.</p>
        </div>
        <div className="sp-card" style={{ flex: '1 1 200px' }}>
          <h3>🏆 Company Performance</h3>
          <p className="mt-2">KPIs and benchmarking metrics.</p>
        </div>
      </div>
    </div>
  );
}

export default CEODashboard;

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WebCard, WebBadge, WebBtn, WebInput } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function ReportsScreen({ apiBaseUrl, session }) {
  const token = session?.token;
  const company = session?.company || 'bharath';
  const activeCompany = session?.activeCompany || company;

  const [activeTab, setActiveTab] = useState('overview');
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [advanceLogs, setAdvanceLogs] = useState([]);
  const [foilLogs, setFoilLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAdvanceReport = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/advance/report?month=${reportMonth}`, {
        headers: { Authorization: token },
      });
      if (res.ok) setAdvanceLogs(await res.json());
    } catch (e) {}
    finally { setLoading(false); }
  }, [apiBaseUrl, token, reportMonth]);

  const fetchFoilReport = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/reports/foil-usage`, {
        headers: { Authorization: token },
      });
      if (res.ok) setFoilLogs(await res.json());
    } catch (e) {}
    finally { setLoading(false); }
  }, [apiBaseUrl, token]);

  useEffect(() => {
    fetchAdvanceReport();
    fetchFoilReport();
  }, [fetchAdvanceReport, fetchFoilReport]);

  const handleExportAdvanceExcel = () => {
    window.open(`${apiBaseUrl}/api/advance/report/export/excel?month=${reportMonth}&token=${token}`, '_blank');
  };

  const handleExportAdvancePdf = () => {
    window.open(`${apiBaseUrl}/api/advance/report/export/pdf?month=${reportMonth}&token=${token}`, '_blank');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📈 Reports & Analytics Center</Text>
        <Text style={styles.headerSubtitle}>View monthly advance reports, foil usage analytics, and performance exports.</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'overview' && styles.tabBtnActive]} onPress={() => setActiveTab('overview')}>
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>💸 Monthly Advance Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'foil' && styles.tabBtnActive]} onPress={() => setActiveTab('foil')}>
          <Text style={[styles.tabText, activeTab === 'foil' && styles.tabTextActive]}>🔶 Foil Consumption Report</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'overview' && (
        <WebCard title={`Salary Advance Report — ${reportMonth}`}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <WebInput label="Select Month (YYYY-MM)" value={reportMonth} onChangeText={setReportMonth} placeholder="YYYY-MM" style={{ width: 200 }} />
            <WebBtn label="🔍 Refresh" onPress={fetchAdvanceReport} variant="primary" style={{ marginTop: 22 }} />
            <WebBtn label="📊 Export Excel" onPress={handleExportAdvanceExcel} variant="success" style={{ marginTop: 22 }} />
            <WebBtn label="📄 Export PDF" onPress={handleExportAdvancePdf} variant="secondary" style={{ marginTop: 22 }} />
          </View>

          {advanceLogs.map((row) => (
            <View key={row._id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{row.workerName}</Text>
                <Text style={styles.rowSub}>Method: {(row.paymentMethod || 'online').toUpperCase()} · Date: {row.date}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={{ fontWeight: '800', fontSize: webFontSize.base }}>₹{row.amountRequested}</Text>
                <WebBadge variant={row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'} label={(row.status || 'pending').toUpperCase()} />
              </View>
            </View>
          ))}
        </WebCard>
      )}

      {activeTab === 'foil' && (
        <WebCard title={`Foil Usage & Variance Report (${foilLogs.length})`}>
          {foilLogs.map((row) => (
            <View key={row.taskId} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{row.productName || row.taskId}</Text>
                <Text style={styles.rowSub}>Worker: {row.workerName || 'Unassigned'} · Expected: {Number(row.expectedUsage || 0).toFixed(2)} KG</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontWeight: '800', color: webColors.primary }}>{Number(row.totalFoilUsed || 0).toFixed(2)} KG</Text>
                <Text style={{ fontSize: 11, color: Number(row.variance) > 0 ? webColors.danger : webColors.success }}>
                  Δ {Number(row.variance || 0).toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </WebCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: webSpacing.lg },
  header: { marginBottom: webSpacing.md },
  headerTitle: { fontSize: webFontSize.title, fontWeight: '800', color: webColors.text },
  headerSubtitle: { fontSize: webFontSize.base, color: webColors.textMuted, marginTop: 4 },
  tabRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: webColors.surface, borderWidth: 1, borderColor: webColors.border },
  tabBtnActive: { backgroundColor: webColors.primary, borderColor: webColors.primary },
  tabText: { fontWeight: '700', color: webColors.text, fontSize: webFontSize.sm },
  tabTextActive: { color: '#ffffff' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: webColors.border },
  rowTitle: { fontWeight: '700', fontSize: webFontSize.base, color: webColors.text },
  rowSub: { fontSize: webFontSize.xs, color: webColors.textMuted, marginTop: 2 },
});

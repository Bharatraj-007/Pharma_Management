import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebCard, WebBadge, WebBtn } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function SalaryManagementScreen({ apiBaseUrl, session }) {
  const token = session?.token;
  const company = session?.company || 'bharath';
  const activeCompany = session?.activeCompany || company;

  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSalaries = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/salary?company=${activeCompany}`, {
        headers: { Authorization: token },
      });
      if (res.ok) setSalaries(await res.json());
    } catch (e) {}
    finally { setLoading(false); }
  }, [apiBaseUrl, token, activeCompany]);

  useEffect(() => { fetchSalaries(); }, [fetchSalaries]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 Salary & Payroll Management</Text>
        <Text style={styles.headerSubtitle}>View monthly salary calculations, advance requests, and payslips.</Text>
      </View>

      <WebCard title={`Salary Records (${salaries.length})`}>
        {loading ? (
          <Text style={{ color: webColors.textMuted }}>⏳ Loading salary records...</Text>
        ) : salaries.length === 0 ? (
          <Text style={{ color: webColors.textMuted }}>No salary records calculated for this period.</Text>
        ) : (
          salaries.map(s => (
            <View key={s._id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{s.worker?.name || 'Employee'}</Text>
                <Text style={styles.rowSub}>Base: ₹{s.baseSalary || 0} · Worked: {s.presentDays || 0} Days · Net Pay: ₹{s.netSalary || 0}</Text>
              </View>
              <WebBadge variant="success" label={`₹${s.netSalary || 0}`} />
            </View>
          ))
        )}
      </WebCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: webSpacing.lg },
  header: { marginBottom: webSpacing.md },
  headerTitle: { fontSize: webFontSize.title, fontWeight: '800', color: webColors.text },
  headerSubtitle: { fontSize: webFontSize.base, color: webColors.textMuted, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: webColors.border },
  rowTitle: { fontWeight: '700', fontSize: webFontSize.base, color: webColors.text },
  rowSub: { fontSize: webFontSize.xs, color: webColors.textMuted, marginTop: 2 },
});

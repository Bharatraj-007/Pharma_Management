import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebCard, WebBadge, WebBtn, WebInput } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function SalaryManagementScreen({ apiBaseUrl, session }) {
  const token = session?.token;

  const [staff, setStaff] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [rate, setRate] = useState('0');
  const [type, setType] = useState('daily');

  const fetchStaff = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBaseUrl}/staff`, { headers: { Authorization: token } });
      if (res.ok) setStaff(await res.json());
    } catch (e) {}
  }, [apiBaseUrl, token]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleSaveRate = async (id) => {
    try {
      const res = await fetch(`${apiBaseUrl}/staff/${id}/salary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ salaryRate: Number(rate), salaryType: type }),
      });
      if (res.ok) {
        alert('Salary rate saved!');
        setEditingId(null);
        fetchStaff();
      }
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 Salary Management & Pay Rates</Text>
        <Text style={styles.headerSubtitle}>Set per-day / per-hour pay rates and view monthly net salary calculations.</Text>
      </View>

      <WebCard title="Staff Pay Rates & Salary Settings">
        {staff.map((st) => (
          <View key={st._id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{st.name}</Text>
              <Text style={styles.rowSub}>Role: {st.role?.toUpperCase()} · Current Pay: ₹{st.salaryRate || 0} / {st.salaryType || 'daily'}</Text>
            </View>

            {editingId === st._id ? (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <WebInput label="Rate ₹" value={rate} onChangeText={setRate} keyboardType="numeric" style={{ width: 100, marginBottom: 0 }} />
                <WebBtn label={type === 'daily' ? 'Per Day' : 'Per Hour'} size="sm" variant="secondary" onPress={() => setType(type === 'daily' ? 'hourly' : 'daily')} />
                <WebBtn label="Save" size="sm" variant="success" onPress={() => handleSaveRate(st._id)} />
                <WebBtn label="Cancel" size="sm" variant="secondary" onPress={() => setEditingId(null)} />
              </View>
            ) : (
              <WebBtn label="Set Rate" size="sm" variant="primary" onPress={() => { setEditingId(st._id); setRate(String(st.salaryRate || 0)); setType(st.salaryType || 'daily'); }} />
            )}
          </View>
        ))}
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

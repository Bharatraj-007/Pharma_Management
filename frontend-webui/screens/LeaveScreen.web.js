import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebCard, WebBadge, WebBtn, WebInput } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function LeaveScreen({ apiBaseUrl, session }) {
  const token = session?.token;
  const role = (session?.role || 'worker').toLowerCase();

  const [leaves, setLeaves] = useState([]);
  const [leaveType, setLeaveType] = useState('Casual');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');

  const fetchLeaves = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/leave`, { headers: { Authorization: token } });
      if (res.ok) setLeaves(await res.json());
    } catch (e) {}
  }, [apiBaseUrl, token]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleApply = async () => {
    if (!reason) return alert('Reason is required');
    try {
      const res = await fetch(`${apiBaseUrl}/api/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ leaveType, startDate, endDate, reason }),
      });
      if (res.ok) {
        alert('Leave application submitted!');
        setReason('');
        fetchLeaves();
      }
    } catch (e) {}
  };

  const handleApprove = async (id, status) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/leave/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchLeaves();
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🗓️ Leave Management</Text>
        <Text style={styles.headerSubtitle}>Apply for leave, track approval status, and manage manager approvals.</Text>
      </View>

      <View style={styles.layout}>
        <WebCard title="➕ Apply for Leave" style={styles.formCard}>
          <WebInput label="Leave Type" value={leaveType} onChangeText={setLeaveType} placeholder="Casual / Medical / Earned" />
          <WebInput label="Start Date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
          <WebInput label="End Date" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
          <WebInput label="Reason *" value={reason} onChangeText={setReason} placeholder="Reason..." />
          <WebBtn label="Submit Leave Application" onPress={handleApply} variant="success" style={{ marginTop: 12 }} />
        </WebCard>

        <WebCard title={`Leave Applications (${leaves.length})`} style={styles.listCard}>
          {leaves.map((item) => (
            <View key={item._id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.applicantName || item.user?.name} — {item.leaveType}</Text>
                <Text style={styles.rowSub}>Dates: {item.startDate} to {item.endDate} · Reason: {item.reason}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <WebBadge variant={item.status === 'Approved' ? 'success' : item.status === 'Rejected' ? 'danger' : 'warning'} label={item.status || 'Pending'} />
                {role !== 'worker' && item.status === 'Pending' && (
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <WebBtn label="✅" size="sm" variant="success" onPress={() => handleApprove(item._id, 'Approved')} />
                    <WebBtn label="❌" size="sm" variant="danger" onPress={() => handleApprove(item._id, 'Rejected')} />
                  </View>
                )}
              </View>
            </View>
          ))}
        </WebCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: webSpacing.lg },
  header: { marginBottom: webSpacing.md },
  headerTitle: { fontSize: webFontSize.title, fontWeight: '800', color: webColors.text },
  headerSubtitle: { fontSize: webFontSize.base, color: webColors.textMuted, marginTop: 4 },
  layout: { flexDirection: 'row', gap: 24, flexWrap: 'wrap' },
  formCard: { width: 340 },
  listCard: { flex: 1, minWidth: 400 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: webColors.border },
  rowTitle: { fontWeight: '700', fontSize: webFontSize.base, color: webColors.text },
  rowSub: { fontSize: webFontSize.xs, color: webColors.textMuted, marginTop: 2 },
});

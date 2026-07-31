import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebCard, WebBadge, WebBtn, WebInput, WebModal } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function LeaveScreen({ apiBaseUrl, session }) {
  const token = session?.token;
  const userRole = (session?.role || 'worker').toLowerCase();
  const company = session?.company || 'bharath';
  const activeCompany = session?.activeCompany || company;

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const isManagerOrAdmin = ['admin', 'manager', 'ceo'].includes(userRole);

  const fetchLeaves = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/leave?company=${activeCompany}`, {
        headers: { Authorization: token },
      });
      if (res.ok) setLeaves(await res.json());
    } catch (e) {}
    finally { setLoading(false); }
  }, [apiBaseUrl, token, activeCompany]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleApplyLeave = async () => {
    if (!reason) return alert('Reason is required');
    try {
      const res = await fetch(`${apiBaseUrl}/api/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ company: activeCompany, startDate, endDate, reason }),
      });
      if (res.ok) {
        alert('Leave request submitted!');
        setReason('');
        fetchLeaves();
      }
    } catch (e) {}
  };

  const handleStatusUpdate = async (id, status) => {
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
        <Text style={styles.headerTitle}>🗓️ Employee Leave Management</Text>
        <Text style={styles.headerSubtitle}>Apply for leave, track approval status, and manage team absence requests.</Text>
      </View>

      <View style={styles.layout}>
        <WebCard title="➕ Request Leave" style={styles.formCard}>
          <WebInput label="Start Date *" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
          <WebInput label="End Date *" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
          <WebInput label="Reason for Leave *" value={reason} onChangeText={setReason} placeholder="Medical / Personal reason..." />
          <WebBtn label="Submit Leave Application" onPress={handleApplyLeave} variant="primary" size="lg" style={{ marginTop: 12 }} />
        </WebCard>

        <WebCard title={`Leave Requests (${leaves.length})`} style={styles.listCard}>
          {loading ? (
            <Text style={{ color: webColors.textMuted }}>⏳ Loading leave requests...</Text>
          ) : leaves.length === 0 ? (
            <Text style={{ color: webColors.textMuted }}>No leave requests found.</Text>
          ) : (
            leaves.map(item => (
              <View key={item._id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.user?.name || 'Employee'}</Text>
                  <Text style={styles.rowSub}>{item.startDate} to {item.endDate} · Reason: {item.reason}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <WebBadge variant={item.status === 'Approved' ? 'success' : item.status === 'Rejected' ? 'danger' : 'warning'} label={item.status || 'Pending'} />
                  {isManagerOrAdmin && item.status === 'Pending' && (
                    <>
                      <WebBtn label="✅" size="sm" variant="success" onPress={() => handleStatusUpdate(item._id, 'Approved')} />
                      <WebBtn label="❌" size="sm" variant="danger" onPress={() => handleStatusUpdate(item._id, 'Rejected')} />
                    </>
                  )}
                </View>
              </View>
            ))
          )}
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
  formCard: { width: 360 },
  listCard: { flex: 1, minWidth: 400 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: webColors.border },
  rowTitle: { fontWeight: '700', fontSize: webFontSize.base, color: webColors.text },
  rowSub: { fontSize: webFontSize.xs, color: webColors.textMuted, marginTop: 2 },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAttendance } from '../../shared/hooks/useAttendance';
import { WebCard, WebBadge, WebBtn, WebInput, WebModal } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function AttendanceScreen({ apiBaseUrl, session }) {
  const token = session?.token;
  const userRole = (session?.role || 'worker').toLowerCase();
  const company = session?.company || 'bharath';
  const activeCompany = session?.activeCompany || company;

  const {
    records,
    workers,
    todayEntry,
    loading,
    error,
    success,
    fetchAttendance,
    checkIn,
    checkOut,
    updateRecord,
  } = useAttendance(apiBaseUrl, token, userRole, company, activeCompany);

  const todayStr = new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState(todayStr);
  const [selectedWorker, setSelectedWorker] = useState('');

  // Override Modal
  const [editingRecord, setEditingRecord] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState('Present');
  const [remarks, setRemarks] = useState('');

  const isManagerOrAdmin = ['admin', 'manager', 'ceo'].includes(userRole);

  const handleFilter = () => {
    fetchAttendance(filterDate, selectedWorker);
  };

  const handleOverrideSave = async () => {
    if (!editingRecord) return;
    try {
      await updateRecord(editingRecord._id, overrideStatus, remarks);
      setEditingRecord(null);
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      {/* Page Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⏱️ Attendance & Employee Logs</Text>
        <Text style={styles.headerSubtitle}>Check-in logs, daily status tracking, and manager overrides.</Text>
      </View>

      {/* Check-In Card for Worker */}
      <WebCard title="Today's Attendance Status">
        <View style={styles.checkInRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateTitle}>{todayStr}</Text>
            {todayEntry ? (
              <Text style={styles.statusSub}>
                Status: <Text style={{ fontWeight: '800', color: webColors.primary }}>{todayEntry.status}</Text>
                {todayEntry.checkInTime ? ` · Checked in at ${new Date(todayEntry.checkInTime).toLocaleTimeString()}` : ''}
              </Text>
            ) : (
              <Text style={styles.statusSub}>You have not marked attendance for today yet.</Text>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {!todayEntry && (
              <WebBtn label="✅ Mark Check-In" onPress={() => checkIn('Office / Plant', '')} variant="success" size="lg" />
            )}
            {todayEntry && !todayEntry.checkOutTime && (
              <WebBtn label="🚪 Mark Check-Out" onPress={() => checkOut()} variant="warning" size="lg" />
            )}
          </View>
        </View>
      </WebCard>

      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      {success ? <View style={styles.successBox}><Text style={styles.successText}>{success}</Text></View> : null}

      {/* Attendance History Table */}
      <WebCard title="Attendance Records & Overrides">
        <View style={styles.filterRow}>
          <WebInput label="Date Filter" value={filterDate} onChangeText={setFilterDate} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
          {isManagerOrAdmin && (
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Filter Worker</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  <TouchableOpacity style={[styles.workerChip, !selectedWorker && styles.workerChipActive]} onPress={() => setSelectedWorker('')}>
                    <Text style={[styles.workerChipText, !selectedWorker && styles.workerChipTextActive]}>All Workers</Text>
                  </TouchableOpacity>
                  {workers.map(w => (
                    <TouchableOpacity
                      key={w._id}
                      style={[styles.workerChip, selectedWorker === w._id && styles.workerChipActive]}
                      onPress={() => setSelectedWorker(w._id)}
                    >
                      <Text style={[styles.workerChipText, selectedWorker === w._id && styles.workerChipTextActive]}>{w.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
          <WebBtn label="🔍 Filter" onPress={handleFilter} variant="primary" style={{ marginTop: 20 }} />
        </View>

        <View style={{ marginTop: 16 }}>
          {loading ? (
            <Text style={{ color: webColors.textMuted }}>⏳ Loading attendance records...</Text>
          ) : records.length === 0 ? (
            <Text style={{ color: webColors.textMuted }}>No attendance records found for this date.</Text>
          ) : (
            records.map(rec => {
              const statusVariant = rec.status === 'Present' ? 'success' : rec.status === 'Absent' ? 'danger' : 'warning';
              return (
                <View key={rec._id} style={styles.tableRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{rec.user?.name || 'Employee'}</Text>
                    <Text style={styles.rowSub}>Date: {rec.date} · In: {rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString() : 'N/A'} · Out: {rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString() : 'N/A'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <WebBadge variant={statusVariant} label={rec.status || 'Present'} />
                    {isManagerOrAdmin && (
                      <WebBtn label="✏️ Override" size="sm" variant="secondary" onPress={() => { setEditingRecord(rec); setOverrideStatus(rec.status); }} />
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </WebCard>

      {/* Override Modal */}
      <WebModal visible={Boolean(editingRecord)} title="✏️ Edit Attendance Record" onClose={() => setEditingRecord(null)}>
        <Text style={styles.modalSub}>Editing record for <Text style={{ fontWeight: '800' }}>{editingRecord?.user?.name}</Text></Text>

        <Text style={{ fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 12 }}>Set Status</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {['Present', 'Absent', 'Half Day', 'Leave'].map(st => (
            <TouchableOpacity
              key={st}
              style={[styles.workerChip, overrideStatus === st && styles.workerChipActive]}
              onPress={() => setOverrideStatus(st)}
            >
              <Text style={[styles.workerChipText, overrideStatus === st && styles.workerChipTextActive]}>{st}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <WebInput label="Remarks / Reason" value={remarks} onChangeText={setRemarks} placeholder="Reason for override..." />
        <WebBtn label="💾 Save Status Override" onPress={handleOverrideSave} variant="primary" style={{ marginTop: 12 }} />
      </WebModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: webSpacing.lg },
  header: { marginBottom: webSpacing.xs },
  headerTitle: { fontSize: webFontSize.title, fontWeight: '800', color: webColors.text },
  headerSubtitle: { fontSize: webFontSize.base, color: webColors.textMuted, marginTop: 4 },
  checkInRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateTitle: { fontSize: 18, fontWeight: '800', color: webColors.text },
  statusSub: { fontSize: 14, color: webColors.textMuted, marginTop: 4 },
  filterRow: { flexDirection: 'row', gap: 16, alignItems: 'center', flexWrap: 'wrap' },
  inputLabel: { fontSize: 12, fontWeight: '600', color: webColors.text, marginBottom: 4 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: webColors.border },
  rowTitle: { fontWeight: '800', fontSize: 14, color: webColors.text },
  rowSub: { fontSize: 12, color: webColors.textMuted, marginTop: 2 },
  errorBox: { padding: 12, borderRadius: 8, backgroundColor: webColors.dangerLight, marginBottom: 12 },
  errorText: { color: webColors.dangerDark, fontWeight: '700' },
  successBox: { padding: 12, borderRadius: 8, backgroundColor: webColors.successLight, marginBottom: 12 },
  successText: { color: webColors.successDark, fontWeight: '700' },
  workerChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: webColors.surfaceAlt, borderWidth: 1, borderColor: webColors.border },
  workerChipActive: { backgroundColor: webColors.primary, borderColor: webColors.primary },
  workerChipText: { fontSize: 12, color: webColors.text, fontWeight: '600' },
  workerChipTextActive: { color: '#ffffff', fontWeight: '800' },
  modalSub: { fontSize: 14, color: webColors.textMuted },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAttendance } from '../../shared/hooks/useAttendance';
import { WebCard, WebBadge, WebBtn, WebInput } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function AttendanceScreen({ apiBaseUrl, session }) {
  const token = session?.token;
  const role = (session?.role || 'worker').toLowerCase();
  const userName = session?.name || 'Worker';

  const {
    records,
    workers,
    todayEntry,
    loading,
    error,
    success,
    today,
    fetchRecords,
    submitCheckInOrOut,
    managerMarkAttendance,
  } = useAttendance(apiBaseUrl, token, role, userName);

  const [filterDate, setFilterDate] = useState(today);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Manager Form State
  const [targetWorker, setTargetWorker] = useState('');
  const [markStatus, setMarkStatus] = useState('Present');
  const [markNotes, setMarkNotes] = useState('');

  const filteredRecords = records.filter((r) => {
    const matchesStatus = !filterStatus || (r.status || '').toLowerCase() === filterStatus.toLowerCase();
    const matchesSearch = !searchQuery || (r.workerName || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleManagerMark = async () => {
    if (!targetWorker) return alert('Select a worker');
    await managerMarkAttendance(targetWorker, markStatus, markNotes, filterDate);
    setTargetWorker(''); setMarkNotes('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⏱️ Attendance Management</Text>
        <Text style={styles.headerSubtitle}>Check-in/out, manager override, attendance logs, and employee filters.</Text>
      </View>

      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      {success ? <View style={styles.successBox}><Text style={styles.successText}>{success}</Text></View> : null}

      {/* Self Check-in Card (Worker or All) */}
      <WebCard title={`Self Attendance — ${today}`} style={{ marginBottom: 16 }}>
        <Text style={styles.infoText}>Status today: <Text style={{ fontWeight: '800', color: webColors.primary }}>{todayEntry ? todayEntry.status : 'Not marked'}</Text></Text>
        {todayEntry && <Text style={styles.infoText}>Check-in: {todayEntry.checkIn || '—'} · Check-out: {todayEntry.checkOut || '—'}</Text>}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <WebBtn
            label={todayEntry?.checkIn ? 'Checked In ✓' : '🟢 Check In'}
            onPress={() => submitCheckInOrOut('present')}
            variant="success"
            disabled={!!todayEntry?.checkIn}
          />
          <WebBtn
            label="🔴 Check Out"
            onPress={() => submitCheckInOrOut('checkout')}
            variant="secondary"
            disabled={!todayEntry?.checkIn || !!todayEntry?.checkOut}
          />
        </View>
      </WebCard>

      {/* Manager Mark Form */}
      {role !== 'worker' && (
        <WebCard title="✏️ Manager Mark Attendance" style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Select Worker *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {workers.map((w) => (
                    <WebBtn
                      key={w._id}
                      label={w.name}
                      size="sm"
                      variant={targetWorker === w.name ? 'primary' : 'secondary'}
                      onPress={() => setTargetWorker(w.name)}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
            <WebInput label="Status" value={markStatus} onChangeText={setMarkStatus} placeholder="Present/Absent/Half Day" style={{ width: 180 }} />
            <WebInput label="Notes" value={markNotes} onChangeText={setMarkNotes} placeholder="Remarks..." style={{ flex: 1 }} />
            <WebBtn label="Mark Attendance" onPress={handleManagerMark} variant="success" style={{ marginTop: 22 }} />
          </View>
        </WebCard>
      )}

      {/* Filter & Logs */}
      <WebCard title={`Attendance Logs (${filteredRecords.length})`}>
        <View style={styles.filterRow}>
          <WebInput label="Filter Date" value={filterDate} onChangeText={(d) => { setFilterDate(d); fetchRecords(d); }} placeholder="YYYY-MM-DD" style={{ width: 160 }} />
          <WebInput label="Search Employee" value={searchQuery} onChangeText={setSearchQuery} placeholder="Search name..." style={{ flex: 1 }} />
          <WebBtn label="Refresh" onPress={() => fetchRecords(filterDate)} variant="primary" style={{ marginTop: 22 }} />
        </View>

        {filteredRecords.map((r) => (
          <View key={r._id} style={styles.tableRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{r.workerName}</Text>
              <Text style={styles.rowSub}>Date: {r.date} · In: {r.checkIn || '—'} · Out: {r.checkOut || '—'} · Hours: {r.hoursWorked || 0}h</Text>
            </View>
            <WebBadge variant={r.status === 'Present' ? 'success' : r.status === 'Absent' ? 'danger' : 'warning'} label={r.status} />
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
  infoText: { fontSize: webFontSize.base, color: webColors.text, marginBottom: 4 },
  label: { fontSize: webFontSize.xs, fontWeight: '600', color: webColors.text, marginBottom: 6 },
  filterRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: webColors.border },
  rowTitle: { fontWeight: '700', fontSize: webFontSize.base, color: webColors.text },
  rowSub: { fontSize: webFontSize.xs, color: webColors.textMuted, marginTop: 2 },
  errorBox: { padding: 12, borderRadius: 8, backgroundColor: webColors.dangerLight, marginBottom: 12 },
  errorText: { color: webColors.dangerDark, fontWeight: '700' },
  successBox: { padding: 12, borderRadius: 8, backgroundColor: webColors.successLight, marginBottom: 12 },
  successText: { color: webColors.successDark, fontWeight: '700' },
});

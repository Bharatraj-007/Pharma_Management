import React, { useEffect, useState, useCallback, useContext, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Alert } from 'react-native';
import { AuthContext } from '../navigation/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import API_BASE_URL from '../config';
import ScreenWrapper from '../components/ScreenWrapper';
import { exportToExcel, exportToPDF } from '../utils/reportExporter';
import {
  Card, CardHeader, CardTitle, Badge, AlertBanner,
  Btn, Input, Spinner, EmptyState, StatCard,
} from '../components/ui';
import { colors, spacing, fontSize, statusBadgeVariant, pageStyles } from '../styles/theme';

const STATUS_OPTIONS = [
  { value: 'Present', label: '✅ Present' },
  { value: 'Absent', label: '❌ Absent' },
  { value: 'Half Day', label: '⏰ Half Day' },
];

const EDIT_STATUS_OPTIONS = [
  { value: 'Present', label: 'Present' },
  { value: 'Early', label: 'Early' },
  { value: 'On Time', label: 'On Time' },
  { value: 'Late', label: 'Late' },
  { value: 'Absent', label: 'Absent' },
  { value: 'Half Day', label: 'Half Day' },
  { value: 'Leave', label: 'Leave' },
];

function ChipRow({ options, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
      <View style={{ flexDirection: 'row', gap: spacing[2] }}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <View key={opt.value}
              style={[ch.chip, active && ch.active]}
              onStartShouldSetResponder={() => true}
              onResponderRelease={() => onChange(opt.value)}
            >
              <Text style={[ch.text, active && ch.activeText]}>{opt.label}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const ch = StyleSheet.create({
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { fontSize: fontSize.sm, color: colors.text },
  activeText: { color: '#fff', fontWeight: '700' },
});

export default function AttendanceScreen() {
  const { session } = useContext(AuthContext);
  const { role, isRole } = usePermissions();
  const token = session?.token;
  const userName = session?.name || 'Worker';
  const isAdminOrCeo = ['admin', 'ceo'].includes(role);

  const [records, setRecords] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [todayEntry, setTodayEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Clock state
  const [currentTime, setCurrentTime] = useState('');

  // Manager mark form state
  const [markForm, setMarkForm] = useState({ workerName: '', status: 'Present', notes: '' });
  const [marking, setMarking] = useState(false);
  const setMF = (k) => (v) => setMarkForm((p) => ({ ...p, [k]: v }));

  // Table Date Filter (defaults to today)
  const today = new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState(today);

  // Report export state
  const firstDayOfMonth = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  })();
  const [exportFromDate, setExportFromDate] = useState(firstDayOfMonth);
  const [exportToDate, setExportToDate] = useState(today);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/attendance?from=${exportFromDate}&to=${exportToDate}`, {
        headers: { Authorization: token }
      });
      if (!res.ok) throw new Error("Failed to fetch records for range.");
      const data = await res.json();
      const records = Array.isArray(data) ? data : [];
      
      if (records.length === 0) {
        Alert.alert("No Records", "There are no attendance records within the selected date range.");
        return;
      }

      if (format === 'excel') {
        await exportToExcel(records, exportFromDate, exportToDate);
      } else if (format === 'pdf') {
        await exportToPDF(records, exportFromDate, exportToDate);
      }
    } catch (err) {
      Alert.alert("Export Error", err.message || "Something went wrong during export.");
    } finally {
      setExporting(false);
    }
  };

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({
    status: '',
    checkIn: '',
    checkOut: '',
    extraHours: '0',
    notes: '',
    empNo: '',
  });

  const headers = { 'Content-Type': 'application/json', Authorization: token };

  // 1. Real-time running clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-GB', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fetch records
  const fetchRecords = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/attendance?date=${filterDate}`, { headers: { Authorization: token } });
      if (!res.ok) throw new Error('Unable to load attendance.');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setRecords(list);
      
      // Update today's self-entry if filtering today
      if (filterDate === today) {
        setTodayEntry(list.find((r) => r.workerName === userName) || null);
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [filterDate, token, userName, today]);

  // 3. Fetch workers list (managers, admins, ceos)
  const fetchWorkers = useCallback(async () => {
    if (role === 'worker') return;
    try {
      const res = await fetch(`${API_BASE_URL}/workers`, { headers: { Authorization: token } });
      if (res.ok) setWorkers(await res.json());
    } catch {}
  }, [token, role]);

  useEffect(() => {
    if (token) {
      fetchRecords();
      fetchWorkers();
    }
  }, [token, filterDate]);

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  // 4. Worker Self Check-In / Check-Out
  const submitAttendance = async (status) => {
    setActionLoading(true); setError(''); setSuccess('');
    try {
      const body = {
        workerName: userName,
        date: today,
        status: status === 'checkout' ? 'checkout' : 'Present',
      };
      const res = await fetch(`${API_BASE_URL}/attendance`, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Operation failed.');
      
      flash(status === 'checkout' ? 'Checked out successfully! ✅' : 'Checked in successfully! ✅');
      fetchRecords();
    } catch (err) {
      setError(err.message);
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Manager Mark Attendance (Check-In)
  const markAttendance = async () => {
    if (!markForm.workerName) { setError('Select a worker.'); return; }
    setMarking(true); setError(''); setSuccess('');
    try {
      const body = {
        workerName: markForm.workerName,
        date: today,
        status: markForm.status,
        notes: markForm.notes,
      };
      const res = await fetch(`${API_BASE_URL}/attendance`, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to mark attendance.');
      
      flash('Attendance marked successfully! ✅');
      setMarkForm({ workerName: '', status: 'Present', notes: '' });
      fetchRecords();
    } catch (err) {
      setError(err.message);
      Alert.alert('Error', err.message);
    } finally {
      setMarking(false);
    }
  };

  // 6. Handle Check-Out for Table Row
  const handleRowCheckOut = async (record) => {
    setActionLoading(true); setError(''); setSuccess('');
    try {
      const body = {
        workerName: record.workerName,
        date: record.date,
        status: 'checkout',
      };
      const res = await fetch(`${API_BASE_URL}/attendance`, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Check-out failed.');
      
      flash('Checked out successfully! ✅');
      fetchRecords();
    } catch (err) {
      setError(err.message);
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Delete Record (Admin/CEO only)
  const handleDeleteRecord = (id) => {
    Alert.alert('Delete Record', 'Are you sure you want to delete this attendance record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setError(''); setSuccess('');
        try {
          const res = await fetch(`${API_BASE_URL}/attendance/${id}`, { method: 'DELETE', headers });
          if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            throw new Error(d.error || 'Delete failed');
          }
          flash('Attendance record deleted.');
          fetchRecords();
        } catch (err) { Alert.alert('Error', err.message); }
      }},
    ]);
  };

  // 8. Save Edited Record (Admin/CEO only)
  const saveEditedRecord = async () => {
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/${editingRecord._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          status: editForm.status,
          checkIn: editForm.checkIn || null,
          checkOut: editForm.checkOut || null,
          notes: editForm.notes,
          extraHours: Number(editForm.extraHours || 0),
          empNo: editForm.empNo,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update record.');
      
      flash('Record updated successfully.');
      setEditingRecord(null);
      fetchRecords();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // Stats calculation
  const summary = records.reduce(
    (acc, r) => {
      const st = (r.status || '').toLowerCase();
      if (['present', 'early', 'on time', 'late', 'on-time'].includes(st)) acc.present++;
      else if (st === 'absent') acc.absent++;
      else if (st === 'leave') acc.leave++;
      acc.totalHours += r.totalHours || r.hoursWorked || 0;
      acc.totalPay += r.earnings || 0;
      return acc;
    },
    { present: 0, absent: 0, leave: 0, totalHours: 0, totalPay: 0 },
  );

  return (
    <ScreenWrapper refreshing={loading} onRefresh={fetchRecords}>
      <View style={pageStyles.header}>
        <Text style={pageStyles.title}>⏱️ Attendance</Text>
        <Text style={pageStyles.subtitle}>
          {role === 'worker'
            ? 'Mark your attendance and view history.'
            : 'View and manage team attendance.'}
        </Text>
      </View>

      <AlertBanner type="danger" message={error} />
      <AlertBanner type="success" message={success} />

      {/* Stats Summary Cards */}
      <View style={{ marginBottom: spacing[4] }}>
        <View style={[s.row, { gap: spacing[2], marginBottom: spacing[2] }]}>
          <StatCard value={summary.present} label="Present" color={colors.success} style={{ flex: 1 }} />
          <StatCard value={summary.absent} label="Absent" color={colors.danger} style={{ flex: 1 }} />
          <StatCard value={summary.leave} label="Leave" color={colors.primary} style={{ flex: 1 }} />
        </View>
        <View style={[s.row, { gap: spacing[2] }]}>
          <StatCard value={`${summary.totalHours.toFixed(1)}h`} label="Hours" color={colors.text} style={{ flex: 1 }} />
          {/* Custom green card for Pay */}
          <Card style={{ flex: 1, backgroundColor: '#10b981', alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff' }}>₹{Math.round(summary.totalPay)}</Text>
            <Text style={{ fontSize: fontSize.xs, color: '#fff', opacity: 0.8, marginTop: 2 }}>Total Pay</Text>
          </Card>
        </View>
      </View>

      {/* Date filter dropdown */}
      <Card style={{ marginBottom: spacing[4], flexDirection: 'row', alignItems: 'center', gap: spacing[3], justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Selected Date</Text>
          <Input
            value={filterDate}
            onChangeText={setFilterDate}
            placeholder="YYYY-MM-DD"
            style={{ marginBottom: 0 }}
          />
        </View>
        <Btn label="Refresh" onPress={fetchRecords} style={{ marginTop: 14 }} />
      </Card>

      {/* Export Report Card */}
      <Card style={{ marginBottom: spacing[4] }}>
        <CardTitle style={{ marginBottom: spacing[2] }}>📊 Export Attendance Report</CardTitle>
        <View style={[s.row, { gap: spacing[2], marginBottom: spacing[3] }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>From Date</Text>
            <Input
              value={exportFromDate}
              onChangeText={setExportFromDate}
              placeholder="YYYY-MM-DD"
              style={{ marginBottom: 0 }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>To Date</Text>
            <Input
              value={exportToDate}
              onChangeText={setExportToDate}
              placeholder="YYYY-MM-DD"
              style={{ marginBottom: 0 }}
            />
          </View>
        </View>
        <View style={[s.row, { gap: spacing[2] }]}>
          <Btn
            label={exporting ? "⏳ Exporting..." : "Download as Excel"}
            onPress={() => handleExport('excel')}
            variant="primary"
            style={{ flex: 1 }}
            disabled={exporting}
          />
          <Btn
            label={exporting ? "⏳ Exporting..." : "Download as PDF"}
            onPress={() => handleExport('pdf')}
            variant="secondary"
            style={{ flex: 1 }}
            disabled={exporting}
          />
        </View>
      </Card>

      {/* Today status + worker actions */}
      {role === 'worker' && filterDate === today && (
        <Card style={{ marginBottom: spacing[4] }}>
          <CardTitle>Mark Attendance — {today}</CardTitle>
          <Text style={s.muted}>Current Time: <Text style={s.bold}>{currentTime || '—'}</Text></Text>
          <Text style={s.muted}>Status: <Text style={[s.bold, { color: colors.primary }]}>{todayEntry ? todayEntry.status : 'Not marked'}</Text></Text>
          {todayEntry && (
            <Text style={s.muted}>
              Check-in: {todayEntry.checkIn || '—'} · Check-out: {todayEntry.checkOut || '—'}
            </Text>
          )}
          <View style={[s.row, { marginTop: spacing[3], gap: spacing[2] }]}>
            <Btn
              label={actionLoading ? '…' : (todayEntry?.checkIn ? 'Checked In ✓' : 'Check In')}
              onPress={() => submitAttendance('present')}
              variant="success" size="sm"
              disabled={actionLoading || !!todayEntry?.checkIn}
              style={{ flex: 1 }}
            />
            <Btn
              label={actionLoading ? '…' : 'Check Out'}
              onPress={() => submitAttendance('checkout')}
              variant="secondary" size="sm"
              disabled={actionLoading || !todayEntry?.checkIn || !!todayEntry?.checkOut}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      )}

      {/* Manager mark form */}
      {role !== 'worker' && filterDate === today && (
        <Card style={{ marginBottom: spacing[4] }}>
          <CardTitle>✏️ Mark Attendance</CardTitle>
          <Text style={s.muted}>Current Time: <Text style={s.bold}>{currentTime || '—'}</Text></Text>

          <Text style={[s.label, { marginTop: spacing[3] }]}>Worker *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              {workers.map((w) => (
                <View key={w._id}
                  style={[ch.chip, markForm.workerName === w.name && ch.active]}
                  onStartShouldSetResponder={() => true}
                  onResponderRelease={() => setMF('workerName')(w.name)}
                >
                  <Text style={[ch.text, markForm.workerName === w.name && ch.activeText]}>
                    {w.name} ({w.role})
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <Text style={s.label}>Status *</Text>
          <ChipRow options={STATUS_OPTIONS} value={markForm.status} onChange={setMF('status')} />

          <Input label="Notes" value={markForm.notes} onChangeText={setMF('notes')} placeholder="Remarks…" />

          <Btn
            label={marking ? '⏳ Marking…' : '✅ Mark Attendance (Check-In)'}
            onPress={markAttendance} loading={marking} variant="success" block size="lg"
          />
        </Card>
      )}

      {/* Records list */}
      <Card style={{ marginBottom: spacing[6] }}>
        <CardHeader>
          <CardTitle style={{ marginBottom: 0 }}>
            {role === 'worker' ? 'Your History' : 'Attendance Records'}
          </CardTitle>
        </CardHeader>

        {loading ? <Spinner /> : records.length === 0 ? (
          <EmptyState message="No attendance records found." />
        ) : (
          records.map((rec) => (
            <View key={rec._id} style={s.recCard}>
              <View style={[s.row, { justifyContent: 'space-between', marginBottom: 4 }]}>
                <Text style={s.recName}>{rec.workerName}</Text>
                <Badge variant={statusBadgeVariant(rec.status)} label={rec.status} />
              </View>
              <Text style={s.muted}>Date: {rec.date}</Text>
              <Text style={s.muted}>In: {rec.checkIn || '—'}  ·  Out: {rec.checkOut || '—'}</Text>
              <Text style={s.muted}>Hours: {rec.hoursWorked ? `${rec.hoursWorked.toFixed(2)}h` : '—'} · Earnings: ₹{rec.earnings ? Math.round(rec.earnings) : 0}</Text>
              {rec.remarks ? <Text style={[s.muted, { fontStyle: 'italic' }]}>Notes: {rec.remarks}</Text> : null}

              {/* Actions row */}
              <View style={[s.row, { marginTop: spacing[3], gap: spacing[2], justifyContent: 'flex-end' }]}>
                {rec.checkIn && !rec.checkOut && (
                  <Btn
                    label="Check Out"
                    size="sm"
                    variant="success"
                    onPress={() => handleRowCheckOut(rec)}
                    disabled={actionLoading}
                  />
                )}
                {isAdminOrCeo ? (
                  <>
                    <Btn
                      label="Edit"
                      size="sm"
                      variant="warning"
                      onPress={() => {
                        setEditingRecord(rec);
                        setEditForm({
                          status: rec.status,
                          checkIn: rec.checkIn || '',
                          checkOut: rec.checkOut || '',
                          extraHours: String(rec.extraHours || 0),
                          notes: rec.remarks || '',
                          empNo: rec.empNo || '',
                        });
                      }}
                    />
                    <Btn
                      label="Delete"
                      size="sm"
                      variant="danger"
                      onPress={() => handleDeleteRecord(rec._id)}
                    />
                  </>
                ) : (
                  role !== 'worker' && <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>No edit rights</Text>
                )}
              </View>
            </View>
          ))
        )}
      </Card>

      {/* Edit Attendance Modal (Admin/CEO only) */}
      {editingRecord && (
        <Modal visible={!!editingRecord} animationType="slide" transparent>
          <View style={s.modalOverlay}>
            <Card style={s.modalCard}>
              <ScrollView>
                <CardTitle style={{ marginBottom: spacing[4] }}>Edit Attendance: {editingRecord.workerName}</CardTitle>
                
                <Input
                  label="Emp No"
                  value={editForm.empNo}
                  onChangeText={(val) => setEditForm((p) => ({ ...p, empNo: val }))}
                />

                <Text style={s.label}>Status</Text>
                <ChipRow
                  options={EDIT_STATUS_OPTIONS}
                  value={editForm.status}
                  onChange={(val) => setEditForm((p) => ({ ...p, status: val }))}
                />

                <Input
                  label="Check In Time (HH:MM:SS)"
                  value={editForm.checkIn}
                  placeholder="e.g. 09:00:00"
                  onChangeText={(val) => setEditForm((p) => ({ ...p, checkIn: val }))}
                />

                <Input
                  label="Check Out Time (HH:MM:SS)"
                  value={editForm.checkOut}
                  placeholder="e.g. 17:00:00"
                  onChangeText={(val) => setEditForm((p) => ({ ...p, checkOut: val }))}
                />

                <Input
                  label="Extra Hours"
                  value={editForm.extraHours}
                  keyboardType="numeric"
                  onChangeText={(val) => setEditForm((p) => ({ ...p, extraHours: val }))}
                />

                <Input
                  label="Notes"
                  value={editForm.notes}
                  onChangeText={(val) => setEditForm((p) => ({ ...p, notes: val }))}
                />

                <View style={[s.row, { gap: spacing[3], marginTop: spacing[3] }]}>
                  <Btn label="Save" variant="success" onPress={saveEditedRecord} style={{ flex: 1 }} />
                  <Btn label="Cancel" variant="secondary" onPress={() => setEditingRecord(null)} style={{ flex: 1 }} />
                </View>
              </ScrollView>
            </Card>
          </View>
        </Modal>
      )}
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  muted: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  bold: { fontWeight: '700', color: colors.text },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing[1] },
  row: { flexDirection: 'row', alignItems: 'center' },
  recCard: { paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border },
  recName: { fontWeight: '700', color: colors.text, fontSize: fontSize.base },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing[4],
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '90%',
  },
});

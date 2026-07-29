/**
 * WorkerDashboard — full task start/complete flow for workers.
 * Uses expo-camera for QR scanning instead of html5-qrcode.
 */
import React, { useEffect, useState, useCallback, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, Alert, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AuthContext } from '../../navigation/AuthContext';
import API_BASE_URL from '../../config';
import ScreenWrapper from '../../components/ScreenWrapper';
import { Card, CardHeader, CardTitle, Badge, AlertBanner, Btn, Input, Spinner, EmptyState } from '../../components/ui';
import { colors, spacing, fontSize, statusBadgeVariant } from '../../styles/theme';

// ── QR Scanner Modal ──────────────────────────────────────────────────────────
function QRScannerModal({ visible, onScanned, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const scanned = useRef(false);

  useEffect(() => {
    if (visible) {
      scanned.current = false;
      if (!permission?.granted) requestPermission();
    }
  }, [visible]);

  const handleBarcode = ({ data }) => {
    if (scanned.current) return;
    scanned.current = true;
    onScanned(data);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={sc.modal}>
        <Text style={sc.title}>Scan Foil QR Code</Text>
        {permission?.granted ? (
          <CameraView
            style={sc.camera}
            facing="back"
            onBarcodeScanned={handleBarcode}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          />
        ) : (
          <View style={sc.noCamera}>
            <Text style={{ color: colors.textMuted, marginBottom: spacing[3] }}>
              Camera permission is required to scan QR codes.
            </Text>
            <Btn label="Grant Permission" onPress={requestPermission} />
          </View>
        )}
        <Btn label="Cancel" onPress={onClose} variant="secondary" style={{ margin: spacing[4] }} />
      </View>
    </Modal>
  );
}

const sc = StyleSheet.create({
  modal:    { flex: 1, backgroundColor: '#000' },
  title:    { color: '#fff', fontSize: fontSize.xl, fontWeight: '700', textAlign: 'center', padding: spacing[4] },
  camera:   { flex: 1 },
  noCamera: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[5] },
});

// ── FoilUsage summary ─────────────────────────────────────────────────────────
function FoilUsageSummary({ task }) {
  const usage = task.foilUsage || [];
  if (!usage.length) return null;
  const total = usage.reduce((s, e) => s + Number(e.usedWeight || 0), 0);
  return (
    <Card alt condensed style={{ marginTop: spacing[3] }}>
      <Text style={{ fontWeight: '700', color: colors.text, marginBottom: spacing[1] }}>Foil Usage</Text>
      {usage.map((entry, i) => (
        <Text key={entry._id || i} style={{ fontSize: fontSize.sm, color: colors.textMuted, marginBottom: 2 }}>
          Colour {entry.colourNumber}{entry.isSwap ? ' (swap)' : ''}: {entry.foilQrPayload}
          {'  ·  '}Used {Number(entry.usedWeight || 0).toFixed(2)} KG
          {'  ·  '}Remaining {Number(entry.remainingWeight ?? entry.startWeight ?? 0).toFixed(2)} KG
        </Text>
      ))}
      <Text style={{ fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginTop: spacing[1] }}>
        Total: {total.toFixed(2)} KG
      </Text>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WorkerDashboard() {
  const { session, signOut } = useContext(AuthContext);
  const token       = session?.token;
  const workerName  = session?.name || '';

  const [tasks,    setTasks]   = useState([]);
  const [loading,  setLoading] = useState(true);
  const [alerts,   setAlerts]  = useState({});   // taskId → { type, message }

  // QR scan state
  const [scanVisible,  setScanVisible]  = useState(false);
  const [scanTarget,   setScanTarget]   = useState(null);  // { taskId, colourNumber, resolve }
  const scanResolvers  = useRef({});

  // Completion form state per task
  const [completeForms, setCompleteForms] = useState({});  // taskId → { usedKg, wasteKg, remainingKg }
  const [showComplete,  setShowComplete]  = useState({});  // taskId → bool

  // Salary & Advance — fetch from real attendance endpoint
  const [showSalary, setShowSalary] = useState(false);
  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [salaryDetails, setSalaryDetails] = useState(null);
  const [salaryLoading, setSalaryLoading] = useState(false);

  const fetchSalaryDetails = useCallback(async () => {
    if (!token) return;
    setSalaryLoading(true);
    try {
      // Derive date range from selected month
      const [year, month] = salaryMonth.split('-');
      const from = `${year}-${month}-01`;
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const to = `${year}-${month}-${String(lastDay).padStart(2,'0')}`;

      const res = await fetch(
        `${API_BASE_URL}/attendance?from=${from}&to=${to}`,
        { headers: { Authorization: token } }
      );
      if (!res.ok) throw new Error('Failed to load salary data');
      const records = await res.json();

      // Calculate summary from attendance records
      const present   = records.filter(r => r.status === 'present' || r.status === 'late').length;
      const absent    = records.filter(r => r.status === 'absent').length;
      const halfDay   = records.filter(r => r.status === 'half-day').length;
      const totalHrs  = records.reduce((s, r) => s + (r.hoursWorked || 0), 0);
      const totalOT   = records.reduce((s, r) => s + (r.overtime || 0), 0);
      const totalPay  = records.reduce((s, r) => s + (r.earnings || 0), 0);

      setSalaryDetails({ present, absent, halfDay, totalHrs, totalOT, totalPay, records });
    } catch (err) {
      console.error(err);
    } finally {
      setSalaryLoading(false);
    }
  }, [token, salaryMonth]);

  useEffect(() => {
    if (showSalary) fetchSalaryDetails();
  }, [showSalary, salaryMonth, fetchSalaryDetails]);

  // ── Load tasks ──────────────────────────────────────────────────────────────
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🔍 Attempting to fetch tasks from:', `${API_BASE_URL}/tasks`);
      const res  = await fetch(`${API_BASE_URL}/tasks`, { headers: { Authorization: token } });
      console.log('📡 Response status:', res.status);

      if (!res.ok) {
        let errorMsg = `HTTP Error ${res.status}`;
        try {
          const errData = await res.json();
          errorMsg = errData.error || errData.message || errorMsg;
        } catch {
          const text = await res.text().catch(() => '');
          if (text) errorMsg = text;
        }

        if (res.status === 401 || res.status === 403) {
          console.warn('🔒 Auth token missing or expired:', errorMsg);
          setTasks([]);
          await signOut();
          return;
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      const all  = Array.isArray(data) ? data : [];
      setTasks(workerName ? all.filter((t) => t.worker_name === workerName) : all);
      console.log('✅ Tasks loaded:', all.length);
    } catch (err) {
      console.error('❌ Load tasks error:', err);
      console.error('❌ Error details:', {
        message: err.message,
        name: err.name,
        stack: err.stack,
        url: `${API_BASE_URL}/tasks`
      });
      Alert.alert(
        'Connection Error',
        `Cannot reach backend at ${API_BASE_URL}\n\nError: ${err.message}\n\nMake sure:\n1. Phone & laptop are on same Wi-Fi\n2. Backend is running on laptop\n3. No firewall blocking port 5001`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, [token, workerName, signOut]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // ── Alerts helpers ──────────────────────────────────────────────────────────
  const setAlert = (taskId, type, message) =>
    setAlerts((prev) => ({ ...prev, [taskId]: { type, message } }));
  const clearAlert = (taskId) =>
    setAlerts((prev) => { const n = { ...prev }; delete n[taskId]; return n; });

  // ── Scan a QR for a specific colour — returns a Promise<string> ─────────────
  const scanForColour = (taskId, colourNumber) =>
    new Promise((resolve) => {
      scanResolvers.current = { resolve };
      setScanTarget({ taskId, colourNumber });
      setScanVisible(true);
    });

  const handleScanned = (data) => {
    setScanVisible(false);
    scanResolvers.current?.resolve?.(data);
    scanResolvers.current = {};
  };

  // ── Start task ──────────────────────────────────────────────────────────────
  const startTask = async (task) => {
    clearAlert(task._id);
    const colourCount = Number(task.colourCount || 1);
    const foilScans   = [];

    for (let c = 1; c <= colourCount; c++) {
      const payload = await scanForColour(task._id, c);
      if (!payload?.trim()) {
        setAlert(task._id, 'danger', `Foil QR is required for Colour ${c}.`);
        return;
      }
      foilScans.push({ colourNumber: c, qrPayload: payload.trim() });
    }

    try {
      const form = new FormData();
      form.append('foilScans', JSON.stringify(foilScans));

      const resp = await fetch(`${API_BASE_URL}/tasks/${task._id}/start`, {
        method: 'POST',
        headers: { Authorization: token },
        body: form,
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || data.message || 'Failed to start task');
      setAlert(task._id, 'success', data.message || 'Task started ✅');
      loadTasks();
    } catch (err) {
      setAlert(task._id, 'danger', err.message);
    }
  };

  // ── Complete task ───────────────────────────────────────────────────────────
  const completeTask = async (task) => {
    clearAlert(task._id);
    const usage = task.foilUsage || [];
    if (!usage.length) {
      setAlert(task._id, 'danger', 'Start the task and scan foil rolls before completing it.');
      return;
    }

    const cf = completeForms[task._id] || {};
    if (!cf.usedKg || !cf.wasteKg || !cf.remainingKg) {
      setAlert(task._id, 'danger', 'Please fill Used KG, Waste KG, and Remaining KG.');
      return;
    }

    // Ask user for per-roll used weight via Alert prompts
    const foilUsage = [];
    const totalUsed   = Number(cf.usedKg);
    const defaultPer  = usage.length ? Number((totalUsed / usage.length).toFixed(3)) : 0;

    for (const entry of usage) {
      await new Promise((resolve) => {
        Alert.prompt(
          `Colour ${entry.colourNumber}${entry.isSwap ? ' (swap)' : ''} — Used KG`,
          entry.foilQrPayload || '',
          (val) => {
            foilUsage.push({ usageId: entry._id, usedWeight: Number(val ?? defaultPer) });
            resolve();
          },
          'plain-text',
          String(defaultPer),
          'numeric',
        );
      });
    }

    try {
      const form = new FormData();
      form.append('used_kg',    cf.usedKg);
      form.append('waste_kg',   cf.wasteKg);
      form.append('remaining_kg', cf.remainingKg);
      form.append('foilUsage',  JSON.stringify(foilUsage));

      const resp = await fetch(`${API_BASE_URL}/tasks/${task._id}/consume`, {
        method: 'POST',
        headers: { Authorization: token },
        body: form,
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || data.message || 'Failed to complete task');
      setAlert(task._id, 'success', 'Task completed ✅');
      setShowComplete((prev) => ({ ...prev, [task._id]: false }));
      loadTasks();
    } catch (err) {
      setAlert(task._id, 'danger', err.message);
    }
  };

  const updateCompleteForm = (taskId, field, val) =>
    setCompleteForms((prev) => ({ ...prev, [taskId]: { ...(prev[taskId] || {}), [field]: val } }));

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) return <ScreenWrapper><Spinner /></ScreenWrapper>;

  return (
    <ScreenWrapper refreshing={loading} onRefresh={loadTasks}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.title}>👷 Worker Dashboard</Text>
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
            }}
            onPress={async () => {
              const { testBackendConnection, formatTestResults } = require('../../utils/networkTest');
              const tests = await testBackendConnection();
              const { allSuccess, message } = formatTestResults(tests);
              Alert.alert(
                allSuccess ? '✅ Connection OK' : '❌ Connection Failed',
                message,
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Test Network</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 💰 My Monthly Salary Card */}
      <Card style={{ marginBottom: spacing[3], backgroundColor: colors.surfaceAlt }}>
        <TouchableOpacity
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}
          onPress={() => setShowSalary(!showSalary)}
        >
          <Text style={{ fontSize: fontSize.md, fontWeight: '700', color: colors.primary }}>
            💰 My Monthly Salary
          </Text>
          <Text style={{ fontSize: fontSize.md, color: colors.primary }}>
            {showSalary ? '▲ Hide' : '▼ Show'}
          </Text>
        </TouchableOpacity>

        {showSalary && (
          <View style={{ marginTop: spacing[3] }}>
            {/* Month selector */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
              <Text style={{ fontWeight: '600', color: colors.text }}>Month:</Text>
              <TextInput
                style={{
                  borderWidth: 1, borderColor: colors.border, borderRadius: 6,
                  paddingHorizontal: 8, paddingVertical: 4, width: 120,
                  textAlign: 'center', color: colors.text, backgroundColor: '#fff',
                }}
                value={salaryMonth}
                onChangeText={setSalaryMonth}
                placeholder="YYYY-MM"
              />
            </View>

            {salaryLoading ? (
              <Spinner />
            ) : salaryDetails ? (
              <View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[3] }}>
                  {[
                    { label: 'Present Days',  value: salaryDetails.present,              color: colors.success },
                    { label: 'Absent Days',   value: salaryDetails.absent,               color: colors.danger  },
                    { label: 'Half Days',     value: salaryDetails.halfDay,              color: colors.warning },
                    { label: 'Total Hours',   value: `${salaryDetails.totalHrs.toFixed(1)}h`, color: colors.primary },
                    { label: 'Overtime',      value: `${salaryDetails.totalOT.toFixed(1)}h`, color: colors.accent  },
                  ].map((item) => (
                    <View key={item.label} style={{
                      flex: 1, minWidth: '45%', backgroundColor: '#fff',
                      padding: 8, borderRadius: 6, borderWidth: 1, borderColor: colors.border,
                    }}>
                      <Text style={{ fontSize: 10, color: colors.textMuted }}>{item.label}</Text>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: '700', color: item.color }}>
                        {item.value}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Net pay */}
                <View style={{
                  backgroundColor: colors.primary, padding: spacing[3],
                  borderRadius: 8, alignItems: 'center', marginBottom: spacing[2],
                }}>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                    Estimated Earnings
                  </Text>
                  <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginVertical: 4 }}>
                    ₹{salaryDetails.totalPay.toFixed(0)}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                    Based on {salaryDetails.records.length} attendance records
                  </Text>
                </View>

                <Btn label="Refresh" onPress={fetchSalaryDetails} variant="secondary" size="sm" />
              </View>
            ) : (
              <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center' }}>
                No attendance records for this month.
              </Text>
            )}
          </View>
        )}
      </Card>

      <QRScannerModal
        visible={scanVisible}
        onScanned={handleScanned}
        onClose={() => { setScanVisible(false); scanResolvers.current?.resolve?.(''); }}
      />

      {tasks.length === 0 ? (
        <EmptyState message="No tasks assigned to you yet." />
      ) : (
        tasks.map((task) => (
          <Card key={task._id} style={{ marginBottom: spacing[4] }}>
            {/* Header */}
            <View style={styles.row}>
              <Text style={styles.taskName}>{task.product_name || 'Task'}</Text>
              <Badge variant={statusBadgeVariant(task.status)} label={task.status} />
            </View>

            {/* Details */}
            <View style={styles.detailGrid}>
              <Text style={styles.detail}><Text style={styles.detailKey}>Worker: </Text>{task.worker_name}</Text>
              <Text style={styles.detail}><Text style={styles.detailKey}>Company: </Text>{task.company}</Text>
              <Text style={styles.detail}><Text style={styles.detailKey}>Job Type: </Text>{task.colourCount || 1} Colour</Text>
              <Text style={styles.detail}><Text style={styles.detailKey}>Required: </Text>{task.required_kg} KG</Text>
              {task.foil_qrPayload ? (
                <Text style={styles.detail}><Text style={styles.detailKey}>Foil QR: </Text>{task.foil_qrPayload}</Text>
              ) : null}
            </View>

            <FoilUsageSummary task={task} />

            {/* Completed summary */}
            {task.status === 'completed' && (
              <Card alt condensed style={{ marginTop: spacing[3] }}>
                <Text style={{ fontWeight: '700', color: colors.success }}>✅ Completed</Text>
                <Text style={styles.detail}>Used: {task.used_kg} KG</Text>
                <Text style={styles.detail}>Waste: {task.waste_kg} KG</Text>
                <Text style={styles.detail}>Remaining: {task.remaining_kg} KG</Text>
              </Card>
            )}

            {/* Alert */}
            {alerts[task._id] && (
              <AlertBanner type={alerts[task._id].type} message={alerts[task._id].message} style={{ marginTop: spacing[2] }} />
            )}

            {/* Actions */}
            {task.status !== 'completed' && (
              <View style={[styles.row, { marginTop: spacing[3], gap: spacing[2], flexWrap: 'wrap' }]}>
                <Btn
                  label={task.status === 'in-progress' ? 'Started ✓' : '▶ Start Task'}
                  onPress={() => startTask(task)}
                  variant="primary"
                  size="sm"
                  disabled={task.status === 'in-progress'}
                />
                <Btn
                  label={showComplete[task._id] ? 'Hide Form' : 'Complete'}
                  onPress={() => setShowComplete((prev) => ({ ...prev, [task._id]: !prev[task._id] }))}
                  variant="success"
                  size="sm"
                />
              </View>
            )}

            {/* Complete form */}
            {showComplete[task._id] && task.status !== 'completed' && (
              <View style={{ marginTop: spacing[3] }}>
                <Input
                  label="Used KG"
                  value={completeForms[task._id]?.usedKg || ''}
                  onChangeText={(v) => updateCompleteForm(task._id, 'usedKg', v)}
                  keyboardType="numeric" placeholder="Total foil used (KG)"
                />
                <Input
                  label="Waste KG"
                  value={completeForms[task._id]?.wasteKg || ''}
                  onChangeText={(v) => updateCompleteForm(task._id, 'wasteKg', v)}
                  keyboardType="numeric" placeholder="Waste (KG)"
                />
                <Input
                  label="Remaining KG"
                  value={completeForms[task._id]?.remainingKg || ''}
                  onChangeText={(v) => updateCompleteForm(task._id, 'remainingKg', v)}
                  keyboardType="numeric" placeholder="Remaining foil (KG)"
                />
                <Btn
                  label="Submit & Complete"
                  onPress={() => completeTask(task)}
                  variant="success"
                  block
                />
              </View>
            )}
          </Card>
        ))
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header:    { marginBottom: spacing[4] },
  title:     { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.text },
  row:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  taskName:  { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing[2] },
  detailGrid:{ marginTop: spacing[3], gap: 4 },
  detail:    { fontSize: fontSize.sm, color: colors.textMuted },
  detailKey: { fontWeight: '700', color: colors.text },
});

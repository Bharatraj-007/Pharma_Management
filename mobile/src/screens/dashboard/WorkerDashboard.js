/**
 * WorkerDashboard — full task start/complete flow for workers.
 * Uses expo-camera for QR scanning instead of html5-qrcode.
 */
import React, { useEffect, useState, useCallback, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, Alert, ScrollView,
} from 'react-native';
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
  const { session } = useContext(AuthContext);
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

  // ── Load tasks ──────────────────────────────────────────────────────────────
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/tasks`, { headers: { Authorization: token } });
      const data = await res.json();
      const all  = Array.isArray(data) ? data : [];
      setTasks(workerName ? all.filter((t) => t.worker_name === workerName) : all);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, workerName]);

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
        <Text style={styles.title}>👷 Worker Dashboard</Text>
      </View>

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

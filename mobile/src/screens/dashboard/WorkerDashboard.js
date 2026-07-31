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

  // ── Task start UI state ─────────────────────────────────────────────────────
  const [taskStartForms, setTaskStartForms] = useState({});  // taskId → { mode:'scan'|'manual', qrValue:'', imageUri:null }
  const [startScanning, setStartScanning] = useState(null);  // taskId being scanned for start

  const getStartForm = (taskId) => taskStartForms[taskId] || { mode: 'scan', qrValue: '', imageUri: null };
  const updateStartForm = (taskId, field, val) =>
    setTaskStartForms((prev) => ({ ...prev, [taskId]: { ...(prev[taskId] || { mode: 'scan', qrValue: '', imageUri: null }), [field]: val } }));

  // Start task scan - for scanning QR at start
  const startTaskScan = (taskId) =>
    new Promise((resolve) => {
      scanResolvers.current = { resolve };
      setStartScanning(taskId);
      setScanVisible(true);
    });

  const handleStartScanned = (data) => {
    if (startScanning) {
      // Store the scanned value
      updateStartForm(startScanning, 'qrValue', data);
      setAlert(startScanning, 'success', `✅ QR scanned: ${data}`);
      setStartScanning(null);
    }
    setScanVisible(false);
    scanResolvers.current?.resolve?.(data);
    scanResolvers.current = {};
  };

  // Pick foil image
  const pickFoilImage = async (taskId) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow gallery access to attach foil image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length > 0) {
      updateStartForm(taskId, 'imageUri', result.assets[0].uri);
      setAlert(taskId, 'success', '✅ Foil image attached');
    }
  };

  // Take photo with camera
  const takeFoilPhoto = async (taskId) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access to take foil photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length > 0) {
      updateStartForm(taskId, 'imageUri', result.assets[0].uri);
      setAlert(taskId, 'success', '✅ Foil photo captured');
    }
  };

  // ── Start task ──────────────────────────────────────────────────────────────
  const startTask = async (task) => {
    clearAlert(task._id);
    const colourCount = Number(task.colourCount || 1);
    const startForm = getStartForm(task._id);
    const foilScans   = [];

    // Get QR payload - either manual input or scanned
    let qrPayload = startForm.qrValue?.trim();
    
    if (!qrPayload && colourCount >= 1) {
      // If no QR value entered, try scanning
      if (startForm.mode === 'scan') {
        for (let c = 1; c <= colourCount; c++) {
          qrPayload = await scanForColour(task._id, c);
          if (!qrPayload?.trim()) {
            setAlert(task._id, 'danger', `Foil QR is required for Colour ${c}.`);
            return;
          }
          foilScans.push({ colourNumber: c, qrPayload: qrPayload.trim() });
        }
      } else {
        setAlert(task._id, 'danger', 'Please enter or scan the foil QR payload.');
        return;
      }
    } else if (qrPayload) {
      foilScans.push({ colourNumber: 1, qrPayload });
      // For multi-colour jobs, scan remaining
      for (let c = 2; c <= colourCount; c++) {
        qrPayload = await scanForColour(task._id, c);
        if (!qrPayload?.trim()) {
          setAlert(task._id, 'danger', `Foil QR is required for Colour ${c}.`);
          return;
        }
        foilScans.push({ colourNumber: c, qrPayload: qrPayload.trim() });
      }
    }

    try {
      const formData = new FormData();
      
      // Attach foil image if selected
      if (startForm.imageUri) {
        const filename = startForm.imageUri.split('/').pop() || 'foil.jpg';
        formData.append('foil_image', {
          uri: startForm.imageUri,
          type: 'image/jpeg',
          name: filename,
        });
      }
      
      // Attach QR data
      if (foilScans.length > 0) {
        formData.append('foilScans', JSON.stringify(foilScans));
      } else if (qrPayload?.trim()) {
        formData.append('foil_qrPayload', qrPayload.trim());
      }

      const resp = await fetch(`${API_BASE_URL}/tasks/${task._id}/start`, {
        method: 'POST',
        headers: { Authorization: token },
        body: formData,
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || data.message || 'Failed to start task');
      setAlert(task._id, 'success', data.message || 'Task started ✅');
      // Clear start form
      setTaskStartForms((prev) => { const n = { ...prev }; delete n[task._id]; return n; });
      loadTasks();
    } catch (err) {
      setAlert(task._id, 'danger', err.message);
    }
  };

  // ── Foil KG Input Modal (replaces iOS-only Alert.prompt) ─────────────────────
  const [showFoilKgModal, setShowFoilKgModal] = useState(false);
  const [foilKgEntries, setFoilKgEntries] = useState([]);
  const [foilKgTaskId, setFoilKgTaskId] = useState(null);
  const [foilKgProcessing, setFoilKgProcessing] = useState(false);

  const openFoilKgModal = (task) => {
    const usage = task.foilUsage || [];
    const cf = completeForms[task._id] || {};
    const totalUsed = Number(cf.usedKg || 0);
    const defaultPer = usage.length ? Number((totalUsed / usage.length).toFixed(3)) : 0;

    const entries = usage.map((entry) => ({
      usageId: entry._id,
      colourNumber: entry.colourNumber,
      isSwap: entry.isSwap || false,
      foilQrPayload: entry.foilQrPayload || '',
      usedWeight: defaultPer,
    }));

    setFoilKgEntries(entries);
    setFoilKgTaskId(task._id);
    setShowFoilKgModal(true);
  };

  const submitFoilKgModal = async () => {
    if (!foilKgTaskId) return;
    setFoilKgProcessing(true);
    clearAlert(foilKgTaskId);

    const foilUsage = foilKgEntries.map((e) => ({
      usageId: e.usageId,
      usedWeight: Number(e.usedWeight || 0),
    }));

    const cf = completeForms[foilKgTaskId] || {};

    try {
      const form = new FormData();
      form.append('used_kg', cf.usedKg || '0');
      form.append('waste_kg', cf.wasteKg || '0');
      form.append('remaining_kg', cf.remainingKg || '0');
      form.append('foilUsage', JSON.stringify(foilUsage));

      const resp = await fetch(`${API_BASE_URL}/tasks/${foilKgTaskId}/consume`, {
        method: 'POST',
        headers: { Authorization: token },
        body: form,
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || data.message || 'Failed to complete task');
      setAlert(foilKgTaskId, 'success', 'Task completed ✅');
      setShowComplete((prev) => ({ ...prev, [foilKgTaskId]: false }));
      setShowFoilKgModal(false);
      setFoilKgTaskId(null);
      loadTasks();
    } catch (err) {
      setAlert(foilKgTaskId, 'danger', err.message);
    } finally {
      setFoilKgProcessing(false);
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

    // Open Modal instead of using Alert.prompt (which crashes on Android)
    openFoilKgModal(task);
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

      {/* ── Foil KG Input Modal (cross-platform replacement for Alert.prompt) ── */}
      <Modal visible={showFoilKgModal} animationType="slide" transparent onRequestClose={() => setShowFoilKgModal(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' }}>
          <View style={{ backgroundColor:colors.surface, borderTopLeftRadius:20, borderTopRightRadius:20, padding:spacing[4], maxHeight:'80%' }}>
            <Text style={{ fontSize:fontSize.lg, fontWeight:'700', color:colors.text, marginBottom:spacing[3] }}>
              ⚖️ Enter Foil Used KG Per Colour
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {foilKgEntries.map((entry, idx) => (
                <View key={entry.usageId || idx} style={{ marginBottom: spacing[3], padding: spacing[3], backgroundColor: colors.surfaceAlt, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontWeight:'700', color:colors.text, fontSize:fontSize.base, marginBottom:4 }}>
                    Colour {entry.colourNumber}{entry.isSwap ? ' (swap)' : ''}
                  </Text>
                  {entry.foilQrPayload ? (
                    <Text style={{ fontSize:fontSize.xs, color:colors.textMuted, marginBottom:spacing[2] }} numberOfLines={1}>
                      QR: {entry.foilQrPayload}
                    </Text>
                  ) : null}
                  <TextInput
                    style={{
                      backgroundColor:'#fff', borderWidth:1, borderColor:colors.border,
                      borderRadius:6, paddingHorizontal:spacing[3], paddingVertical:spacing[2],
                      fontSize:fontSize.base, color:colors.text,
                    }}
                    keyboardType="numeric"
                    placeholder="Used KG"
                    value={String(entry.usedWeight || '')}
                    onChangeText={(val) => {
                      const updated = [...foilKgEntries];
                      updated[idx] = { ...updated[idx], usedWeight: val };
                      setFoilKgEntries(updated);
                    }}
                  />
                </View>
              ))}
            </ScrollView>
            <View style={{ flexDirection:'row', gap:spacing[2], marginTop:spacing[2] }}>
              <Btn
                label={foilKgProcessing ? '⏳ Submitting...' : '✅ Submit & Complete'}
                onPress={submitFoilKgModal}
                loading={foilKgProcessing}
                variant="success"
                style={{ flex:2 }}
                size="lg"
              />
              <Btn
                label="Cancel"
                onPress={() => { setShowFoilKgModal(false); setFoilKgTaskId(null); }}
                variant="secondary"
                style={{ flex:1 }}
                size="lg"
              />
            </View>
          </View>
        </View>
      </Modal>

      <QRScannerModal
        visible={scanVisible}
        onScanned={startScanning ? handleStartScanned : handleScanned}
        onClose={() => { setScanVisible(false); setStartScanning(null); scanResolvers.current?.resolve?.(''); }}
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

            {/* ── Foil Input Section for STARTING TASK (pending tasks) ── */}
            {task.status === 'pending' && (
              <View style={{ marginTop: spacing[3], backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: spacing[3], borderWidth: 1, borderColor: colors.primaryLight || '#dbeafe' }}>
                <Text style={{ fontWeight: '700', fontSize: fontSize.sm, color: colors.primary, marginBottom: spacing[2] }}>
                  📋 Foil Details for Task Start
                </Text>

                {/* Image Upload Buttons */}
                <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3] }}>
                  <Btn
                    label="📷 Take Photo"
                    size="sm"
                    variant="secondary"
                    onPress={() => takeFoilPhoto(task._id)}
                    style={{ flex: 1 }}
                  />
                  <Btn
                    label="🖼️ Gallery"
                    size="sm"
                    variant="secondary"
                    onPress={() => pickFoilImage(task._id)}
                    style={{ flex: 1 }}
                  />
                </View>
                {getStartForm(task._id).imageUri && (
                  <View style={{ marginBottom: spacing[2] }}>
                    <Text style={{ fontSize: fontSize.xs, color: colors.success, fontWeight: '600' }}>✅ Foil image attached</Text>
                  </View>
                )}

                {/* Manual QR Input */}
                <Text style={{ fontSize: fontSize.xs, fontWeight: '600', color: colors.text, marginBottom: spacing[1] }}>QR Payload</Text>
                <TextInput
                  style={{
                    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border,
                    borderRadius: 6, paddingHorizontal: spacing[3], paddingVertical: spacing[2],
                    fontSize: fontSize.sm, color: colors.text, marginBottom: spacing[2],
                  }}
                  placeholder="Type or paste foil QR payload..."
                  value={getStartForm(task._id).qrValue}
                  onChangeText={(val) => updateStartForm(task._id, 'qrValue', val)}
                />

                {/* Mode toggle */}
                <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[2] }}>
                  <TouchableOpacity
                    style={[{
                      flex: 1, paddingVertical: spacing[2], borderRadius: 6, alignItems: 'center',
                      borderWidth: 1, borderColor: getStartForm(task._id).mode === 'manual' ? colors.primary : colors.border,
                      backgroundColor: getStartForm(task._id).mode === 'manual' ? colors.primary : colors.surface,
                    }]}
                    onPress={() => updateStartForm(task._id, 'mode', 'manual')}
                  >
                    <Text style={{ fontWeight: '700', fontSize: fontSize.xs, color: getStartForm(task._id).mode === 'manual' ? '#fff' : colors.text }}>
                      ✏️ Manual
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[{
                      flex: 1, paddingVertical: spacing[2], borderRadius: 6, alignItems: 'center',
                      borderWidth: 1, borderColor: getStartForm(task._id).mode === 'scan' ? colors.primary : colors.border,
                      backgroundColor: getStartForm(task._id).mode === 'scan' ? colors.primary : colors.surface,
                    }]}
                    onPress={() => { updateStartForm(task._id, 'mode', 'scan'); startTaskScan(task._id); }}
                  >
                    <Text style={{ fontWeight: '700', fontSize: fontSize.xs, color: getStartForm(task._id).mode === 'scan' ? '#fff' : colors.text }}>
                      📷 Scan QR
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
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

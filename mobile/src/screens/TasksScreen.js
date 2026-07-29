/**
 * TasksScreen — full task management screen.
 *
 * Fixes vs previous version:
 *  1. Edit uses a proper Modal form (Alert.prompt is iOS-only, broken on Android)
 *  2. Task images are displayed using <Image> with Cloudinary / local URL support
 *  3. Worker dropdown is fetched from /workers API instead of hard-coded
 */
import React, { useEffect, useState, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, Modal, Image, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../navigation/AuthContext';
import API_BASE_URL from '../config';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  Card, Badge, AlertBanner,
  Btn, Input, Spinner, EmptyState,
} from '../components/ui';
import { colors, spacing, fontSize, statusBadgeVariant, formStyles } from '../styles/theme';
import { Picker } from '@react-native-picker/picker';

// ─── Constants ────────────────────────────────────────────────────────────────
const COMPANIES = [
  { value: 'bharath',          label: 'Bharath Enterprises' },
  { value: 'shree_ganaapathy', label: 'Shree Ganaapathy Roto Prints' },
  { value: 'vel',              label: 'Vel Gravure' },
];
const FOIL_TYPES   = ['blister', 'alualu', 'wrapper', 'pouch', 'laminated', 'roll'];
const COLOUR_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8];

// ─── Chip row (horizontal scrollable selector) ────────────────────────────────
function ChipRow({ label, options, value, onChange }) {
  return (
    <View style={{ marginBottom: spacing[4] }}>
      {label ? <Text style={cs.label}>{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          {options.map((opt) => {
            const v      = typeof opt === 'object' ? opt.value : opt;
            const l      = typeof opt === 'object' ? opt.label : String(opt);
            const active = String(value) === String(v);
            return (
              <TouchableOpacity
                key={v}
                style={[cs.chip, active && cs.active]}
                onPress={() => onChange(v)}
              >
                <Text style={[cs.chipText, active && cs.activeText]}>{l}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const cs = StyleSheet.create({
  label:      { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing[1] },
  chip:       { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  active:     { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:   { fontSize: fontSize.sm, color: colors.text },
  activeText: { color: '#fff', fontWeight: '700' },
});

// ─── Foil usage summary ───────────────────────────────────────────────────────
function FoilUsageSummary({ task }) {
  const usage = task.foilUsage || [];
  if (!usage.length) return null;
  const total = usage.reduce((s, e) => s + Number(e.usedWeight || 0), 0);
  return (
    <View style={s.usageBox}>
      <Text style={s.usageTitle}>Foil Usage</Text>
      {usage.map((e, i) => (
        <Text key={e._id || i} style={s.usageRow}>
          Colour {e.colourNumber}{e.isSwap ? ' (swap)' : ''}: {e.foilQrPayload}
          {'  ·  '}Start {Number(e.startWeight || 0).toFixed(2)} KG
          {'  ·  '}Used {Number(e.usedWeight || 0).toFixed(2)} KG
          {'  ·  '}Left {Number(e.remainingWeight ?? e.startWeight ?? 0).toFixed(2)} KG
        </Text>
      ))}
      <Text style={s.usageTotal}>Total used: {total.toFixed(2)} KG</Text>
    </View>
  );
}

// ─── Task image ───────────────────────────────────────────────────────────────
function TaskImage({ imagePath }) {
  const [error, setError] = useState(false);
  if (!imagePath || error) return null;

  // Support both Cloudinary URLs (https://...) and local server paths
  const uri = imagePath.startsWith('http')
    ? imagePath
    : `${API_BASE_URL}/${imagePath.replace(/^\//, '')}`;

  return (
    <Image
      source={{ uri }}
      style={s.taskImage}
      resizeMode="cover"
      onError={() => setError(true)}
    />
  );
}

// ─── Edit task modal ──────────────────────────────────────────────────────────
function EditTaskModal({ visible, task, token, onClose, onSaved }) {
  const [productName, setProductName] = useState('');
  const [size,        setSize]        = useState('');
  const [requiredKg,  setRequiredKg]  = useState('');
  const [colourCount, setColourCount] = useState('1');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  // Pre-fill when task changes
  useEffect(() => {
    if (task) {
      setProductName(task.product_name || '');
      setSize(task.size || '');
      setRequiredKg(String(task.required_kg || ''));
      setColourCount(String(task.colourCount || 1));
      setError('');
    }
  }, [task]);

  const handleSave = async () => {
    if (!productName.trim()) { setError('Product name is required.'); return; }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('product_name', productName.trim());
      if (size.trim())       fd.append('size', size.trim());
      if (requiredKg.trim()) fd.append('required_kg', requiredKg.trim());
      if (colourCount)       fd.append('colourCount', colourCount);

      const res  = await fetch(`${API_BASE_URL}/tasks/${task._id}`, {
        method: 'PUT',
        headers: { Authorization: token },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.details || data.message || 'Update failed');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>✏️ Edit Task</Text>
            <TouchableOpacity onPress={onClose} style={s.modalClose}>
              <Text style={s.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            {error ? <AlertBanner type="danger" message={error} /> : null}

            <Input
              label="Product Name *"
              value={productName}
              onChangeText={setProductName}
              placeholder="e.g. Aspirin Blister Pack"
            />
            <Input
              label="Size"
              value={size}
              onChangeText={setSize}
              placeholder="e.g. 10x5 cm"
            />
            <Input
              label="Required KG"
              value={requiredKg}
              onChangeText={setRequiredKg}
              keyboardType="numeric"
              placeholder="e.g. 25"
            />

            <ChipRow
              label="No. of Colours"
              options={COLOUR_COUNTS.map(n => ({ value: String(n), label: `${n} Colour` }))}
              value={colourCount}
              onChange={setColourCount}
            />
          </ScrollView>

          <View style={s.modalFooter}>
            <Btn label="Cancel" onPress={onClose} variant="secondary" style={{ flex: 1 }} />
            <Btn
              label={loading ? '⏳ Saving…' : '✅ Save Changes'}
              onPress={handleSave}
              variant="primary"
              loading={loading}
              style={{ flex: 2, marginLeft: spacing[2] }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function TasksScreen() {
  const { session } = useContext(AuthContext);
  const token        = session?.token;
  const role         = (session?.role || 'worker').toLowerCase();
  const isManager    = ['admin', 'manager', 'ceo'].includes(role);
  const isAdminOrCeo = ['admin', 'ceo'].includes(role);

  // Task list
  const [tasks,       setTasks]       = useState([]);
  const [loading,     setLoading]     = useState(true);

  // Create form
  const [showForm,    setShowForm]    = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError,   setFormError]   = useState('');
  const [image,       setImage]       = useState(null);
  const [form, setForm] = useState({
    company: 'bharath', product_name: '', foil_type: 'blister',
    size: '', required_kg: '', colourCount: '1', worker_name: '',
  });
  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  // Workers list (from API)
  const [workers, setWorkers] = useState([]);

  // Edit modal
  const [editTask,   setEditTask]   = useState(null);
  const [editVisible, setEditVisible] = useState(false);

  // ── Fetch workers ────────────────────────────────────────────────────────────
  const fetchWorkers = useCallback(async () => {
    if (!token || !isManager) return;
    try {
      const res  = await fetch(`${API_BASE_URL}/workers`, { headers: { Authorization: token } });
      if (res.ok) {
        const data = await res.json();
        setWorkers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.log('Failed to load workers:', err.message);
    }
  }, [token, isManager]);

  // ── Fetch tasks ──────────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/tasks`, { headers: { Authorization: token } });
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('fetchTasks error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTasks();
    fetchWorkers();
  }, [fetchTasks, fetchWorkers]);

  // ── Pick image ───────────────────────────────────────────────────────────────
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  // ── Create task ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.product_name || !form.size || !form.required_kg || !form.worker_name) {
      setFormError('Please fill all required fields.'); return;
    }
    setFormLoading(true); setFormError('');
    try {
      const fd = new FormData();
      fd.append('company',      form.company);
      fd.append('product_name', form.product_name);
      fd.append('size',         form.size);
      fd.append('required_kg',  form.required_kg);
      fd.append('colourCount',  form.colourCount);
      fd.append('foil_type',    form.foil_type);
      fd.append('worker_name',  form.worker_name);
      if (image) {
        fd.append('image', { uri: image.uri, name: `task-${Date.now()}.jpg`, type: 'image/jpeg' });
      }
      const res  = await fetch(`${API_BASE_URL}/tasks-create`, {
        method: 'POST', headers: { Authorization: token }, body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.details || data.message || 'Create failed');
      Alert.alert('✅ Success', 'Task created successfully!');
      setForm({ company: 'bharath', product_name: '', foil_type: 'blister', size: '', required_kg: '', colourCount: '1', worker_name: '' });
      setImage(null);
      setShowForm(false);
      fetchTasks();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // ── Delete task ──────────────────────────────────────────────────────────────
  const deleteTask = (id) => {
    Alert.alert('Delete task?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const res  = await fetch(`${API_BASE_URL}/tasks/${id}`, {
              method: 'DELETE', headers: { Authorization: token },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.details || 'Delete failed');
            fetchTasks();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  // ── Open edit modal ──────────────────────────────────────────────────────────
  const openEdit = (task) => {
    setEditTask(task);
    setEditVisible(true);
  };

  if (loading) return <ScreenWrapper><Spinner /></ScreenWrapper>;

  return (
    <ScreenWrapper refreshing={loading} onRefresh={fetchTasks}>

      {/* Edit modal */}
      <EditTaskModal
        visible={editVisible}
        task={editTask}
        token={token}
        onClose={() => { setEditVisible(false); setEditTask(null); }}
        onSaved={fetchTasks}
      />

      {/* Header */}
      <View style={s.pageHeader}>
        <Text style={s.pageTitle}>📋 Tasks</Text>
        {isManager && (
          <Btn
            label={showForm ? '✖ Hide' : '➕ New'}
            onPress={() => setShowForm((p) => !p)}
            variant={showForm ? 'secondary' : 'success'}
            size="sm"
          />
        )}
      </View>

      {/* ── Create form ── */}
      {showForm && isManager && (
        <Card style={{ marginBottom: spacing[4] }}>
          <Text style={s.cardTitle}>New Task</Text>
          {formError ? <AlertBanner type="danger" message={formError} /> : null}

          <ChipRow
            label="Company *"
            options={COMPANIES}
            value={form.company}
            onChange={set('company')}
          />
          <Input
            label="Product Name *"
            value={form.product_name}
            onChangeText={set('product_name')}
            placeholder="e.g. Aspirin Blister Pack"
          />
          <ChipRow
            label="Foil Type *"
            options={FOIL_TYPES.map(v => ({
              value: v,
              label: v.charAt(0).toUpperCase() + v.slice(1),
            }))}
            value={form.foil_type}
            onChange={set('foil_type')}
          />
          <Input label="Size *"        value={form.size}        onChangeText={set('size')}        placeholder="e.g. 10x5 cm" />
          <Input label="Required KG *" value={form.required_kg} onChangeText={set('required_kg')} placeholder="e.g. 25" keyboardType="numeric" />
          <ChipRow
            label="No. of Colours *"
            options={COLOUR_COUNTS.map(n => ({ value: String(n), label: `${n} Colour` }))}
            value={form.colourCount}
            onChange={set('colourCount')}
          />

          {/* Worker picker — from API */}
          <View style={formStyles.group}>
            <Text style={formStyles.label}>Worker Name *</Text>
            <View style={formStyles.pickerWrapper}>
              <Picker
                selectedValue={form.worker_name}
                onValueChange={set('worker_name')}
                style={{ color: colors.text }}
                dropdownIconColor={colors.primary}
              >
                <Picker.Item label="Select worker…" value="" color={colors.textMuted} />
                {workers.map((w) => (
                  <Picker.Item
                    key={w._id}
                    label={`${w.name} (${w.role})`}
                    value={w.name}
                    color={colors.text}
                  />
                ))}
                {/* Fallback default option */}
                <Picker.Item
                  label={`Default Worker (${form.company === 'shree_ganaapathy' ? 'shree' : form.company})`}
                  value={`Worker (${form.company === 'shree_ganaapathy' ? 'shree' : form.company})`}
                  color={colors.textMuted}
                />
              </Picker>
            </View>
          </View>

          <Btn
            label="📷 Attach Sample Image"
            onPress={pickImage}
            variant="secondary"
            block
            style={{ marginBottom: spacing[2] }}
          />
          {image && (
            <View style={{ marginBottom: spacing[3] }}>
              <Text style={{ fontSize: fontSize.sm, color: colors.success, marginBottom: 6 }}>
                ✅ Image attached
              </Text>
              <Image source={{ uri: image.uri }} style={s.previewImage} resizeMode="cover" />
            </View>
          )}

          <Btn
            label={formLoading ? '⏳ Creating…' : '✅ Create Task'}
            onPress={handleSubmit}
            loading={formLoading}
            variant="success"
            block
            size="lg"
          />
        </Card>
      )}

      {/* ── Task list ── */}
      <Text style={s.listTitle}>Task List ({tasks.length})</Text>

      {tasks.length === 0 ? (
        <EmptyState message={isManager ? 'No tasks yet. Create one above!' : 'No tasks. Check with your manager.'} />
      ) : (
        tasks.map((task) => (
          <Card key={task._id} style={{ marginBottom: spacing[4] }}>
            {/* Title row */}
            <View style={s.row}>
              <Text style={s.taskName} numberOfLines={2}>{task.product_name || 'Task'}</Text>
              <Badge variant={statusBadgeVariant(task.status)} label={task.status} />
            </View>

            {/* ── Task image ── */}
            <TaskImage imagePath={task.image_path} />

            {/* Details */}
            <View style={{ marginTop: spacing[3], gap: 4 }}>
              {task.company     && <Text style={s.detail}><Text style={s.key}>Company: </Text>{task.company}</Text>}
              {task.size        && <Text style={s.detail}><Text style={s.key}>Size: </Text>{task.size}</Text>}
              {task.required_kg && <Text style={s.detail}><Text style={s.key}>Required: </Text>{task.required_kg} KG</Text>}
              <Text style={s.detail}><Text style={s.key}>Job: </Text>{task.colourCount || 1} Colour Job</Text>
              {task.worker_name && <Text style={s.detail}><Text style={s.key}>Worker: </Text>{task.worker_name}</Text>}
              {task.status === 'completed' && task.completedAt && (
                <Text style={s.detail}>
                  <Text style={s.key}>Completed: </Text>
                  {new Date(task.completedAt).toLocaleString('en-IN')}
                </Text>
              )}
            </View>

            {/* Completion summary */}
            {task.status === 'completed' && (
              <View style={s.completionBox}>
                <Text style={{ fontWeight: '700', color: colors.success, marginBottom: 4 }}>✅ Completed</Text>
                <Text style={s.detail}>Used: {task.used_kg} KG  ·  Waste: {task.waste_kg} KG  ·  Remaining: {task.remaining_kg} KG</Text>
              </View>
            )}

            <FoilUsageSummary task={task} />

            {/* Action buttons — Admin / CEO only */}
            {isAdminOrCeo && (
              <View style={[s.row, { marginTop: spacing[3], gap: spacing[2], flexWrap: 'wrap' }]}>
                <Btn
                  label="✏️ Edit"
                  size="sm"
                  variant="warning"
                  onPress={() => openEdit(task)}
                />
                <Btn
                  label="🗑 Delete"
                  size="sm"
                  variant="danger"
                  onPress={() => deleteTask(task._id)}
                />
              </View>
            )}
          </Card>
        ))
      )}
    </ScreenWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  pageHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4] },
  pageTitle:   { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.text },
  cardTitle:   { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing[3] },
  listTitle:   { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing[3], color: colors.text },

  row:         { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  taskName:    { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing[2] },
  detail:      { fontSize: fontSize.sm, color: colors.textMuted },
  key:         { fontWeight: '700', color: colors.text },

  taskImage: {
    width: '100%', height: 160,
    borderRadius: 8, marginTop: spacing[3],
    backgroundColor: colors.border,
  },
  previewImage: {
    width: '100%', height: 120,
    borderRadius: 8,
    backgroundColor: colors.border,
  },

  completionBox: {
    backgroundColor: colors.successLight || '#f0fdf4',
    borderRadius: 8,
    padding: spacing[3],
    marginTop: spacing[3],
  },

  usageBox:   { backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: spacing[3], marginTop: spacing[3] },
  usageTitle: { fontWeight: '700', color: colors.text, marginBottom: spacing[1] },
  usageRow:   { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: 2 },
  usageTotal: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginTop: spacing[1] },

  // Edit modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: spacing[6],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle:     { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  modalClose:     { padding: 6 },
  modalCloseText: { fontSize: 18, color: colors.textMuted, fontWeight: '700' },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing[2],
  },
});

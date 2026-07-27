/**
 * TasksScreen — manager/admin/CEO can create tasks; all roles can start/complete.
 * Mirrors the web Tasks.js page exactly.
 */
import React, { useEffect, useState, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../navigation/AuthContext';
import API_BASE_URL from '../config';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  Card, CardHeader, CardTitle, Badge, AlertBanner,
  Btn, Input, Spinner, EmptyState,
} from '../components/ui';
import { colors, spacing, fontSize, statusBadgeVariant, pageStyles, formStyles } from '../styles/theme';
import { Picker } from '@react-native-picker/picker';

const COMPANIES = [
  { value: 'bharath',          label: 'Bharath Enterprises' },
  { value: 'shree_ganaapathy', label: 'Shree Ganaapathy Roto Prints' },
  { value: 'vel',              label: 'Vel Gravure' },
];
const FOIL_TYPES = ['blister','alualu','wrapper','pouch','laminated','roll'];
const COLOUR_COUNTS = [1,2,3,4,5,6,7,8];

function ChipRow({ label, options, value, onChange }) {
  return (
    <View style={{ marginBottom: spacing[4] }}>
      {label ? <Text style={cs.label}>{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          {options.map((opt) => {
            const v = typeof opt === 'object' ? opt.value : opt;
            const l = typeof opt === 'object' ? opt.label : String(opt);
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

function FoilUsageSummary({ task }) {
  const usage = task.foilUsage || [];
  if (!usage.length) return null;
  const total = usage.reduce((s, e) => s + Number(e.usedWeight || 0), 0);
  return (
    <Card alt condensed style={{ marginTop: spacing[3] }}>
      <Text style={{ fontWeight: '700', marginBottom: spacing[1] }}>Foil Usage</Text>
      {usage.map((e, i) => (
        <Text key={e._id || i} style={{ fontSize: fontSize.sm, color: colors.textMuted }}>
          Colour {e.colourNumber}{e.isSwap ? ' (swap)' : ''}: {e.foilQrPayload}
          {'  ·  '}Start {Number(e.startWeight||0).toFixed(2)} KG
          {'  ·  '}Used {Number(e.usedWeight||0).toFixed(2)} KG
          {'  ·  '}Left {Number(e.remainingWeight??e.startWeight??0).toFixed(2)} KG
        </Text>
      ))}
      <Text style={{ fontWeight: '700', marginTop: spacing[1] }}>Total: {total.toFixed(2)} KG</Text>
    </Card>
  );
}

export default function TasksScreen() {
  const { session } = useContext(AuthContext);
  const token   = session?.token;
  const role    = session?.role || 'worker';
  const isManager    = ['admin','manager','ceo'].includes(role);
  const isAdminOrCeo = ['admin','ceo'].includes(role);

  const [tasks,     setTasks]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error,     setError]     = useState('');
  const [image,     setImage]     = useState(null);

  const [form, setForm] = useState({
    company: 'bharath', product_name: '', foil_type: 'blister',
    size: '', required_kg: '', colourCount: '1', worker_name: '',
  });
  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/tasks`, { headers: { Authorization: token } });
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // ── Pick image ──────────────────────────────────────────────────────────────
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access to attach images.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled) setImage(result.assets[0]);
  };

  // ── Create task ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.product_name || !form.size || !form.required_kg || !form.worker_name) {
      setError('Please fill all required fields.'); return;
    }
    setFormLoading(true); setError('');
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
        fd.append('image', {
          uri: image.uri,
          name: `task-${Date.now()}.jpg`,
          type: 'image/jpeg',
        });
      }
      const res  = await fetch(`${API_BASE_URL}/tasks-create`, {
        method: 'POST', headers: { Authorization: token }, body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.details || data.message || 'Create failed');
      Alert.alert('✅ Task created!');
      setForm({ company:'bharath', product_name:'', foil_type:'blister', size:'', required_kg:'', colourCount:'1', worker_name:'' });
      setImage(null);
      setShowForm(false);
      fetchTasks();
    } catch (err) { setError(err.message); }
    finally { setFormLoading(false); }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const deleteTask = (id) => {
    Alert.alert('Delete task?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const res  = await fetch(`${API_BASE_URL}/tasks/${id}`, { method: 'DELETE', headers: { Authorization: token } });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.details || 'Delete failed');
          fetchTasks();
        } catch (err) { Alert.alert('Error', err.message); }
      }},
    ]);
  };

  if (loading) return <ScreenWrapper><Spinner /></ScreenWrapper>;

  return (
    <ScreenWrapper refreshing={loading} onRefresh={fetchTasks}>
      <View style={pageStyles.header}>
        <Text style={pageStyles.title}>📋 Tasks</Text>
      </View>

      {isManager && (
        <Btn
          label={showForm ? '✖ Hide Form' : '➕ Create New Task'}
          onPress={() => setShowForm((p) => !p)}
          variant={showForm ? 'secondary' : 'success'}
          block
          style={{ marginBottom: spacing[4] }}
        />
      )}

      {/* ── Create Form ── */}
      {showForm && isManager && (
        <Card style={{ marginBottom: spacing[4] }}>
          <CardTitle>New Task</CardTitle>
          <AlertBanner type="danger" message={error} />

          <ChipRow label="Company *"       options={COMPANIES}    value={form.company}     onChange={set('company')} />
          <Input   label="Product Name *"  value={form.product_name} onChangeText={set('product_name')} placeholder="e.g. Aspirin Blister Pack" />
          <ChipRow label="Foil Type *"     options={FOIL_TYPES.map(v=>({value:v,label:v.charAt(0).toUpperCase()+v.slice(1)}))} value={form.foil_type} onChange={set('foil_type')} />
          <Input   label="Size *"          value={form.size}         onChangeText={set('size')}         placeholder="e.g. 10x5 cm" />
          <Input   label="Required KG *"   value={form.required_kg}  onChangeText={set('required_kg')}  placeholder="e.g. 25" keyboardType="numeric" />
          <ChipRow label="No. of Colours *" options={COLOUR_COUNTS.map(n=>({value:String(n),label:`${n} Colour`}))} value={form.colourCount} onChange={set('colourCount')} />
          <View style={formStyles.group}>
            <Text style={formStyles.label}>Worker Name *</Text>
            <View style={formStyles.pickerWrapper}>
              <Picker
                selectedValue={form.worker_name}
                onValueChange={set('worker_name')}
                style={{ color: colors.text }}
                dropdownIconColor={colors.primary}
              >
                <Picker.Item label="Select worker" value="" color={colors.textLight} />
                <Picker.Item 
                  label={`Worker (${form.company === 'shree_ganaapathy' ? 'shree' : form.company})`} 
                  value={`Worker (${form.company === 'shree_ganaapathy' ? 'shree' : form.company})`} 
                  color={colors.text}
                />
              </Picker>
            </View>
          </View>

          <Btn label="📷 Attach Sample Image" onPress={pickImage} variant="secondary" block style={{ marginBottom: spacing[3] }} />
          {image && <Text style={{ fontSize: fontSize.sm, color: colors.success, marginBottom: spacing[3] }}>✅ Image attached</Text>}

          <Btn label={formLoading ? '⏳ Creating…' : '✅ Create Task'} onPress={handleSubmit} loading={formLoading} variant="success" block size="lg" />
        </Card>
      )}

      {/* ── Task List ── */}
      <Text style={{ fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing[3] }}>
        Task List ({tasks.length})
      </Text>

      {tasks.length === 0 ? (
        <EmptyState message={isManager ? 'No tasks yet. Create one above!' : 'No tasks. Check with your manager.'} />
      ) : (
        tasks.map((task) => (
          <Card key={task._id} style={{ marginBottom: spacing[4] }}>
            <View style={s.row}>
              <Text style={s.taskName} numberOfLines={2}>{task.product_name || 'Task'}</Text>
              <Badge variant={statusBadgeVariant(task.status)} label={task.status} />
            </View>

            <View style={{ marginTop: spacing[3], gap: 4 }}>
              {task.company    && <Text style={s.detail}><Text style={s.key}>Company: </Text>{task.company}</Text>}
              {task.size       && <Text style={s.detail}><Text style={s.key}>Size: </Text>{task.size}</Text>}
              {task.required_kg && <Text style={s.detail}><Text style={s.key}>Required: </Text>{task.required_kg} KG</Text>}
              <Text style={s.detail}><Text style={s.key}>Job: </Text>{task.colourCount || 1} Colour Job</Text>
              {task.worker_name && <Text style={s.detail}><Text style={s.key}>Worker: </Text>{task.worker_name}</Text>}
            </View>

            <FoilUsageSummary task={task} />

            {isAdminOrCeo && (
              <View style={[s.row, { marginTop: spacing[3], gap: spacing[2] }]}>
                <Btn label="Edit" size="sm" variant="warning"
                  onPress={() => Alert.prompt('Update product name', task.product_name || '',
                    async (next) => {
                      if (next === null) return;
                      try {
                        const fd = new FormData(); fd.append('product_name', next);
                        const res = await fetch(`${API_BASE_URL}/tasks/${task._id}`, { method: 'PUT', headers: { Authorization: token }, body: fd });
                        const d = await res.json().catch(()=>({}));
                        if (!res.ok) throw new Error(d.details || 'Update failed');
                        fetchTasks();
                      } catch (err) { Alert.alert('Error', err.message); }
                    }, 'plain-text', task.product_name || '')}
                />
                <Btn label="Delete" size="sm" variant="danger" onPress={() => deleteTask(task._id)} />
              </View>
            )}
          </Card>
        ))
      )}
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  taskName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing[2] },
  detail:   { fontSize: fontSize.sm, color: colors.textMuted },
  key:      { fontWeight: '700', color: colors.text },
});

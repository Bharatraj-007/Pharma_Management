/**
 * TasksScreen — full task management screen with 2-level Client Company / Product & CDR Sample Library.
 */
import React, { useEffect, useState, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, Modal, Image, Platform, Linking
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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

// ─── Chip row ─────────────────────────────────────────────────────────────────
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

// ─── Task image ───────────────────────────────────────────────────────────────
function TaskImage({ imagePath }) {
  const [error, setError] = useState(false);
  if (!imagePath || error) return null;

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
        <View style={s.modalBox}>
          <Text style={s.modalTitle}>✏️ Edit Task</Text>
          {error ? <AlertBanner type="danger" message={error} /> : null}

          <Input label="Product Name *" value={productName} onChangeText={setProductName} />
          <Input label="Size" value={size} onChangeText={setSize} />
          <Input label="Required KG" value={requiredKg} onChangeText={setRequiredKg} keyboardType="numeric" />

          <ChipRow
            label="No. of Colours"
            options={COLOUR_COUNTS.map(n => ({ value: String(n), label: `${n} Colour` }))}
            value={colourCount}
            onChange={setColourCount}
          />

          <View style={s.modalButtons}>
            <Btn label="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
            <Btn label={loading ? '⏳ Saving…' : 'Save'} variant="primary" onPress={handleSave} loading={loading} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Complete task modal ──────────────────────────────────────────────────────
function CompleteTaskModal({ visible, task, token, onClose, onSaved }) {
  const [usedKg,      setUsedKg]      = useState('');
  const [wasteKg,     setWasteKg]     = useState('');
  const [remainingKg, setRemainingKg] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    if (task) {
      setUsedKg(''); setWasteKg(''); setRemainingKg(''); setError('');
    }
  }, [task]);

  const handleComplete = async () => {
    if (!usedKg.trim()) { setError('Used KG is required.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${task._id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({
          used_kg: Number(usedKg),
          waste_kg: Number(wasteKg || 0),
          remaining_kg: Number(remainingKg || 0),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.details || data.message || 'Complete failed');
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
        <View style={s.modalBox}>
          <Text style={s.modalTitle}>✅ Complete Task</Text>
          {error ? <AlertBanner type="danger" message={error} /> : null}

          <Input label="Used KG *" value={usedKg} onChangeText={setUsedKg} keyboardType="numeric" placeholder="e.g. 24.5" />
          <Input label="Waste KG" value={wasteKg} onChangeText={setWasteKg} keyboardType="numeric" placeholder="e.g. 0.5" />
          <Input label="Remaining KG" value={remainingKg} onChangeText={setRemainingKg} keyboardType="numeric" placeholder="e.g. 0" />

          <View style={s.modalButtons}>
            <Btn label="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
            <Btn label={loading ? '⏳ Completing…' : 'Complete'} variant="success" onPress={handleComplete} loading={loading} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main TasksScreen Component ───────────────────────────────────────────────
export default function TasksScreen() {
  const { session }  = useContext(AuthContext);
  const token        = session?.token;
  const role         = (session?.role || 'worker').toLowerCase();
  const isManager    = ['admin', 'manager', 'ceo'].includes(role);
  const isAdminOrCeo = ['admin', 'ceo'].includes(role);
  const activeCo     = session?.activeCompany || 'all';

  // Task list & filters
  const [tasks,         setTasks]        = useState([]);
  const [loading,       setLoading]      = useState(true);
  const [filterStatus,  setFilterStatus] = useState('');
  const [search,        setSearch]       = useState('');

  // 2-Level Client Company & Product State
  const [clientCompanies,       setClientCompanies]       = useState([]);
  const [selectedClientCompany, setSelectedClientCompany] = useState('');
  const [clientCompanyInput,    setClientCompanyInput]    = useState('');
  const [clientProducts,        setClientProducts]        = useState([]);
  const [selectedProduct,       setSelectedProduct]       = useState('');
  const [productInput,          setProductInput]          = useState('');
  const [taskFiles,             setTaskFiles]             = useState([]);
  const [selectedSample,        setSelectedSample]        = useState(null);
  const [previewPdfUrl,         setPreviewPdfUrl]         = useState(null);
  const [zipUploading,          setZipUploading]          = useState(false);

  // Complete task modal
  const [completeTaskObj, setCompleteTaskObj] = useState(null);
  const [completeVisible, setCompleteVisible] = useState(false);

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

  // Workers list
  const [workers, setWorkers] = useState([]);

  // Edit modal
  const [editTask,   setEditTask]   = useState(null);
  const [editVisible, setEditVisible] = useState(false);

  const [ceoCompany, setCeoCompany] = useState(activeCo !== 'all' ? activeCo : 'bharath');
  const effectiveCo = role === 'ceo' ? ceoCompany : (session?.company || 'bharath');

  // Fetch client companies
  const fetchClientCompanies = useCallback(async (query = '') => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/client-companies?search=${encodeURIComponent(query)}`, {
        headers: { Authorization: token },
      });
      if (res.ok) setClientCompanies(await res.json());
    } catch {}
  }, [token]);

  // Fetch client products for selected company
  const fetchClientProducts = useCallback(async (compName = '', query = '') => {
    if (!token || !compName) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/client-products?clientCompany=${encodeURIComponent(compName)}&search=${encodeURIComponent(query)}`, {
        headers: { Authorization: token },
      });
      if (res.ok) setClientProducts(await res.json());
    } catch {}
  }, [token]);

  // Fetch task files for selected client company & product
  const fetchTaskFiles = useCallback(async (compName = '', prodName = '') => {
    if (!token || !compName) return;
    try {
      const query = `clientCompany=${encodeURIComponent(compName)}&productName=${encodeURIComponent(prodName)}`;
      const res = await fetch(`${API_BASE_URL}/api/task-files?${query}`, {
        headers: { Authorization: token },
      });
      if (res.ok) setTaskFiles(await res.json());
    } catch {}
  }, [token]);

  useEffect(() => {
    if (token) fetchClientCompanies();
  }, [token, fetchClientCompanies]);

  useEffect(() => {
    if (token && selectedClientCompany) {
      fetchClientProducts(selectedClientCompany);
      fetchTaskFiles(selectedClientCompany, selectedProduct);
    }
  }, [token, selectedClientCompany, selectedProduct, fetchClientProducts, fetchTaskFiles]);

  const handleSelectCompany = (compName) => {
    setSelectedClientCompany(compName);
    setClientCompanyInput(compName);
    setSelectedProduct('');
    setProductInput('');
    setSelectedSample(null);
  };

  const handleSelectProduct = (prodName) => {
    setSelectedProduct(prodName);
    setProductInput(prodName);
    set('product_name')(prodName); // Pre-fill task product name
  };

  const handleAddCompany = async () => {
    if (!clientCompanyInput.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/client-companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ name: clientCompanyInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedClientCompany(data.name);
        fetchClientCompanies();
      }
    } catch {}
  };

  // ZIP Upload Handler (Mobile — 2-Level structure extraction)
  const pickAndUploadZip = async () => {
    try {
      const doc = await DocumentPicker.getDocumentAsync({
        type: ['application/zip', 'application/x-zip-compressed'],
        copyToCacheDirectory: true,
      });

      if (doc.canceled || !doc.assets?.[0]) return;
      const asset = doc.assets[0];

      setZipUploading(true);
      const fd = new FormData();
      fd.append('zipFile', {
        uri: asset.uri,
        name: asset.name || 'samples.zip',
        type: 'application/zip',
      });
      if (selectedClientCompany) fd.append('clientCompany', selectedClientCompany);

      const res = await fetch(`${API_BASE_URL}/api/task-files/upload-zip`, {
        method: 'POST',
        headers: { Authorization: token },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ZIP upload failed');

      Alert.alert('✅ Success', data.message || 'ZIP extracted & 2-level structure converted in background!');
      fetchClientCompanies();
      if (selectedClientCompany) {
        fetchClientProducts(selectedClientCompany);
        fetchTaskFiles(selectedClientCompany, selectedProduct);
      }
    } catch (err) {
      Alert.alert('Upload Error', err.message);
    } finally {
      setZipUploading(false);
    }
  };

  // Download original .cdr file
  const handleDownloadCdr = async (fileRecord) => {
    try {
      const url = `${API_BASE_URL}/api/task-files/${fileRecord._id}/download`;
      if (Platform.OS === 'web') {
        Linking.openURL(url);
        return;
      }
      const localUri = `${FileSystem.documentDirectory}${fileRecord.fileName || 'sample.cdr'}`;
      const downloadRes = await FileSystem.downloadAsync(url, localUri, {
        headers: { Authorization: token },
      });
      if (downloadRes.status === 200 && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri);
      } else {
        Alert.alert('Downloaded', `File saved to ${downloadRes.uri}`);
      }
    } catch (err) {
      Alert.alert('Download Failed', err.message);
    }
  };

  const fetchWorkers = useCallback(async () => {
    if (!token || !isManager) return;
    try {
      const res  = await fetch(`${API_BASE_URL}/workers`, { headers: { Authorization: token } });
      if (res.ok) {
        const data = await res.json();
        setWorkers(Array.isArray(data) ? data : []);
      }
    } catch {}
  }, [token, isManager]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const qCompany = role === 'ceo' ? effectiveCo : (session?.company || 'bharath');
      const coQuery = role === 'ceo' && qCompany ? `?company=${qCompany}` : '';
      const res  = await fetch(`${API_BASE_URL}/tasks${coQuery}`, { headers: { Authorization: token } });
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('fetchTasks error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [token, role, effectiveCo, session?.company]);

  useEffect(() => {
    fetchTasks();
    fetchWorkers();
  }, [fetchTasks, fetchWorkers]);

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

  const handleSubmit = async () => {
    const prodName = form.product_name || selectedProduct;
    if (!prodName || !form.size || !form.required_kg || !form.worker_name) {
      setFormError('Please fill all required fields.'); return;
    }
    setFormLoading(true); setFormError('');
    try {
      const fd = new FormData();
      fd.append('company',      form.company);
      fd.append('product_name', prodName);
      fd.append('size',         form.size);
      fd.append('required_kg',  form.required_kg);
      fd.append('colourCount',  form.colourCount);
      fd.append('foil_type',    form.foil_type);
      fd.append('worker_name',  form.worker_name);
      if (selectedClientCompany) fd.append('clientCompany', selectedClientCompany);
      if (selectedSample?._id)    fd.append('referenceFileId', selectedSample._id);

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
      setSelectedSample(null);
      setShowForm(false);
      fetchTasks();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

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

  const startTask = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ status: 'in-progress' }),
      });
      if (!res.ok) throw new Error('Failed to start task');
      Alert.alert('▶ Task Started', 'Task status changed to In Progress.');
      fetchTasks();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const openComplete = (task) => {
    setCompleteTaskObj(task);
    setCompleteVisible(true);
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesStatus = !filterStatus || t.status === filterStatus;
    const matchesSearch = !search || [t.product_name, t.worker_name, t.size, t.company, t.clientCompany].join(' ').toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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

      {/* Complete task modal */}
      <CompleteTaskModal
        visible={completeVisible}
        task={completeTaskObj}
        token={token}
        onClose={() => { setCompleteVisible(false); setCompleteTaskObj(null); }}
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

          {/* Step 1: Client Company */}
          <Text style={s.sectionLabel}>Step 1: Select / Type Client Company *</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <Input
              value={clientCompanyInput}
              onChangeText={(txt) => { setClientCompanyInput(txt); fetchClientCompanies(txt); }}
              placeholder="Type or select client company..."
              style={{ flex: 1, marginBottom: 0 }}
            />
            {isAdminOrCeo && <Btn label="+ Add" size="sm" variant="secondary" onPress={handleAddCompany} />}
          </View>

          {clientCompanies.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
              <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                {clientCompanies.map((c) => (
                  <TouchableOpacity
                    key={c._id}
                    style={[cs.chip, selectedClientCompany === c.name && cs.active]}
                    onPress={() => handleSelectCompany(c.name)}
                  >
                    <Text style={[cs.chipText, selectedClientCompany === c.name && cs.activeText]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {isAdminOrCeo && (
            <Btn
              label={zipUploading ? '⏳ Uploading ZIP…' : '📁 Upload ZIP Folder of CDR Samples'}
              onPress={pickAndUploadZip}
              variant="secondary"
              block
              loading={zipUploading}
              style={{ marginBottom: spacing[3] }}
            />
          )}

          {/* Step 2: Product Subfolders under selected company */}
          {selectedClientCompany ? (
            <View style={{ marginBottom: spacing[3] }}>
              <Text style={s.sectionLabel}>Step 2: Select Product under {selectedClientCompany}</Text>
              <Input
                value={productInput}
                onChangeText={(txt) => { setProductInput(txt); fetchClientProducts(selectedClientCompany, txt); }}
                placeholder="Filter or type product name..."
                style={{ marginBottom: 6 }}
              />
              {clientProducts.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                    <TouchableOpacity
                      style={[cs.chip, !selectedProduct && cs.active]}
                      onPress={() => handleSelectProduct('')}
                    >
                      <Text style={[cs.chipText, !selectedProduct && cs.activeText]}>All Products</Text>
                    </TouchableOpacity>
                    {clientProducts.map((p) => (
                      <TouchableOpacity
                        key={p._id}
                        style={[cs.chip, selectedProduct === p.name && cs.active]}
                        onPress={() => handleSelectProduct(p.name)}
                      >
                        <Text style={[cs.chipText, selectedProduct === p.name && cs.activeText]}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          ) : null}

          {/* Step 3: CDR Sample Selector Grid */}
          {selectedClientCompany ? (
            <View style={{ marginBottom: spacing[4] }}>
              <Text style={s.sectionLabel}>
                Step 3: Select CDR Sample ({selectedClientCompany} {selectedProduct ? `> ${selectedProduct}` : ''}):
              </Text>
              {taskFiles.length === 0 ? (
                <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>No samples uploaded for this selection yet.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                  <View style={{ flexDirection: 'row', gap: spacing[3] }}>
                    {taskFiles.map((file) => {
                      const isSelected = selectedSample?._id === file._id;
                      return (
                        <View key={file._id} style={[s.sampleCard, isSelected && s.sampleCardSelected]}>
                          {file.status === 'processing' ? (
                            <View style={s.samplePlaceholder}><Text style={{ fontSize: 10 }}>⏳ Converting</Text></View>
                          ) : file.thumbnailUrl ? (
                            <Image source={{ uri: file.thumbnailUrl }} style={s.sampleImg} />
                          ) : (
                            <View style={s.samplePlaceholder}><Text style={{ fontSize: 10 }}>📄 {file.fileName}</Text></View>
                          )}
                          <Text style={s.sampleName} numberOfLines={1}>{file.fileName}</Text>
                          <Text style={s.sampleSubName} numberOfLines={1}>{file.productName}</Text>
                          <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                            {file.previewFileUrl ? (
                              <Btn label="👁️" size="xs" variant="secondary" onPress={() => setPreviewPdfUrl(file.previewFileUrl)} />
                            ) : null}
                            <Btn
                              label={isSelected ? '✅' : 'Select'}
                              size="xs"
                              variant={isSelected ? 'success' : 'primary'}
                              onPress={() => setSelectedSample(file)}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </View>
          ) : null}

          <ChipRow
            label="Internal Manufacturing Company *"
            options={COMPANIES}
            value={form.company}
            onChange={set('company')}
          />
          <Input
            label="Product Name *"
            value={form.product_name || selectedProduct}
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

      {/* Filter controls */}
      <Card style={{ marginBottom: spacing[3] }}>
        <Input placeholder="🔍 Search product, worker, company..." value={search} onChangeText={setSearch} style={{ marginBottom: spacing[2] }} />
        <ChipRow
          options={[
            { value: '', label: 'All Tasks' },
            { value: 'pending', label: 'Pending' },
            { value: 'in-progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
          ]}
          value={filterStatus}
          onChange={setFilterStatus}
        />
      </Card>

      {/* ── Task list ── */}
      <Text style={s.listTitle}>Task List ({filteredTasks.length})</Text>

      {filteredTasks.length === 0 ? (
        <EmptyState message={isManager ? 'No matching tasks found.' : 'No tasks assigned.'} />
      ) : (
        filteredTasks.map((task) => {
          const refFile = task.referenceFileId;
          return (
            <Card key={task._id} style={{ marginBottom: spacing[4] }}>
              <View style={s.row}>
                <Text style={s.taskName} numberOfLines={2}>{task.product_name || 'Task'}</Text>
                <Badge variant={statusBadgeVariant(task.status)} label={task.status} />
              </View>

              <TaskImage imagePath={task.image_path} />

              {/* Reference Sample Details & Download */}
              {refFile && (
                <View style={s.refBox}>
                  <Text style={s.refHeader}>📁 Reference CDR Sample ({refFile.productName || 'CDR'}): {refFile.fileName}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    {refFile.thumbnailUrl ? (
                      <TouchableOpacity onPress={() => setPreviewPdfUrl(refFile.previewFileUrl || refFile.originalFileUrl)}>
                        <Image source={{ uri: refFile.thumbnailUrl }} style={s.refThumb} />
                      </TouchableOpacity>
                    ) : null}
                    <View style={{ gap: 4 }}>
                      {refFile.previewFileUrl ? (
                        <Btn label="👁️ Preview PDF" size="xs" variant="secondary" onPress={() => setPreviewPdfUrl(refFile.previewFileUrl)} />
                      ) : null}
                      <Btn label="⬇️ Download .CDR" size="xs" variant="primary" onPress={() => handleDownloadCdr(refFile)} />
                    </View>
                  </View>
                </View>
              )}

              <View style={{ marginTop: spacing[3], gap: 4 }}>
                {task.clientCompany && <Text style={s.detail}><Text style={s.key}>Client Company: </Text>{task.clientCompany}</Text>}
                {task.company       && <Text style={s.detail}><Text style={s.key}>Mfg Unit: </Text>{task.company}</Text>}
                {task.worker_name   && <Text style={s.detail}><Text style={s.key}>Assigned To: </Text>{task.worker_name}</Text>}
                {task.size          && <Text style={s.detail}><Text style={s.key}>Size: </Text>{task.size}</Text>}
                {task.required_kg   && <Text style={s.detail}><Text style={s.key}>Required KG: </Text>{task.required_kg} KG</Text>}
              </View>

              <View style={s.actions}>
                {task.status === 'pending' && (
                  <Btn label="▶ Start" onPress={() => startTask(task._id)} variant="primary" size="sm" />
                )}
                {task.status === 'in-progress' && (
                  <Btn label="✅ Complete" onPress={() => openComplete(task)} variant="success" size="sm" />
                )}
                {isManager && (
                  <>
                    <Btn label="✏️ Edit" onPress={() => { setEditTask(task); setEditVisible(true); }} variant="secondary" size="sm" />
                    <Btn label="🗑️" onPress={() => deleteTask(task._id)} variant="danger" size="sm" />
                  </>
                )}
              </View>
            </Card>
          );
        })
      )}

      {/* PDF / Image Preview Modal */}
      {previewPdfUrl && (
        <Modal visible={!!previewPdfUrl} animationType="slide" onRequestClose={() => setPreviewPdfUrl(null)}>
          <View style={s.previewModalContainer}>
            <View style={s.previewModalHeader}>
              <Text style={s.previewModalTitle}>👁️ Converted Sample Preview</Text>
              <Btn label="Close" size="sm" variant="secondary" onPress={() => setPreviewPdfUrl(null)} />
            </View>
            <Image source={{ uri: previewPdfUrl }} style={s.fullPreviewImg} resizeMode="contain" />
          </View>
        </Modal>
      )}

    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  pageTitle:  { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.text },
  cardTitle:  { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing[3] },
  sectionLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginBottom: 4 },
  listTitle:  { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing[3] },
  row:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing[2] },
  taskName:   { fontSize: fontSize.base, fontWeight: '700', color: colors.text, flex: 1 },
  detail:     { fontSize: fontSize.sm, color: colors.textMuted },
  key:        { fontWeight: '600', color: colors.text },
  actions:    { flexDirection: 'row', gap: spacing[2], marginTop: spacing[3], justifyContent: 'flex-end', flexWrap: 'wrap' },
  taskImage:  { width: '100%', height: 160, borderRadius: 8, marginTop: spacing[3] },
  previewImage: { width: '100%', height: 120, borderRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing[4] },
  modalBox:   { backgroundColor: colors.surface, borderRadius: 12, padding: spacing[4] },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing[3] },
  modalButtons: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[3] },
  sampleCard: { width: 110, padding: 6, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  sampleCardSelected: { borderColor: colors.success, borderWidth: 2, backgroundColor: colors.successLight },
  sampleImg: { width: 96, height: 80, borderRadius: 6 },
  samplePlaceholder: { width: 96, height: 80, borderRadius: 6, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  sampleName: { fontSize: 10, fontWeight: '600', color: colors.text, marginTop: 4, textAlign: 'center' },
  sampleSubName: { fontSize: 9, color: colors.textMuted, textAlign: 'center' },
  refBox: { padding: 8, borderRadius: 8, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, marginTop: spacing[2] },
  refHeader: { fontSize: fontSize.xs, fontWeight: '700', color: colors.text },
  refThumb: { width: 44, height: 44, borderRadius: 6 },
  previewModalContainer: { flex: 1, backgroundColor: '#000', paddingTop: 40 },
  previewModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10 },
  previewModalTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  fullPreviewImg: { flex: 1, width: '100%' },
});

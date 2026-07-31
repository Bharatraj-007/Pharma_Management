import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useTasks } from '../../shared/hooks/useTasks';
import { WebCard, WebBadge, WebBtn, WebInput, WebModal } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function TasksScreen({ apiBaseUrl, session }) {
  const token = session?.token;
  const userRole = (session?.role || 'worker').toLowerCase();
  const company = session?.company || 'bharath';
  const activeCompany = session?.activeCompany || company;

  const {
    tasks,
    workers,
    loading,
    error,
    success,
    effectiveCompany,
    fetchTasks,
    createTask,
    updateTaskStatus,
    deleteTask,
  } = useTasks(apiBaseUrl, token, userRole, company, activeCompany);

  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  // Client Company Master, Client Products & CDR Sample Library State
  const [clientCompanies, setClientCompanies] = useState([]);
  const [selectedClientCompany, setSelectedClientCompany] = useState('');
  const [clientCompanyInput, setClientCompanyInput] = useState('');
  const [clientProducts, setClientProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productInput, setProductInput] = useState('');
  const [taskFiles, setTaskFiles] = useState([]);
  const [selectedSample, setSelectedSample] = useState(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [folderUploading, setFolderUploading] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState('');

  // Create Task Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [productName, setProductName] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [productType, setProductType] = useState('foil');
  const [quantity, setQuantity] = useState('');
  const [size, setSize] = useState('');
  const [colourCount, setColourCount] = useState('1');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isManagerOrAdmin = ['admin', 'manager', 'ceo'].includes(userRole);
  const isAdminOrCeo = ['admin', 'ceo'].includes(userRole);

  const fetchClientCompanies = async (query = '') => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/client-companies?search=${encodeURIComponent(query)}`, {
        headers: { Authorization: token }
      });
      if (res.ok) setClientCompanies(await res.json());
    } catch {}
  };

  const fetchClientProducts = async (compName = '', query = '') => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/client-products?clientCompany=${encodeURIComponent(compName)}&search=${encodeURIComponent(query)}`, {
        headers: { Authorization: token }
      });
      if (res.ok) setClientProducts(await res.json());
    } catch {}
  };

  const fetchTaskFiles = async (compName = '', prodName = '') => {
    try {
      const query = `clientCompany=${encodeURIComponent(compName)}&productName=${encodeURIComponent(prodName)}`;
      const res = await fetch(`${apiBaseUrl}/api/task-files?${query}`, {
        headers: { Authorization: token }
      });
      if (res.ok) setTaskFiles(await res.json());
    } catch {}
  };

  useEffect(() => {
    if (token) fetchClientCompanies();
  }, [token]);

  useEffect(() => {
    if (token && selectedClientCompany) {
      fetchClientProducts(selectedClientCompany);
      fetchTaskFiles(selectedClientCompany, selectedProduct);
    }
  }, [token, selectedClientCompany, selectedProduct]);

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
    setProductName(prodName); // Pre-fill task product name
  };

  const handleAddCompany = async () => {
    if (!clientCompanyInput.trim()) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/client-companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ name: clientCompanyInput.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedClientCompany(data.name);
        fetchClientCompanies();
      }
    } catch {}
  };

  const handleFolderUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setFolderUploading(true);
    setUploadStatusMsg(`Uploading ${files.length} CDR sample files (2-level hierarchy)...`);

    const formData = new FormData();
    const relativePaths = [];

    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
      relativePaths.push(files[i].webkitRelativePath || files[i].name);
    }
    formData.append('relativePaths', JSON.stringify(relativePaths));

    try {
      const res = await fetch(`${apiBaseUrl}/api/task-files/upload-folder`, {
        method: 'POST',
        headers: { Authorization: token },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Folder upload failed');
      setUploadStatusMsg(data.message || 'Folder uploaded & 2-level structure extracted!');
      fetchClientCompanies();
      if (selectedClientCompany) fetchClientProducts(selectedClientCompany);
      fetchTaskFiles(selectedClientCompany, selectedProduct);
    } catch (err) {
      alert(`Folder upload error: ${err.message}`);
    } finally {
      setFolderUploading(false);
    }
  };

  const handleCreateTask = async () => {
    const finalProdName = productName || selectedProduct;
    if (!finalProdName) return alert('Product Name is required');
    setSubmitting(true);
    try {
      await createTask({
        productName: finalProdName,
        assignedTo: assignedTo || undefined,
        productType,
        quantity: quantity ? Number(quantity) : 1,
        size,
        colourCount: Number(colourCount),
        dueDate,
        remarks,
        clientCompany: selectedClientCompany,
        referenceFileId: selectedSample?._id
      });
      setShowCreateModal(false);
      setProductName(''); setQuantity(''); setRemarks(''); setSize('');
      setSelectedSample(null);
    } catch (e) {
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesStatus = filterStatus === 'ALL' || t.status?.toLowerCase() === filterStatus.toLowerCase();
    const matchesSearch = !search || (t.productName || t.product_name)?.toLowerCase().includes(search.toLowerCase()) || (t.clientCompany || '')?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Production Tasks Dashboard</Text>
        <Text style={styles.headerSubtitle}>Assign production tasks, drill down by Company → Product → CDR Samples, and log material consumption.</Text>
      </View>

      {/* Action Header */}
      <View style={styles.actionRow}>
        <View style={styles.searchBox}>
          <WebInput
            value={search}
            onChangeText={setSearch}
            placeholder="🔍 Search tasks by product, company, or ID..."
            style={{ marginBottom: 0 }}
          />
        </View>

        {isManagerOrAdmin && (
          <WebBtn
            label="+ Assign New Task"
            onPress={() => setShowCreateModal(true)}
            variant="primary"
            size="md"
          />
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {['ALL', 'Pending', 'In Progress', 'Completed'].map(st => (
          <TouchableOpacity
            key={st}
            style={[styles.filterChip, filterStatus === st && styles.filterChipActive]}
            onPress={() => setFilterStatus(st)}
          >
            <Text style={[styles.filterChipText, filterStatus === st && styles.filterChipTextActive]}>
              {st}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      {success ? <View style={styles.successBox}><Text style={styles.successText}>{success}</Text></View> : null}

      {/* Task List Table / Cards */}
      <WebCard title={`Tasks List (${filteredTasks.length})`}>
        {loading ? (
          <Text style={styles.mutedText}>⏳ Loading tasks...</Text>
        ) : filteredTasks.length === 0 ? (
          <Text style={styles.mutedText}>No tasks found matching filter.</Text>
        ) : (
          <View style={styles.taskList}>
            {filteredTasks.map(task => {
              const statusVariant = task.status === 'Completed' ? 'success' : task.status === 'In Progress' ? 'primary' : 'warning';
              const refFile = task.referenceFileId;
              return (
                <View key={task._id} style={styles.taskCard}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text style={styles.taskTitle}>{task.productName || task.product_name}</Text>
                      <WebBadge variant={statusVariant} label={task.status || 'Pending'} />
                      {task.clientCompany ? <WebBadge variant="neutral" label={`🏢 ${task.clientCompany}`} /> : null}
                    </View>
                    <Text style={styles.taskSub}>
                      Assigned to: <Text style={{ fontWeight: '700', color: webColors.text }}>{task.assignedTo?.name || task.worker_name || 'Unassigned'}</Text> · Size: {task.size || 'N/A'} · Qty: {task.quantity || task.required_kg || 1}
                    </Text>

                    {/* Reference Sample Preview & Download */}
                    {refFile && (
                      <View style={styles.refCard}>
                        <Text style={styles.refTitle}>📁 Reference Sample ({refFile.productName || 'CDR'}): {refFile.fileName}</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, alignItems: 'center' }}>
                          {refFile.thumbnailUrl ? (
                            <TouchableOpacity onPress={() => setPreviewPdfUrl(refFile.previewFileUrl || refFile.originalFileUrl)}>
                              <Image source={{ uri: refFile.thumbnailUrl }} style={styles.refThumb} />
                            </TouchableOpacity>
                          ) : null}
                          <View style={{ gap: 4 }}>
                            {refFile.previewFileUrl ? (
                              <WebBtn label="👁️ Preview PDF" size="sm" variant="neutral" onPress={() => setPreviewPdfUrl(refFile.previewFileUrl)} />
                            ) : null}
                            <a href={`${apiBaseUrl}/api/task-files/${refFile._id}/download`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                              <WebBtn label="⬇️ Download .CDR" size="sm" variant="secondary" />
                            </a>
                          </View>
                        </View>
                      </View>
                    )}

                    {task.remarks ? <Text style={styles.taskRemarks}>Notes: {task.remarks}</Text> : null}
                  </View>

                  <View style={styles.cardActions}>
                    {task.status === 'Pending' && (
                      <WebBtn label="▶️ Start" size="sm" variant="primary" onPress={() => updateTaskStatus(task._id, 'In Progress')} />
                    )}
                    {task.status === 'In Progress' && (
                      <WebBtn label="✅ Complete" size="sm" variant="success" onPress={() => updateTaskStatus(task._id, 'Completed')} />
                    )}
                    {isManagerOrAdmin && (
                      <WebBtn label="🗑️" size="sm" variant="danger" onPress={() => deleteTask(task._id)} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </WebCard>

      {/* Assign Task Modal */}
      <WebModal visible={showCreateModal} title="+ Assign New Production Task" onClose={() => setShowCreateModal(false)}>
        {/* Step 1: Client Company */}
        <View style={styles.librarySection}>
          <Text style={styles.modalLabel}>Step 1: Select / Type Client Company *</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <WebInput
              value={clientCompanyInput}
              onChangeText={(txt) => { setClientCompanyInput(txt); fetchClientCompanies(txt); }}
              placeholder="Type or select client company..."
              style={{ flex: 1, marginBottom: 0 }}
            />
            {isAdminOrCeo && (
              <WebBtn label="+ Add Company" size="md" variant="secondary" onPress={handleAddCompany} />
            )}
          </View>

          {clientCompanies.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {clientCompanies.map((c) => (
                  <TouchableOpacity
                    key={c._id}
                    style={[styles.compChip, selectedClientCompany === c.name && styles.compChipActive]}
                    onPress={() => handleSelectCompany(c.name)}
                  >
                    <Text style={[styles.compChipText, selectedClientCompany === c.name && styles.compChipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Bulk Folder Upload Option (2-level directory selection) */}
          {isAdminOrCeo && (
            <View style={styles.uploadBox}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: webColors.text, marginBottom: 4 }}>
                📁 Bulk Upload 2-Level Folder (Company / Product / .cdr files):
              </Text>
              <input
                type="file"
                webkitdirectory="true"
                directory="true"
                multiple
                onChange={handleFolderUpload}
                style={{ fontSize: 12, color: webColors.text }}
              />
              {folderUploading ? <Text style={styles.statusText}>⏳ {uploadStatusMsg}</Text> : null}
            </View>
          )}

          {/* Step 2: Product Subfolders under selected company */}
          {selectedClientCompany ? (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.modalLabel}>Step 2: Select Product under {selectedClientCompany}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <WebInput
                  value={productInput}
                  onChangeText={(txt) => { setProductInput(txt); fetchClientProducts(selectedClientCompany, txt); }}
                  placeholder="Filter or type product name..."
                  style={{ flex: 1, marginBottom: 0 }}
                />
              </View>

              {clientProducts.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={[styles.prodChip, !selectedProduct && styles.prodChipActive]}
                      onPress={() => handleSelectProduct('')}
                    >
                      <Text style={[styles.prodChipText, !selectedProduct && styles.prodChipTextActive]}>All Products</Text>
                    </TouchableOpacity>
                    {clientProducts.map((p) => (
                      <TouchableOpacity
                        key={p._id}
                        style={[styles.prodChip, selectedProduct === p.name && styles.prodChipActive]}
                        onPress={() => handleSelectProduct(p.name)}
                      >
                        <Text style={[styles.prodChipText, selectedProduct === p.name && styles.prodChipTextActive]}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          ) : null}

          {/* Step 3: CDR Sample Library Grid for Selected Company & Product */}
          {selectedClientCompany ? (
            <View style={styles.sampleGridSection}>
              <Text style={styles.modalLabel}>
                Step 3: CDR Samples for {selectedClientCompany} {selectedProduct ? `> ${selectedProduct}` : ''}:
              </Text>
              {taskFiles.length === 0 ? (
                <Text style={styles.mutedText}>No samples uploaded for this selection yet.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {taskFiles.map((file) => {
                      const isSelected = selectedSample?._id === file._id;
                      return (
                        <View key={file._id} style={[styles.sampleCard, isSelected && styles.sampleCardSelected]}>
                          {file.status === 'processing' ? (
                            <View style={styles.samplePlaceholder}><Text>⏳ Converting...</Text></View>
                          ) : file.thumbnailUrl ? (
                            <Image source={{ uri: file.thumbnailUrl }} style={styles.sampleImg} />
                          ) : (
                            <View style={styles.samplePlaceholder}><Text>📄 {file.fileName}</Text></View>
                          )}
                          <Text style={styles.sampleName} numberOfLines={1}>{file.fileName}</Text>
                          <Text style={styles.sampleProdName} numberOfLines={1}>{file.productName}</Text>
                          <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                            {file.previewFileUrl ? (
                              <WebBtn label="👁️" size="sm" variant="neutral" onPress={() => setPreviewPdfUrl(file.previewFileUrl)} />
                            ) : null}
                            <WebBtn
                              label={isSelected ? '✅ Selected' : 'Select'}
                              size="sm"
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
        </View>

        <WebInput label="Product Name *" value={productName} onChangeText={setProductName} placeholder="e.g. Paracetamol 500mg Foil" />

        <Text style={styles.modalLabel}>Assign Worker</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity style={[styles.workerChip, !assignedTo && styles.workerChipActive]} onPress={() => setAssignedTo('')}>
              <Text style={[styles.workerChipText, !assignedTo && styles.workerChipTextActive]}>Unassigned</Text>
            </TouchableOpacity>
            {workers.map(w => (
              <TouchableOpacity
                key={w._id}
                style={[styles.workerChip, assignedTo === w._id && styles.workerChipActive]}
                onPress={() => setAssignedTo(w._id)}
              >
                <Text style={[styles.workerChipText, assignedTo === w._id && styles.workerChipTextActive]}>{w.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.rowGrid}>
          <WebInput label="Quantity / Rolls" value={quantity} onChangeText={setQuantity} placeholder="e.g. 10" keyboardType="numeric" style={{ flex: 1 }} />
          <WebInput label="Dimensions / Size" value={size} onChangeText={setSize} placeholder="e.g. 100mm" style={{ flex: 1 }} />
        </View>

        <WebInput label="Due Date" value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" />
        <WebInput label="Special Instructions / Remarks" value={remarks} onChangeText={setRemarks} placeholder="Notes for worker..." />

        <WebBtn
          label={submitting ? '⏳ Submitting...' : '🚀 Submit Task Assignment'}
          onPress={handleCreateTask}
          variant="primary"
          size="lg"
          style={{ marginTop: 16 }}
        />
      </WebModal>

      {/* Full Preview Modal */}
      {previewPdfUrl && (
        <WebModal visible={!!previewPdfUrl} title="👁️ Converted CDR Sample Preview" onClose={() => setPreviewPdfUrl(null)}>
          <View style={{ height: 450, width: '100%' }}>
            <iframe src={previewPdfUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="PDF Preview" />
          </View>
          <WebBtn label="Close Preview" variant="secondary" onPress={() => setPreviewPdfUrl(null)} style={{ marginTop: 12 }} />
        </WebModal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: webSpacing.lg },
  header: { marginBottom: webSpacing.xs },
  headerTitle: { fontSize: webFontSize.title, fontWeight: '800', color: webColors.text },
  headerSubtitle: { fontSize: webFontSize.base, color: webColors.textMuted, marginTop: 4 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  searchBox: { flex: 1, maxWidth: 450 },
  filterTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: webColors.surface, borderWidth: 1, borderColor: webColors.border },
  filterChipActive: { backgroundColor: webColors.primary, borderColor: webColors.primary },
  filterChipText: { fontSize: webFontSize.xs, fontWeight: '700', color: webColors.text },
  filterChipTextActive: { color: '#ffffff' },
  taskList: { gap: 12 },
  taskCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 10, backgroundColor: webColors.surfaceAlt, borderWidth: 1, borderColor: webColors.border },
  taskTitle: { fontSize: webFontSize.base, fontWeight: '800', color: webColors.text },
  taskSub: { fontSize: webFontSize.xs, color: webColors.textMuted, marginTop: 2 },
  taskRemarks: { fontSize: webFontSize.xs, color: webColors.primary, marginTop: 4, fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  mutedText: { color: webColors.textMuted, padding: 12 },
  errorBox: { padding: 12, borderRadius: 8, backgroundColor: webColors.dangerLight, marginBottom: 12 },
  errorText: { color: webColors.dangerDark, fontWeight: '700' },
  successBox: { padding: 12, borderRadius: 8, backgroundColor: webColors.successLight, marginBottom: 12 },
  successText: { color: webColors.successDark, fontWeight: '700' },
  modalLabel: { fontSize: webFontSize.xs, fontWeight: '700', color: webColors.text, marginBottom: 6 },
  workerChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: webColors.surfaceAlt, borderWidth: 1, borderColor: webColors.border },
  workerChipActive: { backgroundColor: webColors.primary, borderColor: webColors.primary },
  workerChipText: { fontSize: 12, color: webColors.text, fontWeight: '600' },
  workerChipTextActive: { color: '#ffffff', fontWeight: '800' },
  rowGrid: { flexDirection: 'row', gap: 12 },
  compChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: webColors.surfaceAlt, borderWidth: 1, borderColor: webColors.border },
  compChipActive: { backgroundColor: webColors.primary, borderColor: webColors.primary },
  compChipText: { fontSize: 12, color: webColors.text },
  compChipTextActive: { color: '#ffffff', fontWeight: '700' },
  prodChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: webColors.surface, borderWidth: 1, borderColor: webColors.border },
  prodChipActive: { backgroundColor: webColors.secondary, borderColor: webColors.secondary },
  prodChipText: { fontSize: 11, color: webColors.text },
  prodChipTextActive: { color: '#ffffff', fontWeight: '700' },
  uploadBox: { padding: 10, backgroundColor: webColors.surfaceAlt, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: webColors.border },
  statusText: { fontSize: 12, color: webColors.primary, fontWeight: '700', marginTop: 4 },
  sampleGridSection: { marginTop: 8, marginBottom: 12 },
  sampleCard: { width: 120, padding: 8, borderRadius: 8, backgroundColor: webColors.surface, borderWidth: 1, borderColor: webColors.border, alignItems: 'center' },
  sampleCardSelected: { borderColor: webColors.success, borderWidth: 2, backgroundColor: webColors.successLight },
  sampleImg: { width: 104, height: 90, borderRadius: 6, resizeMode: 'cover' },
  samplePlaceholder: { width: 104, height: 90, borderRadius: 6, backgroundColor: webColors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  sampleName: { fontSize: 11, fontWeight: '600', color: webColors.text, marginTop: 4, textAlign: 'center' },
  sampleProdName: { fontSize: 10, color: webColors.textMuted, textAlign: 'center' },
  refCard: { padding: 10, borderRadius: 8, backgroundColor: webColors.surface, borderWidth: 1, borderColor: webColors.border, marginTop: 8 },
  refTitle: { fontSize: webFontSize.xs, fontWeight: '700', color: webColors.text },
  refThumb: { width: 44, height: 44, borderRadius: 6 },
});

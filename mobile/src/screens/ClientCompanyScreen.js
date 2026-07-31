/**
 * ClientCompanyScreen — Standalone management hub for Client Companies, Products, and CDR Samples.
 */
import React, { useEffect, useState, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, Modal, Image, Platform, Linking
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { AuthContext } from '../navigation/AuthContext';
import API_BASE_URL from '../config';
import ScreenWrapper from '../components/ScreenWrapper';
import { Card, Badge, AlertBanner, Btn, Input, Spinner, EmptyState } from '../components/ui';
import { colors, spacing, fontSize } from '../styles/theme';

export default function ClientCompanyScreen() {
  const { session } = useContext(AuthContext);
  const token = session?.token;
  const role = (session?.role || 'worker').toLowerCase();
  const isAdminOrCeo = ['admin', 'ceo'].includes(role);

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');

  // Selected drill-down state
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [taskFiles, setTaskFiles] = useState([]);
  const [newProductName, setNewProductName] = useState('');

  // Modals & Upload state
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [zipUploading, setZipUploading] = useState(false);

  const fetchCompanies = useCallback(async (query = '') => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/client-companies?search=${encodeURIComponent(query)}`, {
        headers: { Authorization: token },
      });
      if (res.ok) setCompanies(await res.json());
    } catch {}
    finally { setLoading(false); }
  }, [token]);

  const fetchProducts = useCallback(async (compName) => {
    if (!token || !compName) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/client-products?clientCompany=${encodeURIComponent(compName)}`, {
        headers: { Authorization: token },
      });
      if (res.ok) setProducts(await res.json());
    } catch {}
  }, [token]);

  const fetchTaskFiles = useCallback(async (compName, prodName = '') => {
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
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    if (selectedCompany) {
      fetchProducts(selectedCompany.name);
      fetchTaskFiles(selectedCompany.name, selectedProduct?.name || '');
    }
  }, [selectedCompany, selectedProduct, fetchProducts, fetchTaskFiles]);

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/client-companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ name: newCompanyName.trim() }),
      });
      if (res.ok) {
        const company = await res.json();
        setShowAddCompanyModal(false);
        setNewCompanyName('');
        fetchCompanies();
        setSelectedCompany(company);
      }
    } catch {}
  };

  const handleCreateProduct = async () => {
    if (!selectedCompany || !newProductName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/client-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ clientCompany: selectedCompany.name, name: newProductName.trim() }),
      });
      if (res.ok) {
        setShowAddProductModal(false);
        setNewProductName('');
        fetchProducts(selectedCompany.name);
      }
    } catch {}
  };

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
      if (selectedCompany) fd.append('clientCompany', selectedCompany.name);

      const res = await fetch(`${API_BASE_URL}/api/task-files/upload-zip`, {
        method: 'POST',
        headers: { Authorization: token },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ZIP upload failed');

      Alert.alert('✅ Success', data.message || 'ZIP extracted & 2-level structure converted!');
      fetchCompanies();
      if (selectedCompany) {
        fetchProducts(selectedCompany.name);
        fetchTaskFiles(selectedCompany.name, selectedProduct?.name || '');
      }
    } catch (err) {
      Alert.alert('Upload Error', err.message);
    } finally {
      setZipUploading(false);
    }
  };

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

  const filteredCompanies = companies.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <ScreenWrapper refreshing={loading} onRefresh={fetchCompanies}>
      {/* Header */}
      <View style={s.pageHeader}>
        <Text style={s.pageTitle}>🏢 Client Company</Text>
        {isAdminOrCeo && (
          <Btn label="➕ Add" size="sm" variant="success" onPress={() => setShowAddCompanyModal(true)} />
        )}
      </View>

      {/* Upload ZIP Banner */}
      {isAdminOrCeo && (
        <Card style={{ marginBottom: spacing[3] }}>
          <Btn
            label={zipUploading ? '⏳ Uploading ZIP…' : '📁 Upload ZIP Folder (Company/Product/CDR)'}
            onPress={pickAndUploadZip}
            variant="secondary"
            block
            loading={zipUploading}
          />
        </Card>
      )}

      {/* Search Input */}
      <Input
        placeholder="🔍 Search client companies…"
        value={search}
        onChangeText={(txt) => { setSearch(txt); fetchCompanies(txt); }}
        style={{ marginBottom: spacing[3] }}
      />

      {/* Breadcrumb Navigation */}
      <View style={s.breadcrumbRow}>
        <TouchableOpacity onPress={() => { setSelectedCompany(null); setSelectedProduct(null); }}>
          <Text style={[s.crumbText, !selectedCompany && s.crumbActive]}>Companies ({companies.length})</Text>
        </TouchableOpacity>
        {selectedCompany && (
          <>
            <Text style={s.crumbSep}>›</Text>
            <TouchableOpacity onPress={() => setSelectedProduct(null)}>
              <Text style={[s.crumbText, !selectedProduct && s.crumbActive]}>{selectedCompany.name}</Text>
            </TouchableOpacity>
          </>
        )}
        {selectedProduct && (
          <>
            <Text style={s.crumbSep}>›</Text>
            <Text style={[s.crumbText, s.crumbActive]}>{selectedProduct.name}</Text>
          </>
        )}
      </View>

      {/* Content Area */}
      {!selectedCompany ? (
        /* Level 1: Client Companies Grid */
        <View style={{ gap: spacing[3] }}>
          {filteredCompanies.length === 0 ? (
            <EmptyState message="No client companies registered." />
          ) : (
            filteredCompanies.map((comp) => (
              <Card key={comp._id}>
                <TouchableOpacity onPress={() => setSelectedCompany(comp)} style={s.companyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.companyName}>🏢 {comp.name}</Text>
                    <Text style={s.companySub}>Tap to view products & CDR sample files</Text>
                  </View>
                  <Text style={s.arrow}>›</Text>
                </TouchableOpacity>
              </Card>
            ))
          )}
        </View>
      ) : (
        /* Level 2 & 3: Products & Samples */
        <View style={{ gap: spacing[4] }}>
          {/* Products Bar */}
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={s.sectionTitle}>Products under {selectedCompany.name}</Text>
              {isAdminOrCeo && (
                <Btn label="+ Product" size="xs" variant="secondary" onPress={() => setShowAddProductModal(true)} />
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                <TouchableOpacity
                  style={[s.chip, !selectedProduct && s.chipActive]}
                  onPress={() => setSelectedProduct(null)}
                >
                  <Text style={[s.chipText, !selectedProduct && s.chipActiveText]}>All Products ({products.length})</Text>
                </TouchableOpacity>
                {products.map((p) => (
                  <TouchableOpacity
                    key={p._id}
                    style={[s.chip, selectedProduct?._id === p._id && s.chipActive]}
                    onPress={() => setSelectedProduct(p)}
                  >
                    <Text style={[s.chipText, selectedProduct?._id === p._id && s.chipActiveText]}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Card>

          {/* Sample Files List */}
          <Card>
            <Text style={s.sectionTitle}>CDR Samples ({taskFiles.length})</Text>
            {taskFiles.length === 0 ? (
              <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 }}>No samples uploaded for this product yet.</Text>
            ) : (
              <View style={{ gap: spacing[3], marginTop: 8 }}>
                {taskFiles.map((file) => (
                  <View key={file._id} style={s.sampleRow}>
                    {file.thumbnailUrl ? (
                      <TouchableOpacity onPress={() => setPreviewPdfUrl(file.previewFileUrl || file.originalFileUrl)}>
                        <Image source={{ uri: file.thumbnailUrl }} style={s.sampleThumb} />
                      </TouchableOpacity>
                    ) : (
                      <View style={s.samplePlaceholder}><Text style={{ fontSize: 10 }}>📄 CDR</Text></View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={s.sampleName} numberOfLines={1}>{file.fileName}</Text>
                      <Text style={s.sampleSub}>{file.productName || 'General Product'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {file.previewFileUrl ? (
                        <Btn label="👁️" size="xs" variant="secondary" onPress={() => setPreviewPdfUrl(file.previewFileUrl)} />
                      ) : null}
                      <Btn label="⬇️" size="xs" variant="primary" onPress={() => handleDownloadCdr(file)} />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </View>
      )}

      {/* Add Company Modal */}
      <Modal visible={showAddCompanyModal} animationType="slide" transparent onRequestClose={() => setShowAddCompanyModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>➕ Add Client Company</Text>
            <Input label="Company Name *" value={newCompanyName} onChangeText={setNewCompanyName} placeholder="e.g. Goodman Pharma Ltd" />
            <View style={s.modalButtons}>
              <Btn label="Cancel" variant="secondary" onPress={() => setShowAddCompanyModal(false)} style={{ flex: 1 }} />
              <Btn label="Save" variant="primary" onPress={handleCreateCompany} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Product Modal */}
      <Modal visible={showAddProductModal} animationType="slide" transparent onRequestClose={() => setShowAddProductModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>➕ Add Product under {selectedCompany?.name}</Text>
            <Input label="Product Name *" value={newProductName} onChangeText={setNewProductName} placeholder="e.g. Paracetamol 500mg" />
            <View style={s.modalButtons}>
              <Btn label="Cancel" variant="secondary" onPress={() => setShowAddProductModal(false)} style={{ flex: 1 }} />
              <Btn label="Save" variant="primary" onPress={handleCreateProduct} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* PDF Preview Modal */}
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
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] },
  pageTitle: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.text },
  breadcrumbRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing[3] },
  crumbText: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '600' },
  crumbActive: { color: colors.primary, fontWeight: '800' },
  crumbSep: { fontSize: fontSize.xs, color: colors.textMuted },
  companyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  companyName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  companySub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  arrow: { fontSize: 20, color: colors.textMuted, fontWeight: '800' },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.xs, color: colors.text },
  chipActiveText: { color: '#fff', fontWeight: '700' },
  sampleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  sampleThumb: { width: 44, height: 44, borderRadius: 6 },
  samplePlaceholder: { width: 44, height: 44, borderRadius: 6, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  sampleName: { fontSize: fontSize.xs, fontWeight: '700', color: colors.text },
  sampleSub: { fontSize: 10, color: colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing[4] },
  modalBox: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing[4] },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing[3] },
  modalButtons: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[3] },
  previewModalContainer: { flex: 1, backgroundColor: '#000', paddingTop: 40 },
  previewModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10 },
  previewModalTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  fullPreviewImg: { flex: 1, width: '100%' },
});

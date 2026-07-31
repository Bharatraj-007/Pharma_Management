import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { WebCard, WebBadge, WebBtn, WebInput, WebModal } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function ClientCompanyScreen({ apiBaseUrl, session }) {
  const token = session?.token;
  const userRole = (session?.role || 'worker').toLowerCase();
  const isAdminOrCeo = ['admin', 'ceo'].includes(userRole);

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
  const [folderUploading, setFolderUploading] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState('');

  const fetchCompanies = async (query = '') => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/client-companies?search=${encodeURIComponent(query)}`, {
        headers: { Authorization: token }
      });
      if (res.ok) setCompanies(await res.json());
    } catch {}
    finally { setLoading(false); }
  };

  const fetchProducts = async (compName) => {
    if (!compName) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/client-products?clientCompany=${encodeURIComponent(compName)}`, {
        headers: { Authorization: token }
      });
      if (res.ok) setProducts(await res.json());
    } catch {}
  };

  const fetchTaskFiles = async (compName, prodName = '') => {
    if (!compName) return;
    try {
      const query = `clientCompany=${encodeURIComponent(compName)}&productName=${encodeURIComponent(prodName)}`;
      const res = await fetch(`${apiBaseUrl}/api/task-files?${query}`, {
        headers: { Authorization: token }
      });
      if (res.ok) setTaskFiles(await res.json());
    } catch {}
  };

  useEffect(() => {
    if (token) fetchCompanies();
  }, [token]);

  useEffect(() => {
    if (token && selectedCompany) {
      fetchProducts(selectedCompany.name);
      fetchTaskFiles(selectedCompany.name, selectedProduct?.name || '');
    }
  }, [token, selectedCompany, selectedProduct]);

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/client-companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ name: newCompanyName.trim() })
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
      const res = await fetch(`${apiBaseUrl}/api/client-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ clientCompany: selectedCompany.name, name: newProductName.trim() })
      });
      if (res.ok) {
        setShowAddProductModal(false);
        setNewProductName('');
        fetchProducts(selectedCompany.name);
      }
    } catch {}
  };

  const handleFolderUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setFolderUploading(true);
    setUploadStatusMsg(`Uploading ${files.length} CDR sample files across 2-level directory structure...`);

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
      setUploadStatusMsg(data.message || 'Folder uploaded & structure extracted!');
      fetchCompanies();
      if (selectedCompany) {
        fetchProducts(selectedCompany.name);
        fetchTaskFiles(selectedCompany.name, selectedProduct?.name || '');
      }
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setFolderUploading(false);
    }
  };

  const filteredCompanies = companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      {/* Page Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏢 Client Company Master Hub</Text>
        <Text style={styles.headerSubtitle}>
          Manage client companies, product subfolders, and CorelDRAW CDR sample files independently.
        </Text>
      </View>

      {/* Action Row */}
      <View style={styles.actionRow}>
        <View style={styles.searchBox}>
          <WebInput
            value={search}
            onChangeText={(txt) => { setSearch(txt); fetchCompanies(txt); }}
            placeholder="🔍 Search client companies..."
            style={{ marginBottom: 0 }}
          />
        </View>

        {isAdminOrCeo && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <WebBtn label="+ Add Company" variant="primary" onPress={() => setShowAddCompanyModal(true)} />
          </View>
        )}
      </View>

      {/* Bulk Upload Banner for Admin & CEO */}
      {isAdminOrCeo && (
        <WebCard>
          <View style={styles.uploadBanner}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: webColors.text }}>
                📁 Bulk Upload Folder Structure (`CompanyName / ProductName / sample.cdr`)
              </Text>
              <Text style={{ fontSize: 12, color: webColors.textMuted, marginTop: 2 }}>
                Upload your local folder tree containing 10+ companies and product subfolders in a single action.
              </Text>
            </View>
            <input
              type="file"
              webkitdirectory="true"
              directory="true"
              multiple
              onChange={handleFolderUpload}
              style={{ fontSize: 12, color: webColors.text }}
            />
          </View>
          {folderUploading ? <Text style={styles.uploadStatus}>⏳ {uploadStatusMsg}</Text> : null}
        </WebCard>
      )}

      {/* Breadcrumb Navigation */}
      <View style={styles.breadcrumbRow}>
        <TouchableOpacity onPress={() => { setSelectedCompany(null); setSelectedProduct(null); }}>
          <Text style={[styles.crumbText, !selectedCompany && styles.crumbActive]}>All Client Companies ({companies.length})</Text>
        </TouchableOpacity>
        {selectedCompany && (
          <>
            <Text style={styles.crumbSep}>›</Text>
            <TouchableOpacity onPress={() => setSelectedProduct(null)}>
              <Text style={[styles.crumbText, !selectedProduct && styles.crumbActive]}>🏢 {selectedCompany.name}</Text>
            </TouchableOpacity>
          </>
        )}
        {selectedProduct && (
          <>
            <Text style={styles.crumbSep}>›</Text>
            <Text style={[styles.crumbText, styles.crumbActive]}>📦 {selectedProduct.name}</Text>
          </>
        )}
      </View>

      {/* Main Content Area */}
      {!selectedCompany ? (
        /* Level 1: Client Companies Cards Grid */
        <WebCard title="Client Companies Master">
          {loading ? (
            <Text style={styles.mutedText}>⏳ Loading client companies...</Text>
          ) : filteredCompanies.length === 0 ? (
            <Text style={styles.mutedText}>No client companies found.</Text>
          ) : (
            <View style={styles.companyGrid}>
              {filteredCompanies.map(comp => (
                <TouchableOpacity
                  key={comp._id}
                  style={styles.companyCard}
                  onPress={() => setSelectedCompany(comp)}
                >
                  <View style={styles.companyHeader}>
                    <Text style={styles.companyIcon}>🏢</Text>
                    <Text style={styles.companyName}>{comp.name}</Text>
                  </View>
                  <Text style={styles.companySub}>Click to view Products & CDR Samples</Text>
                  <View style={styles.cardFooter}>
                    <WebBadge variant="neutral" label="Active Client" />
                    <Text style={styles.cardDate}>Added {new Date(comp.createdAt).toLocaleDateString()}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </WebCard>
      ) : (
        /* Level 2 & 3: Products & Samples for Selected Company */
        <View style={{ gap: 16 }}>
          {/* Products Bar */}
          <WebCard title={`Products under ${selectedCompany.name}`}>
            <View style={styles.prodHeaderRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.prodChip, !selectedProduct && styles.prodChipActive]}
                    onPress={() => setSelectedProduct(null)}
                  >
                    <Text style={[styles.prodChipText, !selectedProduct && styles.prodChipTextActive]}>All Products ({products.length})</Text>
                  </TouchableOpacity>
                  {products.map(p => (
                    <TouchableOpacity
                      key={p._id}
                      style={[styles.prodChip, selectedProduct?._id === p._id && styles.prodChipActive]}
                      onPress={() => setSelectedProduct(p)}
                    >
                      <Text style={[styles.prodChipText, selectedProduct?._id === p._id && styles.prodChipTextActive]}>📦 {p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              {isAdminOrCeo && (
                <WebBtn label="+ Add Product" size="sm" variant="secondary" onPress={() => setShowAddProductModal(true)} />
              )}
            </View>
          </WebCard>

          {/* Sample Files Grid */}
          <WebCard title={`CDR Sample Files (${taskFiles.length})`}>
            {taskFiles.length === 0 ? (
              <Text style={styles.mutedText}>No samples uploaded for this selection yet.</Text>
            ) : (
              <View style={styles.sampleGrid}>
                {taskFiles.map(file => (
                  <View key={file._id} style={styles.sampleCard}>
                    {file.status === 'processing' ? (
                      <View style={styles.samplePlaceholder}><Text>⏳ Converting...</Text></View>
                    ) : file.thumbnailUrl ? (
                      <Image source={{ uri: file.thumbnailUrl }} style={styles.sampleImg} />
                    ) : (
                      <View style={styles.samplePlaceholder}><Text>📄 {file.fileName}</Text></View>
                    )}
                    <Text style={styles.sampleName} numberOfLines={1}>{file.fileName}</Text>
                    <Text style={styles.sampleProdName} numberOfLines={1}>Product: {file.productName || 'General'}</Text>
                    <View style={styles.sampleActions}>
                      {file.previewFileUrl ? (
                        <WebBtn label="👁️ Preview PDF" size="sm" variant="neutral" onPress={() => setPreviewPdfUrl(file.previewFileUrl)} />
                      ) : null}
                      <a href={`${apiBaseUrl}/api/task-files/${file._id}/download`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                        <WebBtn label="⬇️ .CDR" size="sm" variant="secondary" />
                      </a>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </WebCard>
        </View>
      )}

      {/* Add Company Modal */}
      <WebModal visible={showAddCompanyModal} title="+ Add Client Company" onClose={() => setShowAddCompanyModal(false)}>
        <WebInput label="Client Company Name *" value={newCompanyName} onChangeText={setNewCompanyName} placeholder="e.g. Goodman Pharma Ltd" />
        <WebBtn label="Save Company" variant="primary" onPress={handleCreateCompany} style={{ marginTop: 12 }} />
      </WebModal>

      {/* Add Product Modal */}
      <WebModal visible={showAddProductModal} title={`+ Add Product under ${selectedCompany?.name}`} onClose={() => setShowAddProductModal(false)}>
        <WebInput label="Product Name *" value={newProductName} onChangeText={setNewProductName} placeholder="e.g. Paracetamol 500mg" />
        <WebBtn label="Save Product" variant="primary" onPress={handleCreateProduct} style={{ marginTop: 12 }} />
      </WebModal>

      {/* PDF Preview Modal */}
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
  uploadBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  uploadStatus: { fontSize: 12, color: webColors.primary, fontWeight: '700', marginTop: 8 },
  breadcrumbRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  crumbText: { fontSize: 14, fontWeight: '600', color: webColors.textMuted },
  crumbActive: { fontWeight: '800', color: webColors.primary },
  crumbSep: { fontSize: 14, color: webColors.textMuted },
  companyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  companyCard: { width: 260, padding: 16, borderRadius: 12, backgroundColor: webColors.surfaceAlt, borderWidth: 1, borderColor: webColors.border, gap: 8 },
  companyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  companyIcon: { fontSize: 24 },
  companyName: { fontSize: 16, fontWeight: '800', color: webColors.text, flex: 1 },
  companySub: { fontSize: 12, color: webColors.textMuted },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  cardDate: { fontSize: 10, color: webColors.textMuted },
  mutedText: { color: webColors.textMuted, padding: 12 },
  prodHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  prodChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: webColors.surfaceAlt, borderWidth: 1, borderColor: webColors.border },
  prodChipActive: { backgroundColor: webColors.primary, borderColor: webColors.primary },
  prodChipText: { fontSize: 12, fontWeight: '600', color: webColors.text },
  prodChipTextActive: { color: '#ffffff', fontWeight: '800' },
  sampleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  sampleCard: { width: 160, padding: 10, borderRadius: 10, backgroundColor: webColors.surfaceAlt, borderWidth: 1, borderColor: webColors.border, alignItems: 'center' },
  sampleImg: { width: 140, height: 120, borderRadius: 8, resizeMode: 'cover' },
  samplePlaceholder: { width: 140, height: 120, borderRadius: 8, backgroundColor: webColors.surface, alignItems: 'center', justifyContent: 'center' },
  sampleName: { fontSize: 12, fontWeight: '700', color: webColors.text, marginTop: 6, textAlign: 'center' },
  sampleProdName: { fontSize: 11, color: webColors.textMuted, textAlign: 'center', marginBottom: 6 },
  sampleActions: { flexDirection: 'row', gap: 6, width: '100%', justifyContent: 'center' },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useDispatchForm } from '../../shared/hooks/useDispatchForm';
import { WebCard, WebBadge, WebBtn, WebInput, WebModal } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function DispatchScreen({ apiBaseUrl, session }) {
  const token = session?.token;
  const userRole = (session?.role || 'worker').toLowerCase();
  const company = session?.company || 'bharath';
  const activeCompany = session?.activeCompany || company;

  const {
    productList,
    reports,
    loading,
    error,
    success,
    effectiveCompany,
    createDispatch,
    fetchReports,
    deleteDispatch,
  } = useDispatchForm(apiBaseUrl, token, company, userRole, activeCompany);

  const [activeTab, setActiveTab] = useState('form');

  // Form State
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [productName, setProductName] = useState('');
  const [colorsUsed, setColorsUsed] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [quantity, setQuantity] = useState('');
  const [destinationType, setDestinationType] = useState('External Client / Customer');
  const [destinationCompany, setDestinationCompany] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('A1 Transport');
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');

  // Inline Product Creation
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdSize, setNewProdSize] = useState('');
  const [newProdWeight, setNewProdWeight] = useState('');
  const [newProdColors, setNewProdColors] = useState('1');

  // Report State
  const today = new Date().toISOString().split('T')[0];
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const companyTitle = effectiveCompany === 'shree_ganaapathy'
    ? 'Company 2 — Shree Ganaapathy Roto Prints'
    : effectiveCompany === 'vel'
    ? 'Company 3 — Vel Gravure'
    : 'Company 1 — Bharath Enterprises';

  const handleSelectCatalog = (id) => {
    setSelectedCatalogId(id);
    const prod = productList.find(p => p._id === id);
    if (prod) {
      setProductName(prod.productName);
      setDimensions(prod.size || '');
      setWeightKg(String(prod.weightKg || ''));
    }
  };

  const handleFormSubmit = async () => {
    if (!productName || !quantity || !destinationCompany) {
      alert('Please fill in Product Name, Quantity, and Destination Company.');
      return;
    }
    try {
      await createDispatch({
        productName,
        quantity: Number(quantity),
        weightKg: Number(weightKg || 0),
        colorsUsed,
        dimensions,
        destinationCompany,
        destinationType,
        deliveryMethod,
        dispatchDate,
        remarks,
      });
      setProductName(''); setQuantity(''); setDestinationCompany(''); setColorsUsed(''); setDimensions(''); setWeightKg('');
    } catch (e) {}
  };

  const handleCreateProduct = async () => {
    if (!newProdName) return alert('Product name is required');
    try {
      const res = await fetch(`${apiBaseUrl}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({
          company: effectiveCompany,
          productName: newProdName,
          size: newProdSize,
          weightKg: newProdWeight ? Number(newProdWeight) : 0,
          numberOfColors: newProdColors ? Number(newProdColors) : 1,
        }),
      });
      if (res.ok) {
        alert('Product created!');
        setShowAddProduct(false);
        setNewProdName('');
      }
    } catch (e) {}
  };

  const handleLoadReports = () => {
    fetchReports(from, to, effectiveCompany);
  };

  return (
    <View style={styles.container}>
      {/* Page Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚚 Dispatch & Delivery System</Text>
        <Text style={styles.headerSubtitle}>Record dispatches and view daily bill-style delivery reports</Text>
      </View>

      {/* Sub-header Action Tabs */}
      <View style={styles.actionTabRow}>
        <TouchableOpacity
          style={[styles.actionTab, activeTab === 'form' && styles.actionTabActive]}
          onPress={() => setActiveTab('form')}
        >
          <Text style={[styles.actionTabText, activeTab === 'form' && styles.actionTabTextActive]}>+ New Dispatch</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionTab, activeTab === 'report' && styles.actionTabActive]}
          onPress={() => { setActiveTab('report'); handleLoadReports(); }}
        >
          <Text style={[styles.actionTabText, activeTab === 'report' && styles.actionTabTextActive]}>Dispatch Bill / Report</Text>
        </TouchableOpacity>
      </View>

      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      {success ? <View style={styles.successBox}><Text style={styles.successText}>{success}</Text></View> : null}

      {activeTab === 'form' && (
        <WebCard style={styles.mainCard}>
          <View style={styles.cardSectionHeader}>
            <Text style={styles.cardSectionTitle}>🏢 {companyTitle} Dispatch</Text>
            <Text style={styles.cardSectionSub}>Product Type: FOIL</Text>
          </View>

          {/* Select Product */}
          <View style={styles.selectHeaderRow}>
            <Text style={styles.label}>Select Product from Product Master *</Text>
            <TouchableOpacity style={styles.addProdPill} onPress={() => setShowAddProduct(true)}>
              <Text style={styles.addProdPillText}>+ Add New Product</Text>
            </TouchableOpacity>
          </View>

          {/* Dropdown Selection Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[styles.catalogChip, !selectedCatalogId && styles.catalogChipActive]} onPress={() => setSelectedCatalogId('')}>
                <Text style={[styles.catalogChipText, !selectedCatalogId && styles.catalogChipActiveText]}>-- Choose Existing Product from Catalog --</Text>
              </TouchableOpacity>
              {productList.map((p) => (
                <TouchableOpacity
                  key={p._id}
                  style={[styles.catalogChip, selectedCatalogId === p._id && styles.catalogChipActive]}
                  onPress={() => handleSelectCatalog(p._id)}
                >
                  <Text style={[styles.catalogChipText, selectedCatalogId === p._id && styles.catalogChipActiveText]}>{p.productName}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* 2-Column Form Fields */}
          <View style={styles.fieldGrid}>
            <WebInput label="Product Name / Item Description *" value={productName} onChangeText={setProductName} placeholder="e.g. Paracetamol Foil 100mm" style={{ width: '100%' }} />

            <View style={styles.halfWidth}>
              <WebInput label="Color(s) Used (comma separated)" value={colorsUsed} onChangeText={setColorsUsed} placeholder="e.g. Red, Silver, Blue" />
            </View>
            <View style={styles.halfWidth}>
              <WebInput label="Weight (kg) *" value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" placeholder="e.g. 25.5" />
            </View>

            <View style={styles.halfWidth}>
              <WebInput label="Dimensions / Size *" value={dimensions} onChangeText={setDimensions} placeholder="e.g. 100mm x 500m" />
            </View>
            <View style={styles.halfWidth}>
              <WebInput label="Quantity *" value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="e.g. 5" />
            </View>

            <View style={styles.halfWidth}>
              <WebInput label="Destination Type" value={destinationType} onChangeText={setDestinationType} placeholder="External Client / Customer" />
            </View>
            <View style={styles.halfWidth}>
              <WebInput label="Destination Company Name *" value={destinationCompany} onChangeText={setDestinationCompany} placeholder="e.g. Sun Pharma / Cipla Ltd" />
            </View>

            <View style={styles.halfWidth}>
              <WebInput label="Delivery Method *" value={deliveryMethod} onChangeText={setDeliveryMethod} placeholder="🚚 A1 Transport" />
            </View>
            <View style={styles.halfWidth}>
              <WebInput label="Dispatch Date *" value={dispatchDate} onChangeText={setDispatchDate} placeholder="29-07-2026 📅" />
            </View>
          </View>

          <WebBtn label={loading ? '⏳ Submitting...' : '🚀 Submit Dispatch Entry'} onPress={handleFormSubmit} variant="primary" size="lg" style={{ marginTop: 24, alignSelf: 'flex-start' }} />
        </WebCard>
      )}

      {activeTab === 'report' && (
        <WebCard title="Dispatch Bill / Report">
          <View style={styles.filterRow}>
            <WebInput label="From Date" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
            <WebInput label="To Date" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
            <WebBtn label="🔍 Filter Report" onPress={handleLoadReports} variant="primary" style={{ marginTop: 22 }} />
          </View>

          {reports?.dispatches && (
            <View style={{ marginTop: 16 }}>
              {reports.dispatches.map((item) => (
                <View key={item._id} style={styles.tableRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{item.productName}</Text>
                    <Text style={styles.rowSub}>Qty: {item.quantity} · Destination: {item.destinationCompany} · Date: {item.dispatchDate}</Text>
                  </View>
                  <WebBadge variant={item.status === 'Delivered' ? 'success' : 'warning'} label={item.status || 'Pending'} />
                </View>
              ))}
            </View>
          )}
        </WebCard>
      )}

      {/* Add Product Modal */}
      <WebModal visible={showAddProduct} title="+ Add New Product" onClose={() => setShowAddProduct(false)}>
        <WebInput label="Product Name *" value={newProdName} onChangeText={setNewProdName} placeholder="e.g. Paracetamol Foil 100mm" />
        <WebInput label="Dimensions / Size" value={newProdSize} onChangeText={setNewProdSize} placeholder="e.g. 100mm" />
        <WebInput label="Weight (KG)" value={newProdWeight} onChangeText={setNewProdWeight} keyboardType="numeric" placeholder="25.5" />
        <WebBtn label="Save Product" onPress={handleCreateProduct} variant="success" style={{ marginTop: 12 }} />
      </WebModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: webSpacing.lg },
  header: { marginBottom: webSpacing.xs },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#1e293b' },
  headerSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  actionTabRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionTab: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8, backgroundColor: '#f1f5f9' },
  actionTabActive: { backgroundColor: '#5046e5' },
  actionTabText: { fontWeight: '700', color: '#334155', fontSize: 14 },
  actionTabTextActive: { color: '#ffffff' },
  mainCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  cardSectionHeader: { marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cardSectionTitle: { fontSize: 18, fontWeight: '800', color: '#4338ca' },
  cardSectionSub: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' },
  selectHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  addProdPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
  addProdPillText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  catalogChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1' },
  catalogChipActive: { backgroundColor: '#eef2ff', borderColor: '#4f46e5' },
  catalogChipText: { fontSize: 13, color: '#334155', fontWeight: '600' },
  catalogChipActiveText: { color: '#4f46e5', fontWeight: '800' },
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  halfWidth: { width: '48.5%', minWidth: 280 },
  filterRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  rowTitle: { fontWeight: '700', fontSize: 14, color: '#1e293b' },
  rowSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  errorBox: { padding: 12, borderRadius: 8, backgroundColor: '#fee2e2', marginBottom: 12 },
  errorText: { color: '#991b1b', fontWeight: '700' },
  successBox: { padding: 12, borderRadius: 8, backgroundColor: '#d1fae5', marginBottom: 12 },
  successText: { color: '#065f46', fontWeight: '700' },
});

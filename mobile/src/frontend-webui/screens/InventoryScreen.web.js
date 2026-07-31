import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WebCard, WebBadge, WebBtn, WebInput, WebModal } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function InventoryScreen({ apiBaseUrl, session }) {
  const token = session?.token;
  const company = session?.company || 'bharath';
  const activeCompany = session?.activeCompany || company;

  const [activeTab, setActiveTab] = useState('cylinder'); // 'cylinder', 'foil', 'logs'
  const [cylinders, setCylinders] = useState([]);
  const [foils, setFoils] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Add Item Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [itemForm, setItemForm] = useState({ productName: '', cylinderNumber: '', weightKg: '', foilType: 'blister', colourCount: '1' });

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [cyRes, foRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/cylinders?company=${activeCompany}`, { headers: { Authorization: token } }),
        fetch(`${apiBaseUrl}/api/foils?company=${activeCompany}`, { headers: { Authorization: token } }),
      ]);
      if (cyRes.ok) setCylinders(await cyRes.json());
      if (foRes.ok) setFoils(await foRes.json());
    } catch (e) {}
    finally { setLoading(false); }
  }, [apiBaseUrl, token, activeCompany]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddItem = async () => {
    if (!itemForm.productName) return alert('Product Name is required');
    try {
      const endpoint = activeTab === 'cylinder' ? `${apiBaseUrl}/api/cylinders` : `${apiBaseUrl}/api/foils`;
      const body = activeTab === 'cylinder'
        ? { company: activeCompany, productName: itemForm.productName, cylinderNumber: itemForm.cylinderNumber, colourCount: Number(itemForm.colourCount) }
        : { company: activeCompany, productName: itemForm.productName, weightKg: Number(itemForm.weightKg), foilType: itemForm.foilType };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        alert('Item added successfully!');
        setShowAddModal(false);
        fetchData();
      }
    } catch (e) {}
  };

  const filteredCylinders = cylinders.filter(c => [c.productName, c.cylinderNumber].join(' ').toLowerCase().includes(search.toLowerCase()));
  const filteredFoils = foils.filter(f => [f.productName, f.foilType].join(' ').toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📦 Inventory & Stock Management</Text>
        <Text style={styles.headerSubtitle}>Manage Cylinder stock, Foil stock rolls, barcodes, and inventory audit logs.</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'cylinder' && styles.tabBtnActive]} onPress={() => setActiveTab('cylinder')}>
          <Text style={[styles.tabText, activeTab === 'cylinder' && styles.tabTextActive]}>🛢️ Cylinders ({cylinders.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'foil' && styles.tabBtnActive]} onPress={() => setActiveTab('foil')}>
          <Text style={[styles.tabText, activeTab === 'foil' && styles.tabTextActive]}>🎞️ Foil Stock ({foils.length})</Text>
        </TouchableOpacity>
      </View>

      <WebCard title={`${activeTab === 'cylinder' ? 'Cylinder Inventory' : 'Foil Stock Inventory'}`}>
        <View style={styles.filterRow}>
          <WebInput placeholder="🔍 Search inventory item..." value={search} onChangeText={setSearch} style={{ flex: 1 }} />
          <WebBtn label="➕ Add New Item" onPress={() => setShowAddModal(true)} variant="success" style={{ marginTop: 6 }} />
        </View>

        {loading ? (
          <Text style={{ color: webColors.textMuted }}>⏳ Loading inventory items...</Text>
        ) : activeTab === 'cylinder' ? (
          filteredCylinders.length === 0 ? <Text style={{ color: webColors.textMuted }}>No cylinders found.</Text> :
          filteredCylinders.map((item) => (
            <View key={item._id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.productName}</Text>
                <Text style={styles.rowSub}>Cylinder #: {item.cylinderNumber || 'N/A'} · Colors: {item.colourCount || 1} · Company: {item.company}</Text>
              </View>
              <WebBadge variant={item.status === 'in_use' ? 'warning' : 'success'} label={(item.status || 'available').toUpperCase()} />
            </View>
          ))
        ) : (
          filteredFoils.length === 0 ? <Text style={{ color: webColors.textMuted }}>No foils found.</Text> :
          filteredFoils.map((item) => (
            <View key={item._id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.productName}</Text>
                <Text style={styles.rowSub}>Foil Type: {item.foilType?.toUpperCase()} · Available Weight: {item.weightKg || 0} KG</Text>
              </View>
              <WebBadge variant={item.weightKg > 10 ? 'success' : 'danger'} label={`${item.weightKg || 0} KG`} />
            </View>
          ))
        )}
      </WebCard>

      {/* Add Item Modal */}
      <WebModal visible={showAddModal} title={`➕ Add ${activeTab === 'cylinder' ? 'Cylinder' : 'Foil Roll'}`} onClose={() => setShowAddModal(false)}>
        <WebInput label="Product Name *" value={itemForm.productName} onChangeText={v => setItemForm(p => ({ ...p, productName: v }))} placeholder="e.g. Paracetamol 500mg" />
        {activeTab === 'cylinder' ? (
          <>
            <WebInput label="Cylinder Number" value={itemForm.cylinderNumber} onChangeText={v => setItemForm(p => ({ ...p, cylinderNumber: v }))} placeholder="e.g. CYL-908" />
            <WebInput label="Colour Count" value={itemForm.colourCount} onChangeText={v => setItemForm(p => ({ ...p, colourCount: v }))} keyboardType="numeric" placeholder="1" />
          </>
        ) : (
          <>
            <WebInput label="Weight (KG)" value={itemForm.weightKg} onChangeText={v => setItemForm(p => ({ ...p, weightKg: v }))} keyboardType="numeric" placeholder="e.g. 50" />
            <WebInput label="Foil Type" value={itemForm.foilType} onChangeText={v => setItemForm(p => ({ ...p, foilType: v }))} placeholder="blister / alualu / pouch" />
          </>
        )}
        <WebBtn label="Save Inventory Item" onPress={handleAddItem} variant="success" style={{ marginTop: 12 }} />
      </WebModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: webSpacing.lg },
  header: { marginBottom: webSpacing.md },
  headerTitle: { fontSize: webFontSize.title, fontWeight: '800', color: webColors.text },
  headerSubtitle: { fontSize: webFontSize.base, color: webColors.textMuted, marginTop: 4 },
  tabRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: webColors.surface, borderWidth: 1, borderColor: webColors.border },
  tabBtnActive: { backgroundColor: webColors.primary, borderColor: webColors.primary },
  tabText: { fontWeight: '700', color: webColors.text, fontSize: webFontSize.sm },
  tabTextActive: { color: '#ffffff' },
  filterRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: webColors.border },
  rowTitle: { fontWeight: '700', fontSize: webFontSize.base, color: webColors.text },
  rowSub: { fontSize: webFontSize.xs, color: webColors.textMuted, marginTop: 2 },
});

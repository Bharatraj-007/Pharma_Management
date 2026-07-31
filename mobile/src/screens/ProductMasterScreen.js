import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { AuthContext } from '../navigation/AuthContext';
import API_BASE_URL from '../config';
import { colors, spacing, fontSize } from '../styles/theme';
import ScreenWrapper from '../components/ScreenWrapper';
import { Card, CardTitle, CardHeader, Btn } from '../components/ui';

export default function ProductMasterScreen() {
  const { session } = useContext(AuthContext);
  const token = session?.token;
  const company = session?.company || 'bharath';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Add form
  const [productName, setProductName] = useState('');
  const [size, setSize] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [numberOfColors, setNumberOfColors] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  // Edit modal state
  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSize, setEditSize] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editColors, setEditColors] = useState('1');
  const [editLoading, setEditLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/products?company=${company}&limit=100`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.data || []);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [token, company]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const addProduct = async () => {
    if (!productName) {
      Alert.alert('Error', 'Product Name is required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({
          company,
          productName,
          size,
          weightKg: weightKg ? Number(weightKg) : 0,
          numberOfColors: numberOfColors ? Number(numberOfColors) : 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add product');
      Alert.alert('Success', '✅ Product added!');
      setProductName(''); setSize(''); setWeightKg(''); setNumberOfColors('1');
      fetchProducts();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Open edit modal ────────────────────────────────────────────────────────
  const openEdit = (p) => {
    setEditingProduct(p);
    setEditName(p.productName || '');
    setEditSize(p.size || '');
    setEditWeight(String(p.weightKg || ''));
    setEditColors(String(p.numberOfColors || 1));
  };

  // ── Save edit ──────────────────────────────────────────────────────────────
  const saveEdit = async () => {
    if (!editName) { Alert.alert('Error', 'Product Name is required.'); return; }
    setEditLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${editingProduct._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({
          productName: editName,
          size: editSize,
          weightKg: editWeight ? Number(editWeight) : 0,
          numberOfColors: editColors ? Number(editColors) : 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      Alert.alert('Success', '✅ Product updated!');
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // ── Soft-delete ────────────────────────────────────────────────────────────
  const deleteProduct = (id) => {
    Alert.alert('Delete Product?', 'This will remove the product from the active catalog.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
              method: 'DELETE', headers: { Authorization: token },
            });
            if (res.ok) fetchProducts();
            else Alert.alert('Error', 'Delete failed');
          } catch (err) { Alert.alert('Error', err.message); }
        },
      },
    ]);
  };

  const norm = (v) => String(v || '').toLowerCase();
  const filteredProducts = products.filter(p =>
    [p.productName, p.size].map(norm).join(' ').includes(norm(search))
  );

  return (
    <ScreenWrapper>
      <ScrollView style={{ flex: 1 }}>
        {/* Add Form */}
        <Card style={{ marginBottom: spacing[3] }}>
          <CardTitle>➕ Add New Product</CardTitle>
          <Text style={s.label}>Product Name *</Text>
          <TextInput style={s.input} placeholder="e.g. Paracetamol Foil 100mm" value={productName} onChangeText={setProductName} />
          <Text style={s.label}>Size / Dimensions</Text>
          <TextInput style={s.input} placeholder="e.g. 100mm x 500m" value={size} onChangeText={setSize} />
          <Text style={s.label}>Weight (kg)</Text>
          <TextInput style={s.input} placeholder="e.g. 25.5" keyboardType="numeric" value={weightKg} onChangeText={setWeightKg} />
          <Text style={s.label}>Number of Colors</Text>
          <TextInput style={s.input} placeholder="e.g. 4" keyboardType="numeric" value={numberOfColors} onChangeText={setNumberOfColors} />
          <Btn
            label={submitting ? '⏳ Saving...' : '💾 Save Product'}
            onPress={addProduct} loading={submitting}
            variant="success" block size="lg"
            style={{ marginTop: spacing[3] }}
          />
        </Card>

        {/* Product List */}
        <Card>
          <CardTitle>Catalog ({filteredProducts.length})</CardTitle>
          {/* Search bar */}
          <TextInput
            style={[s.input, { marginBottom: spacing[3] }]}
            placeholder="🔍 Search products..."
            value={search}
            onChangeText={setSearch}
          />
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : filteredProducts.length === 0 ? (
            <Text style={{ textAlign:'center', color:colors.textMuted, padding:spacing[3] }}>No products found.</Text>
          ) : (
            filteredProducts.map((p) => (
              <View key={p._id} style={s.itemRow}>
                <View style={{ flex:1 }}>
                  <Text style={s.itemTitle}>{p.productName}</Text>
                  <Text style={s.itemSub}>
                    Size: {p.size || '-'} · Weight: {p.weightKg ? `${p.weightKg}kg` : '-'} · Colors: {p.numberOfColors || 1}
                  </Text>
                </View>
                <View style={{ flexDirection:'row', gap:4 }}>
                  <Btn label="✏️" size="sm" variant="warning" onPress={() => openEdit(p)} />
                  <Btn label="🗑️" size="sm" variant="danger" onPress={() => deleteProduct(p._id)} />
                </View>
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      {/* ── Edit Product Modal ── */}
      <Modal visible={!!editingProduct} animationType="fade" transparent onRequestClose={() => setEditingProduct(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>✏️ Edit Product</Text>
            <Text style={s.label}>Product Name *</Text>
            <TextInput style={s.input} value={editName} onChangeText={setEditName} placeholder="e.g. Paracetamol Foil" />
            <Text style={s.label}>Size / Dimensions</Text>
            <TextInput style={s.input} value={editSize} onChangeText={setEditSize} placeholder="e.g. 100mm" />
            <Text style={s.label}>Weight (kg)</Text>
            <TextInput style={s.input} keyboardType="numeric" value={editWeight} onChangeText={setEditWeight} placeholder="e.g. 25.5" />
            <Text style={s.label}>Number of Colors</Text>
            <TextInput style={s.input} keyboardType="numeric" value={editColors} onChangeText={setEditColors} placeholder="e.g. 4" />
            <View style={{ flexDirection:'row', gap:spacing[2], marginTop:spacing[4] }}>
              <Btn label={editLoading ? '⏳ Saving...' : 'Save'} onPress={saveEdit} variant="success" style={{ flex:1 }} loading={editLoading} />
              <Btn label="Cancel" onPress={() => setEditingProduct(null)} variant="secondary" style={{ flex:1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  label:       { fontSize:fontSize.xs, fontWeight:'600', color:colors.text, marginBottom:4, marginTop:8 },
  input:       { backgroundColor:colors.surface, borderWidth:1, borderColor:colors.border, borderRadius:6, paddingHorizontal:spacing[3], paddingVertical:spacing[2], fontSize:fontSize.sm, color:colors.text },
  itemRow:     { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:spacing[2], borderBottomWidth:1, borderBottomColor:colors.border },
  itemTitle:   { fontWeight:'700', color:colors.text, fontSize:fontSize.base },
  itemSub:     { fontSize:fontSize.xs, color:colors.textMuted, marginTop:2 },
  modalOverlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', padding:spacing[4] },
  modalSheet:  { backgroundColor:colors.surface, borderRadius:16, padding:spacing[4] },
  modalTitle:  { fontSize:fontSize.lg, fontWeight:'700', color:colors.text, marginBottom:spacing[3] },
});

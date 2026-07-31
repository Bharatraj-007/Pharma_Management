import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebCard, WebBtn, WebInput, WebModal } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function ProductMasterScreen({ apiBaseUrl, session }) {
  const token = session?.token;
  const company = session?.company || 'bharath';
  const activeCompany = session?.activeCompany || company;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add Product Form
  const [productName, setProductName] = useState('');
  const [size, setSize] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [numberOfColors, setNumberOfColors] = useState('1');

  const fetchProducts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/products?company=${activeCompany}&limit=100`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const json = await res.json();
        setProducts(json.data || []);
      }
    } catch (e) {}
    finally { setLoading(false); }
  }, [apiBaseUrl, token, activeCompany]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleAddProduct = async () => {
    if (!productName) return alert('Product name is required');
    try {
      const res = await fetch(`${apiBaseUrl}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({
          company: activeCompany === 'all' ? 'bharath' : activeCompany,
          productName,
          size,
          weightKg: weightKg ? Number(weightKg) : 0,
          numberOfColors: numberOfColors ? Number(numberOfColors) : 1,
        }),
      });
      if (res.ok) {
        alert('Product created!');
        setProductName(''); setSize(''); setWeightKg('');
        fetchProducts();
      }
    } catch (e) {}
  };

  const handleDeleteProduct = async (id) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: token },
      });
      if (res.ok) fetchProducts();
    } catch (e) {}
  };

  const filtered = products.filter(p => (p.productName || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏷️ Product Master Catalog</Text>
        <Text style={styles.headerSubtitle}>Manage standardized pharmaceutical product catalog specifications.</Text>
      </View>

      <View style={styles.layout}>
        {/* Add Product Form */}
        <WebCard title="➕ Add Product Specification" style={styles.formCard}>
          <WebInput label="Product Name *" value={productName} onChangeText={setProductName} placeholder="e.g. Paracetamol 500mg Foil" />
          <WebInput label="Size / Dimensions" value={size} onChangeText={setSize} placeholder="e.g. 150mm" />
          <WebInput label="Weight (KG)" value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" placeholder="e.g. 25" />
          <WebInput label="Number of Colors" value={numberOfColors} onChangeText={setNumberOfColors} keyboardType="numeric" placeholder="1" />
          <WebBtn label="Save Product Specification" onPress={handleAddProduct} variant="success" size="lg" style={{ marginTop: 12 }} />
        </WebCard>

        {/* Product Catalog List */}
        <WebCard title={`Product Catalog (${filtered.length})`} style={styles.listCard}>
          <WebInput placeholder="🔍 Search product name..." value={search} onChangeText={setSearch} style={{ marginBottom: 16 }} />
          {loading ? (
            <Text style={{ color: webColors.textMuted }}>⏳ Loading products...</Text>
          ) : filtered.length === 0 ? (
            <Text style={{ color: webColors.textMuted }}>No products found.</Text>
          ) : (
            filtered.map((p) => (
              <View key={p._id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{p.productName}</Text>
                  <Text style={styles.rowSub}>Size: {p.size || '—'} · Weight: {p.weightKg || 0} KG · Colors: {p.numberOfColors || 1}</Text>
                </View>
                <WebBtn label="🗑️ Delete" size="sm" variant="danger" onPress={() => handleDeleteProduct(p._id)} />
              </View>
            ))
          )}
        </WebCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: webSpacing.lg },
  header: { marginBottom: webSpacing.md },
  headerTitle: { fontSize: webFontSize.title, fontWeight: '800', color: webColors.text },
  headerSubtitle: { fontSize: webFontSize.base, color: webColors.textMuted, marginTop: 4 },
  layout: { flexDirection: 'row', gap: 24, flexWrap: 'wrap' },
  formCard: { width: 360 },
  listCard: { flex: 1, minWidth: 400 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: webColors.border },
  rowTitle: { fontWeight: '700', fontSize: webFontSize.base, color: webColors.text },
  rowSub: { fontSize: webFontSize.xs, color: webColors.textMuted, marginTop: 2 },
});

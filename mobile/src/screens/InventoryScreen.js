/**
 * InventoryScreen — Foil + Cylinder stock management.
 * QR label display replaced with text-based label (printing not available on mobile).
 */
import React, { useEffect, useState, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Print from 'expo-print';
import { AuthContext } from '../navigation/AuthContext';
import API_BASE_URL from '../config';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  Card, CardHeader, CardTitle, Badge, AlertBanner,
  Btn, Input, Spinner, EmptyState, TabBar,
} from '../components/ui';
import { colors, spacing, fontSize, pageStyles } from '../styles/theme';

const COMPANY_CONFIG = {
  bharath: {
    hasMaterial: true, materialLabel: 'Foil',
    materialOptions: [{ value:'blister', label:'Blister' }, { value:'alualu', label:'Alu-Alu' }],
  },
  shree_ganaapathy: {
    hasMaterial: true, materialLabel: 'Plastic',
    materialOptions: [
      { value:'wrapper', label:'Wrapper' }, { value:'pouch', label:'Pouch' },
      { value:'laminated', label:'Laminated Roll' }, { value:'roll', label:'Plastic Roll' },
    ],
  },
  vel: { hasMaterial: false, materialLabel: 'Foil', materialOptions: [] },
};

function ChipRow({ label, options, value, onChange }) {
  return (
    <View style={{ marginBottom: spacing[3] }}>
      {label && <Text style={cs.label}>{label}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection:'row', gap:spacing[2] }}>
          {options.map((opt) => {
            const active = value === opt.value;
            return (
              <TouchableOpacity key={opt.value} style={[cs.chip, active && cs.active]} onPress={() => onChange(opt.value)}>
                <Text style={[cs.text, active && cs.activeText]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
const cs = StyleSheet.create({
  label:      { fontSize:fontSize.sm, fontWeight:'600', color:colors.text, marginBottom:spacing[1] },
  chip:       { paddingHorizontal:spacing[3], paddingVertical:spacing[2], borderRadius:999, borderWidth:1, borderColor:colors.border, backgroundColor:colors.surface },
  active:     { backgroundColor:colors.primary, borderColor:colors.primary },
  text:       { fontSize:fontSize.sm, color:colors.text },
  activeText: { color:'#fff', fontWeight:'700' },
});

export default function InventoryScreen() {
  const { session } = useContext(AuthContext);
  const token       = session?.token;
  const company     = session?.company || 'bharath';
  const role        = (session?.role || '').toLowerCase();

  const cfg = COMPANY_CONFIG[company] || COMPANY_CONFIG.bharath;
  const isAuthorized = ['ceo','admin','manager'].includes(role);

  const TABS = [
    ...(cfg.hasMaterial ? [{ key:'foil', label:`📦 ${cfg.materialLabel} Stock` }] : []),
    { key:'cylinder', label:'🔷 Cylinder Stock' },
  ];
  const [activeTab, setActiveTab] = useState(TABS[0].key);

  // Foil state
  const [foils,     setFoils]     = useState([]);
  const [foilType,  setFoilType]  = useState(cfg.materialOptions[0]?.value || '');
  const [foilSize,  setFoilSize]  = useState('');
  const [foilWeight,setFoilWeight]= useState('');
  const [foilLoading, setFoilLoading] = useState(false);

  // Cylinder state
  const [cylinders,   setCylinders]   = useState([]);
  const [cylProduct,  setCylProduct]  = useState('');
  const [cylColors,   setCylColors]   = useState('');
  const [cylSize,     setCylSize]     = useState('');
  const [cylMfr,      setCylMfr]      = useState('');
  const [cylDate,     setCylDate]     = useState('');
  const [cylLoading,  setCylLoading]  = useState(false);

  // Shared
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError,   setStockError]   = useState('');
  const [success,      setSuccess]      = useState('');
  const [search,       setSearch]       = useState('');

  // Editing state
  const [editingFoil, setEditingFoil] = useState(null);
  const [foilEditType, setFoilEditType] = useState('');
  const [foilEditSize, setFoilEditSize] = useState('');
  const [foilEditWeight, setFoilEditWeight] = useState('');

  const [editingCyl, setEditingCyl] = useState(null);
  const [cylEditProduct, setCylEditProduct] = useState('');
  const [cylEditColors, setCylEditColors] = useState('');
  const [cylEditSize, setCylEditSize] = useState('');
  const [cylEditMfr, setCylEditMfr] = useState('');
  const [cylEditDate, setCylEditDate] = useState('');

  const authHeaders = { 'Content-Type':'application/json', Authorization: token };

  const fetchStock = useCallback(async () => {
    if (!isAuthorized) return;
    setStockLoading(true); setStockError('');
    try {
      const [fr, cr] = await Promise.all([
        fetch(`${API_BASE_URL}/foils`,    { headers:{ Authorization:token } }),
        fetch(`${API_BASE_URL}/cylinders`,{ headers:{ Authorization:token } }),
      ]);
      if (!fr.ok || !cr.ok) throw new Error('Unable to load stock list');
      const [fd, cd] = await Promise.all([fr.json(), cr.json()]);
      setFoils(Array.isArray(fd) ? fd : []);
      setCylinders(Array.isArray(cd) ? cd : []);
    } catch (err) { setStockError(err.message); }
    finally { setStockLoading(false); }
  }, [token, isAuthorized]);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  // ── Add foil ─────────────────────────────────────────────────────────────
  const addFoil = async () => {
    if (!foilType || !foilSize || !foilWeight) { Alert.alert('Error', 'Please fill all foil fields.'); return; }
    setFoilLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/add-foil`, {
        method:'POST', headers: authHeaders,
        body: JSON.stringify({ type:foilType, size:foilSize, weight:Number(foilWeight) }),
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.error || await res.text().catch(()=>'') || 'Failed');
      flash(`✅ ${cfg.materialLabel} added! QR: ${data.qrPayload || data.foil?.qrPayload || ''}`);
      setFoilSize(''); setFoilWeight('');
      fetchStock();
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setFoilLoading(false); }
  };

  // ── Print foil label ──────────────────────────────────────────────────────
  const handlePrint = async (foil) => {
    const labelUrl = `${API_BASE_URL}/qrs/foil/${encodeURIComponent(foil.qrPayload)}/label`;
    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body {
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background-color: white;
            }
            img {
              width: 100%;
              max-width: 600px;
              height: auto;
            }
          </style>
        </head>
        <body>
          <img src="${labelUrl}" />
        </body>
      </html>
    `;
    try {
      await Print.printAsync({ html });
    } catch (err) {
      Alert.alert('Printing Failed', err.message);
    }
  };

  // ── Save Foil Edit ───────────────────────────────────────────────────────
  const saveFoilEdit = async () => {
    if (!editingFoil) return;
    if (!foilEditType || !foilEditSize || !foilEditWeight) { Alert.alert('Error', 'Please fill all fields.'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/foils/${editingFoil._id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ type: foilEditType, size: foilEditSize, weight: Number(foilEditWeight) }),
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      flash('Foil updated successfully.');
      setEditingFoil(null);
      fetchStock();
    } catch (err) { Alert.alert('Error', err.message); }
  };

  // ── Save Cylinder Edit ───────────────────────────────────────────────────
  const saveCylinderEdit = async () => {
    if (!editingCyl) return;
    if (!cylEditProduct || !cylEditColors || !cylEditSize || !cylEditMfr || !cylEditDate) {
      Alert.alert('Error', 'Please fill all fields.'); return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/cylinders/${editingCyl._id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          product_name: cylEditProduct,
          colors: Number(cylEditColors),
          size_inches: Number(cylEditSize),
          manufacturer: cylEditMfr,
          manufacture_date: cylEditDate,
        }),
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      flash('Cylinder updated successfully.');
      setEditingCyl(null);
      fetchStock();
    } catch (err) { Alert.alert('Error', err.message); }
  };

  // ── Delete foil ───────────────────────────────────────────────────────────
  const deleteFoil = (foil) => {
    Alert.alert('Delete foil?', foil.qrPayload || 'This cannot be undone.', [
      { text:'Cancel', style:'cancel' },
      { text:'Delete', style:'destructive', onPress: async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/foils/${foil._id}`, { method:'DELETE', headers:{ Authorization:token } });
          if (!res.ok) throw new Error(await res.text());
          flash('Foil deleted.'); fetchStock();
        } catch (err) { Alert.alert('Error', err.message); }
      }},
    ]);
  };

  // ── Add cylinder ──────────────────────────────────────────────────────────
  const addCylinder = async () => {
    if (!cylProduct || !cylColors || !cylSize || !cylMfr || !cylDate) {
      Alert.alert('Error', 'Please fill all cylinder fields.'); return;
    }
    setCylLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/add-cylinder`, {
        method:'POST', headers: authHeaders,
        body: JSON.stringify({ product_name:cylProduct, colors:Number(cylColors), size_inches:Number(cylSize), manufacturer:cylMfr, manufacture_date:cylDate }),
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      flash(`✅ Cylinder added! Barcode: ${data.barcode || ''}`);
      setCylProduct(''); setCylColors(''); setCylSize(''); setCylMfr(''); setCylDate('');
      fetchStock();
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setCylLoading(false); }
  };

  // ── Delete cylinder ───────────────────────────────────────────────────────
  const deleteCylinder = (cyl) => {
    Alert.alert('Delete cylinder?', 'This cannot be undone.', [
      { text:'Cancel', style:'cancel' },
      { text:'Delete', style:'destructive', onPress: async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/cylinders/${cyl._id}`, { method:'DELETE', headers:{ Authorization:token } });
          if (!res.ok) throw new Error(await res.text());
          flash('Cylinder deleted.'); fetchStock();
        } catch (err) { Alert.alert('Error', err.message); }
      }},
    ]);
  };

  const norm = (v) => String(v||'').toLowerCase();
  const filteredFoils = foils.filter((f) =>
    [f.type, f.size, f.weight, f.qrPayload].map(norm).join(' ').includes(norm(search))
  );
  const filteredCylinders = cylinders.filter((c) =>
    [c.product_name, c.colors, c.size_inches, c.manufacturer, c.barcode].map(norm).join(' ').includes(norm(search))
  );

  if (!isAuthorized) {
    return (
      <ScreenWrapper>
        <View style={{ alignItems:'center', padding: spacing[8] }}>
          <Text style={{ fontSize:40, marginBottom: spacing[3] }}>🚫</Text>
          <Text style={{ fontSize:fontSize.xl, fontWeight:'700', marginBottom: spacing[2] }}>Access Denied</Text>
          <Text style={{ color:colors.textMuted }}>Only Admin, Manager, and CEO can manage stock.</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper refreshing={stockLoading} onRefresh={fetchStock}>
      <View style={pageStyles.header}>
        <Text style={pageStyles.title}>📦 Stock Management</Text>
      </View>

      <AlertBanner type="success" message={success} />
      <AlertBanner type="danger"  message={stockError} />

      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <Input
        placeholder={`Search ${activeTab === 'foil' ? cfg.materialLabel.toLowerCase() : 'cylinder'}…`}
        value={search} onChangeText={setSearch}
        style={{ marginBottom: spacing[3] }}
      />

      {/* ── FOIL TAB ── */}
      {activeTab === 'foil' && cfg.hasMaterial && (
        <>
          <Card style={{ marginBottom: spacing[4] }}>
            <CardTitle>➕ Add {cfg.materialLabel} Stock</CardTitle>
            <ChipRow
              label={`${cfg.materialLabel} Type *`}
              options={cfg.materialOptions}
              value={foilType} onChange={setFoilType}
            />
            <Input label="Size *"       value={foilSize}   onChangeText={setFoilSize}   placeholder="e.g. 10cm" />
            <Input label="Weight (KG) *" value={foilWeight} onChangeText={setFoilWeight} placeholder="e.g. 25" keyboardType="numeric" />
            <Btn label={foilLoading ? '⏳ Adding…' : `➕ Add ${cfg.materialLabel}`} onPress={addFoil} loading={foilLoading} variant="success" block size="lg" />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle style={{ marginBottom:0 }}>{cfg.materialLabel} Stock ({filteredFoils.length})</CardTitle>
              <Btn label="Refresh" onPress={fetchStock} variant="primary" size="sm" />
            </CardHeader>

            {stockLoading ? <Spinner /> : filteredFoils.length === 0 ? (
              <EmptyState message={`No ${cfg.materialLabel.toLowerCase()} stock found.`} />
            ) : (
              filteredFoils.map((foil) => (
                <View key={foil._id} style={s.stockRow}>
                  <View style={{ flex:1 }}>
                    <Text style={s.stockName}>{foil.type?.toUpperCase()} — {foil.size}</Text>
                    <Text style={s.stockSub}>{foil.weight} KG</Text>
                    {foil.qrPayload && (
                      <>
                        <Text style={[s.stockSub, { color:colors.primary, fontSize:fontSize.xs, marginBottom: 4 }]} numberOfLines={1}>
                          QR: {foil.qrPayload}
                        </Text>
                        <View style={{ width: 90, height: 48, borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginVertical: 4 }}>
                          <WebView
                            source={{ html: `
                              <html>
                                <body style="margin:0; padding:0; display:flex; justify-content:center; align-items:center; background-color:white; overflow:hidden;">
                                  <img src="${API_BASE_URL}/qrs/foil/${encodeURIComponent(foil.qrPayload)}/label" style="width:100%; height:100%; object-fit:contain;" />
                                </body>
                              </html>
                            ` }}
                            scrollEnabled={false}
                            style={{ width: 90, height: 48, backgroundColor: 'white' }}
                          />
                        </View>
                      </>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <Btn label="🖨️ Print" size="sm" variant="primary" onPress={() => handlePrint(foil)} style={{ minWidth: 60 }} />
                      <Btn label="Edit" size="sm" variant="warning" onPress={() => {
                        setEditingFoil(foil);
                        setFoilEditType(foil.type);
                        setFoilEditSize(foil.size);
                        setFoilEditWeight(String(foil.weight));
                      }} style={{ minWidth: 60 }} />
                    </View>
                    <Btn label="Delete" size="sm" variant="danger" onPress={() => deleteFoil(foil)} style={{ width: 124 }} />
                  </View>
                </View>
              ))
            )}
          </Card>
        </>
      )}

      {/* ── CYLINDER TAB ── */}
      {activeTab === 'cylinder' && (
        <>
          <Card style={{ marginBottom: spacing[4] }}>
            <CardTitle>➕ Add Cylinder Stock</CardTitle>
            <Input label="Product Name *"    value={cylProduct} onChangeText={setCylProduct} placeholder="e.g. Aspirin Blister" />
            <Input label="Number of Colors *" value={cylColors}  onChangeText={setCylColors}  placeholder="e.g. 4" keyboardType="numeric" />
            <Input label="Size (inches) *"   value={cylSize}    onChangeText={setCylSize}    placeholder="e.g. 10" keyboardType="numeric" />
            <Input label="Manufacturer *"    value={cylMfr}     onChangeText={setCylMfr}     placeholder="e.g. XYZ Co." />
            <Input label="Manufacture Date (YYYY-MM-DD) *" value={cylDate} onChangeText={setCylDate} placeholder="e.g. 2024-01-15" />
            <Btn label={cylLoading ? '⏳ Adding…' : '➕ Add Cylinder'} onPress={addCylinder} loading={cylLoading} variant="success" block size="lg" />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle style={{ marginBottom:0 }}>Cylinders ({filteredCylinders.length})</CardTitle>
              <Btn label="Refresh" onPress={fetchStock} variant="primary" size="sm" />
            </CardHeader>

            {stockLoading ? <Spinner /> : filteredCylinders.length === 0 ? (
              <EmptyState message="No cylinder stock found." />
            ) : (
              filteredCylinders.map((cyl) => (
                <View key={cyl._id} style={s.stockRow}>
                  <View style={{ flex:1 }}>
                    <Text style={s.stockName}>{cyl.product_name}</Text>
                    <Text style={s.stockSub}>{cyl.colors} colours · {cyl.size_inches}" · {cyl.manufacturer}</Text>
                    <Text style={[s.stockSub, { fontSize:fontSize.xs, color:colors.primary }]}>
                      Barcode: {cyl.barcode}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <Btn label="Edit" size="sm" variant="warning" onPress={() => {
                      setEditingCyl(cyl);
                      setCylEditProduct(cyl.product_name);
                      setCylEditColors(String(cyl.colors));
                      setCylEditSize(String(cyl.size_inches));
                      setCylEditMfr(cyl.manufacturer);
                      setCylEditDate(cyl.manufacture_date);
                    }} />
                    <Btn label="Delete" size="sm" variant="danger" onPress={() => deleteCylinder(cyl)} />
                  </View>
                </View>
              ))
            )}
          </Card>
        </>
      )}
      {/* ── Edit Foil Modal ── */}
      <Modal visible={!!editingFoil} animationType="fade" transparent onRequestClose={() => setEditingFoil(null)}>
        <View style={s.modalOverlay}>
          <Card style={s.modalCard}>
            <CardTitle>Edit {cfg.materialLabel} Stock</CardTitle>
            <ChipRow
              label={`${cfg.materialLabel} Type *`}
              options={cfg.materialOptions}
              value={foilEditType} onChange={setFoilEditType}
            />
            <Input label="Size *" value={foilEditSize} onChangeText={setFoilEditSize} placeholder="e.g. 10cm" />
            <Input label="Weight (KG) *" value={foilEditWeight} onChangeText={setFoilEditWeight} placeholder="e.g. 25" keyboardType="numeric" />
            <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] }}>
              <Btn label="Save" onPress={saveFoilEdit} variant="success" style={{ flex: 1 }} size="lg" />
              <Btn label="Cancel" onPress={() => setEditingFoil(null)} variant="secondary" style={{ flex: 1 }} size="lg" />
            </View>
          </Card>
        </View>
      </Modal>

      {/* ── Edit Cylinder Modal ── */}
      <Modal visible={!!editingCyl} animationType="fade" transparent onRequestClose={() => setEditingCyl(null)}>
        <View style={s.modalOverlay}>
          <Card style={s.modalCard}>
            <CardTitle>Edit Cylinder Stock</CardTitle>
            <Input label="Product Name *" value={cylEditProduct} onChangeText={setCylEditProduct} placeholder="e.g. Aspirin Blister" />
            <Input label="Number of Colors *" value={cylEditColors} onChangeText={setCylEditColors} placeholder="e.g. 4" keyboardType="numeric" />
            <Input label="Size (inches) *" value={cylEditSize} onChangeText={setCylEditSize} placeholder="e.g. 10" keyboardType="numeric" />
            <Input label="Manufacturer *" value={cylEditMfr} onChangeText={setCylEditMfr} placeholder="e.g. XYZ Co." />
            <Input label="Manufacture Date (YYYY-MM-DD) *" value={cylEditDate} onChangeText={setCylEditDate} placeholder="e.g. 2024-01-15" />
            <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] }}>
              <Btn label="Save" onPress={saveCylinderEdit} variant="success" style={{ flex: 1 }} size="lg" />
              <Btn label="Cancel" onPress={() => setEditingCyl(null)} variant="secondary" style={{ flex: 1 }} size="lg" />
            </View>
          </Card>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  stockRow:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:spacing[3], borderBottomWidth:1, borderBottomColor:colors.border },
  stockName: { fontWeight:'700', color:colors.text, fontSize:fontSize.base },
  stockSub:  { fontSize:fontSize.sm, color:colors.textMuted, marginTop:2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing[4],
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
});

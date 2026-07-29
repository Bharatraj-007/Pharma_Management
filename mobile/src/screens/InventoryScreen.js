/**
 * InventoryScreen — Foil + Cylinder stock management.
 * QR label display replaced with text-based label (printing not available on mobile).
 */
import React, { useEffect, useState, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Modal, Image,
} from 'react-native';
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

  const getTodayDateStr = () => new Date().toISOString().split('T')[0];
  const getYesterdayDateStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  // Cylinder state
  const [cylinders,   setCylinders]   = useState([]);
  const [cylClient,   setCylClient]   = useState('');
  const [cylProduct,  setCylProduct]  = useState('');
  const [cylColors,   setCylColors]   = useState('');
  const [cylSize,     setCylSize]     = useState('');
  const [cylMfr,      setCylMfr]      = useState(company === 'vel' ? 'Vel Gravure' : '');
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
  const [cylEditClient, setCylEditClient] = useState('');
  const [cylEditProduct, setCylEditProduct] = useState('');
  const [cylEditColors, setCylEditColors] = useState('');
  const [cylEditSize, setCylEditSize] = useState('');
  const [cylEditMfr, setCylEditMfr] = useState('');
  const [cylEditDate, setCylEditDate] = useState('');

  // Calendar picker state
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState('add'); // 'add' or 'edit'
  const [viewDate, setViewDate] = useState(new Date());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(d);
    return days;
  };

  const handleSelectDay = (dayNum) => {
    if (!dayNum) return;
    const y = viewDate.getFullYear();
    const m = String(viewDate.getMonth() + 1).padStart(2, '0');
    const d = String(dayNum).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    if (calendarTarget === 'edit') {
      setCylEditDate(dateStr);
    } else {
      setCylDate(dateStr);
    }
    setShowCalendarModal(false);
  };

  const changeMonth = (delta) => {
    setViewDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + delta);
      return next;
    });
  };

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

  // ── Print foil label (QR-only label, not the whole page) ──────────────────
  const handlePrint = async (foil) => {
    try {
      const printUrl = `${API_BASE_URL}/qrs/foil/${encodeURIComponent(foil.qrPayload)}/print`;
      const resp = await fetch(printUrl);
      if (!resp.ok) throw new Error('Failed to load print label');
      const html = await resp.text();
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

  // ── Save cylinder edit ───────────────────────────────────────────────────
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
          client_company: cylEditClient,
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
      setCylEditClient(''); setCylEditProduct(''); setCylEditColors(''); setCylEditSize(''); setCylEditMfr(''); setCylEditDate('');
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
      Alert.alert('Error', 'Please fill all required cylinder fields.'); return;
    }
    setCylLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/add-cylinder`, {
        method:'POST', headers: authHeaders,
        body: JSON.stringify({
          client_company: cylClient || (company === 'vel' ? 'Printing Client' : company),
          product_name: cylProduct,
          colors: Number(cylColors),
          size_inches: Number(cylSize),
          manufacturer: cylMfr,
          manufacture_date: cylDate,
        }),
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
                        <Image
                          source={{ uri: `${API_BASE_URL}/qrs/foil/${encodeURIComponent(foil.qrPayload)}/qr.png` }}
                          style={{ width: 80, height: 80, borderRadius: 4, borderWidth: 1, borderColor: colors.border, marginVertical: 4, backgroundColor: '#fff' }}
                          resizeMode="contain"
                        />
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
            <Input label={company === 'vel' ? 'Printing / Client Company Name *' : 'Client Company Name'} value={cylClient} onChangeText={setCylClient} placeholder="e.g. Bharath Enterprises" />
            <Input label="Product Name *"    value={cylProduct} onChangeText={setCylProduct} placeholder="e.g. Aspirin Blister" />
            <Input label="Number of Colors *" value={cylColors}  onChangeText={setCylColors}  placeholder="e.g. 4" keyboardType="numeric" />
            <Input label="Cylinder Size (inches) *" value={cylSize} onChangeText={setCylSize} placeholder="e.g. 10" keyboardType="numeric" />
            <Input label="Manufacturer *"    value={cylMfr}     onChangeText={setCylMfr}     placeholder="e.g. Vel Gravure" />
            <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing[1] }}>
              Manufacture Date *
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justify: 'space-between',
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                borderWidth: 1.5,
                borderColor: colors.primary,
                marginBottom: spacing[3],
              }}
              onPress={() => {
                setCalendarTarget('add');
                setViewDate(new Date());
                setShowCalendarModal(true);
              }}
            >
              <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: cylDate ? colors.text : colors.textMuted }}>
                📅 {cylDate ? cylDate : 'Select Manufacture Date'}
              </Text>
              <View style={{ backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}>
                <Text style={{ fontSize: fontSize.xs, fontWeight: '700', color: '#fff' }}>
                  CALENDAR 🗓️
                </Text>
              </View>
            </TouchableOpacity>
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
                    <Text style={s.stockName}>{cyl.client_company || cyl.company || 'Printing Client'} — {cyl.product_name}</Text>
                    <Text style={s.stockSub}>{cyl.colors} colours · Size: {cyl.size_inches}" · Mfr: {cyl.manufacturer}</Text>
                    <Text style={[s.stockSub, { fontSize:fontSize.xs, color:colors.primary }]}>
                      Barcode: {cyl.barcode}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <Btn label="Edit" size="sm" variant="warning" onPress={() => {
                      setEditingCyl(cyl);
                      setCylEditClient(cyl.client_company || '');
                      setCylEditProduct(cyl.product_name);
                      setCylEditColors(String(cyl.colors));
                      setCylEditSize(String(cyl.size_inches));
                      setCylEditMfr(cyl.manufacturer);
                      setCylEditDate(cyl.manufacture_date ? new Date(cyl.manufacture_date).toISOString().split('T')[0] : '');
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
            <Input label="Client Company Name *" value={cylEditClient} onChangeText={setCylEditClient} placeholder="e.g. Bharath Enterprises" />
            <Input label="Product Name *" value={cylEditProduct} onChangeText={setCylEditProduct} placeholder="e.g. Aspirin Blister" />
            <Input label="Number of Colors *" value={cylEditColors} onChangeText={setCylEditColors} placeholder="e.g. 4" keyboardType="numeric" />
            <Input label="Cylinder Size (inches) *" value={cylEditSize} onChangeText={setCylEditSize} placeholder="e.g. 10" keyboardType="numeric" />
            <Input label="Manufacturer *" value={cylEditMfr} onChangeText={setCylEditMfr} placeholder="e.g. Vel Gravure" />
            <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing[1], marginTop: spacing[2] }}>
              Manufacture Date *
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justify: 'space-between',
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                borderWidth: 1.5,
                borderColor: colors.primary,
                marginBottom: spacing[3],
              }}
              onPress={() => {
                setCalendarTarget('edit');
                if (cylEditDate) {
                  const parsed = new Date(cylEditDate);
                  if (!isNaN(parsed.getTime())) setViewDate(parsed);
                } else {
                  setViewDate(new Date());
                }
                setShowCalendarModal(true);
              }}
            >
              <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: cylEditDate ? colors.text : colors.textMuted }}>
                📅 {cylEditDate ? cylEditDate : 'Select Manufacture Date'}
              </Text>
              <View style={{ backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}>
                <Text style={{ fontSize: fontSize.xs, fontWeight: '700', color: '#fff' }}>
                  CALENDAR 🗓️
                </Text>
              </View>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] }}>
              <Btn label="Save" onPress={saveCylinderEdit} variant="success" style={{ flex: 1 }} size="lg" />
              <Btn label="Cancel" onPress={() => setEditingCyl(null)} variant="secondary" style={{ flex: 1 }} size="lg" />
            </View>
          </Card>
        </View>
      </Modal>

      {/* ── Visual Calendar Date Picker Modal ── */}
      <Modal visible={showCalendarModal} animationType="fade" transparent onRequestClose={() => setShowCalendarModal(false)}>
        <View style={s.modalOverlay}>
          <Card style={s.modalCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] }}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={{ padding: spacing[2] }}>
                <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: colors.primary }}>◀</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: colors.text }}>
                {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => changeMonth(1)} style={{ padding: spacing[2] }}>
                <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: colors.primary }}>▶</Text>
              </TouchableOpacity>
            </View>

            {/* Days of week */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing[2], marginBottom: spacing[2] }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <Text key={i} style={{ width: 36, textAlign: 'center', fontSize: fontSize.xs, fontWeight: '700', color: colors.textMuted }}>{d}</Text>
              ))}
            </View>

            {/* Days grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {getCalendarDays().map((dayNum, idx) => (
                <TouchableOpacity
                  key={idx}
                  disabled={!dayNum}
                  style={{
                    width: '14.28%',
                    aspectRatio: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginVertical: 2,
                    borderRadius: 6,
                    backgroundColor: dayNum ? colors.surfaceAlt : 'transparent',
                  }}
                  onPress={() => handleSelectDay(dayNum)}
                >
                  {dayNum ? <Text style={{ fontWeight: '600', color: colors.text }}>{dayNum}</Text> : null}
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[4] }}>
              <Btn label="⚡ Select Today" variant="primary" style={{ flex: 1 }} onPress={() => {
                const todayStr = getTodayDateStr();
                if (calendarTarget === 'edit') setCylEditDate(todayStr);
                else setCylDate(todayStr);
                setShowCalendarModal(false);
              }} />
              <Btn label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setShowCalendarModal(false)} />
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

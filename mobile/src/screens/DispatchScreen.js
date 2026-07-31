import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Modal, Platform,
} from 'react-native';
import * as Print from 'expo-print';
import { AuthContext } from '../navigation/AuthContext';
import API_BASE_URL from '../config';
import { colors, spacing, fontSize } from '../styles/theme';
import ScreenWrapper from '../components/ScreenWrapper';
import { Card, CardTitle, CardHeader, Btn, AlertBanner } from '../components/ui';
import { exportGenericExcel } from '../utils/reportExporter';

import DispatchScreenWeb from '../frontend-webui/screens/DispatchScreen.web';

const STATUS_OPTIONS = ['Pending', 'Processing', 'Dispatched', 'Delivered', 'Cancelled'];

export default function DispatchScreen(props) {
  const { session } = useContext(AuthContext);

  if (Platform.OS === 'web') {
    return <DispatchScreenWeb apiBaseUrl={API_BASE_URL} session={session} {...props} />;
  }
  const token = session?.token;
  const userRole = session?.role || 'worker';
  const company = session?.company || 'bharath';
  const activeCompany = session?.activeCompany || company;

  // For CEO, which company to use for form & report
  const effectiveCompany = userRole === 'ceo' && activeCompany !== 'all' ? activeCompany : company;

  const [activeTab, setActiveTab] = useState('form');

  // Product Type derived from effectiveCompany
  const productType = effectiveCompany === 'vel' ? 'cylinder' : effectiveCompany === 'shree_ganaapathy' ? 'roll' : 'foil';

  // Dispatch Form State
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [destinationCompany, setDestinationCompany] = useState('');
  const [destinationType, setDestinationType] = useState('external');
  const [deliveryMethod, setDeliveryMethod] = useState('A1 Transport');
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });

  // Cylinder Specific
  const [numberOfColors, setNumberOfColors] = useState('');
  const [size, setSize] = useState('');
  const [manufacturer, setManufacturer] = useState('Vel Gravure');

  // Foil Specific
  const [dColors, setDColors] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [dimensions, setDimensions] = useState('');

  // Roll Specific
  const [rollColors, setRollColors] = useState('');
  const [rollWeightKg, setRollWeightKg] = useState('');
  const [rollSize, setRollSize] = useState('');

  // Product Catalog
  const [productList, setProductList] = useState([]);
  // Inline product creation modal
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdSize, setNewProdSize] = useState('');
  const [newProdWeight, setNewProdWeight] = useState('');
  const [newProdColors, setNewProdColors] = useState('1');
  const [addingProduct, setAddingProduct] = useState(false);

  // Report State
  const [from, setFrom] = useState(new Date().toISOString().split('T')[0]);
  const [to, setTo] = useState(new Date().toISOString().split('T')[0]);
  const [reportCompany, setReportCompany] = useState(effectiveCompany);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Edit modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ productName:'', quantity:'', destinationCompany:'', deliveryMethod:'', status:'', remarks:'', dispatchDate:'' });
  const [editLoading, setEditLoading] = useState(false);

  const [exporting, setExporting] = useState(false);

  const headers = { 'Content-Type': 'application/json', Authorization: token };

  const fetchProducts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/products?company=${effectiveCompany}&limit=100`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const data = await res.json();
        setProductList(data.data || []);
      }
    } catch (e) {}
  }, [token, effectiveCompany]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const selectProduct = (prod) => {
    setProductName(prod.productName);
    if (productType === 'cylinder') {
      setSize(prod.size || '');
      setNumberOfColors(String(prod.numberOfColors || 1));
    } else if (productType === 'roll') {
      setRollSize(prod.size || '');
      setRollWeightKg(String(prod.weightKg || ''));
      setRollColors(`${prod.numberOfColors || 1} Colors`);
    } else {
      setDimensions(prod.size || '');
      setWeightKg(String(prod.weightKg || ''));
      setDColors(`${prod.numberOfColors || 1} Colors`);
    }
  };

  // Inline Product Creation
  const handleCreateProduct = async () => {
    if (!newProdName) { Alert.alert('Error', 'Product name is required.'); return; }
    setAddingProduct(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          company: effectiveCompany,
          productName: newProdName,
          size: newProdSize,
          weightKg: newProdWeight ? Number(newProdWeight) : 0,
          numberOfColors: newProdColors ? Number(newProdColors) : 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create product');
      Alert.alert('Success', '✅ Product created in catalog!');
      setShowAddProduct(false);
      setNewProdName(''); setNewProdSize(''); setNewProdWeight(''); setNewProdColors('1');
      fetchProducts();
      // Auto-select the created product
      if (data.product) selectProduct(data.product);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setAddingProduct(false);
    }
  };

  const fetchReport = useCallback(async () => {
    if (!token) return;
    setReportLoading(true);
    try {
      const rc = userRole === 'ceo' ? reportCompany : company;
      const res = await fetch(`${API_BASE_URL}/api/dispatch/report?company=${rc}&from=${from}&to=${to}`, {
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error('Failed to load dispatch report');
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setReportLoading(false);
    }
  }, [token, company, reportCompany, userRole, from, to]);

  useEffect(() => {
    if (activeTab === 'report') fetchReport();
  }, [activeTab, fetchReport]);

  const submitDispatch = async () => {
    if (!productName || !quantity || !destinationCompany || !deliveryMethod) {
      Alert.alert('Error', 'Please fill all required fields.');
      return;
    }
    setLoading(true);
    setFormMsg({ type: '', text: '' });
    try {
      const body = {
        company: effectiveCompany,
        productType,
        productName,
        quantity: Number(quantity),
        destinationType,
        destinationCompany,
        deliveryMethod,
        dispatchDate,
        remarks,
        numberOfColors: numberOfColors ? Number(numberOfColors) : undefined,
        size,
        manufacturer: effectiveCompany === 'vel' ? manufacturer : undefined,
        colors: dColors ? dColors.split(',').map(s=>s.trim()) : [],
        weightKg: weightKg ? Number(weightKg) : undefined,
        dimensions,
        rollColors: rollColors ? rollColors.split(',').map(s=>s.trim()) : [],
        rollWeightKg: rollWeightKg ? Number(rollWeightKg) : undefined,
        rollSize,
      };

      const res = await fetch(`${API_BASE_URL}/api/dispatch`, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      setFormMsg({ type: 'success', text: '✅ Dispatch record created!' });
      setProductName(''); setQuantity(''); setDestinationCompany(''); setRemarks('');
      setNumberOfColors(''); setSize(''); setDColors(''); setWeightKg('');
      setDimensions(''); setRollColors(''); setRollWeightKg(''); setRollSize('');
    } catch (err) {
      setFormMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Delete dispatch
  const deleteDispatch = (id) => {
    Alert.alert('Delete Dispatch?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/dispatch/${id}`, { method: 'DELETE', headers: { Authorization: token } });
          if (!res.ok) throw new Error('Failed to delete');
          fetchReport();
        } catch (err) { Alert.alert('Error', err.message); }
      }},
    ]);
  };

  // Update status
  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dispatch/${id}/status`, {
        method: 'PUT', headers, body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      fetchReport();
    } catch (err) { Alert.alert('Error', err.message); }
  };

  // Open edit modal
  const openEdit = (item) => {
    setEditingItem(item);
    setEditForm({
      productName: item.productName || '',
      quantity: String(item.quantity || ''),
      destinationCompany: item.destinationCompany || '',
      deliveryMethod: item.deliveryMethod || '',
      status: item.status || 'Pending',
      remarks: item.remarks || '',
      dispatchDate: item.dispatchDate ? new Date(item.dispatchDate).toISOString().split('T')[0] : '',
    });
  };

  // Save edit
  const saveEdit = async () => {
    if (!editingItem) return;
    setEditLoading(true);
    try {
      const body = {
        productName: editForm.productName,
        quantity: Number(editForm.quantity),
        destinationCompany: editForm.destinationCompany,
        deliveryMethod: editForm.deliveryMethod,
        status: editForm.status,
        remarks: editForm.remarks,
        dispatchDate: editForm.dispatchDate,
      };
      const res = await fetch(`${API_BASE_URL}/api/dispatch/${editingItem._id}`, {
        method: 'PUT', headers, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      Alert.alert('Updated', '✅ Dispatch record updated!');
      setEditingItem(null);
      fetchReport();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Export PDF
  const exportPDF = async () => {
    if (!reportData?.items?.length) { Alert.alert('No Data', 'No dispatches to print.'); return; }
    const htmlContent = `
      <html><head><style>
        body{font-family:Arial,sans-serif;padding:20px}
        h2{text-align:center;margin:0}h4{text-align:center;color:#475569;margin-top:4px}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th,td{border:1px solid #cbd5e1;padding:8px;font-size:12px}th{background:#f1f5f9}
        .sum{margin-top:20px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0}
      </style></head><body>
        <h2>DISPATCH REPORT — ${(userRole === 'ceo' ? reportCompany : company).toUpperCase()}</h2>
        <h4>Date: ${from} to ${to}</h4>
        <table><tr><th>S.No</th><th>Product</th><th>Qty</th><th>Destination</th><th>Method</th><th>Status</th><th>Date</th></tr>
        ${reportData.items.map((item, idx) => `
          <tr>
            <td>${idx+1}</td><td>${item.productName}</td><td>${item.quantity}</td>
            <td>${item.destinationCompany}</td><td>${item.deliveryMethod}</td>
            <td>${item.status}</td><td>${new Date(item.dispatchDate).toLocaleDateString()}</td>
          </tr>`).join('')}
        </table>
        <div class="sum"><strong>Total Qty Dispatched: ${reportData.summary?.totalQuantity || 0}</strong></div>
      </body></html>`;
    try { await Print.printAsync({ html: htmlContent }); }
    catch (err) { Alert.alert('Print Error', err.message); }
  };

  // Export Excel
  const exportExcel = async () => {
    if (!reportData?.items?.length) { Alert.alert('No Data', 'No dispatches to export.'); return; }
    setExporting(true);
    try {
      const records = reportData.items.map((item, idx) => ({
        'S.No': idx + 1,
        'Product Name': item.productName,
        'Quantity': item.quantity,
        'Destination': item.destinationCompany,
        'Delivery Method': item.deliveryMethod,
        'Status': item.status,
        'Dispatch Date': new Date(item.dispatchDate).toLocaleDateString(),
      }));
      await exportGenericExcel(records, from, to, `Dispatch_${effectiveCompany}`);
    } catch (err) { Alert.alert('Export Error', err.message); }
    finally { setExporting(false); }
  };

  const isCeo = userRole === 'ceo';

  return (
    <ScreenWrapper>
      {/* Tabs */}
      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabBtn, activeTab==='form' && s.tabBtnActive]} onPress={() => setActiveTab('form')}>
          <Text style={[s.tabBtnText, activeTab==='form' && s.tabBtnTextActive]}>➕ New Dispatch</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, activeTab==='report' && s.tabBtnActive]} onPress={() => setActiveTab('report')}>
          <Text style={[s.tabBtnText, activeTab==='report' && s.tabBtnTextActive]}>📄 Bill / Report</Text>
        </TouchableOpacity>
      </View>

      {/* ── NEW DISPATCH FORM ── */}
      {activeTab === 'form' && (
        <ScrollView style={{ flex: 1 }}>
          <AlertBanner type={formMsg.type === 'success' ? 'success' : 'danger'} message={formMsg.text} />
          <Card>
            <CardTitle>
              {productType === 'cylinder' ? '🏢 Cylinder Dispatch (Vel)'
                : productType === 'roll' ? '🏢 Roll Dispatch (Shree Ganaapathy)'
                : '🏢 Foil Dispatch (Bharath)'}
            </CardTitle>

            {/* Product Catalog Quick Select */}
            <View style={{ marginBottom: spacing[3] }}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                <Text style={s.label}>⚡ Select Product from Catalog:</Text>
                <TouchableOpacity
                  style={{ paddingHorizontal:8, paddingVertical:4, backgroundColor:colors.success, borderRadius:6 }}
                  onPress={() => setShowAddProduct(true)}
                >
                  <Text style={{ fontSize:fontSize.xs, fontWeight:'700', color:'#fff' }}>➕ New</Text>
                </TouchableOpacity>
              </View>
              {productList.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {productList.map((p) => (
                    <TouchableOpacity
                      key={p._id}
                      style={{ paddingHorizontal:12, paddingVertical:6, backgroundColor:'#eff6ff', borderRadius:16, borderWidth:1, borderColor:colors.primary, marginRight:6 }}
                      onPress={() => selectProduct(p)}
                    >
                      <Text style={{ fontSize:fontSize.xs, fontWeight:'700', color:colors.primary }}>🏷️ {p.productName}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <Text style={{ fontSize:fontSize.xs, color:colors.textMuted, fontStyle:'italic' }}>
                  No products in catalog. Tap "➕ New" to create one.
                </Text>
              )}
            </View>

            <Text style={s.label}>Product Name / Description *</Text>
            <TextInput style={s.input} placeholder="e.g. Aspirin Blister" value={productName} onChangeText={setProductName} />

            {productType === 'cylinder' && (
              <>
                <Text style={s.label}>Number of Colors *</Text>
                <TextInput style={s.input} placeholder="e.g. 4" keyboardType="numeric" value={numberOfColors} onChangeText={setNumberOfColors} />
                <Text style={s.label}>Size (inches) *</Text>
                <TextInput style={s.input} placeholder="e.g. 10.5" value={size} onChangeText={setSize} />
                <Text style={s.label}>Manufacturer</Text>
                <TextInput style={s.input} value={manufacturer} onChangeText={setManufacturer} />
              </>
            )}

            {productType === 'foil' && (
              <>
                <Text style={s.label}>Color(s) Used</Text>
                <TextInput style={s.input} placeholder="e.g. Red, Silver" value={dColors} onChangeText={setDColors} />
                <Text style={s.label}>Weight (kg) *</Text>
                <TextInput style={s.input} placeholder="e.g. 25.5" keyboardType="numeric" value={weightKg} onChangeText={setWeightKg} />
                <Text style={s.label}>Dimensions *</Text>
                <TextInput style={s.input} placeholder="e.g. 100mm" value={dimensions} onChangeText={setDimensions} />
              </>
            )}

            {productType === 'roll' && (
              <>
                <Text style={s.label}>Roll Color(s) Used</Text>
                <TextInput style={s.input} placeholder="e.g. Yellow, Red" value={rollColors} onChangeText={setRollColors} />
                <Text style={s.label}>Roll Weight (kg) *</Text>
                <TextInput style={s.input} placeholder="e.g. 45.0" keyboardType="numeric" value={rollWeightKg} onChangeText={setRollWeightKg} />
                <Text style={s.label}>Roll Size *</Text>
                <TextInput style={s.input} placeholder="e.g. 1200mm" value={rollSize} onChangeText={setRollSize} />
              </>
            )}

            <Text style={s.label}>Quantity *</Text>
            <TextInput style={s.input} placeholder="e.g. 5" keyboardType="numeric" value={quantity} onChangeText={setQuantity} />

            <Text style={s.label}>Destination Company *</Text>
            <TextInput style={s.input} placeholder="e.g. Sun Pharma" value={destinationCompany} onChangeText={setDestinationCompany} />

            <Text style={s.label}>Delivery Method *</Text>
            <TextInput style={s.input} placeholder="e.g. Rapido / VRL / A1 Transport" value={deliveryMethod} onChangeText={setDeliveryMethod} />

            <Text style={s.label}>Dispatch Date *</Text>
            <TextInput style={s.input} value={dispatchDate} onChangeText={setDispatchDate} placeholder="YYYY-MM-DD" />

            <Text style={s.label}>Remarks</Text>
            <TextInput style={[s.input, { height: 60 }]} multiline placeholder="Add notes..." value={remarks} onChangeText={setRemarks} />

            <Btn
              label={loading ? '⏳ Submitting...' : '🚀 Create Dispatch'}
              onPress={submitDispatch} loading={loading}
              variant="success" block size="lg"
              style={{ marginTop: spacing[3] }}
            />
          </Card>
        </ScrollView>
      )}

      {/* ── DISPATCH REPORT ── */}
      {activeTab === 'report' && (
        <ScrollView style={{ flex: 1 }}>
          <Card style={{ marginBottom: spacing[3] }}>
            <CardTitle>Date Filter</CardTitle>
            {/* CEO company selector */}
            {isCeo && (
              <>
                <Text style={s.label}>Company</Text>
                <View style={{ flexDirection:'row', gap:6, marginBottom:8, flexWrap:'wrap' }}>
                  {[{ value:'all', label:'All' }, { value:'bharath', label:'Bharath' }, { value:'shree_ganaapathy', label:'Shree' }, { value:'vel', label:'Vel' }].map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[s.chip, reportCompany === opt.value && s.chipActive]}
                      onPress={() => setReportCompany(opt.value)}
                    >
                      <Text style={[s.chipText, reportCompany === opt.value && s.chipActiveText]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>From Date</Text>
                <TextInput style={s.input} value={from} onChangeText={setFrom} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>To Date</Text>
                <TextInput style={s.input} value={to} onChangeText={setTo} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[2], flexWrap:'wrap' }}>
              <Btn label="🔍 Filter" onPress={fetchReport} variant="primary" style={{ flex: 1 }} />
              <Btn label="📄 PDF" onPress={exportPDF} variant="secondary" style={{ flex: 1 }} />
              <Btn label={exporting ? '⏳...' : '📊 Excel'} onPress={exportExcel} variant="success" style={{ flex: 1 }} disabled={exporting} />
            </View>
          </Card>

          <Card>
            <CardTitle>Dispatches ({reportData?.items?.length || 0})</CardTitle>
            {reportLoading ? (
              <ActivityIndicator color={colors.primary} size="large" />
            ) : !reportData?.items?.length ? (
              <Text style={{ textAlign:'center', color:colors.textMuted, padding:spacing[4] }}>No dispatches found for this date range.</Text>
            ) : (
              <>
                {reportData.items.map((item) => (
                  <View key={item._id} style={s.recordCard}>
                    <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <View style={{ flex:1 }}>
                        <Text style={s.recordTitle}>{item.productName}</Text>
                        <Text style={s.recordSub}>Qty: {item.quantity} · Dest: {item.destinationCompany}</Text>
                        <Text style={s.recordSub}>Method: {item.deliveryMethod}</Text>
                        <Text style={[s.recordSub, { color: colors.primary }]}>Date: {new Date(item.dispatchDate).toLocaleDateString()}</Text>
                      </View>
                      {/* Status badge */}
                      <View style={[s.statusBadge, { backgroundColor: item.status === 'Delivered' ? '#dcfce7' : item.status === 'Cancelled' ? '#fee2e2' : '#fef3c7' }]}>
                        <Text style={{ fontSize:fontSize.xs, fontWeight:'700', color: item.status === 'Delivered' ? '#166534' : item.status === 'Cancelled' ? '#991b1b' : '#92400e' }}>
                          {item.status || 'Pending'}
                        </Text>
                      </View>
                    </View>

                    {/* Action row */}
                    <View style={{ flexDirection:'row', gap:6, marginTop:spacing[2], flexWrap:'wrap' }}>
                      {/* Quick status chips */}
                      {STATUS_OPTIONS.map(st => (
                        <TouchableOpacity
                          key={st}
                          style={[s.stChip, item.status === st && s.stChipActive]}
                          onPress={() => updateStatus(item._id, st)}
                        >
                          <Text style={{ fontSize:10, fontWeight:'700', color: item.status === st ? '#fff' : colors.text }}>{st}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={{ flexDirection:'row', gap:6, marginTop:4 }}>
                      <Btn label="✏️ Edit" size="sm" variant="warning" onPress={() => openEdit(item)} style={{ flex:1 }} />
                      <Btn label="🗑️ Delete" size="sm" variant="danger" onPress={() => deleteDispatch(item._id)} style={{ flex:1 }} />
                    </View>
                  </View>
                ))}
                <View style={s.summaryCard}>
                  <Text style={s.summaryTitle}>📊 DISPATCH SUMMARY</Text>
                  <Text style={s.summaryText}>Total Dispatched Qty: <Text style={{ fontWeight:'700' }}>{reportData.summary?.totalQuantity || 0}</Text></Text>
                </View>
              </>
            )}
          </Card>
        </ScrollView>
      )}

      {/* ── Edit Modal ── */}
      <Modal visible={!!editingItem} animationType="slide" transparent onRequestClose={() => setEditingItem(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>✏️ Edit Dispatch</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Product Name</Text>
              <TextInput style={s.input} value={editForm.productName} onChangeText={v => setEditForm(p=>({...p,productName:v}))} />
              <Text style={s.label}>Quantity</Text>
              <TextInput style={s.input} keyboardType="numeric" value={editForm.quantity} onChangeText={v => setEditForm(p=>({...p,quantity:v}))} />
              <Text style={s.label}>Destination Company</Text>
              <TextInput style={s.input} value={editForm.destinationCompany} onChangeText={v => setEditForm(p=>({...p,destinationCompany:v}))} />
              <Text style={s.label}>Delivery Method</Text>
              <TextInput style={s.input} value={editForm.deliveryMethod} onChangeText={v => setEditForm(p=>({...p,deliveryMethod:v}))} />
              <Text style={s.label}>Dispatch Date (YYYY-MM-DD)</Text>
              <TextInput style={s.input} value={editForm.dispatchDate} onChangeText={v => setEditForm(p=>({...p,dispatchDate:v}))} />
              <Text style={s.label}>Remarks</Text>
              <TextInput style={[s.input,{height:60}]} multiline value={editForm.remarks} onChangeText={v => setEditForm(p=>({...p,remarks:v}))} />
              <Text style={s.label}>Status</Text>
              <View style={{ flexDirection:'row', gap:6, flexWrap:'wrap', marginBottom:spacing[3] }}>
                {STATUS_OPTIONS.map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[s.stChip, editForm.status === st && s.stChipActive]}
                    onPress={() => setEditForm(p=>({...p,status:st}))}
                  >
                    <Text style={{ fontSize:11, fontWeight:'700', color: editForm.status === st ? '#fff' : colors.text }}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={{ flexDirection:'row', gap:spacing[2], marginTop:spacing[3] }}>
              <Btn label={editLoading ? '⏳ Saving...' : 'Save'} onPress={saveEdit} variant="success" style={{ flex:1 }} loading={editLoading} />
              <Btn label="Cancel" onPress={() => setEditingItem(null)} variant="secondary" style={{ flex:1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Add Product Modal ── */}
      <Modal visible={showAddProduct} animationType="slide" transparent onRequestClose={() => setShowAddProduct(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>🏷️ Create Product in Catalog</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Product Name *</Text>
              <TextInput style={s.input} placeholder="e.g. Paracetamol 500mg Foil" value={newProdName} onChangeText={setNewProdName} />
              <Text style={s.label}>Size / Dimensions</Text>
              <TextInput style={s.input} placeholder="e.g. 150mm" value={newProdSize} onChangeText={setNewProdSize} />
              <Text style={s.label}>Weight (KG)</Text>
              <TextInput style={s.input} keyboardType="numeric" placeholder="e.g. 25" value={newProdWeight} onChangeText={setNewProdWeight} />
              <Text style={s.label}>Number of Colors</Text>
              <TextInput style={s.input} keyboardType="numeric" placeholder="1" value={newProdColors} onChangeText={setNewProdColors} />
            </ScrollView>
            <View style={{ flexDirection:'row', gap:spacing[2], marginTop:spacing[3] }}>
              <Btn label={addingProduct ? '⏳ Creating...' : 'Save Product'} onPress={handleCreateProduct} variant="success" style={{ flex:1 }} loading={addingProduct} />
              <Btn label="Cancel" onPress={() => setShowAddProduct(false)} variant="secondary" style={{ flex:1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  tabRow: { flexDirection:'row', gap:spacing[2], marginBottom:spacing[3] },
  tabBtn: { flex:1, paddingVertical:spacing[3], backgroundColor:colors.surface, borderRadius:8, alignItems:'center', borderWidth:1, borderColor:colors.border },
  tabBtnActive: { backgroundColor:colors.primary, borderColor:colors.primary },
  tabBtnText: { fontWeight:'700', color:colors.text, fontSize:fontSize.sm },
  tabBtnTextActive: { color:'#fff' },
  label: { fontSize:fontSize.xs, fontWeight:'600', color:colors.text, marginBottom:4, marginTop:8 },
  input: { backgroundColor:colors.surface, borderWidth:1, borderColor:colors.border, borderRadius:6, paddingHorizontal:spacing[3], paddingVertical:spacing[2], fontSize:fontSize.sm, color:colors.text },
  chip: { paddingHorizontal:10, paddingVertical:5, borderRadius:16, borderWidth:1, borderColor:colors.border, backgroundColor:colors.surface },
  chipActive: { backgroundColor:colors.primary, borderColor:colors.primary },
  chipText: { fontSize:fontSize.xs, fontWeight:'700', color:colors.text },
  chipActiveText: { color:'#fff' },
  recordCard: { paddingVertical:spacing[3], borderBottomWidth:1, borderBottomColor:colors.border },
  recordTitle: { fontWeight:'700', color:colors.text, fontSize:fontSize.base },
  recordSub: { fontSize:fontSize.xs, color:colors.textMuted, marginTop:2 },
  statusBadge: { paddingHorizontal:8, paddingVertical:3, borderRadius:12, marginLeft:8 },
  stChip: { paddingHorizontal:8, paddingVertical:3, borderRadius:12, borderWidth:1, borderColor:colors.border, backgroundColor:colors.surface },
  stChipActive: { backgroundColor:colors.primary, borderColor:colors.primary },
  summaryCard: { marginTop:spacing[3], padding:spacing[3], backgroundColor:colors.surfaceAlt, borderRadius:8, borderWidth:1, borderColor:colors.border },
  summaryTitle: { fontWeight:'700', fontSize:fontSize.sm, color:colors.text, marginBottom:4 },
  summaryText: { fontSize:fontSize.sm, color:colors.text },
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' },
  modalSheet: { backgroundColor:colors.surface, borderTopLeftRadius:20, borderTopRightRadius:20, padding:spacing[4], maxHeight:'85%' },
  modalTitle: { fontSize:fontSize.lg, fontWeight:'700', color:colors.text, marginBottom:spacing[3] },
});

import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
} from 'react-native';
import * as Print from 'expo-print';
import { AuthContext } from '../navigation/AuthContext';
import API_BASE_URL from '../config';
import { colors, spacing, fontSize } from '../styles/theme';
import ScreenWrapper from '../components/ScreenWrapper';
import { Card, CardTitle, Btn } from '../components/ui';

export default function DispatchScreen() {
  const { session } = useContext(AuthContext);
  const token = session?.token;
  const userRole = session?.role || 'worker';
  const company = session?.company || 'bharath';

  const [activeTab, setActiveTab] = useState('form'); // 'form' or 'report'

  // Product Type
  const productType = company === 'vel' ? 'cylinder' : company === 'shree_ganaapathy' ? 'roll' : 'foil';

  // Dispatch Form State
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [destinationCompany, setDestinationCompany] = useState('');
  const [destinationType, setDestinationType] = useState('external');
  const [deliveryMethod, setDeliveryMethod] = useState('A1 Transport');
  const [customDeliveryMethod, setCustomDeliveryMethod] = useState('');
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  // Cylinder Specific
  const [numberOfColors, setNumberOfColors] = useState('');
  const [size, setSize] = useState('');
  const [manufacturer, setManufacturer] = useState('Vel Gravure');

  // Foil Specific
  const [colors, setColors] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [dimensions, setDimensions] = useState('');

  // Roll Specific
  const [rollColors, setRollColors] = useState('');
  const [rollWeightKg, setRollWeightKg] = useState('');
  const [rollSize, setRollSize] = useState('');

  // Report State
  const [from, setFrom] = useState(new Date().toISOString().split('T')[0]);
  const [to, setTo] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Fetch Report
  const fetchReport = useCallback(async () => {
    if (!token) return;
    setReportLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/dispatch/report?company=${company}&from=${from}&to=${to}`, {
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
  }, [token, company, from, to]);

  useEffect(() => {
    if (activeTab === 'report') {
      fetchReport();
    }
  }, [activeTab, fetchReport]);

  // Submit Dispatch
  const submitDispatch = async () => {
    if (!productName || !quantity || !destinationCompany || !deliveryMethod) {
      Alert.alert('Error', 'Please fill all required fields.');
      return;
    }

    setLoading(true);
    try {
      const body = {
        company,
        productType,
        productName,
        quantity: Number(quantity),
        destinationType,
        destinationCompany,
        deliveryMethod,
        customDeliveryMethod: deliveryMethod === 'Other' ? customDeliveryMethod : '',
        dispatchDate,
        remarks,
        numberOfColors: numberOfColors ? Number(numberOfColors) : undefined,
        size,
        manufacturer: company === 'vel' ? manufacturer : undefined,
        colors: colors ? colors.split(',').map(s=>s.trim()) : [],
        weightKg: weightKg ? Number(weightKg) : undefined,
        dimensions,
        rollColors: rollColors ? rollColors.split(',').map(s=>s.trim()) : [],
        rollWeightKg: rollWeightKg ? Number(rollWeightKg) : undefined,
        rollSize,
      };

      const res = await fetch(`${API_BASE_URL}/api/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      Alert.alert('Success', '✅ Dispatch record created!');
      setProductName('');
      setQuantity('');
      setDestinationCompany('');
      setRemarks('');
      setNumberOfColors('');
      setSize('');
      setColors('');
      setWeightKg('');
      setDimensions('');
      setRollColors('');
      setRollWeightKg('');
      setRollSize('');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Export PDF via expo-print
  const exportPDF = async () => {
    if (!reportData || !reportData.items || reportData.items.length === 0) {
      Alert.alert('No Data', 'No dispatches found to print.');
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { text-align: center; margin: 0; }
            h4 { text-align: center; color: #475569; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; }
            th { background-color: #f1f5f9; }
            .summary { margin-top: 20px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <h2>${company.toUpperCase()} DISPATCH REPORT</h2>
          <h4>Date: ${from} to ${to}</h4>
          <table>
            <tr>
              <th>S.No</th>
              <th>Product Name</th>
              <th>Qty</th>
              <th>Destination</th>
              <th>Delivery Method</th>
              <th>Status</th>
            </tr>
            ${reportData.items.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.productName}</td>
                <td>${item.quantity}</td>
                <td>${item.destinationCompany}</td>
                <td>${item.deliveryMethod}</td>
                <td>${item.status}</td>
              </tr>
            `).join('')}
          </table>
          <div class="summary">
            <strong>Total Quantity Dispatched:</strong> ${reportData.summary?.totalQuantity || 0}
          </div>
        </body>
      </html>
    `;

    try {
      await Print.printAsync({ html: htmlContent });
    } catch (err) {
      Alert.alert('Print Error', err.message);
    }
  };

  return (
    <ScreenWrapper>
      {/* Header Tabs */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'form' && s.tabBtnActive]}
          onPress={() => setActiveTab('form')}
        >
          <Text style={[s.tabBtnText, activeTab === 'form' && s.tabBtnTextActive]}>➕ New Dispatch</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'report' && s.tabBtnActive]}
          onPress={() => setActiveTab('report')}
        >
          <Text style={[s.tabBtnText, activeTab === 'report' && s.tabBtnTextActive]}>📄 Bill / Report</Text>
        </TouchableOpacity>
      </View>

      {/* ── NEW DISPATCH FORM ── */}
      {activeTab === 'form' && (
        <ScrollView style={{ flex: 1 }}>
          <Card>
            <CardTitle>
              {productType === 'cylinder' ? '🏢 Cylinder Dispatch (Vel)'
                : productType === 'roll' ? '🏢 Roll Dispatch (Shree Ganaapathy)'
                : '🏢 Foil Dispatch (Bharath)'}
            </CardTitle>

            <Text style={s.label}>Product Name / Description *</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Aspirin Blister"
              value={productName}
              onChangeText={setProductName}
            />

            {/* Cylinder Fields */}
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

            {/* Foil Fields */}
            {productType === 'foil' && (
              <>
                <Text style={s.label}>Color(s) Used</Text>
                <TextInput style={s.input} placeholder="e.g. Red, Silver" value={colors} onChangeText={setColors} />

                <Text style={s.label}>Weight (kg) *</Text>
                <TextInput style={s.input} placeholder="e.g. 25.5" keyboardType="numeric" value={weightKg} onChangeText={setWeightKg} />

                <Text style={s.label}>Dimensions *</Text>
                <TextInput style={s.input} placeholder="e.g. 100mm" value={dimensions} onChangeText={setDimensions} />
              </>
            )}

            {/* Roll Fields */}
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
            <TextInput style={s.input} value={dispatchDate} onChangeText={setDispatchDate} />

            <Text style={s.label}>Remarks</Text>
            <TextInput style={[s.input, { height: 60 }]} multiline placeholder="Add notes..." value={remarks} onChangeText={setRemarks} />

            <Btn
              label={loading ? '⏳ Submitting...' : '🚀 Create Dispatch'}
              onPress={submitDispatch}
              loading={loading}
              variant="success"
              block
              size="lg"
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
            <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] }}>
              <Btn label="🔍 Filter" onPress={fetchReport} variant="primary" style={{ flex: 1 }} />
              <Btn label="📄 Print PDF" onPress={exportPDF} variant="secondary" style={{ flex: 1 }} />
            </View>
          </Card>

          <Card>
            <CardTitle>Dispatches ({reportData?.items?.length || 0})</CardTitle>

            {reportLoading ? (
              <ActivityIndicator color={colors.primary} size="large" />
            ) : !reportData || !reportData.items || reportData.items.length === 0 ? (
              <Text style={{ textAlign: 'center', color: colors.textMuted, padding: spacing[4] }}>
                No dispatches found for this date range.
              </Text>
            ) : (
              <>
                {reportData.items.map((item, idx) => (
                  <View key={item._id} style={s.recordCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={s.recordTitle}>{idx + 1}. {item.productName}</Text>
                      <Text style={s.recordQty}>Qty: {item.quantity}</Text>
                    </View>
                    <Text style={s.recordSub}>Dest: {item.destinationCompany} · Method: {item.deliveryMethod}</Text>
                    <Text style={[s.recordSub, { color: colors.primary }]}>Date: {new Date(item.dispatchDate).toLocaleDateString()}</Text>
                  </View>
                ))}

                {/* Summary */}
                <View style={s.summaryCard}>
                  <Text style={s.summaryTitle}>📊 DISPATCH SUMMARY</Text>
                  <Text style={s.summaryText}>Total Dispatched Qty: <Text style={{ fontWeight: '700' }}>{reportData.summary?.totalQuantity || 0}</Text></Text>
                </View>
              </>
            )}
          </Card>
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  tabRow: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3] },
  tabBtn: { flex: 1, paddingVertical: spacing[3], backgroundColor: colors.surface, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  tabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabBtnText: { fontWeight: '700', color: colors.text, fontSize: fontSize.sm },
  tabBtnTextActive: { color: '#fff' },
  label: { fontSize: fontSize.xs, fontWeight: '600', color: colors.text, marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: spacing[3], paddingVertical: spacing[2], fontSize: fontSize.sm, color: colors.text },
  recordCard: { paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border },
  recordTitle: { fontWeight: '700', color: colors.text, fontSize: fontSize.base },
  recordQty: { fontWeight: '700', color: colors.primary, fontSize: fontSize.base },
  recordSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  summaryCard: { marginTop: spacing[3], padding: spacing[3], backgroundColor: colors.surfaceAlt, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  summaryTitle: { fontWeight: '700', fontSize: fontSize.sm, color: colors.text, marginBottom: 4 },
  summaryText: { fontSize: fontSize.sm, color: colors.text },
});

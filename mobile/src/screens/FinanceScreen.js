import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Modal,
} from 'react-native';
import * as Print from 'expo-print';
import { AuthContext } from '../navigation/AuthContext';
import API_BASE_URL from '../config';
import { colors, spacing, fontSize } from '../styles/theme';
import ScreenWrapper from '../components/ScreenWrapper';
import { Card, CardTitle, CardHeader, Btn, AlertBanner } from '../components/ui';
import { exportGenericExcel } from '../utils/reportExporter';

const INCOME_CATS  = ['Dispatch Sale', 'Service Revenue', 'Other Income'];
const EXPENSE_CATS = ['Raw Material', 'Salaries', 'Rent', 'Utilities', 'Maintenance', 'Transport', 'Other Expense'];

const COMPANIES = [
  { value: 'bharath', label: 'Bharath' },
  { value: 'shree_ganaapathy', label: 'Shree' },
  { value: 'vel', label: 'Vel' },
];

export default function FinanceScreen() {
  const { session } = useContext(AuthContext);
  const token     = session?.token;
  const userRole  = session?.role || 'worker';
  const company   = session?.company || 'bharath';
  const activeCo  = session?.activeCompany;

  // CEO uses activeCompany selector; others use their own company
  const [ceoCompany, setCeoCompany] = useState(
    userRole === 'ceo' && activeCo && activeCo !== 'all' ? activeCo : company
  );
  const effectiveCompany = userRole === 'ceo' ? ceoCompany : company;

  const [period, setPeriod] = useState('month'); // 'day' or 'month'
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Add Transaction Form State
  const [type, setType] = useState('income');
  const [category, setCategory] = useState('Dispatch Sale');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // Edit Transaction state
  const [editingTx, setEditingTx] = useState(null);
  const [editForm, setEditForm] = useState({ type:'', category:'', amount:'', description:'', paymentMethod:'', date:'' });
  const [editLoading, setEditLoading] = useState(false);

  const [exporting, setExporting] = useState(false);

  const headers = { 'Content-Type': 'application/json', Authorization: token };

  const fetchFinancials = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [sumRes, txRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/transactions/summary?company=${effectiveCompany}&period=${period}`, {
          headers: { Authorization: token },
        }),
        fetch(`${API_BASE_URL}/api/transactions?company=${effectiveCompany}&limit=50`, {
          headers: { Authorization: token },
        }),
      ]);

      if (sumRes.ok && txRes.ok) {
        const sumData = await sumRes.json();
        const txData  = await txRes.json();
        setSummary(sumData);
        setTransactions(txData.data || []);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [token, effectiveCompany, period]);

  useEffect(() => { fetchFinancials(); }, [fetchFinancials]);

  // ── Add Transaction ────────────────────────────────────────────────────────
  const addTransaction = async () => {
    if (!amount || Number(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid positive amount.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          company: effectiveCompany === 'all' ? 'bharath' : effectiveCompany,
          type,
          category,
          amount: Number(amount),
          description,
          paymentMethod,
          date: txDate ? new Date(txDate).toISOString() : new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add transaction');
      Alert.alert('Success', '✅ Transaction logged successfully!');
      setAmount(''); setDescription('');
      fetchFinancials();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete Transaction ─────────────────────────────────────────────────────
  const deleteTx = (id) => {
    Alert.alert('Delete Transaction?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/transactions/${id}`, {
            method: 'DELETE', headers: { Authorization: token },
          });
          if (!res.ok) throw new Error('Failed to delete');
          fetchFinancials();
        } catch (err) { Alert.alert('Error', err.message); }
      }},
    ]);
  };

  // ── Open Edit ──────────────────────────────────────────────────────────────
  const openEdit = (tx) => {
    setEditingTx(tx);
    setEditForm({
      type:          tx.type,
      category:      tx.category,
      amount:        String(tx.amount),
      description:   tx.description || '',
      paymentMethod: tx.paymentMethod || 'online',
      date:          tx.date ? new Date(tx.date).toISOString().split('T')[0] : '',
    });
  };

  // ── Save Edit ──────────────────────────────────────────────────────────────
  const saveEdit = async () => {
    if (!editingTx) return;
    setEditLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/transactions/${editingTx._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          type:          editForm.type,
          category:      editForm.category,
          amount:        Number(editForm.amount),
          description:   editForm.description,
          paymentMethod: editForm.paymentMethod,
          date:          editForm.date ? new Date(editForm.date).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      Alert.alert('Updated', '✅ Transaction updated!');
      setEditingTx(null);
      fetchFinancials();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // ── Export PDF ─────────────────────────────────────────────────────────────
  const exportPdf = async () => {
    try {
      const htmlContent = `
        <html><body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="text-align: center; color: #1e293b;">PROFIT &amp; LOSS STATEMENT</h1>
          <h3 style="text-align: center; color: #64748b;">Company: ${effectiveCompany.toUpperCase()}</h3>
          <hr />
          <p><strong>Total Income:</strong> ₹${summary?.totalIncome || 0}</p>
          <p><strong>Total Expenses:</strong> ₹${summary?.totalExpense || 0}</p>
          <h2 style="color: ${(summary?.netProfit || 0) >= 0 ? '#166534' : '#991b1b'};">Net Profit: ₹${summary?.netProfit || 0}</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead><tr style="background: #f1f5f9;">
              <th style="padding: 8px; border: 1px solid #ccc;">Date</th>
              <th style="padding: 8px; border: 1px solid #ccc;">Category</th>
              <th style="padding: 8px; border: 1px solid #ccc;">Type</th>
              <th style="padding: 8px; border: 1px solid #ccc;">Amount</th>
            </tr></thead>
            <tbody>
              ${transactions.map(t => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ccc;">${new Date(t.date).toLocaleDateString()}</td>
                  <td style="padding: 8px; border: 1px solid #ccc;">${t.category}</td>
                  <td style="padding: 8px; border: 1px solid #ccc;">${t.type.toUpperCase()}</td>
                  <td style="padding: 8px; border: 1px solid #ccc; text-align: right;">₹${t.amount}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </body></html>`;
      await Print.printAsync({ html: htmlContent });
    } catch (err) { Alert.alert('Error', err.message); }
  };

  // ── Export Excel ───────────────────────────────────────────────────────────
  const exportExcel = async () => {
    if (!transactions.length) { Alert.alert('No Data', 'No transactions to export.'); return; }
    setExporting(true);
    try {
      const records = transactions.map((t, idx) => ({
        'S.No': idx + 1,
        'Date': new Date(t.date).toLocaleDateString(),
        'Category': t.category,
        'Type': t.type.toUpperCase(),
        'Amount (₹)': t.amount,
        'Description': t.description || '',
        'Payment Method': t.paymentMethod || 'online',
      }));
      await exportGenericExcel(records, '', '', `Finance_PnL_${effectiveCompany}`);
    } catch (err) { Alert.alert('Export Error', err.message); }
    finally { setExporting(false); }
  };

  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;

  return (
    <ScreenWrapper>
      <ScrollView style={{ flex: 1 }}>

        {/* CEO Company Selector */}
        {userRole === 'ceo' && (
          <Card style={{ marginBottom: spacing[3] }}>
            <CardTitle>🏢 View Company</CardTitle>
            <View style={{ flexDirection:'row', gap:6 }}>
              {COMPANIES.map(c => (
                <TouchableOpacity
                  key={c.value}
                  style={[s.chip, ceoCompany === c.value && s.chipActive]}
                  onPress={() => setCeoCompany(c.value)}
                >
                  <Text style={[s.chipText, ceoCompany === c.value && s.chipActiveText]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}

        {/* Period Selector */}
        <View style={s.periodTabs}>
          <TouchableOpacity style={[s.periodTab, period === 'day' && s.periodTabActive]} onPress={() => setPeriod('day')}>
            <Text style={[s.periodTabText, period === 'day' && s.periodTabTextActive]}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.periodTab, period === 'month' && s.periodTabActive]} onPress={() => setPeriod('month')}>
            <Text style={[s.periodTabText, period === 'month' && s.periodTabTextActive]}>This Month</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={s.cardGrid}>
          <View style={[s.sumCard, { borderLeftColor: '#16a34a' }]}>
            <Text style={s.sumLabel}>INCOME</Text>
            <Text style={[s.sumVal, { color: '#166534' }]}>₹{summary?.totalIncome || 0}</Text>
          </View>
          <View style={[s.sumCard, { borderLeftColor: '#dc2626' }]}>
            <Text style={s.sumLabel}>EXPENSES</Text>
            <Text style={[s.sumVal, { color: '#991b1b' }]}>₹{summary?.totalExpense || 0}</Text>
          </View>
          <View style={[s.sumCard, { borderLeftColor: (summary?.netProfit || 0) >= 0 ? '#2563eb' : '#dc2626' }]}>
            <Text style={s.sumLabel}>NET PROFIT</Text>
            <Text style={[s.sumVal, { color: (summary?.netProfit || 0) >= 0 ? '#1d4ed8' : '#991b1b' }]}>
              ₹{summary?.netProfit || 0}
            </Text>
          </View>
        </View>

        {/* Export Buttons */}
        <View style={{ flexDirection:'row', gap:spacing[2], marginBottom:spacing[3] }}>
          <Btn label="📄 Export PDF" onPress={exportPdf} variant="secondary" style={{ flex:1 }} />
          <Btn label={exporting ? '⏳...' : '📊 Export Excel'} onPress={exportExcel} variant="success" style={{ flex:1 }} disabled={exporting} />
        </View>

        {/* Add Transaction Form */}
        <Card style={{ marginBottom: spacing[3] }}>
          <CardTitle>➕ Record Financial Transaction</CardTitle>
          <Text style={s.label}>Type *</Text>
          <View style={{ flexDirection:'row', gap:10, marginBottom:8 }}>
            <TouchableOpacity style={[s.typeBtn, type==='income' && s.typeBtnIncome]} onPress={() => { setType('income'); setCategory('Dispatch Sale'); }}>
              <Text style={{ fontWeight:'bold', color: type==='income' ? '#fff' : colors.text }}>🟢 Income</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.typeBtn, type==='expense' && s.typeBtnExpense]} onPress={() => { setType('expense'); setCategory('Raw Material'); }}>
              <Text style={{ fontWeight:'bold', color: type==='expense' ? '#fff' : colors.text }}>🔴 Expense</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:8 }}>
            {cats.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[s.chip, category === cat && s.chipActive, { marginRight:6 }]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[s.chipText, category === cat && s.chipActiveText]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.label}>Amount (₹) *</Text>
          <TextInput style={s.input} keyboardType="numeric" placeholder="e.g. 5000" value={amount} onChangeText={setAmount} />

          <Text style={s.label}>Description</Text>
          <TextInput style={s.input} placeholder="Brief description..." value={description} onChangeText={setDescription} />

          <Text style={s.label}>Payment Method</Text>
          <View style={{ flexDirection:'row', gap:8, marginBottom:8 }}>
            {['online','cash','cheque'].map(m => (
              <TouchableOpacity
                key={m}
                style={[s.chip, paymentMethod === m && s.chipActive]}
                onPress={() => setPaymentMethod(m)}
              >
                <Text style={[s.chipText, paymentMethod === m && s.chipActiveText]}>{m.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Date * (YYYY-MM-DD)</Text>
          <TextInput
            style={s.input}
            value={txDate}
            onChangeText={setTxDate}
            placeholder="e.g. 2026-07-29"
          />

          <Btn
            label={submitting ? '⏳ Saving...' : '✅ Log Transaction'}
            onPress={addTransaction} loading={submitting}
            variant="primary" block size="lg"
            style={{ marginTop: spacing[2] }}
          />
        </Card>

        {/* Transactions List */}
        <Card>
          <CardTitle>Transaction History ({transactions.length})</CardTitle>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : transactions.length === 0 ? (
            <Text style={{ textAlign:'center', color:colors.textMuted, padding:spacing[4] }}>No transactions found.</Text>
          ) : (
            transactions.map((t) => (
              <View key={t._id} style={s.txRow}>
                <View style={{ flex:1 }}>
                  <Text style={s.txTitle}>{t.category} — {t.type.toUpperCase()}</Text>
                  <Text style={[s.txSub, { color: t.type === 'income' ? '#166534' : '#991b1b', fontWeight:'700' }]}>₹{t.amount}</Text>
                  <Text style={s.txSub}>{new Date(t.date).toLocaleDateString()} · {t.paymentMethod?.toUpperCase()}</Text>
                  {t.description ? <Text style={[s.txSub, { fontSize:fontSize.xs }]}>{t.description}</Text> : null}
                </View>
                <View style={{ alignItems:'flex-end', gap:4 }}>
                  <Btn label="Edit" size="sm" variant="warning" onPress={() => openEdit(t)} />
                  <Btn label="Del" size="sm" variant="danger" onPress={() => deleteTx(t._id)} />
                </View>
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      {/* ── Edit Transaction Modal ── */}
      <Modal visible={!!editingTx} animationType="slide" transparent onRequestClose={() => setEditingTx(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>✏️ Edit Transaction</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Type *</Text>
              <View style={{ flexDirection:'row', gap:8, marginBottom:8 }}>
                {['income','expense'].map(t => (
                  <TouchableOpacity key={t} style={[s.chip, editForm.type===t && s.chipActive]} onPress={() => setEditForm(p=>({...p,type:t}))}>
                    <Text style={[s.chipText, editForm.type===t && s.chipActiveText]}>{t.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.label}>Category *</Text>
              <TextInput style={s.input} value={editForm.category} onChangeText={v => setEditForm(p=>({...p,category:v}))} />
              <Text style={s.label}>Amount (₹) *</Text>
              <TextInput style={s.input} keyboardType="numeric" value={editForm.amount} onChangeText={v => setEditForm(p=>({...p,amount:v}))} />
              <Text style={s.label}>Description</Text>
              <TextInput style={s.input} value={editForm.description} onChangeText={v => setEditForm(p=>({...p,description:v}))} />
              <Text style={s.label}>Date (YYYY-MM-DD)</Text>
              <TextInput style={s.input} value={editForm.date} onChangeText={v => setEditForm(p=>({...p,date:v}))} />
              <Text style={s.label}>Payment Method</Text>
              <View style={{ flexDirection:'row', gap:6, marginBottom:8 }}>
                {['online','cash','cheque'].map(m => (
                  <TouchableOpacity key={m} style={[s.chip, editForm.paymentMethod===m && s.chipActive]} onPress={() => setEditForm(p=>({...p,paymentMethod:m}))}>
                    <Text style={[s.chipText, editForm.paymentMethod===m && s.chipActiveText]}>{m.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={{ flexDirection:'row', gap:spacing[2], marginTop:spacing[3] }}>
              <Btn label={editLoading ? '⏳ Saving...' : 'Save'} onPress={saveEdit} variant="success" style={{ flex:1 }} loading={editLoading} />
              <Btn label="Cancel" onPress={() => setEditingTx(null)} variant="secondary" style={{ flex:1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  periodTabs:       { flexDirection:'row', gap:spacing[2], marginBottom:spacing[3] },
  periodTab:        { flex:1, paddingVertical:spacing[3], backgroundColor:colors.surface, borderRadius:8, alignItems:'center', borderWidth:1, borderColor:colors.border },
  periodTabActive:  { backgroundColor:colors.primary, borderColor:colors.primary },
  periodTabText:    { fontWeight:'700', color:colors.text },
  periodTabTextActive: { color:'#fff' },
  cardGrid:         { gap:spacing[3], marginBottom:spacing[3] },
  sumCard:          { backgroundColor:colors.surface, borderRadius:8, padding:spacing[3], borderLeftWidth:4, borderWidth:1, borderColor:colors.border },
  sumLabel:         { fontSize:fontSize.xs, fontWeight:'700', color:colors.textMuted, letterSpacing:0.5 },
  sumVal:           { fontSize:22, fontWeight:'800', marginTop:4 },
  label:            { fontSize:fontSize.xs, fontWeight:'600', color:colors.text, marginBottom:4, marginTop:8 },
  input:            { backgroundColor:colors.surface, borderWidth:1, borderColor:colors.border, borderRadius:6, paddingHorizontal:spacing[3], paddingVertical:spacing[2], fontSize:fontSize.sm, color:colors.text },
  typeBtn:          { flex:1, padding:10, borderRadius:6, borderWidth:1, borderColor:colors.border, alignItems:'center' },
  typeBtnIncome:    { backgroundColor:'#16a34a', borderColor:'#16a34a' },
  typeBtnExpense:   { backgroundColor:'#dc2626', borderColor:'#dc2626' },
  chip:             { paddingHorizontal:10, paddingVertical:5, borderRadius:16, borderWidth:1, borderColor:colors.border, backgroundColor:colors.surface },
  chipActive:       { backgroundColor:colors.primary, borderColor:colors.primary },
  chipText:         { fontSize:fontSize.xs, fontWeight:'700', color:colors.text },
  chipActiveText:   { color:'#fff' },
  txRow:            { flexDirection:'row', paddingVertical:spacing[3], borderBottomWidth:1, borderBottomColor:colors.border, gap:8 },
  txTitle:          { fontWeight:'700', color:colors.text, fontSize:fontSize.base },
  txSub:            { fontSize:fontSize.xs, color:colors.textMuted, marginTop:2 },
  modalOverlay:     { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' },
  modalSheet:       { backgroundColor:colors.surface, borderTopLeftRadius:20, borderTopRightRadius:20, padding:spacing[4], maxHeight:'85%' },
  modalTitle:       { fontSize:fontSize.lg, fontWeight:'700', color:colors.text, marginBottom:spacing[3] },
});

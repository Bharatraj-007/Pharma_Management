import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFinance } from '../../shared/hooks/useFinance';
import { WebCard, WebBadge, WebBtn, WebInput, WebModal } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function FinanceScreen({ apiBaseUrl, session }) {
  const token = session?.token;
  const userRole = (session?.role || 'worker').toLowerCase();
  const userCompany = session?.company || 'bharath';
  const activeCompanyOverride = session?.activeCompany;

  const {
    period,
    setPeriod,
    summary,
    transactions,
    loading,
    error,
    success,
    effectiveCompany,
    addTransaction,
    deleteTransaction,
  } = useFinance(apiBaseUrl, token, userCompany, userRole, activeCompanyOverride);

  // Form State
  const [type, setType] = useState('income');
  const [category, setCategory] = useState('Dispatch Sale');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleRecordSubmit = async () => {
    if (!amount || Number(amount) <= 0) return alert('Please enter a valid amount');
    await addTransaction({
      type,
      category,
      amount: Number(amount),
      description,
      date,
      paymentMethod,
    });
    setAmount(''); setDescription('');
  };

  const handleExportPdf = () => {
    window.open(`${apiBaseUrl}/api/transactions/report/export?company=${effectiveCompany}&format=pdf&token=${token}`, '_blank');
  };

  const handleExportExcel = () => {
    window.open(`${apiBaseUrl}/api/transactions/report/export?company=${effectiveCompany}&format=excel&token=${token}`, '_blank');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💵 Finance & Profit/Loss Dashboard</Text>
        <Text style={styles.headerSubtitle}>Track day-wise and month-wise Income vs Expense, Net Profit, and P&L Statements.</Text>
      </View>

      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      {success ? <View style={styles.successBox}><Text style={styles.successText}>{success}</Text></View> : null}

      {/* Financial Summary Cards */}
      <View style={styles.summaryGrid}>
        <WebCard style={[styles.sumCard, { borderLeftColor: webColors.primary }]}>
          <Text style={styles.sumLabel}>PERIOD</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            <TouchableOpacity style={[styles.chip, period === 'day' && styles.chipActive]} onPress={() => setPeriod('day')}>
              <Text style={[styles.chipText, period === 'day' && styles.chipActiveText]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, period === 'month' && styles.chipActive]} onPress={() => setPeriod('month')}>
              <Text style={[styles.chipText, period === 'month' && styles.chipActiveText]}>This Month</Text>
            </TouchableOpacity>
          </View>
        </WebCard>

        <WebCard style={[styles.sumCard, { borderLeftColor: webColors.success }]}>
          <Text style={styles.sumLabel}>TOTAL INCOME</Text>
          <Text style={[styles.sumVal, { color: webColors.successDark }]}>₹{summary?.totalIncome || 0}</Text>
        </WebCard>

        <WebCard style={[styles.sumCard, { borderLeftColor: webColors.danger }]}>
          <Text style={styles.sumLabel}>TOTAL EXPENSES</Text>
          <Text style={[styles.sumVal, { color: webColors.dangerDark }]}>₹{summary?.totalExpense || 0}</Text>
        </WebCard>

        <WebCard style={[styles.sumCard, { borderLeftColor: (summary?.netProfit || 0) >= 0 ? webColors.primary : webColors.danger }]}>
          <Text style={styles.sumLabel}>NET PROFIT / LOSS</Text>
          <Text style={[styles.sumVal, { color: (summary?.netProfit || 0) >= 0 ? webColors.primaryDark : webColors.dangerDark }]}>
            ₹{summary?.netProfit || 0}
          </Text>
        </WebCard>
      </View>

      {/* Export Buttons */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        <WebBtn label="📊 Download Excel P&L" onPress={handleExportExcel} variant="success" />
        <WebBtn label="📄 Download PDF P&L" onPress={handleExportPdf} variant="secondary" />
      </View>

      <View style={styles.mainLayout}>
        {/* Record Transaction Form */}
        <WebCard title="➕ Record New Transaction" style={styles.formCard}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TouchableOpacity style={[styles.typeBtn, type === 'income' && styles.typeBtnIncome]} onPress={() => { setType('income'); setCategory('Dispatch Sale'); }}>
              <Text style={{ fontWeight: '700', color: type === 'income' ? '#fff' : webColors.text }}>🟢 Income</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.typeBtn, type === 'expense' && styles.typeBtnExpense]} onPress={() => { setType('expense'); setCategory('Raw Material'); }}>
              <Text style={{ fontWeight: '700', color: type === 'expense' ? '#fff' : webColors.text }}>🔴 Expense</Text>
            </TouchableOpacity>
          </View>

          <WebInput label="Category *" value={category} onChangeText={setCategory} placeholder="Category" />
          <WebInput label="Amount (INR) *" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="e.g. 15000" />
          <WebInput label="Payment Method" value={paymentMethod} onChangeText={setPaymentMethod} placeholder="online / cash / bank_transfer" />
          <WebInput label="Date *" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          <WebInput label="Description / Remarks" value={description} onChangeText={setDescription} placeholder="Notes..." />

          <WebBtn label={loading ? '⏳ Saving...' : '💾 Save Transaction'} onPress={handleRecordSubmit} variant="success" size="lg" style={{ marginTop: 12 }} />
        </WebCard>

        {/* Transactions Table */}
        <WebCard title={`Recent Transactions (${transactions.length})`} style={styles.tableCard}>
          {loading ? (
            <Text style={{ color: webColors.textMuted }}>⏳ Loading transactions...</Text>
          ) : transactions.length === 0 ? (
            <Text style={{ color: webColors.textMuted }}>No transaction records found.</Text>
          ) : (
            transactions.map((t) => (
              <View key={t._id} style={styles.tableRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{t.category} — {t.type?.toUpperCase()}</Text>
                  <Text style={styles.rowSub}>Date: {new Date(t.date).toLocaleDateString()} · Method: {(t.paymentMethod || 'online').toUpperCase()}</Text>
                  {t.description ? <Text style={[styles.rowSub, { fontStyle: 'italic' }]}>{t.description}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ fontWeight: '800', fontSize: webFontSize.base, color: t.type === 'income' ? webColors.successDark : webColors.dangerDark }}>
                    {t.type === 'income' ? '+' : '-'}₹{t.amount}
                  </Text>
                  <WebBtn label="🗑️" size="sm" variant="danger" onPress={() => deleteTransaction(t._id)} />
                </View>
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
  summaryGrid: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  sumCard: { flex: 1, minWidth: 220, borderLeftWidth: 4 },
  sumLabel: { fontSize: webFontSize.xs, fontWeight: '800', color: webColors.textMuted, letterSpacing: 0.5 },
  sumVal: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: webColors.border, backgroundColor: webColors.surfaceAlt },
  chipActive: { backgroundColor: webColors.primary, borderColor: webColors.primary },
  chipText: { fontSize: 11, fontWeight: '700', color: webColors.text },
  chipActiveText: { color: '#ffffff' },
  mainLayout: { flexDirection: 'row', gap: 24, flexWrap: 'wrap' },
  formCard: { width: 360 },
  tableCard: { flex: 1, minWidth: 400 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: webColors.border, alignItems: 'center' },
  typeBtnIncome: { backgroundColor: webColors.success, borderColor: webColors.success },
  typeBtnExpense: { backgroundColor: webColors.danger, borderColor: webColors.danger },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: webColors.border },
  rowTitle: { fontWeight: '700', fontSize: webFontSize.base, color: webColors.text },
  rowSub: { fontSize: webFontSize.xs, color: webColors.textMuted, marginTop: 2 },
  errorBox: { padding: 12, borderRadius: 8, backgroundColor: webColors.dangerLight, marginBottom: 12 },
  errorText: { color: webColors.dangerDark, fontWeight: '700' },
  successBox: { padding: 12, borderRadius: 8, backgroundColor: webColors.successLight, marginBottom: 12 },
  successText: { color: webColors.successDark, fontWeight: '700' },
});

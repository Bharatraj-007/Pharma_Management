import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebCard, WebBtn, WebInput } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function ReportsScreen({ apiBaseUrl, session }) {
  const token = session?.token;
  const company = session?.company || 'bharath';
  const activeCompany = session?.activeCompany || company;

  const today = new Date().toISOString().split('T')[0];
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const downloadReport = (module, format) => {
    window.open(`${apiBaseUrl}/api/${module}/export/${format}?company=${activeCompany}&from=${from}&to=${to}&token=${token}`, '_blank');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📄 Consolidated Reports & Exports</Text>
        <Text style={styles.headerSubtitle}>Export PDF and Excel reports for Dispatch, Inventory, Attendance, and Finance.</Text>
      </View>

      <WebCard title="🗓️ Select Date Range">
        <View style={styles.filterRow}>
          <WebInput label="From Date" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
          <WebInput label="To Date" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
        </View>
      </WebCard>

      <View style={styles.reportGrid}>
        <WebCard title="🚚 Dispatch Reports">
          <Text style={styles.cardSub}>Daily bill-style delivery and dispatch summary</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <WebBtn label="📊 Excel" onPress={() => downloadReport('dispatch', 'excel')} variant="success" />
            <WebBtn label="📄 PDF" onPress={() => downloadReport('dispatch', 'pdf')} variant="secondary" />
          </View>
        </WebCard>

        <WebCard title="⏱️ Attendance Reports">
          <Text style={styles.cardSub}>Employee check-in/out hours & attendance ledger</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <WebBtn label="📊 Excel" onPress={() => downloadReport('attendance', 'excel')} variant="success" />
            <WebBtn label="📄 PDF" onPress={() => downloadReport('attendance', 'pdf')} variant="secondary" />
          </View>
        </WebCard>

        <WebCard title="💵 Finance & P&L Reports">
          <Text style={styles.cardSub}>Income vs Expense ledger and profit statements</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <WebBtn label="📊 Excel" onPress={() => downloadReport('transactions', 'excel')} variant="success" />
            <WebBtn label="📄 PDF" onPress={() => downloadReport('transactions', 'pdf')} variant="secondary" />
          </View>
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
  filterRow: { flexDirection: 'row', gap: 16 },
  reportGrid: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', marginTop: 16 },
  cardSub: { fontSize: webFontSize.xs, color: webColors.textMuted, marginTop: 4 },
});

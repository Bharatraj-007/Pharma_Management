import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebCard, WebBadge, WebInput } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function AuditLogsScreen({ apiBaseUrl, session }) {
  const token = session?.token;
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/audit-logs`, { headers: { Authorization: token } });
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data || []);
      }
    } catch (e) {}
  }, [apiBaseUrl, token]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter(l => [l.action, l.userName, l.itemType, l.details].join(' ').toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔍 System Audit Logs</Text>
        <Text style={styles.headerSubtitle}>Real-time activity audit logging across all company modules.</Text>
      </View>

      <WebCard title={`Activity Audit Trail (${filtered.length})`}>
        <WebInput placeholder="🔍 Search action, user, item..." value={search} onChangeText={setSearch} style={{ marginBottom: 16 }} />
        {filtered.map((log) => (
          <View key={log._id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{log.action} — {log.itemType}</Text>
              <Text style={styles.rowSub}>User: {log.userName || 'System'} ({log.userRole || 'system'}) · Details: {log.details || '—'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11, color: webColors.textMuted }}>{new Date(log.timestamp || log.createdAt).toLocaleString()}</Text>
              <WebBadge variant="neutral" label={(log.company || 'system').toUpperCase()} />
            </View>
          </View>
        ))}
      </WebCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: webSpacing.lg },
  header: { marginBottom: webSpacing.md },
  headerTitle: { fontSize: webFontSize.title, fontWeight: '800', color: webColors.text },
  headerSubtitle: { fontSize: webFontSize.base, color: webColors.textMuted, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: webColors.border },
  rowTitle: { fontWeight: '700', fontSize: webFontSize.base, color: webColors.text },
  rowSub: { fontSize: webFontSize.xs, color: webColors.textMuted, marginTop: 2 },
});

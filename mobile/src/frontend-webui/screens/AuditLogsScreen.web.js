import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebCard } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function AuditLogsScreen({ apiBaseUrl, session }) {
  const token = session?.token;
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/audit-logs`, {
        headers: { Authorization: token },
      });
      if (res.ok) setLogs(await res.json());
    } catch (e) {}
    finally { setLoading(false); }
  }, [apiBaseUrl, token]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔍 System Audit Logs</Text>
        <Text style={styles.headerSubtitle}>Immutable audit trail of all system actions and modifications.</Text>
      </View>

      <WebCard title={`Audit Trail (${logs.length})`}>
        {loading ? (
          <Text style={{ color: webColors.textMuted }}>⏳ Loading audit logs...</Text>
        ) : logs.length === 0 ? (
          <Text style={{ color: webColors.textMuted }}>No audit logs recorded yet.</Text>
        ) : (
          logs.map(log => (
            <View key={log._id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{log.action}</Text>
                <Text style={styles.rowSub}>By: {log.user?.name || 'System'} · IP: {log.ipAddress || '127.0.0.1'} · Time: {new Date(log.createdAt).toLocaleString()}</Text>
              </View>
            </View>
          ))
        )}
      </WebCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: webSpacing.lg },
  header: { marginBottom: webSpacing.md },
  headerTitle: { fontSize: webFontSize.title, fontWeight: '800', color: webColors.text },
  headerSubtitle: { fontSize: webFontSize.base, color: webColors.textMuted, marginTop: 4 },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: webColors.border },
  rowTitle: { fontWeight: '700', fontSize: webFontSize.base, color: webColors.text },
  rowSub: { fontSize: webFontSize.xs, color: webColors.textMuted, marginTop: 2 },
});

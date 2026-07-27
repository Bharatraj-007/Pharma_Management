import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AuthContext } from '../navigation/AuthContext';
import API_BASE_URL from '../config';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  Card, CardHeader, CardTitle, Badge, AlertBanner,
  Btn, Spinner, EmptyState,
} from '../components/ui';
import { colors, spacing, fontSize, pageStyles } from '../styles/theme';

function actionVariant(action) {
  switch (action) {
    case 'create':   return 'success';
    case 'delete':   return 'danger';
    case 'edit':     return 'warning';
    case 'complete': return 'primary';
    case 'start':    return 'primary';
    default:         return 'neutral';
  }
}

export default function AuditLogsScreen() {
  const { session } = useContext(AuthContext);
  const token       = session?.token;

  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchLogs = async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${API_BASE_URL}/audit-logs`, { headers: { Authorization: token } });
      if (!res.ok) { const t = await res.text().catch(()=>''); throw new Error(t || 'Unable to load audit logs'); }
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <ScreenWrapper refreshing={loading} onRefresh={fetchLogs}>
      <View style={pageStyles.header}>
        <Text style={pageStyles.title}>🔍 Audit Logs</Text>
        <Text style={pageStyles.subtitle}>
          Worker start and completion events for admin, manager, and CEO.
        </Text>
      </View>

      <AlertBanner type="danger" message={error} />

      <Card>
        <CardHeader>
          <CardTitle style={{ marginBottom:0 }}>Activity Log ({logs.length})</CardTitle>
          <Btn label="Refresh" onPress={fetchLogs} variant="primary" size="sm" />
        </CardHeader>

        {loading ? <Spinner /> : logs.length === 0 ? (
          <EmptyState message="No audit logs found." />
        ) : (
          logs.map((log) => (
            <View key={log._id} style={s.logRow}>
              <View style={{ flex:1 }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:spacing[2], flexWrap:'wrap' }}>
                  <Badge variant={actionVariant(log.action)} label={log.action} />
                  <Text style={s.logType}>{log.itemType}</Text>
                </View>
                <Text style={s.logBy}>
                  {log.changedBy || '—'}
                  {log.changedByRole ? ` · ${log.changedByRole.toUpperCase()}` : ''}
                </Text>
                {(log.after?.status || log.after?.company) && (
                  <Text style={s.logDetail}>
                    {log.after.status ? `Status: ${log.after.status}` : `Company: ${log.after.company}`}
                  </Text>
                )}
                <Text style={s.logDate}>
                  {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                </Text>
              </View>
            </View>
          ))
        )}
      </Card>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  logRow:    { paddingVertical:spacing[3], borderBottomWidth:1, borderBottomColor:colors.border },
  logType:   { fontSize:fontSize.sm, color:colors.text, fontWeight:'600' },
  logBy:     { fontSize:fontSize.sm, color:colors.textMuted, marginTop:2 },
  logDetail: { fontSize:fontSize.xs, color:colors.primary, marginTop:2 },
  logDate:   { fontSize:fontSize.xs, color:colors.textLight, marginTop:2 },
});

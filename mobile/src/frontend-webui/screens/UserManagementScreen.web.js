import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebCard, WebBadge, WebBtn, WebInput } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function UserManagementScreen({ apiBaseUrl, session }) {
  const token = session?.token;
  const company = session?.company || 'bharath';
  const activeCompany = session?.activeCompany || company;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/users?company=${activeCompany}`, {
        headers: { Authorization: token },
      });
      if (res.ok) setUsers(await res.json());
    } catch (e) {}
    finally { setLoading(false); }
  }, [apiBaseUrl, token, activeCompany]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleApprove = async (userId) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/users/${userId}/approve`, {
        method: 'PUT',
        headers: { Authorization: token },
      });
      if (res.ok) fetchUsers();
    } catch (e) {}
  };

  const handleReject = async (userId) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/users/${userId}/reject`, {
        method: 'PUT',
        headers: { Authorization: token },
      });
      if (res.ok) fetchUsers();
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👥 User Management & Approvals</Text>
        <Text style={styles.headerSubtitle}>Approve signup requests and manage company team roles.</Text>
      </View>

      <WebCard title={`Users & Requests (${users.length})`}>
        {loading ? (
          <Text style={{ color: webColors.textMuted }}>⏳ Loading users...</Text>
        ) : users.length === 0 ? (
          <Text style={{ color: webColors.textMuted }}>No user records found.</Text>
        ) : (
          users.map(u => (
            <View key={u._id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{u.name} ({u.email})</Text>
                <Text style={styles.rowSub}>Role: {(u.role || 'worker').toUpperCase()} · Company: {u.company}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <WebBadge variant={u.isApproved ? 'success' : 'warning'} label={u.isApproved ? 'Approved' : 'Pending Approval'} />
                {!u.isApproved && (
                  <>
                    <WebBtn label="✅ Approve" size="sm" variant="success" onPress={() => handleApprove(u._id)} />
                    <WebBtn label="❌ Reject" size="sm" variant="danger" onPress={() => handleReject(u._id)} />
                  </>
                )}
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: webColors.border },
  rowTitle: { fontWeight: '700', fontSize: webFontSize.base, color: webColors.text },
  rowSub: { fontSize: webFontSize.xs, color: webColors.textMuted, marginTop: 2 },
});

import React, { useEffect, useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { AuthContext } from '../navigation/AuthContext';
import API_BASE_URL from '../config';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  Card, CardHeader, CardTitle, Badge, AlertBanner,
  Btn, Input, Spinner, EmptyState,
} from '../components/ui';
import { colors, spacing, fontSize, pageStyles, roleBadgeVariant } from '../styles/theme';

export default function UserManagementScreen() {
  const { session } = useContext(AuthContext);
  const token       = session?.token;

  const [staff,    setStaff]    = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [search,   setSearch]   = useState('');
  const [tab,      setTab]      = useState('staff'); // 'staff' | 'requests'

  const headers = { 'Content-Type': 'application/json', Authorization: token };

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [sr, rr] = await Promise.all([
        fetch(`${API_BASE_URL}/staff`,    { headers: { Authorization: token } }),
        fetch(`${API_BASE_URL}/requests`, { headers: { Authorization: token } }),
      ]);
      if (sr.ok) setStaff(await sr.json());
      if (rr.ok) setRequests(await rr.json());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const approveRequest = async (id) => {
    setError(''); setSuccess('');
    try {
      const res  = await fetch(`${API_BASE_URL}/approve`, {
        method: 'POST', headers, body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess('User approved ✅');
      fetchData();
    } catch (err) { setError(err.message); }
  };

  const rejectRequest = async (id) => {
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/reject`, {
        method: 'POST', headers, body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess('Request rejected.');
      fetchData();
    } catch (err) { setError(err.message); }
  };

  const filteredStaff = staff.filter((s) =>
    [s.name, s.email, s.role].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScreenWrapper refreshing={loading} onRefresh={fetchData}>
      <View style={pageStyles.header}>
        <Text style={pageStyles.title}>👥 User Management</Text>
        <Text style={pageStyles.subtitle}>Manage users, roles, and signup approvals.</Text>
      </View>

      <AlertBanner type="danger"  message={error}   />
      <AlertBanner type="success" message={success} />

      {/* Tab selector */}
      <View style={s.tabBar}>
        {[
          { key:'staff',    label:`👥 Staff (${staff.length})` },
          { key:'requests', label:`📩 Requests (${requests.length})` },
        ].map((t) => (
          <View
            key={t.key}
            style={[s.tab, tab === t.key && s.tabActive]}
            onStartShouldSetResponder={() => true}
            onResponderRelease={() => setTab(t.key)}
          >
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </View>
        ))}
      </View>

      {/* ── STAFF TAB ── */}
      {tab === 'staff' && (
        <Card>
          <Input placeholder="🔍 Search name, email, role…" value={search} onChangeText={setSearch} style={{ marginBottom: spacing[3] }} />
          <CardHeader>
            <CardTitle style={{ marginBottom:0 }}>Team Members</CardTitle>
            <Btn label="Refresh" onPress={fetchData} variant="primary" size="sm" />
          </CardHeader>

          {loading ? <Spinner /> : filteredStaff.length === 0 ? (
            <EmptyState message="No staff found." />
          ) : (
            filteredStaff.map((st) => (
              <View key={st._id} style={s.userRow}>
                <View style={{ flex:1 }}>
                  <Text style={s.userName}>{st.name}</Text>
                  <Text style={s.userEmail}>{st.email}</Text>
                  {st.employeeNo && <Text style={s.userEmail}>Emp No: {st.employeeNo}</Text>}
                </View>
                <Badge variant={roleBadgeVariant(st.role)} label={st.role?.toUpperCase()} />
              </View>
            ))
          )}
        </Card>
      )}

      {/* ── REQUESTS TAB ── */}
      {tab === 'requests' && (
        <Card>
          <CardHeader>
            <CardTitle style={{ marginBottom:0 }}>Pending Signups</CardTitle>
            <Btn label="Refresh" onPress={fetchData} variant="primary" size="sm" />
          </CardHeader>

          {loading ? <Spinner /> : requests.length === 0 ? (
            <EmptyState message="No pending signup requests." />
          ) : (
            requests.map((req) => (
              <View key={req._id} style={s.userRow}>
                <View style={{ flex:1 }}>
                  <Text style={s.userName}>{req.firstName} {req.lastName}</Text>
                  <Text style={s.userEmail}>{req.email}</Text>
                  <Badge variant="warning" label={req.role?.toUpperCase()} style={{ marginTop: spacing[1] }} />
                </View>
                <View style={{ gap: spacing[2] }}>
                  <Btn label="✅ Approve" size="sm" variant="success" onPress={() => approveRequest(req._id)} />
                  <Btn label="✗ Reject"  size="sm" variant="danger"  onPress={() => rejectRequest(req._id)} />
                </View>
              </View>
            ))
          )}
        </Card>
      )}
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  tabBar:       { flexDirection:'row', backgroundColor:colors.surface, borderRadius:10, padding:4, marginBottom:spacing[4], borderWidth:1, borderColor:colors.border },
  tab:          { flex:1, paddingVertical:spacing[2], alignItems:'center', borderRadius:8 },
  tabActive:    { backgroundColor:colors.primary },
  tabText:      { fontSize:fontSize.sm, fontWeight:'600', color:colors.textMuted },
  tabTextActive:{ color:'#fff' },
  userRow:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:spacing[3], borderBottomWidth:1, borderBottomColor:colors.border, gap:spacing[3] },
  userName:     { fontWeight:'700', color:colors.text, fontSize:fontSize.base },
  userEmail:    { fontSize:fontSize.sm, color:colors.textMuted },
});

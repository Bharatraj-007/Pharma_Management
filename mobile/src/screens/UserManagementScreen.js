import React, { useEffect, useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, Alert, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { AuthContext } from '../navigation/AuthContext';
import API_BASE_URL from '../config';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  Card, CardHeader, CardTitle, Badge, AlertBanner,
  Btn, Input, Spinner, EmptyState,
} from '../components/ui';
import { colors, spacing, fontSize, pageStyles, roleBadgeVariant } from '../styles/theme';

const ROLES        = ['worker', 'manager', 'admin', 'ceo'];
const COMPANIES    = ['bharath', 'shree_ganaapathy', 'vel'];
const EMP_TYPES    = ['Full-time', 'Part-time', 'Contract'];

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

  // Edit modal state
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name:'', role:'worker', assignedCompany:'bharath',
    phone:'', department:'', salaryRate:'0', salaryType:'daily', employmentType:'Full-time',
  });
  const [editLoading, setEditLoading] = useState(false);

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

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const approveRequest = async (id) => {
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/approve`, {
        method:'POST', headers, body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      flash('User approved ✅'); fetchData();
    } catch (err) { setError(err.message); }
  };

  const rejectRequest = async (id) => {
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/reject`, {
        method:'POST', headers, body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      flash('Request rejected.'); fetchData();
    } catch (err) { setError(err.message); }
  };

  // ── Open Edit Modal ────────────────────────────────────────────────────────
  const openEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      name:           user.name || '',
      role:           user.role || 'worker',
      assignedCompany:user.assignedCompany || 'bharath',
      phone:          user.phone || '',
      department:     user.department || '',
      salaryRate:     String(user.salaryRate || 0),
      salaryType:     user.salaryType || 'daily',
      employmentType: user.employmentType || 'Full-time',
    });
  };

  // ── Save Edit ──────────────────────────────────────────────────────────────
  const saveEdit = async () => {
    if (!editingUser) return;
    setEditLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/staff/${editingUser._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name:           editForm.name,
          role:           editForm.role,
          assignedCompany:editForm.assignedCompany,
          phone:          editForm.phone,
          department:     editForm.department,
          salaryRate:     Number(editForm.salaryRate),
          salaryType:     editForm.salaryType,
          employmentType: editForm.employmentType,
        }),
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.error || 'Update failed');
      flash('User updated ✅');
      setEditingUser(null);
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // ── Delete User ────────────────────────────────────────────────────────────
  const deleteUser = (user) => {
    Alert.alert(
      'Delete User?',
      `Remove ${user.name} permanently? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/staff/${user._id}`, {
              method: 'DELETE', headers: { Authorization: token },
            });
            if (!res.ok) throw new Error('Delete failed');
            flash('User deleted.'); fetchData();
          } catch (err) { Alert.alert('Error', err.message); }
        }},
      ]
    );
  };

  const ef = (k) => (v) => setEditForm(p => ({ ...p, [k]: v }));

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
          <TouchableOpacity
            key={t.key}
            style={[s.tab, tab === t.key && s.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
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
                  {st.phone && <Text style={s.userEmail}>📞 {st.phone}</Text>}
                </View>
                <View style={{ alignItems:'flex-end', gap:6 }}>
                  <Badge variant={roleBadgeVariant(st.role)} label={st.role?.toUpperCase()} />
                  <View style={{ flexDirection:'row', gap:4 }}>
                    <Btn label="✏️" size="sm" variant="warning" onPress={() => openEdit(st)} />
                    <Btn label="🗑️" size="sm" variant="danger" onPress={() => deleteUser(st)} />
                  </View>
                </View>
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

      {/* ── Edit User Modal ── */}
      <Modal visible={!!editingUser} animationType="slide" transparent onRequestClose={() => setEditingUser(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>✏️ Edit User — {editingUser?.name}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: '80%' }}>
              <Input label="Full Name *" value={editForm.name} onChangeText={ef('name')} placeholder="Full Name" />
              <Input label="Phone" value={editForm.phone} onChangeText={ef('phone')} placeholder="+91 9876543210" keyboardType="phone-pad" />
              <Input label="Department" value={editForm.department} onChangeText={ef('department')} placeholder="e.g. Production" />

              <Text style={s.label}>Role *</Text>
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:spacing[3] }}>
                {ROLES.map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[s.chip, editForm.role === r && s.chipActive]}
                    onPress={() => ef('role')(r)}
                  >
                    <Text style={[s.chipText, editForm.role === r && s.chipActiveText]}>{r.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Assigned Company *</Text>
              <View style={{ flexDirection:'row', gap:6, marginBottom:spacing[3] }}>
                {COMPANIES.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[s.chip, editForm.assignedCompany === c && s.chipActive, { flex:1 }]}
                    onPress={() => ef('assignedCompany')(c)}
                  >
                    <Text style={[s.chipText, editForm.assignedCompany === c && s.chipActiveText]}>{c.split('_')[0].toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Salary Type</Text>
              <View style={{ flexDirection:'row', gap:6, marginBottom:8 }}>
                {['daily','hourly'].map(t => (
                  <TouchableOpacity key={t} style={[s.chip, editForm.salaryType === t && s.chipActive]} onPress={() => ef('salaryType')(t)}>
                    <Text style={[s.chipText, editForm.salaryType === t && s.chipActiveText]}>{t === 'daily' ? 'Per Day' : 'Per Hour'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Input label="Salary Rate (₹)" value={editForm.salaryRate} onChangeText={ef('salaryRate')} keyboardType="numeric" />

              <Text style={s.label}>Employment Type</Text>
              <View style={{ flexDirection:'row', gap:6, marginBottom:spacing[3], flexWrap:'wrap' }}>
                {EMP_TYPES.map(t => (
                  <TouchableOpacity key={t} style={[s.chip, editForm.employmentType === t && s.chipActive]} onPress={() => ef('employmentType')(t)}>
                    <Text style={[s.chipText, editForm.employmentType === t && s.chipActiveText]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={{ flexDirection:'row', gap:spacing[2], marginTop:spacing[3] }}>
              <Btn label={editLoading ? '⏳ Saving...' : 'Save Changes'} onPress={saveEdit} variant="success" style={{ flex:1 }} loading={editLoading} />
              <Btn label="Cancel" onPress={() => setEditingUser(null)} variant="secondary" style={{ flex:1 }} />
            </View>
          </View>
        </View>
      </Modal>
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
  label:        { fontSize:fontSize.xs, fontWeight:'600', color:colors.text, marginBottom:4, marginTop:8 },
  chip:         { paddingHorizontal:10, paddingVertical:5, borderRadius:16, borderWidth:1, borderColor:colors.border, backgroundColor:colors.surface },
  chipActive:   { backgroundColor:colors.primary, borderColor:colors.primary },
  chipText:     { fontSize:fontSize.xs, fontWeight:'700', color:colors.text },
  chipActiveText:{ color:'#fff' },
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' },
  modalSheet:   { backgroundColor:colors.surface, borderTopLeftRadius:20, borderTopRightRadius:20, padding:spacing[4], paddingBottom: spacing[6] },
  modalTitle:   { fontSize:fontSize.lg, fontWeight:'700', color:colors.text, marginBottom:spacing[3] },
});

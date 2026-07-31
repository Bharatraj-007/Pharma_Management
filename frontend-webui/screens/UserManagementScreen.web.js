import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WebCard, WebBadge, WebBtn, WebInput, WebModal } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function UserManagementScreen({ apiBaseUrl, session }) {
  const token = session?.token;

  const [staff, setStaff] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('staff');
  const [search, setSearch] = useState('');

  // Edit Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'worker', assignedCompany: 'bharath', phone: '', salaryRate: '0', salaryType: 'daily' });

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [sr, rr] = await Promise.all([
        fetch(`${apiBaseUrl}/staff`, { headers: { Authorization: token } }),
        fetch(`${apiBaseUrl}/requests`, { headers: { Authorization: token } }),
      ]);
      if (sr.ok) setStaff(await sr.json());
      if (rr.ok) setRequests(await rr.json());
    } catch (e) {}
    finally { setLoading(false); }
  }, [apiBaseUrl, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`${apiBaseUrl}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ id }),
      });
      if (res.ok) { alert('User approved!'); fetchData(); }
    } catch (e) {}
  };

  const handleReject = async (id) => {
    try {
      const res = await fetch(`${apiBaseUrl}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ id }),
      });
      if (res.ok) { alert('Request rejected!'); fetchData(); }
    } catch (e) {}
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    try {
      const res = await fetch(`${apiBaseUrl}/staff/${editingUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({
          ...editForm,
          salaryRate: Number(editForm.salaryRate || 0),
        }),
      });
      if (res.ok) {
        alert('User updated!');
        setEditingUser(null);
        fetchData();
      }
    } catch (e) {}
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.name}?`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/staff/${user._id}`, {
        method: 'DELETE',
        headers: { Authorization: token },
      });
      if (res.ok) fetchData();
    } catch (e) {}
  };

  const filteredStaff = staff.filter(s => [s.name, s.email, s.role].join(' ').toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👥 User Management</Text>
        <Text style={styles.headerSubtitle}>Manage staff accounts, user permissions, signup approvals, and pay rates.</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'staff' && styles.tabBtnActive]} onPress={() => setTab('staff')}>
          <Text style={[styles.tabText, tab === 'staff' && styles.tabTextActive]}>👥 Staff ({staff.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'requests' && styles.tabBtnActive]} onPress={() => setTab('requests')}>
          <Text style={[styles.tabText, tab === 'requests' && styles.tabTextActive]}>📩 Signup Requests ({requests.length})</Text>
        </TouchableOpacity>
      </View>

      {tab === 'staff' && (
        <WebCard title={`Staff Members (${filteredStaff.length})`}>
          <WebInput placeholder="🔍 Search name, email, role..." value={search} onChangeText={setSearch} style={{ marginBottom: 16 }} />
          {filteredStaff.map((st) => (
            <View key={st._id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{st.name}</Text>
                <Text style={styles.rowSub}>{st.email} · {st.phone || 'No phone'} · Company: {st.assignedCompany || st.company}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <WebBadge variant={st.role === 'ceo' ? 'danger' : st.role === 'admin' ? 'primary' : st.role === 'manager' ? 'warning' : 'success'} label={st.role?.toUpperCase()} />
                <WebBtn label="✏️ Edit" size="sm" variant="warning" onPress={() => { setEditingUser(st); setEditForm({ name: st.name, role: st.role, assignedCompany: st.assignedCompany || 'bharath', phone: st.phone || '', salaryRate: String(st.salaryRate || 0), salaryType: st.salaryType || 'daily' }); }} />
                <WebBtn label="🗑️ Delete" size="sm" variant="danger" onPress={() => handleDeleteUser(st)} />
              </View>
            </View>
          ))}
        </WebCard>
      )}

      {tab === 'requests' && (
        <WebCard title={`Pending Signup Requests (${requests.length})`}>
          {requests.map((req) => (
            <View key={req._id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{req.firstName} {req.lastName}</Text>
                <Text style={styles.rowSub}>{req.email} · Role: {req.role?.toUpperCase()}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <WebBtn label="✅ Approve" size="sm" variant="success" onPress={() => handleApprove(req._id)} />
                <WebBtn label="❌ Reject" size="sm" variant="danger" onPress={() => handleReject(req._id)} />
              </View>
            </View>
          ))}
        </WebCard>
      )}

      {/* Edit User Modal */}
      <WebModal visible={!!editingUser} title={`✏️ Edit User — ${editingUser?.name}`} onClose={() => setEditingUser(null)}>
        <WebInput label="Full Name" value={editForm.name} onChangeText={(v) => setEditForm(p => ({ ...p, name: v }))} />
        <WebInput label="Phone" value={editForm.phone} onChangeText={(v) => setEditForm(p => ({ ...p, phone: v }))} />
        <WebInput label="Role" value={editForm.role} onChangeText={(v) => setEditForm(p => ({ ...p, role: v }))} placeholder="worker/manager/admin/ceo" />
        <WebInput label="Assigned Company" value={editForm.assignedCompany} onChangeText={(v) => setEditForm(p => ({ ...p, assignedCompany: v }))} placeholder="bharath/shree_ganaapathy/vel" />
        <WebInput label="Salary Rate (₹)" value={editForm.salaryRate} onChangeText={(v) => setEditForm(p => ({ ...p, salaryRate: v }))} keyboardType="numeric" />
        <WebBtn label="Save User Changes" onPress={handleSaveEdit} variant="success" style={{ marginTop: 12 }} />
      </WebModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: webSpacing.lg },
  header: { marginBottom: webSpacing.md },
  headerTitle: { fontSize: webFontSize.title, fontWeight: '800', color: webColors.text },
  headerSubtitle: { fontSize: webFontSize.base, color: webColors.textMuted, marginTop: 4 },
  tabRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: webColors.surface, borderWidth: 1, borderColor: webColors.border },
  tabBtnActive: { backgroundColor: webColors.primary, borderColor: webColors.primary },
  tabText: { fontWeight: '700', color: webColors.text, fontSize: webFontSize.sm },
  tabTextActive: { color: '#ffffff' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: webColors.border },
  rowTitle: { fontWeight: '700', fontSize: webFontSize.base, color: webColors.text },
  rowSub: { fontSize: webFontSize.xs, color: webColors.textMuted, marginTop: 2 },
});

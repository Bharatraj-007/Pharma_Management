import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AuthContext } from '../../navigation/AuthContext';
import API_BASE_URL from '../../config';
import ScreenWrapper from '../../components/ScreenWrapper';
import { Card, CardHeader, CardTitle, Badge, AlertBanner, Spinner, StatCard } from '../../components/ui';
import { colors, spacing, fontSize, pageStyles } from '../../styles/theme';

export default function AdminDashboard() {
  const { session } = useContext(AuthContext);
  const token       = session?.token;
  const adminName   = session?.name   || 'Admin';
  const companyName = session?.companyName || 'Bharath Enterprises';

  const [data,    setData]    = useState({ staff: [], tasks: [], foils: [], cylinders: [], requests: [] });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const endpoints = ['staff', 'tasks', 'foils', 'cylinders', 'requests'];
      const responses = await Promise.all(
        endpoints.map((ep) => fetch(`${API_BASE_URL}/${ep}`, { headers: { Authorization: token } }))
      );
      const failed = responses.find((r) => !r.ok);
      if (failed) throw new Error('Unable to load dashboard information');
      const [staff, tasks, foils, cylinders, requests] = await Promise.all(responses.map((r) => r.json()));
      setData({
        staff:     Array.isArray(staff)     ? staff     : [],
        tasks:     Array.isArray(tasks)     ? tasks     : [],
        foils:     Array.isArray(foils)     ? foils     : [],
        cylinders: Array.isArray(cylinders) ? cylinders : [],
        requests:  Array.isArray(requests)  ? requests  : [],
      });
    } catch (err) {
      setError(err.message || 'Unable to load dashboard information');
    } finally {
      setLoading(false);
    }
  };

  const { staff, tasks, foils, cylinders, requests } = data;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const pendingTasks   = tasks.filter((t) => t.status !== 'completed').length;
  const totalInventory = foils.length + cylinders.length;

  const stats = [
    { label: 'Total Users',       value: staff.length,     note: 'Approved staff in this company' },
    { label: 'Total Tasks',       value: tasks.length,     note: `${completedTasks} done · ${pendingTasks} pending` },
    { label: 'Inventory Items',   value: totalInventory,   note: `${foils.length} foils · ${cylinders.length} cylinders` },
    { label: 'Pending Requests',  value: requests.length,  note: 'Verified signups awaiting approval' },
  ];

  if (loading) return <ScreenWrapper><Spinner /></ScreenWrapper>;

  return (
    <ScreenWrapper refreshing={loading} onRefresh={fetchData}>
      <View style={pageStyles.header}>
        <Text style={pageStyles.title}>Admin Dashboard</Text>
        <Text style={pageStyles.subtitle}>{companyName} control panel</Text>
      </View>

      <AlertBanner type="danger" message={error} />

      {/* Welcome card */}
      <Card>
        <CardHeader>
          <View>
            <CardTitle style={{ marginBottom: 0 }}>Welcome, {adminName}</CardTitle>
            <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4 }}>
              Live company data from the database.
            </Text>
          </View>
          <Badge variant="primary" label="ADMIN" />
        </CardHeader>
      </Card>

      {/* Stat grid */}
      <View style={s.grid}>
        {stats.map((st) => (
          <Card key={st.label} style={s.statCard}>
            <Text style={s.statValue}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
            <Text style={s.statNote}>{st.note}</Text>
          </Card>
        ))}
      </View>

      <Card>
        <CardTitle>Admin Information</CardTitle>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
          Use the sidebar to create tasks, manage inventory, approve users, and review audit logs.
          All counters above reflect live data from MongoDB Atlas.
        </Text>
      </Card>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginBottom: spacing[4] },
  statCard:  { flex: 1, minWidth: '45%', alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginTop: 2 },
  statNote:  { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', marginTop: 2 },
});

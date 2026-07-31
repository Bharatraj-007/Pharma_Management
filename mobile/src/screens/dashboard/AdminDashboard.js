import React, { useEffect, useState, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../navigation/AuthContext';
import API_BASE_URL from '../../config';
import ScreenWrapper from '../../components/ScreenWrapper';
import { Card, CardHeader, CardTitle, Badge, AlertBanner, Spinner, StatCard } from '../../components/ui';
import { colors, spacing, fontSize, pageStyles } from '../../styles/theme';

export default function AdminDashboard() {
  const { session } = useContext(AuthContext);
  const token       = session?.token;
  const adminName   = session?.name || 'Admin';
  const companyName = session?.companyName || 'Bharath Enterprises';
  const navigation  = useNavigation();

  const [data,    setData]    = useState({ staff: [], tasks: [], foils: [], cylinders: [], requests: [] });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchData = useCallback(async () => {
    setError('');
    try {
      // Use the real existing backend endpoints
      const [staffRes, tasksRes, foilsRes, cylRes, reqRes] = await Promise.all([
        fetch(`${API_BASE_URL}/staff`,    { headers: { Authorization: token } }),
        fetch(`${API_BASE_URL}/tasks`,    { headers: { Authorization: token } }),
        fetch(`${API_BASE_URL}/foils`,    { headers: { Authorization: token } }),
        fetch(`${API_BASE_URL}/cylinders`,{ headers: { Authorization: token } }),
        fetch(`${API_BASE_URL}/requests`, { headers: { Authorization: token } }),
      ]);

      // Some endpoints may return 403 for some roles — handle gracefully
      const parse = async (res) => {
        if (!res.ok) return [];
        const d = await res.json();
        return Array.isArray(d) ? d : [];
      };

      const [staff, tasks, foils, cylinders, requests] = await Promise.all([
        parse(staffRes), parse(tasksRes), parse(foilsRes),
        parse(cylRes),   parse(reqRes),
      ]);

      setData({ staff, tasks, foils, cylinders, requests });
    } catch (err) {
      setError('Unable to load dashboard information. Check your network connection.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const { staff, tasks, foils, cylinders, requests } = data;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const pendingTasks   = tasks.filter((t) => t.status !== 'completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in-progress').length;
  const totalInventory = foils.length + cylinders.length;

  const today = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter((t) => {
    const d = new Date(t.createdAt || t.updatedAt || Date.now()).toDateString();
    return d === new Date().toDateString();
  });

  const overviewStats = [
    { label: 'Total Users',      value: staff.length,     note: 'Approved staff' },
    { label: 'Total Tasks',      value: tasks.length,     note: `${completedTasks} done · ${pendingTasks} pending` },
    { label: 'Inventory Items',  value: totalInventory,   note: `${foils.length} foils · ${cylinders.length} cylinders` },
    { label: 'Pending Requests', value: requests.length,  note: 'Signups awaiting approval' },
  ];

  if (loading) return <ScreenWrapper><Spinner /></ScreenWrapper>;

  return (
    <ScreenWrapper refreshing={loading} onRefresh={fetchData}>
      {/* Header */}
      <View style={pageStyles.header}>
        <Text style={pageStyles.title}>Admin Dashboard</Text>
        <Text style={pageStyles.subtitle}>{companyName} control panel</Text>
      </View>

      <AlertBanner type="danger" message={error} />

      {/* Welcome Card */}
      <Card style={{ marginBottom: spacing[4] }}>
        <CardHeader>
          <View style={{ flex: 1 }}>
            <CardTitle style={{ marginBottom: 0 }}>Welcome, {adminName}</CardTitle>
            <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4 }}>
              Live company data — auto-refreshes every 30 seconds.
            </Text>
          </View>
          <Badge variant="primary" label="ADMIN" />
        </CardHeader>
      </Card>

      {/* Overview stats */}
      <Text style={s.sectionHeader}>Company Overview</Text>
      <View style={s.grid}>
        {overviewStats.map((st) => (
          <Card key={st.label} style={s.statCard}>
            <Text style={s.statValue}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
            <Text style={s.statNote}>{st.note}</Text>
          </Card>
        ))}
      </View>

      {/* Today's activity */}
      <Text style={s.sectionHeader}>Today's Activity</Text>
      <Card style={{ marginBottom: spacing[3] }}>
        <CardTitle>Task Status</CardTitle>
        <View style={s.statusRow}>
          <StatCard value={pendingTasks}    label="Pending"     color={colors.warning} style={{ flex: 1 }} />
          <StatCard value={inProgressTasks} label="In Progress" color={colors.primary} style={{ flex: 1 }} />
          <StatCard value={completedTasks}  label="Completed"   color={colors.success} style={{ flex: 1 }} />
        </View>
      </Card>

      <Card style={{ marginBottom: spacing[3] }}>
        <CardTitle>Today's Tasks</CardTitle>
        <Text style={s.statValue}>{todayTasks.length}</Text>
        <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 }}>
          Tasks created or updated today
        </Text>
      </Card>

      {/* Quick Actions */}
      <Text style={s.sectionHeader}>Quick Actions</Text>
      <Card style={{ marginBottom: spacing[4] }}>
        <View style={s.actionRow}>
          {[
            { label: 'Tasks',          screen: 'Tasks',          color: colors.primary },
            { label: 'Inventory',      screen: 'Inventory',      color: colors.accent },
            { label: 'Product Master', screen: 'ProductMaster',  color: '#6366f1' },
            { label: 'Dispatch',       screen: 'Dispatch',       color: '#059669' },
            { label: 'Finance & P&L',  screen: 'Finance',        color: '#d97706' },
            { label: 'Advance Salary', screen: 'AdvanceSalary',  color: '#2563eb' },
            { label: 'Attendance',     screen: 'Attendance',     color: colors.neutral },
            { label: 'Reports',        screen: 'Reports',        color: colors.success },
            { label: 'Users',          screen: 'UserManagement', color: colors.warning },
          ].map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={[s.actionBtn, { backgroundColor: item.color }]}
              onPress={() => navigation.navigate(item.screen)}
            >
              <Text style={s.actionBtnText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Info */}
      <Card>
        <CardTitle>Information</CardTitle>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
          Use the sidebar to create tasks, manage inventory, approve users, and review audit logs.
          All data is fetched live from MongoDB.
        </Text>
      </Card>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  sectionHeader: {
    fontSize: fontSize.lg, fontWeight: '700', color: colors.text,
    marginBottom: spacing[3], marginTop: spacing[2],
  },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginBottom: spacing[4] },
  statCard:  { flex: 1, minWidth: '45%', alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginTop: 2 },
  statNote:  { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', marginTop: 2 },
  statusRow: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[2] },
  actionBtn: {
    paddingVertical: spacing[3], paddingHorizontal: spacing[2],
    borderRadius: 8, alignItems: 'center', width: '30%',
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSize.xs, textAlign: 'center' },
});

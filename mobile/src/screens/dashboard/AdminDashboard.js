import React, { useEffect, useState, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../navigation/AuthContext';
import API_BASE_URL from '../../config';
import ScreenWrapper from '../../components/ScreenWrapper';
import { Card, CardHeader, CardTitle, Badge, AlertBanner, Spinner, StatCard } from '../../components/ui';
import { colors, spacing, fontSize, pageStyles } from '../../styles/theme';

export default function AdminDashboard() {
  const { session } = useContext(AuthContext);
  const token = session?.token;
  const adminName = session?.name || 'Admin';
  const navigation = useNavigation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard/summary`, {
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error('Unable to load dashboard information');
      const json = await res.json();
      setData(json);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load dashboard information');
    } finally {
      setLoading(false);
    }
  };

  // Refetch when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [token])
  );

  // 10-second periodic refetch
  useEffect(() => {
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading) return <ScreenWrapper><Spinner /></ScreenWrapper>;

  const companyName = data?.companyName || 'Bharath Enterprises';
  const totalUsers = data?.totalUsers ?? 0;
  const totalTasks = data?.totalTasks ?? { total: 0, done: 0, pending: 0 };
  const inventoryItems = data?.inventoryItems ?? { total: 0, foils: 0, cylinders: 0 };
  const pendingRequests = data?.pendingRequests ?? 0;
  const todayTasks = data?.todayTasks ?? 0;
  const taskStatus = data?.taskStatus ?? { pending: 0, inProgress: 0, completed: 0 };
  const attendanceStatus = data?.attendanceStatus || 'not_marked';
  const notifications = data?.notifications || [];

  const overviewStats = [
    { label: 'Total Users', value: totalUsers, note: 'Approved staff in this company' },
    { label: 'Total Tasks', value: totalTasks.total, note: `${totalTasks.done} done · ${totalTasks.pending} pending` },
    { label: 'Inventory Items', value: inventoryItems.total, note: `${inventoryItems.foils} foils · ${inventoryItems.cylinders} cylinders` },
    { label: 'Pending Requests', value: pendingRequests, note: 'Verified signups awaiting approval' },
  ];

  const attendanceBadgeVariant = 
    attendanceStatus === 'present' ? 'success' :
    attendanceStatus === 'completed' ? 'primary' : 'warning';

  return (
    <ScreenWrapper refreshing={loading} onRefresh={fetchData}>
      {/* Header */}
      <View style={pageStyles.header}>
        <Text style={pageStyles.title}>Welcome back, Admin {adminName}</Text>
        <Text style={pageStyles.subtitle}>{companyName} control panel</Text>
      </View>

      <AlertBanner type="danger" message={error} />

      {/* Welcome Card */}
      <Card style={{ marginBottom: spacing[4] }}>
        <CardHeader>
          <View>
            <CardTitle style={{ marginBottom: 0 }}>Welcome back, Admin {adminName}</CardTitle>
            <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4 }}>
              Live company data from the database.
            </Text>
          </View>
          <Badge variant="primary" label="ADMIN" />
        </CardHeader>
      </Card>

      {/* Section: Company Overview */}
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

      {/* Section: Today's Activity */}
      <Text style={s.sectionHeader}>Today's Activity</Text>
      <View style={{ gap: spacing[3], marginBottom: spacing[4] }}>
        <Card>
          <CardTitle>Today's Tasks</CardTitle>
          <Text style={s.statValue}>{todayTasks}</Text>
          <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 }}>
            Tasks due or started today
          </Text>
        </Card>

        <Card>
          <CardTitle>Task Status</CardTitle>
          <View style={s.statusRow}>
            <StatCard value={taskStatus.pending} label="Pending" color={colors.warning} />
            <StatCard value={taskStatus.inProgress} label="In Progress" color={colors.primary} />
            <StatCard value={taskStatus.completed} label="Completed" color={colors.success} />
          </View>
        </Card>

        <Card>
          <CardTitle>Attendance</CardTitle>
          <View style={{ marginTop: spacing[2], alignItems: 'flex-start' }}>
            <Badge variant={attendanceBadgeVariant} label={attendanceStatus.toUpperCase().replace('_', ' ')} />
            <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing[2] }}>
              {attendanceStatus === 'not_marked'
                ? 'Mark attendance in the Attendance section.'
                : `Status is currently ${attendanceStatus.replace('_', ' ')}.`}
            </Text>
          </View>
        </Card>
      </View>

      {/* Section: Notifications */}
      {notifications.length > 0 && (
        <Card style={{ marginBottom: spacing[4] }}>
          <CardHeader>
            <CardTitle style={{ marginBottom: 0 }}>Notifications</CardTitle>
            <Badge variant="primary" label={`${notifications.length} new`} />
          </CardHeader>
          <View style={{ gap: spacing[2], marginTop: spacing[2] }}>
            {notifications.map((notif, idx) => (
              <Card key={idx} alt condensed>
                <Text style={{ fontSize: fontSize.xs, fontWeight: '700', color: colors.textMuted, marginBottom: 2 }}>
                  {notif.type === 'task' ? '📋 TASK' : '🗓️ LEAVE'}
                </Text>
                <Text style={{ fontSize: fontSize.sm, color: colors.text }}>{notif.message}</Text>
              </Card>
            ))}
          </View>
        </Card>
      )}

      {/* Section: Quick Actions */}
      <Card style={{ marginBottom: spacing[4] }}>
        <CardTitle>Quick Actions</CardTitle>
        <View style={s.actionRow}>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Tasks')}>
            <Text style={s.actionBtnText}>View Tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.neutral }]} onPress={() => navigation.navigate('Attendance')}>
            <Text style={s.actionBtnText}>Open Attendance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.success }]} onPress={() => navigation.navigate('Leave')}>
            <Text style={s.actionBtnText}>Apply Leave</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.primary, opacity: 0.85 }]} onPress={() => navigation.navigate('Inventory')}>
            <Text style={s.actionBtnText}>Manage Inventory</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtnFull, { backgroundColor: colors.warning }]} onPress={() => navigation.navigate('UserManagement')}>
            <Text style={s.actionBtnText}>Approve Requests</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Footer helper text */}
      <Card>
        <CardTitle>Information</CardTitle>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
          Use the sidebar to create tasks, manage inventory, approve users, and review audit logs.
          All counters above reflect live data from MongoDB. Data syncs automatically every 10 seconds.
        </Text>
      </Card>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  sectionHeader: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing[3], marginTop: spacing[2] },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginBottom: spacing[4] },
  statCard:      { flex: 1, minWidth: '45%', alignItems: 'center' },
  statValue:     { fontSize: 32, fontWeight: '800', color: colors.primary },
  statLabel:     { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginTop: 2 },
  statNote:      { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', marginTop: 2 },
  statusRow:     { flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] },
  actionRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginTop: spacing[2], justifyContent: 'space-between' },
  actionBtn:     { paddingVertical: spacing[3], borderRadius: 8, alignItems: 'center', width: '47%' },
  actionBtnFull: { paddingVertical: spacing[3], borderRadius: 8, alignItems: 'center', width: '100%' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSize.sm },
});

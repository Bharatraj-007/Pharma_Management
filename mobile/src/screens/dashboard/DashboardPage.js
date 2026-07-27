/**
 * DashboardPage — generic dashboard shown when role doesn't match a specific one.
 * Also used as the "summary" view by WorkerDashboard when it wants overview cards.
 */
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../navigation/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import API_BASE_URL from '../../config';
import ScreenWrapper from '../../components/ScreenWrapper';
import { Card, CardHeader, CardTitle, Badge, AlertBanner, StatCard, Spinner } from '../../components/ui';
import { colors, spacing, fontSize, pageStyles } from '../../styles/theme';

export default function DashboardPage() {
  const { session } = useContext(AuthContext);
  const { role, isRole, can } = usePermissions();
  const navigation = useNavigation();
  const userName = session?.name || 'Worker';

  const [tasks,      setTasks]      = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = session?.token;
      const [tasksRes, attRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tasks`,                                  { headers: { Authorization: token } }),
        fetch(`${API_BASE_URL}/attendance?date=${today}`,              { headers: { Authorization: token } }),
      ]);
      if (!tasksRes.ok || !attRes.ok) throw new Error('Could not load dashboard data.');
      const [tasksData, attData] = await Promise.all([tasksRes.json(), attRes.json()]);

      const ownTasks = isRole('worker')
        ? (tasksData || []).filter((t) => t.worker_name === userName)
        : (tasksData || []);

      setTasks(Array.isArray(ownTasks) ? ownTasks : []);
      setAttendance(Array.isArray(attData) ? attData : []);
    } catch (err) {
      setError(err.message || 'Dashboard data failed to load.');
    } finally {
      setLoading(false);
    }
  };

  const todaysTasks    = tasks.filter((t) => {
    const d = new Date(t.createdAt || t.updatedAt || Date.now()).toDateString();
    return d === new Date().toDateString();
  });
  const pendingCount   = tasks.filter((t) => t.status === 'pending').length;
  const inProgCount    = tasks.filter((t) => t.status === 'in-progress').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  const todayAtt = attendance.find((r) => r.date === today);
  const attStatus = todayAtt ? todayAtt.status : 'Not Marked';
  const attVariant = attStatus === 'present' ? 'success' : attStatus === 'completed' ? 'primary' : 'warning';

  if (loading) return <ScreenWrapper><Spinner /></ScreenWrapper>;

  return (
    <ScreenWrapper refreshing={loading} onRefresh={fetchData}>
      {/* Page header */}
      <View style={pageStyles.header}>
        <Text style={pageStyles.title}>Welcome, {userName} 👋</Text>
        <Text style={pageStyles.subtitle}>
          {isRole('worker')
            ? 'Your task and attendance summary for today.'
            : 'Company overview — live activity and approvals.'}
        </Text>
      </View>

      <AlertBanner type="danger" message={error} />

      {/* Today's tasks */}
      <Card>
        <CardTitle>Today's Tasks</CardTitle>
        <Text style={s.muted}>Assigned tasks for today</Text>
        <Text style={[s.bigNum, { color: colors.primary }]}>{todaysTasks.length}</Text>
        <Text style={s.muted}>tasks due or started today</Text>
      </Card>

      {/* Task status breakdown */}
      <Card>
        <CardTitle>Task Status</CardTitle>
        <View style={s.statRow}>
          <StatCard value={pendingCount}   label="Pending"    color={colors.warning} style={{ marginRight: spacing[2] }} />
          <StatCard value={inProgCount}    label="In Progress" color={colors.primary} style={{ marginRight: spacing[2] }} />
          <StatCard value={completedCount} label="Completed"  color={colors.success} />
        </View>
      </Card>

      {/* Attendance */}
      <Card>
        <CardTitle>Attendance</CardTitle>
        <Text style={s.muted}>Status for today</Text>
        <View style={{ marginTop: spacing[3] }}>
          <Badge variant={attVariant} label={attStatus.toUpperCase()} />
          <Text style={[s.muted, { marginTop: spacing[2] }]}>
            {todayAtt
              ? `Checked in at ${todayAtt.checkIn || '—'}`
              : 'Mark attendance in the Attendance section.'}
          </Text>
        </View>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle style={{ marginBottom: 0 }}>Notifications</CardTitle>
          <Badge variant="primary" label={`${todaysTasks.length + attendance.length} new`} />
        </CardHeader>
        <Card alt condensed style={{ marginBottom: spacing[2] }}>
          <Text style={s.muted}>New task assigned</Text>
          <Text style={s.bodyText}>You have {pendingCount} pending task{pendingCount !== 1 ? 's' : ''} to start.</Text>
        </Card>
        {can('approveLeave') && (
          <Card alt condensed>
            <Text style={s.muted}>Leave approvals</Text>
            <Text style={s.bodyText}>Review team leave requests before your next shift.</Text>
          </Card>
        )}
      </Card>

      {/* Quick actions */}
      <Card>
        <CardTitle>Quick Actions</CardTitle>
        <View style={s.actionRow}>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Tasks')}>
            <Text style={s.actionBtnText}>View Tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.neutral }]} onPress={() => navigation.navigate('Attendance')}>
            <Text style={s.actionBtnText}>Attendance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.success }]} onPress={() => navigation.navigate('Leave')}>
            <Text style={s.actionBtnText}>Apply Leave</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  muted:     { fontSize: fontSize.sm,  color: colors.textMuted, marginTop: 2 },
  bodyText:  { fontSize: fontSize.base, color: colors.text },
  bigNum:    { fontSize: 36, fontWeight: '800', marginTop: spacing[3] },
  statRow:   { flexDirection: 'row', marginTop: spacing[2] },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[2] },
  actionBtn: {
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderRadius: 8, minWidth: 100, alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSize.sm },
});

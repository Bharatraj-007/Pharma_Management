import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useDashboardData } from '../../shared/hooks/useDashboardData';
import { WebCard, WebBadge, WebBtn } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function DashboardScreen({ apiBaseUrl, session, onNavigate }) {
  const token = session?.token;
  const role = (session?.role || 'worker').toLowerCase();
  const activeCompany = session?.activeCompany || session?.company || 'bharath';
  const name = session?.name || 'User';

  const { data, loading, error } = useDashboardData(apiBaseUrl, token, role, activeCompany);

  if (loading && !data) {
    return (
      <View style={styles.loadingBox}>
        <Text style={styles.loadingText}>⏳ Loading Smart Pharma Dashboard...</Text>
      </View>
    );
  }

  const companyName = data?.companyName || 'Bharath Enterprises';
  const totalUsers = data?.totalUsers ?? 0;
  const totalTasks = data?.totalTasks ?? { total: 0, done: 0, pending: 0 };
  const inventoryItems = data?.inventoryItems ?? { total: 0, foils: 0, cylinders: 0 };
  const pendingRequests = data?.pendingRequests ?? 0;
  const todayTasks = data?.todayTasks ?? 0;
  const taskStatus = data?.taskStatus ?? { pending: 0, inProgress: 0, completed: 0 };
  const attendanceStatus = data?.attendanceStatus || 'not_marked';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Welcome back, {name}</Text>
        <Text style={styles.headerSubtitle}>{companyName} control panel for users, tasks, inventory, and reports.</Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Section: Company Overview */}
      <Text style={styles.sectionTitle}>Company Overview</Text>
      <View style={styles.grid4}>
        <WebCard style={styles.card}>
          <Text style={styles.cardLabel}>Total Users</Text>
          <Text style={styles.cardValue}>{totalUsers}</Text>
          <Text style={styles.cardSub}>Approved staff in this company</Text>
        </WebCard>

        <WebCard style={styles.card}>
          <Text style={styles.cardLabel}>Total Tasks</Text>
          <Text style={styles.cardValue}>{totalTasks.total}</Text>
          <Text style={styles.cardSub}>{totalTasks.done} completed · {totalTasks.pending} pending</Text>
        </WebCard>

        <WebCard style={styles.card}>
          <Text style={styles.cardLabel}>Inventory Items</Text>
          <Text style={styles.cardValue}>{inventoryItems.total}</Text>
          <Text style={styles.cardSub}>{inventoryItems.foils} foils · {inventoryItems.cylinders} cylinders</Text>
        </WebCard>

        <WebCard style={styles.card}>
          <Text style={styles.cardLabel}>Pending Requests</Text>
          <Text style={styles.cardValue}>{pendingRequests}</Text>
          <Text style={styles.cardSub}>Signup requests waiting for approval</Text>
        </WebCard>
      </View>

      {/* Section: Today's Activity */}
      <Text style={[styles.sectionTitle, { marginTop: webSpacing.xxl }]}>Today's Activity</Text>
      <View style={styles.grid3}>
        <WebCard title="Today's Tasks">
          <Text style={styles.cardValue}>{todayTasks}</Text>
          <Text style={styles.cardSub}>Tasks due or started today</Text>
        </WebCard>

        <WebCard title="Task Status Breakdown">
          <View style={styles.statusGrid}>
            <View style={[styles.statBadgeBox, { backgroundColor: webColors.warningLight }]}>
              <Text style={styles.statBadgeLabel}>Pending</Text>
              <Text style={[styles.statBadgeVal, { color: webColors.warningDark }]}>{taskStatus.pending}</Text>
            </View>
            <View style={[styles.statBadgeBox, { backgroundColor: webColors.primaryBg }]}>
              <Text style={styles.statBadgeLabel}>In Progress</Text>
              <Text style={[styles.statBadgeVal, { color: webColors.primaryDark }]}>{taskStatus.inProgress}</Text>
            </View>
            <View style={[styles.statBadgeBox, { backgroundColor: webColors.successLight }]}>
              <Text style={styles.statBadgeLabel}>Completed</Text>
              <Text style={[styles.statBadgeVal, { color: webColors.successDark }]}>{taskStatus.completed}</Text>
            </View>
          </View>
        </WebCard>

        <WebCard title="Today's Attendance">
          <WebBadge
            variant={attendanceStatus === 'present' ? 'success' : attendanceStatus === 'completed' ? 'primary' : 'warning'}
            label={attendanceStatus.toUpperCase().replace('_', ' ')}
            style={{ marginBottom: 8 }}
          />
          <Text style={styles.cardSub}>
            {attendanceStatus === 'not_marked'
              ? 'Mark attendance in the Attendance section.'
              : `Status is currently ${attendanceStatus.replace('_', ' ')}.`}
          </Text>
        </WebCard>
      </View>

      {/* Quick Actions */}
      <WebCard title="⚡ Quick Actions" style={{ marginTop: webSpacing.xxl }}>
        <View style={styles.actionRow}>
          <WebBtn label="📋 View Tasks" onPress={() => onNavigate('tasks')} variant="primary" />
          <WebBtn label="⏱️ Open Attendance" onPress={() => onNavigate('attendance')} variant="secondary" />
          <WebBtn label="🗓️ Apply Leave" onPress={() => onNavigate('leaveManagement')} variant="success" />
          <WebBtn label="📦 Manage Inventory" onPress={() => onNavigate('stock')} variant="secondary" />
          {['admin', 'ceo'].includes(role) && (
            <WebBtn label="👥 Approve Requests" onPress={() => onNavigate('userManagement')} variant="warning" />
          )}
        </View>
      </WebCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: webSpacing.lg },
  header: { marginBottom: webSpacing.lg },
  headerTitle: { fontSize: webFontSize.title, fontWeight: '800', color: webColors.text },
  headerSubtitle: { fontSize: webFontSize.base, color: webColors.textMuted, marginTop: 4 },
  sectionTitle: { fontSize: webFontSize.xl, fontWeight: '700', color: webColors.text, marginBottom: webSpacing.md },
  grid4: { flexDirection: 'row', gap: webSpacing.lg, flexWrap: 'wrap' },
  grid3: { flexDirection: 'row', gap: webSpacing.lg, flexWrap: 'wrap' },
  card: { flex: 1, minWidth: 240 },
  cardLabel: { fontSize: webFontSize.sm, color: webColors.textMuted, fontWeight: '600' },
  cardValue: { fontSize: 32, fontWeight: '800', color: webColors.text, marginVertical: 4 },
  cardSub: { fontSize: webFontSize.xs, color: webColors.textMuted },
  statusGrid: { flexDirection: 'row', gap: 12, marginTop: 8 },
  statBadgeBox: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  statBadgeLabel: { fontSize: 11, fontWeight: '700', color: webColors.textMuted },
  statBadgeVal: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  loadingBox: { padding: 40, alignItems: 'center' },
  loadingText: { fontSize: webFontSize.base, color: webColors.textMuted },
  errorBox: { padding: 12, borderRadius: 8, backgroundColor: webColors.dangerLight, marginBottom: 16 },
  errorText: { color: webColors.dangerDark, fontWeight: '700' },
});

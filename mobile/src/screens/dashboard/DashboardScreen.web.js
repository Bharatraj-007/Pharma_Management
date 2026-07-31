import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useDashboardLogic } from './useDashboardLogic';
import WebCard from '../../../frontend-webui/components/WebUI.web';

export default function DashboardScreen({ navigation }) {
  const { session, role, data, loading, error } = useDashboardLogic();

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>⏳ Loading Web Dashboard...</Text>
      </View>
    );
  }

  const name = session?.name || 'User';
  const companyName = data?.companyName || 'Bharath Enterprises';

  return (
    <View style={styles.webContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back, {name}</Text>
        <Text style={styles.subtitle}>{companyName} control panel overview.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.grid4}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total Users</Text>
          <Text style={styles.cardVal}>{data?.totalUsers ?? 0}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total Tasks</Text>
          <Text style={styles.cardVal}>{data?.totalTasks?.total ?? 0}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Inventory Items</Text>
          <Text style={styles.cardVal}>{data?.inventoryItems?.total ?? 0}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Pending Requests</Text>
          <Text style={styles.cardVal}>{data?.pendingRequests ?? 0}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: { flex: 1, padding: 24, gap: 20 },
  center: { padding: 40, alignItems: 'center' },
  loadingText: { fontSize: 14, color: '#475569' },
  header: { marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#475569', marginTop: 4 },
  error: { color: '#ef4444', fontWeight: '700' },
  grid4: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  card: { flex: 1, minWidth: 220, padding: 20, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardLabel: { fontSize: 13, color: '#475569', fontWeight: '600' },
  cardVal: { fontSize: 32, fontWeight: '800', color: '#1e293b', marginTop: 4 },
});

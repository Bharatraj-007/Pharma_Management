import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useDashboardLogic } from './useDashboardLogic';
import ScreenWrapper from '../../components/ScreenWrapper';
import { Card, StatCard } from '../../components/ui';
import { colors, spacing, fontSize, pageStyles } from '../../styles/theme';

export default function DashboardScreen({ navigation }) {
  const { session, role, data, loading, error, refetch } = useDashboardLogic();

  const name = session?.name || 'User';

  return (
    <ScreenWrapper refreshing={loading} onRefresh={refetch}>
      <View style={pageStyles.header}>
        <Text style={pageStyles.title}>📊 Dashboard</Text>
        <Text style={pageStyles.subtitle}>Welcome back, {name}</Text>
      </View>

      <View style={{ gap: spacing[3] }}>
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          <StatCard value={data?.totalUsers ?? 0} label="Users" color={colors.primary} style={{ flex: 1 }} />
          <StatCard value={data?.totalTasks?.total ?? 0} label="Tasks" color={colors.success} style={{ flex: 1 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          <StatCard value={data?.inventoryItems?.total ?? 0} label="Stock" color={colors.warning} style={{ flex: 1 }} />
          <StatCard value={data?.pendingRequests ?? 0} label="Requests" color={colors.danger} style={{ flex: 1 }} />
        </View>
      </View>
    </ScreenWrapper>
  );
}

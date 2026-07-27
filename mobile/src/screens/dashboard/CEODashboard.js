import React, { useContext } from 'react';
import { View, Text } from 'react-native';
import { AuthContext } from '../../navigation/AuthContext';
import ScreenWrapper from '../../components/ScreenWrapper';
import { Card, CardTitle, StatCard } from '../../components/ui';
import { colors, spacing, pageStyles } from '../../styles/theme';

export default function CEODashboard() {
  const { session } = useContext(AuthContext);
  const name        = session?.name        || 'CEO';
  const companyName = session?.companyName || 'Bharath Enterprises';

  return (
    <ScreenWrapper>
      <View style={pageStyles.header}>
        <Text style={pageStyles.title}>🏢 CEO Dashboard</Text>
        <Text style={pageStyles.subtitle}>{companyName} — high-level overview</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing[3], marginBottom: spacing[4] }}>
        <StatCard value="—" label="Total Production" color={colors.primary} style={{ flex: 1 }} />
        <StatCard value="—" label="Profit Analysis"  color={colors.success} style={{ flex: 1 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing[3], marginBottom: spacing[4] }}>
        <StatCard value="—" label="KPI Score"         color={colors.accent}  style={{ flex: 1 }} />
        <StatCard value="—" label="Pending Approvals" color={colors.warning} style={{ flex: 1 }} />
      </View>

      <Card>
        <CardTitle>📊 Company Performance</CardTitle>
        <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 22 }}>
          KPIs, attendance patterns, foil consumption analytics, and revenue snapshots are
          visible in the Reports section. Use the sidebar to drill into specific modules.
        </Text>
      </Card>

      <Card>
        <CardTitle>💰 Profit Analysis</CardTitle>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>
          Revenue and margin tracking across all product lines. Full reporting available
          in the Reports → Production tab.
        </Text>
      </Card>
    </ScreenWrapper>
  );
}

import React, { useContext } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../navigation/AuthContext';
import ScreenWrapper from '../../components/ScreenWrapper';
import { Card, CardTitle, Btn } from '../../components/ui';
import { colors, spacing, fontSize, pageStyles } from '../../styles/theme';

export default function ManagerDashboard() {
  const { session } = useContext(AuthContext);
  const navigation  = useNavigation();
  const name        = session?.name || 'Manager';

  const quickLinks = [
    { label: '📋 Create Task',        screen: 'Tasks' },
    { label: '⏱️ Mark Attendance',     screen: 'Attendance' },
    { label: '👥 Monitor Workers',     screen: 'Reports' },
    { label: '🗓️ Approve Leave',        screen: 'Leave' },
  ];

  return (
    <ScreenWrapper>
      <View style={pageStyles.header}>
        <Text style={pageStyles.title}>Manager Dashboard</Text>
        <Text style={pageStyles.subtitle}>Welcome, {name}</Text>
      </View>

      <Card>
        <CardTitle>Quick Actions</CardTitle>
        <View style={{ gap: spacing[3], marginTop: spacing[2] }}>
          {quickLinks.map((link) => (
            <Btn
              key={link.screen}
              label={link.label}
              onPress={() => navigation.navigate(link.screen)}
              variant="primary"
              block
            />
          ))}
        </View>
      </Card>

      <Card>
        <CardTitle>Your Responsibilities</CardTitle>
        {[
          'Create and assign tasks to workers',
          'Mark daily attendance for your team',
          'Review and approve leave requests',
          'Monitor worker performance in Reports',
        ].map((item, i) => (
          <Text key={i} style={{ fontSize: fontSize.base, color: colors.textMuted, marginBottom: spacing[2] }}>
            • {item}
          </Text>
        ))}
      </Card>
    </ScreenWrapper>
  );
}

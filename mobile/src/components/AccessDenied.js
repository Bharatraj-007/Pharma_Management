import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '../styles/theme';
import { Btn, Card } from './ui';

export default function AccessDenied({ navigation }) {
  return (
    <View style={styles.page}>
      <Card style={styles.card}>
        <Text style={styles.icon}>🚫</Text>
        <Text style={styles.title}>Access Denied</Text>
        <Text style={styles.sub}>You don't have permission to view this page.</Text>
        <Btn
          label="← Back to Dashboard"
          onPress={() => navigation?.navigate('Dashboard')}
          variant="primary"
          block
          size="lg"
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center', padding: spacing[5],
  },
  card: { alignItems: 'center', width: '100%', maxWidth: 360 },
  icon:  { fontSize: 52, marginBottom: spacing[3] },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.text, marginBottom: spacing[2] },
  sub:   { fontSize: fontSize.base, color: colors.textMuted, textAlign: 'center', marginBottom: spacing[5] },
});

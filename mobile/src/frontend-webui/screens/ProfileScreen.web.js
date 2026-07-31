import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebCard, WebBadge } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function ProfileScreen({ session }) {
  const name = session?.name || 'User';
  const email = session?.email || 'user@smartpharma.com';
  const role = (session?.role || 'worker').toUpperCase();
  const company = session?.company || 'Bharath Enterprises';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👤 User Profile</Text>
        <Text style={styles.headerSubtitle}>Manage your account details and security settings.</Text>
      </View>

      <WebCard title="Account Overview" style={{ maxWidth: 500 }}>
        <View style={styles.row}>
          <Text style={styles.label}>Full Name:</Text>
          <Text style={styles.val}>{name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email Address:</Text>
          <Text style={styles.val}>{email}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Account Role:</Text>
          <WebBadge variant="primary" label={role} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Primary Company:</Text>
          <Text style={styles.val}>{company}</Text>
        </View>
      </WebCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: webSpacing.lg },
  header: { marginBottom: webSpacing.md },
  headerTitle: { fontSize: webFontSize.title, fontWeight: '800', color: webColors.text },
  headerSubtitle: { fontSize: webFontSize.base, color: webColors.textMuted, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: webColors.border },
  label: { fontSize: webFontSize.sm, color: webColors.textMuted, fontWeight: '600' },
  val: { fontSize: webFontSize.base, fontWeight: '700', color: webColors.text },
});

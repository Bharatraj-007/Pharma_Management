import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebCard, WebBadge, WebBtn, WebInput } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function ProfileScreen({ session }) {
  const name = session?.name || 'User';
  const email = session?.email || 'user@example.com';
  const role = (session?.role || 'worker').toUpperCase();
  const company = session?.company || 'bharath';

  const [phone, setPhone] = useState(session?.phone || '');
  const [password, setPassword] = useState('');

  const handleSave = () => {
    alert('Profile information updated!');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ User Profile & Account Settings</Text>
        <Text style={styles.headerSubtitle}>Manage your profile, password, contact information, and preferences.</Text>
      </View>

      <View style={styles.layout}>
        <WebCard style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userEmail}>{email}</Text>
          <WebBadge variant="primary" label={role} style={{ marginTop: 8 }} />
          <Text style={styles.companyText}>Company: {company.toUpperCase()}</Text>
        </WebCard>

        <WebCard title="Edit Account Details" style={styles.formCard}>
          <WebInput label="Full Name" value={name} editable={false} />
          <WebInput label="Email Address" value={email} editable={false} />
          <WebInput label="Phone Number" value={phone} onChangeText={setPhone} placeholder="Enter phone..." />
          <WebInput label="Change Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="New password..." />
          <WebBtn label="Save Profile Changes" onPress={handleSave} variant="success" size="lg" style={{ marginTop: 12 }} />
        </WebCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: webSpacing.lg },
  header: { marginBottom: webSpacing.md },
  headerTitle: { fontSize: webFontSize.title, fontWeight: '800', color: webColors.text },
  headerSubtitle: { fontSize: webFontSize.base, color: webColors.textMuted, marginTop: 4 },
  layout: { flexDirection: 'row', gap: 24, flexWrap: 'wrap' },
  userCard: { width: 300, alignItems: 'center', padding: 24 },
  formCard: { flex: 1, minWidth: 400 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: webColors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#ffffff' },
  userName: { fontSize: 20, fontWeight: '800', color: webColors.text },
  userEmail: { fontSize: 13, color: webColors.textMuted, marginTop: 2 },
  companyText: { fontSize: 12, fontWeight: '700', color: webColors.primary, marginTop: 12 },
});

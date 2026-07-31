import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { AuthContext } from '../navigation/AuthContext';
import API_BASE_URL from '../config';
import { colors, spacing, fontSize } from '../styles/theme';
import ScreenWrapper from '../components/ScreenWrapper';
import { Card, CardTitle, Btn } from '../components/ui';

export default function SettingsScreen() {
  const { session, logout } = useContext(AuthContext);
  const token = session?.token;
  const userRole = session?.role || 'worker';

  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // Editable Profile State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Security / Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // Preference Settings
  const [pushNotifications, setPushNotifications] = useState(true);
  const [taskAlerts, setTaskAlerts] = useState(true);

  useEffect(() => {
    if (token) {
      setLoading(true);
      fetch(`${API_BASE_URL}/me`, {
        headers: { Authorization: token },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            setUser(data);
            setName(data.name || '');
            setPhone(data.phone || '');
            setAddress(data.address || '');
            setEmergencyContact(data.emergencyContact || '');
          }
        })
        .catch((err) => Alert.alert('Error', err.message))
        .finally(() => setLoading(false));
    }
  }, [token]);

  const saveProfile = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({ name, phone, address, emergencyContact }),
      });
      if (res.ok) {
        Alert.alert('Success', '✅ Profile details updated!');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const changePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters long.');
      return;
    }
    setChangingPass(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      Alert.alert('Success', '✅ Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setChangingPass(false);
    }
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView style={{ flex: 1 }}>
        {/* User Card */}
        <Card style={{ marginBottom: spacing[3], backgroundColor: colors.surface }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={s.avatar}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#fff' }}>
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userName}>{user?.name || 'User'}</Text>
              <Text style={s.userRole}>Role: {userRole.toUpperCase()} · Co: {(user?.assignedCompany || 'bharath').toUpperCase()}</Text>
              <Text style={s.userEmail}>{user?.email}</Text>
            </View>
          </View>
        </Card>

        {/* 1. Profile Details */}
        <Card style={{ marginBottom: spacing[3] }}>
          <CardTitle>👤 Personal Profile Details</CardTitle>
          <Text style={s.label}>Full Name</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} />

          <Text style={s.label}>Phone Number</Text>
          <TextInput style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <Text style={s.label}>Address</Text>
          <TextInput style={s.input} value={address} onChangeText={setAddress} />

          <Text style={s.label}>Emergency Contact</Text>
          <TextInput style={s.input} value={emergencyContact} onChangeText={setEmergencyContact} placeholder="Name - Number" />

          <Btn label="💾 Save Profile Info" onPress={saveProfile} variant="success" block style={{ marginTop: spacing[3] }} />
        </Card>

        {/* 2. Security & Password */}
        <Card style={{ marginBottom: spacing[3] }}>
          <CardTitle>🔒 Account Security & Password</CardTitle>
          <Text style={s.label}>Current Password</Text>
          <TextInput style={s.input} secureTextEntry value={oldPassword} onChangeText={setOldPassword} />

          <Text style={s.label}>New Password (min 8 chars)</Text>
          <TextInput style={s.input} secureTextEntry value={newPassword} onChangeText={setNewPassword} />

          <Btn label={changingPass ? '⏳ Updating...' : '🔑 Update Password'} onPress={changePassword} loading={changingPass} variant="primary" block style={{ marginTop: spacing[3] }} />
        </Card>

        {/* 3. Notification Preferences */}
        <Card style={{ marginBottom: spacing[3] }}>
          <CardTitle>🔔 Notifications & Alerts</CardTitle>
          <View style={s.switchRow}>
            <Text style={s.switchText}>Push Notifications</Text>
            <Switch value={pushNotifications} onValueChange={setPushNotifications} trackColor={{ true: colors.primary }} />
          </View>
          <View style={s.switchRow}>
            <Text style={s.switchText}>Task Alerts</Text>
            <Switch value={taskAlerts} onValueChange={setTaskAlerts} trackColor={{ true: colors.primary }} />
          </View>
        </Card>

        {/* 4. Logout Button */}
        <Btn label="🚪 Sign Out of System" onPress={logout} variant="danger" block size="lg" style={{ marginBottom: spacing[4] }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  userRole: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary, marginTop: 2 },
  userEmail: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  label: { fontSize: fontSize.xs, fontWeight: '600', color: colors.text, marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: spacing[3], paddingVertical: spacing[2], fontSize: fontSize.sm, color: colors.text },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border },
  switchText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
});

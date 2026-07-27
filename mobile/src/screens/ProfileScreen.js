import React, { useEffect, useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Alert, Switch, TouchableOpacity } from 'react-native';
import { AuthContext } from '../navigation/AuthContext';
import API_BASE_URL from '../config';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  Card, CardTitle, Badge, AlertBanner, Btn, Input,
  Spinner, EmptyState, TabBar, InfoRow,
} from '../components/ui';
import { colors, spacing, fontSize, pageStyles, roleBadgeVariant } from '../styles/theme';

const COMPANY_NAMES = {
  bharath:          'Bharath Enterprises',
  shree_ganaapathy: 'Shree Ganaapathy Roto Prints',
  vel:              'Vel Gravure',
};

const MAIN_TABS = [
  { key: 'profile', label: '👤 Profile' },
  { key: 'personal', label: '🔑 Personal' },
  { key: 'employment', label: '🏢 Job Info' },
  { key: 'settings', label: '⚙️ Settings' }
];

const SETTINGS_SECTIONS = [
  { key: 'account', label: '⚙️ Account' },
  { key: 'notifications', label: '🔔 Alerts' },
  { key: 'security', label: '🛡️ Logs' },
  { key: 'preferences', label: '🎨 Preference' },
  { key: 'admin', label: '🛡️ Admin' }
];

function formatDate(str) {
  if (!str) return '—';
  try { return new Date(str).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
  catch { return str; }
}

function Avatar({ name, size = 72 }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.4 }}>
        {(name || 'U').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { session } = useContext(AuthContext);
  const token = session?.token;
  const role = session?.role || 'worker';
  const isAdminOrCeo = ['admin', 'ceo'].includes(role);

  const [activeTab, setActiveTab] = useState('profile');
  const [activeSettingsSection, setActiveSettingsSection] = useState('account');

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editable Form states
  const [profileForm, setProfileForm] = useState({});
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [companyForm, setCompanyForm] = useState({
    companyName: '',
    companyAddress: '',
    workingDays: [],
    holidays: '',
    shiftTiming: '09:00:00'
  });

  const headers = { 'Content-Type': 'application/json', Authorization: token };

  const fetchProfile = useCallback(async () => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/profile`, { headers: { Authorization: token } });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        
        setProfileForm({
          name: data.name || '',
          dob: data.dob || '',
          gender: data.gender || '',
          bloodGroup: data.bloodGroup || '',
          address: data.address || '',
          permanentAddress: data.permanentAddress || '',
          emergencyContactName: data.emergencyContactName || '',
          emergencyContactNumber: data.emergencyContactNumber || '',
          emergencyContact: data.emergencyContact || '',
          idProofType: data.idProofType || 'Aadhar',
          idProofNumber: data.idProofNumber || '',
          email: data.email || '',
          phone: data.phone || '',
          employeeNo: data.employeeNo || '',
          joiningDate: data.joiningDate || '',
          department: data.department || '',
          role: data.role || '',
          reportingManager: data.reportingManager || '',
          employmentType: data.employmentType || 'Full-time',
          twoFactorEnabled: !!data.twoFactorEnabled,
          pushNotifications: data.pushNotifications !== false,
          attendanceReminders: data.attendanceReminders !== false,
          taskAlerts: data.taskAlerts !== false,
          language: data.language || 'en',
          timezone: data.timezone || 'UTC'
        });

        setCompanyForm({
          companyName: data.companyName || '',
          companyAddress: data.companyAddress || '',
          workingDays: Array.isArray(data.workingDays) ? data.workingDays : [],
          holidays: Array.isArray(data.holidays) ? data.holidays.join(', ') : '',
          shiftTiming: data.shiftTiming || '09:00:00'
        });
      }
    } catch (err) {
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchProfile();
  }, [token]);

  const saveProfile = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(profileForm)
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.user);
        setEditing(false);
        setSuccess(data.message || 'Profile updated ✅');
        fetchProfile();
      } else {
        throw new Error(data.error || 'Failed to update');
      }
    } catch (err) {
      setError(err.message);
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword) {
      Alert.alert('Error', 'Please fill in all password fields.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Error', 'Confirm password does not match.');
      return;
    }
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/change-password`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Password updated successfully! ✅');
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        throw new Error(data.error || 'Update failed');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCompanySave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const holidaysArr = companyForm.holidays ? companyForm.holidays.split(',').map(h => h.trim()) : [];
      const res = await fetch(`${API_BASE_URL}/api/company/settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          companyName: companyForm.companyName,
          companyAddress: companyForm.companyAddress,
          workingDays: companyForm.workingDays,
          holidays: holidaysArr,
          shiftTiming: companyForm.shiftTiming
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Company settings updated ✅');
        fetchProfile();
      } else {
        throw new Error(data.error || 'Update failed');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = async (key, val) => {
    try {
      setProfileForm(p => ({ ...p, [key]: val }));
      await fetch(`${API_BASE_URL}/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ [key]: val })
      });
    } catch {}
  };

  const setPF = (k) => (v) => setProfileForm(p => ({ ...p, [k]: v }));

  if (loading && !profile) {
    return (
      <ScreenWrapper>
        <Spinner />
      </ScreenWrapper>
    );
  }

  // Filter settings section based on role (hide Admin tab for workers)
  const filteredSettings = SETTINGS_SECTIONS.filter(s => s.key !== 'admin' || isAdminOrCeo);

  return (
    <ScreenWrapper refreshing={loading} onRefresh={fetchProfile}>
      <View style={pageStyles.header}>
        <Text style={pageStyles.title}>👤 Profile & Settings</Text>
      </View>

      <TabBar tabs={MAIN_TABS} active={activeTab} onChange={(k) => { setActiveTab(k); setEditing(false); }} />

      <AlertBanner type="danger" message={error} />
      <AlertBanner type="success" message={success} />

      {/* ── PROFILE TAB ── */}
      {activeTab === 'profile' && profile && (
        <Card>
          <View style={s.profileHeader}>
            <Avatar name={profile.name} />
            <View style={{ flex:1 }}>
              <Text style={s.profileName}>{profile.name}</Text>
              <View style={{ flexDirection:'row', gap:spacing[2], flexWrap:'wrap', marginTop:spacing[1] }}>
                <Badge variant={roleBadgeVariant(profile.role)} label={profile.role?.toUpperCase()} />
                <Badge variant="neutral" label={COMPANY_NAMES[profile.company] || profile.company || '—'} />
              </View>
            </View>
          </View>

          <View style={s.infoGrid}>
            <InfoRow icon="🛡️" label="Name" value={profile.name} />
            <InfoRow icon="🆔" label="Employee ID" value={profile.employeeNo} />
            <InfoRow icon="💼" label="Designation" value={profile.role?.toUpperCase()} />
            <InfoRow icon="🏢" label="Department" value={profile.department || 'General'} />
          </View>
        </Card>
      )}

      {/* ── PERSONAL DETAILS TAB ── */}
      {activeTab === 'personal' && profile && (
        <>
          <Card>
            <View style={[s.row, { justifyContent: 'space-between', marginBottom: spacing[3] }]}>
              <CardTitle style={{ marginBottom:0 }}>Personal Information</CardTitle>
              <Btn
                label={editing ? 'Cancel' : '✏️ Edit'}
                size="sm"
                variant="secondary"
                onPress={() => setEditing(!editing)}
              />
            </View>

            {!editing ? (
              <View style={s.infoGrid}>
                <InfoRow icon="📧" label="Email" value={profile.email} />
                <InfoRow icon="📱" label="Phone" value={profile.phone} />
                <InfoRow icon="🎂" label="DOB" value={formatDate(profile.dob)} />
                <InfoRow icon="📅" label="Age (Calculated)" value={String(profile.age || '—')} />
                <InfoRow icon="🚻" label="Gender" value={profile.gender} />
                <InfoRow icon="🩸" label="Blood Group" value={profile.bloodGroup} />
                <InfoRow icon="🏠" label="Current Address" value={profile.address} />
                <InfoRow icon="📍" label="Permanent Address" value={profile.permanentAddress} />
                <InfoRow icon="🚨" label="Emergency Contact Name" value={profile.emergencyContactName} />
                <InfoRow icon="📞" label="Emergency Contact Number" value={profile.emergencyContactNumber} />
                <InfoRow icon="📄" label="ID Proof" value={profile.idProofType ? `${profile.idProofType}: ${profile.idProofNumber || '—'}` : '—'} />
              </View>
            ) : (
              <View style={{ gap: spacing[2] }}>
                {isAdminOrCeo && <Input label="Email (Admin)" value={profileForm.email} onChangeText={setPF('email')} />}
                {isAdminOrCeo && <Input label="Phone (Admin)" value={profileForm.phone} onChangeText={setPF('phone')} />}
                <Input label="DOB (YYYY-MM-DD)" value={profileForm.dob} onChangeText={setPF('dob')} placeholder="e.g. 1996-08-20" />
                <Input label="Gender" value={profileForm.gender} onChangeText={setPF('gender')} placeholder="Male/Female/Other" />
                <Input label="Blood Group" value={profileForm.bloodGroup} onChangeText={setPF('bloodGroup')} placeholder="O+ve" />
                <Input label="Current Address" value={profileForm.address} onChangeText={setPF('address')} />
                <Input label="Permanent Address" value={profileForm.permanentAddress} onChangeText={setPF('permanentAddress')} />
                <Input label="Emergency Contact Name" value={profileForm.emergencyContactName} onChangeText={setPF('emergencyContactName')} />
                <Input label="Emergency Contact Number" value={profileForm.emergencyContactNumber} onChangeText={setPF('emergencyContactNumber')} />
                <Input label="ID Type" value={profileForm.idProofType} onChangeText={setPF('idProofType')} placeholder="Aadhar/Passport/DL" />
                <Input label="ID Number" value={profileForm.idProofNumber} onChangeText={setPF('idProofNumber')} />
                
                <Btn label={saving ? '⏳ Saving…' : '✅ Save Changes'} onPress={saveProfile} loading={saving} variant="success" block size="lg" />
              </View>
            )}
          </Card>
        </>
      )}

      {/* ── EMPLOYMENT TAB ── */}
      {activeTab === 'employment' && profile && (
        <Card>
          <CardTitle>Job Details</CardTitle>
          <View style={s.infoGrid}>
            <InfoRow icon="📅" label="Date of Joining" value={formatDate(profile.joiningDate)} />
            <InfoRow icon="👔" label="Employment Type" value={profile.employmentType || 'Full-time'} />
            <InfoRow icon="📋" label="Reporting Manager" value={profile.reportingManager || 'Not assigned'} />
            <InfoRow icon="⏰" label="Shift Timings" value={profile.shiftTiming || '09:00 AM'} />
          </View>
        </Card>
      )}

      {/* ── SETTINGS TAB ── */}
      {activeTab === 'settings' && profile && (
        <View style={{ marginBottom: spacing[6] }}>
          {/* Sub menu selector */}
          <TabBar tabs={filteredSettings} active={activeSettingsSection} onChange={setActiveSettingsSection} />

          <Card>
            {/* Account Settings */}
            {activeSettingsSection === 'account' && (
              <View style={{ gap: spacing[3] }}>
                <Text style={s.sectionHeader}>Change Password</Text>
                <Input label="Current Password" secureTextEntry value={passwordForm.oldPassword} onChangeText={(v) => setPasswordForm(p => ({ ...p, oldPassword:v }))} />
                <Input label="New Password" secureTextEntry value={passwordForm.newPassword} onChangeText={(v) => setPasswordForm(p => ({ ...p, newPassword:v }))} />
                <Input label="Confirm New Password" secureTextEntry value={passwordForm.confirmPassword} onChangeText={(v) => setPasswordForm(p => ({ ...p, confirmPassword:v }))} />
                <Btn label="Update Password" onPress={handlePasswordChange} variant="primary" block size="md" />

                {!isAdminOrCeo && (
                  <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing[4], marginTop: spacing[2], gap: spacing[2] }}>
                    <Text style={s.sectionHeader}>Request Contact Update</Text>
                    <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>Updates require Admin approval before saving.</Text>
                    <Input label="New Email" value={profileForm.email} onChangeText={setPF('email')} />
                    <Input label="New Phone" value={profileForm.phone} onChangeText={setPF('phone')} />
                    <Btn label="Request Updates" onPress={saveProfile} variant="warning" block size="md" />
                  </View>
                )}
              </View>
            )}

            {/* Notification switches */}
            {activeSettingsSection === 'notifications' && (
              <View style={{ gap: spacing[3] }}>
                <Text style={s.sectionHeader}>Alert Reminders</Text>
                <View style={s.switchRow}>
                  <Text style={s.switchLabel}>Push Notifications</Text>
                  <Switch value={profileForm.pushNotifications} onValueChange={(val) => updatePreference('pushNotifications', val)} />
                </View>
                <View style={s.switchRow}>
                  <Text style={s.switchLabel}>Attendance Reminders</Text>
                  <Switch value={profileForm.attendanceReminders} onValueChange={(val) => updatePreference('attendanceReminders', val)} />
                </View>
                <View style={s.switchRow}>
                  <Text style={s.switchLabel}>Task Alerts</Text>
                  <Switch value={profileForm.taskAlerts} onValueChange={(val) => updatePreference('taskAlerts', val)} />
                </View>
              </View>
            )}

            {/* Security Logs */}
            {activeSettingsSection === 'security' && (
              <View style={{ gap: spacing[3] }}>
                <Text style={s.sectionHeader}>Recent Login History</Text>
                {profile.loginActivity && profile.loginActivity.length > 0 ? (
                  profile.loginActivity.map((log, idx) => (
                    <View key={idx} style={s.logItem}>
                      <Text style={s.logDate}>{new Date(log.timestamp).toLocaleString('en-IN')}</Text>
                      <Text style={s.logIp}>IP: {log.ip || 'Unknown'} · {log.device || 'Mobile Session'}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={s.muted}>No login history found.</Text>
                )}
                <Btn label="Sign Out From Other Devices" onPress={() => Alert.alert('Sessions', 'Successfully requested other session logouts.')} variant="danger" style={{ marginTop: spacing[3] }} />
              </View>
            )}

            {/* Preferences */}
            {activeSettingsSection === 'preferences' && (
              <View style={{ gap: spacing[3] }}>
                <Text style={s.sectionHeader}>App Toggles</Text>
                <Text style={s.switchLabel}>Theme</Text>
                <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[2] }}>
                  <Btn label="☀ Light" onPress={() => updatePreference('theme', 'light')} variant={profileForm.theme !== 'dark' ? 'primary' : 'secondary'} style={{ flex: 1 }} />
                  <Btn label="🌙 Dark" onPress={() => updatePreference('theme', 'dark')} variant={profileForm.theme === 'dark' ? 'primary' : 'secondary'} style={{ flex: 1 }} />
                </View>
                
                <Text style={s.switchLabel}>Language</Text>
                <Input value={profileForm.language} onChangeText={(val) => updatePreference('language', val)} placeholder="en" />
                
                <Text style={s.switchLabel}>Time Zone</Text>
                <Input value={profileForm.timezone} onChangeText={(val) => updatePreference('timezone', val)} placeholder="Asia/Kolkata" />
              </View>
            )}

            {/* Admin Settings */}
            {activeSettingsSection === 'admin' && isAdminOrCeo && (
              <View style={{ gap: spacing[3] }}>
                <Text style={s.sectionHeader}>Company Configurations</Text>
                
                <Input label="Company Name" value={companyForm.companyName} onChangeText={(v) => setCompanyForm(p => ({ ...p, companyName:v }))} />
                <Input label="Company Address" value={companyForm.companyAddress} onChangeText={(v) => setCompanyForm(p => ({ ...p, companyAddress:v }))} />
                <Input label="Shift Timing (HH:MM:SS)" value={companyForm.shiftTiming} onChangeText={(v) => setCompanyForm(p => ({ ...p, shiftTiming:v }))} />
                <Input label="Holidays List (comma-separated YYYY-MM-DD)" value={companyForm.holidays} onChangeText={(v) => setCompanyForm(p => ({ ...p, holidays:v }))} />
                
                <Btn label="Save Configurations" onPress={handleCompanySave} variant="success" block size="md" style={{ marginTop: spacing[2] }} />
              </View>
            )}
          </Card>
        </View>
      )}
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  profileHeader: { flexDirection:'row', gap:spacing[4], marginBottom:spacing[4], alignItems:'center' },
  profileName:   { fontSize:fontSize.xl, fontWeight:'800', color:colors.text },
  infoGrid:      { gap: spacing[1] },
  row: { flexDirection: 'row', alignItems: 'center' },
  sectionHeader: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, marginBottom: spacing[1] },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing[2] },
  switchLabel: { fontSize: fontSize.sm, fontWeight: '500', color: colors.text },
  logItem: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing[2] },
  logDate: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  logIp: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  muted: { fontSize: fontSize.sm, color: colors.textMuted },
});

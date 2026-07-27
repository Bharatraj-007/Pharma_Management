import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import API_BASE_URL from '../../config';
import { authStyles, colors, spacing, fontSize } from '../../styles/theme';
import { Input, Btn, AlertBanner } from '../../components/ui';

const COMPANIES = [
  { value: 'bharath',          label: 'Bharath Enterprises' },
  { value: 'shree_ganaapathy', label: 'Shree Ganaapathy Roto Prints' },
  { value: 'vel',              label: 'Vel Gravure' },
];

const ID_PROOFS = [
  { value: 'aadhar', label: 'Aadhar' },
  { value: 'pan',    label: 'PAN' },
];

const ROLES = [
  { value: 'worker',  label: 'Worker' },
  { value: 'manager', label: 'Manager' },
];

function isStrongPassword(pwd) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(pwd);
}

/** Simple inline picker rendered as tappable chips */
function PickerRow({ label, options, value, onChange }) {
  return (
    <View style={{ marginBottom: spacing[4] }}>
      <Text style={pStyles.label}>{label}</Text>
      <View style={pStyles.row}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[pStyles.chip, value === opt.value && pStyles.chipActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[pStyles.chipText, value === opt.value && pStyles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const pStyles = StyleSheet.create({
  label:         { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing[1] },
  row:           { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip:          { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive:    { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:      { fontSize: fontSize.sm, color: colors.text },
  chipTextActive:{ color: '#fff', fontWeight: '700' },
});

export default function SignupScreen({ navigation }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    dob: '', age: '', joiningDate: '',
    company: 'bharath', idProofType: 'aadhar', idProofNumber: '',
    password: '', confirmPassword: '', role: 'worker',
  });
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const set = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }));

  const sendOtp = async () => {
    setError(''); setSuccess('');
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setError('Please fill all required fields.'); return;
    }
    if (!isStrongPassword(form.password)) {
      setError('Password must be 8+ chars with A-Z, a-z, number & symbol.'); return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.'); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || 'Signup failed');
      setSuccess(text);
      setShowOtp(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError(''); setSuccess('');
    if (!otp.trim()) { setError('Enter the OTP sent to your email.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, otp }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || 'OTP verification failed');
      setSuccess(text + ' — Wait for admin approval, then sign in.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[authStyles.page, { justifyContent: 'flex-start', paddingTop: spacing[8] }]} keyboardShouldPersistTaps="handled">
          <View style={authStyles.card}>
            <Text style={[authStyles.title, { marginBottom: spacing[1] }]}>Create Account</Text>
            <Text style={authStyles.subtitle}>Request access to Smart Pharma</Text>

            <AlertBanner type="danger"  message={error}   />
            <AlertBanner type="success" message={success} />

            {!showOtp ? (
              <>
                <Input label="First Name *"     value={form.firstName}     onChangeText={set('firstName')}     placeholder="First name" />
                <Input label="Last Name *"      value={form.lastName}      onChangeText={set('lastName')}      placeholder="Last name" />
                <Input label="Email *"          value={form.email}         onChangeText={set('email')}         placeholder="Email address" keyboardType="email-address" autoCapitalize="none" />
                <Input label="Phone"            value={form.phone}         onChangeText={set('phone')}         placeholder="Phone number" keyboardType="phone-pad" />
                <Input label="Date of Birth (YYYY-MM-DD)" value={form.dob} onChangeText={set('dob')}          placeholder="e.g. 1995-06-15" />
                <Input label="Age"              value={form.age}           onChangeText={set('age')}           placeholder="Age" keyboardType="numeric" />
                <Input label="Date of Joining (YYYY-MM-DD)" value={form.joiningDate} onChangeText={set('joiningDate')} placeholder="e.g. 2024-01-01" />
                <Input label="ID Number"        value={form.idProofNumber} onChangeText={set('idProofNumber')} placeholder="ID number" />
                <Input label="Password *"       value={form.password}      onChangeText={set('password')}      placeholder="Min 8 chars A-Z a-z 0-9 symbol" secureTextEntry />
                <Input label="Confirm Password *" value={form.confirmPassword} onChangeText={set('confirmPassword')} placeholder="Repeat password" secureTextEntry />

                <PickerRow label="Company *"  options={COMPANIES} value={form.company}     onChange={set('company')} />
                <PickerRow label="ID Proof *" options={ID_PROOFS}  value={form.idProofType} onChange={set('idProofType')} />
                <PickerRow label="Role *"     options={ROLES}      value={form.role}        onChange={set('role')} />

                <Btn label={loading ? 'Sending OTP…' : 'Send OTP'} onPress={sendOtp} loading={loading} block size="lg" />
              </>
            ) : (
              <>
                <Input
                  label="Enter OTP sent to your email"
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="6-digit OTP"
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Btn label={loading ? 'Verifying…' : 'Verify OTP'} onPress={verifyOtp} loading={loading} block size="lg" variant="success" />
              </>
            )}

            <TouchableOpacity style={{ marginTop: spacing[4], alignItems: 'center' }} onPress={() => navigation.navigate('Login')}>
              <Text style={{ fontSize: fontSize.sm, color: colors.primary, fontWeight: '700' }}>
                Already have an account? Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

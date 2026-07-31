import React, { useState, useEffect } from 'react';
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
  { value: 'admin',   label: 'Admin' },
  { value: 'ceo',     label: 'CEO' },
];

function isStrongPassword(pwd) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(pwd);
}

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
  
  const [stage, setStage] = useState('fill'); // 'fill' | 'otp' | 'pending_approval'
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [approverInfo, setApproverInfo] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const set = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }));

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const sendSelfOtp = async () => {
    setError(''); setSuccess('');
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError('First Name, Last Name, and Email are compulsory.'); return;
    }
    const cleanPhone = (form.phone || '').replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Phone number is compulsory and must be exactly 10 digits.'); return;
    }
    if (!form.dob || !form.age || Number(form.age) <= 0 || !form.joiningDate) {
      setError('DOB, Age, and Date of Joining are compulsory.'); return;
    }
    if (!form.idProofNumber.trim()) {
      setError('ID Proof Number is compulsory.'); return;
    }
    const cleanId = form.idProofNumber.trim().toUpperCase();
    if (form.idProofType === 'aadhar') {
      if (!/^\d{12}$/.test(cleanId)) {
        setError('Aadhaar Card number must be exactly 12 digits (e.g. 123456789012).'); return;
      }
    } else if (form.idProofType === 'pan') {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanId)) {
        setError('PAN Card format must be 5 letters, 4 numbers, and 1 letter (e.g. AAAPB1234C).'); return;
      }
    }
    if (!isStrongPassword(form.password)) {
      setError('Password must be 8+ chars with uppercase, lowercase, number & symbol.'); return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.'); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/signup/send-self-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      setSuccess(data.message || 'OTP sent successfully!');
      setStage('otp');
      setCooldown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifySelfOtp = async () => {
    setError(''); setSuccess('');
    if (!otp.trim()) { setError('Enter the 6-digit OTP code.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/signup/verify-self-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'OTP verification failed');
      
      setApproverInfo(data.approverRole ? data.approverRole.toUpperCase() : 'ADMIN');
      setStage('pending_approval');
      setSuccess(data.message || 'Identity verified! Signup request submitted for approval.');
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
            <Text style={authStyles.subtitle}>
              {stage === 'fill' && 'Step 1: Enter details to request access'}
              {stage === 'otp' && 'Step 1 Verification: Enter code sent to your email'}
              {stage === 'pending_approval' && 'Step 2: Account Authorization Pending'}
            </Text>

            <AlertBanner type="danger"  message={error}   />
            <AlertBanner type="success" message={success} />

            {stage === 'fill' && (
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

                <Btn label={loading ? 'Sending Verification OTP…' : 'Send Verification OTP'} onPress={sendSelfOtp} loading={loading} block size="lg" />
              </>
            )}

            {stage === 'otp' && (
              <>
                <Input
                  label={`Enter 6-Digit OTP sent to ${form.email}`}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="6-digit OTP code"
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Btn label={loading ? 'Verifying OTP…' : 'Verify OTP'} onPress={verifySelfOtp} loading={loading} block size="lg" variant="success" />

                <TouchableOpacity
                  disabled={cooldown > 0 || loading}
                  onPress={sendSelfOtp}
                  style={{ marginTop: spacing[3], alignItems: 'center' }}
                >
                  <Text style={{ fontSize: fontSize.sm, color: cooldown > 0 ? colors.muted : colors.primary, fontWeight: '600' }}>
                    {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Didn’t receive code? Resend OTP'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setStage('fill')} style={{ marginTop: spacing[3], alignItems: 'center' }}>
                  <Text style={{ fontSize: fontSize.sm, color: colors.muted }}>← Edit details</Text>
                </TouchableOpacity>
              </>
            )}

            {stage === 'pending_approval' && (
              <View style={{ alignItems: 'center', paddingVertical: spacing[4] }}>
                <Text style={{ fontSize: 48, marginBottom: spacing[3] }}>📋</Text>
                <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: spacing[2] }}>
                  Identity Verified!
                </Text>
                <Text style={{ fontSize: fontSize.md, color: colors.muted, textAlign: 'center', marginBottom: spacing[4], lineHeight: 22 }}>
                  Your signup request has been submitted to your <Text style={{ fontWeight: '700', color: colors.primary }}>{approverInfo}</Text> for account access approval. You will receive an email notification as soon as your account is activated.
                </Text>
                <Btn label="Return to Sign In" onPress={() => navigation.navigate('Login')} block size="lg" />
              </View>
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

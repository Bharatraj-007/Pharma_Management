import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import API_BASE_URL from '../../config';
import { authStyles, colors, spacing } from '../../styles/theme';
import { Input, Btn, AlertBanner } from '../../components/ui';

export default function VerifyOTPScreen({ navigation }) {
  const [email, setEmail]   = useState('');
  const [otp, setOtp]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');

  const verify = async () => {
    setError(''); setSuccess('');
    if (!email.trim() || !otp.trim()) {
      setError('Email and OTP are required.'); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || 'Verification failed');
      setSuccess(text + ' — Your account is pending admin approval.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={authStyles.page} keyboardShouldPersistTaps="handled">
          <View style={authStyles.card}>
            <Text style={authStyles.title}>Verify OTP</Text>
            <Text style={authStyles.subtitle}>Enter the code sent to your email</Text>

            <AlertBanner type="danger"  message={error} />
            <AlertBanner type="success" message={success} />

            <Input label="Email" value={email} onChangeText={setEmail} placeholder="Your email address" keyboardType="email-address" autoCapitalize="none" />
            <Input label="OTP Code" value={otp} onChangeText={setOtp} placeholder="6-digit code" keyboardType="number-pad" maxLength={6} />

            <Btn label={loading ? 'Verifying…' : 'Verify OTP'} onPress={verify} loading={loading} block size="lg" variant="success" />

            <Btn
              label="Back to Sign In"
              onPress={() => navigation.navigate('Login')}
              variant="secondary"
              block
              size="sm"
              style={{ marginTop: spacing[3] }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

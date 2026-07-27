import React, { useState, useContext } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../navigation/AuthContext';
import API_BASE_URL from '../../config';
import { authStyles, colors, spacing, fontSize } from '../../styles/theme';
import { Input, Btn, AlertBanner } from '../../components/ui';

export default function LoginScreen({ navigation }) {
  const { signIn } = useContext(AuthContext);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const login = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Login failed. Check your credentials.');
      }

      const data = await res.json();
      // data = { token, role, name, company, companyName }
      // The web app also stores userId but the login endpoint doesn't return it;
      // we derive it from the JWT on the backend. We store what we have.
      await signIn({
        token:       data.token,
        role:        data.role,
        name:        data.name,
        company:     data.company     || '',
        companyName: data.companyName || '',
        userId:      data.userId      || '',
      });
      // AuthContext flips session → AppNavigator shows MainDrawer automatically
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={authStyles.page}
          keyboardShouldPersistTaps="handled"
        >
          <View style={authStyles.card}>
            <Text style={styles.emoji}>💊</Text>
            <Text style={authStyles.title}>Smart Pharma Login</Text>
            <Text style={authStyles.subtitle}>Sign in to your company account</Text>

            <AlertBanner type="danger" message={error} />

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
            />

            <Btn
              label={loading ? 'Signing in…' : 'Sign In'}
              onPress={login}
              loading={loading}
              disabled={loading}
              block
              size="lg"
              style={{ marginTop: spacing[2] }}
            />

            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => navigation.navigate('Signup')}
            >
              <Text style={styles.linkText}>Don't have an account? </Text>
              <Text style={[styles.linkText, { color: colors.primary, fontWeight: '700' }]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  emoji: { fontSize: 40, textAlign: 'center', marginBottom: spacing[2] },
  linkRow: {
    flexDirection: 'row', justifyContent: 'center',
    marginTop: spacing[4],
  },
  linkText: { fontSize: fontSize.sm, color: colors.textMuted },
});

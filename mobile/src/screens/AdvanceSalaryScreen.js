import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Print from 'expo-print';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../navigation/AuthContext';
import API_BASE_URL from '../config';
import { colors, spacing, fontSize } from '../styles/theme';
import ScreenWrapper from '../components/ScreenWrapper';
import { Card, CardTitle, Btn } from '../components/ui';

export default function AdvanceSalaryScreen() {
  const { session } = useContext(AuthContext);
  const token = session?.token;
  const userRole = session?.role || 'worker';
  const company = session?.company || 'bharath';

  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(false);

  // Advance Form State
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [paymentMode, setPaymentMode] = useState('online'); // 'cash' or 'online'
  const [qrProof, setQrProof] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAdvances = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/advances?company=${company}`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const data = await res.json();
        setAdvances(Array.isArray(data) ? data : data.advances || []);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [token, company]);

  useEffect(() => {
    fetchAdvances();
  }, [fetchAdvances]);

  const pickQrProof = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Denied', 'Permission to access gallery is required.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });
    if (!res.canceled && res.assets?.[0]) {
      const asset = res.assets[0];
      setQrProof(`data:image/jpeg;base64,${asset.base64}`);
    }
  };

  const requestAdvance = async () => {
    if (!amount || Number(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/advances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({
          amount: Number(amount),
          reason: reason || 'Emergency Advance',
          paymentMode,
          qrCodeImage: qrProof,
          company,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit advance request');

      Alert.alert('Success', '✅ Advance salary request submitted for approval!');
      setAmount('');
      setReason('');
      setQrProof(null);
      fetchAdvances();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveReject = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/advances/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        Alert.alert('Updated', `Request marked as ${status}`);
        fetchAdvances();
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const exportReport = async () => {
    try {
      const htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="text-align: center;">ADVANCE SALARY REPORT</h1>
            <h3 style="text-align: center;">Company: ${company.toUpperCase()}</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <thead>
                <tr style="background-color: #f1f5f9;">
                  <th style="padding: 8px; border: 1px solid #ccc;">Date</th>
                  <th style="padding: 8px; border: 1px solid #ccc;">Worker</th>
                  <th style="padding: 8px; border: 1px solid #ccc;">Amount</th>
                  <th style="padding: 8px; border: 1px solid #ccc;">Mode</th>
                  <th style="padding: 8px; border: 1px solid #ccc;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${advances.map(a => `
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ccc;">${new Date(a.createdAt || Date.now()).toLocaleDateString()}</td>
                    <td style="padding: 8px; border: 1px solid #ccc;">${a.workerName || a.worker}</td>
                    <td style="padding: 8px; border: 1px solid #ccc;">₹${a.amount}</td>
                    <td style="padding: 8px; border: 1px solid #ccc;">${(a.paymentMode || 'online').toUpperCase()}</td>
                    <td style="padding: 8px; border: 1px solid #ccc;">${a.status || 'Pending'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;
      await Print.printAsync({ html: htmlContent });
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView style={{ flex: 1 }}>
        <Btn label="📄 Export Advance Salary Report (PDF)" onPress={exportReport} variant="secondary" block style={{ marginBottom: spacing[3] }} />

        {/* Form Card */}
        <Card style={{ marginBottom: spacing[3] }}>
          <CardTitle>💵 Request Advance Salary</CardTitle>
          <Text style={s.label}>Amount (INR) *</Text>
          <TextInput
            style={s.input}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            placeholder="e.g. 5000"
          />

          <Text style={s.label}>Reason / Purpose</Text>
          <TextInput
            style={s.input}
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Medical emergency / Family necessity"
          />

          <Text style={s.label}>Preferred Payment Mode</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
            <TouchableOpacity
              style={[s.modeBtn, paymentMode === 'online' && s.modeBtnActive]}
              onPress={() => setPaymentMode('online')}
            >
              <Text style={{ fontWeight: 'bold', color: paymentMode === 'online' ? '#fff' : colors.text }}>🌐 Online / UPI</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modeBtn, paymentMode === 'cash' && s.modeBtnActive]}
              onPress={() => setPaymentMode('cash')}
            >
              <Text style={{ fontWeight: 'bold', color: paymentMode === 'cash' ? '#fff' : colors.text }}>💵 Cash</Text>
            </TouchableOpacity>
          </View>

          {paymentMode === 'online' && (
            <View style={{ marginTop: 8 }}>
              <Text style={s.label}>UPI Payment QR Code / Receipt Proof</Text>
              <Btn
                label={qrProof ? '✅ QR Proof Attached' : '📷 Upload UPI QR / Receipt'}
                onPress={pickQrProof}
                variant={qrProof ? 'success' : 'secondary'}
                size="sm"
              />
            </View>
          )}

          <Btn
            label={submitting ? '⏳ Submitting...' : '🚀 Submit Request'}
            onPress={requestAdvance}
            loading={submitting}
            variant="success"
            block
            size="lg"
            style={{ marginTop: spacing[3] }}
          />
        </Card>

        {/* Requests List */}
        <Card>
          <CardTitle>Advance Requests ({advances.length})</CardTitle>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : advances.length === 0 ? (
            <Text style={{ textAlign: 'center', color: colors.textMuted, padding: spacing[3] }}>No advance requests found.</Text>
          ) : (
            advances.map((a) => (
              <View key={a._id} style={s.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemTitle}>₹{a.amount} · {(a.paymentMode || 'online').toUpperCase()}</Text>
                  <Text style={s.itemSub}>Reason: {a.reason || 'N/A'}</Text>
                  <Text style={s.itemSub}>Status: <Text style={{ fontWeight: 'bold', color: a.status === 'Approved' ? '#166534' : a.status === 'Rejected' ? '#991b1b' : '#b45309' }}>{a.status || 'Pending'}</Text></Text>
                </View>
                {['admin', 'ceo', 'manager'].includes(userRole) && a.status === 'Pending' && (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Btn label="Approve" size="sm" variant="success" onPress={() => handleApproveReject(a._id, 'Approved')} />
                    <Btn label="Reject" size="sm" variant="danger" onPress={() => handleApproveReject(a._id, 'Rejected')} />
                  </View>
                )}
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  label: { fontSize: fontSize.xs, fontWeight: '600', color: colors.text, marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: spacing[3], paddingVertical: spacing[2], fontSize: fontSize.sm, color: colors.text },
  modeBtn: { flex: 1, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border },
  itemTitle: { fontWeight: '800', color: colors.text, fontSize: fontSize.base },
  itemSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
});

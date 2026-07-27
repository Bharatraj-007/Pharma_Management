import React, { useEffect, useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { AuthContext } from '../navigation/AuthContext';
import API_BASE_URL from '../config';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  Card, CardHeader, CardTitle, Badge, AlertBanner,
  Btn, Input, Spinner, EmptyState,
} from '../components/ui';
import { colors, spacing, fontSize, pageStyles, roleBadgeVariant } from '../styles/theme';

export default function SalaryManagementScreen() {
  const { session } = useContext(AuthContext);
  const token       = session?.token;

  const [staff,    setStaff]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(null);   // staff._id being edited
  const [editForm, setEditForm] = useState({ salaryRate: '0', salaryType: 'daily' });
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  const fetchStaff = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${API_BASE_URL}/staff`, { headers: { Authorization: token } });
      if (!res.ok) throw new Error('Failed to load staff');
      const data = await res.json();
      setStaff(Array.isArray(data) ? data : []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const startEdit = (s) => {
    setEditing(s._id);
    setEditForm({ salaryRate: String(s.salaryRate || 0), salaryType: s.salaryType || 'daily' });
  };

  const saveSalary = async (staffId) => {
    setError(''); setSuccess('');
    try {
      const res  = await fetch(`${API_BASE_URL}/staff/${staffId}/salary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ salaryRate: Number(editForm.salaryRate), salaryType: editForm.salaryType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSuccess('Salary updated ✅');
      setEditing(null);
      fetchStaff();
    } catch (err) { setError(err.message); }
  };

  return (
    <ScreenWrapper refreshing={loading} onRefresh={fetchStaff}>
      <View style={pageStyles.header}>
        <Text style={pageStyles.title}>💰 Salary Management</Text>
        <Text style={pageStyles.subtitle}>Set pay rates for each staff member.</Text>
      </View>

      <AlertBanner type="danger"  message={error}   />
      <AlertBanner type="success" message={success} />

      {/* How it works */}
      <Card style={{ marginBottom: spacing[4] }}>
        <CardTitle>📖 How Calculation Works</CardTitle>
        <Text style={s.infoText}>• <Text style={{ fontWeight:'700' }}>Per Day:</Text> ≥8h = full pay · &lt;4h = half pay · Absent = ₹0</Text>
        <Text style={s.infoText}>• <Text style={{ fontWeight:'700' }}>Per Hour:</Text> Pay = Hours × Hourly Rate · Absent = ₹0</Text>
        <Text style={[s.infoText, { color:colors.textMuted, marginTop:spacing[2] }]}>
          Earnings are auto-calculated when a manager marks Check-Out.
        </Text>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle style={{ marginBottom:0 }}>Staff Pay Rates</CardTitle>
          <Btn label="Refresh" onPress={fetchStaff} variant="primary" size="sm" />
        </CardHeader>

        {loading ? <Spinner /> : staff.length === 0 ? (
          <EmptyState message="No staff found." />
        ) : (
          staff.map((st) => (
            <View key={st._id} style={s.staffRow}>
              <View style={{ flex:1 }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:spacing[2] }}>
                  <Text style={s.staffName}>{st.name}</Text>
                  <Badge variant={roleBadgeVariant(st.role)} label={st.role?.toUpperCase()} />
                </View>

                {editing === st._id ? (
                  <View style={{ marginTop: spacing[3], gap: spacing[2] }}>
                    <View style={{ flexDirection:'row', gap:spacing[2] }}>
                      {['daily','hourly'].map((t) => (
                        <View
                          key={t}
                          style={[s.chip, editForm.salaryType === t && s.chipActive]}
                          onStartShouldSetResponder={() => true}
                          onResponderRelease={() => setEditForm((p) => ({ ...p, salaryType: t }))}
                        >
                          <Text style={[s.chipText, editForm.salaryType === t && s.chipActiveText]}>
                            {t === 'daily' ? 'Per Day' : 'Per Hour'}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <Input
                      label="Rate (₹)"
                      value={editForm.salaryRate}
                      onChangeText={(v) => setEditForm((p) => ({ ...p, salaryRate: v }))}
                      keyboardType="numeric"
                      style={{ marginBottom: 0 }}
                    />
                    <View style={{ flexDirection:'row', gap:spacing[2] }}>
                      <Btn label="Save" size="sm" variant="success" onPress={() => saveSalary(st._id)} style={{ flex:1 }} />
                      <Btn label="Cancel" size="sm" variant="secondary" onPress={() => setEditing(null)} style={{ flex:1 }} />
                    </View>
                  </View>
                ) : (
                  <Text style={s.rateText}>
                    {st.salaryRate > 0
                      ? `₹${st.salaryRate} / ${st.salaryType === 'hourly' ? 'hour' : 'day'}`
                      : 'Rate not set'}
                  </Text>
                )}
              </View>

              {editing !== st._id && (
                <Btn label="Set Rate" size="sm" variant="primary" onPress={() => startEdit(st)} />
              )}
            </View>
          ))
        )}
      </Card>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  infoText:      { fontSize:fontSize.sm, color:colors.text, marginBottom:spacing[1] },
  staffRow:      { flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', paddingVertical:spacing[4], borderBottomWidth:1, borderBottomColor:colors.border, gap:spacing[3] },
  staffName:     { fontWeight:'700', color:colors.text, fontSize:fontSize.base },
  rateText:      { fontSize:fontSize.sm, color:colors.textMuted, marginTop:spacing[1] },
  chip:          { paddingHorizontal:spacing[3], paddingVertical:spacing[2], borderRadius:999, borderWidth:1, borderColor:colors.border, backgroundColor:colors.surface },
  chipActive:    { backgroundColor:colors.primary, borderColor:colors.primary },
  chipText:      { fontSize:fontSize.sm, color:colors.text },
  chipActiveText:{ color:'#fff', fontWeight:'700' },
});

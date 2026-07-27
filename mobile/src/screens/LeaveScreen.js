import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { usePermissions } from '../hooks/usePermissions';
import { AuthContext } from '../navigation/AuthContext';
import API_BASE_URL from '../config';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  Card, CardHeader, CardTitle, Badge, Btn, Input, EmptyState, Spinner
} from '../components/ui';
import { colors, spacing, fontSize, pageStyles } from '../styles/theme';

const LEAVE_TYPES = ['Sick', 'Casual', 'Paid', 'Unpaid'];

function statusVariant(s) {
  return s === 'Approved' ? 'success' : s === 'Rejected' ? 'danger' : 'warning';
}

export default function LeaveScreen() {
  const { session }   = useContext(AuthContext);
  const token         = session?.token;
  const { role, can } = usePermissions();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ type: 'Sick', from: '', to: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: token
  };

  const fetchLeaves = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/leave`, {
        headers: { Authorization: token }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      } else {
        throw new Error('Failed to load leaves');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to fetch leave requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchLeaves();
    }
  }, [token, fetchLeaves]);

  const handleSubmit = async () => {
    if (!form.from || !form.to) {
      Alert.alert('Validation Error', 'From and To dates are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/leave`, {
        method: 'POST',
        headers,
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Leave request submitted successfully.');
        setForm({ type: 'Sick', from: '', to: '', reason: '' });
        fetchLeaves();
      } else {
        throw new Error(data.error || 'Failed to submit request');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/leave/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Updated', `Request was successfully ${status.toLowerCase()}.`);
        fetchLeaves();
      } else {
        throw new Error(data.error || 'Failed to update status');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  if (loading && requests.length === 0) {
    return (
      <ScreenWrapper>
        <Spinner />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper refreshing={refreshing} onRefresh={() => fetchLeaves(true)}>
      <View style={pageStyles.header}>
        <Text style={pageStyles.title}>🗓️ Leave Management</Text>
        <Text style={pageStyles.subtitle}>
          {role === 'worker'
            ? 'Apply for leave and view your history.'
            : 'View and manage leave requests.'}
        </Text>
      </View>

      {/* Apply form — workers only */}
      {role === 'worker' && (
        <Card style={{ marginBottom: spacing[4] }}>
          <CardTitle>Apply for Leave</CardTitle>

          <Text style={s.label}>Leave Type</Text>
          <View style={s.typeRow}>
            {LEAVE_TYPES.map((t) => (
              <View key={t}
                style={[s.chip, form.type === t && s.chipActive]}
                onStartShouldSetResponder={()=>true}
                onResponderRelease={() => set('type')(t)}
              >
                <Text style={[s.chipText, form.type === t && s.chipActiveText]}>{t}</Text>
              </View>
            ))}
          </View>

          <Input label="From (YYYY-MM-DD)" value={form.from} onChangeText={set('from')} placeholder="e.g. 2026-08-01" />
          <Input label="To (YYYY-MM-DD)"   value={form.to}   onChangeText={set('to')}   placeholder="e.g. 2026-08-03" />
          <Input label="Reason" value={form.reason} onChangeText={set('reason')} placeholder="Brief reason…" multiline />

          <Btn label={submitting ? '⏳ Submitting…' : 'Submit Leave Request'} onPress={handleSubmit} variant="primary" block size="lg" disabled={submitting} />
        </Card>
      )}

      {/* Requests list */}
      <Card>
        <CardHeader>
          <CardTitle style={{ marginBottom:0 }}>Leave Requests</CardTitle>
          <Badge variant="primary" label={`${requests.length} total`} />
        </CardHeader>

        {requests.length === 0 ? (
          <EmptyState message="No leave requests." />
        ) : (
          requests.map((req) => (
            <View key={req._id} style={s.reqRow}>
              <View style={{ flex:1 }}>
                <Text style={s.reqWorker}>{req.worker} — {req.type}</Text>
                <Text style={s.reqDates}>{req.from} → {req.to}</Text>
                <Text style={s.reqReason}>Reason: {req.reason || '—'}</Text>
                <Text style={s.reqRemarks}>{req.remarks}</Text>
              </View>
              <View style={{ alignItems:'flex-end', gap:spacing[2] }}>
                <Badge variant={statusVariant(req.status)} label={req.status} />
                {can('approveLeave') && req.status === 'Pending' && (
                  <View style={{ flexDirection:'row', gap:spacing[2], marginTop: 5 }}>
                    <Btn label="✓" size="sm" variant="success" onPress={() => updateStatus(req._id, 'Approved')} />
                    <Btn label="✗" size="sm" variant="danger"  onPress={() => updateStatus(req._id, 'Rejected')} />
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </Card>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  label:         { fontSize:fontSize.sm, fontWeight:'600', color:colors.text, marginBottom:spacing[1] },
  typeRow:       { flexDirection:'row', flexWrap:'wrap', gap:spacing[2], marginBottom:spacing[4] },
  chip:          { paddingHorizontal:spacing[3], paddingVertical:spacing[2], borderRadius:999, borderWidth:1, borderColor:colors.border, backgroundColor:colors.surface },
  chipActive:    { backgroundColor:colors.primary, borderColor:colors.primary },
  chipText:      { fontSize:fontSize.sm, color:colors.text },
  chipActiveText:{ color:'#fff', fontWeight:'700' },
  reqRow:        { flexDirection:'row', paddingVertical:spacing[3], borderBottomWidth:1, borderBottomColor:colors.border, gap:spacing[3] },
  reqWorker:     { fontWeight:'700', color:colors.text, fontSize:fontSize.base },
  reqDates:      { fontSize:fontSize.sm, color:colors.textMuted },
  reqReason:     { fontSize:fontSize.sm, color:colors.text, marginTop:2 },
  reqRemarks:    { fontSize:fontSize.xs, color:colors.textMuted, marginTop:2 },
});

import React, { useEffect, useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../navigation/AuthContext';
import API_BASE_URL from '../../config';
import ScreenWrapper from '../../components/ScreenWrapper';
import { Card, CardTitle, CardHeader, StatCard, Badge, Btn, Spinner, AlertBanner } from '../../components/ui';
import { colors, spacing, fontSize, pageStyles } from '../../styles/theme';

const COMPANIES = [
  { value: 'bharath', label: 'Bharath Enterprises' },
  { value: 'shree_ganaapathy', label: 'Shree Ganaapathy' },
  { value: 'vel', label: 'Vel Gravure' },
];

export default function CEODashboard() {
  const { session, setActiveCompany } = useContext(AuthContext);
  const navigation  = useNavigation();
  const token       = session?.token;
  const name        = session?.name || 'CEO';
  const companyName = session?.companyName || 'Bharath Enterprises';

  const [selectedCompany, setSelectedCompany] = useState('all');
  const [data, setData] = useState({ tasks: [], staff: [], foils: [], cylinders: [], transactions: [], requests: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const co = selectedCompany !== 'all' ? selectedCompany : '';
      const coQuery = co ? `?company=${co}` : '';

      const [tasksRes, staffRes, foilsRes, cylRes, txRes, reqRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tasks${coQuery}`,     { headers: { Authorization: token } }),
        fetch(`${API_BASE_URL}/staff`,               { headers: { Authorization: token } }),
        fetch(`${API_BASE_URL}/foils${coQuery}`,     { headers: { Authorization: token } }),
        fetch(`${API_BASE_URL}/cylinders${coQuery}`, { headers: { Authorization: token } }),
        fetch(`${API_BASE_URL}/api/transactions/summary?company=${co || 'bharath'}`, { headers: { Authorization: token } }),
        fetch(`${API_BASE_URL}/requests`,            { headers: { Authorization: token } }),
      ]);

      const parse = async (res) => { if (!res.ok) return []; const d = await res.json(); return Array.isArray(d) ? d : []; };
      const parseTx = async (res) => { if (!res.ok) return null; return res.json(); };

      const [tasks, staff, foils, cylinders, txData, requests] = await Promise.all([
        parse(tasksRes), parse(staffRes), parse(foilsRes), parse(cylRes), parseTx(txRes), parse(reqRes),
      ]);

      setData({ tasks, staff, foils, cylinders, transactions: txData, requests });
    } catch (err) {
      setError('Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [token, selectedCompany]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const { tasks, staff, foils, cylinders, transactions, requests } = data;
  const totalInventory = foils.length + cylinders.length;
  const pendingTasks   = tasks.filter((t) => t.status === 'pending').length;
  const inProgTasks    = tasks.filter((t) => t.status === 'in-progress').length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const netProfit      = transactions?.netProfit || 0;
  const totalIncome    = transactions?.totalIncome || 0;

  if (loading && !tasks.length) return <ScreenWrapper><Spinner /></ScreenWrapper>;

  const handleSelectCompany = (co) => {
    setSelectedCompany(co);
    if (setActiveCompany) setActiveCompany(co);
  };

  return (
    <ScreenWrapper refreshing={loading} onRefresh={fetchData}>
      <View style={pageStyles.header}>
        <Text style={pageStyles.title}>🏢 CEO Dashboard</Text>
        <Text style={pageStyles.subtitle}>Welcome, {name}</Text>
      </View>

      <AlertBanner type="danger" message={error} />

      {/* Company Selector */}
      <Card style={{ marginBottom: spacing[3] }}>
        <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing[2] }}>🏢 Select Company View</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
          <TouchableOpacity
            style={[s.chip, selectedCompany === 'all' && s.chipActive]}
            onPress={() => handleSelectCompany('all')}
          >
            <Text style={[s.chipText, selectedCompany === 'all' && s.chipActiveText]}>All Companies</Text>
          </TouchableOpacity>
          {COMPANIES.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[s.chip, selectedCompany === c.value && s.chipActive]}
              onPress={() => handleSelectCompany(c.value)}
            >
              <Text style={[s.chipText, selectedCompany === c.value && s.chipActiveText]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Key Metrics */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginBottom: spacing[4] }}>
        <StatCard value={tasks.length}    label="Total Tasks"     color={colors.primary} style={{ flex: 1, minWidth: '45%' }} />
        <StatCard value={staff.length}    label="Staff Count"     color={colors.success} style={{ flex: 1, minWidth: '45%' }} />
        <StatCard value={totalInventory}  label="Inventory Items" color={colors.accent}  style={{ flex: 1, minWidth: '45%' }} />
        <StatCard value={`₹${totalIncome.toLocaleString()}`} label="Income" color={colors.success} style={{ flex: 1, minWidth: '45%' }} />
      </View>

      {/* Task Status Breakdown */}
      <Card style={{ marginBottom: spacing[3] }}>
        <CardTitle>📋 Task Status Breakdown</CardTitle>
        <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] }}>
          <StatCard value={pendingTasks}   label="Pending"    color={colors.warning} style={{ flex: 1 }} />
          <StatCard value={inProgTasks}    label="In Progress" color={colors.primary} style={{ flex: 1 }} />
          <StatCard value={completedTasks} label="Completed"  color={colors.success} style={{ flex: 1 }} />
        </View>
      </Card>

      {/* Financial Summary */}
      <Card style={{ marginBottom: spacing[3] }}>
        <CardTitle>💰 Financial Summary</CardTitle>
        <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] }}>
          <StatCard value={`₹${totalIncome.toLocaleString()}`}     label="Income"   color={colors.success} style={{ flex: 1 }} />
          <StatCard value={`₹${netProfit.toLocaleString()}`}       label="Net Profit" color={netProfit >= 0 ? colors.primary : colors.danger} style={{ flex: 1 }} />
        </View>
      </Card>

      {/* Pending Approvals */}
      <Card style={{ marginBottom: spacing[3] }}>
        <CardHeader>
          <CardTitle style={{ marginBottom: 0 }}>📩 Pending Approvals</CardTitle>
          <Badge variant="warning" label={`${requests.length}`} />
        </CardHeader>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing[1] }}>
          {requests.length > 0
            ? `${requests.length} signup request(s) awaiting your approval.`
            : 'No pending approvals.'}
        </Text>
      </Card>

      {/* Quick Navigation */}
      <Card style={{ marginBottom: spacing[4] }}>
        <CardTitle>⚡ Quick Links</CardTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[2] }}>
          {[
            { label: '📋 Tasks', screen: 'Tasks' },
            { label: '📦 Inventory', screen: 'Inventory' },
            { label: '🚚 Dispatch', screen: 'Dispatch' },
            { label: '💵 Finance', screen: 'Finance' },
            { label: '📈 Reports', screen: 'Reports' },
            { label: '👥 Users', screen: 'UserManagement' },
          ].map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={s.quickBtn}
              onPress={() => navigation.navigate(item.screen)}
            >
              <Text style={s.quickBtnText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    borderRadius: 999, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary, borderColor: colors.primary,
  },
  chipText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.text },
  chipActiveText: { color: '#fff' },
  quickBtn: {
    paddingVertical: spacing[2], paddingHorizontal: spacing[3],
    backgroundColor: colors.primary, borderRadius: 8,
  },
  quickBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSize.xs },
});

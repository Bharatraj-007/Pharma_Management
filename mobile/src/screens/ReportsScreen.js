/**
 * ReportsScreen — merges the web Reports.js and ReportsPage.js into one screen.
 * Tabs: Overview · Attendance · Foil Usage
 * Download (Excel/PDF) is not supported on mobile — shows a note instead.
 */
import React, { useEffect, useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { AuthContext } from '../navigation/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import API_BASE_URL from '../config';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  Card, CardHeader, CardTitle, Badge, AlertBanner,
  Btn, Input, Spinner, EmptyState, TabBar, StatCard,
} from '../components/ui';
import { colors, spacing, fontSize, statusBadgeVariant, pageStyles } from '../styles/theme';

const STATUS_OPTIONS = [
  { value:'', label:'All' }, { value:'present', label:'Present' },
  { value:'absent', label:'Absent' }, { value:'half-day', label:'Half Day' },
  { value:'od', label:'OD' }, { value:'wfh', label:'WFH' }, { value:'late', label:'Late' },
];

function ChipRow({ options, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
      <View style={{ flexDirection:'row', gap:spacing[2] }}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <View key={opt.value}
              style={[cs.chip, active && cs.active]}
              onStartShouldSetResponder={()=>true}
              onResponderRelease={() => onChange(opt.value)}
            >
              <Text style={[cs.text, active && cs.activeText]}>{opt.label}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
const cs = StyleSheet.create({
  chip:       { paddingHorizontal:spacing[3], paddingVertical:spacing[2], borderRadius:999, borderWidth:1, borderColor:colors.border, backgroundColor:colors.surface },
  active:     { backgroundColor:colors.primary, borderColor:colors.primary },
  text:       { fontSize:fontSize.sm, color:colors.text },
  activeText: { color:'#fff', fontWeight:'700' },
});

export default function ReportsScreen() {
  const { session }  = useContext(AuthContext);
  const { role }     = usePermissions();
  const token        = session?.token;
  const isManager    = ['admin','manager','ceo'].includes(role);

  const today = new Date().toISOString().split('T')[0];

  const TABS = [
    { key:'overview',   label:'📊 Overview' },
    { key:'attendance', label:'📋 Attendance' },
    { key:'foil',       label:'🔶 Foil Usage' },
  ];
  const [activeTab, setActiveTab] = useState('overview');

  // Attendance state
  const [records,      setRecords]      = useState([]);
  const [workers,      setWorkers]      = useState([]);
  const [attLoading,   setAttLoading]   = useState(false);
  const [attError,     setAttError]     = useState('');
  const [selectedDate, setSelectedDate] = useState(today);
  const [filterWorker, setFilterWorker] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Foil state
  const [foilUsage,   setFoilUsage]   = useState([]);
  const [foilLoading, setFoilLoading] = useState(false);

  // Mark attendance (manager)
  const [markForm, setMarkForm] = useState({ workerName:'', status:'present', notes:'' });
  const [marking,  setMarking]  = useState(false);
  const [markError, setMarkError] = useState('');
  const setMF = (k) => (v) => setMarkForm((p) => ({...p, [k]:v}));
  const headers = { 'Content-Type':'application/json', Authorization: token };

  const fetchWorkers = useCallback(async () => {
    if (!isManager) return;
    try {
      const res = await fetch(`${API_BASE_URL}/workers`, { headers:{ Authorization:token } });
      if (res.ok) setWorkers(await res.json());
    } catch {}
  }, [token, isManager]);

  const fetchAttendance = useCallback(async () => {
    setAttLoading(true); setAttError('');
    try {
      const q = new URLSearchParams();
      if (selectedDate) q.set('date', selectedDate);
      if (filterWorker) q.set('workerName', filterWorker);
      if (filterStatus) q.set('status', filterStatus);
      const res  = await fetch(`${API_BASE_URL}/attendance?${q}`, { headers:{ Authorization:token } });
      if (!res.ok) throw new Error('Failed to load');
      setRecords(await res.json());
    } catch (err) { setAttError(err.message); }
    finally { setAttLoading(false); }
  }, [selectedDate, filterWorker, filterStatus, token]);

  const fetchFoilUsage = useCallback(async () => {
    setFoilLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/reports/foil-usage`, { headers:{ Authorization:token } });
      const data = res.ok ? await res.json() : [];
      setFoilUsage(Array.isArray(data) ? data : []);
    } catch { setFoilUsage([]); }
    finally { setFoilLoading(false); }
  }, [token]);

  useEffect(() => { fetchWorkers(); fetchAttendance(); fetchFoilUsage(); }, [fetchWorkers, fetchAttendance, fetchFoilUsage]);

  const markAttendance = async () => {
    if (!markForm.workerName) { setMarkError('Select a worker.'); return; }
    setMarking(true); setMarkError('');
    try {
      const res  = await fetch(`${API_BASE_URL}/attendance`, {
        method:'POST', headers, body: JSON.stringify({ ...markForm, date:selectedDate }),
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.error||'Failed');
      Alert.alert('✅ Attendance marked!');
      setMarkForm({ workerName:'', status:'present', notes:'' });
      fetchAttendance();
    } catch (err) { setMarkError(err.message); }
    finally { setMarking(false); }
  };

  const presentCount  = records.filter(r => r.status==='present'||r.status==='late').length;
  const absentCount   = records.filter(r => r.status==='absent').length;
  const halfDayCount  = records.filter(r => r.status==='half-day').length;
  const totalHours    = records.reduce((s,r) => s + (r.hoursWorked||0), 0);
  const totalEarnings = records.reduce((s,r) => s + (r.earnings||0), 0);
  const totalFoilUsed = foilUsage.reduce((s,r) => s + Number(r.totalFoilUsed||0), 0);

  // Overview summary
  const summary = { completed: 0, hours: 0, onTime: 0 };

  return (
    <ScreenWrapper>
      <View style={pageStyles.header}>
        <Text style={pageStyles.title}>📈 Reports</Text>
        <Text style={pageStyles.subtitle}>
          {role === 'worker' ? 'Your performance summaries.' : 'Team and company analytics.'}
        </Text>
      </View>

      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <>
          <View style={{ flexDirection:'row', gap:spacing[3], marginBottom:spacing[4] }}>
            <StatCard value={records.length} label="Records"    color={colors.primary} style={{ flex:1 }} />
            <StatCard value={`${totalHours.toFixed(1)}h`} label="Total Hours" color={colors.success} style={{ flex:1 }} />
          </View>
          <View style={{ flexDirection:'row', gap:spacing[3], marginBottom:spacing[4] }}>
            <StatCard value={`₹${totalEarnings.toFixed(0)}`} label="Total Pay"   color={colors.success} style={{ flex:1 }} />
            <StatCard value={`${totalFoilUsed.toFixed(2)} KG`} label="Foil Used" color={colors.warning} style={{ flex:1 }} />
          </View>

          {role !== 'worker' && (
            <Card>
              <CardTitle>Executive Analytics</CardTitle>
              <Text style={{ color:colors.textMuted, fontSize:fontSize.sm, lineHeight:20 }}>
                Company-wide metrics, attendance patterns, and productivity snapshots.
                Switch to the Attendance or Foil Usage tabs for detailed data.
              </Text>
            </Card>
          )}
        </>
      )}

      {/* ── ATTENDANCE ── */}
      {activeTab === 'attendance' && (
        <>
          {/* Summary cards */}
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:spacing[3], marginBottom:spacing[4] }}>
            <StatCard value={presentCount}   label="Present"   color={colors.success} style={{ flex:1, minWidth:'40%' }} />
            <StatCard value={absentCount}    label="Absent"    color={colors.danger}  style={{ flex:1, minWidth:'40%' }} />
            <StatCard value={halfDayCount}   label="Half Day"  color={colors.warning} style={{ flex:1, minWidth:'40%' }} />
            <StatCard value={`${totalHours.toFixed(1)}h`} label="Hours" color={colors.primary} style={{ flex:1, minWidth:'40%' }} />
          </View>

          {/* Filters */}
          <Card style={{ marginBottom:spacing[4] }}>
            <CardTitle>Filters</CardTitle>
            <Input
              label="Date"
              value={selectedDate} onChangeText={setSelectedDate}
              placeholder="YYYY-MM-DD"
            />
            <Text style={{ fontSize:fontSize.sm, fontWeight:'600', color:colors.text, marginBottom:spacing[1] }}>Status</Text>
            <ChipRow options={STATUS_OPTIONS} value={filterStatus} onChange={setFilterStatus} />
            <Btn label="Apply Filters" onPress={fetchAttendance} variant="primary" block />
          </Card>

          {/* Mark form for managers */}
          {isManager && (
            <Card style={{ marginBottom:spacing[4] }}>
              <CardTitle>✏️ Mark Attendance</CardTitle>
              <AlertBanner type="danger" message={markError} />

              <Text style={{ fontSize:fontSize.sm, fontWeight:'600', marginBottom:spacing[2] }}>Worker *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:spacing[3] }}>
                <View style={{ flexDirection:'row', gap:spacing[2] }}>
                  {workers.map((w) => (
                    <View key={w._id}
                      style={[cs.chip, markForm.workerName===w.name && cs.active]}
                      onStartShouldSetResponder={()=>true}
                      onResponderRelease={() => setMF('workerName')(w.name)}
                    >
                      <Text style={[cs.text, markForm.workerName===w.name && cs.activeText]}>{w.name}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>

              <Text style={{ fontSize:fontSize.sm, fontWeight:'600', marginBottom:spacing[2] }}>Status *</Text>
              <ChipRow
                options={[
                  { value:'present',label:'Present'}, { value:'absent',label:'Absent'},
                  { value:'half-day',label:'Half Day'}, { value:'od',label:'OD'},
                  { value:'wfh',label:'WFH'}, { value:'late',label:'Late'},
                ]}
                value={markForm.status} onChange={setMF('status')}
              />
              <Input label="Notes" value={markForm.notes} onChangeText={setMF('notes')} placeholder="Remarks…" />
              <Btn label={marking ? '⏳ Marking…' : '✅ Mark Attendance'} onPress={markAttendance} loading={marking} variant="success" block size="lg" />
            </Card>
          )}

          {/* Records */}
          <Card>
            <CardHeader>
              <CardTitle style={{ marginBottom:0 }}>Records — {selectedDate}</CardTitle>
              <Btn label="Refresh" onPress={fetchAttendance} variant="primary" size="sm" />
            </CardHeader>

            <AlertBanner type="danger" message={attError} />
            {attLoading ? <Spinner /> : records.length === 0 ? (
              <EmptyState message="No records for this date." />
            ) : (
              records.map((rec) => (
                <View key={rec._id} style={s.recRow}>
                  <View style={{ flex:1 }}>
                    <Text style={s.recName}>{rec.workerName}</Text>
                    <Text style={s.recSub}>
                      In: {rec.checkIn||'—'} · Out: {rec.checkOut||'—'}
                      {rec.hoursWorked ? ` · ${rec.hoursWorked}h` : ''}
                      {rec.earnings > 0 ? ` · ₹${rec.earnings.toFixed(0)}` : ''}
                    </Text>
                  </View>
                  <Badge variant={statusBadgeVariant(rec.status)} label={rec.status} />
                </View>
              ))
            )}
          </Card>
        </>
      )}

      {/* ── FOIL USAGE ── */}
      {activeTab === 'foil' && (
        <Card>
          <CardHeader>
            <CardTitle style={{ marginBottom:0 }}>Foil Consumption</CardTitle>
            <Badge variant="primary" label={`${totalFoilUsed.toFixed(2)} KG`} />
          </CardHeader>

          {foilLoading ? <Spinner /> : foilUsage.length === 0 ? (
            <EmptyState message="No foil consumption recorded yet." />
          ) : (
            foilUsage.slice(0, 30).map((row) => (
              <View key={row.taskId} style={s.recRow}>
                <View style={{ flex:1 }}>
                  <Text style={s.recName}>{row.productName || row.taskId}</Text>
                  <Text style={s.recSub}>
                    Worker: {row.workerName || 'Unassigned'}
                    {' · '}{row.colourCount} colour job
                    {' · '}Expected: {Number(row.expectedUsage||0).toFixed(2)} KG
                  </Text>
                </View>
                <View style={{ alignItems:'flex-end' }}>
                  <Text style={{ fontWeight:'700', color:colors.primary }}>{Number(row.totalFoilUsed||0).toFixed(2)} KG</Text>
                  <Text style={{ fontSize:fontSize.xs, color: Number(row.variance)>0 ? colors.danger : colors.success }}>
                    Δ {Number(row.variance||0).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>
      )}
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  recRow:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:spacing[3], borderBottomWidth:1, borderBottomColor:colors.border },
  recName: { fontWeight:'700', color:colors.text, fontSize:fontSize.base },
  recSub:  { fontSize:fontSize.xs, color:colors.textMuted, marginTop:2 },
});

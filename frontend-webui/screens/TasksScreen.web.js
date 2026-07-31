import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTasks } from '../../shared/hooks/useTasks';
import { WebCard, WebBadge, WebBtn, WebInput, WebModal } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function TasksScreen({ apiBaseUrl, session }) {
  const token = session?.token;
  const role = (session?.role || 'worker').toLowerCase();
  const company = session?.company || 'bharath';
  const activeCompany = session?.activeCompany || company;

  const {
    tasks,
    workers,
    loading,
    error,
    success,
    fetchTasks,
    startTask,
    completeTask,
    deleteTask,
  } = useTasks(apiBaseUrl, token, role, company, activeCompany);

  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Complete Modal State
  const [completingTask, setCompletingTask] = useState(null);
  const [usedKg, setUsedKg] = useState('');
  const [wasteKg, setWasteKg] = useState('');
  const [remainingKg, setRemainingKg] = useState('');

  const isManager = ['admin', 'manager', 'ceo'].includes(role);

  const filteredTasks = tasks.filter((t) => {
    const matchesStatus = !filterStatus || (t.status || '').toLowerCase() === filterStatus.toLowerCase();
    const matchesSearch = !searchQuery || [t.product_name, t.worker_name, t.company].join(' ').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCompleteSubmit = async () => {
    if (!completingTask || !usedKg) return alert('Used KG is required.');
    await completeTask(completingTask._id, usedKg, wasteKg, remainingKg);
    setCompletingTask(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Tasks Management</Text>
        <Text style={styles.headerSubtitle}>Assign production tasks, track progress, and log foil usage weights.</Text>
      </View>

      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

      {/* Filter bar */}
      <WebCard style={{ marginBottom: 16 }}>
        <View style={styles.filterRow}>
          <WebInput label="Search Task" value={searchQuery} onChangeText={setSearchQuery} placeholder="Search product or worker..." style={{ flex: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Status Filter</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {['', 'pending', 'in-progress', 'completed'].map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.chip, filterStatus === st && styles.chipActive]}
                  onPress={() => setFilterStatus(st)}
                >
                  <Text style={[styles.chipText, filterStatus === st && styles.chipActiveText]}>
                    {st === '' ? 'All' : st.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </WebCard>

      {/* Tasks Grid */}
      <Text style={styles.sectionTitle}>Task List ({filteredTasks.length})</Text>
      <View style={styles.grid}>
        {filteredTasks.map((t) => (
          <WebCard key={t._id} style={styles.taskCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.taskName}>{t.product_name}</Text>
              <WebBadge variant={t.status === 'completed' ? 'success' : t.status === 'in-progress' ? 'primary' : 'warning'} label={t.status} />
            </View>

            <View style={{ marginVertical: 12, gap: 4 }}>
              <Text style={styles.taskDetail}><Text style={{ fontWeight: '700' }}>Worker: </Text>{t.worker_name || 'Unassigned'}</Text>
              <Text style={styles.taskDetail}><Text style={{ fontWeight: '700' }}>Required: </Text>{t.required_kg} KG</Text>
              <Text style={styles.taskDetail}><Text style={{ fontWeight: '700' }}>Colors: </Text>{t.colourCount || 1} Color Job</Text>
              <Text style={styles.taskDetail}><Text style={{ fontWeight: '700' }}>Company: </Text>{t.company}</Text>
            </View>

            {t.status === 'completed' && (
              <View style={styles.completeBox}>
                <Text style={{ fontWeight: '700', color: webColors.successDark }}>✅ Completion Weight</Text>
                <Text style={{ fontSize: 12, color: webColors.textMuted }}>Used: {t.used_kg || 0} KG · Waste: {t.waste_kg || 0} KG · Remaining: {t.remaining_kg || 0} KG</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {t.status === 'pending' && (
                <WebBtn label="▶ Start Task" size="sm" variant="primary" onPress={() => startTask(t._id)} />
              )}
              {t.status === 'in-progress' && (
                <WebBtn label="✅ Mark Complete" size="sm" variant="success" onPress={() => { setCompletingTask(t); setUsedKg(String(t.required_kg || '')); }} />
              )}
              {isManager && (
                <WebBtn label="🗑️ Delete" size="sm" variant="danger" onPress={() => deleteTask(t._id)} />
              )}
            </View>
          </WebCard>
        ))}
      </View>

      {/* Complete Task Weight Modal */}
      <WebModal visible={!!completingTask} title={`✅ Complete Task — ${completingTask?.product_name}`} onClose={() => setCompletingTask(null)}>
        <WebInput label="Used KG *" value={usedKg} onChangeText={setUsedKg} keyboardType="numeric" placeholder="e.g. 25" />
        <WebInput label="Waste KG" value={wasteKg} onChangeText={setWasteKg} keyboardType="numeric" placeholder="e.g. 1.5" />
        <WebInput label="Remaining KG" value={remainingKg} onChangeText={setRemainingKg} keyboardType="numeric" placeholder="e.g. 0" />
        <WebBtn label="Submit Completion" onPress={handleCompleteSubmit} variant="success" style={{ marginTop: 12 }} />
      </WebModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: webSpacing.lg },
  header: { marginBottom: webSpacing.md },
  headerTitle: { fontSize: webFontSize.title, fontWeight: '800', color: webColors.text },
  headerSubtitle: { fontSize: webFontSize.base, color: webColors.textMuted, marginTop: 4 },
  sectionTitle: { fontSize: webFontSize.xl, fontWeight: '700', color: webColors.text, marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 16, alignItems: 'center', flexWrap: 'wrap' },
  label: { fontSize: webFontSize.xs, fontWeight: '600', color: webColors.text, marginBottom: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: webColors.surfaceAlt, borderWidth: 1, borderColor: webColors.border },
  chipActive: { backgroundColor: webColors.primary, borderColor: webColors.primary },
  chipText: { color: webColors.text, fontSize: webFontSize.xs, fontWeight: '600' },
  chipActiveText: { color: '#ffffff', fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  taskCard: { width: '48%', minWidth: 320 },
  taskName: { fontSize: webFontSize.lg, fontWeight: '700', color: webColors.text, flex: 1 },
  taskDetail: { fontSize: webFontSize.sm, color: webColors.textMuted },
  completeBox: { padding: 8, borderRadius: 6, backgroundColor: webColors.successLight, marginTop: 8 },
  errorBox: { padding: 12, borderRadius: 8, backgroundColor: webColors.dangerLight, marginBottom: 12 },
  errorText: { color: webColors.dangerDark, fontWeight: '700' },
});

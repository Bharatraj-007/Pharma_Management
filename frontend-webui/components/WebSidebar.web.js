import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'clientCompany', label: 'Client Company', icon: '🏢' },
  { key: 'tasks', label: 'Tasks', icon: '📋' },
  { key: 'stock', label: 'Stock', icon: '📦' },
  { key: 'products', label: 'Product Master', icon: '🏷️' },
  { key: 'dispatch', label: 'Dispatch', icon: '🚚' },
  { key: 'finance', label: 'Finance & P&L', icon: '💵' },
  { key: 'attendance', label: 'Attendance', icon: '⏱️' },
  { key: 'leaveManagement', label: 'Leave', icon: '🗓️' },
  { key: 'reports', label: 'Reports', icon: '📄' },
  { key: 'chat', label: 'Messages', icon: '💬' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
  { key: 'userManagement', label: 'Users', icon: '👥' },
  { key: 'auditLogs', label: 'Audit Logs', icon: '🔍' },
  { key: 'salaryManagement', label: 'Salary', icon: '💰' },
];

const PERMISSIONS = {
  dashboard: ['ceo', 'admin', 'manager', 'worker'],
  clientCompany: ['ceo', 'admin', 'manager', 'worker'],
  tasks: ['ceo', 'admin', 'manager', 'worker'],
  stock: ['ceo', 'admin', 'manager'],
  dispatch: ['ceo', 'admin', 'manager'],
  products: ['ceo', 'admin', 'manager'],
  finance: ['ceo', 'admin'],
  attendance: ['ceo', 'admin', 'manager', 'worker'],
  leaveManagement: ['ceo', 'admin', 'manager', 'worker'],
  reports: ['ceo', 'admin', 'manager', 'worker'],
  chat: ['ceo', 'admin', 'manager', 'worker'],
  settings: ['ceo', 'admin', 'manager', 'worker'],
  userManagement: ['ceo', 'admin'],
  auditLogs: ['ceo', 'admin'],
  salaryManagement: ['ceo', 'admin'],
};

export default function WebSidebar({ activeKey, onSelectKey, session, collapsed, onLogout }) {
  if (collapsed) return null;

  const role = (session?.role || 'worker').toLowerCase();
  const userName = session?.name || 'User';
  const companyName = session?.companyName || (session?.company === 'shree_ganaapathy' ? 'Shree Ganaapathy Roto Prints' : session?.company === 'vel' ? 'Vel Gravure' : 'Bharath Enterprises');
  const roleDisplay = role === 'ceo' ? 'CEO (Owner / System Head)' : role === 'admin' ? 'System Administrator' : role === 'manager' ? 'Production Manager' : 'Production Worker';

  const visibleItems = MENU_ITEMS.filter((i) => PERMISSIONS[i.key]?.includes(role));

  return (
    <View style={styles.sidebar}>
      {/* Brand Header */}
      <View style={styles.brandRow}>
        <Text style={styles.pillIcon}>💊</Text>
        <Text style={styles.brandTitle}>Smart Pharma</Text>
      </View>

      {/* User Profile Card */}
      <View style={styles.userCard}>
        <Text style={styles.userName}>{userName}</Text>
        <Text style={styles.userRole}>{role.toUpperCase()}</Text>
        <Text style={styles.userCompany}>{companyName}</Text>
      </View>

      {/* Nav Menu */}
      <ScrollView contentContainerStyle={styles.navContainer} showsVerticalScrollIndicator={false}>
        {visibleItems.map((item) => {
          const active = activeKey === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navLink, active && styles.navLinkActive]}
              onPress={() => onSelectKey(item.key)}
            >
              <Text style={styles.navIcon}>{item.icon}</Text>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Logout at bottom */}
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.navIcon}>🚪</Text>
        <Text style={styles.logoutLabel}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 250,
    backgroundColor: '#172033',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
    height: '100%',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  pillIcon: { fontSize: 20 },
  brandTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff', letterSpacing: -0.5 },
  userCard: {
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20,
  },
  userName: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  userRole: { fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 2, letterSpacing: 0.5 },
  userCompany: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  navContainer: { gap: 6 },
  navLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
  },
  navLinkActive: {
    backgroundColor: '#5046e5',
  },
  navIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  navLabel: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  navLabelActive: { color: '#ffffff', fontWeight: '800' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
    borderRadius: 10,
  },
  logoutLabel: { fontSize: 14, color: '#e2e8f0', fontWeight: '700' },
});

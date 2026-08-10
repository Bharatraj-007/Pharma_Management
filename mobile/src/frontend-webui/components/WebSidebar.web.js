import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const MENU_ITEMS = [
  { id: 'dashboard',     label: 'Dashboard',      icon: '📊' },
  { id: 'clientCompany', label: 'Client Company', icon: '🏢' },
  { id: 'tasks',         label: 'Tasks',          icon: '📋' },
  { id: 'stock',         label: 'Stock',          icon: '📦' },
  { id: 'productMaster', label: 'Product Master', icon: '🏷️' },
  { id: 'dispatch',      label: 'Dispatch',       icon: '🚚' },
  { id: 'finance',       label: 'Finance & P&L',  icon: '💵' },
  { id: 'attendance',    label: 'Attendance',     icon: '⏱️' },
  { id: 'leave',         label: 'Leave',          icon: '🗓️' },
  { id: 'reports',       label: 'Reports',        icon: '📄' },
  { id: 'chat',          label: 'Messages',       icon: '💬' },
  { id: 'settings',      label: 'Settings',       icon: '⚙️' },
  { id: 'users',         label: 'Users',          icon: '👥' },
  { id: 'audit',         label: 'Audit Logs',     icon: '🔍' },
  { id: 'salary',        label: 'Salary',         icon: '💰' },
];

export default function WebSidebar({ session, activeRoute, onNavigate, onLogout }) {
  const name = session?.name || 'CEO (Owner / System Head)';
  const role = (session?.role || 'CEO').toUpperCase();
  const rawCompany = session?.companyName || session?.company || 'Bharath Enterprises';
  const company = rawCompany === 'bharath' ? 'Bharath Enterprises' : rawCompany === 'shree_ganaapathy' ? 'Shree Ganaapathy Roto Prints' : rawCompany === 'vel' ? 'Vel Gravure' : rawCompany;

  return (
    <View style={styles.sidebar}>
      {/* Brand & User Card */}
      <View style={styles.userCard}>
        <Text style={styles.userName}>{name}</Text>
        <Text style={styles.userRole}>{role}</Text>
        <Text style={styles.userCompany}>{company}</Text>
      </View>

      {/* Nav Menu Items */}
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
        {MENU_ITEMS.map((item) => {
          const active = activeRoute === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, active && styles.menuItemActive]}
              onPress={() => onNavigate(item.id)}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bottom Logout Button */}
      <TouchableOpacity style={styles.bottomLogout} onPress={onLogout}>
        <Text style={styles.logoutIcon}>🚪</Text>
        <Text style={styles.logoutLabel}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: '#172033',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'space-between',
  },
  userCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  userName: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
  userRole: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
  userCompany: { fontSize: 11, color: '#64748b', marginTop: 1 },
  menuContainer: { flex: 1 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  menuItemActive: {
    backgroundColor: '#5046e5',
  },
  menuIcon: { fontSize: 16, marginRight: 12 },
  menuLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  menuLabelActive: { color: '#ffffff', fontWeight: '800' },
  bottomLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  logoutIcon: { fontSize: 16, marginRight: 12 },
  logoutLabel: { fontSize: 13, color: '#f87171', fontWeight: '700' },
});

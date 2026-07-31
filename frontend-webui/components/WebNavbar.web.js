import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function WebNavbar({ session, onToggleSidebar, onLogout, onChangeCompany }) {
  const role = (session?.role || 'worker').toLowerCase();
  const company = session?.company || 'bharath';
  const activeCo = session?.activeCompany || company;

  return (
    <View style={styles.navbar}>
      <View style={styles.left}>
        <View style={styles.brandRow}>
          <Text style={{ fontSize: 18 }}>💊</Text>
          <Text style={styles.brand}>Smart Pharma</Text>
        </View>

        {role === 'ceo' ? (
          <View style={styles.coDropdown}>
            {['bharath', 'shree_ganaapathy', 'vel'].map((co) => {
              const label = co === 'shree_ganaapathy' ? 'Shree Ganaapathy (Company 2)' : co === 'vel' ? 'Vel Gravure (Company 3)' : 'Bharath Enterprises (Company 1)';
              const active = activeCo === co;
              return (
                <TouchableOpacity
                  key={co}
                  style={[styles.coChip, active && styles.coChipActive]}
                  onPress={() => onChangeCompany(co)}
                >
                  <Text style={[styles.coChipText, active && styles.coChipActiveText]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.companyPill}>
            <Text style={styles.companyPillText}>
              {company === 'shree_ganaapathy' ? 'Shree Ganaapathy Roto Prints' : company === 'vel' ? 'Vel Gravure' : 'Bharath Enterprises'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.right}>
        <TouchableOpacity style={styles.bellBtn}>
          <Text style={{ fontSize: 18 }}>🔔</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    height: 56,
    backgroundColor: '#131b2e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brand: { fontSize: 18, fontWeight: '800', color: '#ffffff', letterSpacing: -0.5 },
  coDropdown: { flexDirection: 'row', gap: 6 },
  coChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  coChipActive: { backgroundColor: '#eef2ff', borderColor: '#4f46e5' },
  coChipText: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  coChipActiveText: { color: '#4f46e5' },
  companyPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  companyPillText: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  bellBtn: { padding: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)' },
  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#ef4444',
  },
  logoutText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
});

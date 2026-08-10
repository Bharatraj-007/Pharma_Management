import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, StyleSheet, ScrollView } from 'react-native';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export function WebCard({ children, style, title, action }) {
  return (
    <View style={[styles.card, style]}>
      {title && (
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{title}</Text>
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

export function WebBadge({ variant = 'primary', label, style }) {
  const badgeStyle = styles[`badge_${variant}`] || styles.badge_primary;
  const textStyle = styles[`badgeText_${variant}`] || styles.badgeText_primary;
  return (
    <View style={[styles.badge, badgeStyle, style]}>
      <Text style={[styles.badgeText, textStyle]}>{label}</Text>
    </View>
  );
}

export function WebBtn({ label, onPress, variant = 'primary', size = 'md', disabled = false, style }) {
  const btnStyle = styles[`btn_${variant}`] || styles.btn_primary;
  const btnText = styles[`btnText_${variant}`] || styles.btnText_primary;
  const sizeStyle = styles[`btn_${size}`] || styles.btn_md;

  return (
    <TouchableOpacity
      style={[styles.btn, btnStyle, sizeStyle, disabled && styles.btnDisabled, style]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.btnText, btnText]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function WebInput({ label, value, onChangeText, placeholder, type = 'text', style, ...props }) {
  return (
    <View style={[styles.inputGroup, style]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        {...props}
      />
    </View>
  );
}

export function WebModal({ visible, title, onClose, children }) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 500 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: webColors.surface,
    borderRadius: 12,
    padding: webSpacing.xl,
    borderWidth: 1,
    borderColor: webColors.border,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: webSpacing.lg,
    paddingBottom: webSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: webColors.borderLight,
  },
  cardTitle: {
    fontSize: webFontSize.lg,
    fontWeight: '700',
    color: webColors.text,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  badge_primary: { backgroundColor: '#eef2ff' },
  badgeText_primary: { color: '#4f46e5', fontWeight: '700', fontSize: 12 },
  badge_success: { backgroundColor: '#d1fae5' },
  badgeText_success: { color: '#065f46', fontWeight: '700', fontSize: 12 },
  badge_warning: { backgroundColor: '#fef3c7' },
  badgeText_warning: { color: '#92400e', fontWeight: '700', fontSize: 12 },
  badge_danger: { backgroundColor: '#fee2e2' },
  badgeText_danger: { color: '#991b1b', fontWeight: '700', fontSize: 12 },
  badge_neutral: { backgroundColor: '#f1f5f9' },
  badgeText_neutral: { color: '#475569', fontWeight: '600', fontSize: 12 },

  btn: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btn_md: { paddingHorizontal: 16, paddingVertical: 10 },
  btn_sm: { paddingHorizontal: 12, paddingVertical: 6 },
  btn_lg: { paddingHorizontal: 20, paddingVertical: 12 },
  btn_primary: { backgroundColor: webColors.primary },
  btnText_primary: { color: '#ffffff', fontWeight: '700' },
  btn_secondary: { backgroundColor: webColors.surfaceAlt, borderWidth: 1, borderColor: webColors.border },
  btnText_secondary: { color: webColors.text, fontWeight: '600' },
  btn_success: { backgroundColor: webColors.success },
  btnText_success: { color: '#ffffff', fontWeight: '700' },
  btn_danger: { backgroundColor: webColors.danger },
  btnText_danger: { color: '#ffffff', fontWeight: '700' },
  btn_warning: { backgroundColor: webColors.warning },
  btnText_warning: { color: '#ffffff', fontWeight: '800' },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: webFontSize.base },

  inputGroup: { marginBottom: webSpacing.md },
  inputLabel: { fontSize: webFontSize.xs, fontWeight: '600', color: webColors.text, marginBottom: 4 },
  input: {
    backgroundColor: webColors.surface,
    borderWidth: 1,
    borderColor: webColors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: webFontSize.base,
    color: webColors.text,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: webColors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 560,
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: webColors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: webColors.text },
  closeBtn: { padding: 4 },
  closeBtnText: { fontSize: 18, color: webColors.textMuted, fontWeight: '700' },
});

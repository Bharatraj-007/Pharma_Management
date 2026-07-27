/**
 * Tiny UI kit — Badge, Btn, Alert, Card, Input, Picker, TabBar, SectionHeader.
 * Import what you need: import { Badge, Btn, Alert } from '../components/ui';
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import {
  colors, spacing, fontSize, radius, scaleSize,
  badgeStyles, btnStyles, alertStyles, cardStyles, formStyles, tabStyles,
} from '../styles/theme';

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ variant = 'neutral', label, style }) {
  return (
    <View style={[badgeStyles.base, badgeStyles[variant], style]}>
      <Text style={[badgeStyles.text, badgeStyles[`${variant}Text`]]}>{label}</Text>
    </View>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Btn({
  label, onPress, variant = 'primary', size = 'md',
  block = false, disabled = false, loading = false, style,
}) {
  const sizeStyle = size === 'sm' ? btnStyles.sm : size === 'lg' ? btnStyles.lg : null;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        btnStyles.base,
        btnStyles[variant],
        sizeStyle,
        block && btnStyles.block,
        (disabled || loading) && btnStyles.disabled,
        style,
      ]}
      activeOpacity={0.75}
    >
      {loading
        ? <ActivityIndicator color="#fff" size="small" />
        : <Text style={btnStyles[`${variant}Text`] || btnStyles.primaryText}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

// ── Alert banner ──────────────────────────────────────────────────────────────
export function AlertBanner({ type = 'danger', message, style }) {
  if (!message) return null;
  return (
    <View style={[alertStyles.base, alertStyles[type], style]}>
      <Text style={[alertStyles.text, alertStyles[`${type}Text`]]}>{message}</Text>
    </View>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style, condensed, alt }) {
  return (
    <View style={[
      cardStyles.card,
      condensed && cardStyles.condensed,
      alt && cardStyles.surfaceAlt,
      style,
    ]}>
      {children}
    </View>
  );
}

export function CardHeader({ children, style }) {
  return <View style={[cardStyles.cardHeader, style]}>{children}</View>;
}

export function CardTitle({ children, style }) {
  return <Text style={[cardStyles.cardTitle, style]}>{children}</Text>;
}

// ── Text Input ────────────────────────────────────────────────────────────────
export function Input({ label, style, inputStyle, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[formStyles.group, style]}>
      {label ? <Text style={formStyles.label}>{label}</Text> : null}
      <TextInput
        style={[formStyles.input, focused && formStyles.inputFocused, inputStyle]}
        placeholderTextColor={colors.textLight}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </View>
  );
}

// ── Section header (used inside forms/lists) ──────────────────────────────────
export function SectionHeader({ title, right }) {
  return (
    <View style={sh.row}>
      <Text style={sh.title}>{title}</Text>
      {right}
    </View>
  );
}

const sh = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
});

// ── Tab bar ───────────────────────────────────────────────────────────────────
export function TabBar({ tabs, active, onChange }) {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={{ marginBottom: spacing[4] }}
      contentContainerStyle={{ paddingHorizontal: scaleSize(16) }}
    >
      <View style={tabStyles.bar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[tabStyles.tab, active === tab.key && tabStyles.tabActive]}
            onPress={() => onChange(tab.key)}
          >
            <Text style={[tabStyles.tabText, active === tab.key && tabStyles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ message = 'No data found.' }) {
  return (
    <View style={es.wrap}>
      <Text style={es.text}>{message}</Text>
    </View>
  );
}
const es = StyleSheet.create({
  wrap: { paddingVertical: spacing[8], alignItems: 'center' },
  text: { color: colors.textMuted, fontSize: fontSize.base },
});

// ── Loading spinner ───────────────────────────────────────────────────────────
export function Spinner({ color = colors.primary }) {
  return (
    <View style={{ paddingVertical: spacing[8], alignItems: 'center' }}>
      <ActivityIndicator color={color} size="large" />
    </View>
  );
}

// ── Row info (label + value pair) ─────────────────────────────────────────────
export function InfoRow({ icon, label, value }) {
  return (
    <View style={ir.wrap}>
      <Text style={ir.label}>{icon} {label}</Text>
      <Text style={ir.value}>{value || '—'}</Text>
    </View>
  );
}
const ir = StyleSheet.create({
  wrap:  { marginBottom: spacing[3] },
  label: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 2 },
  value: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
});

// ── Stat card (number + label) ────────────────────────────────────────────────
export function StatCard({ value, label, color = colors.primary, style }) {
  return (
    <Card style={[{ alignItems: 'center', flex: 1 }, style]}>
      <Text style={{ fontSize: 28, fontWeight: '800', color }}>{value}</Text>
      <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 }}>{label}</Text>
    </Card>
  );
}

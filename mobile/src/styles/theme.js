// ─────────────────────────────────────────────────────────────────────────────
// Global design tokens — used everywhere instead of raw magic values.
// ─────────────────────────────────────────────────────────────────────────────
import { Platform, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375;
const limitScale = Math.min(scale, 1.25);

export function scaleSize(size) {
  if (Platform.OS === 'web') return size;
  return Math.round(size * limitScale);
}

// ── Color palette ─────────────────────────────────────────────────────────────
export const colors = {
  primary:      '#1a56db',
  primaryLight: '#e8efff',
  accent:       '#7c3aed',
  success:      '#16a34a',
  successLight: '#dcfce7',
  warning:      '#d97706',
  warningLight: '#fef3c7',
  danger:       '#dc2626',
  dangerLight:  '#fee2e2',
  background:   '#f0f4ff',
  surface:      '#ffffff',
  surfaceAlt:   '#f8faff',
  border:       '#e2e8f0',
  text:         '#1e293b',
  textMuted:    '#64748b',
  textLight:    '#94a3b8',
  white:        '#ffffff',
  black:        '#000000',
  neutral:      '#64748b',
  neutralLight: '#f1f5f9',
};

// ── Spacing scale (matches --space-* CSS vars) ────────────────────────────────
export const spacing = {
  1: scaleSize(4),
  2: scaleSize(8),
  3: scaleSize(12),
  4: scaleSize(16),
  5: scaleSize(20),
  6: scaleSize(24),
  8: scaleSize(32),
  10: scaleSize(40),
};

// ── Font sizes ────────────────────────────────────────────────────────────────
export const fontSize = {
  xs:   scaleSize(11),
  sm:   scaleSize(13),
  base: scaleSize(15),
  md:   scaleSize(15),
  lg:   scaleSize(17),
  xl:   scaleSize(19),
  '2xl': scaleSize(22),
  '3xl': scaleSize(28),
};

// ── Border radius ─────────────────────────────────────────────────────────────
export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 999,
};

// ── Shadows ───────────────────────────────────────────────────────────────────
export const shadow = Platform.select({
  web: {
    sm: {
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
    },
    md: {
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.10)',
    },
  },
  default: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.10,
      shadowRadius: 6,
      elevation: 4,
    },
  },
});

// ── Reusable shared StyleSheets ───────────────────────────────────────────────

/** Full-screen scrollable page wrapper */
export const pageStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing[4],
    paddingBottom: spacing[10],
  },
  header: {
    marginBottom: spacing[5],
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing[1],
  },
});

/** Card */
export const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing[2],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  condensed: {
    padding: spacing[3],
  },
  surfaceAlt: {
    backgroundColor: colors.surfaceAlt,
  },
});

/** Form inputs */
export const formStyles = StyleSheet.create({
  group: {
    marginBottom: spacing[4],
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[1],
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontSize: fontSize.base,
    color: colors.text,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  pickerWrapper: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
});

/** Buttons */
export const btnStyles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  sm: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  lg: {
    paddingVertical: spacing[4],
  },
  block: {
    width: '100%',
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.neutralLight, borderWidth: 1, borderColor: colors.border },
  success: { backgroundColor: colors.success },
  danger: { backgroundColor: colors.danger },
  warning: { backgroundColor: colors.warning },
  // label colours
  primaryText:   { color: '#fff', fontWeight: '700', fontSize: fontSize.base },
  secondaryText: { color: colors.text, fontWeight: '600', fontSize: fontSize.base },
  successText:   { color: '#fff', fontWeight: '700', fontSize: fontSize.base },
  dangerText:    { color: '#fff', fontWeight: '700', fontSize: fontSize.base },
  warningText:   { color: '#fff', fontWeight: '700', fontSize: fontSize.base },
  disabled:      { opacity: 0.55 },
});

/** Badge */
export const badgeStyles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: { fontSize: fontSize.xs, fontWeight: '700' },
  primary: { backgroundColor: colors.primaryLight },
  primaryText: { color: colors.primary },
  success: { backgroundColor: colors.successLight },
  successText: { color: colors.success },
  warning: { backgroundColor: colors.warningLight },
  warningText: { color: colors.warning },
  danger: { backgroundColor: colors.dangerLight },
  dangerText: { color: colors.danger },
  neutral: { backgroundColor: colors.neutralLight },
  neutralText: { color: colors.neutral },
});

/** Alert banners */
export const alertStyles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[3],
    borderLeftWidth: 4,
  },
  text: { fontSize: fontSize.sm, fontWeight: '500' },
  success: { backgroundColor: colors.successLight, borderLeftColor: colors.success },
  successText: { color: colors.success },
  danger:  { backgroundColor: colors.dangerLight,  borderLeftColor: colors.danger },
  dangerText:  { color: colors.danger },
  warning: { backgroundColor: colors.warningLight, borderLeftColor: colors.warning },
  warningText: { color: colors.warning },
  primary: { backgroundColor: colors.primaryLight, borderLeftColor: colors.primary },
  primaryText: { color: colors.primary },
});

/** Tab bar */
export const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 4,
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    gap: scaleSize(8),
  },
  tab: {
    paddingVertical: spacing[2],
    paddingHorizontal: scaleSize(16),
    minWidth: scaleSize(100),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#fff',
  },
});

/** Auth page (Login, Signup) */
export const authStyles = StyleSheet.create({
  page: {
    flexGrow: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing[5],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[6],
    ...shadow.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing[1],
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing[5],
  },
});

// ── Convenience helpers ───────────────────────────────────────────────────────

/** Map a status string → badge variant key */
export function statusBadgeVariant(status) {
  const s = String(status || '').toLowerCase();
  switch (s) {
    case 'present':
    case 'early':
    case 'on time':
    case 'on-time':
      return 'success';
    case 'absent':
      return 'danger';
    case 'half-day':
    case 'half day':
    case 'pending':
      return 'warning';
    case 'late':
    case 'in-progress':
      return 'primary';
    case 'completed':
      return 'success';
    default:
      return 'neutral';
  }
}

/** Map a role string → badge variant key */
export function roleBadgeVariant(role) {
  switch (role) {
    case 'ceo':     return 'danger';
    case 'admin':   return 'primary';
    case 'manager': return 'warning';
    default:        return 'success';
  }
}

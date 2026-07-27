import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';

import { AuthContext } from './AuthContext';
import { MENU_ITEMS, PERMISSIONS, COMPANY_NAMES } from '../utils/permissions';
import { colors, spacing, fontSize, radius } from '../styles/theme';

// ── Auth Screens ──────────────────────────────────────────────────────────────
import LoginScreen    from '../screens/auth/LoginScreen';
import SignupScreen   from '../screens/auth/SignupScreen';
import VerifyOTPScreen from '../screens/auth/VerifyOTPScreen';

// ── Main Screens ──────────────────────────────────────────────────────────────
import DashboardRouter      from '../screens/dashboard/DashboardRouter';
import TasksScreen          from '../screens/TasksScreen';
import InventoryScreen      from '../screens/InventoryScreen';
import AttendanceScreen     from '../screens/AttendanceScreen';
import LeaveScreen          from '../screens/LeaveScreen';
import ReportsScreen        from '../screens/ReportsScreen';
import ChatScreen           from '../screens/ChatScreen';
import SettingsScreen       from '../screens/SettingsScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import AuditLogsScreen      from '../screens/AuditLogsScreen';
import SalaryManagementScreen from '../screens/SalaryManagementScreen';
import ProfileScreen        from '../screens/ProfileScreen';

const Stack  = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// ── Custom Drawer Content ─────────────────────────────────────────────────────
function CustomDrawerContent(props) {
  const { session, signOut } = useContext(AuthContext);
  const role = (session?.role || 'worker').toLowerCase();

  const mainItems  = MENU_ITEMS.filter(
    (item) => item.section === 'main' && PERMISSIONS[item.key]?.includes(role),
  );
  const adminItems = MENU_ITEMS.filter(
    (item) => item.section === 'admin' && PERMISSIONS[item.key]?.includes(role),
  );

  const NavItem = ({ item }) => {
    const active = props.state.routes[props.state.index]?.name === item.screen;
    return (
      <TouchableOpacity
        style={[styles.navItem, active && styles.navItemActive]}
        onPress={() => props.navigation.navigate(item.screen)}
      >
        <Text style={styles.navIcon}>{item.icon}</Text>
        <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flexGrow: 1 }}>
      {/* Brand */}
      <View style={styles.brandBox}>
        <Text style={styles.brandText}>💊 Smart Pharma</Text>
      </View>

      {/* User card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(session?.name || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.userName}>{session?.name || 'User'}</Text>
          <Text style={styles.userRole}>{role.toUpperCase()}</Text>
          {session?.company && (
            <Text style={styles.userCompany}>
              {COMPANY_NAMES[session.company] || session.company}
            </Text>
          )}
        </View>
      </View>

      {/* Main nav */}
      {mainItems.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>MAIN</Text>
          {mainItems.map((item) => <NavItem key={item.key} item={item} />)}
        </>
      )}

      {/* Admin nav */}
      {adminItems.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>ADMINISTRATION</Text>
          {adminItems.map((item) => <NavItem key={item.key} item={item} />)}
        </>
      )}

      {/* Sign out at bottom */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={[styles.navItem, styles.signOutItem]} onPress={signOut}>
          <Text style={styles.navIcon}>🚪</Text>
          <Text style={[styles.navLabel, { color: colors.danger }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

// ── Drawer Navigator (authenticated) ─────────────────────────────────────────
function MainDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', fontSize: fontSize.lg },
        drawerStyle: { backgroundColor: colors.surface, width: 280 },
      }}
    >
      <Drawer.Screen name="Dashboard"         component={DashboardRouter}         options={{ title: '📊 Dashboard' }} />
      <Drawer.Screen name="Tasks"             component={TasksScreen}             options={{ title: '📋 Tasks' }} />
      <Drawer.Screen name="Inventory"         component={InventoryScreen}         options={{ title: '📦 Inventory' }} />
      <Drawer.Screen name="Attendance"        component={AttendanceScreen}        options={{ title: '⏱️ Attendance' }} />
      <Drawer.Screen name="Leave"             component={LeaveScreen}             options={{ title: '🗓️ Leave' }} />
      <Drawer.Screen name="Reports"           component={ReportsScreen}           options={{ title: '📈 Reports' }} />
      <Drawer.Screen name="Chat"              component={ChatScreen}              options={{ title: '💬 Messages' }} />
      <Drawer.Screen name="Settings"          component={SettingsScreen}          options={{ title: '⚙️ Settings' }} />
      <Drawer.Screen name="UserManagement"    component={UserManagementScreen}    options={{ title: '👥 Users' }} />
      <Drawer.Screen name="AuditLogs"         component={AuditLogsScreen}         options={{ title: '🔍 Audit Logs' }} />
      <Drawer.Screen name="SalaryManagement"  component={SalaryManagementScreen}  options={{ title: '💰 Salary' }} />
      <Drawer.Screen name="Profile"           component={ProfileScreen}           options={{ title: '👤 Profile' }} />
    </Drawer.Navigator>
  );
}

// ── Auth Stack (unauthenticated) ──────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"     component={LoginScreen} />
      <Stack.Screen name="Signup"    component={SignupScreen} />
      <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
    </Stack.Navigator>
  );
}

// ── Root Navigator ────────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { session, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session?.token ? <MainDrawer /> : <AuthStack />}
    </NavigationContainer>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loader: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.background,
  },
  brandBox: {
    backgroundColor: colors.primary,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
  },
  brandText: {
    color: '#fff', fontSize: fontSize['2xl'], fontWeight: '800',
  },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    paddingHorizontal: spacing[4], paddingVertical: spacing[4],
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: fontSize.lg },
  userName: { fontWeight: '700', fontSize: fontSize.base, color: colors.text },
  userRole: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600', marginTop: 1 },
  userCompany: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  sectionLabel: {
    fontSize: fontSize.xs, fontWeight: '700', color: colors.textMuted,
    paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[1],
    letterSpacing: 0.8,
  },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderRadius: radius.md, marginHorizontal: spacing[2], marginVertical: 2,
  },
  navItemActive: { backgroundColor: colors.primaryLight },
  navIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  navLabel: { fontSize: fontSize.base, color: colors.text, fontWeight: '500' },
  navLabelActive: { color: colors.primary, fontWeight: '700' },
  bottomActions: {
    marginTop: 'auto',
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing[2],
  },
  signOutItem: {},
});

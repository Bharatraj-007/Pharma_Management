import React, { useContext, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform, Alert,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

import { AuthContext } from './AuthContext';
import { MENU_ITEMS, PERMISSIONS, COMPANY_NAMES } from '../utils/permissions';
import { colors, spacing, fontSize, radius } from '../styles/theme';
import API_BASE_URL from '../config';
import NotificationBell from '../components/NotificationBell';

// ── Auth Screens ──────────────────────────────────────────────────────────────
import LoginScreen     from '../screens/auth/LoginScreen';
import SignupScreen    from '../screens/auth/SignupScreen';
import VerifyOTPScreen from '../screens/auth/VerifyOTPScreen';

// ── Main Screens ──────────────────────────────────────────────────────────────
import DashboardRouter        from '../screens/dashboard/DashboardRouter';
import TasksScreen            from '../screens/TasksScreen';
import InventoryScreen        from '../screens/InventoryScreen';
import AttendanceScreen       from '../screens/AttendanceScreen';
import LeaveScreen            from '../screens/LeaveScreen';
import ReportsScreen          from '../screens/ReportsScreen';
import ChatScreen             from '../screens/ChatScreen';
import SettingsScreen         from '../screens/SettingsScreen';
import UserManagementScreen   from '../screens/UserManagementScreen';
import AuditLogsScreen        from '../screens/AuditLogsScreen';
import SalaryManagementScreen from '../screens/SalaryManagementScreen';
import ProfileScreen          from '../screens/ProfileScreen';
import DispatchScreen         from '../screens/DispatchScreen';

// ── Notification handler — only set in custom dev client, NOT Expo Go ─────────
// expo-notifications push functionality was removed from Expo Go in SDK 53.
// We guard this so the app doesn't crash in Expo Go.
const IS_EXPO_GO = typeof __DEV__ !== 'undefined' && !global.expo?.modules?.ExpoUpdates;

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  // Silently ignore in Expo Go — will work in dev client / production build
}

// ── Register device for push notifications ────────────────────────────────────
async function registerForPushNotifications() {
  // Push notifications require a real physical device
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device.');
    return null;
  }

  // Request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Enable notifications in Settings to receive task and attendance alerts.',
    );
    return null;
  }

  // Set Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Smart Pharma',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1a56db',
      sound: true,
    });
    await Notifications.setNotificationChannelAsync('tasks', {
      name: 'Task Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1a56db',
    });
    await Notifications.setNotificationChannelAsync('attendance', {
      name: 'Attendance Alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Get Expo push token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (err) {
    console.log('Push token error (normal in dev client without projectId):', err.message);
    return null;
  }
}

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
        <Text style={[styles.navLabel, active && styles.navLabelActive]}>
          {item.label}
        </Text>
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
        <View style={{ flex: 1 }}>
          <Text style={styles.userName} numberOfLines={1}>
            {session?.name || 'User'}
          </Text>
          <Text style={styles.userRole}>{role.toUpperCase()}</Text>
          {session?.company && (
            <Text style={styles.userCompany} numberOfLines={1}>
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

      {/* Sign out */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.navItem} onPress={signOut}>
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
        // 🔔 Notification bell shown on every screen header
        headerRight: () => <NotificationBell />,
      }}
    >
      <Drawer.Screen name="Dashboard"        component={DashboardRouter}        options={{ title: '📊 Dashboard' }} />
      <Drawer.Screen name="Tasks"            component={TasksScreen}            options={{ title: '📋 Tasks' }} />
      <Drawer.Screen name="Inventory"        component={InventoryScreen}        options={{ title: '📦 Inventory' }} />
      <Drawer.Screen name="Dispatch"         component={DispatchScreen}         options={{ title: '🚚 Dispatch' }} />
      <Drawer.Screen name="Attendance"       component={AttendanceScreen}       options={{ title: '⏱️ Attendance' }} />
      <Drawer.Screen name="Leave"            component={LeaveScreen}            options={{ title: '🗓️ Leave' }} />
      <Drawer.Screen name="Reports"          component={ReportsScreen}          options={{ title: '📈 Reports' }} />
      <Drawer.Screen name="Chat"             component={ChatScreen}             options={{ title: '💬 Messages' }} />
      <Drawer.Screen name="Settings"         component={SettingsScreen}         options={{ title: '⚙️ Settings' }} />
      <Drawer.Screen name="UserManagement"   component={UserManagementScreen}   options={{ title: '👥 Users' }} />
      <Drawer.Screen name="AuditLogs"        component={AuditLogsScreen}        options={{ title: '🔍 Audit Logs' }} />
      <Drawer.Screen name="SalaryManagement" component={SalaryManagementScreen} options={{ title: '💰 Salary' }} />
      <Drawer.Screen name="Profile"          component={ProfileScreen}          options={{ title: '👤 Profile' }} />
    </Drawer.Navigator>
  );
}

// ── Auth Stack ────────────────────────────────────────────────────────────────
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
  const notificationListener = useRef();
  const responseListener     = useRef();

  // Register push notifications once user is logged in
  useEffect(() => {
    if (!session?.token) return;

    // Register device and send token to backend
    // Wrapped in try/catch — silently skipped in Expo Go
    (async () => {
      try {
        const pushToken = await registerForPushNotifications();
        if (!pushToken) return;
        console.log('Expo Push Token:', pushToken);
        try {
          await fetch(`${API_BASE_URL}/api/register-push-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: session.token,
            },
            body: JSON.stringify({ token: pushToken }),
          });
        } catch (err) {
          console.log('Could not save push token to backend:', err.message);
        }
      } catch (e) {
        // expo-notifications not available in Expo Go — ignore
        console.log('Push notifications not available in this runtime.');
      }
    })();

    // Listen for notifications — guarded for Expo Go
    try {
      notificationListener.current = Notifications.addNotificationReceivedListener(
        (notification) => { console.log('Notification received:', notification); },
      );
      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        (response) => { console.log('Notification tapped:', response); },
      );
    } catch (e) {
      // Silently ignore in Expo Go
    }

    return () => {
      try {
        if (notificationListener.current)
          Notifications.removeNotificationSubscription(notificationListener.current);
        if (responseListener.current)
          Notifications.removeNotificationSubscription(responseListener.current);
      } catch (e) { /* ignore */ }
    };
  }, [session?.token]);

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
  brandText: { color: '#fff', fontSize: fontSize['2xl'], fontWeight: '800' },
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
  avatarText:  { color: '#fff', fontWeight: '700', fontSize: fontSize.lg },
  userName:    { fontWeight: '700', fontSize: fontSize.base, color: colors.text },
  userRole:    { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600', marginTop: 1 },
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
  navItemActive:  { backgroundColor: colors.primaryLight },
  navIcon:        { fontSize: 18, width: 24, textAlign: 'center' },
  navLabel:       { fontSize: fontSize.base, color: colors.text, fontWeight: '500' },
  navLabelActive: { color: colors.primary, fontWeight: '700' },
  bottomActions: {
    marginTop: 'auto',
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing[2],
  },
});

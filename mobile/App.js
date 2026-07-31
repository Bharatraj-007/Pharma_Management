/**
 * App.js — root entry point for Smart Pharma Mobile (Expo)
 *
 * Responsibilities:
 *  1. Wrap everything in SafeAreaProvider (required by react-native-safe-area-context)
 *  2. Wrap everything in GestureHandlerRootView (required by react-native-gesture-handler / Drawer)
 *  3. Provide the AuthContext (session state + signIn / signOut)
 *  4. Render AppNavigator which shows Auth stack or Main Drawer based on session
 */
import 'react-native-gesture-handler'; // ← must be the FIRST import
import React from 'react';
import { Text, View, LogBox } from 'react-native';

LogBox.ignoreLogs([
  '[expo-av]: Expo AV has been deprecated',
  '`ImagePicker.MediaTypeOptions` have been deprecated',
]);
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/navigation/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <GestureHandlerRootView style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
          <SafeAreaProvider>
            <StatusBar style="dark" />
            <View>
              <Text style={{ color: '#1e293b', fontSize: 20, fontWeight: '700', marginBottom: 12 }}>
                App screen failed to render
              </Text>
              <Text style={{ color: '#475569' }}>
                {String(this.state.error?.message || this.state.error)}
              </Text>
            </View>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthProvider>
            <StatusBar style="light" backgroundColor="#1a56db" />
            <AppNavigator />
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}

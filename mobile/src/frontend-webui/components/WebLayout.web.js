import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import WebNavbar from './WebNavbar.web';
import WebSidebar from './WebSidebar.web';

export default function WebLayout({ session, activeRoute, onNavigate, onLogout, onChangeCompany, children }) {
  return (
    <View style={styles.layout}>
      {/* Top Navbar */}
      <WebNavbar session={session} onLogout={onLogout} onChangeCompany={onChangeCompany} />

      {/* Main Body */}
      <View style={styles.body}>
        {/* Left Sidebar */}
        <WebSidebar session={session} activeRoute={activeRoute} onNavigate={onNavigate} onLogout={onLogout} />

        {/* Right Main Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1, backgroundColor: '#f8fafc' },
  body: { flex: 1, flexDirection: 'row' },
  content: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 24 },
});

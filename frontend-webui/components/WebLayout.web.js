import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import WebNavbar from './WebNavbar.web';
import WebSidebar from './WebSidebar.web';
import { webColors, webSpacing } from '../styles/webTheme';

export default function WebLayout({ children, session, activeKey, activeRoute, onSelectKey, onNavigate, onLogout, onChangeCompany }) {
  const [collapsed, setCollapsed] = useState(false);
  const currentActiveKey = activeKey || activeRoute || 'dashboard';
  const handleSelectKey = onSelectKey || onNavigate || (() => {});

  return (
    <View style={styles.container}>
      <WebNavbar
        session={session}
        onToggleSidebar={() => setCollapsed(!collapsed)}
        onLogout={onLogout}
        onChangeCompany={onChangeCompany}
      />
      <View style={styles.body}>
        <WebSidebar
          activeKey={currentActiveKey}
          onSelectKey={handleSelectKey}
          session={session}
          collapsed={collapsed}
          onLogout={onLogout}
        />
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: webColors.bg },
  body: { flex: 1, flexDirection: 'row' },
  content: { flex: 1 },
  contentContainer: { padding: webSpacing.xxl, maxWidth: 1400, width: '100%', alignSelf: 'center' },
});

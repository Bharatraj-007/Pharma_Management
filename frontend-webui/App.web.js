import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import WebLayout from './components/WebLayout.web';
import DashboardScreen from './screens/DashboardScreen.web';
import ClientCompanyScreen from './screens/ClientCompanyScreen.web';
import DispatchScreen from './screens/DispatchScreen.web';
import InventoryScreen from './screens/InventoryScreen.web';
import ProductMasterScreen from './screens/ProductMasterScreen.web';
import AttendanceScreen from './screens/AttendanceScreen.web';
import TasksScreen from './screens/TasksScreen.web';
import FinanceScreen from './screens/FinanceScreen.web';
import ChatScreen from './screens/ChatScreen.web';
import LeaveScreen from './screens/LeaveScreen.web';
import SalaryManagementScreen from './screens/SalaryManagementScreen.web';
import UserManagementScreen from './screens/UserManagementScreen.web';
import SignupRequestsScreen from './screens/SignupRequestsScreen.web';
import ReportsScreen from './screens/ReportsScreen.web';
import AuditLogsScreen from './screens/AuditLogsScreen.web';
import ProfileScreen from './screens/ProfileScreen.web';

import API_BASE_URL from '../mobile/src/config';

export default function WebApp() {
  const [session, setSession] = useState(null);
  const [activeKey, setActiveKey] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('smart_pharma_session');
      if (stored) setSession(JSON.parse(stored));
    } catch (e) {}
    finally { setLoading(false); }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('smart_pharma_session');
    setSession(null);
    window.location.reload();
  };

  const handleChangeCompany = (companyCode) => {
    const updated = { ...session, activeCompany: companyCode };
    setSession(updated);
    localStorage.setItem('smart_pharma_session', JSON.stringify(updated));
  };

  if (loading) return null;

  if (!session) {
    return (
      <View style={styles.loginCenter}>
        <Text style={styles.loginTitle}>💊 Smart Pharma System — Web Portal</Text>
        <Text style={styles.loginSub}>Please log in on the mobile app or backend to obtain session, or use mobile app credentials.</Text>
      </View>
    );
  }

  const renderScreen = () => {
    switch (activeKey) {
      case 'dashboard':
        return <DashboardScreen apiBaseUrl={API_BASE_URL} session={session} onNavigate={setActiveKey} />;
      case 'clientCompany':
        return <ClientCompanyScreen apiBaseUrl={API_BASE_URL} session={session} />;
      case 'dispatch':
        return <DispatchScreen apiBaseUrl={API_BASE_URL} session={session} />;
      case 'stock':
        return <InventoryScreen apiBaseUrl={API_BASE_URL} session={session} />;
      case 'products':
        return <ProductMasterScreen apiBaseUrl={API_BASE_URL} session={session} />;
      case 'attendance':
        return <AttendanceScreen apiBaseUrl={API_BASE_URL} session={session} />;
      case 'tasks':
        return <TasksScreen apiBaseUrl={API_BASE_URL} session={session} />;
      case 'finance':
        return <FinanceScreen apiBaseUrl={API_BASE_URL} session={session} />;
      case 'chat':
        return <ChatScreen apiBaseUrl={API_BASE_URL} session={session} />;
      case 'leaveManagement':
        return <LeaveScreen apiBaseUrl={API_BASE_URL} session={session} />;
      case 'salaryManagement':
        return <SalaryManagementScreen apiBaseUrl={API_BASE_URL} session={session} />;
      case 'userManagement':
        return <UserManagementScreen apiBaseUrl={API_BASE_URL} session={session} />;
      case 'signupRequests':
        return <SignupRequestsScreen apiBaseUrl={API_BASE_URL} session={session} />;
      case 'reports':
        return <ReportsScreen apiBaseUrl={API_BASE_URL} session={session} />;
      case 'auditLogs':
        return <AuditLogsScreen apiBaseUrl={API_BASE_URL} session={session} />;
      case 'settings':
      case 'profile':
        return <ProfileScreen session={session} />;
      default:
        return <DashboardScreen apiBaseUrl={API_BASE_URL} session={session} onNavigate={setActiveKey} />;
    }
  };

  return (
    <WebLayout
      session={session}
      activeKey={activeKey}
      onSelectKey={setActiveKey}
      onLogout={handleLogout}
      onChangeCompany={handleChangeCompany}
    >
      {renderScreen()}
    </WebLayout>
  );
}

const styles = StyleSheet.create({
  loginCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#f8fafc' },
  loginTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  loginSub: { fontSize: 14, color: '#475569', marginTop: 8 },
});

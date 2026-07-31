import React, { useContext } from 'react';
import { Platform } from 'react-native';
import { AuthContext } from '../../navigation/AuthContext';
import WorkerDashboard   from './WorkerDashboard';
import AdminDashboard    from './AdminDashboard';
import ManagerDashboard  from './ManagerDashboard';
import CEODashboard      from './CEODashboard';
import DashboardPage     from './DashboardPage';
import DashboardScreenWeb from '../../frontend-webui/screens/DashboardScreen.web';
import API_BASE_URL from '../../config';

export default function DashboardRouter(props) {
  const { session } = useContext(AuthContext);
  const role = (session?.role || 'worker').toLowerCase();

  if (Platform.OS === 'web') {
    return <DashboardScreenWeb apiBaseUrl={API_BASE_URL} session={session} {...props} />;
  }

  if (role === 'admin')   return <AdminDashboard />;
  if (role === 'manager') return <ManagerDashboard />;
  if (role === 'ceo')     return <CEODashboard />;
  if (role === 'worker')  return <WorkerDashboard />;
  return <DashboardPage />;
}

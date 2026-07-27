import React, { useContext } from 'react';
import { AuthContext } from '../../navigation/AuthContext';
import WorkerDashboard   from './WorkerDashboard';
import AdminDashboard    from './AdminDashboard';
import ManagerDashboard  from './ManagerDashboard';
import CEODashboard      from './CEODashboard';
import DashboardPage     from './DashboardPage';

export default function DashboardRouter() {
  const { session } = useContext(AuthContext);
  const role = (session?.role || 'worker').toLowerCase();

  if (role === 'admin')   return <AdminDashboard />;
  if (role === 'manager') return <ManagerDashboard />;
  if (role === 'ceo')     return <CEODashboard />;
  if (role === 'worker')  return <WorkerDashboard />;
  return <DashboardPage />;
}

import React from 'react';
import DashboardScreenWebPortal from '../../../frontend-webui/screens/DashboardScreen.web';
import { useDashboardLogic } from './useDashboardLogic';

export default function DashboardScreen(props) {
  const { session } = useDashboardLogic();
  return <DashboardScreenWebPortal apiBaseUrl={require('../../config').default} session={session} {...props} />;
}

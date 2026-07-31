import React from 'react';
import AttendanceScreenWebPortal from '../../../frontend-webui/screens/AttendanceScreen.web';
import { useAttendanceLogic } from './useAttendanceLogic';

export default function AttendanceScreen() {
  const { session } = useAttendanceLogic();
  return <AttendanceScreenWebPortal apiBaseUrl={require('../../config').default} session={session} />;
}

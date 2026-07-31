import React from 'react';
import TasksScreenWebPortal from '../../../frontend-webui/screens/TasksScreen.web';
import { useTasksLogic } from './useTasksLogic';

export default function TasksScreen() {
  const { session } = useTasksLogic();
  return <TasksScreenWebPortal apiBaseUrl={require('../../config').default} session={session} />;
}

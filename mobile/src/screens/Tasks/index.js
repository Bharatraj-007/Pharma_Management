import TasksScreenWeb from './TasksScreen.web';
import TasksScreenNative from './TasksScreen.native';
import { Platform } from 'react-native';

const TasksScreen = Platform.OS === 'web' ? TasksScreenWeb : TasksScreenNative;
export default TasksScreen;

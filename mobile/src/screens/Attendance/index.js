import AttendanceScreenWeb from './AttendanceScreen.web';
import AttendanceScreenNative from './AttendanceScreen.native';
import { Platform } from 'react-native';

const AttendanceScreen = Platform.OS === 'web' ? AttendanceScreenWeb : AttendanceScreenNative;
export default AttendanceScreen;

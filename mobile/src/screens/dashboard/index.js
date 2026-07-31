import DashboardScreenWeb from './DashboardScreen.web';
import DashboardScreenNative from './DashboardScreen.native';
import { Platform } from 'react-native';

const DashboardScreen = Platform.OS === 'web' ? DashboardScreenWeb : DashboardScreenNative;
export default DashboardScreen;

import DispatchScreenWeb from './DispatchScreen.web';
import DispatchScreenNative from './DispatchScreen.native';
import { Platform } from 'react-native';

const DispatchScreen = Platform.OS === 'web' ? DispatchScreenWeb : DispatchScreenNative;
export default DispatchScreen;

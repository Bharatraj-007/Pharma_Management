// ─────────────────────────────────────────────────────────────────────────────
// API_BASE_URL
// Change this to your laptop's local-network IP address so Expo Go on your
// phone can reach the Express backend.
//
// How to find your IP:
//   Windows  → run "ipconfig"  → look for IPv4 Address (e.g. 192.168.1.42)
//   macOS    → run "ifconfig"  → look for inet under en0
//
// Then set: http://<your-ip>:5001
// ─────────────────────────────────────────────────────────────────────────────
import { Platform } from 'react-native';

const LAN_API_BASE_URL = 'http://10.31.112.59:5001'; // Wi-Fi IP for Expo Go on phone
const WEB_API_BASE_URL = 'http://localhost:5001';

const API_BASE_URL = Platform.OS === 'web' ? WEB_API_BASE_URL : LAN_API_BASE_URL;

export default API_BASE_URL;

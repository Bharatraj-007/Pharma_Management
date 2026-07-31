// ─────────────────────────────────────────────────────────────────────────────
// API_BASE_URL Config Engine
//
// 1. Online Deployed Backend (Render / Railway / Cloud / Domain):
//    Set process.env.EXPO_PUBLIC_API_BASE_URL or override below.
// 2. Web Browser:
//    Automatically detects server hostname if running in web browser.
// 3. Local Development / Wi-Fi fallback.
// ─────────────────────────────────────────────────────────────────────────────
const ONLINE_BACKEND_URL = process.env.EXPO_PUBLIC_API_BASE_URL || '';

let API_BASE_URL = 'http://10.241.15.59:5001';

if (ONLINE_BACKEND_URL) {
  API_BASE_URL = ONLINE_BACKEND_URL;
} else if (typeof window !== 'undefined' && window.location && window.location.hostname) {
  const host = window.location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    API_BASE_URL = `${window.location.protocol}//${host}:5001`;
  }
}

export default API_BASE_URL;


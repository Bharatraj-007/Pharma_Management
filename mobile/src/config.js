// ─────────────────────────────────────────────────────────────────────────────
// API_BASE_URL Config Engine
//
// Online Deployed Backend (Render):
//   https://pharma-management-ioat.onrender.com
// ─────────────────────────────────────────────────────────────────────────────
const ONLINE_BACKEND_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://pharma-management-ioat.onrender.com';

let API_BASE_URL = ONLINE_BACKEND_URL;

if (typeof window !== 'undefined' && window.location && window.location.hostname) {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    API_BASE_URL = 'http://localhost:5001';
  }
}

export default API_BASE_URL;

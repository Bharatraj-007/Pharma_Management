/**
 * Network connectivity testing utility
 */
import API_BASE_URL from '../config';

export async function testBackendConnection() {
  const tests = [];
  
  // Test 1: Can we reach the root endpoint?
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(API_BASE_URL, {
      signal: controller.signal,
      headers: { 'Accept': 'text/html' }
    });
    clearTimeout(timeout);
    
    tests.push({
      name: 'Backend Root',
      url: API_BASE_URL,
      status: response.ok ? '✅ Connected' : `⚠️ Status ${response.status}`,
      success: response.ok
    });
  } catch (err) {
    tests.push({
      name: 'Backend Root',
      url: API_BASE_URL,
      status: `❌ ${err.message}`,
      success: false,
      error: err.message
    });
  }

  // Test 2: Can we reach the tasks endpoint?
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);
    
    tests.push({
      name: 'Tasks Endpoint',
      url: `${API_BASE_URL}/tasks`,
      status: response.ok ? '✅ Connected' : `⚠️ Status ${response.status}`,
      success: response.status < 500 // Even 401/403 means server is reachable
    });
  } catch (err) {
    tests.push({
      name: 'Tasks Endpoint',
      url: `${API_BASE_URL}/tasks`,
      status: `❌ ${err.message}`,
      success: false,
      error: err.message
    });
  }

  return tests;
}

export function formatTestResults(tests) {
  const allSuccess = tests.every(t => t.success);
  
  let message = tests.map(t => 
    `${t.name}:\n${t.status}\n${t.url}`
  ).join('\n\n');

  if (!allSuccess) {
    message += '\n\n⚠️ Troubleshooting:\n';
    message += '• Check phone & laptop are on same Wi-Fi\n';
    message += '• Backend must be running on laptop\n';
    message += '• Windows Firewall may be blocking port 5001\n';
    message += '• Try restarting the backend server';
  }

  return { allSuccess, message };
}

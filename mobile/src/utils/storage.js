/**
 * Async-storage helpers that mirror the localStorage API used by the web app.
 * Every function is async — await them or chain .then().
 *
 * Supported keys used across the app:
 *   token, role, name, company, companyName, userId,
 *   theme, notify_tasks, notify_schedule, notify_announcements,
 *   supervisorId, workerId
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  /** Store a string value */
  setItem: (key, value) => AsyncStorage.setItem(key, String(value ?? '')),

  /** Retrieve a string value (returns null if not set) */
  getItem: (key) => AsyncStorage.getItem(key),

  /** Remove a single key */
  removeItem: (key) => AsyncStorage.removeItem(key),

  /** Remove multiple keys at once */
  multiRemove: (keys) => AsyncStorage.multiRemove(keys),

  /** Clear EVERYTHING — used for sign-out */
  clear: () => AsyncStorage.clear(),

  /** Store a JSON-serialisable value */
  setJSON: (key, value) => AsyncStorage.setItem(key, JSON.stringify(value)),

  /** Retrieve and parse a JSON value (returns fallback on parse failure) */
  getJSON: async (key, fallback = null) => {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
};

/**
 * Load the auth session into a plain object.
 * Returns { token, role, name, company, companyName, userId } or all-null values.
 */
export async function loadSession() {
  const [token, role, name, company, companyName, userId] = await Promise.all([
    AsyncStorage.getItem('token'),
    AsyncStorage.getItem('role'),
    AsyncStorage.getItem('name'),
    AsyncStorage.getItem('company'),
    AsyncStorage.getItem('companyName'),
    AsyncStorage.getItem('userId'),
  ]);
  return { token, role, name, company, companyName, userId };
}

/**
 * Persist login response from the server.
 */
export async function saveSession({ token, role, name, company, companyName, userId }) {
  const pairs = [];
  if (token)       pairs.push(['token', token]);
  if (role)        pairs.push(['role', role]);
  if (name)        pairs.push(['name', name]);
  if (company)     pairs.push(['company', company]);
  if (companyName) pairs.push(['companyName', companyName]);
  if (userId)      pairs.push(['userId', String(userId)]);
  if (pairs.length) await AsyncStorage.multiSet(pairs);
}

/**
 * Wipe all auth keys — call on sign-out.
 */
export function clearSession() {
  return AsyncStorage.multiRemove([
    'token', 'role', 'name', 'company', 'companyName', 'userId',
    'supervisorId', 'workerId',
  ]);
}

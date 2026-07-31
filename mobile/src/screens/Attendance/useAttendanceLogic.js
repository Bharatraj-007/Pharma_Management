import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../../navigation/AuthContext';
import API_BASE_URL from '../../config';

export function useAttendanceLogic() {
  const { session } = useContext(AuthContext);
  const token = session?.token;
  const role = (session?.role || 'worker').toLowerCase();
  const userName = session?.name || 'Worker';
  const today = new Date().toISOString().split('T')[0];

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRecords = useCallback(async (selectedDate) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const targetDate = selectedDate || today;
      const res = await fetch(`${API_BASE_URL}/attendance?date=${targetDate}`, {
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error('Failed to load attendance');
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, today]);

  useEffect(() => {
    fetchRecords(today);
  }, [fetchRecords, today]);

  return {
    session,
    role,
    userName,
    today,
    records,
    loading,
    error,
    fetchRecords,
  };
}

import { useState, useEffect, useCallback } from 'react';

export function useAttendance(apiBaseUrl, token, role, userName) {
  const today = new Date().toISOString().split('T')[0];

  const [records, setRecords] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [todayEntry, setTodayEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isManager = ['admin', 'manager', 'ceo'].includes(role);

  const fetchRecords = useCallback(async (selectedDate, workerName, statusFilter) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams();
      const targetDate = selectedDate || today;
      q.set('date', targetDate);
      if (workerName) q.set('workerName', workerName);
      if (statusFilter) q.set('status', statusFilter);

      const res = await fetch(`${apiBaseUrl}/attendance?${q}`, {
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error('Failed to load attendance records');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setRecords(list);

      if (targetDate === today) {
        setTodayEntry(list.find((r) => r.workerName === userName) || null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, token, today, userName]);

  const fetchWorkers = useCallback(async () => {
    if (!token || !isManager) return;
    try {
      const res = await fetch(`${apiBaseUrl}/workers`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const data = await res.json();
        setWorkers(Array.isArray(data) ? data : []);
      }
    } catch (e) {}
  }, [apiBaseUrl, token, isManager]);

  const submitCheckInOrOut = async (status) => {
    setError('');
    setSuccess('');
    try {
      const body = {
        workerName: userName,
        date: today,
        status: status === 'checkout' ? 'checkout' : 'Present',
      };
      const res = await fetch(`${apiBaseUrl}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check-in/out failed');
      setSuccess(status === 'checkout' ? 'Checked out successfully!' : 'Checked in successfully!');
      fetchRecords(today);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const managerMarkAttendance = async (targetWorker, status, notes, targetDate) => {
    setError('');
    setSuccess('');
    try {
      const body = {
        workerName: targetWorker,
        date: targetDate || today,
        status: status || 'Present',
        notes: notes || '',
      };
      const res = await fetch(`${apiBaseUrl}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark attendance');
      setSuccess('Attendance marked successfully!');
      fetchRecords(targetDate || today);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  useEffect(() => {
    fetchRecords(today);
    fetchWorkers();
  }, [fetchRecords, fetchWorkers, today]);

  return {
    records,
    workers,
    todayEntry,
    loading,
    error,
    success,
    today,
    fetchRecords,
    submitCheckInOrOut,
    managerMarkAttendance,
  };
}

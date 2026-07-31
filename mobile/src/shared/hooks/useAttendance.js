import { useState, useEffect, useCallback } from 'react';

export function useAttendance(apiBaseUrl, token, userRole, company, activeCompany) {
  const [records, setRecords] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [todayEntry, setTodayEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const effectiveCompany = userRole === 'ceo' && activeCompany !== 'all' ? activeCompany : company;

  const fetchAttendance = useCallback(async (dateFilter, workerFilter) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      let query = `?company=${effectiveCompany}`;
      if (dateFilter) query += `&date=${dateFilter}`;
      if (workerFilter) query += `&workerId=${workerFilter}`;

      const res = await fetch(`${apiBaseUrl}/api/attendance${query}`, {
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error('Failed to fetch attendance');
      const json = await res.json();
      setRecords(json);

      // Check today's entry for worker
      const todayStr = new Date().toISOString().split('T')[0];
      const todayRec = json.find(r => r.date === todayStr);
      setTodayEntry(todayRec || null);
    } catch (err) {
      setError(err.message || 'Error fetching attendance');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, token, effectiveCompany]);

  const fetchWorkers = useCallback(async () => {
    if (!token || !['admin', 'manager', 'ceo'].includes(userRole)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/workers?company=${effectiveCompany}`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const json = await res.json();
        setWorkers(json);
      }
    } catch (err) {}
  }, [apiBaseUrl, token, userRole, effectiveCompany]);

  useEffect(() => {
    fetchAttendance();
    fetchWorkers();
  }, [fetchAttendance, fetchWorkers]);

  const checkIn = async (location, photoUri) => {
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${apiBaseUrl}/api/attendance/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ company: effectiveCompany, location, photoUri }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Check-in failed');
      setSuccess('Checked in successfully!');
      fetchAttendance();
      return json;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const checkOut = async () => {
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${apiBaseUrl}/api/attendance/check-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Check-out failed');
      setSuccess('Checked out successfully!');
      fetchAttendance();
      return json;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateRecord = async (recordId, status, remarks) => {
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${apiBaseUrl}/api/attendance/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ status, remarks }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Update failed');
      setSuccess('Attendance record updated!');
      fetchAttendance();
      return json;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    records,
    workers,
    todayEntry,
    loading,
    error,
    success,
    effectiveCompany,
    fetchAttendance,
    checkIn,
    checkOut,
    updateRecord,
  };
}

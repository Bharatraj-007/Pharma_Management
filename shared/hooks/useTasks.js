import { useState, useEffect, useCallback } from 'react';

export function useTasks(apiBaseUrl, token, role, company, activeCompany) {
  const effectiveCompany = role === 'ceo' && activeCompany && activeCompany !== 'all' ? activeCompany : company;

  const [tasks, setTasks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isManager = ['admin', 'manager', 'ceo'].includes(role);

  const fetchTasks = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const coQuery = role === 'ceo' && effectiveCompany ? `?company=${effectiveCompany}` : '';
      const res = await fetch(`${apiBaseUrl}/tasks${coQuery}`, {
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, token, role, effectiveCompany]);

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

  const startTask = async (id) => {
    try {
      const res = await fetch(`${apiBaseUrl}/tasks/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ status: 'in-progress' }),
      });
      if (!res.ok) throw new Error('Start task failed');
      fetchTasks();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const completeTask = async (id, usedKg, wasteKg, remainingKg) => {
    try {
      const res = await fetch(`${apiBaseUrl}/tasks/${id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({
          used_kg: Number(usedKg),
          waste_kg: Number(wasteKg || 0),
          remaining_kg: Number(remainingKg || 0),
        }),
      });
      if (!res.ok) throw new Error('Complete task failed');
      fetchTasks();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const deleteTask = async (id) => {
    try {
      const res = await fetch(`${apiBaseUrl}/tasks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error('Delete task failed');
      fetchTasks();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchWorkers();
  }, [fetchTasks, fetchWorkers]);

  return {
    tasks,
    workers,
    loading,
    error,
    success,
    effectiveCompany,
    fetchTasks,
    startTask,
    completeTask,
    deleteTask,
  };
}

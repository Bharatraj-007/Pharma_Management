import { useState, useEffect, useCallback } from 'react';

export function useTasks(apiBaseUrl, token, userRole, company, activeCompany) {
  const [tasks, setTasks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const effectiveCompany = userRole === 'ceo' && activeCompany !== 'all' ? activeCompany : company;

  const fetchTasks = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const query = effectiveCompany ? `?company=${effectiveCompany}` : '';
      const res = await fetch(`${apiBaseUrl}/api/tasks${query}`, {
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const json = await res.json();
      setTasks(json);
    } catch (err) {
      setError(err.message || 'Error loading tasks');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, token, effectiveCompany]);

  const fetchWorkers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/workers?company=${effectiveCompany}`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const json = await res.json();
        setWorkers(json);
      }
    } catch (err) {}
  }, [apiBaseUrl, token, effectiveCompany]);

  useEffect(() => {
    fetchTasks();
    fetchWorkers();
  }, [fetchTasks, fetchWorkers]);

  const createTask = async (taskPayload) => {
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${apiBaseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ company: effectiveCompany, ...taskPayload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to create task');
      setSuccess('Task created successfully!');
      fetchTasks();
      return json;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateTaskStatus = async (taskId, status, extraData = {}) => {
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${apiBaseUrl}/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ status, ...extraData }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to update task status');
      setSuccess(`Task status updated to ${status}`);
      fetchTasks();
      return json;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteTask = async (taskId) => {
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${apiBaseUrl}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error('Failed to delete task');
      setSuccess('Task deleted!');
      fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  return {
    tasks,
    workers,
    loading,
    error,
    success,
    effectiveCompany,
    fetchTasks,
    createTask,
    updateTaskStatus,
    deleteTask,
  };
}

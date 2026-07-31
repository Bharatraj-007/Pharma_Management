import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../../navigation/AuthContext';
import API_BASE_URL from '../../config';

export function useTasksLogic() {
  const { session } = useContext(AuthContext);
  const token = session?.token;
  const role = (session?.role || 'worker').toLowerCase();
  const company = session?.company || 'bharath';
  const activeCompany = session?.activeCompany || company;

  const [tasks, setTasks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [clientCompanies, setClientCompanies] = useState([]);
  const [clientProducts, setClientProducts] = useState([]);
  const [taskFiles, setTaskFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTasks = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const coQuery = role === 'ceo' && activeCompany ? `?company=${activeCompany}` : '';
      const res = await fetch(`${API_BASE_URL}/tasks${coQuery}`, {
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
  }, [token, role, activeCompany]);

  const fetchWorkers = useCallback(async () => {
    if (!token || role === 'worker') return;
    try {
      const res = await fetch(`${API_BASE_URL}/workers`, {
        headers: { Authorization: token },
      });
      if (res.ok) setWorkers(await res.json());
    } catch {}
  }, [token, role]);

  const fetchClientCompanies = useCallback(async (search = '') => {
    if (!token) return [];
    try {
      const res = await fetch(`${API_BASE_URL}/api/client-companies?search=${encodeURIComponent(search)}`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const data = await res.json();
        setClientCompanies(Array.isArray(data) ? data : []);
        return data;
      }
    } catch {}
    return [];
  }, [token]);

  const fetchClientProducts = useCallback(async (clientCompany = '', search = '') => {
    if (!token) return [];
    try {
      const query = `clientCompany=${encodeURIComponent(clientCompany)}&search=${encodeURIComponent(search)}`;
      const res = await fetch(`${API_BASE_URL}/api/client-products?${query}`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setClientProducts(list);
        return list;
      }
    } catch {}
    return [];
  }, [token]);

  const addClientCompany = async (name) => {
    if (!token || !name) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/api/client-companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = await res.json();
        fetchClientCompanies();
        return data;
      }
    } catch {}
    return null;
  };

  const fetchTaskFiles = useCallback(async (clientCompany = '', productName = '', search = '') => {
    if (!token) return [];
    setFilesLoading(true);
    try {
      const query = `clientCompany=${encodeURIComponent(clientCompany)}&productName=${encodeURIComponent(productName)}&search=${encodeURIComponent(search)}`;
      const res = await fetch(`${API_BASE_URL}/api/task-files?${query}`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setTaskFiles(list);
        return list;
      }
    } catch {}
    finally { setFilesLoading(false); }
    return [];
  }, [token]);

  const startTask = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${id}/status`, {
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
      const res = await fetch(`${API_BASE_URL}/tasks/${id}/complete`, {
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

  useEffect(() => {
    fetchTasks();
    fetchWorkers();
    fetchClientCompanies();
  }, [fetchTasks, fetchWorkers, fetchClientCompanies]);

  return {
    session,
    role,
    company,
    activeCompany,
    tasks,
    workers,
    clientCompanies,
    clientProducts,
    taskFiles,
    loading,
    filesLoading,
    error,
    fetchTasks,
    fetchClientCompanies,
    fetchClientProducts,
    addClientCompany,
    fetchTaskFiles,
    startTask,
    completeTask,
  };
}

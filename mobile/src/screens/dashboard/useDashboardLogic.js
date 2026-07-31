import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../../navigation/AuthContext';
import API_BASE_URL from '../../config';

export function useDashboardLogic() {
  const { session } = useContext(AuthContext);
  const token = session?.token;
  const role = (session?.role || 'worker').toLowerCase();
  const company = session?.company || 'bharath';
  const activeCompany = session?.activeCompany || company;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const coQuery = activeCompany && activeCompany !== 'all' ? `?company=${activeCompany}` : '';
      const res = await fetch(`${API_BASE_URL}/api/dashboard/summary${coQuery}`, {
        headers: { Authorization: token },
      });
      if (res.status === 401) {
        throw new Error('Session expired. Please Sign Out and log in again.');
      }
      if (!res.ok) throw new Error('Unable to load dashboard data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, activeCompany]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  return {
    session,
    role,
    company,
    activeCompany,
    data,
    loading,
    error,
    refetch: fetchDashboardData,
  };
}

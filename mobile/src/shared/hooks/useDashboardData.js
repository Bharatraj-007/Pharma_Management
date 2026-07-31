import { useState, useEffect, useCallback } from 'react';

export function useDashboardData(apiBaseUrl, token, role, activeCompany) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const coQuery = activeCompany && activeCompany !== 'all' ? `?company=${activeCompany}` : '';
      const res = await fetch(`${apiBaseUrl}/api/dashboard/summary${coQuery}`, {
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error('Unable to load dashboard summary');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message || 'Unable to load dashboard information');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, token, activeCompany]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

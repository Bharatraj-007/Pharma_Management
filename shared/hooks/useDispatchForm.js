import { useState, useEffect, useCallback } from 'react';

export function useDispatchForm(apiBaseUrl, token, company, userRole, activeCompany) {
  const effectiveCompany = userRole === 'ceo' && activeCompany && activeCompany !== 'all' ? activeCompany : company;

  const [productList, setProductList] = useState([]);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchProducts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/products?company=${effectiveCompany}&limit=100`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const json = await res.json();
        setProductList(json.data || []);
      }
    } catch (e) {}
  }, [apiBaseUrl, token, effectiveCompany]);

  const fetchReports = useCallback(async (from, to, targetCompany) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const rc = targetCompany || effectiveCompany;
      const res = await fetch(`${apiBaseUrl}/api/dispatch/report?company=${rc}&from=${from}&to=${to}`, {
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error('Failed to load dispatch report');
      const json = await res.json();
      setReports(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, token, effectiveCompany]);

  const createDispatch = async (payload) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${apiBaseUrl}/api/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ ...payload, company: effectiveCompany }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit dispatch entry');
      setSuccess('✅ Dispatch recorded successfully!');
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/dispatch/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Status update failed');
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const updateDispatch = async (id, payload) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/dispatch/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Update failed');
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const deleteDispatch = async (id) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/dispatch/${id}`, {
        method: 'DELETE',
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error('Delete failed');
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    productList,
    reports,
    loading,
    error,
    success,
    effectiveCompany,
    fetchProducts,
    fetchReports,
    createDispatch,
    updateStatus,
    updateDispatch,
    deleteDispatch,
  };
}

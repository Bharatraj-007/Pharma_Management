import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../../navigation/AuthContext';
import API_BASE_URL from '../../config';

export function useDispatchLogic() {
  const { session } = useContext(AuthContext);
  const token = session?.token;
  const role = (session?.role || 'worker').toLowerCase();
  const company = session?.company || 'bharath';
  const activeCompany = session?.activeCompany || company;

  const [productList, setProductList] = useState([]);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchProducts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/products?company=${activeCompany}&limit=100`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const json = await res.json();
        setProductList(json.data || []);
      }
    } catch (e) {}
  }, [token, activeCompany]);

  const fetchReports = useCallback(async (from, to) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/dispatch/report?company=${activeCompany}&from=${from}&to=${to}`, {
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error('Failed to fetch dispatch report');
      setReports(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, activeCompany]);

  const createDispatch = async (payload) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ ...payload, company: activeCompany }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save dispatch');
      setSuccess('✅ Dispatch recorded successfully!');
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    session,
    role,
    company,
    activeCompany,
    productList,
    reports,
    loading,
    error,
    success,
    fetchProducts,
    fetchReports,
    createDispatch,
  };
}

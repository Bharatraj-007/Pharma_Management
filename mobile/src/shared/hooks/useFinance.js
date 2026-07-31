import { useState, useEffect, useCallback } from 'react';

export function useFinance(apiBaseUrl, token, userCompany, userRole, activeCompanyOverride) {
  const [period, setPeriod] = useState('month'); // 'day' or 'month'
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const effectiveCompany = userRole === 'ceo' && activeCompanyOverride && activeCompanyOverride !== 'all'
    ? activeCompanyOverride
    : userCompany;

  const fetchFinanceData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const coQuery = effectiveCompany ? `?company=${effectiveCompany}` : '';
      const [sumRes, txRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/transactions/summary${coQuery}`, { headers: { Authorization: token } }),
        fetch(`${apiBaseUrl}/api/transactions${coQuery}`, { headers: { Authorization: token } }),
      ]);
      if (sumRes.ok) setSummary(await sumRes.json());
      if (txRes.ok) setTransactions(await txRes.json());
    } catch (err) {
      setError(err.message || 'Error loading financial records');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, token, effectiveCompany]);

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  const addTransaction = async (payload) => {
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${apiBaseUrl}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ company: effectiveCompany, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to record transaction');
      setSuccess('Transaction recorded!');
      fetchFinanceData();
      return json;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteTransaction = async (id) => {
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${apiBaseUrl}/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error('Failed to delete transaction');
      setSuccess('Transaction deleted!');
      fetchFinanceData();
    } catch (err) {
      setError(err.message);
    }
  };

  return {
    period,
    setPeriod,
    summary,
    transactions,
    loading,
    error,
    success,
    effectiveCompany,
    addTransaction,
    deleteTransaction,
  };
}

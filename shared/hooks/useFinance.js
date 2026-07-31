import { useState, useEffect, useCallback } from 'react';

export function useFinance(apiBaseUrl, token, userCompany, userRole, activeCompanyOverride) {
  const effectiveCompany = userRole === 'ceo' && activeCompanyOverride && activeCompanyOverride !== 'all'
    ? activeCompanyOverride
    : userCompany;

  const [period, setPeriod] = useState('month'); // 'day' or 'month'
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchFinancials = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [sumRes, txRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/transactions/summary?company=${effectiveCompany}&period=${period}`, {
          headers: { Authorization: token },
        }),
        fetch(`${apiBaseUrl}/api/transactions?company=${effectiveCompany}&limit=50`, {
          headers: { Authorization: token },
        }),
      ]);

      if (sumRes.ok && txRes.ok) {
        const sumData = await sumRes.json();
        const txData = await txRes.json();
        setSummary(sumData);
        setTransactions(txData.data || []);
      }
    } catch (err) {
      setError('Failed to fetch financial data');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, token, effectiveCompany, period]);

  const addTransaction = async (payload) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${apiBaseUrl}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ ...payload, company: effectiveCompany === 'all' ? 'bharath' : effectiveCompany }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record transaction');
      setSuccess('✅ Financial transaction recorded!');
      fetchFinancials();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateTransaction = async (id, payload) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setSuccess('✅ Transaction updated!');
      fetchFinancials();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const deleteTransaction = async (id) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error('Failed to delete transaction');
      setSuccess('Transaction deleted.');
      fetchFinancials();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, [fetchFinancials]);

  return {
    period,
    setPeriod,
    summary,
    transactions,
    loading,
    error,
    success,
    effectiveCompany,
    fetchFinancials,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
}

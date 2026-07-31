import React, { useState, useEffect } from 'react';

export default function SignupRequestsScreenWeb({ apiBaseUrl, session }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/api/signup-requests`, {
        headers: { Authorization: `Bearer ${session?.token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRequests(Array.isArray(data) ? data : []);
      } else {
        alert(data.error || 'Failed to load signup requests');
      }
    } catch (err) {
      alert('Error fetching signup requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id, action) => {
    try {
      setActionLoading((prev) => ({ ...prev, [id]: action }));
      const endpoint = action === 'accept' ? `/api/signup-requests/${id}/accept` : `/api/signup-requests/${id}/reject`;
      const res = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session?.token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || `Request ${action}ed successfully`);
        fetchRequests();
      } else {
        alert(data.error || 'Operation failed');
      }
    } catch (err) {
      alert('Network error performing action');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: null }));
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#0F172A', minHeight: '100vh', color: '#F8FAFC' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>📋 Pending Signup Approval Requests</h1>
        <p style={{ color: '#94A3B8', fontSize: '14px', marginTop: '4px' }}>
          Review identity-verified candidate signups and grant account access.
        </p>
      </div>

      {loading ? (
        <div style={{ color: '#6366F1', textAlign: 'center', padding: '40px' }}>Loading requests...</div>
      ) : requests.length === 0 ? (
        <div style={{ backgroundColor: '#1E293B', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
          🎉 No pending signup requests awaiting approval.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {requests.map((item) => (
            <div key={item._id} style={{ backgroundColor: '#1E293B', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#F8FAFC' }}>
                    {item.name || `${item.firstName} ${item.lastName}`}
                  </h3>
                  <span style={{ color: '#94A3B8', fontSize: '13px' }}>{item.email}</span>
                </div>
                <span style={{ backgroundColor: '#312E81', color: '#818CF8', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                  {(item.requestedRole || 'worker').toUpperCase()}
                </span>
              </div>

              <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                <div><strong style={{ color: '#94A3B8' }}>Company:</strong> {item.company}</div>
                {item.phone && <div><strong style={{ color: '#94A3B8' }}>Phone:</strong> {item.phone}</div>}
                {item.idProofType && <div><strong style={{ color: '#94A3B8' }}>ID Proof:</strong> {item.idProofType.toUpperCase()} ({item.idProofNumber})</div>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={() => handleAction(item._id, 'reject')}
                  disabled={!!actionLoading[item._id]}
                  style={{ backgroundColor: '#EF4444', color: '#FFF', border: 'none', borderRadius: '6px', padding: '8px 16px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {actionLoading[item._id] === 'reject' ? 'Rejecting...' : '❌ Reject'}
                </button>
                <button
                  onClick={() => handleAction(item._id, 'accept')}
                  disabled={!!actionLoading[item._id]}
                  style={{ backgroundColor: '#10B981', color: '#FFF', border: 'none', borderRadius: '6px', padding: '8px 16px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {actionLoading[item._id] === 'accept' ? 'Accepting...' : '✅ Accept'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import { getProfessionalAvatar } from '../../utils/avatar';

export default function StatusViewers({ statusId, onClose }) {
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchViewers = async () => {
      try {
        const res = await apiClient.get(`/status/${statusId}/viewers`);
        if (res.data && res.data.success) {
          setViewers(res.data.viewers);
        }
      } catch (err) {
        console.error('Failed to fetch viewers', err);
      } finally {
        setLoading(false);
      }
    };
    fetchViewers();
  }, [statusId]);

  return (
    <div 
      className="status-controls"
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, 
        backgroundColor: 'white', borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
        color: 'black', display: 'flex', flexDirection: 'column',
        height: '60%', zIndex: 10020, boxShadow: '0 -4px 10px rgba(0,0,0,0.2)',
        animation: 'slideUp 0.3s ease-out'
      }}
      onClick={(e) => e.stopPropagation()} // Prevent touches passing through
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #ddd' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Viewed by {viewers.length}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading...</div>
        ) : viewers.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No views yet</div>
        ) : (
          viewers.map((v, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #eee' }}>
              <img src={getProfessionalAvatar(v.user)} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', marginRight: '16px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: '1rem' }}>{v.user?.name || 'Unknown User'}</div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>
                  {new Date(v.viewedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

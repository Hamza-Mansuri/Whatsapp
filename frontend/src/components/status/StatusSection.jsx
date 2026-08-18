import React, { useState, useEffect, useMemo } from 'react';
import useAuth from '../../hooks/useAuth';
import apiClient from '../../services/api';
import { socketService } from '../../services/socket';
import StatusItem from './StatusItem';
import CreateStatus from './CreateStatus';
import StatusViewer from './StatusViewer';

export default function StatusSection({ onBack }) {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation states
  const [showCreate, setShowCreate] = useState(false);
  const [viewerData, setViewerData] = useState(null); // { user, statuses }

  useEffect(() => {
    fetchActiveStatuses();
    
    // Listen for real-time status updates
    socketService.onStatusCreated((newStatus) => {
      setStatuses((prev) => {
        // Replace if already exists, else append
        const exists = prev.some(s => s._id === newStatus._id);
        if (exists) return prev;
        return [newStatus, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      });
    });

    socketService.onStatusDeleted(({ statusId }) => {
      setStatuses((prev) => prev.filter(s => s._id !== statusId));
      
      // If we are currently viewing this status and it was deleted (e.g. by owner in another tab), we might want to handle it
      // For simplicity, we just filter it from the main list. 
    });

    return () => {
      socketService.offStatusCreated();
      socketService.offStatusDeleted();
    };
  }, []);

  const fetchActiveStatuses = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/status');
      if (res.data && res.data.success) {
        setStatuses(res.data.statuses);
      }
    } catch (error) {
      console.error('Failed to fetch statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group statuses by user
  const groupedStatuses = useMemo(() => {
    const groups = {};
    statuses.forEach(status => {
      const userId = status.user._id || status.user;
      if (!groups[userId]) {
        groups[userId] = {
          user: status.user,
          statuses: []
        };
      }
      groups[userId].statuses.push(status);
    });
    
    // Sort each user's statuses oldest to newest so they play in order
    Object.values(groups).forEach(g => {
      g.statuses.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    });

    return groups;
  }, [statuses]);

  const currentUserId = user?._id || user?.id;
  const myStatusGroup = groupedStatuses[currentUserId];
  
  const otherUserGroups = Object.values(groupedStatuses).filter(g => {
    const uid = g.user._id || g.user;
    return uid !== currentUserId;
  });

  const handleMyStatusClick = () => {
    if (myStatusGroup && myStatusGroup.statuses.length > 0) {
      // View my statuses
      setViewerData({ user, statuses: myStatusGroup.statuses, isOwner: true });
    } else {
      // Create new status
      setShowCreate(true);
    }
  };

  const handleCreateNew = () => {
    setShowCreate(true);
  };

  const handleCloseViewer = () => {
    setViewerData(null);
    fetchActiveStatuses(); // Refresh view state when closing viewer
  };

  return (
    <div className="profile-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--panel-bg)', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
      {/* Header */}
      <div className="profile-header" style={{ backgroundColor: 'var(--primary-teal)', color: 'white', display: 'flex', alignItems: 'center', padding: '16px', height: '108px', paddingTop: '50px' }}>
        <button className="back-btn" onClick={onBack} style={{ color: 'white', marginRight: '16px' }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 500 }}>Status</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#f0f2f5' }}>
        
        {/* My Status */}
        <div style={{ backgroundColor: 'white', marginBottom: '10px' }}>
          <StatusItem 
            user={user} 
            statuses={myStatusGroup ? myStatusGroup.statuses : []} 
            isMyStatus={true}
            onClick={handleMyStatusClick}
          />
          {myStatusGroup && myStatusGroup.statuses.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px 12px 16px' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); handleCreateNew(); }}
                style={{
                  background: 'none', border: 'none', color: 'var(--primary-teal)', fontWeight: 500, cursor: 'pointer'
                }}
              >
                + Add another status
              </button>
            </div>
          )}
        </div>

        {/* Recent Updates */}
        <div style={{ padding: '12px 16px', fontSize: '0.9rem', color: '#667781', fontWeight: 500 }}>
          Recent updates
        </div>

        <div style={{ backgroundColor: 'white' }}>
          {loading ? (
             <div style={{ padding: '20px', textAlign: 'center', color: '#667781' }}>Loading...</div>
          ) : otherUserGroups.length > 0 ? (
            otherUserGroups.map(group => (
              <StatusItem 
                key={group.user._id} 
                user={group.user} 
                statuses={group.statuses} 
                onClick={() => setViewerData({ user: group.user, statuses: group.statuses, isOwner: false })}
              />
            ))
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#667781' }}>No recent updates to show.</div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateStatus 
          onClose={() => setShowCreate(false)} 
          onCreated={() => {
            setShowCreate(false);
            fetchActiveStatuses();
          }} 
        />
      )}

      {viewerData && (
        <StatusViewer 
          data={viewerData} 
          onClose={handleCloseViewer}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}

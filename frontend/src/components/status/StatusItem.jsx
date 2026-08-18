import React from 'react';
import { getProfessionalAvatar } from '../../utils/avatar';

export default function StatusItem({
  user,
  statuses,
  isMyStatus = false,
  onClick,
}) {
  // Check if there are any unseen statuses
  // In a real app we'd track seen/unseen in the current user's state or from API.
  // We'll simulate by checking if there's any status where we aren't in the viewers list.
  const hasUnseen = statuses && statuses.some(s => {
    return !s.viewers || !s.viewers.some(v => v.user === user?._id || v.user?._id === user?._id);
  });

  const lastStatus = statuses && statuses.length > 0 ? statuses[statuses.length - 1] : null;
  const timeString = lastStatus ? new Date(lastStatus.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No updates';
  
  const today = new Date().toDateString();
  const statusDate = lastStatus ? new Date(lastStatus.createdAt).toDateString() : '';
  const dateDisplay = statusDate === today ? `Today, ${timeString}` : (lastStatus ? new Date(lastStatus.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : timeString);

  return (
    <div className="chat-list-item" onClick={onClick}>
      <div className="avatar-wrapper" style={{ padding: '2px' }}>
        {statuses && statuses.length > 0 ? (
          <svg className="status-ring" width="52" height="52" style={{ position: 'absolute', top: '-2px', left: '-2px' }}>
            <circle
              cx="26"
              cy="26"
              r="24"
              fill="none"
              stroke={hasUnseen ? 'var(--primary-teal)' : '#bbb'}
              strokeWidth="2"
              strokeDasharray={statuses.length > 1 ? `${(150 / statuses.length) - 4} 4` : 'none'}
            />
          </svg>
        ) : null}
        <img
          src={getProfessionalAvatar(user)}
          alt={user?.name || 'User'}
          className="avatar"
          style={{ objectFit: 'cover' }}
        />
        {isMyStatus && (!statuses || statuses.length === 0) && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            backgroundColor: 'var(--primary-teal)',
            color: 'white',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid white'
          }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
          </div>
        )}
      </div>
      <div className="chat-item-details">
        <span className="chat-item-name">{isMyStatus ? 'My status' : user?.name}</span>
        <span className="chat-item-last-msg" style={{ fontSize: '0.8rem' }}>
          {isMyStatus && (!statuses || statuses.length === 0) ? 'Tap to add status update' : dateDisplay}
        </span>
      </div>
    </div>
  );
}

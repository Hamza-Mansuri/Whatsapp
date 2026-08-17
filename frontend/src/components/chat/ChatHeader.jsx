import React from 'react';

export default function ChatHeader({ name, avatar, status, onBack, onSearchClick, onHeaderClick }) {
  return (
    <header className="chat-header">
      {/* Mobile Back Button */}
      <button className="back-btn" onClick={onBack} aria-label="Go Back">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
      </button>

      <div className="header-info" onClick={onHeaderClick} style={{ cursor: onHeaderClick ? 'pointer' : 'default' }}>
        <img src={avatar} alt={name} className="avatar" />
        <div className="contact-details">
          <h3 className="contact-name">{name}</h3>
          <span className={`contact-status ${status === 'Online' || status === 'typing...' ? 'online' : ''}`}>
            {status}
          </span>
        </div>
      </div>

      <div className="header-actions">
        <button className="action-btn" title="Search messages" onClick={onSearchClick}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </button>
        <button className="action-btn" title="More options">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </button>
      </div>
    </header>
  );
}

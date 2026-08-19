import React from 'react';

export default function ChatHeader({ name, avatar, status, onBack, onSearchClick, onHeaderClick, onVideoCallClick, onAudioCallClick }) {
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
        <button className="action-btn" title="Video call" onClick={onVideoCallClick}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
          </svg>
        </button>
        <button className="action-btn" title="Audio call" onClick={onAudioCallClick}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.55-.45-1-1-1H6c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.49c0-.55-.45-1-1-1z"/>
          </svg>
        </button>
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

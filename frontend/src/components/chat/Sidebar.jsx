import React from 'react';
import ChatList from './ChatList';
import useAuth from '../../hooks/useAuth';
import { getProfessionalAvatar } from '../../utils/avatar';

export default function Sidebar({
  conversations,
  activeChatId,
  onSelectChat,
  searchQuery,
  onSearchChange,
  showNewChatList,
  onToggleNewChatList,
  availableUsers = [],
  onStartConversation,
  onlineUserIds,
  onOpenProfile,
  onOpenNewGroup,
}) {
  const { user, logout } = useAuth();

  // Filter available users by search query
  const filteredUsers = availableUsers.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="sidebar">
      {/* Sidebar Header / Profile */}
      <div className="sidebar-header">
        <div className="profile-container" onClick={onOpenProfile} style={{ cursor: 'pointer' }}>
          <img
            src={getProfessionalAvatar(user)}
            alt={user?.name || "My Profile"}
            className="avatar"
            style={{ objectFit: 'cover' }}
          />
          <div className="profile-info">
            <span className="profile-name">{user?.name || "My Profile"}</span>
            <span className="profile-status">Active</span>
          </div>
        </div>
        <div className="sidebar-actions">
          {/* Status Icon */}
          <button className="action-btn" title="Status">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </button>
          {/* Toggle New Chat View / Back to Chat List */}
          <button
            className={`action-btn ${showNewChatList ? 'active' : ''}`}
            title={showNewChatList ? "Back to Chats" : "New Chat"}
            onClick={onToggleNewChatList}
            style={showNewChatList ? { color: 'var(--primary-teal)', backgroundColor: 'var(--primary-teal-light)' } : {}}
          >
            {showNewChatList ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            )}
          </button>
          {/* Logout Icon */}
          <button className="action-btn" title="Logout" onClick={logout}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="search-container">
        <div className="search-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            type="text"
            placeholder={showNewChatList ? "Search users..." : "Search chats..."}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => onSearchChange('')}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Chat List Area / Available Users List */}
      {showNewChatList ? (
        <div className="chat-list">
          <div className="chat-list-item" onClick={onOpenNewGroup}>
            <div className="avatar-wrapper" style={{ width: '48px', height: '48px', backgroundColor: 'var(--primary-teal)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, marginRight: '12px' }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </div>
            <div className="chat-item-details" style={{ height: '100%', display: 'flex', alignItems: 'center' }}>
              <span className="chat-item-name" style={{ fontSize: '1.05rem', color: '#111b21', fontWeight: 500 }}>New group</span>
            </div>
          </div>
          <div style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-teal)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.01)' }}>
            CONTACTS ON WHATSAPP LITE
          </div>
          {filteredUsers.map((u) => {
            const isOnline = onlineUserIds?.has(u._id);
            return (
              <div key={u._id} className="chat-list-item" onClick={() => onStartConversation(u._id)}>
                <div className="avatar-wrapper">
                  <img
                    src={getProfessionalAvatar(u)}
                    alt={u.name}
                    className="avatar"
                    style={{ objectFit: 'cover' }}
                  />
                  {isOnline && <span className="online-indicator-dot" />}
                </div>
                <div className="chat-item-details">
                  <span className="chat-item-name">{u.name}</span>
                  <span className="chat-item-last-msg" style={{ fontSize: '0.78rem' }}>Click to start chat</span>
                </div>
              </div>
            );
          })}
          {filteredUsers.length === 0 && (
            <div className="no-chats-found">No users found</div>
          )}
        </div>
      ) : (
        <ChatList
          conversations={conversations}
          activeChatId={activeChatId}
          onSelectChat={onSelectChat}
          onlineUserIds={onlineUserIds}
        />
      )}
    </aside>
  );
}

import React from 'react';
import useAuth from '../../hooks/useAuth';
import { getProfessionalAvatar, getGroupAvatar } from '../../utils/avatar';
import { getOtherParticipant, isSameUser } from '../../utils/conversation';

export default function ChatListItem({ chat, isActive, onSelect, onlineUserIds }) {
  const { user } = useAuth();

  // Find the other participant in the conversation
  const otherParticipant = getOtherParticipant(chat.participants, user) || {
    name: 'Unknown User',
    avatar: '',
  };

  const isOnline = chat.isGroup ? false : (otherParticipant && onlineUserIds?.has(otherParticipant._id || otherParticipant.id));
  
  const displayName = chat.isGroup ? chat.groupName : otherParticipant.name;
  const avatarSrc = chat.isGroup ? getGroupAvatar(chat) : getProfessionalAvatar(otherParticipant);

  const lastMessage = chat.lastMessage;

  // Shorten last message if needed
  const truncateMessage = (text) => {
    if (!text) return "";
    return text.length > 35 ? text.substring(0, 32) + "..." : text;
  };

  // Format timestamp
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const isMe = lastMessage && isSameUser(lastMessage.sender, user);

  return (
    <div
      className={`chat-list-item ${isActive ? 'active' : ''}`}
      onClick={onSelect}
    >
      <div className="avatar-wrapper">
        <img
          src={avatarSrc}
          alt={displayName}
          className="avatar"
          style={{ objectFit: 'cover' }}
        />
        {isOnline && <span className="online-indicator-dot" />}
      </div>
      <div className="chat-item-details">
        <div className="chat-item-header">
          <span className="chat-item-name">{displayName}</span>
          <span className="chat-item-time">
            {lastMessage ? formatTime(lastMessage.createdAt || chat.lastMessageAt) : ''}
          </span>
        </div>
        <div className="chat-item-body">
          <span
            className="chat-item-last-msg"
            style={{ color: isMe ? '#667781' : '#111B21', fontWeight: isMe ? '400' : '500' }}
          >
            {lastMessage ? (
              <>
                {lastMessage.type === 'system' ? (
                  <span style={{ fontStyle: 'italic', color: '#8696a0' }}>{lastMessage.text}</span>
                ) : (
                  <>
                    {isMe ? (
                      <span className="sender-indicator" style={{ color: '#667781' }}>You: </span>
                    ) : (
                      chat.isGroup && <span className="sender-indicator" style={{ color: '#667781' }}>{lastMessage.sender?.name?.split(' ')[0]}: </span>
                    )}
                    {lastMessage.isDeleted ? (
                      <span style={{ fontStyle: 'italic', color: '#8696a0' }}>This message was deleted</span>
                    ) : lastMessage.isForwarded ? (
                  <span style={{ color: '#8696a0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M5.5 13.5v-3C5.5 7.46 8.46 4.5 11.5 4.5h6.67L16.3 2.63l.7-.71L20.5 5.4 17 8.9l-.71-.71 1.88-1.88H11.5c-2.21 0-4 1.79-4 4v3H5.5zm10 2.5v3c0 3.04-2.96 6-6 6H2.83l1.88 1.88-.7.71L.5 24l3.5-3.5.71.71L2.83 23H9.5c2.21 0 4-1.79 4-4v-3h2z"/>
                    </svg>
                    Forwarded {lastMessage.type === 'image' ? 'image' : 'message'}
                  </span>
                ) : lastMessage.type === 'image' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🖼️ Photo
                  </span>
                ) : lastMessage.type === 'audio' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🎙 Voice message
                  </span>
                ) : (
                  truncateMessage(lastMessage.text)
                )}
                  </>
                )}
              </>
            ) : (
              <span className="no-messages-yet" style={{ color: '#667781', fontStyle: 'italic' }}>No messages yet</span>
            )}
          </span>
          {chat.unreadCount > 0 && (
            <span className="unread-badge" style={{ color: 'var(--whatsapp-green)', fontSize: '0.85rem', fontWeight: 'bold', marginLeft: '8px' }}>
              [{chat.unreadCount}]
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

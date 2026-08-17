import React, { useState, useEffect, useMemo } from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ForwardModal from './ForwardModal';
import GroupInfoPanel from './GroupInfoPanel';
import useAuth from '../../hooks/useAuth';
import { getProfessionalAvatar } from '../../utils/avatar';
import { getOtherParticipant, isSameUser } from '../../utils/conversation';
import { formatLastSeen } from '../../utils/time';

export default function ChatWindow({
  activeChat,
  messages = [],
  onSendMessage,
  onBack,
  onlineUserIds,
  availableUsers = [],
  isRecipientTyping,
  onTyping,
  onDeleteMessage,
  showToast,
  hasMore,
  loadingOlder,
  onLoadOlder,
  replyingToMessage,
  onSetReplyingToMessage,
  onToggleReaction,
  onBulkDeleteMessages,
  onEditMessage,
  onForwardMessage,
  conversations = [],
}) {
  const { user } = useAuth();

  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Group Info State
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  // Edit and Forward States
  const [editingMessage, setEditingMessage] = useState(null);
  const [forwardingMessages, setForwardingMessages] = useState([]);

  // Selection States
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);

  // Clear search parameters when selected chat changes
  useEffect(() => {
    setSearchQuery('');
    setShowMessageSearch(false);
    setCurrentMatchIndex(0);
    setSelectedMessageIds([]);
    setEditingMessage(null);
    setForwardingMessages([]);
    setShowGroupInfo(false);
  }, [activeChat?._id]);

  // Compute matching search results dynamically
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return messages
      .filter((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
      .map((m) => m._id);
  }, [messages, searchQuery]);

  const handlePrevMatch = () => {
    if (searchResults.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
  };

  const handleNextMatch = () => {
    if (searchResults.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % searchResults.length);
  };

  const handleToggleSelectMessage = (msgId) => {
    setSelectedMessageIds((prev) => 
      prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
    );
  };

  const handleCopySelected = async () => {
    const selectedMessages = messages
      .filter((m) => selectedMessageIds.includes(m._id || m.id))
      .filter((m) => !m.isDeleted && m.text)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((m) => m.text);

    if (selectedMessages.length > 0) {
      try {
        await navigator.clipboard.writeText(selectedMessages.join('\n'));
        showToast('Copied');
      } catch (err) {
        showToast('Unable to copy messages');
      }
    }
    setSelectedMessageIds([]);
  };

  const handleDeleteSelected = () => {
    if (selectedMessageIds.length > 0) {
      onBulkDeleteMessages?.(selectedMessageIds);
    }
    setSelectedMessageIds([]);
  };

  const handleForwardSelected = () => {
    if (selectedMessageIds.length > 0) {
      const msgsToForward = messages
        .filter((m) => selectedMessageIds.includes(m._id || m.id))
        .filter((m) => !m.isDeleted)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
      setForwardingMessages(msgsToForward);
    }
  };


  if (!activeChat) {
    return (
      <div className="chat-window empty-state">
        <div className="empty-state-content">
          <img
            src="https://res.cloudinary.com/wycpodzl/image/upload/v1786535793/copy_of_chatgpt_image_aug_12_2026_05_09_56_pm_ialo4q.png"
            alt="WhatsApp Logo"
            style={{ width: '120px', height: '120px', marginBottom: '24px', objectFit: 'contain' }}
          />
          <h2>WhatsApp Lite</h2>
          <p>Send and receive messages instantly. Select any contact from the sidebar list to start chatting.</p>
          <div className="empty-state-badge">🔒 End-to-end encrypted (Mock)</div>
        </div>
      </div>
    );
  }

  // Resolve target participant details safely
  const otherParticipant = getOtherParticipant(activeChat.participants, user) || {
    name: 'Unknown User',
    avatar: '',
  };

  const isOnline = !activeChat.isGroup && otherParticipant && onlineUserIds?.has(otherParticipant._id || otherParticipant.id);

  // Group Header Logic
  const headerName = activeChat.isGroup ? activeChat.groupName : otherParticipant.name;
  
  // Need to import getGroupAvatar at the top
  const headerAvatar = activeChat.isGroup 
    ? (activeChat.groupImage ? (activeChat.groupImage.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : ''}${activeChat.groupImage}` : activeChat.groupImage) : 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&h=150&fit=crop&crop=faces')
    : getProfessionalAvatar(otherParticipant);
    
  let headerStatus = '';
  if (activeChat.isGroup) {
    const onlineCount = activeChat.participants.filter(p => onlineUserIds?.has(p._id || p.id)).length;
    headerStatus = `${activeChat.participants.length} members`;
    if (onlineCount > 0) {
      headerStatus += `, ${onlineCount} online`;
    }
  } else {
    headerStatus = isRecipientTyping ? 'typing...' : (isOnline ? 'Online' : formatLastSeen(otherParticipant.lastSeen));
  }

  return (
    <div className="chat-window">
      {selectedMessageIds.length > 0 ? (
        <div 
          className="chat-header selection-header" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '10px 16px', 
            backgroundColor: 'var(--primary-teal)', 
            color: 'white',
            height: '60px'
          }}
        >
          <button 
            onClick={() => setSelectedMessageIds([])}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', marginRight: '20px' }}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>
          <div style={{ flex: 1, fontSize: '1.1rem', fontWeight: '500' }}>
            {selectedMessageIds.length} selected
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            {messages.some(m => selectedMessageIds.includes(m._id || m.id) && !m.isDeleted && m.text) && (
              <button 
                onClick={handleCopySelected}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 500 }}
                title="Copy"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
                Copy
              </button>
            )}
            {messages.some(m => selectedMessageIds.includes(m._id || m.id) && !m.isDeleted) && (
              <button 
                onClick={handleForwardSelected}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 500 }}
                title="Forward"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
                Forward
              </button>
            )}
            {messages.filter(m => selectedMessageIds.includes(m._id || m.id)).every(m => isSameUser(m.sender, user) || m.sender === 'me') && (
              <button 
                onClick={handleDeleteSelected}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 500 }}
                title="Delete"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
                Delete
              </button>
            )}
          </div>
        </div>
      ) : (
        <ChatHeader
          name={headerName}
          avatar={headerAvatar}
          status={headerStatus}
          onBack={onBack}
          onSearchClick={() => setShowMessageSearch((prev) => !prev)}
          onHeaderClick={() => activeChat?.isGroup ? setShowGroupInfo(true) : null}
          isGroup={activeChat?.isGroup}
          chat={activeChat}
        />
      )}

      {showGroupInfo && activeChat?.isGroup && (
        <GroupInfoPanel
          chat={activeChat}
          onBack={() => setShowGroupInfo(false)}
          onlineUserIds={onlineUserIds}
          availableUsers={availableUsers}
          showToast={showToast}
          onGroupUpdated={(updatedConv) => {
            // Need a way to update the conversation in ChatLayout
            // For now, it might be updated via socket (conversation_updated event)
            // But we can just rely on socket! The API sends socket events.
          }}
          onGroupDeleted={() => {
            onBack(); // go back to list
          }}
        />
      )}

      {showMessageSearch && (
        <div 
          className="message-search-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            backgroundColor: '#f0f2f5',
            borderBottom: '1px solid var(--border-color)',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#667781">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentMatchIndex(0);
              }}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.9rem',
                color: '#111B21',
                width: '100%',
              }}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {searchResults.length > 0 ? (
              <span style={{ fontSize: '0.85rem', color: '#667781' }}>
                {currentMatchIndex + 1} of {searchResults.length}
              </span>
            ) : (
              searchQuery && <span style={{ fontSize: '0.85rem', color: '#ea0038' }}>No messages found</span>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button 
                onClick={handlePrevMatch}
                disabled={searchResults.length <= 1}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: searchResults.length <= 1 ? '#cbd5e1' : '#667781',
                  padding: '4px',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                }}
              >
                ‹
              </button>
              <button 
                onClick={handleNextMatch}
                disabled={searchResults.length <= 1}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: searchResults.length <= 1 ? '#cbd5e1' : '#667781',
                  padding: '4px',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                }}
              >
                ›
              </button>
            </div>

            <button 
              onClick={() => {
                setShowMessageSearch(false);
                setSearchQuery('');
                setCurrentMatchIndex(0);
              }}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: '#667781',
                fontWeight: 'bold',
                fontSize: '0.9rem',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <MessageList
        messages={messages}
        activeChatId={activeChat?._id}
        isGroup={activeChat?.isGroup}
        onDeleteMessage={onDeleteMessage}
        showToast={showToast}
        searchQuery={searchQuery}
        highlightedMessageId={searchResults[currentMatchIndex]}
        hasMore={hasMore}
        loadingOlder={loadingOlder}
        onReplyMessage={(msg) => {
          setEditingMessage(null);
          onSetReplyingToMessage(msg);
        }}
        onToggleReaction={onToggleReaction}
        onEditMessage={(msg) => {
          onSetReplyingToMessage(null);
          setEditingMessage(msg);
        }}
        onForwardMessage={(msg) => setForwardingMessages([msg])}
        selectedMessageIds={selectedMessageIds}
        onToggleSelect={handleToggleSelectMessage}
        onDeleteSelected={handleDeleteSelected}
        onCopySelected={handleCopySelected}
        onForwardSelected={handleForwardSelected}
      />

      {/* Editing Message Indicator */}
      {editingMessage && (
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            backgroundColor: '#f0f2f5',
            borderLeft: '4px solid var(--primary-teal)',
            borderTop: '1px solid var(--border-color)',
            gap: '12px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--primary-teal-dark)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
              Editing message
            </div>
            <div style={{ color: '#667781', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {editingMessage.text}
            </div>
          </div>
          <button 
            onClick={() => setEditingMessage(null)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#667781', fontWeight: 'bold', fontSize: '1rem', padding: '4px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Reply Quote Preview Composer Bar */}
      {replyingToMessage && (
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            backgroundColor: '#f0f2f5',
            borderLeft: '4px solid var(--primary-teal)',
            borderTop: '1px solid var(--border-color)',
            gap: '12px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--primary-teal-dark)', fontSize: '0.75rem' }}>
              Replying to {isSameUser(replyingToMessage.sender, user) ? 'yourself' : replyingToMessage.sender?.name || 'User'}
            </div>
            <div style={{ color: '#667781', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {replyingToMessage.isDeleted ? 'This message was deleted' : (replyingToMessage.text || (replyingToMessage.type === 'image' ? '🖼️ Photo' : replyingToMessage.type === 'audio' ? '🎙 Voice message' : ''))}
            </div>
          </div>
          <button 
            onClick={() => onSetReplyingToMessage(null)}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#667781',
              fontWeight: 'bold',
              fontSize: '1rem',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      <MessageInput 
        onSendMessage={async (text, file, mediaDuration) => {
          if (editingMessage) {
            await onEditMessage(editingMessage._id, text);
            setEditingMessage(null);
          } else {
            await onSendMessage(text, file, mediaDuration);
          }
        }} 
        onTyping={onTyping} 
        replyingToMessage={replyingToMessage}
        editingMessage={editingMessage}
      />

      <ForwardModal
        isOpen={forwardingMessages.length > 0}
        onClose={() => setForwardingMessages([])}
        conversations={conversations}
        messagesToForward={forwardingMessages}
        onForward={(selectedConversationIds) => {
          const messageIds = forwardingMessages.map((m) => m._id || m.id);
          onForwardMessage(messageIds, selectedConversationIds);
          setForwardingMessages([]);
          setSelectedMessageIds([]); // clear selection after forward
        }}
      />
    </div>
  );
}

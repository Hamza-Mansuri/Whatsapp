import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import useAuth from '../../hooks/useAuth';
import { isSameUser } from '../../utils/conversation';

export default function MessageBubble({
  msgId,
  text,
  timestamp,
  sender,
  status,
  replyTo,
  reactions = [],
  isDeleted = false,
  isEdited = false,
  isForwarded = false,
  type = 'text',
  mediaUrl = null,
  callType = null,
  callStatus = null,
  isGroup = false,
  onDeleteMessage,
  showToast,
  searchQuery,
  onReplyMessage,
  onToggleReaction,
  onEditMessage,
  onForwardMessage,
  onQuoteClick,
  highlightedMessageId,
  activeMenuMessageId,
  setActiveMenuMessageId,
  isSelected,
  onToggleSelect,
  selectionModeActive,
}) {
  const { user } = useAuth();
  const isMe = sender === 'me' || isSameUser(sender, user);
  const BACKEND_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';
  const resolvedMediaUrl = mediaUrl?.startsWith('/uploads/') ? `${BACKEND_URL}${mediaUrl}` : mediaUrl;

  // States
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [menuDirection, setMenuDirection] = useState('down');
  
  const menuRef = useRef(null);
  const bubbleRef = useRef(null);

  const showMenu = activeMenuMessageId === msgId;

  // Parse reactions safely
  const messageReactions = reactions || [];

  // Trigger flash highlight when highlightedMessageId matches msgId
  useEffect(() => {
    if (highlightedMessageId === msgId) {
      setIsHighlighted(true);
      const timer = setTimeout(() => setIsHighlighted(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedMessageId, msgId]);

  // Close menu when clicking outside, handle smart positioning
  useEffect(() => {
    if (showMenu) {
      if (bubbleRef.current) {
        const rect = bubbleRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        // Flip menu upwards if close to the bottom
        if (rect.bottom > viewportHeight - 200) {
          setMenuDirection('up');
        } else {
          setMenuDirection('down');
        }
      }

      const handleOutsideClick = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) {
          setActiveMenuMessageId(null);
        }
      };
      
      document.addEventListener('mousedown', handleOutsideClick);
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
      };
    }
  }, [showMenu, setActiveMenuMessageId]);

  // Escape key listener for lightbox
  useEffect(() => {
    if (showLightbox) {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setShowLightbox(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showLightbox]);

  // Format timestamp
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('AM') || dateStr.includes('PM') || dateStr.includes('Yesterday') || dateStr.includes('Monday') || dateStr.includes('Sunday')) {
      return dateStr;
    }
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  // Clipboard Copy Action
  const handleCopy = async () => {
    if (isDeleted) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Message copied');
    } catch (err) {
      showToast('Unable to copy message');
    }
    setActiveMenuMessageId(null);
  };

  // Deletion Action
  const handleDelete = () => {
    onDeleteMessage(msgId);
    setShowConfirm(false);
  };

  // Quote Click Handler
  const handleQuoteClick = (e) => {
    e.stopPropagation();
    if (replyTo) {
      const targetId = replyTo._id || replyTo.id;
      onQuoteClick?.(targetId);
    }
  };

  // Case-Insensitive Search Highlighting Helper
  const highlightMatch = (fullText, query) => {
    if (!query) return fullText;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = fullText.split(new RegExp(`(${escapedQuery})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} style={{ backgroundColor: '#ffe97d', color: '#111B21', borderRadius: '2px', padding: '0 2px' }}>
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const bubbleBg = isHighlighted
    ? '#ffe97d'
    : (isMe ? 'var(--bubble-sent)' : 'var(--bubble-received)');

  return (
    <div
      className={`message-bubble-wrapper ${isMe ? 'sent' : 'received'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      id={`msg-${msgId}`}
      style={{ 
        position: 'relative', 
        backgroundColor: isSelected ? 'rgba(0,168,132,0.1)' : 'transparent',
        transition: 'background-color 0.2s ease',
        cursor: selectionModeActive ? 'pointer' : 'default',
        padding: '2px 0',
        marginBottom: messageReactions.length > 0 && !isDeleted ? '12px' : '2px',
      }}
      ref={bubbleRef}
      onClick={() => {
        if (selectionModeActive) {
          onToggleSelect?.(msgId);
        }
      }}
    >
      {type === 'system' ? (
        <div style={{ 
          textAlign: 'center', 
          margin: '8px auto', 
          fontSize: '0.75rem', 
          color: '#54656f', 
          backgroundColor: '#f0f2f5', 
          padding: '4px 12px', 
          borderRadius: '12px',
          boxShadow: '0 1px 0.5px rgba(11,20,26,.13)',
          display: 'inline-block',
          maxWidth: '80%'
        }}>
          {text}
        </div>
      ) : (
      <div 
        className="message-bubble" 
        style={{ 
          position: 'relative', 
          minWidth: '85px', 
          padding: '6px 8px 6px 8px', 
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: bubbleBg,
          transition: 'background-color 0.3s ease',
        }}
      >
        {!isMe && isGroup && sender?.name && (
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1fa855', marginBottom: '2px', cursor: 'pointer' }}>
            {sender.name}
          </div>
        )}

        {isForwarded && !isDeleted && (
          <div style={{ fontSize: '0.7rem', color: '#8696a0', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px', fontStyle: 'italic' }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M5.5 13.5v-3C5.5 7.46 8.46 4.5 11.5 4.5h6.67L16.3 2.63l.7-.71L20.5 5.4 17 8.9l-.71-.71 1.88-1.88H11.5c-2.21 0-4 1.79-4 4v3H5.5zm10 2.5v3c0 3.04-2.96 6-6 6H2.83l1.88 1.88-.7.71L.5 24l3.5-3.5.71.71L2.83 23H9.5c2.21 0 4-1.79 4-4v-3h2z"/>
            </svg>
            Forwarded
          </div>
        )}

        {/* Quoted Reply Section */}
        {replyTo && !isDeleted && (
          <div 
            onClick={handleQuoteClick}
            style={{
              backgroundColor: 'rgba(0,0,0,0.05)',
              borderLeft: '3px solid var(--primary-teal)',
              padding: '4px 8px',
              borderRadius: '4px',
              marginBottom: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              userSelect: 'none',
              maxWidth: '100%',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--primary-teal-dark)', fontSize: '0.75rem' }}>
              {isSameUser(replyTo.sender, user) ? 'You' : replyTo.sender?.name || 'User'}
            </div>
            <div style={{ color: '#667781', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {replyTo.isDeleted ? 'This message was deleted' : (replyTo.text || (replyTo.type === 'image' ? '🖼️ Photo' : replyTo.type === 'audio' ? '🎙 Voice message' : ''))}
            </div>
          </div>
        )}

        {/* Render Image Attachment */}
        {type === 'image' && mediaUrl && !isDeleted && (
          <div 
            style={{ 
              marginBottom: text ? '4px' : '0', 
              borderRadius: '6px', 
              overflow: 'hidden',
              cursor: 'pointer',
              maxHeight: '260px',
              maxWidth: '100%',
              display: 'flex',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.03)'
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowLightbox(true);
            }}
          >
            <img 
              src={resolvedMediaUrl} 
              alt="Attachment" 
              style={{ maxWidth: '100%', maxHeight: '260px', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Render File/Document Attachment */}
        {type === 'file' && mediaUrl && !isDeleted && (
          <div 
            style={{ 
              marginBottom: text ? '4px' : '0', 
              borderRadius: '6px', 
              backgroundColor: 'rgba(0,0,0,0.05)',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer'
            }}
            onClick={(e) => {
              e.stopPropagation();
              window.open(resolvedMediaUrl, '_blank');
            }}
          >
            <div style={{ backgroundColor: '#7f66ff', color: 'white', borderRadius: '4px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem', color: 'var(--primary-text)' }}>
              Document
            </div>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#667781">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
          </div>
        )}

        {type === 'audio' && mediaUrl && !isDeleted && (
          <AudioPlayer mediaUrl={resolvedMediaUrl} isMe={isMe} msgId={msgId} />
        )}

        {type === 'call' && !isDeleted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '6px', marginBottom: text ? '4px' : '0' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%', 
              backgroundColor: callStatus === 'missed' ? '#f15c6d' : '#00a884',
              display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white'
            }}>
              {callType === 'video' ? (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.55-.45-1-1-1H6c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.49c0-.55-.45-1-1-1z"/></svg>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 500, color: callStatus === 'missed' ? '#f15c6d' : 'inherit' }}>
                {callStatus === 'missed' ? 'Missed call' : 'Call ended'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#8696a0' }}>
                {callType === 'video' ? 'Video' : 'Audio'}
              </span>
            </div>
          </div>
        )}

        {text || isDeleted ? (
          <div style={{ display: 'block', position: 'relative' }}>
            <span 
              className="message-text" 
              style={{ 
                margin: 0, 
                wordBreak: 'break-word', 
                whiteSpace: 'pre-wrap', 
                fontSize: '0.95rem', 
                lineHeight: '1.4',
                color: isDeleted ? '#8696a0' : 'inherit',
                fontStyle: isDeleted ? 'italic' : 'normal',
              }}
            >
              {isDeleted ? 'This message was deleted' : highlightMatch(text, searchQuery)}
            </span>

            <span 
              className="message-meta" 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                float: 'right', 
                gap: '4px', 
                marginTop: '6px', 
                marginLeft: '12px', 
                height: '15px',
                position: 'relative',
                top: '2px',
              }}
            >
              {isEdited && !isDeleted && (
                <span className="message-edited" style={{ fontSize: '0.65rem', color: '#8696a0', userSelect: 'none', marginRight: '4px' }}>
                  Edited
                </span>
              )}
              <span className="message-time" style={{ fontSize: '0.65rem', color: '#8696a0', userSelect: 'none' }}>
                {formatTime(timestamp)}
              </span>
              {isMe && (
                <span
                  className="read-status-ticks"
                  style={{ color: status === 'read' ? '#53bdeb' : '#8696a0', display: 'inline-flex' }}
                >
                  {status === 'sent' ? (
                    <svg viewBox="0 0 16 15" width="10" height="15" fill="currentColor">
                      <path d="M15.01 3.3L6.4 11.9 2.5 8l-.9.9 4.8 4.8L16 4.2l-.99-.9z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 16 15" width="15" height="15" fill="currentColor">
                      <path d="M15.01 3.3L6.4 11.9 2.5 8l-.9.9 4.8 4.8L16 4.2l-.99-.9zM11.37 3.3L10.48 2.4l-5.32 5.3L6 8.59l5.37-5.29z" />
                    </svg>
                  )}
                </span>
              )}
            </span>
            <div style={{ clear: 'both' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
            <span 
              className="message-meta" 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '4px', 
                height: '15px',
              }}
            >
              {isEdited && !isDeleted && (
                <span className="message-edited" style={{ fontSize: '0.65rem', color: '#8696a0', userSelect: 'none', marginRight: '4px' }}>
                  Edited
                </span>
              )}
              <span className="message-time" style={{ fontSize: '0.65rem', color: '#8696a0', userSelect: 'none' }}>
                {formatTime(timestamp)}
              </span>
              {isMe && (
                <span
                  className="read-status-ticks"
                  style={{ color: status === 'read' ? '#53bdeb' : '#8696a0', display: 'inline-flex' }}
                >
                  {status === 'sent' ? (
                    <svg viewBox="0 0 16 15" width="10" height="15" fill="currentColor">
                      <path d="M15.01 3.3L6.4 11.9 2.5 8l-.9.9 4.8 4.8L16 4.2l-.99-.9z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 16 15" width="15" height="15" fill="currentColor">
                      <path d="M15.01 3.3L6.4 11.9 2.5 8l-.9.9 4.8 4.8L16 4.2l-.99-.9zM11.37 3.3L10.48 2.4l-5.32 5.3L6 8.59l5.37-5.29z" />
                    </svg>
                  )}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Hover/Tap actions menu trigger button */}
        {(isHovered || showMenu) && !isDeleted && (
          <button
            className="bubble-menu-trigger"
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuMessageId(showMenu ? null : msgId);
            }}
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: showMenu ? 'rgba(0,0,0,0.1)' : 'none',
              border: 'none',
              color: '#8696a0',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              transition: 'background 0.2s',
            }}
            title="Options"
          >
            <svg viewBox="0 0 19 20" width="18" height="18" fill="currentColor">
              <path d="M3.8 6.7l5.7 5.7 5.7-5.7 1.6 1.6-7.3 7.2-7.3-7.2 1.6-1.6z" />
            </svg>
          </button>
        )}

        {/* Menu Dropdown Panel */}
        {showMenu && !isDeleted && (
          <div
            ref={menuRef}
            className="bubble-dropdown-menu"
            style={{
              position: 'absolute',
              top: menuDirection === 'down' ? '26px' : 'auto',
              bottom: menuDirection === 'up' ? '26px' : 'auto',
              right: isMe ? '4px' : 'auto',
              left: !isMe ? '4px' : 'auto',
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              borderRadius: '4px',
              padding: '4px 0',
              zIndex: 30,
              minWidth: '120px',
            }}
          >
            {/* Emoji Reactions Toolbar Row */}
            <div 
              style={{
                display: 'flex',
                gap: '8px',
                padding: '6px 8px',
                borderBottom: '1px solid var(--border-color)',
                justifyContent: 'center',
              }}
            >
              {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => {
                const userHasReacted = messageReactions.some(
                  (r) => r.emoji === emoji && r.users.some(uId => isSameUser(uId, user))
                );
                return (
                  <span 
                    key={emoji}
                    onClick={() => {
                      onToggleReaction?.(msgId, emoji);
                      setActiveMenuMessageId(null);
                    }}
                    style={{
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      padding: '2px',
                      borderRadius: '4px',
                      backgroundColor: userHasReacted ? '#e6f7f4' : 'transparent',
                      transition: 'background-color 0.1s',
                    }}
                    title={emoji}
                  >
                    {emoji}
                  </span>
                );
              })}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onReplyMessage?.({ _id: msgId, text, sender, isDeleted, type });
                setActiveMenuMessageId(null);
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '6px 12px',
                textAlign: 'left',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                color: '#111B21',
              }}
            >
              Reply
            </button>
            {type === 'text' && isMe && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditMessage?.({ _id: msgId, text });
                  setActiveMenuMessageId(null);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '6px 12px',
                  textAlign: 'left',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: '#111B21',
                }}
              >
                Edit
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onForwardMessage?.({ _id: msgId, text, type, mediaUrl });
                setActiveMenuMessageId(null);
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '6px 12px',
                textAlign: 'left',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                color: '#111B21',
              }}
            >
              Forward
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.(msgId);
                setActiveMenuMessageId(null);
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '6px 12px',
                textAlign: 'left',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                color: '#111B21',
              }}
            >
              Select
            </button>
            {!isDeleted && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '6px 12px',
                  textAlign: 'left',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: '#111B21',
                }}
              >
                Copy
              </button>
            )}
            {isMe && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuMessageId(null);
                  setShowConfirm(true);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '6px 12px',
                  textAlign: 'left',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: '#ea0038',
                }}
              >
                Delete
              </button>
            )}
          </div>
        )}

        {/* Render reactions count indicators */}
        {messageReactions.length > 0 && !isDeleted && (
          <div 
            style={{ 
              display: 'flex', 
              gap: '4px', 
              flexWrap: 'wrap', 
              marginTop: '0px', 
              marginBottom: '-14px',
              position: 'relative',
              zIndex: 5,
              alignSelf: isMe ? 'flex-end' : 'flex-start',
            }}
          >
            {messageReactions.map((reaction) => {
              const userHasReacted = reaction.users.some(uId => isSameUser(uId, user));
              return (
                <span 
                  key={reaction.emoji}
                  onClick={() => onToggleReaction?.(msgId, reaction.emoji)}
                  style={{
                    backgroundColor: userHasReacted ? '#e6f7f4' : '#f0f2f5',
                    border: userHasReacted ? '1px solid var(--primary-teal)' : '1px solid var(--border-color)',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                    userSelect: 'none',
                  }}
                >
                  <span>{reaction.emoji}</span>
                  <span style={{ fontWeight: 600, color: '#667781' }}>{reaction.users.length}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* Delete Confirmation Modal Overlay */}
      {showConfirm && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              width: '280px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
          >
            <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#111B21' }}>Delete message?</h4>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  border: '1px solid var(--border-color)',
                  background: 'white',
                  borderRadius: '20px',
                  padding: '6px 16px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  color: '#111B21',
                  fontWeight: '500',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{
                  border: 'none',
                  background: '#00a884',
                  color: 'white',
                  borderRadius: '20px',
                  padding: '6px 16px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Lightbox Overlay */}
      {showLightbox && type === 'image' && mediaUrl && !isDeleted && ReactDOM.createPortal(
        <div
          onClick={(e) => { e.stopPropagation(); setShowLightbox(false); }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999999,
            padding: '20px'
          }}
        >
          <img 
            src={mediaUrl.startsWith('http') ? mediaUrl : `${BACKEND_URL}${mediaUrl}`} 
            alt="Enlarged attachment" 
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => { e.stopPropagation(); setShowLightbox(false); }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '30px',
              cursor: 'pointer',
              zIndex: 1000000,
            }}
          >
            ✕
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}

// Global state for currently playing audio
let currentlyPlayingAudioId = null;
let currentlyPlayingAudioFn = null;

function AudioPlayer({ mediaUrl, isMe, msgId }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(mediaUrl);
    audioRef.current = audio;

    const setAudioData = () => {
      if (audio.duration && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };
    const setAudioTime = () => setProgress(audio.currentTime);
    
    // Attempt to get duration early
    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(0);
      currentlyPlayingAudioId = null;
      currentlyPlayingAudioFn = null;
    });

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.pause();
      if (currentlyPlayingAudioId === msgId) {
        currentlyPlayingAudioId = null;
        currentlyPlayingAudioFn = null;
      }
    };
  }, [mediaUrl, msgId]);

  const togglePlayPause = (e) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      currentlyPlayingAudioId = null;
      currentlyPlayingAudioFn = null;
    } else {
      if (currentlyPlayingAudioId && currentlyPlayingAudioId !== msgId && currentlyPlayingAudioFn) {
        currentlyPlayingAudioFn(); // Pause the other one
      }
      currentlyPlayingAudioId = msgId;
      currentlyPlayingAudioFn = () => {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      };
      
      audioRef.current.play().catch(e => console.error("Playback error", e));
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    if (!audioRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const seekTime = percentage * duration;
    audioRef.current.currentTime = seekTime;
    setProgress(seekTime);
  };

  const formatDuration = (secs) => {
    if (isNaN(secs) || secs === 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const displayTime = isPlaying ? progress : duration;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '200px', padding: '4px' }}>
      {/* Play/Pause Button */}
      <button 
        onClick={togglePlayPause}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: 'none',
          background: isMe ? '#00a884' : '#e0e0e0',
          color: isMe ? 'white' : '#54656f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>

      {/* Progress Bar / Waveform */}
      <div 
        onClick={handleSeek}
        style={{ flex: 1, height: '4px', backgroundColor: isMe ? 'rgba(255,255,255,0.4)' : '#d1d7db', borderRadius: '2px', cursor: 'pointer', position: 'relative' }}
      >
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          height: '100%', 
          backgroundColor: isMe ? 'white' : '#00a884',
          borderRadius: '2px',
          width: duration > 0 ? `${(progress / duration) * 100}%` : '0%'
        }} />
        <div style={{
          position: 'absolute',
          top: '-4px',
          left: duration > 0 ? `calc(${(progress / duration) * 100}% - 6px)` : '-6px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: isMe ? 'white' : '#00a884',
          transition: 'left 0.1s linear'
        }} />
      </div>

      {/* Duration */}
      <div style={{ fontSize: '0.75rem', color: isMe ? 'rgba(255,255,255,0.8)' : '#54656f', minWidth: '35px', textAlign: 'right' }}>
        {formatDuration(displayTime)}
      </div>
    </div>
  );
}

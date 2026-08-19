import React, { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';
import useAuth from '../../hooks/useAuth';
import { isSameUser } from '../../utils/conversation';

export default function MessageList({
  messages,
  activeChatId,
  isGroup = false,
  onDeleteMessage,
  showToast,
  searchQuery,
  highlightedMessageId,
  hasMore,
  loadingOlder,
  onLoadOlder,
  onReplyMessage,
  onToggleReaction,
  onEditMessage,
  onForwardMessage,
  selectedMessageIds = [],
  onToggleSelect,
}) {
  const { user } = useAuth();
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState(null);
  const [localHighlightId, setLocalHighlightId] = useState(null);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState(null);
  
  const isInitialMount = useRef(true);
  const lastMessageIdRef = useRef(null);

  // Reset states when active conversation changes
  useEffect(() => {
    isInitialMount.current = true;
    setShowScrollBtn(false);
    setNewMessagesCount(0);
    lastMessageIdRef.current = null;
    setFirstUnreadMessageId(null);
    setLocalHighlightId(null);
    setActiveMenuMessageId(null);
  }, [activeChatId]);

  // Track the first incoming unread message on initial conversation load
  useEffect(() => {
    if (isInitialMount.current && messages.length > 0) {
      const firstUnread = messages.find((m) => !isSameUser(m.sender, user) && m.status !== 'read');
      if (firstUnread) {
        setFirstUnreadMessageId(firstUnread._id || firstUnread.id);
      } else {
        // No unread messages, safe to scroll to bottom now
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
        isInitialMount.current = false;
        setShowScrollBtn(false);
      }
    }
  }, [messages, user]);

  // Clear quote highlight after 2.5 seconds
  useEffect(() => {
    if (localHighlightId) {
      const timer = setTimeout(() => setLocalHighlightId(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [localHighlightId]);

  // Auto-scroll and handle new messages count updates
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const lastMsg = messages[messages.length - 1];
    const lastMsgId = lastMsg ? (lastMsg._id || lastMsg.id) : null;
    const isNewMessageAppended = lastMsgId && lastMsgId !== lastMessageIdRef.current && lastMessageIdRef.current !== null;
    
    lastMessageIdRef.current = lastMsgId;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;

    if (isInitialMount.current) {
      // If we have a firstUnreadMessageId, we wait for its DOM element
      if (firstUnreadMessageId) {
        const unreadDivider = document.getElementById(`unread-sep-${firstUnreadMessageId}`);
        if (unreadDivider) {
          unreadDivider.scrollIntoView({ behavior: 'auto', block: 'center' });
          isInitialMount.current = false;
          // Show scroll button if we aren't near bottom
          const nearBottomAfterScroll = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
          setShowScrollBtn(!nearBottomAfterScroll);
          setNewMessagesCount(0);
        }
      }
      // If no firstUnreadMessageId, the other useEffect handles the scroll-to-bottom and sets isInitialMount to false
    } else if (isNewMessageAppended) {
      if (isNearBottom) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        setShowScrollBtn(false);
        setNewMessagesCount(0);
      } else {
        setShowScrollBtn(true);
        setNewMessagesCount((prev) => prev + 1);
      }
    } else if (isNearBottom) {
      // User manually scrolled to bottom, hide pill
      setShowScrollBtn(false);
      setNewMessagesCount(0);
    }
  }, [messages, firstUnreadMessageId]);

  // Scroll search target into view
  useEffect(() => {
    if (highlightedMessageId) {
      const el = document.getElementById(`msg-${highlightedMessageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedMessageId]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    if (container.scrollTop < 50 && hasMore && !loadingOlder && onLoadOlder) {
      const oldScrollHeight = container.scrollHeight;
      const oldScrollTop = container.scrollTop;

      onLoadOlder().then(() => {
        requestAnimationFrame(() => {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
        });
      });
    }

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom) {
      setShowScrollBtn(false);
      setNewMessagesCount(0);
    }
  };

  const handleScrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBtn(false);
    setNewMessagesCount(0);
  };

  // Locate quoted message, dynamically paginating older chunks if necessary
  const handleQuoteClick = async (targetId) => {
    const el = document.getElementById(`msg-${targetId}`);
    if (el) {
      setLocalHighlightId(targetId);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (hasMore && onLoadOlder) {
      const container = containerRef.current;
      if (!container) return;
      
      const oldScrollHeight = container.scrollHeight;
      const oldScrollTop = container.scrollTop;

      await onLoadOlder();

      requestAnimationFrame(() => {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);

        // Check if now loaded, otherwise recurse
        setTimeout(() => {
          handleQuoteClick(targetId);
        }, 100);
      });
    }
  };

  // Format Calendar separators
  const formatDateSeparator = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Compile items with separators dynamically
  const renderedItems = [];
  let lastDate = null;

  messages.forEach((msg) => {
    const msgDate = new Date(msg.createdAt).toDateString();

    if (msgDate !== lastDate) {
      renderedItems.push(
        <div key={`sep-${msg._id || msg.id}`} className="date-separator" style={{ textAlign: 'center', margin: '14px 0', userSelect: 'none' }}>
          <span style={{ backgroundColor: '#ffffff', color: '#667781', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 600, boxShadow: 'var(--shadow-sm)' }}>
            {formatDateSeparator(msg.createdAt)}
          </span>
        </div>
      );
      lastDate = msgDate;
    }

    if (msg._id === firstUnreadMessageId) {
      // Calculate how many unread messages there are from this point
      const unreadCount = messages.filter((m) => !isSameUser(m.sender, user) && m.status !== 'read').length;
      if (unreadCount > 0) {
        renderedItems.push(
          <div id={`unread-sep-${msg._id}`} key={`unread-sep-${msg._id}`} className="unread-separator" style={{ textAlign: 'center', margin: '14px 0', userSelect: 'none' }}>
            <span style={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--primary-teal-dark)', padding: '6px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600, boxShadow: 'var(--shadow-sm)' }}>
              {unreadCount} unread message{unreadCount > 1 ? 's' : ''}
            </span>
          </div>
        );
      }
    }

    renderedItems.push(
      <MessageBubble
        key={msg._id || msg.id}
        msgId={msg._id || msg.id}
        text={msg.text}
        timestamp={msg.createdAt || msg.timestamp}
        sender={msg.sender}
        status={msg.status}
        replyTo={msg.replyTo}
        reactions={msg.reactions}
        isDeleted={msg.isDeleted}
        isEdited={msg.isEdited}
        isForwarded={msg.isForwarded}
        type={msg.type}
        mediaUrl={msg.mediaUrl}
        callType={msg.callType}
        callStatus={msg.callStatus}
        isGroup={isGroup}
        onDeleteMessage={onDeleteMessage}
        showToast={showToast}
        searchQuery={searchQuery}
        onReplyMessage={onReplyMessage}
        onToggleReaction={onToggleReaction}
        onEditMessage={onEditMessage}
        onForwardMessage={onForwardMessage}
        onQuoteClick={handleQuoteClick}
        highlightedMessageId={localHighlightId || highlightedMessageId}
        activeMenuMessageId={activeMenuMessageId}
        setActiveMenuMessageId={setActiveMenuMessageId}
        isSelected={selectedMessageIds.includes(msg._id || msg.id)}
        onToggleSelect={onToggleSelect}
        selectionModeActive={selectedMessageIds.length > 0}
      />
    );
  });

  return (
    <div 
      className="message-list-container" 
      ref={containerRef} 
      onScroll={handleScroll}
      style={{ position: 'relative', overflowY: 'auto', flex: 1 }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .new-messages-pill {
          animation: slideUp 0.2s ease-out forwards;
        }
      `}</style>

      {loadingOlder && (
        <div style={{ textAlign: 'center', padding: '8px 0', color: '#667781', fontSize: '0.75rem', fontStyle: 'italic', backgroundColor: 'rgba(0,0,0,0.02)' }}>
          Loading older messages...
        </div>
      )}

      <div className="message-list">
        {renderedItems}
        <div ref={bottomRef} />
      </div>

      {showScrollBtn && (
        <button
          className="new-messages-pill"
          onClick={handleScrollToBottom}
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#e6f7f4',
            border: '1px solid rgba(0, 168, 132, 0.3)',
            color: '#008f72',
            boxShadow: '0 2px 8px rgba(11, 20, 26, 0.12)',
            padding: '6px 14px',
            borderRadius: '16px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            pointerEvents: 'auto',
          }}
        >
          <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>↓</span>
          <span>
            {newMessagesCount > 1
              ? `${newMessagesCount} new messages`
              : 'New message'}
          </span>
        </button>
      )}
    </div>
  );
}

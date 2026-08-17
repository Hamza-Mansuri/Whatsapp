import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Sidebar from '../chat/Sidebar';
import ChatWindow from '../chat/ChatWindow';
import ProfilePanel from '../profile/ProfilePanel';
import NewGroupPanel from '../chat/NewGroupPanel';
import apiClient from '../../services/api';
import useAuth from '../../hooks/useAuth';
import { socketService } from '../../services/socket';
import { getUserId, getOtherParticipant, isSameUser } from '../../utils/conversation';
import { showNewMessageNotification, updatePageTitle } from '../../utils/notification';

export default function ChatLayout() {
  const { user, refreshUser } = useAuth();

  // State Management
  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({}); // conversationId -> Set of userIds who are typing
  const [toastMessage, setToastMessage] = useState('');

  // Users List States
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);

  // Pagination States
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // Reply States
  const [replyingToMessage, setReplyingToMessage] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatList, setShowNewChatList] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list', 'chat', or 'profile'
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showNewGroupPanel, setShowNewGroupPanel] = useState(false);

  // Ref to track the current activeChatId to prevent re-binding listeners
  const activeChatIdRef = useRef(activeChatId);
  const typingTimeoutsRef = useRef({});

  // Sync ref with activeChatId state changes
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Toast Notification Helper
  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    const timer = setTimeout(() => setToastMessage(''), 2500);
    return () => clearTimeout(timer);
  }, []);

  // 1. Fetch Conversations from API
  const fetchConversations = useCallback(async () => {
    try {
      const response = await apiClient.get('/conversations');
      if (response.data && response.data.success) {
        setConversations(response.data.conversations);
      }
    } catch (error) {
      console.error('Fetch Conversations Error:', error.message);
    }
  }, []);

  // 2. Fetch Available Users from API
  const fetchAvailableUsers = useCallback(async () => {
    if (!user) return;
    setLoadingUsers(true);
    setUsersError(null);
    try {
      // Append a timestamp to completely bypass iOS Safari's aggressive caching
      const response = await apiClient.get(`/users?_t=${new Date().getTime()}`);
      if (response.data && response.data.success) {
        const currentUserId = getUserId(user);
        const filtered = response.data.users.filter((u) => getUserId(u) !== currentUserId);
        setAvailableUsers(filtered);
      } else {
        setUsersError(`Failed to load users: ${JSON.stringify(response.data || 'Empty Response')}`);
      }
    } catch (error) {
      console.error('Fetch Available Users Error:', error);
      const status = error.response ? error.response.status : 'No Status';
      const errMsg = error.response?.data?.message || error.message;
      setUsersError(`Network error (${status}): ${errMsg}`);
    } finally {
      setLoadingUsers(false);
    }
  }, [user]);

  // 3. Fetch Messages for Active Conversation (Loads page 1 initially)
  const fetchMessages = useCallback(async (convId) => {
    try {
      const response = await apiClient.get(`/conversations/${convId}/messages?page=1&limit=30`);
      if (response.data && response.data.success) {
        setMessages(response.data.messages);
        setHasMore(response.data.hasMore);
      }
    } catch (error) {
      console.error('Fetch Messages Error:', error.message);
    }
  }, []);

  // 4. Lazy Load Older Message History
  const loadOlderMessages = useCallback(async () => {
    if (loadingOlder || !hasMore || !activeChatId) return;
    setLoadingOlder(true);
    try {
      const nextPage = page + 1;
      const response = await apiClient.get(`/conversations/${activeChatId}/messages?page=${nextPage}&limit=30`);
      if (response.data && response.data.success) {
        const olderMessages = response.data.messages;
        
        setMessages((prev) => {
          const newMessages = olderMessages.filter((om) => !prev.some((pm) => pm._id === om._id));
          return [...newMessages, ...prev];
        });
        
        setPage(nextPage);
        setHasMore(response.data.hasMore);
      }
    } catch (error) {
      console.error('Load Older Messages Error:', error.message);
    } finally {
      setLoadingOlder(false);
    }
  }, [activeChatId, page, hasMore, loadingOlder]);

  // 5. Mark conversation as read (REST endpoint)
  const markConversationAsRead = useCallback(async (convId) => {
    if (!convId) return;
    try {
      await apiClient.put(`/conversations/${convId}/read`);
      setConversations((prev) =>
        prev.map((c) => {
          if (c._id === convId) {
            return { ...c, unreadCount: 0 };
          }
          return c;
        })
      );
      
      // Also mark messages locally as read so the unread divider disappears
      setMessages((prev) => 
        prev.map((m) => {
          if (!isSameUser(m.sender, user) && m.status !== 'read') {
            return { ...m, status: 'read' };
          }
          return m;
        })
      );
    } catch (error) {
      console.error('Error marking conversation as read:', error.message);
    }
  }, [user]);

  // Fetch initial details on mount
  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchAvailableUsers();
    }
  }, [user, fetchConversations, fetchAvailableUsers]);

  // Update document title with unread counts
  useEffect(() => {
    const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
    updatePageTitle(totalUnread);
  }, [conversations]);

  // Listen for notification clicks to switch chats
  useEffect(() => {
    const handleNotificationClick = (e) => {
      const { conversationId } = e.detail;
      if (conversationId) {
        setActiveChatId(conversationId);
        setMobileView('chat');
      }
    };
    window.addEventListener('notification_clicked', handleNotificationClick);
    return () => window.removeEventListener('notification_clicked', handleNotificationClick);
  }, []);

  // Socket.IO lifecycle connection and handlers (Runs once on mount / user change)
  useEffect(() => {
    if (!user) return;

    // Connect to Socket.IO Server
    socketService.connect();

    // Handler when online users list is received
    const handleOnlineUsersList = (list) => {
      setOnlineUserIds(new Set(list));
    };

    // Handler when user status changes
    const handleUserStatusChange = ({ userId, status, lastSeen }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (status === 'online') {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });

      if (status === 'offline' && lastSeen) {
        setConversations((prev) => 
          prev.map((c) => {
            const participants = c.participants.map((p) => 
              (p._id === userId || p.id === userId) ? { ...p, lastSeen } : p
            );
            return { ...c, participants };
          })
        );
        
        setAvailableUsers((prev) => 
          prev.map((u) => 
            (u._id === userId || u.id === userId) ? { ...u, lastSeen } : u
          )
        );
      }
    };

    // Handler when new message is received in conversation
    const handleMessageReceived = (message) => {
      const isFromOther = !isSameUser(message.sender, user);
      const senderName = message.sender?.name || 'User';

      // If the message belongs to the currently active conversation, append it
      if (message.conversation === activeChatIdRef.current) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
        
        if (document.hidden && isFromOther) {
          showNewMessageNotification(message, senderName);
          // We increment unread count locally if document is hidden, so it shows in title/sidebar
          setConversations((prev) => prev.map((c) => {
            if (c._id === message.conversation) {
              return {
                ...c,
                unreadCount: (c.unreadCount || 0) + 1,
                lastMessage: message,
                lastMessageAt: message.createdAt,
              };
            }
            return c;
          }).sort((a, b) => new Date(b.lastMessageAt || b.updatedAt) - new Date(a.lastMessageAt || a.updatedAt)));
        } else {
          // Immediately mark as read
          markConversationAsRead(activeChatIdRef.current);
        }
      } else {
        // Not active chat: Increment unread count and SHOW NOTIFICATION
        if (isFromOther) {
          showNewMessageNotification(message, senderName);
        }
        
        setConversations((prev) => {
          return prev
            .map((c) => {
              if (c._id === message.conversation) {
                return {
                  ...c,
                  unreadCount: isFromOther ? (c.unreadCount || 0) + 1 : (c.unreadCount || 0),
                  lastMessage: message,
                  lastMessageAt: message.createdAt,
                };
              }
              return c;
            })
            .sort((a, b) => new Date(b.lastMessageAt || b.updatedAt) - new Date(a.lastMessageAt || a.updatedAt));
        });
      }
    };

    // Handler to update sidebar previews on receipt of new messages
    const handleConversationUpdated = ({ conversationId, lastMessage }) => {
      setConversations((prev) => {
        return prev
          .map((c) => {
            if (c._id === conversationId) {
              const isNotActiveChat = activeChatIdRef.current !== conversationId;
              const isFromOther = lastMessage && !isSameUser(lastMessage.sender, user);
              const newUnreadCount = (isNotActiveChat && isFromOther) 
                ? (c.unreadCount || 0) + 1 
                : (c.unreadCount || 0);

              return {
                ...c,
                unreadCount: newUnreadCount,
                lastMessage,
                lastMessageAt: lastMessage ? lastMessage.createdAt : null,
              };
            }
            return c;
          })
          .sort((a, b) => new Date(b.lastMessageAt || b.updatedAt) - new Date(a.lastMessageAt || a.updatedAt));
      });
    };

    // Handler when user profile is updated
    const handleUserProfileUpdated = (updatedUser) => {
      if (user && (user._id === updatedUser.userId || user.id === updatedUser.userId)) {
        refreshUser();
      }

      setConversations((prev) => 
        prev.map(c => {
          const participants = c.participants.map(p => 
            (p._id === updatedUser.userId || p.id === updatedUser.userId)
              ? { ...p, name: updatedUser.name, avatar: updatedUser.avatar, about: updatedUser.about }
              : p
          );
          let lastMessage = c.lastMessage;
          if (lastMessage && (lastMessage.sender._id === updatedUser.userId || lastMessage.sender.id === updatedUser.userId)) {
            lastMessage = {
              ...lastMessage,
              sender: {
                ...lastMessage.sender,
                name: updatedUser.name,
                avatar: updatedUser.avatar
              }
            };
          }
          return { ...c, participants, lastMessage };
        })
      );

      setMessages((prev) => 
        prev.map(m => {
          if (m.sender._id === updatedUser.userId || m.sender.id === updatedUser.userId) {
            return {
              ...m,
              sender: {
                ...m.sender,
                name: updatedUser.name,
                avatar: updatedUser.avatar
              }
            };
          }
          return m;
        })
      );
    };

    // Handler when a user starts typing
    const handleTypingStart = ({ conversationId, userId }) => {
      setTypingUsers((prev) => {
        const currentSet = prev[conversationId] ? new Set(prev[conversationId]) : new Set();
        currentSet.add(userId);
        return { ...prev, [conversationId]: currentSet };
      });

      const timeoutKey = `${conversationId}_${userId}`;
      if (typingTimeoutsRef.current[timeoutKey]) {
        clearTimeout(typingTimeoutsRef.current[timeoutKey]);
      }

      typingTimeoutsRef.current[timeoutKey] = setTimeout(() => {
        handleTypingStop({ conversationId, userId });
      }, 3000);
    };

    // Handler when a user stops typing
    const handleTypingStop = ({ conversationId, userId }) => {
      setTypingUsers((prev) => {
        const currentSet = prev[conversationId] ? new Set(prev[conversationId]) : new Set();
        currentSet.delete(userId);
        return { ...prev, [conversationId]: currentSet };
      });

      const timeoutKey = `${conversationId}_${userId}`;
      if (typingTimeoutsRef.current[timeoutKey]) {
        clearTimeout(typingTimeoutsRef.current[timeoutKey]);
        delete typingTimeoutsRef.current[timeoutKey];
      }
    };

    // Handler when messages are marked as read by recipient
    const handleMessagesRead = ({ conversationId }) => {
      if (activeChatIdRef.current === conversationId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (isSameUser(m.sender, user) && m.status !== 'read') {
              return { ...m, status: 'read' };
            }
            return m;
          })
        );
      }

      setConversations((prev) =>
        prev.map((c) => {
          if (c._id === conversationId && c.lastMessage && isSameUser(c.lastMessage.sender, user) && c.lastMessage.status !== 'read') {
            return {
              ...c,
              lastMessage: { ...c.lastMessage, status: 'read' },
            };
          }
          return c;
        })
      );
    };

    // Handler when messages are marked as delivered to recipient
    const handleMessagesDelivered = ({ conversationId }) => {
      if (activeChatIdRef.current === conversationId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (isSameUser(m.sender, user) && m.status === 'sent') {
              return { ...m, status: 'delivered' };
            }
            return m;
          })
        );
      }

      setConversations((prev) =>
        prev.map((c) => {
          if (c._id === conversationId && c.lastMessage && isSameUser(c.lastMessage.sender, user) && c.lastMessage.status === 'sent') {
            return {
              ...c,
              lastMessage: { ...c.lastMessage, status: 'delivered' },
            };
          }
          return c;
        })
      );
    };

    // Handler when a message is deleted by sender
    const handleMessageDeleted = ({ messageId, conversationId }) => {
      if (activeChatIdRef.current === conversationId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m._id === messageId) {
              return { ...m, isDeleted: true, text: 'This message was deleted', reactions: [] };
            }
            return m;
          })
        );
      }
    };

    // Handler when reaction is toggled on a message
    const handleMessageReactionUpdated = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id === messageId) {
            return { ...m, reactions };
          }
          return m;
        })
      );
    };

    // Handler when a message is edited/updated
    const handleMessageUpdated = (updatedMessage) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id === updatedMessage._id) {
            return { ...m, ...updatedMessage };
          }
          return m;
        })
      );
    };

    // Setup Socket.IO listeners
    socketService.onOnlineUsersList(handleOnlineUsersList);
    socketService.onUserStatusChange(handleUserStatusChange);
    socketService.onMessageReceived(handleMessageReceived);
    socketService.onConversationUpdated(handleConversationUpdated);
    socketService.onTypingStart(handleTypingStart);
    socketService.onTypingStop(handleTypingStop);
    socketService.onMessagesRead(handleMessagesRead);
    socketService.onMessagesDelivered(handleMessagesDelivered);
    socketService.onMessageDeleted(handleMessageDeleted);
    socketService.onMessageReactionUpdated(handleMessageReactionUpdated);
    socketService.onMessageUpdated(handleMessageUpdated);
    socketService.onUserProfileUpdated(handleUserProfileUpdated);

    return () => {
      // Remove listeners and disconnect socket on teardown
      socketService.offOnlineUsersList(handleOnlineUsersList);
      socketService.offUserStatusChange(handleUserStatusChange);
      socketService.offMessageReceived(handleMessageReceived);
      socketService.offConversationUpdated(handleConversationUpdated);
      socketService.offTypingStart(handleTypingStart);
      socketService.offTypingStop(handleTypingStop);
      socketService.offMessagesRead(handleMessagesRead);
      socketService.offMessagesDelivered(handleMessagesDelivered);
      socketService.offMessageDeleted(handleMessageDeleted);
      socketService.offMessageReactionUpdated(handleMessageReactionUpdated);
      socketService.offMessageUpdated(handleMessageUpdated);
      socketService.offUserProfileUpdated(handleUserProfileUpdated);
      socketService.disconnect();
    };
  }, [user, markConversationAsRead]);

  // Join/leave Socket.IO rooms when selected chat changes
  useEffect(() => {
    if (activeChatId) {
      setPage(1);
      setHasMore(true);
      setLoadingOlder(false);
      setReplyingToMessage(null);
      socketService.joinConversation(activeChatId);
      fetchMessages(activeChatId);
      markConversationAsRead(activeChatId);
      
      return () => {
        socketService.leaveConversation(activeChatId);
      };
    } else {
      setMessages([]);
    }
  }, [activeChatId, fetchMessages, markConversationAsRead]);

  // Resolve currently selected active conversation object
  const activeChat = useMemo(() => {
    return conversations.find((c) => c._id === activeChatId) || null;
  }, [conversations, activeChatId]);

  // Resolve if other recipient is typing in active conversation
  const isRecipientTyping = useMemo(() => {
    if (!activeChatId || !activeChat) return false;
    const otherParticipant = getOtherParticipant(activeChat.participants, user);
    if (!otherParticipant) return false;
    const otherParticipantId = getUserId(otherParticipant);
    return typingUsers[activeChatId]?.has(otherParticipantId) || false;
  }, [activeChatId, activeChat, typingUsers, user]);

  // Handle selecting an existing chat
  const handleSelectChat = (id) => {
    setActiveChatId(id);
    setMobileView('chat');
  };

  // Handle mobile navigation back button
  const handleBackToMobileList = () => {
    setMobileView('list');
  };

  // Handle sending typing status to backend
  const handleTyping = useCallback((isTyping) => {
    if (!activeChatId) return;
    if (isTyping) {
      socketService.sendTypingStart(activeChatId);
    } else {
      socketService.sendTypingStop(activeChatId);
    }
  }, [activeChatId]);

  // Handle sending a text or media message
  const handleSendMessage = async (text, file, mediaDuration) => {
    if (!text?.trim() && !file) return;
    if (!activeChatId) return;

    try {
      let response;
      if (file) {
        // Send Media Message using FormData
        const formData = new FormData();
        formData.append('media', file);
        if (text?.trim()) formData.append('text', text.trim());
        if (replyingToMessage) formData.append('replyTo', replyingToMessage._id);
        if (mediaDuration) formData.append('mediaDuration', mediaDuration);

        response = await apiClient.post(`/conversations/${activeChatId}/messages/media`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Send regular Text Message
        const payload = { text: text?.trim() || '' };
        if (replyingToMessage) {
          payload.replyTo = replyingToMessage._id;
        }
        response = await apiClient.post(`/conversations/${activeChatId}/messages`, payload);
      }

      if (response.data && response.data.success) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === response.data.message._id)) return prev;
          return [...prev, response.data.message];
        });
        
        // Reset reply state
        setReplyingToMessage(null);
        
        // Refresh conversations list to update sidebar preview
        fetchConversations();
      }
    } catch (error) {
      console.error('Send Message Error:', error.message);
      showToast('Unable to send message');
      throw error;
    }
  };

  // Handle toggling reaction
  const handleToggleReaction = async (messageId, emoji) => {
    try {
      const response = await apiClient.post(`/messages/${messageId}/reaction`, { emoji });
      if (response.data && response.data.success) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m._id === messageId) {
              return { ...m, reactions: response.data.reactions };
            }
            return m;
          })
        );
      }
    } catch (error) {
      console.error('Toggle Reaction Error:', error.message);
      showToast('Unable to toggle reaction');
    }
  };

  // Handle message deletion (REST API trigger)
  const handleDeleteMessage = async (messageId) => {
    try {
      const response = await apiClient.delete(`/messages/${messageId}`);
      if (response.data && response.data.success) {
        // Soft delete locally immediately for the sender
        setMessages((prev) =>
          prev.map((m) => {
            if (m._id === messageId) {
              return { ...m, isDeleted: true, text: 'This message was deleted', reactions: [] };
            }
            return m;
          })
        );
        fetchConversations();
        showToast('Message deleted');
      }
    } catch (error) {
      console.error('Delete Message Error:', error.message);
      showToast('Unable to delete message');
    }
  };

  // Edit Message
  const handleEditMessage = useCallback(async (messageId, newText) => {
    try {
      await apiClient.put(`/messages/${messageId}/edit`, { text: newText });
    } catch (error) {
      console.error('Edit Message Error:', error.message);
      showToast('Failed to edit message');
    }
  }, [showToast]);

  // Forward Messages
  const handleForwardMessage = useCallback(async (messageIds, targetConversationIds) => {
    try {
      await apiClient.post(`/messages/forward`, { messageIds, conversationIds: targetConversationIds });
      showToast('Message forwarded');
    } catch (error) {
      console.error('Forward Message Error:', error.message);
      showToast('Failed to forward message');
    }
  }, [showToast]);

  // Handle bulk message deletion
  const handleBulkDeleteMessages = async (messageIds) => {
    try {
      const response = await apiClient.post(`/messages/bulk-delete`, { messageIds });
      if (response.data && response.data.success) {
        // Soft delete locally immediately for the sender
        setMessages((prev) =>
          prev.map((m) => {
            if (messageIds.includes(m._id)) {
              return { ...m, isDeleted: true, text: 'This message was deleted', reactions: [], mediaUrl: null };
            }
            return m;
          })
        );
        fetchConversations();
        showToast('Messages deleted');
      }
    } catch (error) {
      console.error('Bulk Delete Error:', error.message);
      showToast('Unable to delete messages');
    }
  };

  // Handle creating/opening a 1-to-1 conversation with a contact
  const handleStartConversation = async (targetUserId) => {
    try {
      const response = await apiClient.post('/conversations', { userId: targetUserId });
      if (response.data && response.data.success) {
        const conv = response.data.conversation;
        
        // Update local list of conversations if new
        setConversations((prev) => {
          const exists = prev.some((c) => c._id === conv._id);
          return exists ? prev : [conv, ...prev];
        });

        // Set active select state
        setActiveChatId(conv._id);
        setShowNewChatList(false);
        setSearchQuery('');
        setMobileView('chat');
      }
    } catch (error) {
      console.error('Start Conversation Error:', error.message);
    }
  };

  const handleCreateGroup = async (name, participants, imageFile) => {
    try {
      const formData = new FormData();
      formData.append('name', name);
      participants.forEach(id => formData.append('participants[]', id));
      if (imageFile) {
        formData.append('groupImage', imageFile);
      }

      const response = await apiClient.post('/conversations/group', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data && response.data.success) {
        const conv = response.data.conversation;
        setConversations((prev) => [conv, ...prev]);
        setActiveChatId(conv._id);
        setShowNewGroupPanel(false);
        setShowNewChatList(false);
        setSearchQuery('');
        setMobileView('chat');
        showToast('Group created');
      }
    } catch (error) {
      console.error('Create Group Error:', error.message);
      showToast('Unable to create group');
    }
  };

  // Filter conversations list based on search query
  const filteredConversations = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return conversations;
    
    return conversations.filter((c) => {
      const otherParticipant = getOtherParticipant(c.participants, user) || {};
      return otherParticipant.name?.toLowerCase().includes(query);
    });
  }, [conversations, searchQuery, user]);

  return (
    <div className={`chat-layout ${mobileView === 'chat' ? 'mobile-show-chat' : 'mobile-show-list'}`}>
      <div className={`sidebar-wrapper ${mobileView === 'list' || mobileView === 'profile' ? 'active' : ''}`}>
        {showProfilePanel ? (
          <ProfilePanel onBack={() => {
            setShowProfilePanel(false);
            setMobileView('list');
          }} />
        ) : showNewGroupPanel ? (
          <NewGroupPanel
            onBack={() => {
              setShowNewGroupPanel(false);
            }}
            availableUsers={availableUsers}
            onlineUserIds={onlineUserIds}
            onCreateGroup={handleCreateGroup}
          />
        ) : (
          <Sidebar
            conversations={filteredConversations}
            activeChatId={activeChatId}
            onSelectChat={handleSelectChat}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            showNewChatList={showNewChatList}
            onToggleNewChatList={() => {
              setShowNewChatList((prev) => {
                const nextState = !prev;
                if (nextState) {
                  fetchAvailableUsers();
                }
                return nextState;
              });
              setSearchQuery('');
            }}
            availableUsers={availableUsers}
            loadingUsers={loadingUsers}
            usersError={usersError}
            onRetryUsers={fetchAvailableUsers}
            onStartConversation={handleStartConversation}
            onlineUserIds={onlineUserIds}
            onOpenProfile={() => {
              setShowProfilePanel(true);
              setMobileView('profile');
            }}
            onOpenNewGroup={() => {
              setShowNewGroupPanel(true);
            }}
          />
        )}
      </div>
      <ChatWindow
        activeChat={activeChat}
        messages={messages}
        onSendMessage={handleSendMessage}
        onBack={handleBackToMobileList}
        onlineUserIds={onlineUserIds}
        availableUsers={availableUsers}
        isRecipientTyping={isRecipientTyping}
        onTyping={handleTyping}
        onDeleteMessage={handleDeleteMessage}
        onBulkDeleteMessages={handleBulkDeleteMessages}
        showToast={showToast}
        hasMore={hasMore}
        loadingOlder={loadingOlder}
        onLoadOlder={loadOlderMessages}
        replyingToMessage={replyingToMessage}
        onSetReplyingToMessage={setReplyingToMessage}
        onToggleReaction={handleToggleReaction}
        onEditMessage={handleEditMessage}
        onForwardMessage={handleForwardMessage}
        conversations={conversations}
      />

      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#323232',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '4px',
          fontSize: '0.9rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
          zIndex: 10000,
        }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}

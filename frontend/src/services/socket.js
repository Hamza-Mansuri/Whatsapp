import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || '/api';
// Strip out /api to resolve base domain for socket connection
const SOCKET_URL = API_URL.replace('/api', '');

let socket = null;

export const socketService = {
  connect: () => {
    if (socket) return socket;

    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      // connected
    });

    socket.on('disconnect', (reason) => {
      // disconnected
    });

    return socket;
  },

  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  joinConversation: (conversationId) => {
    if (socket && socket.connected) {
      socket.emit('join_conversation', conversationId);
    }
  },

  leaveConversation: (conversationId) => {
    if (socket && socket.connected) {
      socket.emit('leave_conversation', conversationId);
    }
  },

  // Message event listeners
  onMessageReceived: (callback) => {
    socket?.on('message_received', callback);
  },

  offMessageReceived: (callback) => {
    socket?.off('message_received', callback);
  },

  // User online/offline status listeners
  onUserStatusChange: (callback) => {
    socket?.on('user_status', callback);
  },

  offUserStatusChange: (callback) => {
    socket?.off('user_status', callback);
  },

  // Online users list retrieval
  onOnlineUsersList: (callback) => {
    socket?.on('online_users_list', callback);
  },

  offOnlineUsersList: (callback) => {
    socket?.off('online_users_list', callback);
  },

  // Sidebar preview updates listener
  onConversationUpdated: (callback) => {
    socket?.on('conversation_updated', callback);
  },

  offConversationUpdated: (callback) => {
    socket?.off('conversation_updated', callback);
  },

  // User Profile updates listener
  onUserProfileUpdated: (callback) => {
    socket?.on('user_profile_updated', callback);
  },

  offUserProfileUpdated: (callback) => {
    socket?.off('user_profile_updated', callback);
  },

  // Typing Indicators
  sendTypingStart: (conversationId) => {
    socket?.emit('typing_start', conversationId);
  },

  sendTypingStop: (conversationId) => {
    socket?.emit('typing_stop', conversationId);
  },

  onTypingStart: (callback) => {
    socket?.on('typing_start', callback);
  },

  offTypingStart: (callback) => {
    socket?.off('typing_start', callback);
  },

  onTypingStop: (callback) => {
    socket?.on('typing_stop', callback);
  },

  offTypingStop: (callback) => {
    socket?.off('typing_stop', callback);
  },

  // Message Status Updates
  onMessagesDelivered: (callback) => {
    socket?.on('messages_delivered', callback);
  },

  offMessagesDelivered: (callback) => {
    socket?.off('messages_delivered', callback);
  },

  onMessagesRead: (callback) => {
    socket?.on('messages_read', callback);
  },

  offMessagesRead: (callback) => {
    socket?.off('messages_read', callback);
  },

  onMessageDeleted: (callback) => {
    socket?.on('message_deleted', callback);
  },

  offMessageDeleted: (callback) => {
    socket?.off('message_deleted', callback);
  },

  onMessageReactionUpdated: (callback) => {
    socket?.on('message_reaction_updated', callback);
  },

  offMessageReactionUpdated: (callback) => {
    socket?.off('message_reaction_updated', callback);
  },

  onMessageUpdated: (callback) => {
    socket?.on('message_updated', callback);
  },

  offMessageUpdated: (callback) => {
    socket?.off('message_updated', callback);
  },

  // Status Events
  onStatusCreated: (callback) => {
    socket?.on('status_created', callback);
  },

  offStatusCreated: (callback) => {
    socket?.off('status_created', callback);
  },

  onStatusDeleted: (callback) => {
    socket?.on('status_deleted', callback);
  },

  offStatusDeleted: (callback) => {
    socket?.off('status_deleted', callback);
  },
};

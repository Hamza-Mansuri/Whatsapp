import { playNotificationSound } from './notificationSound';

const CHANNEL_NAME = 'whatsapp-clone-notifications';
const processedMessages = new Set();
let bc = null;

// Initialize BroadcastChannel only once per tab
if (typeof BroadcastChannel !== 'undefined') {
  bc = new BroadcastChannel(CHANNEL_NAME);
  bc.onmessage = (event) => {
    if (event.data && event.data.type === 'message_notified') {
      // Another tab already showed the notification/sound for this message.
      processedMessages.add(event.data.messageId);
    }
  };
}

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return 'unsupported';
  
  if (Notification.permission === 'default') {
    try {
      return await Notification.requestPermission();
    } catch (err) {
      console.warn('Failed to request notification permission', err);
      return Notification.permission;
    }
  }
  return Notification.permission;
};

export const canNotify = () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;
  if (localStorage.getItem('desktop_notifications') === 'false') return false;
  return true;
};

const getMessagePreview = (message) => {
  if (message.isDeleted) return 'This message was deleted';
  if (message.type === 'audio') return '🎙 Voice message';
  if (message.type === 'image') return '📷 Photo';
  if (message.isForwarded) return '↪ Forwarded message';
  return message.text || 'New message';
};

export const showNewMessageNotification = (message, senderName = 'User') => {
  if (!message || !message._id) return;
  
  // Prevent duplicate notifications in the same tab
  if (processedMessages.has(message._id)) return;
  
  // Mark as processed immediately
  processedMessages.add(message._id);
  
  // Inform other tabs to skip this message
  if (bc) {
    bc.postMessage({ type: 'message_notified', messageId: message._id });
  }

  // Play sound regardless of whether the browser notification is permitted/shown,
  // as long as the user hasn't explicitly disabled desktop notifications.
  if (localStorage.getItem('desktop_notifications') !== 'false') {
    playNotificationSound();
  }

  // Check if browser notifications are allowed
  if (!canNotify()) return;

  try {
    const notification = new Notification(senderName, {
      body: getMessagePreview(message),
      icon: '/vite.svg', // Fallback icon
      tag: `chat-${message.conversation}`, // Groups notifications by conversation
      silent: true // We handle our own custom sound
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      // Emitting a custom event so the React app can pick it up and switch to the conversation
      window.dispatchEvent(new CustomEvent('notification_clicked', { 
        detail: { conversationId: message.conversation } 
      }));
    };
  } catch (err) {
    console.debug('Failed to show browser notification:', err);
  }
};

export const updatePageTitle = (totalUnreadCount) => {
  const baseTitle = 'WhatsApp Lite';
  if (totalUnreadCount > 0) {
    document.title = `(${totalUnreadCount}) ${baseTitle}`;
  } else {
    document.title = baseTitle;
  }
};

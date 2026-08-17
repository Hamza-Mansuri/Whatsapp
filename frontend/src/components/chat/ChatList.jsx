import React from 'react';
import ChatListItem from './ChatListItem';

export default function ChatList({ conversations, activeChatId, onSelectChat, onlineUserIds }) {
  if (conversations.length === 0) {
    return (
      <div className="no-chats-found">
        <span className="no-chats-text">No chats found</span>
      </div>
    );
  }

  return (
    <div className="chat-list">
      {conversations.map((chat) => (
        <ChatListItem
          key={chat._id || chat.id}
          chat={chat}
          isActive={(chat._id || chat.id) === activeChatId}
          onSelect={() => onSelectChat(chat._id || chat.id)}
          onlineUserIds={onlineUserIds}
        />
      ))}
    </div>
  );
}

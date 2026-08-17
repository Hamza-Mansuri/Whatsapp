import React, { useState, useMemo, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import { getProfessionalAvatar } from '../../utils/avatar';
import { getOtherParticipant } from '../../utils/conversation';

export default function ForwardModal({
  isOpen,
  onClose,
  conversations,
  messagesToForward,
  onForward,
}) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversationIds, setSelectedConversationIds] = useState([]);

  // Clear selections when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedConversationIds([]);
    }
  }, [isOpen]);

  // Compute filtered conversations
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter((c) => {
      const otherPart = getOtherParticipant(c.participants, user);
      if (!otherPart) return false;
      return otherPart.name.toLowerCase().includes(query) || (otherPart.email && otherPart.email.toLowerCase().includes(query));
    });
  }, [conversations, searchQuery, user]);

  const toggleSelection = (convId) => {
    setSelectedConversationIds((prev) =>
      prev.includes(convId) ? prev.filter((id) => id !== convId) : [...prev, convId]
    );
  };

  const handleForward = () => {
    if (selectedConversationIds.length === 0) return;
    onForward(selectedConversationIds);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          width: '90%',
          maxWidth: '450px',
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 17px 50px 0 rgba(11,20,26,.19), 0 12px 15px 0 rgba(11,20,26,.24)',
          overflow: 'hidden',
          animation: 'scaleIn 0.2s cubic-bezier(0.1, 0.82, 0.25, 1)',
        }}
      >
        {/* Header */}
        <div 
          style={{ 
            padding: '16px 20px', 
            backgroundColor: '#00a884', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', padding: 0 }}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 500 }}>Forward message to</h3>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 14px', backgroundColor: '#fff', borderBottom: '1px solid #f0f2f5' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f0f2f5',
            borderRadius: '8px',
            padding: '6px 12px',
          }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#8696a0">
              <path d="M15.009 13.805h-.636l-.22-.219a5.292 5.292 0 0 0 1.281-3.468 5.315 5.315 0 1 0-5.315 5.315 5.292 5.292 0 0 0 3.468-1.281l.219.22v.636l4.086 4.077 1.218-1.218-4.08-4.062zM9.39 13.805a4.415 4.415 0 1 1 0-8.83 4.415 4.415 0 0 1 0 8.83z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                marginLeft: '12px',
                width: '100%',
                fontSize: '0.95rem',
                color: '#111B21'
              }}
            />
          </div>
        </div>

        {/* Contacts List */}
        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#fff' }}>
          <div style={{ padding: '12px 20px', color: '#008069', fontSize: '0.9rem', fontWeight: 500 }}>Recent chats</div>
          {filteredConversations.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#8696a0' }}>No chats found</div>
          ) : (
            filteredConversations.map((c) => {
              const otherPart = getOtherParticipant(c.participants, user) || { name: 'Unknown' };
              const isSelected = selectedConversationIds.includes(c._id);

              return (
                <div 
                  key={c._id}
                  onClick={() => toggleSelection(c._id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f6f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ position: 'relative', marginRight: '14px' }}>
                    <img src={getProfessionalAvatar(otherPart)} alt={otherPart.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        backgroundColor: '#00a884',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid white'
                      }}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="white">
                          <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, borderBottom: '1px solid #f0f2f5', paddingBottom: '10px', display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.05rem', color: '#111B21' }}>{otherPart.name}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '16px 20px', 
          backgroundColor: '#f0f2f5', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 -2px 5px rgba(0,0,0,0.02)'
        }}>
          <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: '#667781', fontSize: '0.9rem', paddingRight: '16px' }}>
            {selectedConversationIds.length > 0 
              ? `${selectedConversationIds.length} chat${selectedConversationIds.length > 1 ? 's' : ''} selected` 
              : `${messagesToForward?.length || 0} message${messagesToForward?.length !== 1 ? 's' : ''} to forward`}
          </div>
          
          <button
            onClick={handleForward}
            disabled={selectedConversationIds.length === 0}
            style={{
              backgroundColor: selectedConversationIds.length > 0 ? '#00a884' : '#8696a0',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: selectedConversationIds.length > 0 ? 'pointer' : 'default',
              transition: 'background-color 0.2s',
              boxShadow: selectedConversationIds.length > 0 ? '0 2px 4px rgba(0,0,0,0.2)' : 'none',
              opacity: selectedConversationIds.length > 0 ? 1 : 0.6,
            }}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

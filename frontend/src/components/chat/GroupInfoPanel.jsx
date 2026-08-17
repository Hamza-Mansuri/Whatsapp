import React, { useState } from 'react';
import { getProfessionalAvatar, getGroupAvatar } from '../../utils/avatar';
import useAuth from '../../hooks/useAuth';
import apiClient from '../../services/api';

export default function GroupInfoPanel({
  chat,
  onBack,
  onlineUserIds,
  availableUsers,
  showToast,
  onGroupUpdated, // callback to refresh parent
  onGroupDeleted, // callback if left and deleted
}) {
  const { user } = useAuth();
  const isAdmin = chat.groupAdmin === user._id || chat.groupAdmin === user.id;

  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      const response = await apiClient.put(`/conversations/${chat._id}/group/leave`);
      if (response.data.success) {
        showToast('You left the group');
        onGroupDeleted(chat._id); // tell ChatLayout to deselect and remove from list
      }
    } catch (err) {
      showToast('Failed to leave group');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      const response = await apiClient.put(`/conversations/${chat._id}/group/remove`, { userId });
      if (response.data.success) {
        showToast('Member removed');
        onGroupUpdated(response.data.conversation);
      }
    } catch (err) {
      showToast('Failed to remove member');
    }
  };

  const handleAddMember = async (userId) => {
    try {
      const response = await apiClient.put(`/conversations/${chat._id}/group/add`, { userId });
      if (response.data.success) {
        showToast('Member added');
        onGroupUpdated(response.data.conversation);
        setShowAddMember(false);
      }
    } catch (err) {
      showToast('Failed to add member');
    }
  };

  const handleChangeImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('groupImage', file);
    try {
      const response = await apiClient.put(`/conversations/${chat._id}/group/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        showToast('Group icon updated');
        onGroupUpdated(response.data.conversation);
      }
    } catch (err) {
      showToast('Failed to update icon');
    }
  };

  const handleRename = async () => {
    const newName = window.prompt('Enter new group name:', chat.groupName);
    if (!newName || !newName.trim() || newName.trim() === chat.groupName) return;
    try {
      const response = await apiClient.put(`/conversations/${chat._id}/group/rename`, { name: newName.trim() });
      if (response.data.success) {
        showToast('Group renamed');
        onGroupUpdated(response.data.conversation);
      }
    } catch (err) {
      showToast('Failed to rename group');
    }
  };

  if (showAddMember) {
    const membersSet = new Set(chat.participants.map(p => p._id || p.id));
    const nonMembers = availableUsers.filter(u => !membersSet.has(u._id) && u.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <div className="profile-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--surface-color)', position: 'absolute', top: 0, right: 0, width: '100%', zIndex: 100 }}>
        <div className="profile-header" style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', backgroundColor: 'var(--primary-teal)', color: 'white', gap: '20px', height: '108px', boxSizing: 'border-box' }}>
          <button className="back-btn" onClick={() => setShowAddMember(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', marginTop: 'auto', marginBottom: '8px' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          </button>
          <h2 style={{ color: 'white', margin: 0, fontSize: '1.2rem', fontWeight: 500, marginTop: 'auto', marginBottom: '8px' }}>Add participant</h2>
        </div>
        <div className="search-container" style={{ padding: '8px 12px' }}>
          <div className="search-wrapper">
            <input type="text" placeholder="Search contacts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" autoFocus />
          </div>
        </div>
        <div className="chat-list" style={{ flex: 1, overflowY: 'auto' }}>
          {nonMembers.map(u => (
            <div key={u._id} className="chat-list-item" onClick={() => handleAddMember(u._id)}>
              <div className="avatar-wrapper">
                <img src={getProfessionalAvatar(u)} alt={u.name} className="avatar" />
              </div>
              <div className="chat-item-details" style={{ borderBottom: '1px solid var(--border-color)', height: '100%', display: 'flex', alignItems: 'center' }}>
                <span className="chat-item-name">{u.name}</span>
              </div>
            </div>
          ))}
          {nonMembers.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#8696a0' }}>No contacts found</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="profile-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f0f2f5', position: 'absolute', top: 0, right: 0, width: '100%', zIndex: 100 }}>
      {/* Header */}
      <div className="profile-header" style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-color)', color: '#111b21', gap: '20px', height: '60px', boxSizing: 'border-box', borderBottom: '1px solid var(--border-color)' }}>
        <button className="back-btn" onClick={onBack} style={{ background: 'none', border: 'none', color: '#54656f', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>Group info</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Group Info Section */}
        <div style={{ backgroundColor: 'var(--surface-color)', padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ position: 'relative' }}>
            <img src={getGroupAvatar(chat)} alt="Group" style={{ width: '200px', height: '200px', borderRadius: '50%', objectFit: 'cover', marginBottom: '20px' }} />
            {isAdmin && (
              <div 
                style={{ position: 'absolute', bottom: '20px', right: '10px', backgroundColor: 'var(--primary-teal)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                onClick={() => document.getElementById('groupInfoImageUpdate').click()}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
              </div>
            )}
            <input type="file" id="groupInfoImageUpdate" accept="image/*" style={{ display: 'none' }} onChange={handleChangeImage} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 400, color: '#111b21' }}>{chat.groupName}</h2>
            {isAdmin && (
              <button onClick={handleRename} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8696a0' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              </button>
            )}
          </div>
          <span style={{ color: '#667781', marginTop: '8px', fontSize: '1rem' }}>Group · {chat.participants.length} participants</span>
        </div>

        {/* Participants Section */}
        <div style={{ backgroundColor: 'var(--surface-color)', padding: '16px 0', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ padding: '0 24px 16px', color: '#8696a0', fontSize: '0.9rem' }}>
            {chat.participants.length} participants
          </div>
          
          {isAdmin && (
            <div className="chat-list-item" onClick={() => setShowAddMember(true)} style={{ padding: '0 24px' }}>
              <div className="avatar-wrapper" style={{ backgroundColor: 'var(--primary-teal)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
              <div className="chat-item-details" style={{ borderBottom: 'none' }}>
                <span className="chat-item-name" style={{ fontSize: '1rem' }}>Add participant</span>
              </div>
            </div>
          )}

          {chat.participants.map(p => {
            const pId = p._id || p.id;
            const isMe = pId === (user._id || user.id);
            const isGroupAdmin = chat.groupAdmin === pId;

            return (
              <div key={pId} className="chat-list-item" style={{ padding: '0 24px', cursor: 'default' }}>
                <div className="avatar-wrapper" style={{ width: '40px', height: '40px' }}>
                  <img src={getProfessionalAvatar(p)} alt={p.name} className="avatar" />
                </div>
                <div className="chat-item-details" style={{ borderBottom: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span className="chat-item-name" style={{ fontSize: '1rem' }}>{isMe ? 'You' : p.name}</span>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: '#667781' }}>{p.about || 'Available'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isGroupAdmin && <span style={{ fontSize: '0.7rem', color: 'var(--primary-teal)', border: '1px solid var(--primary-teal)', padding: '2px 6px', borderRadius: '4px' }}>Group Admin</span>}
                    {isAdmin && !isMe && (
                      <button onClick={() => handleRemoveMember(pId)} style={{ background: 'none', border: 'none', color: '#ea0038', cursor: 'pointer', padding: '4px' }} title="Remove">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/></svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Leave Group Action */}
        <div style={{ backgroundColor: 'var(--surface-color)', padding: '8px 0', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div className="chat-list-item" onClick={handleLeaveGroup} style={{ padding: '0 24px' }}>
            <div className="avatar-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px' }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="#ea0038"><path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>
            </div>
            <div className="chat-item-details" style={{ borderBottom: 'none' }}>
              <span className="chat-item-name" style={{ fontSize: '1rem', color: '#ea0038' }}>Leave group</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { getProfessionalAvatar } from '../../utils/avatar';

export default function NewGroupPanel({
  onBack,
  availableUsers,
  onlineUserIds,
  onCreateGroup
}) {
  const [step, setStep] = useState(1); // 1: Select Members, 2: Group Details
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [groupName, setGroupName] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = availableUsers.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleUser = (userId) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = () => {
    if (selectedUserIds.size < 2) return;
    if (!groupName.trim()) return;
    onCreateGroup(groupName, Array.from(selectedUserIds), imageFile);
  };

  return (
    <div className="profile-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--surface-color)' }}>
      {/* Header */}
      <div className="profile-header" style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', backgroundColor: 'var(--primary-teal)', color: 'white', gap: '20px', height: '108px', boxSizing: 'border-box' }}>
        <button className="back-btn" onClick={() => step === 2 ? setStep(1) : onBack()} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', marginTop: 'auto', marginBottom: '8px' }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <h2 style={{ color: 'white', margin: 0, fontSize: '1.2rem', fontWeight: 500, marginTop: 'auto', marginBottom: '8px' }}>
          {step === 1 ? 'Add group members' : 'New group'}
        </h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {step === 1 ? (
          <>
            {/* Selected Members Chips */}
            {selectedUserIds.size > 0 && (
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Array.from(selectedUserIds).map(id => {
                  const u = availableUsers.find(u => u._id === id);
                  return u ? (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f0f2f5', borderRadius: '16px', padding: '4px 8px 4px 4px', gap: '8px' }}>
                      <img src={getProfessionalAvatar(u)} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                      <span style={{ fontSize: '0.8rem', color: '#111b21' }}>{u.name}</span>
                      <button onClick={() => handleToggleUser(id)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0 4px', color: '#8696a0' }}>✕</button>
                    </div>
                  ) : null;
                })}
              </div>
            )}

            {/* Search Input */}
            <div className="search-container" style={{ padding: '8px 12px' }}>
              <div className="search-wrapper">
                <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {/* Contact List */}
            <div className="chat-list" style={{ flex: 1 }}>
              {filteredUsers.map((u) => {
                const isSelected = selectedUserIds.has(u._id);
                return (
                  <div key={u._id} className="chat-list-item" onClick={() => handleToggleUser(u._id)}>
                    <div style={{ padding: '0 12px 0 0', display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: '2px solid', borderColor: isSelected ? 'var(--primary-teal)' : '#8696a0', backgroundColor: isSelected ? 'var(--primary-teal)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isSelected && <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>}
                      </div>
                    </div>
                    <div className="avatar-wrapper" style={{ margin: 0 }}>
                      <img src={getProfessionalAvatar(u)} alt={u.name} className="avatar" style={{ objectFit: 'cover' }} />
                    </div>
                    <div className="chat-item-details" style={{ borderBottom: '1px solid var(--border-color)', height: '100%', display: 'flex', alignItems: 'center' }}>
                      <span className="chat-item-name" style={{ fontSize: '1rem', color: '#111b21' }}>{u.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Floating Next Button */}
            {selectedUserIds.size >= 2 && (
              <div style={{ position: 'absolute', bottom: '24px', right: '24px', zIndex: 10 }}>
                <button
                  onClick={() => setStep(2)}
                  style={{
                    backgroundColor: 'var(--primary-teal)',
                    color: 'white',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: 'none',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/>
                  </svg>
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div 
              style={{ 
                width: '160px', 
                height: '160px', 
                borderRadius: '50%', 
                backgroundColor: '#f0f2f5', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: 'pointer',
                marginBottom: '32px',
                position: 'relative',
                overflow: 'hidden'
              }}
              onClick={() => document.getElementById('groupImageUpload').click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Group" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#8696a0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                  </svg>
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>ADD GROUP ICON</span>
                </div>
              )}
            </div>
            <input 
              type="file" 
              id="groupImageUpload" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleImageChange}
            />

            <input
              type="text"
              placeholder="Group subject"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                borderBottom: '2px solid var(--primary-teal)',
                backgroundColor: 'transparent',
                fontSize: '1.1rem',
                padding: '8px 0',
                outline: 'none',
                color: '#111b21',
                marginBottom: '24px'
              }}
              autoFocus
            />

            {groupName.trim() && (
              <button
                onClick={handleCreate}
                style={{
                  backgroundColor: 'var(--primary-teal)',
                  color: 'white',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: 'none',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 'auto'
                }}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import apiClient from '../../services/api';
import ImageViewer from './ImageViewer';
import { getProfessionalAvatar } from '../../utils/avatar';
import { requestNotificationPermission } from '../../utils/notification';

export default function ProfilePanel({ onBack }) {
  const { user, login } = useAuth(); // Assuming login or setUser is available to update context, let's just emit or rely on socket
  
  const [profile, setProfile] = useState(user || {});
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  
  const [editName, setEditName] = useState(user?.name || '');
  const [editAbout, setEditAbout] = useState(user?.about || 'Available');
  
  const [desktopNotifications, setDesktopNotifications] = useState(
    localStorage.getItem('desktop_notifications') !== 'false'
  );
  
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [showImageViewer, setShowImageViewer] = useState(false);
  
  const fileInputRef = useRef(null);

  // Fetch latest user data
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await apiClient.get('/users/me');
        if (res.data.success) {
          setProfile(res.data.user);
          setEditName(res.data.user.name);
          setEditAbout(res.data.user.about || 'Available');
        }
      } catch (error) {
        console.error('Failed to fetch profile', error);
      }
    };
    fetchMe();
  }, []);

  // Use updated user context if it changes from Socket
  useEffect(() => {
    if (user && user._id === profile._id) {
      setProfile(user);
      if (!isEditingName) setEditName(user.name);
      if (!isEditingAbout) setEditAbout(user.about || 'Available');
    }
  }, [user]);

  const handleSaveName = async () => {
    if (!editName.trim()) {
      alert("Name cannot be empty");
      setEditName(profile.name);
      setIsEditingName(false);
      return;
    }
    
    try {
      const res = await apiClient.put('/users/me', { name: editName.trim() });
      if (res.data.success) {
        setProfile(res.data.user);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to update name');
    } finally {
      setIsEditingName(false);
    }
  };

  const handleSaveAbout = async () => {
    try {
      const res = await apiClient.put('/users/me', { about: editAbout.trim() });
      if (res.data.success) {
        setProfile(res.data.user);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to update about');
    } finally {
      setIsEditingAbout(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setShowAvatarMenu(false);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      const res = await apiClient.post('/users/me/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setProfile(res.data.user);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upload profile picture.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setShowAvatarMenu(false);
    try {
      const res = await apiClient.delete('/users/me/profile-picture');
      if (res.data.success) {
        setProfile(res.data.user);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to remove profile picture');
    }
  };

  const handleViewPhoto = () => {
    setShowAvatarMenu(false);
    if (profile.avatar) {
      setShowImageViewer(true);
    }
  };

  const handleToggleNotifications = async () => {
    const newVal = !desktopNotifications;
    setDesktopNotifications(newVal);
    localStorage.setItem('desktop_notifications', newVal ? 'true' : 'false');
    if (newVal) {
      await requestNotificationPermission();
    }
  };

  const renderEditableField = (label, value, isEditing, setEditing, editValue, setEditValue, onSave, maxLength) => {
    return (
      <div style={{ backgroundColor: 'white', padding: '14px 30px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ color: '#008069', fontSize: '0.9rem', marginBottom: '14px', fontWeight: 500 }}>
          {label}
        </div>
        {isEditing ? (
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #00a884', paddingBottom: '4px' }}>
            <input 
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value.substring(0, maxLength))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSave();
                if (e.key === 'Escape') setEditing(false);
              }}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '1.05rem',
                color: '#111B21'
              }}
            />
            <span style={{ fontSize: '0.8rem', color: '#8696a0', marginRight: '10px' }}>
              {maxLength - editValue.length}
            </span>
            <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#8696a0"><path d="M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636z"/></svg>
            </button>
            <button onClick={onSave} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#00a884"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '1.05rem', color: '#111B21' }}>{value}</span>
            <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#8696a0"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f0f2f5' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        backgroundColor: '#008069', 
        color: 'white',
        height: '108px',
        padding: '0 20px',
        gap: '24px'
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', marginTop: '40px' }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 500, marginTop: '40px' }}>Profile</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Avatar Section */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0' }}>
          <div 
            style={{ 
              position: 'relative', 
              width: '200px', 
              height: '200px', 
              borderRadius: '50%',
              cursor: 'pointer',
              overflow: 'hidden'
            }}
            onMouseEnter={() => setIsHoveringAvatar(true)}
            onMouseLeave={() => setIsHoveringAvatar(false)}
            onClick={() => setShowAvatarMenu(true)}
          >
            <img 
              src={getProfessionalAvatar(profile)} 
              alt={profile.name} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            {(isHoveringAvatar || isUploading) && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                backgroundColor: 'rgba(74, 74, 74, 0.7)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                gap: '8px'
              }}>
                {isUploading ? (
                  <span style={{ fontSize: '0.9rem' }}>Uploading...</span>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
                      <path d="M21.02 5H17l-1.78-2h-6.44L7 5H2.98c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18.04c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm3-5c0 1.65-1.35 3-3 3s-3-1.35-3-3 1.35-3 3-3 3 1.35 3 3z"/>
                    </svg>
                    <span style={{ fontSize: '0.8rem', textAlign: 'center', textTransform: 'uppercase' }}>
                      Change<br/>Profile Photo
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Avatar Menu */}
          {showAvatarMenu && (
            <>
              <div 
                style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1000 }} 
                onClick={() => setShowAvatarMenu(false)}
              />
              <div style={{
                position: 'absolute',
                top: '250px',
                backgroundColor: 'white',
                borderRadius: '3px',
                boxShadow: '0 2px 5px 0 rgba(11,20,26,.26), 0 2px 10px 0 rgba(11,20,26,.16)',
                padding: '10px 0',
                zIndex: 1001,
                minWidth: '160px'
              }}>
                {profile.avatar && (
                  <div 
                    onClick={handleViewPhoto}
                    style={{ padding: '12px 24px', cursor: 'pointer', transition: 'background-color 0.1s' }}
                    onMouseEnter={e => e.target.style.backgroundColor = '#f5f6f6'}
                    onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
                  >
                    View photo
                  </div>
                )}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '12px 24px', cursor: 'pointer', transition: 'background-color 0.1s' }}
                  onMouseEnter={e => e.target.style.backgroundColor = '#f5f6f6'}
                  onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
                >
                  Take photo
                </div>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '12px 24px', cursor: 'pointer', transition: 'background-color 0.1s' }}
                  onMouseEnter={e => e.target.style.backgroundColor = '#f5f6f6'}
                  onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
                >
                  Upload photo
                </div>
                {profile.avatar && (
                  <div 
                    onClick={handleRemovePhoto}
                    style={{ padding: '12px 24px', cursor: 'pointer', transition: 'background-color 0.1s' }}
                    onMouseEnter={e => e.target.style.backgroundColor = '#f5f6f6'}
                    onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
                  >
                    Remove photo
                  </div>
                )}
              </div>
            </>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            style={{ display: 'none' }} 
            accept="image/jpeg,image/png,image/gif,image/webp" 
          />
        </div>

        {/* Name Editor */}
        {renderEditableField('Your name', profile.name, isEditingName, setIsEditingName, editName, setEditName, handleSaveName, 25)}

        <div style={{ padding: '14px 30px', color: '#667781', fontSize: '0.85rem' }}>
          This is not your username or pin. This name will be visible to your WhatsApp contacts.
        </div>

        {/* About Editor */}
        {renderEditableField('About', profile.about || 'Available', isEditingAbout, setIsEditingAbout, editAbout, setEditAbout, handleSaveAbout, 139)}

        {/* Notifications Setting */}
        <div style={{ backgroundColor: 'white', padding: '14px 30px', marginTop: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ color: '#008069', fontSize: '0.9rem', marginBottom: '14px', fontWeight: 500 }}>
            Notifications
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '1.05rem', color: '#111B21' }}>
            <input 
              type="checkbox" 
              checked={desktopNotifications} 
              onChange={handleToggleNotifications}
              style={{ marginRight: '12px', transform: 'scale(1.2)', accentColor: '#008069' }}
            />
            Desktop notifications
          </label>
        </div>
      </div>

      {showImageViewer && (
        <ImageViewer 
          src={getProfessionalAvatar(profile)} 
          onClose={() => setShowImageViewer(false)} 
        />
      )}
    </div>
  );
}

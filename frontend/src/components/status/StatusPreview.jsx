import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';

const BG_COLORS = ['#ff7e67', '#8e44ad', '#2980b9', '#27ae60', '#f39c12', '#d35400', '#2c3e50', '#000000'];

export default function StatusPreview({ file, type, onCancel, onSuccess }) {
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (file && (type === 'image' || type === 'video')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, type]);

  const handlePost = async () => {
    if (type === 'text' && !text.trim()) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('type', type);
      
      if (type === 'text') {
        formData.append('text', text);
        formData.append('backgroundColor', bgColor);
      } else {
        formData.append('media', file);
      }

      const res = await apiClient.post('/status', formData, {
        headers: type !== 'text' ? { 'Content-Type': 'multipart/form-data' } : {},
      });

      if (res.data && res.data.success) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to post status:', error);
      alert('Failed to post status. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleBgChange = () => {
    const currentIndex = BG_COLORS.indexOf(bgColor);
    const nextIndex = (currentIndex + 1) % BG_COLORS.length;
    setBgColor(BG_COLORS[nextIndex]);
  };

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: type === 'text' ? bgColor : 'black', 
      zIndex: 30, display: 'flex', flexDirection: 'column',
      transition: 'background-color 0.3s ease'
    }}>
      {/* Header controls */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 40, display: 'flex', gap: '20px' }}>
        <button onClick={onCancel} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
        {type === 'text' && (
          <button onClick={handleBgChange} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
            🎨
          </button>
        )}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {type === 'text' && (
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a status"
            maxLength={250}
            style={{
              width: '80%', height: '50%', background: 'transparent', border: 'none', color: 'white', 
              fontSize: '2rem', textAlign: 'center', resize: 'none', outline: 'none', fontFamily: 'inherit'
            }}
          />
        )}
        
        {type === 'image' && previewUrl && (
          <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        )}
        
        {type === 'video' && previewUrl && (
          <video src={previewUrl} controls autoPlay loop style={{ maxWidth: '100%', maxHeight: '100%' }} />
        )}
      </div>

      {/* Footer controls */}
      <div style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <button 
          onClick={handlePost} 
          disabled={uploading || (type === 'text' && !text.trim())}
          style={{
            backgroundColor: 'var(--primary-teal)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: uploading || (type === 'text' && !text.trim()) ? 'not-allowed' : 'pointer',
            opacity: uploading || (type === 'text' && !text.trim()) ? 0.5 : 1,
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
          }}
        >
          {uploading ? (
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="16 16" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" />
             </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          )}
        </button>
      </div>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

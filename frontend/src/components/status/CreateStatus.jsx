import React, { useState, useRef } from 'react';
import StatusPreview from './StatusPreview';

export default function CreateStatus({ onClose, onCreated }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [isTextStatus, setIsTextStatus] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleFileSelect = (e, expectedType) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith(expectedType)) {
        setSelectedFile(file);
        setFileType(expectedType === 'image' ? 'image' : 'video');
      } else {
        alert(`Please select a valid ${expectedType} file.`);
      }
    }
  };

  const openFilePicker = (type) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'image' ? 'image/*' : 'video/*';
      // Store the expected type on the input dataset or just handle via onChange differently
      fileInputRef.current.dataset.expected = type;
      fileInputRef.current.click();
    }
  };

  const handleNativeChange = (e) => {
    const expected = fileInputRef.current?.dataset.expected || 'image';
    handleFileSelect(e, expected);
  };

  if (selectedFile || isTextStatus) {
    return (
      <StatusPreview 
        file={selectedFile}
        type={isTextStatus ? 'text' : fileType}
        onCancel={() => {
          setSelectedFile(null);
          setFileType(null);
          setIsTextStatus(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        onConfirm={() => {
          // It's handled inside StatusPreview
          // but we can pass onCreated so it closes everything on success
        }}
        onSuccess={onCreated}
      />
    );
  }

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: '#f0f2f5', zIndex: 20, display: 'flex', flexDirection: 'column'
    }}>
      <div className="profile-header" style={{ backgroundColor: 'var(--primary-teal)', color: 'white', display: 'flex', alignItems: 'center', padding: '16px', height: '108px', paddingTop: '50px' }}>
        <button className="back-btn" onClick={onClose} style={{ color: 'white', marginRight: '16px' }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 500 }}>Create Status</h2>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', gap: '20px' }}>
        <input 
          type="file" 
          style={{ display: 'none' }} 
          ref={fileInputRef} 
          onChange={handleNativeChange} 
        />
        
        <button 
          onClick={() => openFilePicker('image')}
          style={{ width: '100%', maxWidth: '300px', padding: '20px', borderRadius: '12px', border: '1px solid #ddd', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', fontSize: '1.2rem', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
        >
          <span style={{ fontSize: '2rem' }}>📷</span> Photo
        </button>

        <button 
          onClick={() => openFilePicker('video')}
          style={{ width: '100%', maxWidth: '300px', padding: '20px', borderRadius: '12px', border: '1px solid #ddd', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', fontSize: '1.2rem', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
        >
          <span style={{ fontSize: '2rem' }}>🎥</span> Video
        </button>

        <button 
          onClick={() => setIsTextStatus(true)}
          style={{ width: '100%', maxWidth: '300px', padding: '20px', borderRadius: '12px', border: '1px solid #ddd', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', fontSize: '1.2rem', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
        >
          <span style={{ fontSize: '2rem' }}>📝</span> Text
        </button>
      </div>
    </div>
  );
}

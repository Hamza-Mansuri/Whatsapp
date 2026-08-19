import React, { useState, useRef, useEffect } from 'react';
import CameraCapture from './CameraCapture';
import AttachmentMenu from './AttachmentMenu';
import EmojiPicker from 'emoji-picker-react';

export default function MessageInput({ onSendMessage, onTyping, replyingToMessage, editingMessage, showToast }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const streamRef = useRef(null);
  const isCancelledRef = useRef(false);
  const recordingStartTimeRef = useRef(null);

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isCurrentlyTypingRef = useRef(false);

  // Clean up object URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      stopRecordingCleanup();
    };
  }, [previewUrl]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!showEmojiPicker) return;

    const handleClickOutside = (e) => {
      if (e.target.closest('.emoji-trigger-btn')) return;
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Focus input when replying to a message or editing
  useEffect(() => {
    if (replyingToMessage) {
      inputRef.current?.focus();
    }
  }, [replyingToMessage]);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || '');
      inputRef.current?.focus();
    } else {
      setText('');
    }
  }, [editingMessage]);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);

    if (!val.trim()) {
      if (isCurrentlyTypingRef.current) {
        isCurrentlyTypingRef.current = false;
        onTyping?.(false);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      return;
    }

    if (!isCurrentlyTypingRef.current) {
      isCurrentlyTypingRef.current = true;
      onTyping?.(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isCurrentlyTypingRef.current = false;
      onTyping?.(false);
    }, 1500);
  };

  const handleFileChange = (e, isDocument = false) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit');
      e.target.value = '';
      return;
    }

    if (!isDocument) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
      if (!allowedTypes.includes(file.type)) {
        alert('Only images and videos are allowed for Photos & Videos');
        e.target.value = '';
        return;
      }
    }

    setSelectedFile(file);
    if (!isDocument && file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
    e.target.value = '';
  };

  const handleAttachmentSelect = (id) => {
    switch (id) {
      case 'document':
        documentInputRef.current?.click();
        break;
      case 'photos':
        fileInputRef.current?.click();
        break;
      case 'camera':
        setShowCamera(true);
        break;
      case 'audio':
        startRecording();
        break;
      case 'contact':
      case 'poll':
      case 'event':
      case 'sticker':
        showToast?.('This feature is coming soon!');
        break;
      default:
        break;
    }
  };

  const handleCancelFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  // --- AUDIO RECORDING LOGIC ---
  const startRecording = async () => {
    if (editingMessage) return; // Don't allow recording while editing

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const endTime = Date.now();
        const currentDuration = Math.round((endTime - recordingStartTimeRef.current) / 1000);
        
        stopRecordingCleanup();
        
        // If it's a valid length, send it automatically
        if (currentDuration > 0 && !isCancelledRef.current) {
          const file = new File([audioBlob], `voice_message_${Date.now()}.${mimeType.split('/')[1]}`, { type: mimeType });
          sendAudioMessage(file, currentDuration);
        }
        isCancelledRef.current = false;
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingStartTimeRef.current = Date.now();
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Microphone access denied or unavailable.');
    }
  };

  const stopRecordingCleanup = () => {
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    isCancelledRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      stopRecordingCleanup();
    }
  };

  const sendAudioMessage = async (file, duration) => {
    setSending(true);
    try {
      await onSendMessage('', file, duration);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };
  // -----------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!text.trim() && !selectedFile) || sending) return;

    // Immediately stop typing indicator on submit
    if (isCurrentlyTypingRef.current) {
      isCurrentlyTypingRef.current = false;
      onTyping?.(false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setSending(true);
    try {
      await onSendMessage(text, selectedFile);
      setText('');
      handleCancelFile();
      // Only focus if we aren't unmounting or losing the input
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {showCamera && (
        <CameraCapture 
          onClose={() => setShowCamera(false)}
          onSendMedia={async (file) => {
             setSending(true);
             try {
                // If the file is video, send as video with some arbitrary duration logic or let backend handle it
                // onSendMessage signature: onSendMessage(text, file, mediaDuration)
                // we leave text empty, pass the file.
                await onSendMessage('', file);
             } catch(err) {
                console.error(err);
             } finally {
                setSending(false);
             }
          }}
        />
      )}
      {(previewUrl || selectedFile) && (
        <div style={{
          padding: '10px 20px',
          backgroundColor: '#f0f2f5',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#e9edef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg viewBox="0 0 24 24" width="30" height="30" fill="#54656f">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
            )}
            <button 
              type="button"
              onClick={handleCancelFile}
              style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#667781' }}>
            {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </div>
        </div>
      )}
      
      <form className="message-input-form" onSubmit={handleSubmit} style={{ borderTop: previewUrl ? 'none' : undefined, display: 'flex', alignItems: 'center', padding: '10px', backgroundColor: '#f0f2f5', gap: '8px' }}>
        {isRecording ? (
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, backgroundColor: 'white', borderRadius: '24px', padding: '8px 16px', gap: '12px' }}>
            <button 
              type="button" 
              onClick={cancelRecording}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ea0038' }}
              title="Cancel Recording"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, color: '#ea0038' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ea0038', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: '0.9rem', color: '#111B21' }}>
                {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60) < 10 ? '0' : ''}{recordingDuration % 60}
              </span>
            </div>
            
            <button 
              type="button"
              onClick={stopRecording}
              className="send-btn active"
              title="Send Voice Message"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        ) : (
          <>
        {/* Emoji Panel Trigger */}
        <div style={{ position: 'relative' }}>
          <button 
            type="button" 
            className={`input-action-btn emoji-trigger-btn ${showEmojiPicker ? 'active' : ''}`}
            title="Emojis" 
            disabled={sending}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-6c.71 1.73 2.39 3 4.4 3 2.01 0 3.69-1.27 4.4-3H8zm1.5-4c.83 0 1.5-.67 1.5-1.5S10.33 7 9.5 7 8 7.67 8 8.5 8.67 10 9.5 10zm5 0c.83 0 1.5-.67 1.5-1.5S15.33 7 14.5 7 13 7.67 13 8.5s.67 1.5 1.5 1.5z"/>
            </svg>
          </button>
          
          {showEmojiPicker && (
            <div 
              ref={emojiPickerRef}
              style={{ 
                position: 'absolute', 
                bottom: '100%', 
                left: '0', 
                marginBottom: '10px',
                zIndex: 1000 
              }}
            >
              <EmojiPicker 
                onEmojiClick={(emojiData) => {
                  setText(prev => prev + emojiData.emoji);
                  inputRef.current?.focus();
                }}
                theme="dark"
                searchDisabled={false}
              />
            </div>
          )}
        </div>

        {/* Hidden Document Input */}
        <input 
          type="file" 
          ref={documentInputRef} 
          style={{ display: 'none' }} 
          accept="*" 
          onChange={(e) => handleFileChange(e, true)}
          disabled={!!editingMessage}
        />
        {/* Hidden Photos & Videos Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/jpeg, image/png, image/webp, image/gif, video/mp4, video/webm" 
          onChange={(e) => handleFileChange(e, false)}
          disabled={!!editingMessage}
        />
        
        {/* Attachment Menu Trigger */}
        <div style={{ position: 'relative' }}>
          <button 
            type="button" 
            className={`input-action-btn ${showAttachmentMenu ? 'active' : ''}`}
            title="Attach" 
            disabled={sending || !!editingMessage}
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style={{ transform: showAttachmentMenu ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>
          <AttachmentMenu 
            isOpen={showAttachmentMenu} 
            onClose={() => setShowAttachmentMenu(false)} 
            onSelect={handleAttachmentSelect} 
          />
        </div>

        {/* Main Text Input */}
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a message"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          className="message-input"
          maxLength={1000}
          readOnly={sending}
          enterKeyHint="send"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="sentences"
        />
        
        {/* Camera Button */}
        <button
          type="button"
          className="input-action-btn"
          disabled={sending || !!editingMessage}
          title="Camera"
          aria-label="Camera"
          onClick={() => setShowCamera(true)}
          style={{ padding: '8px' }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <circle cx="12" cy="12" r="3.2"/>
            <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
          </svg>
        </button>

            {/* Microphone / Send Button */}
            {(text.trim() || selectedFile) ? (
              <button
                type="submit"
                className={`send-btn ${!sending ? 'active' : ''}`}
                disabled={sending}
                title={editingMessage ? "Save Edit" : "Send message"}
              >
                {editingMessage ? (
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                )}
              </button>
            ) : (
              <button
                type="button"
                className="send-btn active"
                disabled={sending || !!editingMessage}
                title="Voice Message"
                onMouseDown={startRecording}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </button>
            )}
          </>
        )}
      </form>
    </div>
  );
}

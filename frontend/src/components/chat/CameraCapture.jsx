import React, { useState, useRef, useEffect } from 'react';

export default function CameraCapture({ onClose, onSendMedia }) {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('photo'); // 'photo' or 'video'
  const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment'
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const [capturedMedia, setCapturedMedia] = useState(null); // { type: 'image' | 'video', url, blob }
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  
  const isMobile = window.innerWidth <= 768;

  // Start Camera
  const startCamera = async (currentFacingMode) => {
    stopCamera(); // Stop any existing stream
    setError(null);
    try {
      const constraints = {
        video: { facingMode: currentFacingMode },
        audio: mode === 'video'
      };
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera access was denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Camera capture is not supported or failed to start.');
      }
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (!capturedMedia) {
      startCamera(facingMode);
    }
    
    return () => {
      stopCamera();
      stopRecordingCleanup();
      if (capturedMedia?.url) {
        URL.revokeObjectURL(capturedMedia.url);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, facingMode, capturedMedia]);

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const capturePhoto = () => {
    if (!videoRef.current || !stream) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setCapturedMedia({ type: 'image', url, blob });
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  const startRecording = () => {
    if (!stream) return;
    
    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (videoBlob.size > 0) {
           const url = URL.createObjectURL(videoBlob);
           setCapturedMedia({ type: 'video', url, blob: videoBlob, mimeType });
        }
        stopRecordingCleanup();
        stopCamera();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Failed to start recording', err);
      setError('Failed to start video recording.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const stopRecordingCleanup = () => {
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const handleRetake = () => {
    if (capturedMedia?.url) {
      URL.revokeObjectURL(capturedMedia.url);
    }
    setCapturedMedia(null);
  };

  const handleSend = () => {
    if (capturedMedia) {
      const ext = capturedMedia.type === 'image' ? 'jpg' : (capturedMedia.mimeType?.split('/')[1] || 'mp4');
      const file = new File([capturedMedia.blob], `camera_capture_${Date.now()}.${ext}`, { type: capturedMedia.blob.type });
      
      // Limit check (re-use existing 15MB limit intuitively or fallback to server error)
      if (file.size > 15 * 1024 * 1024) {
         setError('Video is too large. Please record a shorter video.');
         return;
      }
      
      onSendMedia(file);
      onClose();
    }
  };

  // Styles
  const containerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  };
  
  const modalStyle = isMobile ? {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  } : {
    width: '600px',
    height: '600px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    backgroundColor: '#000',
    borderRadius: '12px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px',
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.5)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10
  };

  const controlsStyle = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '24px 16px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '24px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
    zIndex: 10
  };
  
  const btnStyle = {
    background: 'none',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  };

  const captureBtnStyle = {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    border: '4px solid white',
    backgroundColor: mode === 'video' ? (isRecording ? '#ea0038' : 'rgba(255,255,255,0.3)') : 'rgba(255,255,255,0.9)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  return (
    <div style={containerStyle}>
      <div style={modalStyle}>
        
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ fontWeight: 'bold' }}>Camera</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }} title="Close">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
          
          {error && (
            <div style={{ color: 'white', textAlign: 'center', padding: '20px', maxWidth: '80%' }}>
              <p>{error}</p>
              <button onClick={onClose} style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: 'var(--primary-teal)', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer' }}>Close</button>
            </div>
          )}

          {!error && !capturedMedia && (
            <video 
              ref={videoRef}
              autoPlay 
              playsInline
              muted 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}

          {!error && capturedMedia && capturedMedia.type === 'image' && (
            <img src={capturedMedia.url} alt="Captured preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          )}

          {!error && capturedMedia && capturedMedia.type === 'video' && (
            <video src={capturedMedia.url} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          )}
          
          {/* Recording Indicator */}
          {isRecording && (
             <div style={{ position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ea0038', animation: 'pulse 1.5s infinite' }} />
                <span>
                  {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60) < 10 ? '0' : ''}{recordingDuration % 60}
                </span>
             </div>
          )}
        </div>

        {/* Controls */}
        {!error && (
          <div style={controlsStyle}>
            {capturedMedia ? (
              <>
                <button onClick={handleRetake} style={{ ...btnStyle, flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '24px' }}>
                   Retake
                </button>
                <button onClick={handleSend} style={{ ...btnStyle, flex: 1, backgroundColor: 'var(--primary-teal)', padding: '12px', borderRadius: '24px' }}>
                   Send
                </button>
              </>
            ) : (
              <>
                {/* Switch Mode (Photo/Video) */}
                <div style={{ display: 'flex', gap: '16px', position: 'absolute', top: '-40px', backgroundColor: 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: '20px' }}>
                   <span onClick={() => setMode('photo')} style={{ color: mode === 'photo' ? 'white' : '#aaa', cursor: 'pointer', fontWeight: mode === 'photo' ? 'bold' : 'normal' }}>Photo</span>
                   <span onClick={() => setMode('video')} style={{ color: mode === 'video' ? 'white' : '#aaa', cursor: 'pointer', fontWeight: mode === 'video' ? 'bold' : 'normal' }}>Video</span>
                </div>

                <button onClick={switchCamera} style={btnStyle} aria-label="Switch camera" title="Switch camera">
                   <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                      <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                   </svg>
                </button>
                
                <div 
                   onClick={() => {
                     if (mode === 'photo') {
                       capturePhoto();
                     } else {
                       isRecording ? stopRecording() : startRecording();
                     }
                   }}
                   style={captureBtnStyle}
                   aria-label={mode === 'photo' ? 'Capture photo' : (isRecording ? 'Stop recording' : 'Start recording')}
                   title={mode === 'photo' ? 'Capture photo' : (isRecording ? 'Stop recording' : 'Start recording')}
                >
                  {isRecording && <div style={{ width: '24px', height: '24px', backgroundColor: 'white', borderRadius: '4px' }} />}
                </div>

                <div style={{ width: '44px' }}>{/* Spacer to balance the layout */}</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { useCall } from '../../context/CallContext';
import './CallUI.css';

export default function CallOverlay() {
  const { 
    callState, 
    callType, 
    remoteUser, 
    localStream, 
    remoteStream, 
    endCall, 
    toggleMute, 
    toggleVideo, 
    switchCamera,
    isMuted,
    isVideoOff
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const audioRef = useRef(null);
  
  const [duration, setDuration] = useState(0);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream && callType === 'video') {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callType]);

  // Attach remote stream
  useEffect(() => {
    if (remoteStream) {
      if (callType === 'video' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      } else if (callType === 'audio' && audioRef.current) {
        audioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream, callType]);

  // Call duration timer
  useEffect(() => {
    let interval;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Only show if we're in an active calling state (not incoming - that's handled by Modal)
  if (callState === 'idle' || callState === 'incoming_call') return null;

  let statusText = '';
  switch (callState) {
    case 'outgoing_call':
      statusText = 'Calling...';
      break;
    case 'connecting':
      statusText = 'Connecting...';
      break;
    case 'ringing': // Remote user is ringing
      statusText = 'Ringing...';
      break;
    case 'connected':
      statusText = formatDuration(duration);
      break;
    default:
      statusText = callState;
  }

  return (
    <div className="call-fullscreen-overlay">
      <div className="call-top-bar">
        <button className="btn-back" onClick={endCall}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <div className="call-header-info">
          <img src={remoteUser?.avatar} alt={remoteUser?.name} />
          <div>
            <h3>{remoteUser?.name}</h3>
            <span>{statusText}</span>
          </div>
        </div>
      </div>

      <div className="call-media-container">
        {callType === 'audio' ? (
          <div className="audio-only-container">
            <img src={remoteUser?.avatar} alt={remoteUser?.name} className="audio-avatar" />
            <audio ref={audioRef} autoPlay />
          </div>
        ) : (
          <>
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="remote-video"
            />
            {localStream && !isVideoOff && (
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className="local-video"
              />
            )}
          </>
        )}
      </div>

      <div className="controls-container">
        {callType === 'video' && (
          <button className="control-btn" onClick={switchCamera} aria-label="Switch Camera">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
               <path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 11.5V13H9v2.5L5.5 12 9 8.5V11h6V8.5l3.5 3.5-3.5 3.5z"/>
            </svg>
          </button>
        )}

        {callType === 'video' && (
          <button className={`control-btn ${isVideoOff ? 'active' : ''}`} onClick={toggleVideo} aria-label="Toggle Video">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              {isVideoOff ? (
                <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
              ) : (
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              )}
            </svg>
          </button>
        )}

        <button className={`control-btn ${isMuted ? 'active' : ''}`} onClick={toggleMute} aria-label="Toggle Mute">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            {isMuted ? (
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02 3.28l-1.26-1.26c.11-.32.18-.65.18-1.02V5c0-1.66-1.34-3-3-3S7.9 3.34 7.9 5v6.02l-1.23-1.23v-4.8H5v4.8c0 2.8 2.2 5.08 4.9 5.34v3.16h2.2v-3.16c.4-.04.79-.12 1.15-.26l1.26 1.26c-.7.42-1.5.7-2.35.8v1.7c1.23-.15 2.37-.62 3.32-1.3l2.25 2.25 1.41-1.41-14.7-14.7-1.41 1.41 12.35 12.35zM12 14c1.66 0 3-1.34 3-3v-1.18L9.18 14H12z"/>
            ) : (
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            )}
          </svg>
        </button>

        <button className="control-btn end-call" onClick={endCall} aria-label="End Call">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

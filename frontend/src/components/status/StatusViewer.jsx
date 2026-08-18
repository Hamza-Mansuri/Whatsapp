import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../../services/api';
import { getProfessionalAvatar } from '../../utils/avatar';
import StatusViewers from './StatusViewers';

const STATUS_DURATION = 5000; // 5 seconds for image/text

export default function StatusViewer({ data, onClose, currentUserId }) {
  const { user, statuses, isOwner } = data;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const videoRef = useRef(null);
  const isPausedRef = useRef(false);

  const currentStatus = statuses[currentIndex];

  const handleNext = useCallback(() => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose(); // Close if we reached the end
    }
  }, [currentIndex, statuses.length, onClose]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  }, [currentIndex]);

  // Mark as viewed
  useEffect(() => {
    if (currentStatus && !isOwner) {
      // Record view
      apiClient.post(`/status/${currentStatus._id}/view`).catch(err => console.error('Failed to view status', err));
    }
  }, [currentStatus, isOwner]);

  // Progress logic
  useEffect(() => {
    if (showViewers) return; // Pause when viewing viewers

    if (currentStatus.type === 'video') {
      // For video, progress is driven by video timeupdate event, not timer
      return;
    }

    startTimeRef.current = Date.now() - (progress * STATUS_DURATION / 100);

    const updateProgress = () => {
      if (isPausedRef.current) {
        startTimeRef.current = Date.now() - (progress * STATUS_DURATION / 100);
        timerRef.current = requestAnimationFrame(updateProgress);
        return;
      }
      
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = (elapsed / STATUS_DURATION) * 100;

      if (newProgress >= 100) {
        handleNext();
      } else {
        setProgress(newProgress);
        timerRef.current = requestAnimationFrame(updateProgress);
      }
    };

    timerRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [currentIndex, currentStatus, handleNext, showViewers, progress]);

  // Handle Video Time Update
  const handleVideoTimeUpdate = (e) => {
    if (isPausedRef.current || showViewers) {
      e.target.pause();
      return;
    } else {
      // Ensure playing
      if (e.target.paused) e.target.play().catch(()=>console.log('play blocked'));
    }

    const { currentTime, duration } = e.target;
    if (duration) {
      const p = (currentTime / duration) * 100;
      setProgress(p);
    }
  };

  const handleVideoEnded = () => {
    handleNext();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleNext, handlePrev]);

  // Touch/Click interaction (pause on hold, next/prev on tap)
  const handlePointerDown = (e) => {
    if (e.target.closest('.status-controls')) return;
    isPausedRef.current = true;
    if (videoRef.current) videoRef.current.pause();
  };

  const handlePointerUp = (e) => {
    if (e.target.closest('.status-controls')) return;
    isPausedRef.current = false;
    if (videoRef.current && !showViewers) videoRef.current.play().catch(e=>e);
    
    // Determine click position for next/prev
    const width = window.innerWidth;
    const x = e.clientX || (e.changedTouches && e.changedTouches[0].clientX) || 0;
    if (x < width * 0.3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (window.confirm('Delete this status?')) {
      try {
        isPausedRef.current = true;
        const res = await apiClient.delete(`/status/${currentStatus._id}`);
        if (res.data.success) {
          if (statuses.length === 1) {
            onClose();
          } else {
            // Fake removal for immediate UX
            statuses.splice(currentIndex, 1);
            if (currentIndex >= statuses.length) {
              setCurrentIndex(statuses.length - 1);
            }
            setProgress(0);
            isPausedRef.current = false;
          }
        }
      } catch (err) {
        console.error('Delete fail', err);
        isPausedRef.current = false;
      }
    }
  };

  return (
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000,
        backgroundColor: currentStatus.type === 'text' ? currentStatus.backgroundColor : 'black',
        display: 'flex', flexDirection: 'column', color: 'white'
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Progress Bars */}
      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', gap: '4px', zIndex: 10010 }} className="status-controls">
        {statuses.map((_, idx) => (
          <div key={idx} style={{ flex: 1, height: '3px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              backgroundColor: 'white', 
              width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
              transition: currentStatus.type === 'video' ? 'width 0.1s linear' : 'none'
            }} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ position: 'absolute', top: 20, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10010 }} className="status-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>
          <img src={getProfessionalAvatar(user)} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <div style={{ fontWeight: 500, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{isOwner ? 'My status' : user.name}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              {new Date(currentStatus.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {isOwner && (
          <button onClick={handleDelete} style={{ background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '50%', border: 'none', color: 'white', cursor: 'pointer' }}>
             <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {currentStatus.type === 'text' && (
          <div style={{ 
            fontSize: '2rem', textAlign: 'center', padding: '20px', 
            color: currentStatus.textColor || 'white', fontFamily: 'inherit',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word'
          }}>
            {currentStatus.text}
          </div>
        )}

        {currentStatus.type === 'image' && (
          <img src={currentStatus.mediaUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} draggable={false} />
        )}

        {currentStatus.type === 'video' && (
          <video 
            ref={videoRef}
            src={currentStatus.mediaUrl} 
            style={{ maxWidth: '100%', maxHeight: '100%' }}
            autoPlay 
            playsInline
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={handleVideoEnded}
            onClick={(e) => e.preventDefault()} // Let parent handle clicks
          />
        )}
      </div>

      {/* Viewers Footer (Owner only) */}
      {isOwner && (
        <div 
          className="status-controls"
          onClick={(e) => {
             e.stopPropagation();
             setShowViewers(true);
             if (videoRef.current) videoRef.current.pause();
          }}
          style={{ 
            position: 'absolute', bottom: 30, left: 0, right: 0, 
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            cursor: 'pointer', zIndex: 10010
          }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>
          <span style={{ fontWeight: 500, fontSize: '0.9rem', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
             {currentStatus.viewers?.length || 0}
          </span>
        </div>
      )}

      {showViewers && (
        <StatusViewers 
          statusId={currentStatus._id}
          onClose={() => {
            setShowViewers(false);
            if (videoRef.current) videoRef.current.play().catch(e=>e);
          }} 
        />
      )}
    </div>
  );
}

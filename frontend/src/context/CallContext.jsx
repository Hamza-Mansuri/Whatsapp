import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { socketService } from '../services/socket';
import { callService } from '../services/callService';
import useAuth from '../hooks/useAuth';

const CallContext = createContext(null);

export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
  const { user } = useAuth();
  const [callState, setCallState] = useState('idle'); // idle, incoming_call, outgoing_call, connecting, connected
  const [callType, setCallType] = useState('audio'); // audio, video
  const [remoteUser, setRemoteUser] = useState(null); // { id, name, avatar }
  
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const timeoutRef = useRef(null);

  const resetCall = useCallback(() => {
    setCallState('idle');
    setRemoteUser(null);
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsVideoOff(false);
    callService.closePeerConnection();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleEndCall = useCallback(() => {
    if (remoteUser && callState !== 'idle') {
      if (callState === 'incoming_call') {
        socketService.emitCallReject({ targetId: remoteUser.id, callType });
      } else if (callState === 'outgoing_call') {
        socketService.emitCallCancel({ targetId: remoteUser.id, callType });
      } else {
        socketService.emitCallEnd({ targetId: remoteUser.id, callType });
      }
    }
    resetCall();
  }, [remoteUser, callState, callType, resetCall]);

  useEffect(() => {
    if (!user) return;

    const handleRing = (data) => {
      const { callerId, callType: cType, callerData } = data;
      setCallState(prev => {
        if (prev !== 'idle') {
          // Send busy signal if we are already in a call
          socketService.emitCallBusy({ targetId: callerId });
          return prev;
        }
        
        setCallType(cType);
        setRemoteUser({ id: callerId, ...callerData });
        return 'incoming_call';
      });
    };

    const handleAccept = async () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setCallState('connecting');
      try {
        const offer = await callService.createOffer();
        socketService.emitCallOffer({ targetId: remoteUser.id, offer });
      } catch (err) {
        console.error('Failed to create offer after accept', err);
        handleEndCall();
      }
    };

    const handleReject = () => {
      resetCall();
    };

    const handleBusy = () => {
      alert('User is busy on another call.');
      resetCall();
    };

    const handleCancel = () => {
      resetCall();
    };

    const handleEnd = () => {
      resetCall();
    };

    const handleOffer = async ({ offer }) => {
      try {
        await callService.setRemoteDescription(offer);
        const answer = await callService.createAnswer();
        socketService.emitCallAnswer({ targetId: remoteUser.id, answer });
      } catch (err) {
        console.error('Failed to handle offer', err);
        resetCall();
      }
    };

    const handleAnswer = async ({ answer }) => {
      try {
        await callService.setRemoteDescription(answer);
        setCallState('connected');
      } catch (err) {
        console.error('Failed to set remote description from answer', err);
        resetCall();
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      try {
        await callService.addIceCandidate(candidate);
      } catch (err) {
        console.error('Failed to add ice candidate', err);
      }
    };

    socketService.onCallRing(handleRing);
    socketService.onCallAccept(handleAccept);
    socketService.onCallReject(handleReject);
    socketService.onCallBusy(handleBusy);
    socketService.onCallCancel(handleCancel);
    socketService.onCallEnd(handleEnd);
    socketService.onCallOffer(handleOffer);
    socketService.onCallAnswer(handleAnswer);
    socketService.onCallIceCandidate(handleIceCandidate);

    return () => {
      socketService.offCallRing(handleRing);
      socketService.offCallAccept(handleAccept);
      socketService.offCallReject(handleReject);
      socketService.offCallBusy(handleBusy);
      socketService.offCallCancel(handleCancel);
      socketService.offCallEnd(handleEnd);
      socketService.offCallOffer(handleOffer);
      socketService.offCallAnswer(handleAnswer);
      socketService.offCallIceCandidate(handleIceCandidate);
    };
  }, [user, remoteUser, handleEndCall, resetCall]);

  const initiateCall = async (targetUser, cType) => {
    if (callState !== 'idle') return;
    
    setCallState('outgoing_call');
    setCallType(cType);
    setRemoteUser({ id: targetUser._id || targetUser.id, name: targetUser.name, avatar: targetUser.avatar });

    try {
      callService.initPeerConnection();
      
      callService.onIceCandidate = (candidate) => {
        socketService.emitCallIceCandidate({ targetId: targetUser._id || targetUser.id, candidate });
      };

      callService.onRemoteTrack = (stream) => {
        setRemoteStream(stream);
      };

      callService.onConnectionStateChange = (state) => {
        if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          handleEndCall();
        }
      };

      const stream = await callService.startLocalMedia(cType);
      setLocalStream(stream);

      socketService.emitCallInitiate({
        targetId: targetUser._id || targetUser.id,
        callType: cType,
        callerData: { name: user.name, avatar: user.avatar }
      });

      // 30s timeout
      timeoutRef.current = setTimeout(() => {
        if (callState === 'outgoing_call') {
          socketService.emitCallCancel({ targetId: targetUser._id || targetUser.id, callType: cType });
          resetCall();
          alert('No answer');
        }
      }, 30000);
      
    } catch (err) {
      console.error('Failed to initiate call:', err);
      resetCall();
      alert('Failed to access camera/microphone.');
    }
  };

  const acceptCall = async () => {
    if (callState !== 'incoming_call' || !remoteUser) return;
    
    try {
      callService.initPeerConnection();

      callService.onIceCandidate = (candidate) => {
        socketService.emitCallIceCandidate({ targetId: remoteUser.id, candidate });
      };

      callService.onRemoteTrack = (stream) => {
        setRemoteStream(stream);
      };

      callService.onConnectionStateChange = (state) => {
        if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          handleEndCall();
        }
      };

      const stream = await callService.startLocalMedia(callType);
      setLocalStream(stream);
      setCallState('connecting');

      socketService.emitCallAccept({ targetId: remoteUser.id });
    } catch (err) {
      console.error('Failed to accept call:', err);
      resetCall();
      alert('Failed to access camera/microphone.');
    }
  };

  const rejectCall = () => {
    if (callState === 'incoming_call' && remoteUser) {
      socketService.emitCallReject({ targetId: remoteUser.id, callType });
    }
    resetCall();
  };

  const toggleMute = () => {
    setIsMuted(prev => {
      callService.toggleAudio(!prev);
      return !prev;
    });
  };

  const toggleVideo = () => {
    if (callType === 'audio') return;
    setIsVideoOff(prev => {
      callService.toggleVideo(!prev);
      return !prev;
    });
  };

  const switchCamera = async () => {
    const newStream = await callService.switchCamera();
    if (newStream) {
      setLocalStream(newStream);
    }
  };

  return (
    <CallContext.Provider value={{
      callState,
      callType,
      remoteUser,
      localStream,
      remoteStream,
      isMuted,
      isVideoOff,
      initiateCall,
      acceptCall,
      rejectCall,
      endCall: handleEndCall,
      toggleMute,
      toggleVideo,
      switchCamera,
    }}>
      {children}
    </CallContext.Provider>
  );
};

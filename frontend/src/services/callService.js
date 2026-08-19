class CallService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = new MediaStream();
    this.onRemoteTrack = null;
    this.onIceCandidate = null;
    this.onConnectionStateChange = null;
    this.iceCandidateQueue = [];
  }

  getIceServers() {
    const stunServersStr = import.meta.env.VITE_STUN_SERVERS || 'stun:stun.l.google.com:19302';
    const urls = stunServersStr.split(',').map(s => s.trim());
    
    const iceServers = [{ urls }];

    // Optional TURN configuration
    const turnServer = import.meta.env.VITE_TURN_SERVER;
    if (turnServer) {
      iceServers.push({
        urls: turnServer,
        username: import.meta.env.VITE_TURN_USERNAME,
        credential: import.meta.env.VITE_TURN_CREDENTIAL,
      });
    }
    
    return iceServers;
  }

  initPeerConnection() {
    if (this.peerConnection) {
      this.closePeerConnection();
    }
    this.iceCandidateQueue = [];

    const config = {
      iceServers: this.getIceServers()
    };

    this.peerConnection = new RTCPeerConnection(config);

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate);
      }
    };

    // Handle remote tracks
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else {
        this.remoteStream.addTrack(event.track);
      }
      if (this.onRemoteTrack) {
        this.onRemoteTrack(this.remoteStream);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(this.peerConnection.connectionState);
      }
    };
  }

  async startLocalMedia(callType = 'audio') {
    try {
      const constraints = {
        audio: true,
        video: callType === 'video'
      };
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (this.peerConnection) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }
      
      return this.localStream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      throw err;
    }
  }

  async createOffer() {
    if (!this.peerConnection) return null;
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      return offer;
    } catch (err) {
      console.error('Error creating offer:', err);
      throw err;
    }
  }

  async createAnswer() {
    if (!this.peerConnection) return null;
    try {
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      return answer;
    } catch (err) {
      console.error('Error creating answer:', err);
      throw err;
    }
  }

  async setRemoteDescription(description) {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(description));
      // Process queued candidates
      while (this.iceCandidateQueue.length > 0) {
        const candidate = this.iceCandidateQueue.shift();
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.error('Error setting remote description:', err);
      throw err;
    }
  }

  async addIceCandidate(candidate) {
    // If we don't have a peer connection or remote description yet, queue it!
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      this.iceCandidateQueue.push(candidate);
      return;
    }
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('Error adding ICE candidate:', err);
      throw err;
    }
  }

  toggleAudio(muted) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  toggleVideo(muted) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }
  
  async switchCamera() {
    if (!this.localStream) return;
    
    // Switch camera logic
    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length === 0) return;
    
    const currentTrack = videoTracks[0];
    const settings = currentTrack.getSettings();
    const newFacingMode = settings.facingMode === 'user' ? 'environment' : 'user';
    
    try {
      currentTrack.stop();
      this.localStream.removeTrack(currentTrack);
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode }
      });
      
      const newTrack = newStream.getVideoTracks()[0];
      this.localStream.addTrack(newTrack);
      
      // Update the track in peer connection
      if (this.peerConnection) {
        const senders = this.peerConnection.getSenders();
        const sender = senders.find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(newTrack);
        }
      }
      
      return this.localStream;
    } catch (err) {
      console.error('Error switching camera:', err);
    }
  }

  closePeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    this.stopMedia();
    this.remoteStream = new MediaStream(); // reset
  }

  stopMedia() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }
}

export const callService = new CallService();

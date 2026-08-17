// Professional subtle notification sound using Web Audio API
// Avoids large audio dependencies and static files while providing a clean "pop" sound.

let audioCtx = null;

export const playNotificationSound = () => {
  try {
    // Check if notifications are muted in settings
    const notificationsEnabled = localStorage.getItem('desktop_notifications') !== 'false';
    if (!notificationsEnabled) return;

    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine';
    
    // Quick, high "pop" pitch drop
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1);
    
    // Smooth volume envelope to make it subtle and professional
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.2);
  } catch (err) {
    // Ignore autoplay or audio context errors gracefully
    console.debug('Notification sound blocked or unavailable:', err);
  }
};

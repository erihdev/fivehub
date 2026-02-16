import { useState, useEffect, useCallback } from 'react';

// Storage keys for notification sound preferences
const STORAGE_KEY = 'notification_sound_enabled';
const TONE_STORAGE_KEY = 'notification_sound_tone';
const VOLUME_STORAGE_KEY = 'notification_sound_volume';

export type NotificationTone = 
  | 'classic'      // النغمة الكلاسيكية
  | 'gentle'       // نغمة هادئة
  | 'urgent'       // نغمة عاجلة
  | 'coffee'       // نغمة القهوة
  | 'chime'        // رنين
  | 'success';     // نغمة النجاح

export const NOTIFICATION_TONES: { id: NotificationTone; nameAr: string; nameEn: string }[] = [
  { id: 'classic', nameAr: 'كلاسيكي', nameEn: 'Classic' },
  { id: 'gentle', nameAr: 'هادئ', nameEn: 'Gentle' },
  { id: 'urgent', nameAr: 'عاجل', nameEn: 'Urgent' },
  { id: 'coffee', nameAr: 'قهوة', nameEn: 'Coffee' },
  { id: 'chime', nameAr: 'رنين', nameEn: 'Chime' },
  { id: 'success', nameAr: 'نجاح', nameEn: 'Success' },
];

// Different sound patterns for each tone
const playToneSound = (tone: NotificationTone, audioContext: AudioContext, volume: number = 0.7) => {
  // Create a master gain node for volume control
  const masterGain = audioContext.createGain();
  masterGain.connect(audioContext.destination);
  masterGain.gain.setValueAtTime(volume, audioContext.currentTime);

  switch (tone) {
    case 'classic':
      playClassicSound(audioContext, masterGain, volume);
      break;
    case 'gentle':
      playGentleSound(audioContext, masterGain, volume);
      break;
    case 'urgent':
      playUrgentSound(audioContext, masterGain, volume);
      break;
    case 'coffee':
      playCoffeeSound(audioContext, masterGain, volume);
      break;
    case 'chime':
      playChimeSound(audioContext, masterGain, volume);
      break;
    case 'success':
      playSuccessSound(audioContext, masterGain, volume);
      break;
    default:
      playClassicSound(audioContext, masterGain, volume);
  }
};

// Classic - Original two-note melody
const playClassicSound = (ctx: AudioContext, masterGain: GainNode, vol: number) => {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(masterGain);
  
  osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
  osc2.frequency.setValueAtTime(659.25, ctx.currentTime);
  osc1.type = 'sine';
  osc2.type = 'sine';
  
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3 * vol, ctx.currentTime + 0.1);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
  
  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.5);
  osc2.stop(ctx.currentTime + 0.5);

  setTimeout(() => {
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o1.connect(g);
    o2.connect(g);
    g.connect(masterGain);
    o1.frequency.setValueAtTime(659.25, ctx.currentTime);
    o2.frequency.setValueAtTime(783.99, ctx.currentTime);
    o1.type = 'sine';
    o2.type = 'sine';
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.25 * vol, ctx.currentTime + 0.1);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    o1.start(ctx.currentTime);
    o2.start(ctx.currentTime);
    o1.stop(ctx.currentTime + 0.4);
    o2.stop(ctx.currentTime + 0.4);
  }, 200);
};

// Gentle - Soft, low-pitched melody
const playGentleSound = (ctx: AudioContext, masterGain: GainNode, vol: number) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(masterGain);
  
  osc.frequency.setValueAtTime(329.63, ctx.currentTime); // E4
  osc.frequency.linearRampToValueAtTime(392.00, ctx.currentTime + 0.3); // G4
  osc.type = 'sine';
  
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.2 * vol, ctx.currentTime + 0.15);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.6);
};

// Urgent - Fast, attention-grabbing
const playUrgentSound = (ctx: AudioContext, masterGain: GainNode, vol: number) => {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.type = 'square';
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15 * vol, ctx.currentTime + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    }, i * 120);
  }
};

// Coffee - Warm, cafe-like sound
const playCoffeeSound = (ctx: AudioContext, masterGain: GainNode, vol: number) => {
  const notes = [293.66, 349.23, 440.00]; // D4, F4, A4 - warm chord
  
  notes.forEach((freq, i) => {
    setTimeout(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.type = 'triangle';
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25 * vol, ctx.currentTime + 0.1);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    }, i * 150);
  });
};

// Chime - Bell-like sound
const playChimeSound = (ctx: AudioContext, masterGain: GainNode, vol: number) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(masterGain);
  
  osc.frequency.setValueAtTime(1046.50, ctx.currentTime); // C6
  osc.type = 'sine';
  
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.4 * vol, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 1);
};

// Success - Celebratory ascending notes
const playSuccessSound = (ctx: AudioContext, masterGain: GainNode, vol: number) => {
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  
  notes.forEach((freq, i) => {
    setTimeout(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2 * vol, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    }, i * 100);
  });
};

export const useNotificationSound = () => {
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [selectedTone, setSelectedTone] = useState<NotificationTone>('classic');
  const [volume, setVolume] = useState(0.7);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedEnabled = localStorage.getItem(STORAGE_KEY);
      if (storedEnabled !== null) {
        setIsSoundEnabled(storedEnabled === 'true');
      }
      
      const storedTone = localStorage.getItem(TONE_STORAGE_KEY);
      if (storedTone) {
        setSelectedTone(storedTone as NotificationTone);
      }
      
      const storedVolume = localStorage.getItem(VOLUME_STORAGE_KEY);
      if (storedVolume !== null) {
        setVolume(parseFloat(storedVolume));
      }
    } catch (error) {
      console.log('Could not load notification preferences:', error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isSoundEnabled));
  }, [isSoundEnabled]);

  useEffect(() => {
    localStorage.setItem(TONE_STORAGE_KEY, selectedTone);
  }, [selectedTone]);

  useEffect(() => {
    localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
  }, [volume]);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled(prev => !prev);
  }, []);

  const changeTone = useCallback((tone: NotificationTone) => {
    setSelectedTone(tone);
  }, []);

  const changeVolume = useCallback((newVolume: number) => {
    setVolume(Math.max(0, Math.min(1, newVolume)));
  }, []);

  const playNotificationSound = useCallback((toneOverride?: NotificationTone, volumeOverride?: number) => {
    if (!isSoundEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      playToneSound(toneOverride || selectedTone, audioContext, volumeOverride ?? volume);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }, [isSoundEnabled, selectedTone, volume]);

  const previewTone = useCallback((tone: NotificationTone, previewVolume?: number) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      playToneSound(tone, audioContext, previewVolume ?? volume);
    } catch (error) {
      console.log('Could not play preview sound:', error);
    }
  }, [volume]);

  return {
    isSoundEnabled,
    selectedTone,
    volume,
    toggleSound,
    changeTone,
    changeVolume,
    playNotificationSound,
    previewTone
  };
};

// Singleton for global access - lazy initialization to avoid SSR issues
let globalSoundEnabled: boolean | null = null;
let globalSelectedTone: NotificationTone | null = null;
let globalVolume: number | null = null;
let audioContextUnlocked = false;
let pendingAudioContext: AudioContext | null = null;

// Unlock audio context on first user interaction (required by browsers)
const unlockAudioContext = () => {
  if (audioContextUnlocked) return;
  
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Create and play a silent buffer to unlock
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    pendingAudioContext = ctx;
    audioContextUnlocked = true;
    console.log('Audio context unlocked successfully');
    
    // Remove listeners after unlock
    document.removeEventListener('click', unlockAudioContext);
    document.removeEventListener('touchstart', unlockAudioContext);
    document.removeEventListener('keydown', unlockAudioContext);
  } catch (error) {
    console.log('Could not unlock audio context:', error);
  }
};

// Setup audio unlock listeners
if (typeof window !== 'undefined') {
  document.addEventListener('click', unlockAudioContext, { once: false });
  document.addEventListener('touchstart', unlockAudioContext, { once: false });
  document.addEventListener('keydown', unlockAudioContext, { once: false });
}

const initGlobals = () => {
  if (typeof window === 'undefined') return;
  if (globalSoundEnabled === null) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Default to enabled (true) if no value stored
      globalSoundEnabled = stored === null ? true : stored === 'true';
      globalSelectedTone = (localStorage.getItem(TONE_STORAGE_KEY) as NotificationTone) || 'classic';
      globalVolume = parseFloat(localStorage.getItem(VOLUME_STORAGE_KEY) || '0.7');
      
      // If first time, save defaults
      if (stored === null) {
        localStorage.setItem(STORAGE_KEY, 'true');
      }
    } catch {
      globalSoundEnabled = true;
      globalSelectedTone = 'classic';
      globalVolume = 0.7;
    }
  }
};

export const getNotificationSoundEnabled = () => {
  initGlobals();
  return globalSoundEnabled ?? true;
};

export const getSelectedTone = () => {
  initGlobals();
  return globalSelectedTone ?? 'classic';
};

export const getVolume = () => {
  initGlobals();
  return globalVolume ?? 0.7;
};

export const setNotificationSoundEnabled = (enabled: boolean) => {
  globalSoundEnabled = enabled;
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {}
};

export const setGlobalSelectedTone = (tone: NotificationTone) => {
  globalSelectedTone = tone;
  try {
    localStorage.setItem(TONE_STORAGE_KEY, tone);
  } catch {}
};

export const setGlobalVolume = (vol: number) => {
  globalVolume = vol;
  try {
    localStorage.setItem(VOLUME_STORAGE_KEY, String(vol));
  } catch {}
};

export const playGlobalNotificationSound = () => {
  const enabled = getNotificationSoundEnabled();
  const tone = getSelectedTone();
  const vol = getVolume();
  
  console.log('🔊 playGlobalNotificationSound:', { enabled, tone, vol });
  
  if (!enabled) {
    console.log('❌ Notification sound is disabled in settings');
    return;
  }
  
  // Force play sound regardless of AudioContext state
  forcePlaySound(tone, vol);
};

// Force play sound using multiple methods for maximum compatibility
const forcePlaySound = (tone: NotificationTone, vol: number) => {
  try {
    // Method 1: Use pending unlocked context
    if (pendingAudioContext && pendingAudioContext.state === 'running') {
      console.log('✅ Using unlocked AudioContext');
      playToneSound(tone, pendingAudioContext, vol);
      return;
    }
    
    // Method 2: Create new AudioContext and force resume
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (audioContext.state === 'suspended') {
      // Try to resume, but also play immediately
      audioContext.resume().then(() => {
        console.log('✅ AudioContext resumed, playing...');
        playToneSound(tone, audioContext, vol);
        pendingAudioContext = audioContext;
      }).catch(() => {
        console.log('⚠️ Could not resume, trying alternative...');
      });
      
      // Also try playing directly (some browsers allow this)
      try {
        playToneSound(tone, audioContext, vol);
      } catch {}
    } else {
      console.log('✅ AudioContext running, playing...');
      playToneSound(tone, audioContext, vol);
      pendingAudioContext = audioContext;
    }
  } catch (error) {
    console.error('❌ Sound playback failed:', error);
  }
};
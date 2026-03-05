
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

class SoundService {
    private audio: HTMLAudioElement;
    private isEnabled: boolean = false;
    private audioContext: AudioContext | null = null;

    constructor() {
        this.audio = new Audio(NOTIFICATION_SOUND_URL);
        this.audio.volume = 0.5;
        this.audio.preload = 'auto'; // Ensure it loads immediately
        
        // Try to load from localStorage
        const stored = localStorage.getItem('altoque_sound_enabled');
        if (stored) {
            this.isEnabled = stored === 'true';
        }
    }

    private playFallbackBeep() {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime); // A5
            oscillator.frequency.exponentialRampToValueAtTime(440, this.audioContext.currentTime + 0.1); // Drop to A4

            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.5);
        } catch (e) {
            console.error("Fallback audio failed:", e);
        }
    }

    play() {
        if (!this.isEnabled) {
            console.log("SoundService: Play requested but sound is disabled.");
            return;
        }
        
        // Reset time to allow rapid replay
        this.audio.currentTime = 0;
        
        const playPromise = this.audio.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn("SoundService: Audio playback failed. Attempting fallback beep.", error);
                this.playFallbackBeep();
            });
        }
    }

    setEnabled(enabled: boolean) {
        this.isEnabled = enabled;
        localStorage.setItem('altoque_sound_enabled', String(enabled));
        
        if (enabled) {
            // Play a test sound to confirm and unlock audio context
            this.play();
        }
    }

    getEnabled() {
        return this.isEnabled;
    }
}

export const soundService = new SoundService();

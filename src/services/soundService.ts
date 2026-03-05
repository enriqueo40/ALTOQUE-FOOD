
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

class SoundService {
    private audio: HTMLAudioElement;
    private isEnabled: boolean = false; // Default to false until user interaction

    constructor() {
        this.audio = new Audio(NOTIFICATION_SOUND_URL);
        this.audio.volume = 0.5;
        
        // Try to load from localStorage
        const stored = localStorage.getItem('altoque_sound_enabled');
        if (stored) {
            this.isEnabled = stored === 'true';
        }
    }

    play() {
        if (!this.isEnabled) return;
        
        this.audio.currentTime = 0;
        this.audio.play().catch(error => {
            console.warn("Audio playback failed (likely due to no user interaction yet):", error);
        });
    }

    setEnabled(enabled: boolean) {
        this.isEnabled = enabled;
        localStorage.setItem('altoque_sound_enabled', String(enabled));
        
        // If enabling, play a silent sound or short sound to unlock audio context if needed
        if (enabled) {
            this.audio.play().catch(() => {});
        }
    }

    getEnabled() {
        return this.isEnabled;
    }
}

export const soundService = new SoundService();

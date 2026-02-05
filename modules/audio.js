// audio.js
export class WebAudioManager {
    constructor() {
        this.audioContext = null;
        this.initialized = false;
        this.volume = 0.5;
        this.pendingSounds = [];
    }

    async initFromUserGesture() {
        if (this.initialized) return true;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (this.audioContext.state === 'suspended') await this.audioContext.resume();
            this.initialized = true;
            while (this.pendingSounds.length > 0) {
                const sound = this.pendingSounds.shift();
                this.playTone(sound.frequency, sound.duration, sound.type, sound.volume);
            }
            document.getElementById('audioActivator').style.display = 'none';
            return true;
        } catch (error) {
            console.log('Audio initialization failed:', error);
            return false;
        }
    }

    playTone(frequency, duration, type = 'sine', volume = 0.1) {
        if (!this.initialized || !this.audioContext) {
            this.pendingSounds.push({ frequency, duration, type, volume });
            return;
        }
        if (this.audioContext.state === 'suspended') this.audioContext.resume();
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = type;
        gainNode.gain.setValueAtTime(volume * this.volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playMine() {
        this.playTone(400, 0.05, 'sine', 0.15);
        setTimeout(() => this.playTone(250, 0.08, 'sine', 0.1), 30);
    }
    playPlace() {
        this.playTone(250, 0.08, 'sine', 0.1);
        setTimeout(() => this.playTone(500, 0.05, 'sine', 0.1), 30);
    }
    playJump() { this.playTone(80, 0.15, 'sine', 0.3); }
    playCraft() { 
        this.playTone(523, 0.1, 'sine', 0.25);
        setTimeout(() => this.playTone(659, 0.1, 'sine', 0.25), 80);
        setTimeout(() => this.playTone(784, 0.15, 'sine', 0.25), 160);
    }
    playLand() {
        this.playTone(80, 0.08, 'sine', 0.25);
        setTimeout(() => this.playTone(120, 0.12, 'sine', 0.15), 20);
        setTimeout(() => this.playTone(80, 0.15, 'sine', 0.3), 50);
    }
    playHit() {
        this.playTone(150, 0.1, 'square', 0.3);
        setTimeout(() => this.playTone(100, 0.15, 'square', 0.2), 50);
    }
    playMonsterDie() {
        this.playTone(80, 0.2, 'sawtooth', 0.4);
        setTimeout(() => this.playTone(60, 0.3, 'sawtooth', 0.3), 100);
    }

    playPickup() {
        // 🔊 Petit « plop » aigu et rapide
        this.playTone(800, 0.08, 'sine', 0.25);
        setTimeout(() => this.playTone(1200, 0.06, 'sine', 0.2), 40);
    }

    setVolume(value) { this.volume = Math.max(0, Math.min(1, value)); }
}

export const soundManager = new WebAudioManager();


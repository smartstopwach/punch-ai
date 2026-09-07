/**
 * AudioManager - WebAudio placeholder
 * Future: load real samples
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private gainNode: GainNode | null = null;

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.ctx.createGain();
      this.gainNode.connect(this.ctx.destination);
      this.gainNode.gain.value = 0.6;
    } catch (e) {
      console.warn('WebAudio not supported', e);
    }
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    if (this.gainNode) this.gainNode.gain.value = v ? 0.6 : 0;
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3) {
    if (!this.enabled || !this.ctx || !this.gainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    osc.connect(gain);
    gain.connect(this.gainNode);
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.start(now);
    osc.stop(now + dur);
  }

  punch(power: number) {
    if (power > 80) {
      this.tone(120, 0.15, 'sine', 0.5);
      setTimeout(() => this.tone(60, 0.2, 'triangle', 0.4), 20);
    } else if (power > 50) {
      this.tone(180, 0.12, 'sine', 0.35);
    } else {
      this.tone(260, 0.08, 'sine', 0.25);
    }
  }

  combo(count: number) {
    const base = 400 + count * 40;
    this.tone(base, 0.12, 'sine', 0.3);
    setTimeout(() => this.tone(base * 1.5, 0.15, 'sine', 0.25), 80);
  }

  uiClick() { this.tone(800, 0.06, 'sine', 0.15); }
  roundStart() { this.tone(440, 0.2, 'sine', 0.3); setTimeout(()=>this.tone(880,0.3,'sine',0.35),150); }
  roundEnd() { this.tone(330, 0.4, 'triangle', 0.3); }
}

export const audioManager = new AudioManager();

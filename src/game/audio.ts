export class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private ambientGain: GainNode | null = null;
  private ambientStarted = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(muted ? 0 : 0.035, this.ctx.currentTime, 0.15);
    }
  }

  public unlock(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (!this.ambientStarted) {
      this.startAmbientPad();
    }
  }

  private startAmbientPad(): void {
    if (!this.ctx || this.ambientStarted) return;
    this.ambientStarted = true;
    const now = this.ctx.currentTime;
    const master = this.ctx.createGain();
    master.gain.setValueAtTime(this.muted ? 0 : 0.035, now);
    master.connect(this.ctx.destination);
    this.ambientGain = master;

    // Gentle airy forest fifth drone
    const freqs = [220, 329.63];
    freqs.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.12 + idx * 0.05, now);
      lfoGain.gain.setValueAtTime(0.25, now);

      const voiceGain = this.ctx.createGain();
      voiceGain.gain.setValueAtTime(0.45, now);

      lfo.connect(lfoGain);
      lfoGain.connect(voiceGain.gain);
      osc.connect(filter);
      filter.connect(voiceGain);
      voiceGain.connect(master);

      osc.start(now);
      lfo.start(now);
    });
  }

  private playTone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
  ): void {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + Math.min(0.02, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playFootstep(surface: 'grass' | 'wood' | 'stone'): void {
    if (this.muted || !this.ctx) return;
    if (surface === 'wood') {
      this.playTone(165 + Math.random() * 25, 95, 0.065, 'triangle', 0.045);
    } else if (surface === 'stone') {
      this.playTone(260 + Math.random() * 40, 140, 0.05, 'triangle', 0.038);
    } else {
      this.playTone(120 + Math.random() * 25, 75, 0.055, 'sine', 0.032);
    }
  }

  public playJump(isDoubleJump: boolean): void {
    if (isDoubleJump) {
      this.playTone(587.33, 880, 0.16, 'sine', 0.07);
      this.playTone(783.99, 1174.66, 0.18, 'triangle', 0.04, 0.03);
    } else {
      this.playTone(329.63, 523.25, 0.14, 'sine', 0.065);
    }
  }

  public playLand(): void {
    this.playTone(130, 68, 0.09, 'sine', 0.05);
  }

  public playBounce(): void {
    this.playTone(220, 660, 0.28, 'sine', 0.09);
    this.playTone(330, 880, 0.24, 'triangle', 0.04, 0.04);
  }

  public playDewdrop(): void {
    const notes = [659.25, 783.99, 987.77, 1318.51];
    notes.forEach((n, i) => {
      this.playTone(n, n * 1.01, 0.24, 'sine', 0.065, i * 0.055);
    });
  }

  public playDoorTransition(): void {
    this.playTone(392.0, 523.25, 0.26, 'sine', 0.06, 0);
    this.playTone(587.33, 783.99, 0.32, 'triangle', 0.045, 0.07);
  }

  public playDialogueTalk(): void {
    const base = 440 + Math.random() * 140;
    this.playTone(base, base * 1.06, 0.055, 'sine', 0.035);
  }

  public playBlessing(): void {
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((n, idx) => {
      this.playTone(n, n * 1.02, 0.45, 'sine', 0.06, idx * 0.06);
    });
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}

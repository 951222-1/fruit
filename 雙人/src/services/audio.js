class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playStretch(progress = 0) {
    if (!this.enabled) return;
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime;
      const freq = 110 + Math.min(1, Math.max(0, progress)) * 260;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq + 30, t + 0.08);

      gain.gain.setValueAtTime(0.06, t);
      gain.gain.linearRampToValueAtTime(0.01, t + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    } catch (e) {}
  }

  playShoot() {
    if (!this.enabled) return;
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.16);

      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    } catch (e) {}
  }

  playBossHit() {
    if (!this.enabled) return;
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t = ctx.currentTime;

      // 雙頻撞擊
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'square';
      osc1.frequency.setValueAtTime(260, t);
      osc1.frequency.exponentialRampToValueAtTime(90, t + 0.15);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(420, t);
      osc2.frequency.exponentialRampToValueAtTime(180, t + 0.18);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.18);
      osc2.stop(t + 0.18);
    } catch (e) {}
  }

  // ✨ 雙人合體技爆裂大音效！
  playDualCombo() {
    if (!this.enabled) return;
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t = ctx.currentTime;

      // 輝煌大和弦琶音 C5, E5, G5, C6 + 爆裂重音
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startT = t + idx * 0.045;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startT);
        osc.frequency.linearRampToValueAtTime(freq * 1.05, startT + 0.35);

        gain.gain.setValueAtTime(0.22, startT);
        gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startT);
        osc.stop(startT + 0.45);
      });

      // 重低音衝擊波
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(180, t);
      subOsc.frequency.exponentialRampToValueAtTime(45, t + 0.5);
      subGain.gain.setValueAtTime(0.35, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(t);
      subOsc.stop(t + 0.5);
    } catch (e) {}
  }

  playVictory() {
    if (!this.enabled) return;
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      // 歡慶勝利四重奏
      const chord = [392.00, 523.25, 659.25, 783.99, 1046.50];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startT = t + idx * 0.08;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startT);
        gain.gain.setValueAtTime(0.2, startT);
        gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startT);
        osc.stop(startT + 0.8);
      });
    } catch (e) {}
  }

  playTimeUp() {
    if (!this.enabled) return;
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.linearRampToValueAtTime(130, t + 0.5);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    } catch (e) {}
  }

  playClick() {
    if (!this.enabled) return;
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, t);
      osc.frequency.exponentialRampToValueAtTime(320, t + 0.04);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    } catch (e) {}
  }
}

export const dualSound = new SoundEffects();

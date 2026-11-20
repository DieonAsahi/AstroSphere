// Audio Web Audio disintesis (tanpa file) — diporting dari Jelajah Antariksa.
import { clamp } from './util.js';

export function createAudio(getEnabled) {
  const sfx = {
    ctx: null,
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain(); this.master.gain.value = getEnabled() ? .9 : 0; this.master.connect(ctx.destination);
      const comp = ctx.createDynamicsCompressor(); comp.connect(this.master); this.out = comp;
      const dl = ctx.createDelay(1); dl.delayTime.value = .33; const fb = ctx.createGain(); fb.gain.value = .38;
      const wet = ctx.createGain(); wet.gain.value = .32; dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(comp); this.echo = dl;
      const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), ch = buf.getChannelData(0);
      let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; ch[i] = last * 3.5; }
      this.noise = buf;
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      this.engLP = ctx.createBiquadFilter(); this.engLP.type = 'lowpass'; this.engLP.frequency.value = 180; this.engLP.Q.value = .8;
      this.engGain = ctx.createGain(); this.engGain.gain.value = 0;
      src.connect(this.engLP); this.engLP.connect(this.engGain); this.engGain.connect(comp); src.start();
      this.hum = ctx.createOscillator(); this.hum.type = 'sawtooth'; this.hum.frequency.value = 38;
      const hlp = ctx.createBiquadFilter(); hlp.type = 'lowpass'; hlp.frequency.value = 140;
      this.humGain = ctx.createGain(); this.humGain.gain.value = 0;
      this.hum.connect(hlp); hlp.connect(this.humGain); this.humGain.connect(comp); this.hum.start();
      const pad = ctx.createGain(); pad.gain.value = 0; pad.gain.setTargetAtTime(.05, ctx.currentTime, 3);
      const pf = ctx.createBiquadFilter(); pf.type = 'lowpass'; pf.frequency.value = 520; pf.Q.value = 2;
      const lfo = ctx.createOscillator(); lfo.frequency.value = .035; const lg = ctx.createGain(); lg.gain.value = 320;
      lfo.connect(lg); lg.connect(pf.frequency); lfo.start();
      [[55, .5], [82.41, .35], [110, .3], [164.81, .16], [246.94, .06]].forEach(([f, v], i) => {
        const o = ctx.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = (Math.random() - .5) * 14;
        const g = ctx.createGain(); g.gain.value = v; o.connect(g); g.connect(pf); o.start();
      });
      pf.connect(pad); pad.connect(comp); pad.connect(dl);
    },
    setEnabled(on) { if (this.ctx) this.master.gain.setTargetAtTime(on ? .9 : 0, this.ctx.currentTime, .08); },
    update(active, ship) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime, a = active ? 1 : 0, thr = Math.abs(ship.throttle), sN = clamp(ship.speed / 300, 0, 1);
      this.engGain.gain.setTargetAtTime(a * (.035 + thr * .11 + ship.boost * .14), t, .15);
      this.engLP.frequency.setTargetAtTime(150 + sN * 650 + ship.boost * 900, t, .2);
      this.humGain.gain.setTargetAtTime(a * (.012 + thr * .035), t, .2);
      this.hum.frequency.setTargetAtTime(36 + thr * 20 + ship.boost * 28, t, .3);
    },
    tone(freq, dur, type = 'sine', vol = .2, delay = 0, echo = true) {
      const c = this.ctx; if (!c) return;
      const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(this.out); if (echo) g.connect(this.echo);
      o.start(t); o.stop(t + dur + .05);
    },
    chime() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 1.8, 'sine', .11, i * .12)); },
    approach() { this.tone(392, 1.4, 'sine', .07); this.tone(587.33, 1.4, 'sine', .05, .15); },
    click() { this.tone(1500, .07, 'triangle', .045, 0, false); },
    target() { this.tone(880, .12, 'triangle', .06, 0, false); this.tone(1318.5, .16, 'triangle', .045, .07, false); },
    correct() { this.tone(659.25, .3, 'triangle', .09, 0, false); this.tone(987.77, .5, 'triangle', .08, .1); },
    wrong() { this.tone(220, .35, 'sine', .08, 0, false); },
    thump() { this.tone(62, .4, 'sine', .35, 0, false); },
    whoosh() {
      const c = this.ctx; if (!c) return;
      const s = c.createBufferSource(); s.buffer = this.noise;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
      const t = c.currentTime; bp.frequency.setValueAtTime(250, t); bp.frequency.exponentialRampToValueAtTime(2200, t + .7);
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.22, t + .08); g.gain.exponentialRampToValueAtTime(.001, t + 1.1);
      s.connect(bp); bp.connect(g); g.connect(this.out); s.start(t); s.stop(t + 1.2);
    },
  };
  return sfx;
}

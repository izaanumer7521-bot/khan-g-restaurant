// Loud two-tone bell made with the Web Audio API (no sound file needed).
// Browsers only allow sound after a tap, so unlockAudio() is called from the first tap in the admin panel.
let ctx = null;
export function unlockAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* no audio */ }
  return audioReady();
}
export const audioReady = () => !!ctx && ctx.state === 'running';

export function chime() {
  if (!audioReady()) return;
  const t0 = ctx.currentTime;
  [988, 1319, 1568, 1319, 1568, 1976].forEach((f, i) => {
    [f, f * 2.01].forEach((freq, k) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = k ? 'sine' : 'triangle'; o.frequency.value = freq;
      const t = t0 + i * 0.2;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(k ? 0.18 : 0.55, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.6);
    });
  });
}

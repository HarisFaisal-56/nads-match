import { useSyncExternalStore } from 'react';

/**
 * Tiny synthesized sound kit (Web Audio, no files) plus vibration.
 * Everything is a no-op until the first user gesture unlocks audio,
 * and when the player has muted the game.
 */

const KEY = 'nads-smash-muted';
let ctx = null;
let master = null;
let muted = (() => {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
})();
const listeners = new Set();
const lastPlayed = {};

export function isMuted() {
  return muted;
}

export function setMuted(v) {
  muted = v;
  try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* storage unavailable */ }
  listeners.forEach((fn) => fn());
}

export function subscribeMuted(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function audio() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Call from a pointer/tap handler so browsers allow sound later. */
export function unlockAudio() {
  audio();
}

// the same sound twice within a few ms is a double render, not a real event
function allow(name, gap = 60) {
  const t = performance.now();
  if (lastPlayed[name] && t - lastPlayed[name] < gap) return false;
  lastPlayed[name] = t;
  return true;
}

function tone({ freq, to = freq, dur = 0.12, type = 'sine', gain = 0.2, delay = 0 }) {
  const ac = audio();
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.3, gain = 0.15, from = 3000, to = 200, delay = 0 }) {
  const ac = audio();
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(from, t0);
  filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(master);
  src.start(t0);
}

// C major pentatonic, so rising combos always sound musical
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

export const sfx = {
  tap() {
    if (allow('tap', 30)) tone({ freq: 880, to: 990, dur: 0.05, gain: 0.07 });
  },
  select() {
    if (allow('select', 30)) tone({ freq: 660, to: 880, dur: 0.07, type: 'triangle', gain: 0.1 });
  },
  swap() {
    if (allow('swap')) tone({ freq: 420, to: 760, dur: 0.11, type: 'sine', gain: 0.1 });
  },
  bonk() {
    if (!allow('bonk')) return;
    tone({ freq: 200, to: 120, dur: 0.14, type: 'square', gain: 0.06 });
    tone({ freq: 150, to: 100, dur: 0.12, type: 'square', gain: 0.05, delay: 0.1 });
  },
  match(combo = 1) {
    if (!allow('match')) return;
    const f = SCALE[Math.min(combo - 1, SCALE.length - 1)];
    tone({ freq: f, to: f * 1.5, dur: 0.14, type: 'triangle', gain: 0.2 });
    tone({ freq: f * 2, dur: 0.1, type: 'sine', gain: 0.08, delay: 0.035 });
    noise({ dur: 0.08, gain: 0.05, from: 6000, to: 2000 });
  },
  comet() {
    if (!allow('comet', 200)) return;
    tone({ freq: 1200, to: 70, dur: 0.7, type: 'sawtooth', gain: 0.1 });
    noise({ dur: 0.7, gain: 0.22, from: 5000, to: 120 });
    [0, 1, 2, 3].forEach((k) => tone({ freq: SCALE[4 + k] || 1568, dur: 0.12, type: 'triangle', gain: 0.1, delay: 0.25 + k * 0.07 }));
  },
  win() {
    if (!allow('win', 400)) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => tone({ freq: f, dur: 0.22, type: 'triangle', gain: 0.17, delay: k * 0.11 }));
    tone({ freq: 1318.51, dur: 0.5, type: 'sine', gain: 0.12, delay: 0.46 });
  },
  star(k = 0) {
    if (allow(`star${k}`, 200)) tone({ freq: SCALE[2 + k * 2], to: SCALE[3 + k * 2], dur: 0.16, type: 'triangle', gain: 0.14 });
  },
  lose() {
    if (!allow('lose', 400)) return;
    [523.25, 466.16, 392, 311.13].forEach((f, k) => tone({ freq: f, to: f * 0.97, dur: 0.26, type: 'triangle', gain: 0.13, delay: k * 0.16 }));
  },
  chime() {
    if (!allow('chime', 200)) return;
    [783.99, 1046.5, 1318.51].forEach((f, k) => tone({ freq: f, dur: 0.25, type: 'sine', gain: 0.12, delay: k * 0.08 }));
  },
};

export function buzz(pattern) {
  if (muted) return;
  try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
}

/** React hook: current mute state, updates everywhere when toggled. */
export function useMuted() {
  return useSyncExternalStore(subscribeMuted, isMuted, () => false);
}

// ─── Generative Ambient Audio Engine (Web Audio API) ─────────────────────────

let _ctx = null;
let _masterGain = null;
let _oscs = [];
let _lfoNode = null;
let _initialized = false;

// Lobe → frequency triad (fundamental + overtones)
const REGION_FREQS = {
  frontal:   [110, 138.6, 165],   // tense, alert — major 3rd
  temporal:  [82,  98,    123],   // memory lull — minor 3rd
  parietal:  [98,  130.7, 164],   // spatial clarity — perfect 5th
  occipital: [130, 164,   195],   // visual shimmer — major triad
  center:    [94,  117.5, 141],   // cerebellum hum — minor 3rd
};

// Mood → subtle detune offset (cents) and LFO rate
const MOOD_PARAMS = {
  focused: { detune: 0,    lfo: 0.25, gain: 0.07 },
  curious: { detune: 7,    lfo: 0.55, gain: 0.09 },
  tired:   { detune: -14,  lfo: 0.12, gain: 0.05 },
  flow:    { detune: 12,   lfo: 0.8,  gain: 0.11 },
};

export function initAudio() {
  if (_initialized) return;
  _initialized = true;

  _ctx = new AudioContext();
  _masterGain = _ctx.createGain();
  _masterGain.gain.value = 0.0; // start silent, fade in
  _masterGain.connect(_ctx.destination);

  // LFO for gentle tremolo on all oscillators
  _lfoNode = _ctx.createOscillator();
  const lfoGain = _ctx.createGain();
  _lfoNode.frequency.value = 0.4;
  lfoGain.gain.value = 0.006;
  _lfoNode.connect(lfoGain);
  _lfoNode.start();

  // 3 oscillators (fundamental + 2 harmonics)
  const freqs = REGION_FREQS.center;
  _oscs = freqs.map((freq, i) => {
    const osc = _ctx.createOscillator();
    const gain = _ctx.createGain();
    osc.type = i === 0 ? 'sine' : 'triangle';
    osc.frequency.value = freq;
    gain.gain.value = 0.4 / (i + 1);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(_masterGain);
    osc.start();
    return { osc, gain };
  });

  // Fade in
  _masterGain.gain.setTargetAtTime(0.09, _ctx.currentTime, 1.5);
}

export function setRegion(region, mood = 'curious') {
  if (!_ctx || !_oscs.length) return;
  const freqs = REGION_FREQS[region] ?? REGION_FREQS.center;
  const moodP = MOOD_PARAMS[mood] ?? MOOD_PARAMS.curious;
  const detuneRatio = Math.pow(2, moodP.detune / 1200);
  _oscs.forEach((o, i) => {
    o.osc.frequency.setTargetAtTime(freqs[i] * detuneRatio, _ctx.currentTime, 2.0);
  });
  if (_lfoNode) {
    _lfoNode.frequency.setTargetAtTime(moodP.lfo, _ctx.currentTime, 1.0);
  }
  if (_masterGain) {
    _currentGain = moodP.gain;
    const targetGain = _isMuted ? 0 : moodP.gain;
    _masterGain.gain.setTargetAtTime(targetGain, _ctx.currentTime, 0.8);
  }
}

let _isMuted = false;
let _currentGain = 0.09; // tracks last non-muted gain level

export function setMuted(muted) {
  _isMuted = muted;
  if (!_masterGain || !_ctx) return;
  _masterGain.gain.setTargetAtTime(muted ? 0 : _currentGain, _ctx.currentTime, 0.3);
}

export function resumeAudio() {
  if (_ctx?.state === 'suspended') _ctx.resume();
}

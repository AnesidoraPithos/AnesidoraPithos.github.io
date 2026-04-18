// ─── Generative Ambient Audio Engine (Web Audio API) ─────────────────────────

let _ctx = null;
let _masterGain = null;
let _noteGain = null;   // separate gain bus for melody notes
let _oscs = [];
let _lfoNode = null;    // shared vibrato LFO — rate follows mood
let _initialized = false;

// Lobe → frequency triad (fundamental + overtones)
const REGION_FREQS = {
  frontal:   [110, 138.6, 165],   // tense, alert — major 3rd
  temporal:  [82,  98,    123],   // memory lull — minor 3rd
  parietal:  [98,  130.7, 164],   // spatial clarity — perfect 5th
  occipital: [130, 164,   195],   // visual shimmer — major triad
  center:    [94,  117.5, 141],   // cerebellum hum — minor 3rd
};

// Mood → subtle detune offset (cents) and vibrato rate
const MOOD_PARAMS = {
  focused: { detune: 0,    lfo: 0.25, gain: 0.07 },
  curious: { detune: 7,    lfo: 0.55, gain: 0.09 },
  tired:   { detune: -14,  lfo: 0.12, gain: 0.05 },
  flow:    { detune: 12,   lfo: 0.8,  gain: 0.11 },
};

// Per-oscillator amplitude LFO config — prime-ish rates so they fall in/out of
// phase organically, creating an evolving breathing texture rather than a drone.
const AMP_LFO_RATES  = [0.31, 0.17, 0.23]; // Hz — each osc breathes independently
const AMP_LFO_DEPTHS = [0.15, 0.10, 0.07]; // gain swing (±)
const OSC_CENTERS    = [0.50, 0.30, 0.20]; // center gains (mixing weights)

// ─── Melody note scales ───────────────────────────────────────────────────────
// Two pentatonic scales: positive-Z = major (bright), negative-Z = minor (moody)
const PENTA_MAJOR = [
  65.41, 73.42, 82.41, 98.00, 110.00,        // C2 D2 E2 G2 A2
  130.81, 146.83, 164.81, 196.00, 220.00,    // C3 D3 E3 G3 A3
  261.63, 293.66, 329.63, 392.00, 440.00,    // C4 D4 E4 G4 A4
  523.25, 587.33, 659.25, 784.00, 880.00,    // C5 D5 E5 G5 A5
];
const PENTA_MINOR = [
  65.41, 77.78, 87.31, 98.00, 116.54,        // C2 Eb2 F2 G2 Bb2
  130.81, 155.56, 174.61, 196.00, 233.08,    // C3 Eb3 F3 G3 Bb3
  261.63, 311.13, 349.23, 392.00, 466.16,    // C4 Eb4 F4 G4 Bb4
  523.25, 622.25, 698.46, 784.00, 932.33,    // C5 Eb5 F5 G5 Bb5
];

const NOTE_Y_MIN = -150;
const NOTE_Y_MAX =  200;

let _lastNoteIdx = -1;

export function initAudio() {
  if (_initialized) return;
  _initialized = true;

  _ctx = new AudioContext();

  // Ambient drone bus
  _masterGain = _ctx.createGain();
  _masterGain.gain.value = 0.0;
  _masterGain.connect(_ctx.destination);

  // Melody note bus — independent from drone volume
  _noteGain = _ctx.createGain();
  _noteGain.gain.value = 0.55;
  _noteGain.connect(_ctx.destination);

  // Shared vibrato LFO — gently nudges each oscillator's frequency
  _lfoNode = _ctx.createOscillator();
  const vibratoGain = _ctx.createGain();
  _lfoNode.frequency.value = 0.4;
  vibratoGain.gain.value = 2.0; // ±2 Hz vibrato depth
  _lfoNode.connect(vibratoGain);
  _lfoNode.start();

  // 3 oscillators (fundamental + 2 harmonics)
  const freqs = REGION_FREQS.center;
  _oscs = freqs.map((freq, i) => {
    const osc  = _ctx.createOscillator();
    const gain = _ctx.createGain();
    osc.type = i === 0 ? 'sine' : 'triangle';
    osc.frequency.value = freq;
    gain.gain.value = OSC_CENTERS[i];

    // Independent amplitude LFO per oscillator — organic breathing
    const ampLfo  = _ctx.createOscillator();
    const ampGain = _ctx.createGain();
    ampLfo.type = 'sine';
    ampLfo.frequency.value = AMP_LFO_RATES[i];
    ampGain.gain.value = AMP_LFO_DEPTHS[i];
    ampLfo.connect(ampGain);
    ampGain.connect(gain.gain);
    ampLfo.start(_ctx.currentTime + i * 0.7);

    vibratoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(_masterGain);
    osc.start();
    return { osc, gain };
  });

  // Fade in
  _masterGain.gain.setTargetAtTime(0.09, _ctx.currentTime, 1.5);
}

// ─── Melody: play a note mapped from 3-D node position ───────────────────────
export function playNote(x, y, z) {
  if (!_ctx || !_noteGain || _isMuted) return;

  // Y axis → pitch (higher up = higher note)
  const t   = Math.max(0, Math.min(1, (y - NOTE_Y_MIN) / (NOTE_Y_MAX - NOTE_Y_MIN)));
  const scale = (z ?? 0) >= 0 ? PENTA_MAJOR : PENTA_MINOR;
  const idx = Math.round(t * (scale.length - 1));

  if (idx === _lastNoteIdx) return; // same note — skip
  _lastNoteIdx = idx;

  const freq = scale[idx];
  const now  = _ctx.currentTime;

  // Root — bell/pluck envelope
  const osc = _ctx.createOscillator();
  const env = _ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(0.35, now + 0.006);  // sharp attack
  env.gain.exponentialRampToValueAtTime(0.0001, now + 1.2); // slow decay
  osc.connect(env);
  env.connect(_noteGain);
  osc.start(now);
  osc.stop(now + 1.25);

  // Soft fifth — adds warmth without muddying the note
  const osc5 = _ctx.createOscillator();
  const env5 = _ctx.createGain();
  osc5.type = 'sine';
  osc5.frequency.value = freq * 1.5;
  env5.gain.setValueAtTime(0, now);
  env5.gain.linearRampToValueAtTime(0.12, now + 0.006);
  env5.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
  osc5.connect(env5);
  env5.connect(_noteGain);
  osc5.start(now);
  osc5.stop(now + 0.85);
}

// Reset note tracking when a drag ends so the same note can retrigger next drag
export function resetNote() {
  _lastNoteIdx = -1;
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
let _currentGain = 0.09;

export function setMuted(muted) {
  _isMuted = muted;
  if (!_masterGain || !_ctx) return;
  _masterGain.gain.setTargetAtTime(muted ? 0 : _currentGain, _ctx.currentTime, 0.3);
  if (_noteGain) {
    _noteGain.gain.setTargetAtTime(muted ? 0 : 0.55, _ctx.currentTime, 0.3);
  }
}

export function resumeAudio() {
  if (_ctx?.state === 'suspended') _ctx.resume();
}

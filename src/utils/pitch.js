// ─── YIN Pitch Detection Algorithm ──────────────────────────────────────────
// YIN is the gold standard for monophonic pitch detection (De Cheveigné & Kawahara, 2002)
// Much better than basic autocorrelation: handles octave errors, has confidence scoring,
// specifically tuned for singing (80–1100 Hz).

const YIN_THRESHOLD = 0.10;

export function detectPitch(buffer, sampleRate) {
  const bufferSize = buffer.length;
  const halfBuffer = Math.floor(bufferSize / 2);

  // RMS energy — reject silence
  let rms = 0;
  for (let i = 0; i < bufferSize; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / bufferSize);
  if (rms < 0.01) return { freq: -1, confidence: 0 };

  // Step 1: Difference function
  const yinBuf = new Float32Array(halfBuffer);
  yinBuf[0] = 1;
  for (let tau = 1; tau < halfBuffer; tau++) {
    yinBuf[tau] = 0;
    for (let i = 0; i < halfBuffer; i++) {
      const delta = buffer[i] - buffer[i + tau];
      yinBuf[tau] += delta * delta;
    }
  }

  // Step 2: Cumulative mean normalized difference
  let runningSum = 0;
  for (let tau = 1; tau < halfBuffer; tau++) {
    runningSum += yinBuf[tau];
    yinBuf[tau] = runningSum > 0 ? (yinBuf[tau] * tau) / runningSum : 1;
  }
  yinBuf[0] = 1;

  // Step 3: Absolute threshold + parabolic interpolation
  for (let tau = 2; tau < halfBuffer - 1; tau++) {
    if (yinBuf[tau] < YIN_THRESHOLD) {
      while (tau + 1 < halfBuffer && yinBuf[tau + 1] < yinBuf[tau]) tau++;
      const betterTau = parabolicInterp(yinBuf, tau);
      const confidence = 1 - yinBuf[tau];
      const freq = sampleRate / betterTau;
      if (freq < 70 || freq > 1100) return { freq: -1, confidence: 0 };
      return { freq, confidence };
    }
  }

  return { freq: -1, confidence: 0 };
}

function parabolicInterp(arr, tau) {
  const x0 = tau > 0 ? tau - 1 : tau;
  const x2 = tau < arr.length - 1 ? tau + 1 : tau;
  if (x0 === tau) return arr[tau] <= arr[x2] ? tau : x2;
  if (x2 === tau) return arr[tau] <= arr[x0] ? tau : x0;
  const s0 = arr[x0], s1 = arr[tau], s2 = arr[x2];
  return tau + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
}

// ─── Median Smoother ─────────────────────────────────────────────────────────
const SMOOTH_WINDOW = 5;

export function createSmoother() {
  const history = [];
  return function smooth(freq, confidence) {
    if (freq <= 0 || confidence < 0.6) {
      if (history.length > 0) history.shift();
      return { smoothedFreq: -1, isStable: false };
    }
    history.push(freq);
    if (history.length > SMOOTH_WINDOW) history.shift();
    if (history.length < 2) return { smoothedFreq: freq, isStable: false };

    const sorted = [...history].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    // Filter out readings >1 semitone from median (octave-error guard)
    const filtered = history.filter(f => Math.abs(f - median) / median < 0.059);
    if (!filtered.length) return { smoothedFreq: -1, isStable: false };

    const smoothedFreq = filtered.reduce((a, b) => a + b, 0) / filtered.length;
    return { smoothedFreq, isStable: filtered.length >= 3 };
  };
}

// ─── Note Utilities ───────────────────────────────────────────────────────────
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export function frequencyToNoteInfo(frequency) {
  if (!frequency || frequency <= 0)
    return { note: '–', octave: 0, frequency: 0, cents: 0, midiNote: 0 };
  const midiNote = 12 * Math.log2(frequency / 440) + 69;
  const roundedMidi = Math.round(midiNote);
  const cents = Math.round((midiNote - roundedMidi) * 100);
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;
  return { note: NOTE_NAMES[noteIndex], octave, frequency, cents, midiNote: roundedMidi };
}

export function noteToFrequency(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

export function getPitchStatus(cents) {
  if (cents === 0) return 'silent';
  const abs = Math.abs(cents);
  if (abs <= 10) return 'on';
  if (abs <= 25) return 'close';
  return cents < 0 ? 'low' : 'high';
}

export function getPitchColor(status) {
  return { on: '#10b981', close: '#f59e0b', low: '#06b6d4', high: '#ef4444' }[status] || '#475569';
}

// ─── Content ──────────────────────────────────────────────────────────────────
export const EXERCISES = [
  // ── Beginner ──
  { id: 'c-major', name: 'C Major Scale', desc: 'The classic Do-Re-Mi. Start here.', level: 'beginner', icon: '🎵',
    notes: [{midi:60,syllable:'Do',ms:600},{midi:62,syllable:'Re',ms:600},{midi:64,syllable:'Mi',ms:600},{midi:65,syllable:'Fa',ms:600},{midi:67,syllable:'Sol',ms:600},{midi:69,syllable:'La',ms:600},{midi:71,syllable:'Ti',ms:600},{midi:72,syllable:'Do',ms:900}] },
  { id: 'pentatonic', name: 'Pentatonic Scale', desc: '5 notes used in every genre.', level: 'beginner', icon: '🎶',
    notes: [{midi:60,syllable:'Do',ms:600},{midi:62,syllable:'Re',ms:600},{midi:64,syllable:'Mi',ms:600},{midi:67,syllable:'Sol',ms:600},{midi:69,syllable:'La',ms:600},{midi:72,syllable:'Do',ms:900}] },
  { id: 'three-note', name: '3-Note Warmup', desc: 'Simple Do-Re-Mi-Re-Do pattern.', level: 'beginner', icon: '🔤',
    notes: [{midi:60,syllable:'Do',ms:600},{midi:62,syllable:'Re',ms:600},{midi:64,syllable:'Mi',ms:600},{midi:62,syllable:'Re',ms:600},{midi:60,syllable:'Do',ms:800}] },
  { id: 'stepwise-up', name: 'Stepwise Ascend', desc: 'Climb 5 notes one step at a time.', level: 'beginner', icon: '🪜',
    notes: [{midi:60,syllable:'Do',ms:700},{midi:62,syllable:'Re',ms:700},{midi:64,syllable:'Mi',ms:700},{midi:65,syllable:'Fa',ms:700},{midi:67,syllable:'Sol',ms:900}] },
  { id: 'sustained', name: 'Sustained Notes', desc: 'Hold each note for 2 seconds. Breath control.', level: 'beginner', icon: '🫁',
    notes: [{midi:60,syllable:'Do',ms:2000},{midi:64,syllable:'Mi',ms:2000},{midi:67,syllable:'Sol',ms:2000},{midi:72,syllable:'Do',ms:2500}] },
  // ── Intermediate ──
  { id: 'arpeggio', name: 'C Major Arpeggio', desc: 'Sing chord tones — 1st, 3rd, 5th.', level: 'intermediate', icon: '🎼',
    notes: [{midi:60,syllable:'Do',ms:700},{midi:64,syllable:'Mi',ms:700},{midi:67,syllable:'Sol',ms:700},{midi:72,syllable:'Do',ms:900},{midi:67,syllable:'Sol',ms:700},{midi:64,syllable:'Mi',ms:700},{midi:60,syllable:'Do',ms:900}] },
  { id: 'octave', name: 'Octave Jump', desc: 'Jump a full octave up and down.', level: 'intermediate', icon: '⬆️',
    notes: [{midi:60,syllable:'Low',ms:800},{midi:72,syllable:'High',ms:800},{midi:60,syllable:'Low',ms:800},{midi:72,syllable:'High',ms:800},{midi:60,syllable:'Low',ms:1000}] },
  { id: 'g-major', name: 'G Major Scale', desc: 'A natural key for singers.', level: 'intermediate', icon: '🎻',
    notes: [{midi:55,syllable:'Do',ms:600},{midi:57,syllable:'Re',ms:600},{midi:59,syllable:'Mi',ms:600},{midi:60,syllable:'Fa',ms:600},{midi:62,syllable:'Sol',ms:600},{midi:64,syllable:'La',ms:600},{midi:66,syllable:'Ti',ms:600},{midi:67,syllable:'Do',ms:900}] },
  { id: 'minor-scale', name: 'A Minor Scale', desc: 'Natural minor — darker, moody sound.', level: 'intermediate', icon: '🌙',
    notes: [{midi:57,syllable:'La',ms:600},{midi:59,syllable:'Ti',ms:600},{midi:60,syllable:'Do',ms:600},{midi:62,syllable:'Re',ms:600},{midi:64,syllable:'Mi',ms:600},{midi:65,syllable:'Fa',ms:600},{midi:67,syllable:'Sol',ms:600},{midi:69,syllable:'La',ms:900}] },
  { id: 'thirds', name: 'Interval Thirds', desc: 'Jump up in 3rds. Great for harmony.', level: 'intermediate', icon: '🎢',
    notes: [{midi:60,syllable:'C',ms:600},{midi:64,syllable:'E',ms:600},{midi:62,syllable:'D',ms:600},{midi:65,syllable:'F',ms:600},{midi:64,syllable:'E',ms:600},{midi:67,syllable:'G',ms:600},{midi:65,syllable:'F',ms:600},{midi:69,syllable:'A',ms:800}] },
  { id: 'descend-scale', name: 'Descending Scale', desc: 'Go down from high to low. Control your drop.', level: 'intermediate', icon: '⬇️',
    notes: [{midi:72,syllable:'Do',ms:600},{midi:71,syllable:'Ti',ms:600},{midi:69,syllable:'La',ms:600},{midi:67,syllable:'Sol',ms:600},{midi:65,syllable:'Fa',ms:600},{midi:64,syllable:'Mi',ms:600},{midi:62,syllable:'Re',ms:600},{midi:60,syllable:'Do',ms:900}] },
  // ── Advanced ──
  { id: 'chromatic', name: 'Chromatic Scale', desc: 'All 12 notes. Advanced ear training.', level: 'advanced', icon: '🎹',
    notes: [60,61,62,63,64,65,66,67,68,69,70,71,72].map((m,i)=>({midi:m,syllable:['C','C#','D','D#','E','F','F#','G','G#','A','A#','B','C'][i],ms:450})) },
  { id: 'tritone', name: 'Tritone Resolution', desc: 'The devil\'s interval. Resolve the tension.', level: 'advanced', icon: '😈',
    notes: [{midi:60,syllable:'C',ms:800},{midi:66,syllable:'F#',ms:800},{midi:67,syllable:'G',ms:1000},{midi:60,syllable:'C',ms:800},{midi:66,syllable:'F#',ms:800},{midi:65,syllable:'F',ms:1000}] },
  { id: 'wide-arpeggio', name: 'Wide Arpeggio', desc: 'Two-octave arpeggio — big range, big control.', level: 'advanced', icon: '🏔️',
    notes: [{midi:48,syllable:'C3',ms:700},{midi:52,syllable:'E3',ms:700},{midi:55,syllable:'G3',ms:700},{midi:60,syllable:'C4',ms:700},{midi:64,syllable:'E4',ms:700},{midi:67,syllable:'G4',ms:700},{midi:72,syllable:'C5',ms:900}] },
  { id: 'blues-scale', name: 'Blues Scale', desc: 'Soulful flat 3rd, 5th, and 7th.', level: 'advanced', icon: '🎷',
    notes: [{midi:60,syllable:'C',ms:500},{midi:63,syllable:'Eb',ms:500},{midi:65,syllable:'F',ms:500},{midi:66,syllable:'F#',ms:500},{midi:67,syllable:'G',ms:500},{midi:70,syllable:'Bb',ms:500},{midi:72,syllable:'C',ms:700}] },
  { id: 'vocal-siren', name: 'Vocal Siren', desc: 'Slide smoothly across your entire range.', level: 'advanced', icon: '🚀',
    notes: [{midi:48,syllable:'Low',ms:1200},{midi:55,syllable:'Mid',ms:1200},{midi:60,syllable:'Mid+',ms:1200},{midi:67,syllable:'High',ms:1200},{midi:72,syllable:'Top',ms:1500}] },
];

export const SONGS = [
  // ── Beginner ──
  { id: 'twinkle', name: 'Twinkle Twinkle', artist: 'Traditional', level: 'beginner', emoji: '⭐',
    notes: [{midi:60,word:'Twin'},{midi:60,word:'kle'},{midi:67,word:'Twin'},{midi:67,word:'kle'},{midi:69,word:'lit'},{midi:69,word:'tle'},{midi:67,word:'star'},{midi:65,word:'how'},{midi:65,word:'I'},{midi:64,word:'won'},{midi:64,word:'der'},{midi:62,word:'what'},{midi:62,word:'you'},{midi:60,word:'are'}].map(n=>({...n,ms:550})) },
  { id: 'birthday', name: 'Happy Birthday', artist: 'Traditional', level: 'beginner', emoji: '🎂',
    notes: [{midi:60,word:'Hap'},{midi:60,word:'py'},{midi:62,word:'birth'},{midi:60,word:'day'},{midi:65,word:'to'},{midi:64,word:'you'},{midi:60,word:'Hap'},{midi:60,word:'py'},{midi:62,word:'birth'},{midi:60,word:'day'},{midi:67,word:'to'},{midi:65,word:'you'}].map(n=>({...n,ms:500})) },
  { id: 'jingle', name: 'Jingle Bells', artist: 'Traditional', level: 'beginner', emoji: '🔔',
    notes: [{midi:64,word:'Jin'},{midi:64,word:'gle'},{midi:64,word:'bells'},{midi:64,word:'jin'},{midi:64,word:'gle'},{midi:64,word:'bells'},{midi:64,word:'jin'},{midi:67,word:'gle'},{midi:60,word:'all'},{midi:62,word:'the'},{midi:64,word:'way'}].map(n=>({...n,ms:450})) },
  { id: 'row-boat', name: 'Row Your Boat', artist: 'Traditional', level: 'beginner', emoji: '🚣',
    notes: [{midi:60,word:'Row'},{midi:60,word:'row'},{midi:60,word:'row'},{midi:62,word:'your'},{midi:64,word:'boat'},{midi:64,word:'gent'},{midi:62,word:'ly'},{midi:64,word:'down'},{midi:65,word:'the'},{midi:67,word:'stream'}].map(n=>({...n,ms:500})) },
  // ── Intermediate ──
  { id: 'mary', name: 'Mary Had a Lamb', artist: 'Traditional', level: 'intermediate', emoji: '🐑',
    notes: [{midi:64,word:'Ma'},{midi:62,word:'ry'},{midi:60,word:'had'},{midi:62,word:'a'},{midi:64,word:'lit'},{midi:64,word:'tle'},{midi:64,word:'lamb'},{midi:62,word:'lit'},{midi:62,word:'tle'},{midi:62,word:'lamb'},{midi:64,word:'lit'},{midi:67,word:'tle'},{midi:67,word:'lamb'}].map(n=>({...n,ms:500})) },
  { id: 'ode-joy', name: 'Ode to Joy', artist: 'Beethoven', level: 'intermediate', emoji: '🎶',
    notes: [{midi:64,word:'Joy'},{midi:64,word:'ful'},{midi:65,word:'joy'},{midi:67,word:'ful'},{midi:67,word:'we'},{midi:65,word:'a'},{midi:64,word:'dore'},{midi:62,word:'thee'},{midi:60,word:'God'},{midi:60,word:'of'},{midi:62,word:'glo'},{midi:64,word:'ry'},{midi:64,word:'Lord'},{midi:62,word:'of'},{midi:62,word:'love'}].map(n=>({...n,ms:500})) },
  { id: 'amazing', name: 'Amazing Grace', artist: 'Traditional', level: 'intermediate', emoji: '✨',
    notes: [{midi:60,word:'A'},{midi:65,word:'ma'},{midi:69,word:'zing'},{midi:67,word:'grace'},{midi:65,word:'how'},{midi:67,word:'sweet'},{midi:65,word:'the'},{midi:62,word:'sound'},{midi:60,word:'that'},{midi:65,word:'saved'},{midi:67,word:'a'},{midi:69,word:'wretch'},{midi:65,word:'like'},{midi:60,word:'me'}].map(n=>({...n,ms:600})) },
  { id: 'london', name: 'London Bridge', artist: 'Traditional', level: 'intermediate', emoji: '🌉',
    notes: [{midi:67,word:'Lon'},{midi:69,word:'don'},{midi:67,word:'bridge'},{midi:65,word:'is'},{midi:64,word:'fall'},{midi:65,word:'ing'},{midi:67,word:'down'},{midi:64,word:'fall'},{midi:65,word:'ing'},{midi:67,word:'down'},{midi:67,word:'my'},{midi:62,word:'fair'},{midi:67,word:'la'},{midi:60,word:'dy'}].map(n=>({...n,ms:450})) },
  // ── Advanced ──
  { id: 'scarborough', name: 'Scarborough Fair', artist: 'English Folk', level: 'advanced', emoji: '🏰',
    notes: [{midi:62,word:'Are'},{midi:62,word:'you'},{midi:69,word:'go'},{midi:69,word:'ing'},{midi:69,word:'to'},{midi:67,word:'Scar'},{midi:69,word:'bor'},{midi:71,word:'ough'},{midi:69,word:'Fair'},{midi:65,word:'Pars'},{midi:64,word:'ley'},{midi:65,word:'sage'},{midi:67,word:'rose'},{midi:65,word:'ma'},{midi:62,word:'ry'}].map(n=>({...n,ms:550})) },
  { id: 'greensleeves', name: 'Greensleeves', artist: 'English Folk', level: 'advanced', emoji: '🟢',
    notes: [{midi:57,word:'A'},{midi:60,word:'las'},{midi:62,word:'my'},{midi:64,word:'love'},{midi:65,word:'you'},{midi:64,word:'do'},{midi:62,word:'me'},{midi:59,word:'wrong'},{midi:57,word:'to'},{midi:60,word:'cast'},{midi:62,word:'me'},{midi:60,word:'off'},{midi:59,word:'dis'},{midi:57,word:'court'},{midi:57,word:'eous'},{midi:57,word:'ly'}].map(n=>({...n,ms:500})) },
  { id: 'danny-boy', name: 'Danny Boy', artist: 'Irish Folk', level: 'advanced', emoji: '☘️',
    notes: [{midi:60,word:'Oh'},{midi:65,word:'Dan'},{midi:67,word:'ny'},{midi:69,word:'Boy'},{midi:72,word:'the'},{midi:71,word:'pipes'},{midi:69,word:'the'},{midi:67,word:'pipes'},{midi:65,word:'are'},{midi:67,word:'call'},{midi:69,word:'ing'}].map(n=>({...n,ms:600})) },
];

// Real pitch detection using YIN algorithm approximation (autocorrelation)
// This runs on actual PCM data from the Web Audio API

export function detectPitch(buffer, sampleRate) {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let best_offset = -1;
  let best_correlation = 0;
  let rms = 0;
  let foundGoodCorrelation = false;
  const correlations = new Array(MAX_SAMPLES);

  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  if (rms < 0.008) return -1; // Silence threshold

  let lastCorrelation = 1;
  for (let offset = 0; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset]);
    }
    correlation = 1 - correlation / MAX_SAMPLES;
    correlations[offset] = correlation;

    if (correlation > 0.9 && correlation > lastCorrelation) {
      foundGoodCorrelation = true;
      if (correlation > best_correlation) {
        best_correlation = correlation;
        best_offset = offset;
      }
    } else if (foundGoodCorrelation) {
      const shift =
        (correlations[best_offset + 1] - correlations[best_offset - 1]) /
        (2 * correlations[best_offset]);
      return sampleRate / (best_offset + 8 * shift);
    }
    lastCorrelation = correlation;
  }

  if (best_correlation > 0.01) {
    return sampleRate / best_offset;
  }
  return -1;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function frequencyToNoteInfo(frequency) {
  if (!frequency || frequency <= 0) {
    return { note: '–', octave: 0, frequency: 0, cents: 0, midiNote: 0 };
  }
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
  if (cents < 0) return 'low';
  return 'high';
}

export function getPitchColor(status) {
  switch (status) {
    case 'on': return '#10b981';
    case 'close': return '#f59e0b';
    case 'low': return '#06b6d4';
    case 'high': return '#ef4444';
    default: return '#475569';
  }
}

export const EXERCISES = [
  {
    id: 'c-major',
    name: 'C Major Scale',
    desc: 'The classic Do-Re-Mi. Start here.',
    level: 'beginner',
    icon: '🎵',
    notes: [
      { midi: 60, syllable: 'Do', ms: 600 },
      { midi: 62, syllable: 'Re', ms: 600 },
      { midi: 64, syllable: 'Mi', ms: 600 },
      { midi: 65, syllable: 'Fa', ms: 600 },
      { midi: 67, syllable: 'Sol', ms: 600 },
      { midi: 69, syllable: 'La', ms: 600 },
      { midi: 71, syllable: 'Ti', ms: 600 },
      { midi: 72, syllable: 'Do', ms: 900 },
    ],
  },
  {
    id: 'pentatonic',
    name: 'Pentatonic Scale',
    desc: '5 notes used in every genre.',
    level: 'beginner',
    icon: '🎶',
    notes: [
      { midi: 60, syllable: 'Do', ms: 600 },
      { midi: 62, syllable: 'Re', ms: 600 },
      { midi: 64, syllable: 'Mi', ms: 600 },
      { midi: 67, syllable: 'Sol', ms: 600 },
      { midi: 69, syllable: 'La', ms: 600 },
      { midi: 72, syllable: 'Do', ms: 900 },
    ],
  },
  {
    id: 'arpeggio',
    name: 'C Major Arpeggio',
    desc: 'Sing chord tones — 1st, 3rd, 5th.',
    level: 'intermediate',
    icon: '🎼',
    notes: [
      { midi: 60, syllable: 'Do', ms: 700 },
      { midi: 64, syllable: 'Mi', ms: 700 },
      { midi: 67, syllable: 'Sol', ms: 700 },
      { midi: 72, syllable: 'Do', ms: 900 },
      { midi: 67, syllable: 'Sol', ms: 700 },
      { midi: 64, syllable: 'Mi', ms: 700 },
      { midi: 60, syllable: 'Do', ms: 900 },
    ],
  },
  {
    id: 'octave',
    name: 'Octave Jump',
    desc: 'Jump a full octave up and down.',
    level: 'intermediate',
    icon: '⬆️',
    notes: [
      { midi: 60, syllable: 'Low', ms: 800 },
      { midi: 72, syllable: 'High', ms: 800 },
      { midi: 60, syllable: 'Low', ms: 800 },
      { midi: 72, syllable: 'High', ms: 800 },
      { midi: 60, syllable: 'Low', ms: 1000 },
    ],
  },
  {
    id: 'chromatic',
    name: 'Chromatic Scale',
    desc: 'All 12 notes. Advanced ear training.',
    level: 'advanced',
    icon: '🎹',
    notes: [60,61,62,63,64,65,66,67,68,69,70,71,72].map((m, i) => ({
      midi: m,
      syllable: ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B','C'][i],
      ms: 450,
    })),
  },
  {
    id: 'g-major',
    name: 'G Major Scale',
    desc: 'A natural key for singers.',
    level: 'intermediate',
    icon: '🎻',
    notes: [
      { midi: 55, syllable: 'Do', ms: 600 },
      { midi: 57, syllable: 'Re', ms: 600 },
      { midi: 59, syllable: 'Mi', ms: 600 },
      { midi: 60, syllable: 'Fa', ms: 600 },
      { midi: 62, syllable: 'Sol', ms: 600 },
      { midi: 64, syllable: 'La', ms: 600 },
      { midi: 66, syllable: 'Ti', ms: 600 },
      { midi: 67, syllable: 'Do', ms: 900 },
    ],
  },
];

export const SONGS = [
  {
    id: 'twinkle',
    name: 'Twinkle Twinkle',
    artist: 'Traditional',
    level: 'beginner',
    emoji: '⭐',
    notes: [
      { midi: 60, word: 'Twin' }, { midi: 60, word: 'kle' },
      { midi: 67, word: 'Twin' }, { midi: 67, word: 'kle' },
      { midi: 69, word: 'lit' }, { midi: 69, word: 'tle' },
      { midi: 67, word: 'star' },
      { midi: 65, word: 'how' }, { midi: 65, word: 'I' },
      { midi: 64, word: 'won' }, { midi: 64, word: 'der' },
      { midi: 62, word: 'what' }, { midi: 62, word: 'you' },
      { midi: 60, word: 'are' },
    ].map(n => ({ ...n, ms: 550 })),
  },
  {
    id: 'birthday',
    name: 'Happy Birthday',
    artist: 'Traditional',
    level: 'beginner',
    emoji: '🎂',
    notes: [
      { midi: 60, word: 'Hap' }, { midi: 60, word: 'py' },
      { midi: 62, word: 'birth' }, { midi: 60, word: 'day' },
      { midi: 65, word: 'to' }, { midi: 64, word: 'you' },
      { midi: 60, word: 'Hap' }, { midi: 60, word: 'py' },
      { midi: 62, word: 'birth' }, { midi: 60, word: 'day' },
      { midi: 67, word: 'to' }, { midi: 65, word: 'you' },
    ].map(n => ({ ...n, ms: 500 })),
  },
  {
    id: 'mary',
    name: 'Mary Had a Lamb',
    artist: 'Traditional',
    level: 'intermediate',
    emoji: '🐑',
    notes: [
      { midi: 64, word: 'Ma' }, { midi: 62, word: 'ry' },
      { midi: 60, word: 'had' }, { midi: 62, word: 'a' },
      { midi: 64, word: 'lit' }, { midi: 64, word: 'tle' }, { midi: 64, word: 'lamb' },
      { midi: 62, word: 'lit' }, { midi: 62, word: 'tle' }, { midi: 62, word: 'lamb' },
      { midi: 64, word: 'lit' }, { midi: 67, word: 'tle' }, { midi: 67, word: 'lamb' },
    ].map(n => ({ ...n, ms: 500 })),
  },
];

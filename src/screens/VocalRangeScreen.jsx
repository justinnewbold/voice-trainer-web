import React, { useState, useEffect, useRef, useCallback } from 'react';

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const ALL_NOTES = [];
for (let oct = 2; oct <= 6; oct++) {
  NOTE_NAMES.forEach(n => ALL_NOTES.push({ name: `${n}${oct}`, freq: 440 * Math.pow(2, (NOTE_NAMES.indexOf(n) + (oct-4)*12 - 9) / 12) }));
}

function freqToNote(freq) {
  if (!freq || freq < 60) return null;
  let best = null, bestDist = Infinity;
  ALL_NOTES.forEach(n => {
    const d = Math.abs(n.freq - freq);
    if (d < bestDist) { bestDist = d; best = n; }
  });
  return best;
}

function detectPitch(buf, sampleRate) {
  const SIZE = buf.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let best = -1, bestCorr = 0;
  let lastCorr = 1, foundGood = false;
  for (let t = 0; t < MAX_SAMPLES; t++) {
    let corr = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) corr += Math.abs(buf[i] - buf[i + t]);
    corr = 1 - corr / MAX_SAMPLES;
    if (corr > 0.9 && corr > lastCorr) { foundGood = true; }
    if (foundGood && corr < lastCorr) { if (lastCorr > bestCorr) { bestCorr = lastCorr; best = t - 1; } }
    lastCorr = corr;
  }
  return best !== -1 && bestCorr > 0.9 ? sampleRate / best : null;
}

const VOICE_TYPES = [
  { id: 'bass',     label: 'Bass',        range: 'E2–E4', low: 'E2', high: 'E4', color: '#3b82f6' },
  { id: 'baritone', label: 'Baritone',    range: 'A2–A4', low: 'A2', high: 'A4', color: '#8b5cf6' },
  { id: 'tenor',    label: 'Tenor',       range: 'C3–C5', low: 'C3', high: 'C5', color: '#ec4899' },
  { id: 'alto',     label: 'Alto',        range: 'G3–G5', low: 'G3', high: 'G5', color: '#f59e0b' },
  { id: 'mezzo',    label: 'Mezzo Soprano',range:'A3–A5', low: 'A3', high: 'A5', color: '#10b981' },
  { id: 'soprano',  label: 'Soprano',     range: 'C4–C6', low: 'C4', high: 'C6', color: '#f472b6' },
];

const TEST_STEPS = [
  { id: 'intro', type: 'info' },
  { id: 'low',   type: 'sing', label: 'Find Your LOWEST Note', desc: 'Sing as low as you comfortably can — no straining!', direction: 'low' },
  { id: 'high',  type: 'sing', label: 'Find Your HIGHEST Note', desc: 'Sing as high as you comfortably can — no forcing!', direction: 'high' },
  { id: 'result', type: 'result' },
];

export default function VocalRangeScreen() {
  const [step, setStep] = useState(0);
  const [listening, setListening] = useState(false);
  const [detectedNote, setDetectedNote] = useState(null);
  const [confirmedNote, setConfirmedNote] = useState(null);
  const [lowNote, setLowNote] = useState(null);
  const [highNote, setHighNote] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [volume, setVolume] = useState(0);
  const audioRef = useRef(null);
  const analyserRef = useRef(null);
  const frameRef = useRef(null);
  const confirmTimerRef = useRef(null);
  const confirmedNoteRef = useRef(null);
  const countRef = useRef(0);

  const current = TEST_STEPS[step];

  const stopListening = useCallback(() => {
    setListening(false);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (audioRef.current) { audioRef.current.getTracks().forEach(t => t.stop()); audioRef.current = null; }
    clearTimeout(confirmTimerRef.current);
  }, []);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioRef.current = stream;
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      src.connect(analyser);
      analyserRef.current = analyser;
      setListening(true);
      confirmedNoteRef.current = null;
      countRef.current = 0;

      const buf = new Float32Array(analyser.fftSize);
      const tick = () => {
        analyser.getFloatTimeDomainData(buf);
        const rms = Math.sqrt(buf.reduce((s,v) => s + v*v, 0) / buf.length);
        setVolume(Math.min(100, rms * 400));
        if (rms > 0.01) {
          const freq = detectPitch(buf, ctx.sampleRate);
          const note = freq ? freqToNote(freq) : null;
          if (note) {
            setDetectedNote(note);
            if (confirmedNoteRef.current === note.name) {
              countRef.current++;
              if (countRef.current > 8) {
                setConfirmedNote(note);
              }
            } else {
              confirmedNoteRef.current = note.name;
              countRef.current = 0;
            }
          }
        } else {
          setDetectedNote(null);
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    } catch(e) { alert('Microphone access required.'); }
  }, []);

  const confirmNote = useCallback(() => {
    if (!detectedNote) return;
    if (current.direction === 'low') {
      setLowNote(detectedNote);
    } else {
      setHighNote(detectedNote);
    }
    stopListening();
    setDetectedNote(null);
    setConfirmedNote(null);
    setStep(s => s + 1);
  }, [detectedNote, current, stopListening]);

  useEffect(() => {
    if (confirmedNote) {
      // auto-suggest after stable detection
    }
    return () => clearTimeout(confirmTimerRef.current);
  }, [confirmedNote]);

  useEffect(() => () => stopListening(), []);

  // Countdown before listening
  const handleStart = useCallback(() => {
    setCountdown(3);
    let c = 3;
    const t = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) { clearInterval(t); setCountdown(null); startListening(); }
    }, 1000);
  }, [startListening]);

  // ── Determine voice type from range ──
  const getVoiceType = () => {
    if (!lowNote || !highNote) return null;
    const lowIdx = ALL_NOTES.findIndex(n => n.name === lowNote.name);
    const highIdx = ALL_NOTES.findIndex(n => n.name === highNote.name);
    const midIdx = Math.floor((lowIdx + highIdx) / 2);
    const midFreq = ALL_NOTES[midIdx]?.freq || 0;
    if (midFreq < 200) return VOICE_TYPES[0];
    if (midFreq < 280) return VOICE_TYPES[1];
    if (midFreq < 350) return VOICE_TYPES[2];
    if (midFreq < 430) return VOICE_TYPES[3];
    if (midFreq < 520) return VOICE_TYPES[4];
    return VOICE_TYPES[5];
  };

  // ── Render ──
  if (current.type === 'info') return (
    <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 72 }}>🎯</div>
      <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-1)' }}>Vocal Range Test</h2>
      <p style={{ color: 'var(--text-2)', lineHeight: 1.8, fontSize: 15, maxWidth: 320 }}>
        We'll find your lowest and highest comfortable notes in about <strong style={{ color: 'var(--primary-light)' }}>2 minutes</strong>.
        Once we know your range, all exercises and scales get personalized just for you.
      </p>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 16, width: '100%', maxWidth: 320, textAlign: 'left' }}>
        {['Find your lowest note', 'Find your highest note', 'Discover your voice type', 'Personalized exercises'].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--primary-light)', fontWeight: 700 }}>{i + 1}</div>
            <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{s}</span>
          </div>
        ))}
      </div>
      <button onClick={() => setStep(1)} style={btn('#7c3aed')}>Start Range Test →</button>
    </div>
  );

  if (current.type === 'sing') return (
    <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center', minHeight: '80vh', justifyContent: 'center' }}>
      <div style={{ fontSize: 12, color: 'var(--text-3)', letterSpacing: 2, textTransform: 'uppercase' }}>
        Step {step} of 2
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)' }}>{current.label}</h2>
      <p style={{ color: 'var(--text-2)', fontSize: 14, maxWidth: 280, lineHeight: 1.7 }}>{current.desc}</p>

      {/* Volume / note display */}
      <div style={{ position: 'relative', width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 140 + volume * 0.3, height: 140 + volume * 0.3,
          borderRadius: '50%',
          background: listening && detectedNote ? 'radial-gradient(circle, #7c3aed88, #7c3aed22)' : 'var(--surface)',
          border: `2px solid ${listening && detectedNote ? '#a855f7' : 'var(--border)'}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.1s',
          boxShadow: listening && detectedNote ? '0 0 30px #7c3aed44' : 'none',
        }}>
          {countdown !== null ? (
            <span style={{ fontSize: 48, fontWeight: 900, color: 'var(--primary-light)' }}>{countdown}</span>
          ) : listening ? (
            detectedNote ? (
              <>
                <span style={{ fontSize: 34, fontWeight: 900, color: '#fff' }}>{detectedNote.name.replace(/\d/, '')}</span>
                <span style={{ fontSize: 14, color: 'var(--text-3)' }}>{detectedNote.name.match(/\d+/)?.[0]}</span>
                <span style={{ fontSize: 11, color: 'var(--primary-light)', marginTop: 4 }}>{Math.round(detectedNote.freq)}Hz</span>
              </>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Listening…</span>
            )
          ) : (
            <span style={{ fontSize: 36 }}>{current.direction === 'low' ? '⬇️' : '⬆️'}</span>
          )}
        </div>
      </div>

      {/* Volume bar */}
      {listening && (
        <div style={{ width: '100%', maxWidth: 280, height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${volume}%`, background: 'linear-gradient(90deg, #7c3aed, #a855f7)', borderRadius: 999, transition: 'width 0.05s' }} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        {!listening && countdown === null ? (
          <button onClick={handleStart} style={btn('#7c3aed')}>🎤 Start Singing</button>
        ) : listening ? (
          <>
            <button onClick={stopListening} style={btn('#475569', true)}>Cancel</button>
            <button onClick={confirmNote} disabled={!detectedNote} style={{ ...btn('#10b981'), opacity: detectedNote ? 1 : 0.4 }}>
              ✓ Lock In {detectedNote?.name || 'Note'}
            </button>
          </>
        ) : null}
      </div>

      {step > 1 && (
        <button onClick={() => { stopListening(); setStep(s => s - 1); }} style={{ color: 'var(--text-3)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
      )}
    </div>
  );

  if (current.type === 'result') {
    const vt = getVoiceType();
    const lowIdx = ALL_NOTES.findIndex(n => n.name === lowNote?.name);
    const highIdx = ALL_NOTES.findIndex(n => n.name === highNote?.name);
    const semitones = highIdx - lowIdx;
    const octaves = (semitones / 12).toFixed(1);

    // Save to localStorage
    const rangeData = { lowNote: lowNote?.name, highNote: highNote?.name, voiceType: vt?.id, semitones, testedAt: Date.now() };
    try { localStorage.setItem('vt_range', JSON.stringify(rangeData)); } catch(e) {}

    // Push to Supabase if authenticated (non-blocking)
    import('../auth/syncService.js').then(({ pushVocalRange }) => {
      import('../auth/supabaseClient.js').then(({ supabase }) => {
        if (supabase) {
          supabase.auth.getUser().then(({ data }) => {
            if (data?.user) pushVocalRange(data.user.id, rangeData);
          }).catch(() => {});
        }
      });
    }).catch(() => {});

    return (
      <div style={{ padding: '24px 20px 80px', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 64 }}>🎉</div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-1)' }}>Your Vocal Range</h2>

        {/* Range visual */}
        <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#3b82f6' }}>{lowNote?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>LOWEST</div>
            </div>
            <div style={{ flex: 1, margin: '0 16px' }}>
              <div style={{ height: 4, background: `linear-gradient(90deg, #3b82f6, ${vt?.color || '#a855f7'}, #ef4444)`, borderRadius: 999 }} />
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, textAlign: 'center' }}>{semitones} semitones · {octaves} octaves</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#ef4444' }}>{highNote?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>HIGHEST</div>
            </div>
          </div>
        </div>

        {/* Voice type */}
        {vt && (
          <div style={{ background: `${vt.color}22`, border: `1px solid ${vt.color}55`, borderRadius: 20, padding: 20, width: '100%', maxWidth: 360 }}>
            <div style={{ fontSize: 13, color: vt.color, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Your Voice Type</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: vt.color, marginBottom: 4 }}>{vt.label}</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Typical range: {vt.range}</div>
          </div>
        )}

        {/* What changes */}
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 16, width: '100%', maxWidth: 360, textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-light)', marginBottom: 12 }}>✨ Now personalized for you:</div>
          {['Scales auto-transpose to your range', 'Exercises start at your comfortable notes', 'Siren warmups cover your actual range', 'Songs filtered to match your voice'].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
              <span style={{ color: '#10b981' }}>✓</span>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{s}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => { setStep(0); setLowNote(null); setHighNote(null); }} style={btn('#475569', true)}>Retest</button>
          <button onClick={() => {}} style={btn('#7c3aed')}>Start Training →</button>
        </div>
      </div>
    );
  }

  return null;
}

function btn(color, outline = false) {
  return {
    padding: '13px 24px', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', border: 'none',
    background: outline ? 'transparent' : `linear-gradient(135deg, ${color}, ${color}bb)`,
    color: outline ? color : '#fff',
    border: outline ? `1px solid ${color}` : 'none',
    boxShadow: outline ? 'none' : `0 4px 20px ${color}44`,
  };
}

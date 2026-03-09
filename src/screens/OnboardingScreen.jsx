import React, { useState, useCallback, useEffect, useRef } from 'react';
import { requestMicrophone, checkMicPermission, AudioCompatError } from '../utils/audioCompat.js';
import { AudioErrorState } from '../components/ErrorStates.jsx';

const ONBOARDING_KEY = 'vt_onboarded_v1';

export function hasCompletedOnboarding() {
  try { return localStorage.getItem(ONBOARDING_KEY) === 'true'; } catch { return false; }
}

export function markOnboardingComplete() {
  try { localStorage.setItem(ONBOARDING_KEY, 'true'); } catch {}
}

// ─── Note detection helpers (self-contained to avoid import overhead) ────────
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const ALL_NOTES = [];
for (let oct = 2; oct <= 6; oct++) {
  NOTE_NAMES.forEach(n => ALL_NOTES.push({ 
    name: `${n}${oct}`, 
    freq: 440 * Math.pow(2, (NOTE_NAMES.indexOf(n) + (oct-4)*12 - 9) / 12),
    midi: NOTE_NAMES.indexOf(n) + oct * 12 + 12,
  }));
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
function detectPitchSimple(buf, sampleRate) {
  const SIZE = buf.length, HALF = Math.floor(SIZE / 2);
  let best = -1, bestCorr = 0, lastCorr = 1, found = false;
  for (let t = 0; t < HALF; t++) {
    let corr = 0;
    for (let i = 0; i < HALF; i++) corr += Math.abs(buf[i] - buf[i + t]);
    corr = 1 - corr / HALF;
    if (corr > 0.9 && corr > lastCorr) found = true;
    if (found && corr < lastCorr) { if (lastCorr > bestCorr) { bestCorr = lastCorr; best = t - 1; } }
    lastCorr = corr;
  }
  return best !== -1 && bestCorr > 0.9 ? sampleRate / best : null;
}

const VOICE_TYPES = [
  { id: 'bass',     label: 'Bass',         range: 'E2–E4', color: '#3b82f6' },
  { id: 'baritone', label: 'Baritone',     range: 'A2–A4', color: '#8b5cf6' },
  { id: 'tenor',    label: 'Tenor',        range: 'C3–C5', color: '#ec4899' },
  { id: 'alto',     label: 'Alto',         range: 'G3–G5', color: '#f59e0b' },
  { id: 'mezzo',    label: 'Mezzo Soprano',range: 'A3–A5', color: '#10b981' },
  { id: 'soprano',  label: 'Soprano',      range: 'C4–C6', color: '#f472b6' },
];

function getVoiceType(lowNote, highNote) {
  const lowIdx = ALL_NOTES.findIndex(n => n.name === lowNote?.name);
  const highIdx = ALL_NOTES.findIndex(n => n.name === highNote?.name);
  const midIdx = Math.floor((lowIdx + highIdx) / 2);
  const midFreq = ALL_NOTES[midIdx]?.freq || 0;
  if (midFreq < 200) return VOICE_TYPES[0];
  if (midFreq < 280) return VOICE_TYPES[1];
  if (midFreq < 350) return VOICE_TYPES[2];
  if (midFreq < 430) return VOICE_TYPES[3];
  if (midFreq < 520) return VOICE_TYPES[4];
  return VOICE_TYPES[5];
}

// ─── Steps ──────────────────────────────────────────────────────────────────
const STEPS = ['welcome', 'mic', 'range-low', 'range-high', 'results', 'ready'];

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState('welcome');
  const [micError, setMicError] = useState(null);
  const [micPermission, setMicPermission] = useState('unknown');
  const [listening, setListening] = useState(false);
  const [detectedNote, setDetectedNote] = useState(null);
  const [volume, setVolume] = useState(0);
  const [lowNote, setLowNote] = useState(null);
  const [highNote, setHighNote] = useState(null);
  const [countdown, setCountdown] = useState(null);
  
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const frameRef = useRef(null);
  const confirmedRef = useRef(null);
  const countRef = useRef(0);

  // Check mic permission on mount
  useEffect(() => {
    checkMicPermission().then(setMicPermission);
  }, []);

  // Cleanup
  useEffect(() => () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
  }, []);

  // ─── Mic permission ─────────────────────────────────────────────────────
  const handleAllowMic = async () => {
    setMicError(null);
    try {
      const stream = await requestMicrophone();
      // Success! Stop the stream (we'll start fresh for range test)
      stream.getTracks().forEach(t => t.stop());
      setMicPermission('granted');
      setStep('range-low');
    } catch (err) {
      setMicError(err);
      if (err.code === 'PERMISSION_DENIED') setMicPermission('denied');
    }
  };

  // ─── Range detection ────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    try {
      const stream = await requestMicrophone();
      streamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') await ctx.resume();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      src.connect(analyser);
      setListening(true);
      confirmedRef.current = null;
      countRef.current = 0;

      const buf = new Float32Array(analyser.fftSize);
      const tick = () => {
        analyser.getFloatTimeDomainData(buf);
        const rms = Math.sqrt(buf.reduce((s,v) => s + v*v, 0) / buf.length);
        setVolume(Math.min(100, rms * 400));
        if (rms > 0.01) {
          const freq = detectPitchSimple(buf, ctx.sampleRate);
          const note = freq ? freqToNote(freq) : null;
          if (note) {
            setDetectedNote(note);
            if (confirmedRef.current === note.name) {
              countRef.current++;
            } else {
              confirmedRef.current = note.name;
              countRef.current = 0;
            }
          }
        } else {
          setDetectedNote(null);
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    } catch(e) {
      setMicError(e);
    }
  }, []);

  const stopListening = useCallback(() => {
    setListening(false);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
  }, []);

  const handleStartSinging = useCallback(() => {
    setCountdown(3);
    let c = 3;
    const t = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) { clearInterval(t); setCountdown(null); startListening(); }
    }, 1000);
  }, [startListening]);

  const handleLockNote = useCallback(() => {
    if (!detectedNote) return;
    if (step === 'range-low') {
      setLowNote(detectedNote);
      stopListening();
      setDetectedNote(null);
      setStep('range-high');
    } else if (step === 'range-high') {
      setHighNote(detectedNote);
      stopListening();
      setDetectedNote(null);
      setStep('results');
    }
  }, [detectedNote, step, stopListening]);

  // ─── Save results and finish ────────────────────────────────────────────
  const handleFinish = () => {
    if (lowNote && highNote) {
      const vt = getVoiceType(lowNote, highNote);
      const lowIdx = ALL_NOTES.findIndex(n => n.name === lowNote.name);
      const highIdx = ALL_NOTES.findIndex(n => n.name === highNote.name);
      const semitones = highIdx - lowIdx;
      const rangeData = { lowNote: lowNote.name, highNote: highNote.name, voiceType: vt?.id, semitones, testedAt: Date.now() };
      try { localStorage.setItem('vt_range', JSON.stringify(rangeData)); } catch {}
    }
    markOnboardingComplete();
    onComplete();
  };

  const handleSkipRange = () => {
    markOnboardingComplete();
    onComplete();
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  
  // Welcome
  if (step === 'welcome') return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 80, marginBottom: 16, animation: 'float 3s ease-in-out infinite' }}>🎤</div>
      <h1 style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.15, marginBottom: 12 }}>
        Welcome to<br /><span style={{ color: 'var(--primary-light)' }}>Voice Trainer</span>
      </h1>
      <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.7, maxWidth: 300, marginBottom: 32 }}>
        Learn to sing on pitch with real-time feedback, guided exercises, and personalized training.
      </p>
      <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { icon: '🎯', text: 'Real-time pitch detection' },
          { icon: '🎵', text: 'Guided scales & exercises' },
          { icon: '📈', text: 'Track your progress' },
          { icon: '🧠', text: 'Personalized to your voice' },
        ].map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', textAlign: 'left' }}>
            <div style={{ fontSize: 22, width: 40, height: 40, borderRadius: 12, background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{f.icon}</div>
            <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{f.text}</span>
          </div>
        ))}
      </div>
      <button onClick={() => setStep('mic')} style={btnStyle()}>
        Get Started →
      </button>
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-3)' }}>Takes about 2 minutes</div>
    </div>
  );

  // Mic permission
  if (step === 'mic') {
    if (micError) return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <AudioErrorState error={micError} onRetry={handleAllowMic} onDismiss={() => { setMicError(null); setStep('welcome'); }} />
      </div>
    );

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
        <StepIndicator current={1} total={4} />
        <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, marginBottom: 20 }}>🎤</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Allow Microphone</h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, maxWidth: 300, marginBottom: 8 }}>
          Voice Trainer needs to hear you sing so it can detect your pitch in real time and give you feedback.
        </p>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>🔒</span> Audio is processed locally, never uploaded
        </div>
        <button onClick={handleAllowMic} style={btnStyle()}>Allow Microphone Access</button>
        <button onClick={handleSkipRange} style={{ marginTop: 16, fontSize: 13, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Skip setup →
        </button>
      </div>
    );
  }

  // Range detection (low or high)
  if (step === 'range-low' || step === 'range-high') {
    const isLow = step === 'range-low';
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
        <StepIndicator current={isLow ? 2 : 3} total={4} />
        <div style={{ fontSize: 12, color: 'var(--text-3)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
          Step {isLow ? 1 : 2} of 2
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
          Find Your {isLow ? 'Lowest' : 'Highest'} Note
        </h2>
        <p style={{ color: 'var(--text-2)', fontSize: 14, maxWidth: 280, lineHeight: 1.7, marginBottom: 20 }}>
          Sing as {isLow ? 'low' : 'high'} as you comfortably can — no straining!
        </p>

        {/* Note display circle */}
        <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{
            width: 130 + volume * 0.2, height: 130 + volume * 0.2,
            borderRadius: '50%',
            background: listening && detectedNote ? 'radial-gradient(circle, #7c3aed66, #7c3aed11)' : 'var(--surface)',
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
                  <span style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>{detectedNote.name.replace(/\d/, '')}</span>
                  <span style={{ fontSize: 14, color: 'var(--text-3)' }}>{detectedNote.name.match(/\d+/)?.[0]}</span>
                  <span style={{ fontSize: 11, color: 'var(--primary-light)', marginTop: 2 }}>{Math.round(detectedNote.freq)}Hz</span>
                </>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Sing now...</span>
              )
            ) : (
              <span style={{ fontSize: 36 }}>{isLow ? '⬇️' : '⬆️'}</span>
            )}
          </div>
        </div>

        {/* Volume bar */}
        {listening && (
          <div style={{ width: '100%', maxWidth: 280, height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', width: `${volume}%`, background: 'linear-gradient(90deg, #7c3aed, #a855f7)', borderRadius: 999, transition: 'width 0.05s' }} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          {!listening && countdown === null ? (
            <button onClick={handleStartSinging} style={btnStyle()}>🎤 Start Singing</button>
          ) : listening ? (
            <>
              <button onClick={() => { stopListening(); setDetectedNote(null); }} style={btnStyle('#475569', true)}>Cancel</button>
              <button onClick={handleLockNote} disabled={!detectedNote} style={{ ...btnStyle('#10b981'), opacity: detectedNote ? 1 : 0.4 }}>
                ✓ Lock In {detectedNote?.name || 'Note'}
              </button>
            </>
          ) : null}
        </div>

        <button onClick={handleSkipRange} style={{ marginTop: 20, fontSize: 13, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Skip range test →
        </button>
      </div>
    );
  }

  // Results
  if (step === 'results') {
    const vt = lowNote && highNote ? getVoiceType(lowNote, highNote) : null;
    const lowIdx = ALL_NOTES.findIndex(n => n.name === lowNote?.name);
    const highIdx = ALL_NOTES.findIndex(n => n.name === highNote?.name);
    const semitones = highIdx - lowIdx;
    const octaves = (semitones / 12).toFixed(1);

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
        <StepIndicator current={4} total={4} />
        <div style={{ fontSize: 64, marginBottom: 12 }}>🎉</div>
        <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 20 }}>Your Vocal Range</h2>

        <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 340, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#3b82f6' }}>{lowNote?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>LOWEST</div>
            </div>
            <div style={{ flex: 1, margin: '0 16px' }}>
              <div style={{ height: 4, background: `linear-gradient(90deg, #3b82f6, ${vt?.color || '#a855f7'}, #ef4444)`, borderRadius: 999 }} />
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, textAlign: 'center' }}>{semitones} semitones · {octaves} octaves</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#ef4444' }}>{highNote?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>HIGHEST</div>
            </div>
          </div>
        </div>

        {vt && (
          <div style={{ background: `${vt.color}22`, border: `1px solid ${vt.color}55`, borderRadius: 16, padding: 16, width: '100%', maxWidth: 340, marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: vt.color, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Your Voice Type</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: vt.color }}>{vt.label}</div>
          </div>
        )}

        <button onClick={handleFinish} style={btnStyle()}>Start Training →</button>
      </div>
    );
  }

  return null;
}

function StepIndicator({ current, total }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i + 1 === current ? 24 : 8, height: 8, borderRadius: 4,
          background: i + 1 <= current ? 'var(--primary)' : 'var(--border)',
          transition: 'all 0.3s',
        }} />
      ))}
    </div>
  );
}

function btnStyle(color = '#7c3aed', outline = false) {
  return {
    padding: '14px 32px', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer',
    background: outline ? 'transparent' : `linear-gradient(135deg, ${color}, ${color}bb)`,
    color: outline ? color : '#fff',
    border: outline ? `1px solid ${color}` : 'none',
    boxShadow: outline ? 'none' : `0 4px 20px ${color}44`,
    marginTop: 8,
  };
}

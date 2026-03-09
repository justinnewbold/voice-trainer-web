import React, { useState, useRef } from 'react';
import { usePitchDetection } from '../hooks/usePitchDetection.js';
import { EXERCISES, noteToFrequency, getPitchColor } from '../utils/pitch.js';
import { saveSession } from '../utils/storage.js';

const LEVEL_COLOR = { beginner: 'var(--green)', intermediate: 'var(--amber)', advanced: 'var(--red)' };
const LEVEL_BG = { beginner: 'var(--green-dim)', intermediate: 'var(--amber-dim)', advanced: 'var(--red-dim)' };

export default function ScalesScreen() {
  const [active, setActive] = useState(null); // selected exercise
  const [phase, setPhase] = useState('idle'); // idle | countdown | running | done
  const [countdown, setCountdown] = useState(3);
  const [noteIdx, setNoteIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const resultsRef = useRef([]);

  const { note, status, color, volume, isListening, start, stop } = usePitchDetection();

  const filtered = filter === 'all' ? EXERCISES : EXERCISES.filter(e => e.level === filter);

  const startExercise = async (ex) => {
    setActive(ex);
    setNoteIdx(0);
    setResults([]);
    resultsRef.current = [];
    setPhase('countdown');
    setCountdown(3);
    await start();

    let c = 3;
    const cd = setInterval(() => {
      c--;
      setCountdown(c);
      if (c === 0) {
        clearInterval(cd);
        setPhase('running');
        startTimeRef.current = Date.now();
        playNote(ex, 0);
      }
    }, 1000);
  };

  const playNote = (ex, idx) => {
    if (idx >= ex.notes.length) { finish(ex); return; }
    setNoteIdx(idx);

    // Score previous note
    if (idx > 0) {
      const acc = status === 'on' ? 100 : status === 'close' ? 65 : status === 'silent' ? 0 : 20;
      resultsRef.current.push(acc);
    }

    timerRef.current = setTimeout(() => playNote(ex, idx + 1), ex.notes[idx].ms + 150);
  };

  const finish = async (ex) => {
    setPhase('done');
    clearTimeout(timerRef.current);
    stop();

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const r = resultsRef.current;
    const accuracy = r.length ? Math.round(r.reduce((a, b) => a + b, 0) / r.length) : 0;

    setResults([...r]);
    const saved = saveSession({ id: ex.id, exerciseId: ex.id, name: ex.name, type: 'scale', duration, accuracy });
    showToast(`+${saved.xpGained} XP earned!`);
  };

  const stopExercise = () => {
    clearTimeout(timerRef.current);
    stop();
    setActive(null);
    setPhase('idle');
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const avgAcc = results.length ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0;
  const currentNote = active?.notes[noteIdx];
  const targetFreq = currentNote ? noteToFrequency(currentNote.midi) : 0;

  // ---- Active Exercise View ----
  if (active && phase !== 'idle') {
    return (
      <div style={{ padding: '0 0 24px', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ padding: '56px 24px 20px', background: 'linear-gradient(160deg, #0a1a35, #080810)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={stopExercise} style={{ color: 'var(--text-2)', fontSize: 24, background: 'none', border: 'none', cursor: 'pointer' }}>←</button>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>EXERCISE</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{active.name}</div>
          </div>
        </div>

        {/* Countdown overlay */}
        {phase === 'countdown' && (
          <div style={{
            position: 'fixed', inset: 0, background: '#000000e0', display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}>
            <div style={{ fontSize: 100, fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{countdown}</div>
            <div style={{ fontSize: 18, color: 'var(--text-2)', marginTop: 12 }}>Get ready to sing!</div>
          </div>
        )}

        {/* Done overlay */}
        {phase === 'done' && (
          <div style={{
            position: 'fixed', inset: 0, background: '#000000e0', display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 50, gap: 16,
          }}>
            <div style={{ fontSize: 64 }}>{avgAcc >= 80 ? '🌟' : avgAcc >= 60 ? '🎵' : '💪'}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text)' }}>{avgAcc}% Accuracy</div>
            <div style={{ fontSize: 16, color: 'var(--text-2)' }}>{results.filter(r => r >= 70).length}/{results.length} notes on pitch</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button onClick={() => startExercise(active)} style={{
                padding: '14px 28px', borderRadius: 'var(--radius)', fontSize: 15, fontWeight: 700,
                background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer',
              }}>Try Again</button>
              <button onClick={stopExercise} style={{
                padding: '14px 28px', borderRadius: 'var(--radius)', fontSize: 15, fontWeight: 700,
                background: 'var(--card)', color: 'var(--text-2)', border: '1px solid var(--border)', cursor: 'pointer',
              }}>Done</button>
            </div>
          </div>
        )}

        {/* Note progress strip */}
        <div style={{ overflowX: 'auto', padding: '0 16px', display: 'flex', gap: 8, marginBottom: 16 }}>
          {active.notes.map((n, i) => (
            <div key={i} style={{
              minWidth: 52, padding: '8px 6px',
              background: i === noteIdx ? 'var(--primary-dim)' : i < noteIdx ? 'var(--green-dim)' : 'var(--card)',
              border: `1px solid ${i === noteIdx ? 'var(--primary)' : i < noteIdx ? 'var(--green)' : 'var(--border)'}`,
              borderRadius: 10, textAlign: 'center', flexShrink: 0, transition: 'all 0.3s',
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: i === noteIdx ? 'var(--primary-light)' : i < noteIdx ? 'var(--green)' : 'var(--text-3)' }}>
                {n.syllable}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                {['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][n.midi % 12]}{Math.floor(n.midi/12)-1}
              </div>
            </div>
          ))}
        </div>

        {/* Target note display */}
        {phase === 'running' && currentNote && (
          <div style={{ padding: '0 16px', marginBottom: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 4 }}>Sing this note</div>
            <div style={{ fontSize: 64, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--primary-light)' }}>
              {currentNote.syllable}
            </div>
            <div style={{ fontSize: 16, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
              {Math.round(targetFreq)} Hz
            </div>
          </div>
        )}

        {/* Volume bar */}
        <div style={{ padding: '0 16px', marginBottom: 12 }}>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${volume * 100}%`, background: color, borderRadius: 999, transition: 'width 0.05s, background 0.3s' }} />
          </div>
        </div>

        {/* Pitch meter inline */}
        {phase === 'running' && (
          <div style={{ padding: '0 16px' }}>
            <MiniMeter cents={note.cents} color={color} status={status} noteName={note.note} octave={note.octave} />
          </div>
        )}

        {toast && <Toast msg={toast} />}
      </div>
    );
  }

  // ---- Exercise List ----
  return (
    <div style={{ padding: '0 0 24px' }}>
      <div style={{ padding: '56px 24px 28px', background: 'linear-gradient(160deg, #0a1a35, #080810)' }}>
        <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>EXERCISES</div>
        <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>🎵 Scale Training</h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Guided exercises from beginner to advanced.</p>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto' }}>
        {['all', 'beginner', 'intermediate', 'advanced'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600,
            background: filter === f ? (f === 'all' ? 'var(--primary)' : LEVEL_COLOR[f]) : 'var(--card)',
            color: filter === f ? '#fff' : 'var(--text-3)',
            border: `1px solid ${filter === f ? 'transparent' : 'var(--border)'}`,
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(ex => (
          <button key={ex.id} onClick={() => startExercise(ex)} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: 16,
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', cursor: 'pointer', textAlign: 'left',
            transition: 'border-color 0.2s, transform 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = LEVEL_COLOR[ex.level]; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; }}
          >
            <div style={{ fontSize: 32, width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', background: LEVEL_BG[ex.level], borderRadius: 14, flexShrink: 0 }}>
              {ex.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 3 }}>{ex.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8 }}>{ex.desc}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: LEVEL_COLOR[ex.level], background: LEVEL_BG[ex.level], padding: '2px 8px', borderRadius: 999 }}>
                  {ex.level}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{ex.notes.length} notes</span>
              </div>
            </div>
            <div style={{ fontSize: 24, color: LEVEL_COLOR[ex.level] }}>▶</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MiniMeter({ cents, color, status, noteName, octave }) {
  const pos = Math.max(0, Math.min(100, ((cents + 50) / 100) * 100));
  const label = { on: '✓ On Pitch!', close: '~ Almost', low: '↑ Higher', high: '↓ Lower', silent: '...' }[status] || '...';

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 900, color }}>{noteName}{octave !== 0 && octave}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color, background: `${color}20`, padding: '6px 16px', borderRadius: 999 }}>{label}</div>
      </div>
      <div style={{ position: 'relative', height: 20, background: 'var(--surface)', borderRadius: 10, overflow: 'visible', border: '1px solid var(--border)' }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: 'var(--green)', transform: 'translateX(-50%)', zIndex: 2 }} />
        <div style={{ position: 'absolute', top: '50%', left: `${pos}%`, transform: 'translate(-50%, -50%)', width: 5, height: 28, background: color, borderRadius: 3, boxShadow: `0 0 10px ${color}`, transition: 'left 0.1s, background 0.3s', zIndex: 3 }} />
      </div>
    </div>
  );
}

function Toast({ msg }) {
  return (
    <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: '#fff', padding: '12px 24px', borderRadius: 999, fontSize: 14, fontWeight: 700, boxShadow: '0 8px 32px #7c3aed60', zIndex: 200, whiteSpace: 'nowrap' }}>
      {msg}
    </div>
  );
}

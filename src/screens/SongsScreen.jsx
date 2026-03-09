import React, { useState, useRef } from 'react';
import { usePitchDetection } from '../hooks/usePitchDetection.js';
import { SONGS, noteToFrequency } from '../utils/pitch.js';
import { saveSession } from '../utils/storage.js';

const LEVEL_COLOR = { beginner: 'var(--green)', intermediate: 'var(--amber)', advanced: 'var(--red)' };

export default function SongsScreen() {
  const [active, setActive] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [countdown, setCountdown] = useState(3);
  const [noteIdx, setNoteIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [results, setResults] = useState([]);
  const [toast, setToast] = useState(null);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const resultsRef = useRef([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);

  const { note, status, color, volume, isListening, start, stop } = usePitchDetection();

  const startSong = async (song) => {
    setActive(song);
    setNoteIdx(0);
    setResults([]);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    resultsRef.current = [];
    scoreRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
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
        playNote(song, 0);
      }
    }, 1000);
  };

  const playNote = (song, idx) => {
    if (idx >= song.notes.length) { finish(song); return; }
    setNoteIdx(idx);

    if (idx > 0) {
      const acc = status === 'on' ? 100 : status === 'close' ? 65 : status === 'silent' ? 0 : 20;
      resultsRef.current.push(acc);

      if (acc >= 70) {
        comboRef.current += 1;
        const pts = Math.round(acc * (1 + comboRef.current * 0.1));
        scoreRef.current += pts;
        if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
      } else {
        comboRef.current = 0;
      }

      setScore(scoreRef.current);
      setCombo(comboRef.current);
      setMaxCombo(maxComboRef.current);
    }

    timerRef.current = setTimeout(() => playNote(song, idx + 1), song.notes[idx].ms + 100);
  };

  const finish = async (song) => {
    setPhase('done');
    stop();

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const r = resultsRef.current;
    const accuracy = r.length ? Math.round(r.reduce((a, b) => a + b, 0) / r.length) : 0;

    setResults([...r]);
    const saved = saveSession({ id: song.id, exerciseId: song.id, name: song.name, type: 'song', duration, accuracy });
    showToast(`+${saved.xpGained} XP earned!`);
  };

  const stopSong = () => {
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
  const grade = avgAcc >= 90 ? 'S' : avgAcc >= 80 ? 'A' : avgAcc >= 70 ? 'B' : avgAcc >= 60 ? 'C' : 'D';
  const gradeColor = { S: '#f59e0b', A: '#10b981', B: '#06b6d4', C: '#7c3aed', D: '#ef4444' }[grade];
  const currentNote = active?.notes[noteIdx];

  if (active && phase !== 'idle') {
    const progress = active ? (noteIdx / active.notes.length) * 100 : 0;

    return (
      <div style={{ padding: '0 0 24px', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{
          padding: '56px 24px 16px',
          background: 'linear-gradient(160deg, #1a0535, #080810)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={stopSong} style={{ color: 'var(--text-2)', fontSize: 24, background: 'none', border: 'none', cursor: 'pointer' }}>←</button>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>NOW SINGING</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{active.name}</div>
            </div>
          </div>
          {phase === 'running' && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--pink)' }}>{score.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>SCORE</div>
            </div>
          )}
        </div>

        {/* Countdown */}
        {phase === 'countdown' && (
          <div style={{ position: 'fixed', inset: 0, background: '#000000e0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ fontSize: 100, fontWeight: 900, color: 'var(--pink)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{countdown}</div>
            <div style={{ fontSize: 18, color: 'var(--text-2)', marginTop: 12 }}>Get ready!</div>
          </div>
        )}

        {/* Done screen */}
        {phase === 'done' && (
          <div style={{ position: 'fixed', inset: 0, background: '#000000e0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 50, gap: 12 }}>
            <div style={{ fontSize: 72, fontWeight: 900, color: gradeColor, fontFamily: 'var(--font-mono)' }}>{grade}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{scoreRef.current.toLocaleString()} pts</div>
            <div style={{ fontSize: 16, color: 'var(--text-2)' }}>{avgAcc}% accuracy · {maxComboRef.current}x best combo</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button onClick={() => startSong(active)} style={{ padding: '14px 28px', borderRadius: 'var(--radius)', fontSize: 15, fontWeight: 700, background: 'var(--pink)', color: '#fff', border: 'none', cursor: 'pointer' }}>Try Again</button>
              <button onClick={stopSong} style={{ padding: '14px 28px', borderRadius: 'var(--radius)', fontSize: 15, fontWeight: 700, background: 'var(--card)', color: 'var(--text-2)', border: '1px solid var(--border)', cursor: 'pointer' }}>Done</button>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div style={{ height: 4, background: 'var(--border)' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--pink)', transition: 'width 0.3s' }} />
        </div>

        {/* Combo */}
        {combo > 1 && phase === 'running' && (
          <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 16, fontWeight: 800, color: 'var(--amber)' }}>
            🔥 {combo}x Combo!
          </div>
        )}

        {/* Lyrics */}
        {phase === 'running' && (
          <div style={{ overflowX: 'auto', padding: '12px 16px', display: 'flex', gap: 6, alignItems: 'center' }}>
            {active.notes.map((n, i) => (
              <div key={i} style={{
                flexShrink: 0,
                padding: '6px 10px',
                borderBottom: `2px solid ${i === noteIdx ? 'var(--pink)' : 'transparent'}`,
                fontSize: i === noteIdx ? 20 : 15,
                fontWeight: i === noteIdx ? 900 : 500,
                color: i === noteIdx ? 'var(--text)' : i < noteIdx ? 'var(--text-3)' : 'var(--text-2)',
                transition: 'all 0.2s',
              }}>
                {n.word}
              </div>
            ))}
          </div>
        )}

        {/* Target freq */}
        {phase === 'running' && currentNote && (
          <div style={{ textAlign: 'center', padding: '4px 0', fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            Target: {Math.round(noteToFrequency(currentNote.midi))} Hz
          </div>
        )}

        {/* Volume */}
        <div style={{ padding: '8px 16px' }}>
          <div style={{ height: 5, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${volume * 100}%`, background: color, borderRadius: 999, transition: 'width 0.05s, background 0.3s' }} />
          </div>
        </div>

        {/* Note + meter */}
        {phase === 'running' && (
          <div style={{ padding: '0 16px' }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 900, color }}>
                  {note.status === 'silent' ? '–' : note.note}{note.status !== 'silent' && note.octave}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color, background: `${color}20`, padding: '6px 16px', borderRadius: 999 }}>
                  {{ on: '✓ On!', close: '~ Close', low: '↑ Higher', high: '↓ Lower', silent: '...' }[status] || '...'}
                </div>
              </div>
              <div style={{ position: 'relative', height: 20, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: 'var(--green)', transform: 'translateX(-50%)', zIndex: 2 }} />
                <div style={{
                  position: 'absolute', top: '50%',
                  left: `${Math.max(0, Math.min(100, ((note.cents + 50) / 100) * 100))}%`,
                  transform: 'translate(-50%, -50%)', width: 5, height: 28, background: color, borderRadius: 3,
                  boxShadow: `0 0 10px ${color}`, transition: 'left 0.1s, background 0.3s', zIndex: 3,
                }} />
              </div>
            </div>
          </div>
        )}

        {toast && <Toast msg={toast} />}
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 24px' }}>
      <div style={{ padding: '56px 24px 28px', background: 'linear-gradient(160deg, #1a0535, #080810)' }}>
        <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>SONGS</div>
        <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>🎧 Song Match</h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Sing along to melodies. Score combos for accuracy!</p>
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SONGS.map(s => (
          <button key={s.id} onClick={() => startSong(s)} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: 18,
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = LEVEL_COLOR[s.level]; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; }}
          >
            <div style={{ fontSize: 40, width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: LEVEL_COLOR[s.level] + '25', borderRadius: 16, flexShrink: 0 }}>
              {s.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 3 }}>{s.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8 }}>{s.artist}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: LEVEL_COLOR[s.level], background: LEVEL_COLOR[s.level] + '25', padding: '2px 8px', borderRadius: 999 }}>{s.level}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{s.notes.length} notes</span>
              </div>
            </div>
            <div style={{ fontSize: 28 }}>▶</div>
          </button>
        ))}
      </div>

      <div style={{ margin: '16px 16px 0', background: 'var(--card)', border: '1px solid var(--pink-dim)', borderRadius: 'var(--radius)', padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--pink)', marginBottom: 10 }}>🎮 Scoring System</div>
        {['Hit notes on pitch to earn points', 'Build combos for score multipliers', 'S rank = 90%+ accuracy', 'Practice until you get that S!'].map(t => (
          <div key={t} style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 5 }}>· {t}</div>
        ))}
      </div>
    </div>
  );
}

function Toast({ msg }) {
  return (
    <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: 'var(--pink)', color: '#fff', padding: '12px 24px', borderRadius: 999, fontSize: 14, fontWeight: 700, boxShadow: '0 8px 32px #ec489960', zIndex: 200, whiteSpace: 'nowrap' }}>
      {msg}
    </div>
  );
}

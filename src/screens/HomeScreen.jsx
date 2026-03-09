import React, { useState, useEffect, useRef } from 'react';
import { loadProgress, levelInfo } from '../utils/storage.js';

const TIPS = [
  "Warm up for 2-3 min by humming softly before any session.",
  "Sing with your mouth open wide — vowel shapes matter most.",
  "Record yourself and listen back to spot pitch problems.",
  "Support your breath from your diaphragm, not your throat.",
  "Practice slowly first — accuracy beats speed every time.",
  "Match a piano or reference pitch before singing free-form.",
];

function useSessionTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  const start = () => {
    setRunning(true);
    setSeconds(0);
    intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  };

  const stop = () => {
    setRunning(false);
    clearInterval(intervalRef.current);
  };

  const reset = () => { stop(); setSeconds(0); };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return { seconds, running, start, stop, reset, fmt };
}

export default function HomeScreen({ onNav, theme, toggleTheme }) {
  const [progress, setProgress] = useState(null);
  const [range, setRange] = useState(null);
  const [notifGranted, setNotifGranted] = useState(false);
  const tip = TIPS[new Date().getDay() % TIPS.length];
  const timer = useSessionTimer();

  useEffect(() => {
    setProgress(loadProgress());
    try {
      const r = localStorage.getItem('vt_range');
      if (r) setRange(JSON.parse(r));
    } catch(e) {}
    setNotifGranted(Notification?.permission === 'granted');
  }, []);

  const requestNotifications = async () => {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setNotifGranted(true);
      new Notification('Voice Trainer 🎤', { body: "You're all set! We'll remind you to practice daily." });
      // Schedule a daily reminder check via service worker (basic)
      localStorage.setItem('vt_notifs', 'true');
    }
  };

  const lvl = progress ? levelInfo(progress.xp) : null;
  const xpPct = lvl ? Math.min(100, (lvl.current / (lvl.needed || 1)) * 100) : 0;

  const actions = [
    { id: 'warmup',   label: 'Warmup',       sub: 'Prepare your voice',    emoji: '🫁', grad: ['#7c3aed','#5b21b6'] },
    { id: 'range',    label: 'Range Test',   sub: 'Find your voice type',  emoji: '🎯', grad: ['#0284c7','#0ea5e9'] },
    { id: 'pitch',    label: 'Pitch Trainer',sub: 'Real-time detection',   emoji: '🎤', grad: ['#be185d','#ec4899'] },
    { id: 'progress', label: 'Progress',     sub: 'Track your growth',     emoji: '📈', grad: ['#059669','#10b981'] },
  ];

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Hero */}
      <div style={{ padding: '56px 24px 28px', background: theme === 'light' ? 'linear-gradient(160deg, #ede9fe 0%, #f8fafc 100%)' : 'linear-gradient(160deg, #1a0a35 0%, #080810 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'radial-gradient(circle, #7c3aed30, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>VOICE TRAINER</div>
            <h1 style={{ fontSize: 36, fontWeight: 900, lineHeight: 1.1, marginBottom: 10 }}>
              Sing Better,<br /><span style={{ color: 'var(--primary-light)' }}>Every Day.</span>
            </h1>
          </div>
          {/* Theme toggle */}
          <button onClick={toggleTheme} style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
            padding: '8px 12px', fontSize: 18, cursor: 'pointer', marginTop: 8,
          }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Session Timer */}
      <div style={{ padding: '0 16px', marginTop: -12 }}>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
          padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: '0 4px 24px #00000040',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Session Timer</div>
            <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--font-mono)', color: timer.running ? 'var(--primary-light)' : 'var(--text-2)', letterSpacing: 2 }}>
              {timer.fmt(timer.seconds)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!timer.running ? (
              <button onClick={timer.start} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>▶ Start</button>
            ) : (
              <>
                <button onClick={timer.stop} style={{ background: 'var(--amber)', color: '#000', border: 'none', borderRadius: 10, padding: '8px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>⏸</button>
                <button onClick={timer.reset} style={{ background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', fontSize: 13, cursor: 'pointer' }}>↺</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Level card */}
      {progress && lvl && (
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18, boxShadow: '0 4px 32px #00000060' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{lvl.emoji} {lvl.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{progress.xp.toLocaleString()} XP</div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                {[{v: progress.currentStreak, l: '🔥 Streak'}, {v: progress.totalSessions, l: 'Sessions'}, {v: `${progress.avgAccuracy}%`, l: 'Avg'}].map(s => (
                  <div key={s.l} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-light)' }}>{s.v}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
            {lvl.next && (
              <>
                <div style={{ height: 5, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${xpPct}%`, background: 'var(--primary)', borderRadius: 999, transition: 'width 1s ease' }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4, textAlign: 'right' }}>{(lvl.needed - lvl.current).toLocaleString()} XP to {lvl.next}</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Vocal Range chip */}
      {range && (
        <div style={{ padding: '10px 16px 0' }}>
          <button onClick={() => onNav('range')} style={{
            width: '100%', background: 'var(--surface)', border: '1px solid var(--primary-dim)',
            borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer', textAlign: 'left',
          }}>
            <span style={{ fontSize: 20 }}>🎯</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-light)' }}>Your Range: </span>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{range.lowNote} – {range.highNote}</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Retake →</span>
          </button>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: 10 }}>QUICK START</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {actions.map(a => (
            <button key={a.id} onClick={() => onNav(a.id)} style={{
              background: `linear-gradient(135deg, ${a.grad[0]}, ${a.grad[1]})`,
              border: 'none', borderRadius: 'var(--radius-lg)', padding: '16px 14px', textAlign: 'left', cursor: 'pointer',
            }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{a.emoji}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 2 }}>{a.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{a.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Notification CTA */}
      {!notifGranted && 'Notification' in window && (
        <div style={{ padding: '16px 16px 0' }}>
          <button onClick={requestNotifications} style={{
            width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          }}>
            <span style={{ fontSize: 22 }}>🔔</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Enable Daily Reminders</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Get nudged to practice every day</div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--primary-light)', fontWeight: 700 }}>ENABLE →</span>
          </button>
        </div>
      )}

      {/* Tip */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border-glow)', borderRadius: 'var(--radius)', padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-light)', marginBottom: 6 }}>💡 Daily Tip</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{tip}</div>
        </div>
      </div>
    </div>
  );
}

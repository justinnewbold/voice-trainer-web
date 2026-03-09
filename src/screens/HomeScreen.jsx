import React, { useState, useEffect } from 'react';
import { loadProgress, levelInfo } from '../utils/storage.js';

const TIPS = [
  "Warm up for 2-3 min by humming softly before any session.",
  "Sing with your mouth open wide — vowel shapes matter most.",
  "Record yourself and listen back to spot pitch problems.",
  "Support your breath from your diaphragm, not your throat.",
  "Practice slowly first — accuracy beats speed every time.",
  "Match a piano or reference pitch before singing free-form.",
];

export default function HomeScreen({ onNav }) {
  const [progress, setProgress] = useState(null);
  const tip = TIPS[new Date().getDay() % TIPS.length];

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const lvl = progress ? levelInfo(progress.xp) : null;
  const xpPct = lvl ? Math.min(100, (lvl.current / (lvl.needed || 1)) * 100) : 0;

  const actions = [
    { id: 'pitch',    label: 'Pitch Trainer', sub: 'Real-time detection',  emoji: '🎤', grad: ['#7c3aed','#5b21b6'] },
    { id: 'scales',   label: 'Scales',         sub: 'Do-Re-Mi exercises',   emoji: '🎵', grad: ['#0284c7','#06b6d4'] },
    { id: 'songs',    label: 'Song Match',     sub: 'Sing for points',      emoji: '🎧', grad: ['#be185d','#ec4899'] },
    { id: 'progress', label: 'Progress',       sub: 'Track your growth',    emoji: '📈', grad: ['#059669','#10b981'] },
  ];

  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* Hero */}
      <div style={{
        padding: '56px 24px 32px',
        background: 'linear-gradient(160deg, #1a0a35 0%, #080810 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* BG decoration */}
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 200, height: 200,
          background: 'radial-gradient(circle, #7c3aed30, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
            VOICE TRAINER
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 900, lineHeight: 1.1, marginBottom: 10 }}>
            Sing Better,<br /><span style={{ color: 'var(--primary-light)' }}>Every Day.</span>
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 15, lineHeight: 1.5 }}>
            Real-time pitch detection &amp; guided exercises.
          </p>
        </div>
      </div>

      {/* Level card */}
      {progress && lvl && (
        <div style={{ padding: '0 16px', marginTop: -16 }}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: 20,
            boxShadow: '0 4px 32px #00000060',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{lvl.emoji} {lvl.label}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                  {progress.xp.toLocaleString()} XP
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                {[
                  { v: progress.currentStreak, l: '🔥 Streak' },
                  { v: progress.totalSessions, l: 'Sessions' },
                  { v: `${progress.avgAccuracy}%`, l: 'Avg' },
                ].map(s => (
                  <div key={s.l} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-light)' }}>{s.v}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
            {lvl.next && (
              <>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${xpPct}%`, background: 'var(--primary)', borderRadius: 999, transition: 'width 1s ease' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, textAlign: 'right' }}>
                  {(lvl.needed - lvl.current).toLocaleString()} XP to {lvl.next}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ padding: '24px 16px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: 12 }}>
          QUICK START
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {actions.map(a => (
            <button
              key={a.id}
              onClick={() => onNav(a.id)}
              style={{
                background: `linear-gradient(135deg, ${a.grad[0]}, ${a.grad[1]})`,
                border: 'none', borderRadius: 'var(--radius-lg)', padding: '18px 16px',
                textAlign: 'left', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 32px ${a.grad[0]}60`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>{a.emoji}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 3 }}>{a.label}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{a.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border-glow)',
          borderRadius: 'var(--radius)', padding: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-light)', marginBottom: 8 }}>
            💡 Daily Tip
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>{tip}</div>
        </div>
      </div>
    </div>
  );
}

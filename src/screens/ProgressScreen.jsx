import React, { useState, useEffect } from 'react';
import { loadProgress, clearProgress, levelInfo } from '../utils/storage.js';

export default function ProgressScreen() {
  const [progress, setProgress] = useState(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const handleReset = () => {
    if (confirm) {
      clearProgress();
      setProgress(loadProgress());
      setConfirm(false);
    } else {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000);
    }
  };

  if (!progress) return null;

  const lvl = levelInfo(progress.xp);
  const xpPct = lvl.needed ? Math.min(100, (lvl.current / lvl.needed) * 100) : 100;

  const stats = [
    { label: 'Sessions', value: progress.totalSessions, icon: '🎤', color: 'var(--primary-light)' },
    { label: 'Minutes', value: progress.totalMinutes, icon: '⏱', color: 'var(--cyan)' },
    { label: 'Best Streak', value: `${progress.longestStreak}🔥`, icon: '🔥', color: 'var(--amber)' },
    { label: 'Avg Accuracy', value: `${progress.avgAccuracy}%`, icon: '🎯', color: 'var(--green)' },
    { label: 'Total XP', value: progress.xp.toLocaleString(), icon: '⭐', color: '#f59e0b' },
    { label: 'Completed', value: progress.completedIds.length, icon: '✅', color: 'var(--green)' },
  ];

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ padding: '56px 24px 28px', background: 'linear-gradient(160deg, #0a2a1a, #080810)' }}>
        <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>STATS</div>
        <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>📊 Your Progress</h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Keep training to level up your voice!</p>
      </div>

      {/* Level card */}
      <div style={{ padding: '0 16px', marginTop: -16 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--primary-dim)', borderRadius: 'var(--radius-xl)', padding: 22, boxShadow: '0 4px 32px #00000060' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 2 }}>{lvl.emoji} {lvl.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{progress.xp.toLocaleString()} total XP</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--amber)' }}>{progress.currentStreak}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Day streak 🔥</div>
            </div>
          </div>
          {lvl.next && (
            <>
              <div style={{ height: 8, background: 'var(--border)', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${xpPct}%`, background: 'linear-gradient(90deg, var(--primary), var(--primary-light))', borderRadius: 999, transition: 'width 1s ease' }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'right' }}>
                {(lvl.needed - lvl.current).toLocaleString()} XP to {lvl.next}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: 12 }}>STATISTICS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: s.color, marginBottom: 3 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Session history */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: 12 }}>RECENT SESSIONS</div>
        {progress.sessions.length === 0 ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎤</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No sessions yet</div>
            <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Complete a training session to see your history here.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {progress.sessions.slice(0, 12).map((s, i) => {
              const d = new Date(s.date || Date.now());
              const accColor = s.accuracy >= 80 ? 'var(--green)' : s.accuracy >= 60 ? 'var(--amber)' : 'var(--red)';
              return (
                <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 23, background: accColor + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: accColor, fontFamily: 'var(--font-mono)' }}>{s.accuracy}%</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {s.duration}s · {s.type}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reset */}
      <div style={{ padding: '24px 16px 0' }}>
        <button onClick={handleReset} style={{
          width: '100%', padding: '14px', borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 700,
          background: confirm ? 'var(--red-dim)' : 'transparent',
          color: 'var(--red)', border: `1px solid ${confirm ? 'var(--red)' : 'var(--red-dim)'}`,
          cursor: 'pointer', transition: 'all 0.2s',
        }}>
          {confirm ? '⚠️ Click again to confirm reset' : '🗑 Reset All Progress'}
        </button>
      </div>
    </div>
  );
}

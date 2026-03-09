import React, { useState, useEffect } from 'react';
import { loadProgress, clearProgress, levelInfo } from '../utils/storage.js';

function MiniBarChart({ data, color, label }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: '100%', height: Math.max(4, (d.value / max) * 52),
              background: d.value > 0 ? `linear-gradient(180deg, ${color}, ${color}88)` : 'var(--border)',
              borderRadius: '4px 4px 0 0',
              transition: 'height 0.6s ease',
            }} />
            <span style={{ fontSize: 9, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccuracyLine({ sessions }) {
  if (sessions.length < 2) return (
    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-3)', fontSize: 13 }}>
      Complete 2+ sessions to see your accuracy trend
    </div>
  );
  const last = sessions.slice(-10).reverse();
  const max = 100, min = 0;
  const w = 300, h = 80;
  const pts = last.map((s, i) => ({
    x: (i / (last.length - 1)) * w,
    y: h - ((s.accuracy - min) / (max - min)) * h,
    acc: s.accuracy,
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const fill = `${path} L${pts[pts.length-1].x},${h} L0,${h} Z`;
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>ACCURACY TREND (last 10)</div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fill} fill="url(#accGrad)" />
        <path d={path} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#a855f7" />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Oldest</span>
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Latest</span>
      </div>
    </div>
  );
}

export default function ProgressScreen() {
  const [progress, setProgress] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [tab, setTab] = useState('overview');

  useEffect(() => { setProgress(loadProgress()); }, []);

  const handleReset = () => {
    if (confirm) { clearProgress(); setProgress(loadProgress()); setConfirm(false); }
    else { setConfirm(true); setTimeout(() => setConfirm(false), 3000); }
  };

  if (!progress) return null;
  const lvl = levelInfo(progress.xp);
  const xpPct = lvl.needed ? Math.min(100, (lvl.current / lvl.needed) * 100) : 100;

  // Build weekly sessions data (last 7 days)
  const now = Date.now();
  const DAY = 86400000;
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * DAY);
    return { label: ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()], value: 0 };
  });
  progress.sessions.forEach(s => {
    const daysAgo = Math.floor((now - (s.date || 0)) / DAY);
    if (daysAgo < 7) weekDays[6 - daysAgo].value++;
  });

  // Accuracy by type
  const byType = {};
  progress.sessions.forEach(s => {
    if (!byType[s.type]) byType[s.type] = { total: 0, count: 0 };
    byType[s.type].total += s.accuracy;
    byType[s.type].count++;
  });
  const typeData = Object.entries(byType).map(([t, v]) => ({
    label: t?.slice(0,4) || '?', value: Math.round(v.total / v.count)
  }));

  const stats = [
    { label: 'Sessions',    value: progress.totalSessions,    icon: '🎤', color: 'var(--primary-light)' },
    { label: 'Minutes',     value: progress.totalMinutes,     icon: '⏱',  color: 'var(--cyan)' },
    { label: 'Best Streak', value: `${progress.longestStreak}🔥`, icon: '🔥', color: 'var(--amber)' },
    { label: 'Avg Accuracy',value: `${progress.avgAccuracy}%`,icon: '🎯', color: 'var(--green)' },
    { label: 'Total XP',    value: progress.xp.toLocaleString(), icon: '⭐', color: '#f59e0b' },
    { label: 'Completed',   value: progress.completedIds.length, icon: '✅', color: 'var(--green)' },
  ];

  const TABS = ['overview', 'charts', 'history'];

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ padding: '56px 24px 20px', background: 'linear-gradient(160deg, #0a2a1a, #080810)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>STATS</div>
        <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 4 }}>📊 Your Progress</h2>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Keep training to level up your voice!</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, padding: '0 16px', marginBottom: 16, background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '12px 8px', fontSize: 12, fontWeight: tab === t ? 700 : 500,
            color: tab === t ? 'var(--primary-light)' : 'var(--text-3)',
            background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--primary-light)' : '2px solid transparent',
            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1,
          }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Level card */}
          <div style={{ padding: '0 16px' }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--primary-dim)', borderRadius: 'var(--radius-xl)', padding: 20, boxShadow: '0 4px 32px #00000060' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 2 }}>{lvl.emoji} {lvl.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{progress.xp.toLocaleString()} total XP</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--amber)' }}>{progress.currentStreak}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Day streak 🔥</div>
                </div>
              </div>
              {lvl.next && (
                <>
                  <div style={{ height: 7, background: 'var(--border)', borderRadius: 999, overflow: 'hidden', marginBottom: 5 }}>
                    <div style={{ height: '100%', width: `${xpPct}%`, background: 'linear-gradient(90deg, var(--primary), var(--primary-light))', borderRadius: 999, transition: 'width 1s ease' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right' }}>{(lvl.needed - lvl.current).toLocaleString()} XP to {lvl.next}</div>
                </>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: 10 }}>STATISTICS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {stats.map(s => (
                <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, marginBottom: 5 }}>{s.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: s.color, marginBottom: 2 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'charts' && (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <AccuracyLine sessions={progress.sessions} />
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <MiniBarChart data={weekDays} color="#7c3aed" label="Sessions This Week" />
          </div>
          {typeData.length > 0 && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
              <MiniBarChart data={typeData} color="#10b981" label="Avg Accuracy by Type %" />
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div style={{ padding: '0 16px' }}>
          {progress.sessions.length === 0 ? (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎤</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No sessions yet</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Complete a training session to see your history here.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {progress.sessions.slice(0, 20).map((s, i) => {
                const d = new Date(s.date || Date.now());
                const accColor = s.accuracy >= 80 ? 'var(--green)' : s.accuracy >= 60 ? 'var(--amber)' : 'var(--red)';
                return (
                  <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 22, background: accColor + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: accColor, fontFamily: 'var(--font-mono)' }}>{s.accuracy}%</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {s.duration}s · {s.type}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Reset */}
      <div style={{ padding: '24px 16px 0' }}>
        <button onClick={handleReset} style={{
          width: '100%', padding: '13px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 700,
          background: confirm ? 'var(--red-dim)' : 'transparent',
          color: 'var(--red)', border: `1px solid ${confirm ? 'var(--red)' : 'var(--red-dim)'}`, cursor: 'pointer',
        }}>
          {confirm ? '⚠️ Click again to confirm reset' : '🗑 Reset All Progress'}
        </button>
      </div>
    </div>
  );
}

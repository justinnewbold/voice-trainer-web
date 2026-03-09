import React, { useState, useEffect } from 'react';
import PitchScreen from './screens/PitchScreen.jsx';
import ScalesScreen from './screens/ScalesScreen.jsx';
import SongsScreen from './screens/SongsScreen.jsx';
import ProgressScreen from './screens/ProgressScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import WarmupScreen from './screens/WarmupScreen.jsx';

const NAV = [
  { id: 'home',     label: 'Home',     icon: HomeIcon },
  { id: 'warmup',   label: 'Warmup',   icon: WarmupIcon },
  { id: 'pitch',    label: 'Pitch',    icon: MicIcon },
  { id: 'scales',   label: 'Scales',   icon: NotesIcon },
  { id: 'songs',    label: 'Songs',    icon: HeadsetIcon },
  { id: 'progress', label: 'Progress', icon: ChartIcon },
];

export default function App() {
  const [tab, setTab] = useState('home');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', maxWidth: 480, margin: '0 auto', position: 'relative' }}>
      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 72 }}>
        {tab === 'home'     && <HomeScreen onNav={setTab} />}
        {tab === 'warmup'   && <WarmupScreen />}
        {tab === 'pitch'    && <PitchScreen />}
        {tab === 'scales'   && <ScalesScreen />}
        {tab === 'songs'    && <SongsScreen />}
        {tab === 'progress' && <ProgressScreen />}
      </div>

      {/* Bottom Nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: 'rgba(13,13,26,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        zIndex: 100,
      }}>
        {NAV.map(n => {
          const active = tab === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              style={{
                flex: 1, padding: '10px 2px 8px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 3, transition: 'all 0.2s',
                color: active ? 'var(--primary-light)' : 'var(--text-3)',
                background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              <n.icon size={20} active={active} />
              <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, letterSpacing: '0.02em' }}>{n.label}</span>
              {active && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 32, height: 2, background: 'var(--primary-light)',
                  borderRadius: '0 0 4px 4px',
                }} />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function HomeIcon({ size, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function WarmupIcon({ size, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
      <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
      <path d="M8 12s1-2 4-2 4 2 4 2"/>
      <line x1="9" y1="9" x2="9.01" y2="9"/>
      <line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  );
}

function MicIcon({ size, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function NotesIcon({ size, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function HeadsetIcon({ size, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
      <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

function ChartIcon({ size, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

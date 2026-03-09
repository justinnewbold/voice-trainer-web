import React, { useState, useEffect, useRef } from 'react';
import PitchScreen from './screens/PitchScreen.jsx';
import ScalesScreen from './screens/ScalesScreen.jsx';
import SongsScreen from './screens/SongsScreen.jsx';
import ProgressScreen from './screens/ProgressScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import WarmupScreen from './screens/WarmupScreen.jsx';
import VocalRangeScreen from './screens/VocalRangeScreen.jsx';
import OnboardingScreen, { hasCompletedOnboarding } from './screens/OnboardingScreen.jsx';
import { BrowserNotSupported } from './components/ErrorStates.jsx';
import { detectAudioSupport } from './utils/audioCompat.js';
import { downloadExport, importData } from './utils/storage.js';

const NAV = [
  { id: 'home',     label: 'Home',    icon: HomeIcon },
  { id: 'warmup',   label: 'Warmup',  icon: WarmupIcon },
  { id: 'pitch',    label: 'Pitch',   icon: MicIcon },
  { id: 'scales',   label: 'Scales',  icon: NotesIcon },
  { id: 'songs',    label: 'Songs',   icon: HeadsetIcon },
  { id: 'progress', label: 'Stats',   icon: ChartIcon },
];

export default function App() {
  const [tab, setTab] = useState('home');
  const [showOnboarding, setShowOnboarding] = useState(() => !hasCompletedOnboarding());
  const [showSettings, setShowSettings] = useState(false);
  const [pwaPrompt, setPwaPrompt] = useState(null);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('vt_theme') || 'dark'; } catch { return 'dark'; }
  });

  // Check browser support
  const [audioSupport] = useState(() => detectAudioSupport());

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem('vt_theme', next); } catch {}
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Notification reminder check
  useEffect(() => {
    try {
      if (Notification?.permission === 'granted' && localStorage.getItem('vt_notifs')) {
        const last = parseInt(localStorage.getItem('vt_last_practice') || '0');
        const hoursSince = (Date.now() - last) / 3600000;
        if (hoursSince > 22) {
          new Notification('Voice Trainer 🎤', {
            body: "Time to practice! Your streak is waiting 🔥",
            icon: '/icon-192.png',
          });
        }
      }
      localStorage.setItem('vt_last_practice', Date.now().toString());
    } catch {}
  }, []);

  // PWA install prompt
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setPwaPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPwa = async () => {
    if (!pwaPrompt) return;
    pwaPrompt.prompt();
    const result = await pwaPrompt.userChoice;
    if (result.outcome === 'accepted') setPwaPrompt(null);
  };

  // Browser not supported
  if (!audioSupport.isFullySupported) {
    return <BrowserNotSupported />;
  }

  // Onboarding
  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  // Settings
  if (showSettings) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', maxWidth: 480, margin: '0 auto', position: 'relative' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 72 }}>
          <SettingsScreen onBack={() => setShowSettings(false)} theme={theme} toggleTheme={toggleTheme} pwaPrompt={pwaPrompt} onInstallPwa={handleInstallPwa} />
        </div>
        <BottomNav tab="home" setTab={(t) => { setShowSettings(false); setTab(t); }} theme={theme} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', maxWidth: 480, margin: '0 auto', position: 'relative' }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 72 }}>
        {tab === 'home'     && <HomeScreen onNav={setTab} theme={theme} toggleTheme={toggleTheme} onSettings={() => setShowSettings(true)} pwaPrompt={pwaPrompt} onInstallPwa={handleInstallPwa} />}
        {tab === 'warmup'   && <WarmupScreen />}
        {tab === 'range'    && <VocalRangeScreen />}
        {tab === 'pitch'    && <PitchScreen />}
        {tab === 'scales'   && <ScalesScreen />}
        {tab === 'songs'    && <SongsScreen />}
        {tab === 'progress' && <ProgressScreen />}
      </div>
      <BottomNav tab={tab} setTab={setTab} theme={theme} />
    </div>
  );
}

function BottomNav({ tab, setTab, theme }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      background: theme === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(13,13,26,0.95)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border)',
      display: 'flex', zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {NAV.map(n => {
        const active = tab === n.id || (n.id === 'home' && tab === 'range');
        return (
          <button key={n.id} onClick={() => setTab(n.id)} style={{
            flex: 1, padding: '10px 2px 8px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3, transition: 'all 0.2s',
            color: active ? 'var(--primary-light)' : 'var(--text-3)',
            background: 'none', border: 'none', cursor: 'pointer', position: 'relative',
          }}>
            <n.icon size={20} active={active} />
            <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, letterSpacing: '0.02em' }}>{n.label}</span>
            {active && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 28, height: 2, background: 'var(--primary-light)', borderRadius: '0 0 4px 4px' }} />}
          </button>
        );
      })}
    </nav>
  );
}

// ─── Settings Screen ────────────────────────────────────────────────────────
function SettingsScreen({ onBack, theme, toggleTheme, pwaPrompt, onInstallPwa }) {
  const [importStatus, setImportStatus] = useState(null);
  const fileRef = useRef(null);

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        importData(ev.target.result);
        setImportStatus('success');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        setImportStatus('error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ padding: '56px 24px 20px', background: 'linear-gradient(160deg, #1a0a35, #080810)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ color: 'var(--text-2)', fontSize: 24, background: 'none', border: 'none', cursor: 'pointer' }}>←</button>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>OPTIONS</div>
            <h2 style={{ fontSize: 24, fontWeight: 900 }}>⚙️ Settings</h2>
          </div>
        </div>
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SettingsRow icon={theme === 'dark' ? '🌙' : '☀️'} title={`Theme: ${theme === 'dark' ? 'Dark' : 'Light'}`} sub="Toggle light/dark mode" onClick={toggleTheme} />
        {pwaPrompt && <SettingsRow icon="📱" title="Install App" sub="Add to your home screen" onClick={onInstallPwa} accent />}
        <SettingsRow icon="💾" title="Export Data" sub="Download a backup of all your progress" onClick={downloadExport} />
        <SettingsRow icon="📂" title="Import Data" sub="Restore from a previous backup" onClick={() => fileRef.current?.click()} />
        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        {importStatus === 'success' && (
          <div style={{ background: 'var(--green-dim)', border: '1px solid var(--green)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>
            ✓ Data imported! Reloading...
          </div>
        )}
        {importStatus === 'error' && (
          <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'var(--red)', fontWeight: 700 }}>
            ✕ Invalid backup file.
          </div>
        )}
        <SettingsRow icon="🎓" title="Redo Setup" sub="Run the onboarding tutorial again" onClick={() => {
          try { localStorage.removeItem('vt_onboarded_v1'); } catch {}
          window.location.reload();
        }} />
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>About Voice Trainer</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
            All audio is processed locally on your device — nothing is uploaded. Your data lives in browser local storage. Use Export Data to back it up.
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsRow({ icon, title, sub, onClick, accent }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: 16, width: '100%',
      background: accent ? 'var(--primary-dim)' : 'var(--card)',
      border: `1px solid ${accent ? 'var(--primary)' : 'var(--border)'}`,
      borderRadius: 16, cursor: 'pointer', textAlign: 'left',
    }}>
      <div style={{ fontSize: 22, width: 44, height: 44, borderRadius: 12, background: accent ? 'var(--primary)' : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: accent ? 'var(--primary-light)' : 'var(--text-1)', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{sub}</div>
      </div>
      <span style={{ color: 'var(--text-3)', fontSize: 18 }}>›</span>
    </button>
  );
}

function HomeIcon({ size, active }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
}
function WarmupIcon({ size, active }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
}
function MicIcon({ size, active }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>;
}
function NotesIcon({ size, active }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>;
}
function HeadsetIcon({ size, active }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" /><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>;
}
function ChartIcon({ size, active }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
}

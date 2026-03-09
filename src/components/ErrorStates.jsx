import React from 'react';
import { getErrorInfo, detectAudioSupport } from '../utils/audioCompat.js';

/**
 * Full-screen error state for audio/mic issues
 */
export function AudioErrorState({ error, onRetry, onDismiss }) {
  const info = getErrorInfo(error);

  return (
    <div style={{
      padding: '32px 24px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 16, textAlign: 'center', maxWidth: 360, margin: '0 auto',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'var(--red-dim)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 36,
      }}>
        {info.icon}
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)' }}>{info.title}</h3>
      <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>{info.message}</p>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '12px 16px', width: '100%',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-light)', marginBottom: 4 }}>
          How to fix this:
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{info.action}</div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        {onDismiss && (
          <button onClick={onDismiss} style={{
            padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700,
            background: 'var(--surface)', color: 'var(--text-2)',
            border: '1px solid var(--border)', cursor: 'pointer',
          }}>Go Back</button>
        )}
        {info.canRetry && onRetry && (
          <button onClick={onRetry} style={{
            padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700,
            background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer',
          }}>Try Again</button>
        )}
      </div>
    </div>
  );
}

/**
 * Inline mic permission prompt — friendly explanation of why we need the mic
 */
export function MicPermissionPrompt({ onAllow, permissionState }) {
  if (permissionState === 'denied') {
    return (
      <div style={{
        background: 'var(--red-dim)', border: '1px solid var(--red)',
        borderRadius: 16, padding: 20, textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🎤</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--red)', marginBottom: 6 }}>
          Microphone Blocked
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 12 }}>
          Voice Trainer needs your microphone to hear you sing and give real-time feedback. 
          Tap the lock icon in your address bar to allow microphone access.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--primary-dim)', border: '1px solid var(--primary)',
      borderRadius: 16, padding: 20, textAlign: 'center',
    }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🎤</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-light)', marginBottom: 6 }}>
        Microphone Access Needed
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 16 }}>
        Voice Trainer listens to your singing to detect pitch in real-time. 
        Your audio is processed locally on your device and is never sent to any server.
      </p>
      <button onClick={onAllow} style={{
        padding: '12px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700,
        background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer',
        boxShadow: '0 4px 20px #7c3aed44',
      }}>Allow Microphone Access</button>
    </div>
  );
}

/**
 * Noisy environment warning banner
 */
export function NoisyEnvironmentBanner({ noiseLevel, onDismiss }) {
  if (noiseLevel < 0.3) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', margin: '0 16px 10px',
      background: 'var(--amber-dim)', border: '1px solid var(--amber)',
      borderRadius: 10, fontSize: 12,
    }}>
      <span style={{ fontSize: 18 }}>🔊</span>
      <div style={{ flex: 1, color: 'var(--text-2)' }}>
        <span style={{ fontWeight: 700, color: 'var(--amber)' }}>Noisy environment detected. </span>
        Pitch detection works best in a quiet room.
      </div>
      {onDismiss && (
        <button onClick={onDismiss} style={{
          color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
        }}>✕</button>
      )}
    </div>
  );
}

/**
 * Browser not supported — full page fallback
 */
export function BrowserNotSupported() {
  const support = detectAudioSupport();

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center',
    }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>🎤</div>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>Voice Trainer</h1>
      <p style={{ fontSize: 16, color: 'var(--text-2)', marginBottom: 24, maxWidth: 320, lineHeight: 1.7 }}>
        Your browser doesn't support the audio features needed for real-time pitch detection.
      </p>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 20, width: '100%', maxWidth: 320, textAlign: 'left',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-light)', marginBottom: 12 }}>
          Supported Browsers:
        </div>
        {[
          { name: 'Chrome', version: '66+', icon: '🟢' },
          { name: 'Firefox', version: '76+', icon: '🟢' },
          { name: 'Safari', version: '14.1+', icon: '🟡' },
          { name: 'Edge', version: '79+', icon: '🟢' },
        ].map(b => (
          <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
            <span>{b.icon}</span>
            <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{b.name} {b.version}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, fontSize: 12, color: 'var(--text-3)' }}>
        Missing: {!support.hasAudioContext && 'AudioContext '}{!support.hasGetUserMedia && 'getUserMedia'}
      </div>
    </div>
  );
}

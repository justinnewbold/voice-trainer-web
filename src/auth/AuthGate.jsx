import React, { useState, useEffect } from 'react';
import { useAuth } from './useAuth.js';
import { isSupabaseConfigured } from './supabaseClient.js';
import AuthScreen from './AuthScreen.jsx';
import { fullSync } from './syncService.js';

/**
 * DEV BYPASS:
 * 
 * Three ways to bypass auth during development:
 * 
 *   1. URL param:    ?devbypass=true
 *   2. localStorage: vt_dev_bypass = "true"
 *   3. Env var:      VITE_AUTH_BYPASS = "true"
 * 
 * The bypass button also appears on the AuthScreen in dev mode.
 * In production (VITE_AUTH_BYPASS not set), only methods 1 & 2 work.
 */
function isDevBypassed() {
  // Env var
  if (import.meta.env.VITE_AUTH_BYPASS === 'true') return true;
  // URL param
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('devbypass') === 'true') {
      try { localStorage.setItem('vt_dev_bypass', 'true'); } catch {}
      return true;
    }
  }
  // localStorage
  try { return localStorage.getItem('vt_dev_bypass') === 'true'; } catch { return false; }
}

function isDev() {
  return import.meta.env.DEV || import.meta.env.VITE_AUTH_BYPASS === 'true';
}

/**
 * AuthGate — drop this around your app to gate on authentication.
 * 
 * Usage in App.jsx (when ready to implement):
 * 
 *   import AuthGate from './auth/AuthGate.jsx';
 *   
 *   function App() {
 *     return (
 *       <AuthGate>
 *         <ActualApp />
 *       </AuthGate>
 *     );
 *   }
 * 
 * Behavior:
 *   - If Supabase isn't configured (no env vars), renders children directly (no auth)
 *   - If dev bypass is active, renders children directly
 *   - If not authenticated, shows AuthScreen
 *   - If authenticated, runs fullSync then renders children
 *   - Passes `auth` object via render prop if children is a function
 */
export default function AuthGate({ children }) {
  const auth = useAuth();
  const [bypassed, setBypassed] = useState(() => isDevBypassed());
  const [synced, setSynced] = useState(false);
  const [syncError, setSyncError] = useState(null);

  // If Supabase isn't even configured, just render the app
  if (!isSupabaseConfigured()) {
    return typeof children === 'function' ? children({ auth: null }) : children;
  }

  // Dev bypass
  if (bypassed) {
    return typeof children === 'function' ? children({ auth: null, devBypassed: true }) : children;
  }

  // Loading state
  if (auth.loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
      }}>
        <div style={{ fontSize: 48, animation: 'float 2s ease-in-out infinite' }}>🎤</div>
        <div style={{ fontSize: 14, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Loading...</div>
      </div>
    );
  }

  // Not authenticated → show auth screen
  if (!auth.isAuthenticated) {
    return (
      <AuthScreen
        auth={auth}
        onDevBypass={isDev() ? () => {
          try { localStorage.setItem('vt_dev_bypass', 'true'); } catch {}
          setBypassed(true);
        } : undefined}
      />
    );
  }

  // Authenticated → sync then render
  return (
    <SyncWrapper auth={auth} onSynced={() => setSynced(true)}>
      {typeof children === 'function' ? children({ auth }) : children}
    </SyncWrapper>
  );
}

/**
 * SyncWrapper — runs fullSync on mount when authenticated.
 * Shows a brief loading state while syncing, then renders children.
 */
function SyncWrapper({ auth, onSynced, children }) {
  const [syncing, setSyncing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function doSync() {
      if (auth.user?.id) {
        const result = await fullSync(auth.user.id);
        if (result.error) {
          console.warn('Sync failed (non-blocking):', result.error);
        }
      }
      if (!cancelled) {
        setSyncing(false);
        onSynced?.();
      }
    }

    doSync();
    return () => { cancelled = true; };
  }, [auth.user?.id]);

  if (syncing) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
      }}>
        <div style={{ fontSize: 48, animation: 'float 2s ease-in-out infinite' }}>☁️</div>
        <div style={{ fontSize: 14, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Syncing your data...</div>
      </div>
    );
  }

  return children;
}

/**
 * Convenience: clear dev bypass (call from settings or console)
 */
export function clearDevBypass() {
  try { localStorage.removeItem('vt_dev_bypass'); } catch {}
  window.location.reload();
}

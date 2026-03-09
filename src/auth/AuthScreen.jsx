import React, { useState } from 'react';

/**
 * AuthScreen — self-contained login/signup/reset flow.
 * 
 * Props:
 *   auth       — the return value of useAuth()
 *   onDevBypass — if provided, renders a dev bypass button
 */
export default function AuthScreen({ auth, onDevBypass }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot' | 'reset' | 'check-email'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setSubmitting(true);
    setMessage(null);
    auth.clearError();

    try {
      if (mode === 'login') {
        const result = await auth.signIn(email, password);
        if (result?.error) return;
        // Success — auth state change will dismiss this screen
      }

      if (mode === 'signup') {
        if (password.length < 6) {
          setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
          return;
        }
        const result = await auth.signUp(email, password, displayName);
        if (result?.error) return;
        if (result?.needsConfirmation) {
          setMode('check-email');
          setMessage({ type: 'success', text: 'Check your email to confirm your account.' });
          return;
        }
      }

      if (mode === 'forgot') {
        const result = await auth.resetPassword(email);
        if (result?.error) return;
        setMode('check-email');
        setMessage({ type: 'success', text: 'Password reset link sent to your email.' });
      }

      if (mode === 'reset') {
        if (newPassword.length < 6) {
          setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
          return;
        }
        const result = await auth.updatePassword(newPassword);
        if (result?.error) return;
        setMessage({ type: 'success', text: 'Password updated! You can now use the app.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Check Email confirmation screen ───────────────────────────────────
  if (mode === 'check-email') {
    return (
      <Shell>
        <div style={{ fontSize: 56, marginBottom: 12 }}>📧</div>
        <h2 style={h2Style}>Check Your Email</h2>
        <p style={pStyle}>{message?.text || 'We sent you a link. Tap it to continue.'}</p>
        <button onClick={() => { setMode('login'); setMessage(null); }} style={linkStyle}>
          ← Back to login
        </button>
      </Shell>
    );
  }

  // ── Reset Password (user arrived via reset link) ──────────────────────
  if (mode === 'reset') {
    return (
      <Shell>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🔑</div>
        <h2 style={h2Style}>Set New Password</h2>
        <p style={pStyle}>Choose a new password for your account.</p>
        <div style={formStyle}>
          <Input
            type="password"
            placeholder="New password (6+ characters)"
            value={newPassword}
            onChange={setNewPassword}
          />
          {(auth.error || message?.type === 'error') && (
            <ErrorBanner text={auth.error || message.text} />
          )}
          {message?.type === 'success' && <SuccessBanner text={message.text} />}
          <SubmitButton label="Update Password" loading={submitting} onClick={handleSubmit} />
        </div>
      </Shell>
    );
  }

  // ── Login / Signup / Forgot ───────────────────────────────────────────
  return (
    <Shell>
      <div style={{ fontSize: 56, marginBottom: 12 }}>🎤</div>
      <h2 style={h2Style}>
        {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
      </h2>
      <p style={pStyle}>
        {mode === 'login' && 'Sign in to sync your progress across devices.'}
        {mode === 'signup' && 'Create an account to save your training progress.'}
        {mode === 'forgot' && 'Enter your email and we\'ll send a reset link.'}
      </p>

      <div style={formStyle}>
        {mode === 'signup' && (
          <Input
            type="text"
            placeholder="Display name (optional)"
            value={displayName}
            onChange={setDisplayName}
          />
        )}
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        {mode !== 'forgot' && (
          <Input
            type="password"
            placeholder={mode === 'signup' ? 'Password (6+ characters)' : 'Password'}
            value={password}
            onChange={setPassword}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
        )}

        {(auth.error || message?.type === 'error') && (
          <ErrorBanner text={auth.error || message.text} />
        )}

        <SubmitButton
          label={mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
          loading={submitting}
          onClick={handleSubmit}
        />

        {mode === 'login' && (
          <button onClick={() => auth.signInWithMagicLink(email)} disabled={!email || submitting} style={{
            ...btnOutlineStyle,
            opacity: (!email || submitting) ? 0.4 : 1,
          }}>
            ✉️ Send Magic Link Instead
          </button>
        )}
      </div>

      {/* Mode switchers */}
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        {mode === 'login' && (
          <>
            <button onClick={() => { setMode('signup'); auth.clearError(); setMessage(null); }} style={linkStyle}>
              Don't have an account? <strong>Sign up</strong>
            </button>
            <button onClick={() => { setMode('forgot'); auth.clearError(); setMessage(null); }} style={linkStyle}>
              Forgot password?
            </button>
          </>
        )}
        {mode === 'signup' && (
          <button onClick={() => { setMode('login'); auth.clearError(); setMessage(null); }} style={linkStyle}>
            Already have an account? <strong>Sign in</strong>
          </button>
        )}
        {mode === 'forgot' && (
          <button onClick={() => { setMode('login'); auth.clearError(); setMessage(null); }} style={linkStyle}>
            ← Back to login
          </button>
        )}
      </div>

      {/* Dev bypass */}
      {onDevBypass && (
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <button onClick={onDevBypass} style={{
            width: '100%', padding: '12px', borderRadius: 12, fontSize: 13,
            fontWeight: 700, background: 'var(--amber-dim)', color: 'var(--amber)',
            border: '1px dashed var(--amber)', cursor: 'pointer',
          }}>
            🔧 Dev Bypass — Skip Auth
          </button>
          <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', marginTop: 6 }}>
            Only visible in development mode
          </div>
        </div>
      )}
    </Shell>
  );
}

// ─── Shared Components ──────────────────────────────────────────────────────

function Shell({ children }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px', textAlign: 'center', maxWidth: 400, margin: '0 auto',
    }}>
      {children}
    </div>
  );
}

function Input({ type, placeholder, value, onChange, autoComplete }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      style={{
        width: '100%', padding: '14px 16px', borderRadius: 12,
        background: 'var(--surface)', border: '1px solid var(--border)',
        color: 'var(--text-1)', fontSize: 15,
        outline: 'none', transition: 'border-color 0.2s',
        fontFamily: 'var(--font-sans)',
      }}
      onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
      onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
    />
  );
}

function SubmitButton({ label, loading, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        width: '100%', padding: '14px', borderRadius: 14, fontSize: 16,
        fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
        background: loading ? 'var(--primary-dim)' : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
        color: '#fff', border: 'none',
        boxShadow: loading ? 'none' : '0 4px 20px #7c3aed44',
        transition: 'all 0.2s',
      }}
    >
      {loading ? '...' : label}
    </button>
  );
}

function ErrorBanner({ text }) {
  return (
    <div style={{
      background: 'var(--red-dim)', border: '1px solid var(--red)',
      borderRadius: 10, padding: '10px 14px', fontSize: 13,
      color: 'var(--red)', fontWeight: 600, textAlign: 'left',
    }}>
      {text}
    </div>
  );
}

function SuccessBanner({ text }) {
  return (
    <div style={{
      background: 'var(--green-dim)', border: '1px solid var(--green)',
      borderRadius: 10, padding: '10px 14px', fontSize: 13,
      color: 'var(--green)', fontWeight: 600, textAlign: 'left',
    }}>
      {text}
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const h2Style = { fontSize: 26, fontWeight: 900, color: 'var(--text-1)', marginBottom: 6 };
const pStyle = { fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, maxWidth: 300, marginBottom: 20 };
const formStyle = { width: '100%', display: 'flex', flexDirection: 'column', gap: 12 };
const linkStyle = { fontSize: 13, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' };
const btnOutlineStyle = {
  width: '100%', padding: '12px', borderRadius: 12, fontSize: 14,
  fontWeight: 600, background: 'transparent', color: 'var(--text-2)',
  border: '1px solid var(--border)', cursor: 'pointer',
};

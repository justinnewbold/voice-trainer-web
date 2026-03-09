import React, { useState } from 'react';

/**
 * ProfileScreen — account management inside Settings.
 * 
 * Props:
 *   auth         — return value of useAuth()
 *   syncStatus   — return value of useSyncStatus() (or null if not implemented)
 *   onBack       — go back to settings
 */
export default function ProfileScreen({ auth, syncStatus, onBack }) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(auth.profile?.display_name || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const displayName = auth.profile?.display_name || auth.user?.user_metadata?.display_name || '';
  const email = auth.user?.email || '';
  const createdAt = auth.user?.created_at ? new Date(auth.user.created_at).toLocaleDateString() : '';

  const handleSaveName = async () => {
    setSaving(true);
    await auth.updateProfile({ display_name: nameInput });
    setEditingName(false);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 5000);
      return;
    }
    await auth.deleteAccount();
  };

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ padding: '56px 24px 20px', background: 'linear-gradient(160deg, #1a0a35, #080810)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ color: 'var(--text-2)', fontSize: 24, background: 'none', border: 'none', cursor: 'pointer' }}>←</button>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>ACCOUNT</div>
            <h2 style={{ fontSize: 24, fontWeight: 900 }}>👤 Profile</h2>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Avatar + Name */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 900, color: '#fff',
          }}>
            {(displayName || email || '?')[0].toUpperCase()}
          </div>

          {editingName ? (
            <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 280 }}>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Display name"
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 10,
                  background: 'var(--surface)', border: '1px solid var(--primary)',
                  color: 'var(--text-1)', fontSize: 14, outline: 'none',
                  fontFamily: 'var(--font-sans)',
                }}
                autoFocus
              />
              <button onClick={handleSaveName} disabled={saving} style={{
                padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer',
              }}>{saving ? '...' : '✓'}</button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-1)', marginBottom: 2 }}>
                {displayName || 'No name set'}
                <button onClick={() => { setEditingName(true); setNameInput(displayName); }} style={{
                  fontSize: 12, color: 'var(--primary-light)', background: 'none',
                  border: 'none', cursor: 'pointer', marginLeft: 8,
                }}>edit</button>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{email}</div>
            </div>
          )}
        </div>

        {/* Account info */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: 12 }}>ACCOUNT DETAILS</div>
          <InfoRow label="Email" value={email} />
          <InfoRow label="Member since" value={createdAt} />
          <InfoRow label="Auth provider" value={auth.user?.app_metadata?.provider || 'email'} />
        </div>

        {/* Sync status */}
        {syncStatus && (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 16,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: 12 }}>SYNC STATUS</div>
            <InfoRow label="Last synced" value={syncStatus.lastSyncedAt || 'Never'} />
            <InfoRow label="Status" value={syncStatus.isSyncing ? 'Syncing...' : syncStatus.error ? 'Error' : 'Up to date'} />
            {syncStatus.error && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>{syncStatus.error}</div>
            )}
          </div>
        )}

        {/* Sign out */}
        <button onClick={auth.signOut} style={{
          width: '100%', padding: '14px', borderRadius: 14, fontSize: 15,
          fontWeight: 700, background: 'var(--surface)', color: 'var(--text-2)',
          border: '1px solid var(--border)', cursor: 'pointer',
        }}>
          Sign Out
        </button>

        {/* Danger zone */}
        <div style={{
          background: 'var(--red-dim)', border: '1px solid var(--red)',
          borderRadius: 16, padding: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginBottom: 8 }}>
            Danger Zone
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 12 }}>
            Permanently delete your account and all associated data. This cannot be undone.
          </div>
          <button onClick={handleDelete} style={{
            width: '100%', padding: '12px', borderRadius: 12, fontSize: 13,
            fontWeight: 700, cursor: 'pointer',
            background: confirmDelete ? 'var(--red)' : 'transparent',
            color: confirmDelete ? '#fff' : 'var(--red)',
            border: `1px solid var(--red)`,
          }}>
            {confirmDelete ? '⚠️ Click again to permanently delete' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

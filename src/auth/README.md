# Auth System — Implementation Guide

## Status: Built but NOT wired in

The full authentication skeleton is complete and ready to plug in. Nothing in the live app has changed — auth is entirely opt-in.

## What's built

```
src/auth/
├── index.js            # Barrel export for all modules
├── supabaseClient.js   # Supabase client config (reads VITE_ env vars)
├── useAuth.js          # React hook: session, user, profile, all actions
├── AuthScreen.jsx      # Login / Signup / Forgot Password / Magic Link UI
├── AuthGate.jsx        # Wrapper component that gates on auth (with dev bypass)
├── ProfileScreen.jsx   # Account management: name, email, sign out, delete
└── syncService.js      # Bidirectional localStorage ↔ Supabase sync

supabase/
└── migration.sql       # All tables, RLS policies, triggers — run once in SQL Editor
```

## How to implement (when ready)

### Step 1: Create Supabase project

1. Go to https://supabase.com → New Project
2. Copy the URL and anon key from Project Settings → API
3. Run `supabase/migration.sql` in the SQL Editor

### Step 2: Set env vars

Create `.env` from `.env.example`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_AUTH_BYPASS=true    # keep this for dev, remove for production
```

Add the same vars in Vercel → Project Settings → Environment Variables (without VITE_AUTH_BYPASS for production).

### Step 3: Wrap App with AuthGate

In `src/main.jsx`, change:

```jsx
// Before
import App from './App.jsx';
createRoot(document.getElementById('root')).render(<App />);

// After
import App from './App.jsx';
import AuthGate from './auth/AuthGate.jsx';

createRoot(document.getElementById('root')).render(
  <AuthGate>
    <App />
  </AuthGate>
);
```

That's it. AuthGate handles:
- If Supabase isn't configured → renders App directly (no auth)
- If dev bypass is active → renders App directly
- If not authenticated → shows AuthScreen (login/signup)
- If authenticated → syncs data, then renders App

### Step 4: Add Profile to Settings

In the Settings screen (`App.jsx → SettingsScreen`), add a "My Account" row that opens `ProfileScreen`:

```jsx
import ProfileScreen from './auth/ProfileScreen.jsx';
import { useAuth } from './auth/useAuth.js';

// Inside SettingsScreen:
const auth = useAuth();

// If authenticated, show profile link:
{auth.isAuthenticated && (
  <SettingsRow icon="👤" title="My Account" sub={auth.user.email} onClick={() => setShowProfile(true)} />
)}
```

### Step 5: Push progress on session save

In `storage.js → saveSession()`, add a push after the localStorage write:

```jsx
import { pushProgress } from './auth/syncService.js';
import { supabase } from './auth/supabaseClient.js';

// At end of saveSession():
if (supabase) {
  supabase.auth.getUser().then(({ data }) => {
    if (data?.user) pushProgress(data.user.id, p);
  });
}
```

## Dev bypass

Three ways to skip auth while iterating:

1. **Env var**: `VITE_AUTH_BYPASS=true` in `.env`
2. **URL param**: `?devbypass=true` — also sets localStorage so it persists
3. **localStorage**: `localStorage.setItem('vt_dev_bypass', 'true')`

To clear: call `clearDevBypass()` from console, or remove `vt_dev_bypass` from localStorage.

The bypass button also shows on the AuthScreen login page when in dev mode.

## Database schema

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `profiles` | Display name, avatar | `id`, `display_name`, `avatar_url` |
| `user_progress` | XP, streaks, sessions | `user_id`, `xp`, `sessions` (JSONB), `level` |
| `user_vocal_range` | Range test results | `user_id`, `low_note`, `high_note`, `voice_type` |
| `user_preferences` | Theme, notifications | `user_id`, `theme`, `notifications_enabled` |

All tables have RLS enabled — users can only read/write their own data. Profiles auto-create on signup via trigger.

## Sync strategy

- **On login**: pull remote → merge (last-write-wins by XP for progress, timestamp for range) → write both sides
- **On session save**: write localStorage + push to Supabase
- **Conflict resolution**: Higher XP wins for progress, later timestamp wins for range/prefs
- **Offline**: localStorage works as normal, syncs on next authenticated session

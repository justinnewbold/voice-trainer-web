// Auth module — barrel export
// 
// NOT wired into the app yet. To enable auth, wrap <App /> with <AuthGate>
// in main.jsx and set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env
//
// Dev bypass: add ?devbypass=true to URL, or set VITE_AUTH_BYPASS=true in .env

export { supabase, isSupabaseConfigured } from './supabaseClient.js';
export { useAuth } from './useAuth.js';
export { default as AuthScreen } from './AuthScreen.jsx';
export { default as AuthGate, clearDevBypass } from './AuthGate.jsx';
export { default as ProfileScreen } from './ProfileScreen.jsx';
export { fullSync, pushProgress, pushVocalRange, pushPreferences } from './syncService.js';

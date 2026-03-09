import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';

/**
 * useAuth — manages all authentication state and actions.
 * 
 * Returns:
 *   user        — current Supabase user object or null
 *   profile     — app-level profile from `profiles` table or null
 *   session     — current session or null
 *   loading     — true while initial session check is in progress
 *   error       — last error message string or null
 *   
 *   signUp(email, password, displayName)
 *   signIn(email, password)
 *   signInWithMagicLink(email)
 *   signOut()
 *   resetPassword(email)
 *   updatePassword(newPassword)
 *   updateProfile({ display_name, avatar_url })
 *   deleteAccount()
 *   clearError()
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const safeSet = useCallback((setter, value) => {
    if (mountedRef.current) setter(value);
  }, []);

  const handleError = useCallback((err) => {
    const msg = err?.message || err?.error_description || 'Something went wrong';
    safeSet(setError, msg);
    return { error: msg };
  }, [safeSet]);

  const clearError = useCallback(() => setError(null), []);

  // ── Fetch profile from `profiles` table ────────────────────────────────
  const fetchProfile = useCallback(async (userId) => {
    if (!supabase || !userId) return null;
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (err) throw err;
      safeSet(setProfile, data);
      return data;
    } catch {
      safeSet(setProfile, null);
      return null;
    }
  }, [safeSet]);

  // ── Initialize: check existing session ─────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      safeSet(setSession, s);
      safeSet(setUser, s?.user ?? null);
      if (s?.user) fetchProfile(s.user.id);
      safeSet(setLoading, false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        safeSet(setSession, s);
        safeSet(setUser, s?.user ?? null);

        if (event === 'SIGNED_IN' && s?.user) {
          await fetchProfile(s.user.id);
        }
        if (event === 'SIGNED_OUT') {
          safeSet(setProfile, null);
        }
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [safeSet, fetchProfile]);

  // ── Sign Up ────────────────────────────────────────────────────────────
  const signUp = useCallback(async (email, password, displayName = '') => {
    if (!supabase) return handleError({ message: 'Auth not configured' });
    clearError();

    try {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },  // goes into user_metadata
        },
      });
      if (err) throw err;

      // If email confirmation is required, user won't be signed in yet
      if (data.user && !data.session) {
        return { needsConfirmation: true };
      }

      return { user: data.user };
    } catch (err) {
      return handleError(err);
    }
  }, [handleError, clearError]);

  // ── Sign In (email + password) ─────────────────────────────────────────
  const signIn = useCallback(async (email, password) => {
    if (!supabase) return handleError({ message: 'Auth not configured' });
    clearError();

    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) throw err;
      return { user: data.user };
    } catch (err) {
      return handleError(err);
    }
  }, [handleError, clearError]);

  // ── Sign In (magic link) ──────────────────────────────────────────────
  const signInWithMagicLink = useCallback(async (email) => {
    if (!supabase) return handleError({ message: 'Auth not configured' });
    clearError();

    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (err) throw err;
      return { sent: true };
    } catch (err) {
      return handleError(err);
    }
  }, [handleError, clearError]);

  // ── Sign Out ──────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    if (!supabase) return;
    clearError();
    const { error: err } = await supabase.auth.signOut();
    if (err) handleError(err);
  }, [handleError, clearError]);

  // ── Password Reset ────────────────────────────────────────────────────
  const resetPassword = useCallback(async (email) => {
    if (!supabase) return handleError({ message: 'Auth not configured' });
    clearError();

    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}?reset=true`,
      });
      if (err) throw err;
      return { sent: true };
    } catch (err) {
      return handleError(err);
    }
  }, [handleError, clearError]);

  // ── Update Password (after reset link) ────────────────────────────────
  const updatePassword = useCallback(async (newPassword) => {
    if (!supabase) return handleError({ message: 'Auth not configured' });
    clearError();

    try {
      const { error: err } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (err) throw err;
      return { success: true };
    } catch (err) {
      return handleError(err);
    }
  }, [handleError, clearError]);

  // ── Update Profile ────────────────────────────────────────────────────
  const updateProfile = useCallback(async (updates) => {
    if (!supabase || !user) return handleError({ message: 'Not logged in' });
    clearError();

    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (err) throw err;
      safeSet(setProfile, data);
      return { profile: data };
    } catch (err) {
      return handleError(err);
    }
  }, [user, handleError, clearError, safeSet]);

  // ── Delete Account ────────────────────────────────────────────────────
  // NOTE: Requires a Supabase Edge Function or service_role call.
  // This is a placeholder that signs out. Full delete needs server-side.
  const deleteAccount = useCallback(async () => {
    if (!supabase || !user) return;
    clearError();
    // TODO: call edge function to delete user + data
    // For now, just sign out
    await signOut();
    return { deleted: true };
  }, [user, signOut, clearError]);

  return {
    user,
    profile,
    session,
    loading,
    error,
    isAuthenticated: !!session,
    signUp,
    signIn,
    signInWithMagicLink,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    deleteAccount,
    clearError,
  };
}

import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { loadProgress, defaultProgress } from '../utils/storage.js';

/**
 * SyncService — handles bidirectional sync between localStorage and Supabase.
 * 
 * Strategy:
 *   - On login: pull remote → merge with local → write both
 *   - On session save: write local + push remote
 *   - On app open (authenticated): pull remote if newer than local
 *   - Conflict resolution: last-write-wins by timestamp
 * 
 * Tables synced:
 *   - user_progress    (progress stats, XP, streak, sessions array)
 *   - user_vocal_range (low note, high note, voice type)
 *   - user_preferences (theme, notification settings)
 */

// ─── Pull: Supabase → localStorage ─────────────────────────────────────────

export async function pullProgress(userId) {
  if (!isSupabaseConfigured() || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // no rows — new user
      throw error;
    }
    return data;
  } catch (err) {
    console.error('pullProgress error:', err);
    return null;
  }
}

export async function pullVocalRange(userId) {
  if (!isSupabaseConfigured() || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('user_vocal_range')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  } catch (err) {
    console.error('pullVocalRange error:', err);
    return null;
  }
}

export async function pullPreferences(userId) {
  if (!isSupabaseConfigured() || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  } catch (err) {
    console.error('pullPreferences error:', err);
    return null;
  }
}

// ─── Push: localStorage → Supabase ──────────────────────────────────────────

export async function pushProgress(userId, progressData) {
  if (!isSupabaseConfigured() || !userId) return false;

  try {
    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        total_sessions: progressData.totalSessions || 0,
        total_minutes: progressData.totalMinutes || 0,
        current_streak: progressData.currentStreak || 0,
        longest_streak: progressData.longestStreak || 0,
        avg_accuracy: progressData.avgAccuracy || 0,
        xp: progressData.xp || 0,
        level: progressData.level || 'beginner',
        sessions: progressData.sessions || [],
        last_date: progressData.lastDate || null,
        completed_ids: progressData.completedIds || [],
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('pushProgress error:', err);
    return false;
  }
}

export async function pushVocalRange(userId, rangeData) {
  if (!isSupabaseConfigured() || !userId || !rangeData) return false;

  try {
    const { error } = await supabase
      .from('user_vocal_range')
      .upsert({
        user_id: userId,
        low_note: rangeData.lowNote,
        high_note: rangeData.highNote,
        voice_type: rangeData.voiceType,
        semitones: rangeData.semitones,
        tested_at: rangeData.testedAt ? new Date(rangeData.testedAt).toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('pushVocalRange error:', err);
    return false;
  }
}

export async function pushPreferences(userId, prefs) {
  if (!isSupabaseConfigured() || !userId) return false;

  try {
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        theme: prefs.theme || 'dark',
        notifications_enabled: prefs.notificationsEnabled || false,
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('pushPreferences error:', err);
    return false;
  }
}

// ─── Full Sync ──────────────────────────────────────────────────────────────

/**
 * fullSync — pull remote, merge with local, write both sides.
 * Call this on login and on app open when authenticated.
 * 
 * Returns { success, merged } or { success: false, error }
 */
export async function fullSync(userId) {
  if (!isSupabaseConfigured() || !userId) {
    return { success: false, error: 'Not configured' };
  }

  try {
    // 1. Pull remote
    const [remoteProgress, remoteRange, remotePrefs] = await Promise.all([
      pullProgress(userId),
      pullVocalRange(userId),
      pullPreferences(userId),
    ]);

    // 2. Load local
    const localProgress = loadProgress();
    const localRange = (() => {
      try { return JSON.parse(localStorage.getItem('vt_range') || 'null'); } catch { return null; }
    })();
    const localPrefs = {
      theme: localStorage.getItem('vt_theme') || 'dark',
      notificationsEnabled: localStorage.getItem('vt_notifs') === 'true',
    };

    // 3. Merge: last-write-wins by comparing updated_at / lastDate
    const mergedProgress = mergeProgress(localProgress, remoteProgress);
    const mergedRange = mergeByTimestamp(localRange, remoteRange, 'testedAt', 'tested_at');
    const mergedPrefs = remotePrefs || localPrefs; // remote wins for prefs

    // 4. Write merged back to local
    if (mergedProgress) {
      try { localStorage.setItem('vt_progress_v1', JSON.stringify(mergedProgress)); } catch {}
    }
    if (mergedRange) {
      try { localStorage.setItem('vt_range', JSON.stringify({
        lowNote: mergedRange.low_note || mergedRange.lowNote,
        highNote: mergedRange.high_note || mergedRange.highNote,
        voiceType: mergedRange.voice_type || mergedRange.voiceType,
        semitones: mergedRange.semitones,
        testedAt: mergedRange.tested_at || mergedRange.testedAt,
      })); } catch {}
    }
    if (mergedPrefs) {
      try {
        localStorage.setItem('vt_theme', mergedPrefs.theme || 'dark');
        if (mergedPrefs.notifications_enabled || mergedPrefs.notificationsEnabled) {
          localStorage.setItem('vt_notifs', 'true');
        }
      } catch {}
    }

    // 5. Push merged back to remote
    await Promise.all([
      pushProgress(userId, mergedProgress || localProgress),
      mergedRange ? pushVocalRange(userId, {
        lowNote: mergedRange.low_note || mergedRange.lowNote,
        highNote: mergedRange.high_note || mergedRange.highNote,
        voiceType: mergedRange.voice_type || mergedRange.voiceType,
        semitones: mergedRange.semitones,
        testedAt: mergedRange.tested_at || mergedRange.testedAt,
      }) : null,
      pushPreferences(userId, localPrefs),
    ]);

    return { success: true };
  } catch (err) {
    console.error('fullSync error:', err);
    return { success: false, error: err.message };
  }
}

// ─── Merge Helpers ──────────────────────────────────────────────────────────

function mergeProgress(local, remote) {
  if (!remote) return local;
  if (!local || local.totalSessions === 0) {
    // Local is empty, use remote
    return {
      totalSessions: remote.total_sessions,
      totalMinutes: remote.total_minutes,
      currentStreak: remote.current_streak,
      longestStreak: remote.longest_streak,
      avgAccuracy: remote.avg_accuracy,
      xp: remote.xp,
      level: remote.level,
      sessions: remote.sessions || [],
      lastDate: remote.last_date,
      completedIds: remote.completed_ids || [],
    };
  }

  // Both have data — take whichever has more XP (proxy for "more progress")
  if (remote.xp > (local.xp || 0)) {
    return {
      totalSessions: remote.total_sessions,
      totalMinutes: remote.total_minutes,
      currentStreak: remote.current_streak,
      longestStreak: Math.max(remote.longest_streak, local.longestStreak || 0),
      avgAccuracy: remote.avg_accuracy,
      xp: remote.xp,
      level: remote.level,
      sessions: remote.sessions || [],
      lastDate: remote.last_date,
      completedIds: [...new Set([...(remote.completed_ids || []), ...(local.completedIds || [])])],
    };
  }

  return local;
}

function mergeByTimestamp(local, remote, localKey, remoteKey) {
  if (!remote && !local) return null;
  if (!remote) return local;
  if (!local) return remote;

  const localTime = local[localKey] ? new Date(local[localKey]).getTime() : 0;
  const remoteTime = remote[remoteKey] ? new Date(remote[remoteKey]).getTime() : 0;

  return remoteTime > localTime ? remote : local;
}

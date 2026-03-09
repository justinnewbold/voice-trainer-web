const KEY = 'vt_progress_v1';

export const defaultProgress = {
  totalSessions: 0,
  totalMinutes: 0,
  currentStreak: 0,
  longestStreak: 0,
  avgAccuracy: 0,
  xp: 0,
  level: 'beginner',
  sessions: [],
  lastDate: null,
  completedIds: [],
};

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaultProgress, ...JSON.parse(raw) } : { ...defaultProgress };
  } catch { return { ...defaultProgress }; }
}

export function saveSession(session) {
  const p = loadProgress();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (p.lastDate === today) {
    // streak unchanged
  } else if (p.lastDate === yesterday) {
    p.currentStreak = (p.currentStreak || 0) + 1;
  } else {
    p.currentStreak = 1;
  }
  if (p.currentStreak > p.longestStreak) p.longestStreak = p.currentStreak;

  p.sessions = [session, ...(p.sessions || [])].slice(0, 50);
  p.totalSessions = (p.totalSessions || 0) + 1;
  p.totalMinutes = (p.totalMinutes || 0) + Math.floor(session.duration / 60);
  p.lastDate = today;

  const recent = p.sessions.slice(0, 10);
  p.avgAccuracy = Math.round(recent.reduce((a, s) => a + s.accuracy, 0) / recent.length);

  const xpGained = Math.round(session.accuracy * (session.duration / 8));
  p.xp = (p.xp || 0) + xpGained;

  p.level = p.xp >= 5000 ? 'advanced' : p.xp >= 1000 ? 'intermediate' : 'beginner';

  if (!p.completedIds.includes(session.exerciseId)) {
    p.completedIds = [...(p.completedIds || []), session.exerciseId];
  }

  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
  return { ...p, xpGained };
}

export function clearProgress() {
  localStorage.removeItem(KEY);
}

/**
 * Export all user data as a JSON blob for download
 */
export function exportAllData() {
  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    progress: loadProgress(),
    vocalRange: null,
    theme: null,
    recordings: null,
    onboarded: null,
  };
  try { data.vocalRange = JSON.parse(localStorage.getItem('vt_range') || 'null'); } catch {}
  try { data.theme = localStorage.getItem('vt_theme') || 'dark'; } catch {}
  try { data.recordings = JSON.parse(localStorage.getItem('vt_recordings_v1') || '[]'); } catch {}
  try { data.onboarded = localStorage.getItem('vt_onboarded_v1') === 'true'; } catch {}
  return data;
}

/**
 * Download data as a JSON file
 */
export function downloadExport() {
  const data = exportAllData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `voice-trainer-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import data from a JSON file
 * Returns true on success, throws on error
 */
export function importData(jsonString) {
  const data = JSON.parse(jsonString);
  if (!data.version || !data.progress) {
    throw new Error('Invalid backup file');
  }
  
  try { localStorage.setItem(KEY, JSON.stringify(data.progress)); } catch {}
  if (data.vocalRange) {
    try { localStorage.setItem('vt_range', JSON.stringify(data.vocalRange)); } catch {}
  }
  if (data.theme) {
    try { localStorage.setItem('vt_theme', data.theme); } catch {}
  }
  if (data.recordings) {
    try { localStorage.setItem('vt_recordings_v1', JSON.stringify(data.recordings)); } catch {}
  }
  if (data.onboarded) {
    try { localStorage.setItem('vt_onboarded_v1', 'true'); } catch {}
  }
  return true;
}

export function levelInfo(xp) {
  if (xp < 1000) return { label: 'Beginner', emoji: '🌱', next: 'Intermediate', needed: 1000, current: xp };
  if (xp < 5000) return { label: 'Intermediate', emoji: '🎵', next: 'Advanced', needed: 4000, current: xp - 1000 };
  return { label: 'Advanced', emoji: '🌟', next: null, needed: 0, current: 0 };
}

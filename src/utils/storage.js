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

export function levelInfo(xp) {
  if (xp < 1000) return { label: 'Beginner', emoji: '🌱', next: 'Intermediate', needed: 1000, current: xp };
  if (xp < 5000) return { label: 'Intermediate', emoji: '🎵', next: 'Advanced', needed: 4000, current: xp - 1000 };
  return { label: 'Advanced', emoji: '🌟', next: null, needed: 0, current: 0 };
}

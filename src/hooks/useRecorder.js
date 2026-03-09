import { useState, useRef, useCallback } from 'react';

// ─── useRecorder ──────────────────────────────────────────────────────────────
// Records audio from the microphone AND captures a timestamped pitch timeline
// simultaneously. After stopping, gives back:
//   - audioUrl: blob URL for playback
//   - pitchTimeline: [{t, freq, note, cents, status}] one entry per ~100ms
//   - duration: seconds

const STORAGE_KEY = 'vt_recordings_v1';

export function useRecorder() {
  const [recordings, setRecordings] = useState(() => loadRecordings());
  const [isRecording, setIsRecording] = useState(false);
  const [activePlayback, setActivePlayback] = useState(null); // recording id being played

  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const pitchLogRef      = useRef([]);
  const startTimeRef     = useRef(null);
  const audioElRef       = useRef(null);
  const playbackRafRef   = useRef(null);
  const playbackTimerRef = useRef(null);

  // ── Start Recording ────────────────────────────────────────────────────────
  // Pass the live MediaStream from usePitchDetection
  const startRecording = useCallback(async (stream) => {
    if (!stream) {
      console.error('useRecorder: no stream provided');
      return;
    }

    chunksRef.current = [];
    pitchLogRef.current = [];
    startTimeRef.current = Date.now();

    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start(100); // collect chunks every 100ms
    setIsRecording(true);
  }, []);

  // ── Log a pitch reading (call this from your pitch detection loop) ─────────
  const logPitch = useCallback((noteInfo, status) => {
    if (!startTimeRef.current) return;
    pitchLogRef.current.push({
      t:      (Date.now() - startTimeRef.current) / 1000, // seconds from start
      freq:   noteInfo.frequency,
      note:   noteInfo.note,
      octave: noteInfo.octave,
      cents:  noteInfo.cents,
      midi:   noteInfo.midiNote,
      status,
    });
  }, []);

  // ── Stop Recording ─────────────────────────────────────────────────────────
  const stopRecording = useCallback((sessionName = 'Recording') => {
    return new Promise(resolve => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') { resolve(null); return; }

      recorder.onstop = () => {
        const mimeType  = recorder.mimeType || 'audio/webm';
        const blob      = new Blob(chunksRef.current, { type: mimeType });
        const audioUrl  = URL.createObjectURL(blob);
        const duration  = startTimeRef.current
          ? (Date.now() - startTimeRef.current) / 1000
          : 0;

        const rec = {
          id:            Date.now().toString(),
          name:          sessionName,
          date:          new Date().toISOString(),
          duration:      Math.round(duration),
          audioUrl,
          pitchTimeline: [...pitchLogRef.current],
          mimeType,
        };

        // Persist (without the blob URL — regenerated on load isn't possible,
        // so we store metadata only; audio is session-only)
        const meta = { ...rec, audioUrl: null };
        persistRecording(meta);

        setRecordings(prev => [rec, ...prev].slice(0, 20));
        setIsRecording(false);
        startTimeRef.current = null;
        resolve(rec);
      };

      recorder.stop();
    });
  }, []);

  // ── Play a recording ───────────────────────────────────────────────────────
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackPitchPoint, setPlaybackPitchPoint] = useState(null);

  const play = useCallback((rec) => {
    if (!rec.audioUrl) return;
    stopPlayback();

    const audio = new Audio(rec.audioUrl);
    audioElRef.current = audio;
    setActivePlayback(rec.id);
    setPlaybackProgress(0);
    setPlaybackPitchPoint(null);

    // Animate pitch cursor in sync with audio
    const animate = () => {
      if (!audioElRef.current) return;
      const t = audioElRef.current.currentTime;
      const pct = rec.duration > 0 ? t / rec.duration : 0;
      setPlaybackProgress(Math.min(1, pct));

      // Find the pitch point closest to current playback time
      const timeline = rec.pitchTimeline || [];
      if (timeline.length > 0) {
        let closest = timeline[0];
        let minDiff = Math.abs(t - timeline[0].t);
        for (const pt of timeline) {
          const diff = Math.abs(t - pt.t);
          if (diff < minDiff) { minDiff = diff; closest = pt; }
        }
        setPlaybackPitchPoint(closest);
      }

      playbackRafRef.current = requestAnimationFrame(animate);
    };

    audio.onplay  = () => { playbackRafRef.current = requestAnimationFrame(animate); };
    audio.onended = () => {
      stopPlayback();
    };
    audio.onpause = () => {
      if (playbackRafRef.current) cancelAnimationFrame(playbackRafRef.current);
    };

    audio.play().catch(e => console.error('Playback failed:', e));
  }, []);

  const stopPlayback = useCallback(() => {
    if (playbackRafRef.current)  cancelAnimationFrame(playbackRafRef.current);
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
      audioElRef.current = null;
    }
    setActivePlayback(null);
    setPlaybackProgress(0);
    setPlaybackPitchPoint(null);
  }, []);

  const deleteRecording = useCallback((id) => {
    setRecordings(prev => {
      const next = prev.filter(r => r.id !== id);
      persistAllRecordings(next.map(r => ({ ...r, audioUrl: null })));
      return next;
    });
    if (activePlayback === id) stopPlayback();
  }, [activePlayback, stopPlayback]);

  return {
    recordings,
    isRecording,
    activePlayback,
    playbackProgress,
    playbackPitchPoint,
    startRecording,
    stopRecording,
    logPitch,
    play,
    stopPlayback,
    deleteRecording,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getSupportedMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return types.find(t => MediaRecorder.isTypeSupported(t)) || null;
}

function loadRecordings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // Audio blobs can't be stored, so loaded recordings have no audioUrl
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistRecording(rec) {
  try {
    const existing = loadRecordings();
    const next = [rec, ...existing].slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

function persistAllRecordings(recs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recs));
  } catch {}
}

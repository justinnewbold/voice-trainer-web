import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePitchDetection } from '../hooks/usePitchDetection.js';
import { useRecorder } from '../hooks/useRecorder.js';
import { getPitchColor } from '../utils/pitch.js';
import { saveSession } from '../utils/storage.js';

const STATUS_LABEL = { on: '✓ On Pitch!', close: '~ Almost', low: '↑ Sing Higher', high: '↓ Sing Lower', silent: 'Start Singing...' };

export default function PitchScreen() {
  const [subTab, setSubTab] = useState('live'); // 'live' | 'recordings'
  const pitch = usePitchDetection();
  const recorder = useRecorder();

  const [sessionData, setSessionData]   = useState([]);
  const [startTime, setStartTime]       = useState(null);
  const [toast, setToast]               = useState(null);

  const canvasRef      = useRef(null);
  const historyRef     = useRef([]);
  const pitchLogRef    = useRef([]);   // [{t, cents, status}] for pitch trail on canvas
  const animRef        = useRef(null);

  // Feed pitch readings into session stats + recorder log
  useEffect(() => {
    if (!pitch.isListening) return;
    if (pitch.status !== 'silent') {
      const acc = pitch.status === 'on' ? 100 : pitch.status === 'close' ? 65 : 20;
      historyRef.current.push(acc);

      // Log to recorder
      recorder.logPitch(pitch.note, pitch.status);

      // Push to pitch trail (keep last 120 points = ~12s of history)
      pitchLogRef.current.push({ t: Date.now(), cents: pitch.note.cents, status: pitch.status });
      if (pitchLogRef.current.length > 120) pitchLogRef.current.shift();
    }
  }, [pitch.status, pitch.note.cents]);

  // Canvas: waveform bars + pitch history trail
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      if (pitch.isListening && pitch.volume > 0.02) {
        // Animated bars
        const bars = 44;
        const barW = W / bars;
        for (let i = 0; i < bars; i++) {
          const x = i * barW;
          const centerFactor = 1 - Math.abs((i / bars) - 0.5) * 0.7;
          const h = Math.max(3, pitch.volume * (0.4 + Math.random() * 0.6) * centerFactor * H * 0.9);
          const y = (H - h) / 2;
          ctx.fillStyle = pitch.color + 'cc';
          ctx.beginPath();
          ctx.roundRect(x + 1, y, barW - 2, h, 3);
          ctx.fill();
        }
      } else {
        // Idle flat line
        ctx.strokeStyle = '#2a2a5080';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [pitch.isListening, pitch.volume, pitch.color]);

  const handleToggle = async () => {
    if (pitch.isListening) {
      // Stop recording first, then stop pitch
      if (recorder.isRecording) {
        const rec = await recorder.stopRecording('Free Practice');
      }
      pitch.stop();

      // Save session
      if (historyRef.current.length > 5 && startTime) {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const accuracy = Math.round(historyRef.current.reduce((a, b) => a + b, 0) / historyRef.current.length);
        const result = saveSession({ id: 'freeform', exerciseId: 'freeform', name: 'Free Practice', type: 'pitch', duration, accuracy });
        showToast(`Session saved! +${result.xpGained} XP`);
      }
      historyRef.current  = [];
      pitchLogRef.current = [];
      setStartTime(null);
    } else {
      setStartTime(Date.now());
      historyRef.current  = [];
      pitchLogRef.current = [];
      await pitch.start();
      // Start recording once mic stream is live (small delay)
      setTimeout(() => {
        if (pitch.getStream && pitch.getStream()) {
          recorder.startRecording(pitch.getStream());
        }
      }, 200);
    }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const needlePos = Math.max(0, Math.min(100, ((pitch.note.cents + 50) / 100) * 100));

  // ── Recordings tab ──────────────────────────────────────────────────────────
  if (subTab === 'recordings') {
    return (
      <RecordingsView
        recordings={recorder.recordings}
        activePlayback={recorder.activePlayback}
        playbackProgress={recorder.playbackProgress}
        playbackPitchPoint={recorder.playbackPitchPoint}
        onPlay={recorder.play}
        onStop={recorder.stopPlayback}
        onDelete={recorder.deleteRecording}
        onBack={() => setSubTab('live')}
      />
    );
  }

  // ── Live pitch tab ──────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ padding: '56px 24px 24px', background: 'linear-gradient(160deg, #1a0a35, #080810)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>PITCH TRAINER</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>🎤 Real-Time Pitch</h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)' }}>YIN algorithm · 44.1kHz</p>
        </div>
        <button onClick={() => setSubTab('recordings')} style={{
          padding: '8px 14px', background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600, color: 'var(--text-2)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>🎙</span> Recordings {recorder.recordings.filter(r => r.audioUrl).length > 0 && <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 999, padding: '1px 6px', fontSize: 11 }}>{recorder.recordings.filter(r => r.audioUrl).length}</span>}
        </button>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Recording indicator */}
        {recorder.isRecording && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: -8, padding: '6px 12px', background: '#ef444420', border: '1px solid #ef444450', borderRadius: 999 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse-ring 1s infinite' }} />
            <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>RECORDING</span>
          </div>
        )}

        {/* Waveform canvas */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 12,
          boxShadow: pitch.isListening ? `0 0 32px ${pitch.color}25` : 'none', transition: 'box-shadow 0.5s',
        }}>
          <canvas ref={canvasRef} width={448} height={80} style={{ width: '100%', height: 80, display: 'block' }} />
        </div>

        {/* Note circle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ position: 'relative', width: 140, height: 140 }}>
            {pitch.status === 'on' && [0, 1].map(i => (
              <div key={i} style={{ position: 'absolute', inset: -8 - i * 14, border: `2px solid ${pitch.color}`, borderRadius: '50%', animation: 'pulse-ring 1.4s ease-out infinite', animationDelay: `${i * 0.5}s` }} />
            ))}
            <div style={{
              width: '100%', height: '100%', borderRadius: '50%',
              border: `3px solid ${pitch.color}`,
              background: `radial-gradient(circle, ${pitch.color}18, var(--card))`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 40px ${pitch.color}35`, transition: 'all 0.25s',
            }}>
              <div style={{ fontSize: pitch.status === 'silent' ? 40 : 54, fontWeight: 900, fontFamily: 'var(--font-mono)', color: pitch.color, lineHeight: 1, transition: 'color 0.25s' }}>
                {pitch.status === 'silent' ? '🎤' : pitch.note.note}
              </div>
              {pitch.status !== 'silent' && (
                <div style={{ fontSize: 14, color: pitch.color, fontFamily: 'var(--font-mono)', marginTop: 2 }}>{pitch.note.octave}</div>
              )}
            </div>
          </div>
        </div>

        {/* Freq + confidence */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 12 }}>
          {pitch.frequency > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-3)' }}>{Math.round(pitch.frequency)} Hz</span>
          )}
          {pitch.confidence > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: pitch.confidence > 80 ? 'var(--green)' : 'var(--text-3)' }}>
              {pitch.confidence}% conf
            </span>
          )}
        </div>

        {/* Pitch meter */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--cyan)', fontWeight: 700 }}>♭ Flat</span>
            <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>In Tune</span>
            <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 700 }}>Sharp ♯</span>
          </div>
          <div style={{ position: 'relative', height: 28, background: 'var(--surface)', borderRadius: 14, overflow: 'visible', border: '1px solid var(--border)' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ flex: 1, background: 'var(--cyan-dim)' }} />
              <div style={{ flex: 0.4, background: 'var(--green-dim)' }} />
              <div style={{ flex: 1, background: 'var(--red-dim)' }} />
            </div>
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: 'var(--green)', transform: 'translateX(-50%)', zIndex: 2 }} />
            <div style={{ position: 'absolute', top: '50%', left: `${needlePos}%`, transform: 'translate(-50%, -50%)', width: 6, height: 36, background: pitch.color, borderRadius: 3, boxShadow: `0 0 12px ${pitch.color}`, transition: 'left 0.08s linear, background 0.25s', zIndex: 3 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {[-50, -25, 0, 25, 50].map(t => (
              <span key={t} style={{ fontSize: 10, color: t === 0 ? 'var(--green)' : 'var(--text-3)', fontFamily: 'var(--font-mono)', fontWeight: t === 0 ? 700 : 400 }}>{t > 0 ? `+${t}` : t}</span>
            ))}
          </div>
        </div>

        {/* Status badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ padding: '10px 28px', borderRadius: 999, background: `${pitch.color}20`, border: `1px solid ${pitch.color}60`, fontSize: 16, fontWeight: 700, color: pitch.color, transition: 'all 0.25s' }}>
            {STATUS_LABEL[pitch.status] || '...'}
          </div>
        </div>

        {/* Error */}
        {pitch.error && (
          <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12, fontSize: 13, color: 'var(--red)', textAlign: 'center' }}>{pitch.error}</div>
        )}

        {/* Mic button */}
        <button onClick={handleToggle} style={{
          width: '100%', padding: 18, borderRadius: 'var(--radius-lg)', fontSize: 17, fontWeight: 800,
          background: pitch.isListening ? 'linear-gradient(135deg, #ef4444, #991b1b)' : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
          color: '#fff', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: pitch.isListening ? '0 0 32px #ef444450' : '0 0 32px #7c3aed50', transition: 'all 0.3s',
        }}>
          <span style={{ fontSize: 20 }}>{pitch.isListening ? '⏹' : '🎤'}</span>
          {pitch.isListening ? 'Stop & Save Recording' : 'Start Singing'}
        </button>

        {/* Tips */}
        <div style={{ marginTop: 14, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>How it works:</div>
          {[['🟢','Green = on pitch! Hold it steady'],['🔵','Blue = flat, sing higher'],['🔴','Red = sharp, ease lower'],['📊','Needle shows cents deviation (±50)'],['🎙','Your session is automatically recorded']].map(([e, t]) => (
            <div key={t} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <span>{e}</span><span style={{ fontSize: 13, color: 'var(--text-2)' }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {toast && <Toast msg={toast} />}
    </div>
  );
}

// ─── Recordings View ──────────────────────────────────────────────────────────
function RecordingsView({ recordings, activePlayback, playbackProgress, playbackPitchPoint, onPlay, onStop, onBack, onDelete }) {
  const liveRecs = recordings.filter(r => r.audioUrl);

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ padding: '56px 24px 24px', background: 'linear-gradient(160deg, #1a0a35, #080810)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ color: 'var(--text-2)', fontSize: 22, background: 'none', border: 'none', cursor: 'pointer' }}>←</button>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>PITCH TRAINER</div>
          <h2 style={{ fontSize: 26, fontWeight: 900 }}>🎙 Recordings</h2>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {liveRecs.length === 0 ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎙</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>No recordings yet</div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>Go to Live Pitch and hit Start — your session will be recorded automatically.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {liveRecs.map(rec => {
              const isPlaying = activePlayback === rec.id;
              const date = new Date(rec.date);
              return (
                <RecordingCard
                  key={rec.id}
                  rec={rec}
                  isPlaying={isPlaying}
                  progress={isPlaying ? playbackProgress : 0}
                  pitchPoint={isPlaying ? playbackPitchPoint : null}
                  onPlay={() => isPlaying ? onStop() : onPlay(rec)}
                  onDelete={() => onDelete(rec.id)}
                />
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 16, background: 'var(--card)', border: '1px solid var(--border-glow)', borderRadius: 'var(--radius)', padding: 14, fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
          💡 Recordings are stored this session only — they clear when you close the tab. Pitch timeline data is saved across sessions.
        </div>
      </div>
    </div>
  );
}

function RecordingCard({ rec, isPlaying, progress, pitchPoint, onPlay, onDelete }) {
  const mins = Math.floor(rec.duration / 60);
  const secs = (rec.duration % 60).toString().padStart(2, '0');
  const date = new Date(rec.date);

  // Build mini pitch graph from timeline
  const timeline = rec.pitchTimeline || [];
  const hasData = timeline.length > 0;

  // Group status into color segments for sparkline
  const pointColor = pitchPoint ? getPitchColor(pitchPoint.status) : 'var(--text-3)';

  return (
    <div style={{ background: 'var(--card)', border: `1px solid ${isPlaying ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: 16, transition: 'border-color 0.3s' }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{rec.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {mins}:{secs}
          </div>
        </div>
        <button onClick={onDelete} style={{ fontSize: 18, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>🗑</button>
      </div>

      {/* Pitch sparkline */}
      {hasData && (
        <div style={{ marginBottom: 12 }}>
          <PitchSparkline timeline={timeline} duration={rec.duration} playProgress={progress} isPlaying={isPlaying} pitchPoint={pitchPoint} />
        </div>
      )}

      {/* Playback progress */}
      {isPlaying && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress * 100}%`, background: 'var(--primary)', borderRadius: 999, transition: 'width 0.1s' }} />
          </div>
          {pitchPoint && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: pointColor }}>
                {pitchPoint.status === 'silent' ? '–' : `${pitchPoint.note}${pitchPoint.octave}`}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                {pitchPoint.freq > 0 ? `${Math.round(pitchPoint.freq)} Hz` : '—'}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: pointColor }}>
                {{ on: '✓ On Pitch', close: '~ Close', low: '↑ Flat', high: '↓ Sharp', silent: 'Silent' }[pitchPoint.status]}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Play button */}
      <button onClick={onPlay} style={{
        width: '100%', padding: '12px', borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 700,
        background: isPlaying ? 'linear-gradient(135deg, #ef4444, #991b1b)' : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
        color: '#fff', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <span>{isPlaying ? '⏹' : '▶'}</span>
        {isPlaying ? 'Stop Playback' : 'Play Recording'}
      </button>
    </div>
  );
}

// Mini pitch sparkline — plots cents deviation over time
function PitchSparkline({ timeline, duration, playProgress, isPlaying, pitchPoint }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !timeline.length) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Center line (0 cents)
    ctx.strokeStyle = '#2a2a5060';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Plot cents as colored line segments
    const points = timeline.filter(p => p.status !== 'silent');
    if (points.length < 2) return;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const x1 = (prev.t / duration) * W;
      const y1 = H / 2 - (prev.cents / 50) * (H / 2 - 4);
      const x2 = (curr.t / duration) * W;
      const y2 = H / 2 - (curr.cents / 50) * (H / 2 - 4);

      ctx.strokeStyle = getPitchColor(curr.status) + 'cc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Playback cursor
    if (isPlaying && playProgress > 0) {
      const cx = playProgress * W;
      ctx.strokeStyle = '#ffffff90';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, H);
      ctx.stroke();

      // Dot at current pitch
      if (pitchPoint && pitchPoint.status !== 'silent') {
        const cy = H / 2 - (pitchPoint.cents / 50) * (H / 2 - 4);
        ctx.fillStyle = getPitchColor(pitchPoint.status);
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [timeline, duration, playProgress, isPlaying, pitchPoint]);

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>PITCH HISTORY</div>
      <canvas ref={canvasRef} width={416} height={56} style={{ width: '100%', height: 56, borderRadius: 8, background: 'var(--surface)', display: 'block' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>0:00</span>
        <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}</span>
      </div>
    </div>
  );
}

function Toast({ msg }) {
  return (
    <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: '#fff', padding: '12px 24px', borderRadius: 999, fontSize: 14, fontWeight: 700, boxShadow: '0 8px 32px #7c3aed60', zIndex: 200, whiteSpace: 'nowrap' }}>
      {msg}
    </div>
  );
}

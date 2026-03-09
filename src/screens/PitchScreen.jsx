import React, { useState, useRef, useEffect } from 'react';
import { usePitchDetection } from '../hooks/usePitchDetection.js';
import { saveSession } from '../utils/storage.js';

export default function PitchScreen() {
  const { frequency, note, status, color, volume, isListening, error, start, stop } = usePitchDetection();
  const [sessionData, setSessionData] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [toast, setToast] = useState(null);
  const canvasRef = useRef(null);
  const historyRef = useRef([]);
  const animRef = useRef(null);

  // Collect session accuracy data
  useEffect(() => {
    if (isListening && status !== 'silent') {
      const acc = status === 'on' ? 100 : status === 'close' ? 65 : 20;
      historyRef.current.push(acc);
    }
  }, [status, isListening]);

  // Draw waveform / pitch history on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#1a1a3500');
      grad.addColorStop(1, '#1a1a3580');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      if (isListening && volume > 0.02) {
        // Animated bars
        const bars = 40;
        const barW = W / bars;
        for (let i = 0; i < bars; i++) {
          const x = i * barW;
          const center = bars / 2;
          const distFromCenter = Math.abs(i - center) / center;
          const envelope = 1 - distFromCenter * 0.6;
          const noise = Math.random();
          const h = Math.max(2, volume * noise * envelope * H * 0.85);
          const y = (H - h) / 2;

          ctx.fillStyle = color + 'cc';
          ctx.beginPath();
          ctx.roundRect(x + 1, y, barW - 3, h, 3);
          ctx.fill();
        }
      } else {
        // Flat line
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
  }, [isListening, volume, color]);

  const handleToggle = async () => {
    if (isListening) {
      stop();
      if (historyRef.current.length > 5 && startTime) {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const accuracy = Math.round(historyRef.current.reduce((a, b) => a + b, 0) / historyRef.current.length);
        const result = saveSession({ id: 'freeform', exerciseId: 'freeform', name: 'Free Practice', type: 'pitch', duration, accuracy });
        showToast(`Session saved! +${result.xpGained} XP`);
      }
      historyRef.current = [];
      setStartTime(null);
    } else {
      setStartTime(Date.now());
      await start();
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Needle position: cents -50..+50 → 0..100%
  const needlePos = Math.max(0, Math.min(100, ((note.cents + 50) / 100) * 100));

  const statusText = {
    on: '✓ On Pitch!',
    close: '~ Almost...',
    low: '↑ Sing Higher',
    high: '↓ Sing Lower',
    silent: 'Start Singing...',
  }[status] || '...';

  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* Header */}
      <div style={{
        padding: '56px 24px 28px',
        background: 'linear-gradient(160deg, #1a0a35 0%, #080810 100%)',
      }}>
        <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>PITCH TRAINER</div>
        <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>🎤 Real-Time Pitch</h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Sing and see your pitch instantly.</p>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Waveform Canvas */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 12, marginTop: -16,
          boxShadow: isListening ? `0 0 32px ${color}30` : 'none',
          transition: 'box-shadow 0.5s',
        }}>
          <canvas ref={canvasRef} width={448} height={80} style={{ width: '100%', height: 80, display: 'block' }} />
        </div>

        {/* Note Circle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{
            position: 'relative', width: 140, height: 140,
          }}>
            {/* Pulse rings */}
            {status === 'on' && [0, 1].map(i => (
              <div key={i} style={{
                position: 'absolute', inset: -8 - i * 12,
                border: `2px solid ${color}`,
                borderRadius: '50%',
                animation: `pulse-ring 1.2s ease-out infinite`,
                animationDelay: `${i * 0.4}s`,
              }} />
            ))}
            <div style={{
              width: '100%', height: '100%',
              border: `3px solid ${color}`,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${color}15, var(--card))`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              transition: 'border-color 0.3s, background 0.3s',
              boxShadow: `0 0 40px ${color}40`,
            }}>
              <div style={{
                fontSize: status === 'silent' ? 40 : 52,
                fontWeight: 900,
                fontFamily: 'var(--font-mono)',
                color,
                transition: 'color 0.3s',
                lineHeight: 1,
              }}>
                {status === 'silent' ? '🎤' : note.note}
              </div>
              {status !== 'silent' && (
                <div style={{ fontSize: 14, color, fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {note.octave}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Frequency */}
        {frequency > 0 && (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-3)' }}>
              {Math.round(frequency)} Hz
            </span>
          </div>
        )}

        {/* Pitch Meter */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--cyan)', fontWeight: 700 }}>♭ Flat</span>
            <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>In Tune</span>
            <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 700 }}>Sharp ♯</span>
          </div>

          {/* Track */}
          <div style={{ position: 'relative', height: 28, background: 'var(--surface)', borderRadius: 14, overflow: 'visible', border: '1px solid var(--border)' }}>
            {/* Zones */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ flex: 1, background: 'var(--cyan-dim)' }} />
              <div style={{ flex: 0.4, background: 'var(--green-dim)' }} />
              <div style={{ flex: 1, background: 'var(--red-dim)' }} />
            </div>
            {/* Center mark */}
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: 'var(--green)', transform: 'translateX(-50%)', zIndex: 2 }} />
            {/* Needle */}
            <div style={{
              position: 'absolute', top: '50%',
              left: `${needlePos}%`,
              transform: 'translate(-50%, -50%)',
              width: 6, height: 36,
              background: color,
              borderRadius: 3,
              boxShadow: `0 0 12px ${color}`,
              transition: 'left 0.1s ease, background 0.3s, box-shadow 0.3s',
              zIndex: 3,
            }} />
          </div>

          {/* Tick labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingLeft: '2px', paddingRight: '2px' }}>
            {[-50, -25, 0, 25, 50].map(t => (
              <span key={t} style={{ fontSize: 10, color: t === 0 ? 'var(--green)' : 'var(--text-3)', fontFamily: 'var(--font-mono)', fontWeight: t === 0 ? 700 : 400 }}>
                {t > 0 ? `+${t}` : t}
              </span>
            ))}
          </div>
        </div>

        {/* Status badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{
            padding: '10px 24px', borderRadius: 999,
            background: `${color}20`, border: `1px solid ${color}60`,
            fontSize: 16, fontWeight: 700, color,
            transition: 'all 0.3s',
          }}>
            {statusText}
          </div>
        </div>

        {/* Mic button */}
        {error && (
          <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12, fontSize: 13, color: 'var(--red)', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleToggle}
          style={{
            width: '100%', padding: '18px', borderRadius: 'var(--radius-lg)',
            fontSize: 17, fontWeight: 800,
            background: isListening
              ? 'linear-gradient(135deg, #ef4444, #991b1b)'
              : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
            color: '#fff', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: isListening ? '0 0 32px #ef444460' : '0 0 32px #7c3aed60',
            transition: 'all 0.3s',
          }}
        >
          <span style={{ fontSize: 20 }}>{isListening ? '⏹' : '🎤'}</span>
          {isListening ? 'Stop Session' : 'Start Singing'}
        </button>

        {/* Tips */}
        <div style={{ marginTop: 16, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>How to use:</div>
          {[
            ['🟢', 'Green = on pitch! Hold it there'],
            ['🔵', 'Blue = too flat, push higher'],
            ['🔴', 'Red = too sharp, ease lower'],
            ['📊', 'Needle shows cents deviation (-50 to +50)'],
          ].map(([e, t]) => (
            <div key={t} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
              <span>{e}</span>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--primary)', color: '#fff', padding: '12px 24px',
          borderRadius: 999, fontSize: 14, fontWeight: 700,
          boxShadow: '0 8px 32px #7c3aed60', zIndex: 200,
          animation: 'float 0.3s ease',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

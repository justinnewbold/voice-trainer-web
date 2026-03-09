import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Constants ───────────────────────────────────────────────────────────────
const PHASES = {
  idle: null,
  inhale: { label: 'Breathe In', color: '#7c6af7', duration: 4000, scale: 1.5 },
  hold1:  { label: 'Hold',       color: '#a78bfa', duration: 4000, scale: 1.5 },
  exhale: { label: 'Breathe Out',color: '#4ade80', duration: 4000, scale: 1.0 },
  hold2:  { label: 'Hold',       color: '#34d399', duration: 4000, scale: 1.0 },
};
const PHASE_ORDER = ['inhale', 'hold1', 'exhale', 'hold2'];

const WARMUPS = [
  {
    id: 'breathing',
    title: 'Box Breathing',
    subtitle: 'Calm & center your breath',
    icon: '🫁',
    color: '#7c6af7',
    rounds: 4,
    description: 'Breathe in for 4 counts, hold for 4, out for 4, hold for 4. This stabilizes your airflow for singing.',
    type: 'breathing',
  },
  {
    id: 'lip_trill',
    title: 'Lip Trills',
    subtitle: 'Loosen lips & breath support',
    icon: '👄',
    color: '#f472b6',
    rounds: 3,
    description: 'Relax your lips and let them flutter as you breathe out steadily. Great for warming up without strain.',
    type: 'timed',
    steps: [
      { label: 'Relax your face & jaw completely', duration: 5 },
      { label: 'Trill up — low note to high note', duration: 6 },
      { label: 'Trill down — high note to low note', duration: 6 },
      { label: 'Trill on "brrr" — hold steady pitch', duration: 8 },
    ],
  },
  {
    id: 'humming',
    title: 'Humming Scale',
    subtitle: 'Warm the vocal cords gently',
    icon: '🎵',
    color: '#34d399',
    rounds: 3,
    description: 'Hum gently through a scale. Keep your mouth closed, feel the buzz in your nose and lips.',
    type: 'timed',
    steps: [
      { label: 'Hum "mmmm" — comfortable low note', duration: 6 },
      { label: 'Slide up slowly — low → mid', duration: 8 },
      { label: 'Slide up — mid → high', duration: 8 },
      { label: 'Slide all the way back down', duration: 8 },
    ],
  },
  {
    id: 'siren',
    title: 'Vocal Siren',
    subtitle: 'Open your full range',
    icon: '🚀',
    color: '#fb923c',
    rounds: 4,
    description: 'Glide smoothly from your lowest to highest comfortable note and back — like a siren. Use "wee" or "whoop".',
    type: 'timed',
    steps: [
      { label: 'Siren UP — lowest note to highest (say "weeee")', duration: 8 },
      { label: 'Siren DOWN — highest back to lowest', duration: 8 },
      { label: 'Siren UP — go a little higher this time', duration: 8 },
      { label: 'Siren DOWN — land softly on low note', duration: 8 },
    ],
  },
];

// ─── Breathing Animation ─────────────────────────────────────────────────────
function BreathingExercise({ rounds, onComplete }) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [round, setRound] = useState(1);
  const [countdown, setCountdown] = useState(4);
  const [started, setStarted] = useState(false);
  const timerRef = useRef(null);

  const currentPhase = PHASE_ORDER[phaseIdx];
  const phase = PHASES[currentPhase];

  useEffect(() => {
    if (!started) return;
    setCountdown(4);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Advance phase
          setPhaseIdx(pi => {
            const next = pi + 1;
            if (next >= PHASE_ORDER.length) {
              setRound(r => {
                if (r >= rounds) {
                  setTimeout(onComplete, 500);
                  return r;
                }
                return r + 1;
              });
              return 0;
            }
            return next;
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [started, phaseIdx, round]);

  if (!started) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: 32 }}>
        <div style={{ fontSize: 80 }}>🫁</div>
        <p style={{ color: 'var(--text-2)', textAlign: 'center', lineHeight: 1.6 }}>
          4 counts in · 4 hold · 4 out · 4 hold<br/>
          <span style={{ color: 'var(--text-3)', fontSize: 13 }}>Repeat {rounds} rounds</span>
        </p>
        <button onClick={() => setStarted(true)} style={btnStyle('#7c6af7')}>
          Start Breathing
        </button>
      </div>
    );
  }

  const progress = (4 - countdown) / 4;
  const circleSize = 160 + (phase?.scale === 1.5 ? 60 : 0) * progress;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '24px 16px' }}>
      <div style={{ fontSize: 13, color: 'var(--text-3)', letterSpacing: 2, textTransform: 'uppercase' }}>
        Round {round} / {rounds}
      </div>

      {/* Animated circle */}
      <div style={{ position: 'relative', width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer glow ring */}
        <div style={{
          position: 'absolute',
          width: circleSize + 30,
          height: circleSize + 30,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${phase?.color}22 0%, transparent 70%)`,
          transition: 'all 0.3s ease',
        }} />
        {/* Main circle */}
        <div style={{
          width: circleSize,
          height: circleSize,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%, ${phase?.color}cc, ${phase?.color}66)`,
          boxShadow: `0 0 40px ${phase?.color}55`,
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>{countdown}</span>
        </div>
      </div>

      <div style={{ fontSize: 22, fontWeight: 700, color: phase?.color }}>{phase?.label}</div>

      {/* Phase dots */}
      <div style={{ display: 'flex', gap: 8 }}>
        {PHASE_ORDER.map((p, i) => (
          <div key={p} style={{
            width: i === phaseIdx ? 24 : 8, height: 8,
            borderRadius: 4,
            background: i === phaseIdx ? phase?.color : 'var(--border)',
            transition: 'all 0.3s',
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Timed Step Exercise ──────────────────────────────────────────────────────
function TimedExercise({ exercise, onComplete }) {
  const [stepIdx, setStepIdx] = useState(-1);
  const [round, setRound] = useState(1);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

  const currentStep = exercise.steps[stepIdx];

  useEffect(() => {
    if (stepIdx < 0 || stepIdx >= exercise.steps.length) return;
    const step = exercise.steps[stepIdx];
    setCountdown(step.duration);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          const nextStep = stepIdx + 1;
          if (nextStep >= exercise.steps.length) {
            const nextRound = round + 1;
            if (nextRound > exercise.rounds) {
              setTimeout(onComplete, 400);
            } else {
              setRound(nextRound);
              setStepIdx(0);
            }
          } else {
            setStepIdx(nextStep);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [stepIdx, round]);

  if (stepIdx < 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: 32 }}>
        <div style={{ fontSize: 72 }}>{exercise.icon}</div>
        <p style={{ color: 'var(--text-2)', textAlign: 'center', lineHeight: 1.7, fontSize: 15 }}>
          {exercise.description}
        </p>
        <p style={{ color: 'var(--text-3)', fontSize: 13 }}>{exercise.rounds} rounds · {exercise.steps.length} steps each</p>
        <button onClick={() => setStepIdx(0)} style={btnStyle(exercise.color)}>
          Begin {exercise.title}
        </button>
      </div>
    );
  }

  if (!currentStep) return null;

  const progress = countdown / currentStep.duration;
  const arc = progress * 2 * Math.PI * 54; // circumference
  const circumference = 2 * Math.PI * 54;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '24px 16px' }}>
      <div style={{ fontSize: 13, color: 'var(--text-3)', letterSpacing: 2, textTransform: 'uppercase' }}>
        Round {round} / {exercise.rounds}
      </div>

      {/* Countdown ring */}
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <svg width={140} height={140} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={70} cy={70} r={54} fill="none" stroke="var(--border)" strokeWidth={6} />
          <circle
            cx={70} cy={70} r={54}
            fill="none"
            stroke={exercise.color}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - arc}
            style={{ transition: 'stroke-dashoffset 0.9s linear' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 30, fontWeight: 700, color: exercise.color }}>{countdown}</span>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>sec</span>
        </div>
      </div>

      {/* Current step */}
      <div style={{
        background: 'var(--surface-2)',
        borderRadius: 16,
        padding: '16px 24px',
        textAlign: 'center',
        border: `1px solid ${exercise.color}33`,
        width: '100%',
        maxWidth: 320,
      }}>
        <div style={{ fontSize: 11, color: exercise.color, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>
          Step {stepIdx + 1} of {exercise.steps.length}
        </div>
        <div style={{ fontSize: 16, color: 'var(--text-1)', fontWeight: 600, lineHeight: 1.5 }}>
          {currentStep.label}
        </div>
      </div>

      {/* Step dots */}
      <div style={{ display: 'flex', gap: 6 }}>
        {exercise.steps.map((_, i) => (
          <div key={i} style={{
            width: i === stepIdx ? 20 : 7, height: 7,
            borderRadius: 4,
            background: i < stepIdx ? exercise.color : i === stepIdx ? exercise.color : 'var(--border)',
            opacity: i < stepIdx ? 0.4 : 1,
            transition: 'all 0.3s',
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WarmupScreen() {
  const [selected, setSelected] = useState(null);
  const [completed, setCompleted] = useState([]);
  const [done, setDone] = useState(false);

  const handleComplete = useCallback((id) => {
    setCompleted(prev => [...prev, id]);
    setSelected(null);
  }, []);

  const exercise = WARMUPS.find(w => w.id === selected);
  const allDone = WARMUPS.every(w => completed.includes(w.id));

  if (done || allDone) {
    return (
      <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <div style={{ fontSize: 72 }}>🎤</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', textAlign: 'center' }}>
          Warmup Complete!
        </h2>
        <p style={{ color: 'var(--text-2)', textAlign: 'center', lineHeight: 1.7 }}>
          Your voice is ready. You've loosened your lips, warmed your cords, and opened your range.
          Time to sing! 🌟
        </p>
        <button onClick={() => { setCompleted([]); setDone(false); }} style={btnStyle('#7c6af7')}>
          Start Over
        </button>
      </div>
    );
  }

  if (selected && exercise) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 80 }}>
        {/* Header */}
        <div style={{
          padding: '20px 20px 0',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <button
            onClick={() => setSelected(null)}
            style={{ background: 'var(--surface-2)', border: 'none', borderRadius: 10, padding: '8px 12px', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13 }}
          >
            ← Back
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{exercise.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{exercise.subtitle}</div>
          </div>
        </div>

        {exercise.type === 'breathing'
          ? <BreathingExercise rounds={exercise.rounds} onComplete={() => handleComplete(exercise.id)} />
          : <TimedExercise exercise={exercise} onComplete={() => handleComplete(exercise.id)} />
        }
      </div>
    );
  }

  // Exercise List
  return (
    <div style={{ padding: '20px 16px 80px', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>Warmup</h1>
        <p style={{ color: 'var(--text-3)', fontSize: 14, margin: '4px 0 0' }}>
          {completed.length === 0
            ? 'Start with breathing, then warm up your voice'
            : `${completed.length} / ${WARMUPS.length} complete`}
        </p>
      </div>

      {/* Progress bar */}
      {completed.length > 0 && (
        <div style={{ marginBottom: 20, background: 'var(--border)', borderRadius: 4, height: 4 }}>
          <div style={{
            width: `${(completed.length / WARMUPS.length) * 100}%`,
            height: '100%', borderRadius: 4,
            background: 'linear-gradient(90deg, #7c6af7, #4ade80)',
            transition: 'width 0.5s ease',
          }} />
        </div>
      )}

      {/* Suggested order badge */}
      <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
        Suggested order
      </div>

      {/* Exercise cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {WARMUPS.map((w, i) => {
          const isDone = completed.includes(w.id);
          return (
            <button
              key={w.id}
              onClick={() => !isDone && setSelected(w.id)}
              style={{
                background: isDone ? 'var(--surface-2)' : 'var(--surface)',
                border: `1px solid ${isDone ? w.color + '44' : 'var(--border)'}`,
                borderRadius: 16,
                padding: '16px 18px',
                display: 'flex', alignItems: 'center', gap: 14,
                cursor: isDone ? 'default' : 'pointer',
                textAlign: 'left',
                opacity: isDone ? 0.7 : 1,
                transition: 'all 0.2s',
              }}
            >
              {/* Step number / done check */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: isDone ? w.color + '33' : 'var(--surface-2)',
                border: `2px solid ${isDone ? w.color : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isDone ? 16 : 13,
                fontWeight: 700,
                color: isDone ? w.color : 'var(--text-3)',
              }}>
                {isDone ? '✓' : i + 1}
              </div>

              <div style={{ fontSize: 28, flexShrink: 0 }}>{w.icon}</div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: isDone ? 'var(--text-3)' : 'var(--text-1)' }}>
                  {w.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  {w.subtitle} · {w.rounds} rounds
                </div>
              </div>

              {!isDone && (
                <div style={{ color: w.color, fontSize: 20 }}>›</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick start all button */}
      {completed.length === 0 && (
        <button
          onClick={() => setSelected('breathing')}
          style={{ ...btnStyle('#7c6af7'), width: '100%', marginTop: 20 }}
        >
          Start Full Warmup Routine
        </button>
      )}
    </div>
  );
}

function btnStyle(color) {
  return {
    background: `linear-gradient(135deg, ${color}, ${color}bb)`,
    color: '#fff',
    border: 'none',
    borderRadius: 14,
    padding: '14px 28px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${color}44`,
  };
}

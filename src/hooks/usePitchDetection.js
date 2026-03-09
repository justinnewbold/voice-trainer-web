import { useState, useEffect, useRef, useCallback } from 'react';
import { detectPitch, createSmoother, frequencyToNoteInfo, getPitchStatus, getPitchColor } from '../utils/pitch.js';

// 4096 samples @ 44100 Hz = ~93ms window, giving frequency resolution of ~10.8 Hz
// Better for low notes (chest voice, bass singers)
const BUFFER_SIZE = 4096;

export function usePitchDetection() {
  const [state, setState] = useState({
    frequency: -1,
    note: { note: '–', octave: 0, frequency: 0, cents: 0, midiNote: 0 },
    status: 'silent',
    color: '#475569',
    volume: 0,
    confidence: 0,
    isListening: false,
    hasPermission: null,
    error: null,
  });

  const audioCtxRef   = useRef(null);
  const analyserRef   = useRef(null);
  const sourceRef     = useRef(null);
  const rafRef        = useRef(null);
  const streamRef     = useRef(null);
  const bufferRef     = useRef(new Float32Array(BUFFER_SIZE));
  const smootherRef   = useRef(createSmoother());
  const isActiveRef   = useRef(false);

  const analyze = useCallback(() => {
    if (!analyserRef.current || !isActiveRef.current) return;

    analyserRef.current.getFloatTimeDomainData(bufferRef.current);

    // RMS volume
    let sum = 0;
    for (let i = 0; i < bufferRef.current.length; i++) sum += bufferRef.current[i] ** 2;
    const volume = Math.sqrt(sum / bufferRef.current.length);

    const sampleRate = audioCtxRef.current.sampleRate;

    // YIN detection
    const { freq, confidence } = detectPitch(bufferRef.current, sampleRate);

    // Median smoother — eliminates jitter and octave jumps
    const { smoothedFreq, isStable } = smootherRef.current(freq, confidence);

    if (smoothedFreq > 0) {
      const noteInfo = frequencyToNoteInfo(smoothedFreq);
      const status   = getPitchStatus(noteInfo.cents);
      const color    = getPitchColor(status);

      setState(prev => ({
        ...prev,
        frequency:  smoothedFreq,
        note:       noteInfo,
        status,
        color,
        confidence: Math.round(confidence * 100),
        volume:     Math.min(1, volume * 8),
        isStable,
      }));
    } else {
      setState(prev => ({
        ...prev,
        frequency:  -1,
        note:       { note: '–', octave: 0, frequency: 0, cents: 0, midiNote: 0 },
        status:     'silent',
        color:      '#475569',
        confidence: 0,
        volume:     Math.min(1, volume * 8),
        isStable:   false,
      }));
    }

    rafRef.current = requestAnimationFrame(analyze);
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation:  false,
          noiseSuppression:  false,
          autoGainControl:   false,
          sampleRate:        44100,
        },
      });

      streamRef.current = stream;

      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
      audioCtxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = BUFFER_SIZE;
      analyser.smoothingTimeConstant = 0; // No built-in smoothing — we do our own
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      // Reset smoother for fresh session
      smootherRef.current = createSmoother();

      isActiveRef.current = true;
      setState(prev => ({ ...prev, isListening: true, hasPermission: true, error: null }));

      rafRef.current = requestAnimationFrame(analyze);
    } catch (err) {
      const msg =
        err.name === 'NotFoundError'   ? 'No microphone found on this device.' :
        err.name === 'NotAllowedError' ? 'Microphone permission denied. Allow access in your browser settings.' :
        'Could not start microphone.';
      setState(prev => ({ ...prev, hasPermission: false, error: msg, isListening: false }));
    }
  }, [analyze]);

  const stop = useCallback(() => {
    isActiveRef.current = false;
    if (rafRef.current)   cancelAnimationFrame(rafRef.current);
    if (sourceRef.current) sourceRef.current.disconnect();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    audioCtxRef.current = analyserRef.current = sourceRef.current = streamRef.current = null;
    setState(prev => ({
      ...prev,
      isListening: false,
      frequency: -1,
      note: { note: '–', octave: 0, frequency: 0, cents: 0, midiNote: 0 },
      status: 'silent', color: '#475569', confidence: 0, volume: 0,
    }));
  }, []);

  // Expose the stream so useRecorder can tap into it
  const getStream = useCallback(() => streamRef.current, []);

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (rafRef.current)   cancelAnimationFrame(rafRef.current);
      if (sourceRef.current) sourceRef.current.disconnect();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

  return { ...state, start, stop, getStream };
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { detectPitch, frequencyToNoteInfo, getPitchStatus, getPitchColor } from '../utils/pitch.js';

const BUFFER_SIZE = 2048;

export function usePitchDetection() {
  const [state, setState] = useState({
    frequency: -1,
    note: { note: '–', octave: 0, frequency: 0, cents: 0, midiNote: 0 },
    status: 'silent',
    color: '#475569',
    volume: 0,
    isListening: false,
    hasPermission: null,
    error: null,
  });

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const bufferRef = useRef(new Float32Array(BUFFER_SIZE));
  const isActiveRef = useRef(false);

  const analyze = useCallback(() => {
    if (!analyserRef.current || !isActiveRef.current) return;

    analyserRef.current.getFloatTimeDomainData(bufferRef.current);

    // RMS volume
    let sum = 0;
    for (let i = 0; i < bufferRef.current.length; i++) {
      sum += bufferRef.current[i] * bufferRef.current[i];
    }
    const volume = Math.sqrt(sum / bufferRef.current.length);

    const sampleRate = audioCtxRef.current.sampleRate;
    const freq = detectPitch(bufferRef.current, sampleRate);

    if (freq > 60 && freq < 1200) {
      const noteInfo = frequencyToNoteInfo(freq);
      const status = getPitchStatus(noteInfo.cents);
      const color = getPitchColor(status);
      setState(prev => ({
        ...prev,
        frequency: freq,
        note: noteInfo,
        status,
        color,
        volume: Math.min(1, volume * 8),
      }));
    } else {
      setState(prev => ({
        ...prev,
        frequency: -1,
        note: { note: '–', octave: 0, frequency: 0, cents: 0, midiNote: 0 },
        status: 'silent',
        color: '#475569',
        volume: Math.min(1, volume * 8),
      }));
    }

    rafRef.current = requestAnimationFrame(analyze);
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      streamRef.current = stream;

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = BUFFER_SIZE;
      analyser.smoothingTimeConstant = 0;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      isActiveRef.current = true;
      setState(prev => ({ ...prev, isListening: true, hasPermission: true, error: null }));

      rafRef.current = requestAnimationFrame(analyze);
    } catch (err) {
      let errorMsg = 'Microphone access denied.';
      if (err.name === 'NotFoundError') errorMsg = 'No microphone found.';
      else if (err.name === 'NotAllowedError') errorMsg = 'Microphone permission denied. Please allow access.';
      setState(prev => ({ ...prev, hasPermission: false, error: errorMsg, isListening: false }));
    }
  }, [analyze]);

  const stop = useCallback(() => {
    isActiveRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (sourceRef.current) sourceRef.current.disconnect();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    setState(prev => ({
      ...prev,
      isListening: false,
      frequency: -1,
      note: { note: '–', octave: 0, frequency: 0, cents: 0, midiNote: 0 },
      status: 'silent',
      color: '#475569',
      volume: 0,
    }));
  }, []);

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (sourceRef.current) sourceRef.current.disconnect();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

  return { ...state, start, stop };
}

// ─── Cross-Browser Audio Compatibility ──────────────────────────────────────
// Handles Safari quirks, AudioContext resume, feature detection, and graceful
// error states for all browsers including mobile Safari and older Android.

/**
 * Feature detection — checks what audio APIs are available
 */
export function detectAudioSupport() {
  const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext);
  const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasMediaRecorder = typeof MediaRecorder !== 'undefined';

  // Safari-specific checks
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return {
    hasAudioContext,
    hasGetUserMedia,
    hasMediaRecorder,
    isSafari,
    isIOS,
    isMobile,
    isFullySupported: hasAudioContext && hasGetUserMedia,
    // MediaRecorder not available in some Safari versions — not a blocker for pitch detection
    canRecord: hasMediaRecorder,
  };
}

/**
 * Creates an AudioContext with Safari compatibility
 * Safari requires AudioContext to be created in response to a user gesture,
 * and often starts in 'suspended' state.
 */
export async function createAudioContext(sampleRate = 44100) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    throw new AudioCompatError('NO_AUDIO_CONTEXT', 'Your browser does not support Web Audio API.');
  }

  const ctx = new AudioCtx({ sampleRate });

  // Safari often starts AudioContext in 'suspended' state
  // Must be resumed in response to user gesture
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (e) {
      // If resume fails, it might need a user gesture — we'll try again later
      console.warn('AudioContext resume failed, may need user gesture:', e);
    }
  }

  return ctx;
}

/**
 * Request microphone with cross-browser constraints
 * Safari doesn't support all constraint options, so we fall back gracefully.
 */
export async function requestMicrophone() {
  const support = detectAudioSupport();

  if (!support.hasGetUserMedia) {
    throw new AudioCompatError(
      'NO_MEDIA_DEVICES',
      'Your browser does not support microphone access. Try using Chrome, Firefox, or Safari 14+.'
    );
  }

  // Ideal constraints for pitch detection (disable processing that interferes)
  const idealConstraints = {
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      sampleRate: 44100,
    }
  };

  // Safari fallback — doesn't support all constraint options
  const safariConstraints = {
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
    }
  };

  // Basic fallback for very old browsers
  const basicConstraints = { audio: true };

  try {
    return await navigator.mediaDevices.getUserMedia(idealConstraints);
  } catch (err) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      throw new AudioCompatError(
        'PERMISSION_DENIED',
        'Microphone access was denied. To use Voice Trainer, allow microphone access in your browser settings.'
      );
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      throw new AudioCompatError(
        'NO_MICROPHONE',
        'No microphone was found on this device. Please connect a microphone and try again.'
      );
    }
    if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
      // Try Safari constraints
      try {
        return await navigator.mediaDevices.getUserMedia(safariConstraints);
      } catch {
        // Try basic
        try {
          return await navigator.mediaDevices.getUserMedia(basicConstraints);
        } catch (finalErr) {
          throw new AudioCompatError(
            'MIC_UNAVAILABLE',
            'Could not access the microphone. Please close other apps that might be using it and try again.'
          );
        }
      }
    }
    // NotReadableError — mic is in use by another app
    if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      throw new AudioCompatError(
        'MIC_IN_USE',
        'The microphone is being used by another app. Close other apps using the mic and try again.'
      );
    }
    // Catch-all
    throw new AudioCompatError(
      'MIC_UNKNOWN',
      'Could not start the microphone. Try refreshing the page or using a different browser.'
    );
  }
}

/**
 * Check microphone permission status without triggering the prompt
 */
export async function checkMicPermission() {
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const result = await navigator.permissions.query({ name: 'microphone' });
      return result.state; // 'granted', 'denied', 'prompt'
    }
  } catch {
    // permissions API not available (some Safari versions)
  }
  return 'unknown';
}

/**
 * Estimate environment noise level from an audio buffer
 * Returns a noise level from 0 (silent) to 1 (very noisy)
 */
export function estimateNoiseLevel(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sum / buffer.length);
  // Map RMS to 0-1 range. Typical speaking is 0.05-0.3, noisy room > 0.1
  return Math.min(1, rms * 5);
}

/**
 * Custom error class for audio compatibility issues
 */
export class AudioCompatError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'AudioCompatError';
  }
}

/**
 * Get a user-friendly error message and suggested action
 */
export function getErrorInfo(error) {
  if (error instanceof AudioCompatError) {
    const info = {
      NO_AUDIO_CONTEXT: {
        icon: '🔇',
        title: 'Browser Not Supported',
        message: error.message,
        action: 'Try opening this app in Chrome, Firefox, or Safari 14+.',
        canRetry: false,
      },
      NO_MEDIA_DEVICES: {
        icon: '🔇',
        title: 'Browser Not Supported',
        message: error.message,
        action: 'Try a modern browser like Chrome or Firefox.',
        canRetry: false,
      },
      PERMISSION_DENIED: {
        icon: '🎤',
        title: 'Microphone Blocked',
        message: error.message,
        action: 'Tap the lock icon in your address bar → Site Settings → Allow Microphone.',
        canRetry: true,
      },
      NO_MICROPHONE: {
        icon: '🔌',
        title: 'No Microphone Found',
        message: error.message,
        action: 'Connect a microphone or headset and try again.',
        canRetry: true,
      },
      MIC_IN_USE: {
        icon: '⚠️',
        title: 'Microphone Busy',
        message: error.message,
        action: 'Close other apps using the mic (Zoom, FaceTime, etc.) then try again.',
        canRetry: true,
      },
      MIC_UNAVAILABLE: {
        icon: '⚠️',
        title: 'Microphone Unavailable',
        message: error.message,
        action: 'Try refreshing the page or restarting your browser.',
        canRetry: true,
      },
      MIC_UNKNOWN: {
        icon: '❓',
        title: 'Microphone Error',
        message: error.message,
        action: 'Try refreshing the page.',
        canRetry: true,
      },
    };
    return info[error.code] || info.MIC_UNKNOWN;
  }

  return {
    icon: '❓',
    title: 'Unexpected Error',
    message: error.message || 'Something went wrong.',
    action: 'Try refreshing the page.',
    canRetry: true,
  };
}

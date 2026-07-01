/**
 * Web Audio API synthesizer for NovaQuant trading bot notifications.
 * This synthesizes precise electronic notifications client-side without external dependencies.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    // Standard and prefixed AudioContext support
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  
  // Resume context if suspended (browser security blocks audio until first click)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  return audioCtx;
}

/**
 * Helper to play a sine oscillator note with adjustable ADSR style envelope
 */
function playTone({
  frequency,
  type = 'sine',
  duration = 0.3,
  gainStart = 0.15,
  gainEnd = 0.001,
  delay = 0,
  pitchSlide = 0
}: {
  frequency: number;
  type?: OscillatorType;
  duration?: number;
  gainStart?: number;
  gainEnd?: number;
  delay?: number;
  pitchSlide?: number;
}) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
    
    if (pitchSlide !== 0) {
      osc.frequency.exponentialRampToValueAtTime(
        frequency + pitchSlide, 
        ctx.currentTime + delay + duration
      );
    }
    
    gainNode.gain.setValueAtTime(gainStart, ctx.currentTime + delay);
    // Exponential decay
    gainNode.gain.exponentialRampToValueAtTime(gainEnd, ctx.currentTime + delay + duration);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch (e) {
    console.error('NovaQuant Audio Synth Error:', e);
  }
}

/**
 * Plays sound for entering any trading position
 */
export function playTradeEntry() {
  // A clean, ascending digital trigger (C5 to G5 fast slide)
  playTone({
    frequency: 523.25, // C5
    type: 'sine',
    duration: 0.12,
    gainStart: 0.12,
    pitchSlide: 260, // slides up to 784Hz (G5)
  });
  
  // Secondary subtle accent sparkle
  playTone({
    frequency: 1046.50, // C6
    type: 'sine',
    duration: 0.25,
    gainStart: 0.04,
    delay: 0.05,
    gainEnd: 0.0001
  });
}

/**
 * Plays sound for exiting with positive profit
 */
export function playTradeExitProfit() {
  // Major Triad Chime (C5 -> E5 -> G5 -> C6)
  const baseDelay = 0.07;
  
  // C5 (523 Hz)
  playTone({
    frequency: 523.25,
    type: 'sine',
    duration: 0.25,
    gainStart: 0.1,
    delay: 0,
  });
  
  // E5 (659 Hz)
  playTone({
    frequency: 659.25,
    type: 'sine',
    duration: 0.25,
    gainStart: 0.1,
    delay: baseDelay,
  });
  
  // G5 (784 Hz)
  playTone({
    frequency: 783.99,
    type: 'sine',
    duration: 0.3,
    gainStart: 0.1,
    delay: baseDelay * 2,
  });
  
  // C6 (1046 Hz)
  playTone({
    frequency: 1046.50,
    type: 'triangle',
    duration: 0.45,
    gainStart: 0.12,
    delay: baseDelay * 3,
  });
}

/**
 * Plays sound for exiting with stop loss or direct loss
 */
export function playTradeExitLoss() {
  // Low descending alert buzzer/alarm sequence
  // Two rapid heavy notes sliding downwards (stern warn tone)
  
  // First note: Ab4 (415 Hz) to F4 (349 Hz) slide
  playTone({
    frequency: 415.30,
    type: 'triangle',
    duration: 0.18,
    gainStart: 0.18,
    pitchSlide: -66, // slides down to 349Hz (F4)
  });
  
  // Second note: Db4 (277 Hz) to Bb3 (233 Hz) slide with buzz
  playTone({
    frequency: 277.18,
    type: 'sawtooth',
    duration: 0.35,
    gainStart: 0.14,
    delay: 0.14,
    pitchSlide: -44, // slides down to Bb3
    gainEnd: 0.0001
  });
}

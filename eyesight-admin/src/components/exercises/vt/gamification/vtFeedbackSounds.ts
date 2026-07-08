/**
 * VT Quest — lightweight trial feedback sounds (Web Audio API, no asset files).
 * Unlocks on first user interaction (browser autoplay policy).
 */

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx) sharedCtx = new Ctx();
  if (sharedCtx.state === 'suspended') {
    void sharedCtx.resume();
  }
  return sharedCtx;
}

function playNote(
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  durationSec: number,
  volume: number,
  type: OscillatorType = 'sine'
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0001), startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.05);
}

/** Pleasant ascending chime when answer is correct. */
export function playVtCorrectSound(comboMilestone = false): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  playNote(ctx, 523.25, t, 0.12, 0.18);
  playNote(ctx, 659.25, t + 0.09, 0.14, 0.15);
  if (comboMilestone) {
    playNote(ctx, 783.99, t + 0.18, 0.16, 0.16, 'triangle');
    playNote(ctx, 987.77, t + 0.28, 0.22, 0.12, 'triangle');
  }
}

/** Soft low tone when answer is wrong — encouraging, not punishing. */
export function playVtWrongSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  playNote(ctx, 233.08, t, 0.18, 0.1);
  playNote(ctx, 174.61, t + 0.12, 0.22, 0.08, 'triangle');
}

export function playVtTrialFeedback(correct: boolean, comboMilestone = false): void {
  if (correct) playVtCorrectSound(comboMilestone);
  else playVtWrongSound();
}

/** Reset shared context (tests). */
export function resetVtFeedbackAudioForTests(): void {
  sharedCtx = null;
}

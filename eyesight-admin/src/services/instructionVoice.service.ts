const INSTRUCTION_VOICE_KEY = 'eyesight_instruction_voice';

export interface InstructionVoiceSettings {
  /** Auto-play instruction audio during exam / VT. */
  enabled: boolean;
  /** Playback speed multiplier (HTMLAudioElement.playbackRate). */
  rate: number;
}

export const INSTRUCTION_VOICE_RATE_MIN = 0.5;
export const INSTRUCTION_VOICE_RATE_MAX = 1.1;
export const INSTRUCTION_VOICE_RATE_DEFAULT = 0.8;

const DEFAULT_SETTINGS: InstructionVoiceSettings = {
  enabled: true,
  rate: INSTRUCTION_VOICE_RATE_DEFAULT,
};

function clampRate(rate: number): number {
  if (Number.isNaN(rate)) return INSTRUCTION_VOICE_RATE_DEFAULT;
  return Math.min(INSTRUCTION_VOICE_RATE_MAX, Math.max(INSTRUCTION_VOICE_RATE_MIN, rate));
}

export function loadInstructionVoiceSettings(): InstructionVoiceSettings {
  try {
    const raw = localStorage.getItem(INSTRUCTION_VOICE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<InstructionVoiceSettings>;
    return {
      enabled: parsed.enabled !== false,
      rate: clampRate(Number(parsed.rate ?? INSTRUCTION_VOICE_RATE_DEFAULT)),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Representative clips for settings preview (long enough to hear speed changes). */
export const INSTRUCTION_VOICE_PREVIEW_SAMPLE_IDS = [
  'exam_glasses_cover',
  'exam_no_hints',
  'exam_lighting',
] as const;

export function saveInstructionVoiceSettings(settings: InstructionVoiceSettings): void {
  localStorage.setItem(
    INSTRUCTION_VOICE_KEY,
    JSON.stringify({
      enabled: settings.enabled,
      rate: clampRate(settings.rate),
    })
  );
}

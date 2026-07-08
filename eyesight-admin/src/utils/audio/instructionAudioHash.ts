import type { AudioSampleLang } from './instructionAudioSamples';

/** Stable hash input for manifest entries and regeneration checks. */
export function buildInstructionAudioHashInput(
  lang: AudioSampleLang,
  text: string,
  voiceId: string,
  rate: number
): string {
  return `${lang}|${text.trim()}|${voiceId}|${rate.toFixed(2)}`;
}

export async function hashInstructionAudioContent(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

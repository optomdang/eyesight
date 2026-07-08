import {
  INSTRUCTION_VOICE_RATE_DEFAULT,
  INSTRUCTION_VOICE_RATE_MAX,
  INSTRUCTION_VOICE_RATE_MIN,
} from 'src/services/instructionVoice.service';
import type { AudioSampleLang } from './instructionAudioSamples';
import { normalizeInstructionLang, resolveInstructionAudioUrl } from './instructionAudioResolver';

export function clampInstructionPlaybackRate(rate: number): number {
  if (Number.isNaN(rate)) return INSTRUCTION_VOICE_RATE_DEFAULT;
  return Math.min(INSTRUCTION_VOICE_RATE_MAX, Math.max(INSTRUCTION_VOICE_RATE_MIN, rate));
}

function playOneSample(
  sampleId: string,
  lang: AudioSampleLang,
  rate: number,
  generation: number,
  generationRef: { current: number }
): Promise<void> {
  if (generation !== generationRef.current) {
    return Promise.reject(new Error('aborted'));
  }

  const url = resolveInstructionAudioUrl(lang, sampleId);
  const audio = new Audio(url);
  audio.playbackRate = clampInstructionPlaybackRate(rate);

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    audio.onended = () => finish(resolve);
    audio.onerror = () => finish(() => reject(new Error(`Không tải được âm thanh: ${sampleId}`)));

    void audio.play().catch((err: unknown) => {
      finish(() => {
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          reject(new Error('Trình duyệt chặn phát tự động. Hãy bấm Nghe thử lại.'));
          return;
        }
        reject(err instanceof Error ? err : new Error('Phát âm thanh thất bại'));
      });
    });
  });
}

/** Play MP3 samples sequentially (shared by hook + settings preview). */
export async function playInstructionSampleQueue(
  sampleIds: string[],
  langInput: AudioSampleLang | string,
  rate: number,
  generationRef: { current: number },
  generation: number
): Promise<void> {
  const lang = normalizeInstructionLang(langInput);
  const ids = sampleIds.filter(Boolean);
  if (ids.length === 0) return;

  for (const sampleId of ids) {
    if (generation !== generationRef.current) {
      throw new Error('aborted');
    }
    await playOneSample(sampleId, lang, rate, generation, generationRef);
  }
}

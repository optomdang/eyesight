import { useCallback, useEffect, useRef, useState } from 'react';
import {
  INSTRUCTION_VOICE_RATE_DEFAULT,
  loadInstructionVoiceSettings,
} from 'src/services/instructionVoice.service';
import type { AudioSampleLang } from 'src/utils/audio/instructionAudioSamples';
import { playInstructionSampleQueue } from 'src/utils/audio/instructionAudioPlayer';
import { normalizeInstructionLang } from 'src/utils/audio/instructionAudioResolver';

export interface InstructionAudioPlaybackOptions {
  lang?: AudioSampleLang;
  /** Overrides user setting when provided (e.g. preview). */
  enabled?: boolean;
  rate?: number;
  /**
   * When set, skip restarting the same queue within a short window (avoids React re-mount duplicates).
   * Do not use for manual preview buttons.
   */
  dedupeKey?: string;
}

const DEDUPE_WINDOW_MS = 4000;
const recentDedupeKeys = new Map<string, number>();

function shouldSkipDedupe(dedupeKey: string): boolean {
  const now = Date.now();
  const last = recentDedupeKeys.get(dedupeKey) ?? 0;
  if (now - last < DEDUPE_WINDOW_MS) return true;
  recentDedupeKeys.set(dedupeKey, now);
  return false;
}

export function useInstructionAudioPlayback(defaultLang: AudioSampleLang = 'vi') {
  const [playing, setPlaying] = useState(false);
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const queueRef = useRef<string[]>([]);
  const optionsRef = useRef<InstructionAudioPlaybackOptions>({ lang: defaultLang });
  const generationRef = useRef(0);

  const stop = useCallback(() => {
    generationRef.current += 1;
    queueRef.current = [];
    setPlaying(false);
    setActiveSampleId(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const runQueue = useCallback(
    async (generation: number) => {
      const settings = loadInstructionVoiceSettings();
      const lang = normalizeInstructionLang(optionsRef.current.lang ?? defaultLang);
      const rate =
        optionsRef.current.rate != null
          ? optionsRef.current.rate
          : settings.rate ?? INSTRUCTION_VOICE_RATE_DEFAULT;

      const ids = [...queueRef.current];
      queueRef.current = [];

      try {
        setPlaying(true);
        setLastError(null);
        await playInstructionSampleQueue(ids, lang, rate, generationRef, generation);
      } catch (err) {
        if (generation !== generationRef.current) return;
        if (err instanceof Error && err.message === 'aborted') return;
        setLastError(err instanceof Error ? err.message : 'Phát âm thanh thất bại');
      } finally {
        if (generation === generationRef.current) {
          setPlaying(false);
          setActiveSampleId(null);
        }
      }
    },
    [defaultLang]
  );

  const startQueue = useCallback(
    (sampleIds: string[], options: InstructionAudioPlaybackOptions = {}) => {
      const settings = loadInstructionVoiceSettings();
      const enabled = options.enabled ?? settings.enabled;
      if (!enabled) return;

      const ids = sampleIds.filter(Boolean);
      if (ids.length === 0) return;

      if (options.dedupeKey && shouldSkipDedupe(options.dedupeKey)) {
        return;
      }

      generationRef.current += 1;
      const generation = generationRef.current;
      optionsRef.current = { lang: defaultLang, ...options };
      queueRef.current = ids;
      setLastError(null);
      void runQueue(generation);
    },
    [defaultLang, runQueue]
  );

  const speak = useCallback(
    (sampleId: string, options: InstructionAudioPlaybackOptions = {}) => {
      startQueue([sampleId], options);
    },
    [startQueue]
  );

  const speakQueue = useCallback(
    (sampleIds: string[], options: InstructionAudioPlaybackOptions = {}) => {
      startQueue(sampleIds, options);
    },
    [startQueue]
  );

  return {
    playing,
    activeSampleId,
    lastError,
    speak,
    speakQueue,
    stop,
  };
}

/**
 * Auto-play a sample queue once per stable key (mount / exam step). Cleans up on unmount.
 */
export function useAutoInstructionAudioQueue(
  sampleIds: string[],
  options: InstructionAudioPlaybackOptions & { enabled?: boolean } = {}
) {
  const lang = normalizeInstructionLang(options.lang ?? 'vi');
  const { speakQueue, stop } = useInstructionAudioPlayback(lang);
  const queueKey = sampleIds.join('\0');
  const speakQueueRef = useRef(speakQueue);
  const stopRef = useRef(stop);
  speakQueueRef.current = speakQueue;
  stopRef.current = stop;

  useEffect(() => {
    if (options.enabled === false || sampleIds.length === 0) return;

    const dedupeKey = options.dedupeKey ?? `auto:${lang}:${queueKey}`;
    speakQueueRef.current(sampleIds, { ...options, lang, dedupeKey });

    return () => stopRef.current();
  }, [queueKey, lang, options.enabled, options.dedupeKey, options.rate]);
}

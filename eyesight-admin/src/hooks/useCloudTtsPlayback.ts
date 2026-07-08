import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  synthesizeCloudTts,
  type CloudTtsProvider,
  type CloudTtsSynthesizeRequest,
} from 'src/services/ttsPreview.service';

export interface CloudTtsPlaybackOptions {
  provider: CloudTtsProvider;
  voiceId: string;
  lang: 'vi' | 'en';
  rate?: number;
}

function formatCloudTtsError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === 'string') return msg;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Cloud TTS failed';
}

export function useCloudTtsPlayback() {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const queueRef = useRef<{ id: string; text: string }[]>([]);
  const optionsRef = useRef<CloudTtsPlaybackOptions | null>(null);
  const stopRequestedRef = useRef(false);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    stopRequestedRef.current = true;
    queueRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    revokeObjectUrl();
    setPlaying(false);
    setLoading(false);
    setActiveSampleId(null);
  }, [revokeObjectUrl]);

  useEffect(() => () => stop(), [stop]);

  const playBase64 = useCallback(
    (audioBase64: string, contentType: string): Promise<void> =>
      new Promise((resolve, reject) => {
        revokeObjectUrl();
        const bytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: contentType || 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error('Audio playback failed'));
        void audio.play().catch(reject);
      }),
    [revokeObjectUrl]
  );

  const playNextInQueue = useCallback(async () => {
    if (stopRequestedRef.current || !optionsRef.current) {
      stop();
      return;
    }

    const next = queueRef.current.shift();
    if (!next) {
      setPlaying(false);
      setLoading(false);
      setActiveSampleId(null);
      return;
    }

    setActiveSampleId(next.id);
    setLoading(true);
    setError(null);

    try {
      const payload: CloudTtsSynthesizeRequest = {
        provider: optionsRef.current.provider,
        voiceId: optionsRef.current.voiceId,
        text: next.text,
        lang: optionsRef.current.lang,
        rate: optionsRef.current.rate,
      };
      const result = await synthesizeCloudTts(payload);
      setLoading(false);
      setPlaying(true);
      await playBase64(result.audioBase64, result.contentType);
      await playNextInQueue();
    } catch (err) {
      setError(formatCloudTtsError(err));
      stop();
    }
  }, [playBase64, stop]);

  const speak = useCallback(
    (text: string, sampleId: string, options: CloudTtsPlaybackOptions) => {
      stop();
      stopRequestedRef.current = false;
      optionsRef.current = options;
      queueRef.current = [{ id: sampleId, text }];
      setPlaying(true);
      void playNextInQueue();
    },
    [stop, playNextInQueue]
  );

  const speakQueue = useCallback(
    (items: { id: string; text: string }[], options: CloudTtsPlaybackOptions) => {
      stop();
      stopRequestedRef.current = false;
      optionsRef.current = options;
      queueRef.current = items.filter((i) => i.text.trim());
      if (queueRef.current.length === 0) return;
      setPlaying(true);
      void playNextInQueue();
    },
    [stop, playNextInQueue]
  );

  return {
    playing,
    loading,
    activeSampleId,
    error,
    speak,
    speakQueue,
    stop,
  };
}

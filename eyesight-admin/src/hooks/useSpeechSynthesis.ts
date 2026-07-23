import { useCallback, useEffect, useRef, useState } from 'react';

export interface SpeechSynthesisOptions {
  voiceUri?: string;
  lang?: string;
  rate?: number;
  pitch?: number;
}

const DEFAULT_RATE = 0.8;
const DEFAULT_PITCH = 1;

function resolveVoice(
  voices: SpeechSynthesisVoice[],
  voiceUri: string | undefined,
  lang: string | undefined
): SpeechSynthesisVoice | undefined {
  if (voiceUri) {
    const match = voices.find((v) => v.voiceURI === voiceUri);
    if (match) return match;
  }
  if (!lang) return undefined;
  const prefix = lang.toLowerCase();
  return (
    voices.find((v) => v.lang.toLowerCase() === prefix) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix.split('-')[0]))
  );
}

export function useSpeechSynthesis() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
  const queueRef = useRef<{ id: string; text: string }[]>([]);
  const optionsRef = useRef<SpeechSynthesisOptions>({});
  const stopRequestedRef = useRef(false);

  const supported =
    typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  const refreshVoices = useCallback(() => {
    if (!supported) return;
    setVoices(window.speechSynthesis.getVoices());
  }, [supported]);

  useEffect(() => {
    if (!supported) return;
    refreshVoices();
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices);
      window.speechSynthesis.cancel();
    };
  }, [supported, refreshVoices]);

  const stop = useCallback(() => {
    if (!supported) return;
    stopRequestedRef.current = true;
    queueRef.current = [];
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setActiveSampleId(null);
  }, [supported]);

  const speakNextInQueue = useCallback(() => {
    if (!supported || stopRequestedRef.current) {
      setSpeaking(false);
      setActiveSampleId(null);
      return;
    }

    const next = queueRef.current.shift();
    if (!next) {
      setSpeaking(false);
      setActiveSampleId(null);
      return;
    }

    setActiveSampleId(next.id);
    const utterance = new SpeechSynthesisUtterance(next.text);
    const opts = optionsRef.current;
    const voice = resolveVoice(window.speechSynthesis.getVoices(), opts.voiceUri, opts.lang);
    if (voice) utterance.voice = voice;
    if (opts.lang) utterance.lang = opts.lang;
    utterance.rate = opts.rate ?? DEFAULT_RATE;
    utterance.pitch = opts.pitch ?? DEFAULT_PITCH;

    utterance.onend = () => speakNextInQueue();
    utterance.onerror = () => speakNextInQueue();

    window.speechSynthesis.speak(utterance);
  }, [supported]);

  const speak = useCallback(
    (text: string, sampleId: string, options: SpeechSynthesisOptions = {}) => {
      if (!supported || !text.trim()) return;
      stop();
      stopRequestedRef.current = false;
      optionsRef.current = options;
      queueRef.current = [{ id: sampleId, text: text.trim() }];
      setSpeaking(true);
      speakNextInQueue();
    },
    [supported, stop, speakNextInQueue]
  );

  const speakQueue = useCallback(
    (items: { id: string; text: string }[], options: SpeechSynthesisOptions = {}) => {
      if (!supported || items.length === 0) return;
      stop();
      stopRequestedRef.current = false;
      optionsRef.current = options;
      queueRef.current = items.map((item) => ({ id: item.id, text: item.text.trim() })).filter((i) => i.text);
      if (queueRef.current.length === 0) return;
      setSpeaking(true);
      speakNextInQueue();
    },
    [supported, stop, speakNextInQueue]
  );

  return {
    supported,
    voices,
    speaking,
    activeSampleId,
    speak,
    speakQueue,
    stop,
    refreshVoices,
  };
}

export function filterVoicesByLang(
  voices: SpeechSynthesisVoice[],
  lang: 'vi' | 'en' | 'all'
): SpeechSynthesisVoice[] {
  if (lang === 'all') return voices;
  const prefix = lang === 'vi' ? 'vi' : 'en';
  return voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
}

export function langToBcp47(lang: 'vi' | 'en'): string {
  return lang === 'vi' ? 'vi-VN' : 'en-US';
}

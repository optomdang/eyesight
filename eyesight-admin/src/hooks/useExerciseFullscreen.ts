import { useCallback, useEffect, useRef, type RefObject } from 'react';

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
};

type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
  webkitFullscreenElement?: Element | null;
  msFullscreenElement?: Element | null;
};

function getFullscreenElement(): Element | null {
  const doc = document as FullscreenDocument;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? doc.msFullscreenElement ?? null;
}

export async function requestExerciseFullscreen(el: HTMLElement | null): Promise<void> {
  if (!el) return;
  const fullscreenEl = el as FullscreenElement;
  if (fullscreenEl.requestFullscreen) {
    await fullscreenEl.requestFullscreen();
    return;
  }
  if (fullscreenEl.webkitRequestFullscreen) {
    await fullscreenEl.webkitRequestFullscreen();
    return;
  }
  if (fullscreenEl.msRequestFullscreen) {
    await fullscreenEl.msRequestFullscreen();
  }
}

async function exitDocumentFullscreen(): Promise<void> {
  const doc = document as FullscreenDocument;
  if (document.exitFullscreen) {
    await document.exitFullscreen();
    return;
  }
  if (doc.webkitExitFullscreen) {
    await doc.webkitExitFullscreen();
    return;
  }
  if (doc.msExitFullscreen) {
    await doc.msExitFullscreen();
  }
}

/**
 * Enter browser fullscreen (F11-like) for the exercise container.
 * Retries once on first user interaction if the browser blocks auto-entry.
 */
export function useExerciseFullscreen(containerRef: RefObject<HTMLElement | null>, enabled = true): void {
  const enteredRef = useRef(false);
  const retryHandlerRef = useRef<(() => void) | null>(null);

  const enterFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el || !enabled || enteredRef.current) return;

    if (getFullscreenElement() === el) {
      enteredRef.current = true;
      return;
    }

    try {
      await requestExerciseFullscreen(el);
      enteredRef.current = true;
    } catch {
      // Browsers often require a user gesture — retry on first tap/click.
      if (retryHandlerRef.current) return;

      const retry = async () => {
        document.removeEventListener('pointerdown', retry);
        document.removeEventListener('keydown', retry);
        retryHandlerRef.current = null;
        try {
          await requestExerciseFullscreen(el);
          enteredRef.current = true;
        } catch {
          // User can still play windowed.
        }
      };

      retryHandlerRef.current = retry;
      document.addEventListener('pointerdown', retry, { once: true });
      document.addEventListener('keydown', retry, { once: true });
    }
  }, [containerRef, enabled]);

  useEffect(() => {
    if (!enabled) return;

    void enterFullscreen();

    return () => {
      if (retryHandlerRef.current) {
        document.removeEventListener('pointerdown', retryHandlerRef.current);
        document.removeEventListener('keydown', retryHandlerRef.current);
        retryHandlerRef.current = null;
      }

      const el = containerRef.current;
      const active = getFullscreenElement();
      if (el && active === el) {
        void exitDocumentFullscreen().catch(() => {});
      }
    };
  }, [enabled, enterFullscreen, containerRef]);
}

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

const RESTORE_BTN_ID = 'exercise-fullscreen-restore-btn';

/**
 * Inject (or remove) a fixed floating "restore fullscreen" button on document.body.
 * The button is shared across all exercises — only one instance is shown at a time.
 */
function syncRestoreButton(show: boolean, onClick: () => void): void {
  let btn = document.getElementById(RESTORE_BTN_ID) as HTMLButtonElement | null;

  if (!show) {
    btn?.remove();
    return;
  }

  if (!btn) {
    btn = document.createElement('button');
    btn.id = RESTORE_BTN_ID;
    btn.title = 'Toàn màn hình (F11)';
    btn.textContent = '⛶';
    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: '999999',
      background: 'rgba(10,8,30,0.82)',
      color: 'rgba(255,255,255,0.9)',
      border: '1.5px solid rgba(255,255,255,0.28)',
      borderRadius: '10px',
      padding: '8px 14px',
      fontSize: '20px',
      lineHeight: '1',
      cursor: 'pointer',
      backdropFilter: 'blur(6px)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
      transition: 'opacity 0.2s, transform 0.2s',
    });
    btn.onmouseenter = () => {
      (btn as HTMLButtonElement).style.opacity = '1';
      (btn as HTMLButtonElement).style.transform = 'scale(1.08)';
    };
    btn.onmouseleave = () => {
      (btn as HTMLButtonElement).style.opacity = '0.8';
      (btn as HTMLButtonElement).style.transform = 'scale(1)';
    };
    btn.style.opacity = '0.8';
    document.body.appendChild(btn);
  }

  btn.onclick = onClick;
}

/**
 * Enter browser fullscreen (F11-like) for the exercise container.
 * Retries once on first user interaction if the browser blocks auto-entry.
 * Also injects a floating "restore fullscreen" button whenever the browser
 * exits fullscreen unexpectedly — applies automatically to every exercise.
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

  // Floating restore button: show when exercise is active but not in fullscreen.
  useEffect(() => {
    if (!enabled) return;

    const restoreClick = () => void requestExerciseFullscreen(containerRef.current);

    const onFullscreenChange = () => {
      syncRestoreButton(!getFullscreenElement(), restoreClick);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    // Initial state: if already windowed when exercise mounts, show the button.
    syncRestoreButton(!getFullscreenElement(), restoreClick);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      syncRestoreButton(false, restoreClick);
    };
  }, [enabled, containerRef]);

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

/**
 * Optotype chart fonts used by exam + Far Acuity.
 * Preloads faces so FOUT is rare; never permanently hide letters if check() flakes.
 */
import 'src/features/portal/views/exam/components/exam-fonts.css';
import { FONT_MAP } from 'src/utils/constant';
import { useEffect, useState } from 'react';

/** All chart font-family names used by exam / Far Acuity. */
export const OPTOTYPE_FONT_FAMILIES = Array.from(
  new Set(Object.values(FONT_MAP).filter((family): family is string => Boolean(family)))
);

const FONT_FILES: { family: string; url: string }[] = [
  { family: 'OptomDangELetterChart', url: '/fonts/OptomDangELetterChart-abcdef.otf' },
  { family: 'OptomDangNumber', url: '/fonts/OptomDangNumber-1234567890.otf' },
  { family: 'OptomDangLatinChart', url: '/fonts/OptomDangLatinChart.otf' },
  { family: 'OptomDangLandotC', url: '/fonts/OptomDangLandotC-abcdefgh.otf' },
  { family: 'OptomDangLeaChart', url: '/fonts/OptomDangLeaChart-abcdef.otf' },
];

let fontsReadyPromise: Promise<boolean> | null = null;

function injectPreloadLinks() {
  if (typeof document === 'undefined') return;
  for (const { url } of FONT_FILES) {
    const existing = document.querySelector(`link[rel="preload"][href="${url}"]`);
    if (existing) continue;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/otf';
    link.href = url;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }
}

/**
 * Best-effort load of every optotype @font-face.
 * Always resolves true after the attempt so UI never stays blank on flaky check().
 */
export function ensureOptotypeFontsLoaded(): Promise<boolean> {
  if (typeof document === 'undefined' || !document.fonts) {
    return Promise.resolve(true);
  }
  if (!fontsReadyPromise) {
    injectPreloadLinks();
    fontsReadyPromise = Promise.all(
      FONT_FILES.map(({ family }) =>
        document.fonts.load(`16px "${family}"`).catch(() => [] as FontFace[])
      )
    )
      .then(() => document.fonts.ready)
      .then(() => true)
      .catch(() => true);
  }
  return fontsReadyPromise;
}

/**
 * True once font load has been attempted (or timed out).
 * Letters should still render even if a face failed — blank forever is worse than brief FOUT.
 */
export function useOptotypeFontsReady(): boolean {
  const [ready, setReady] = useState(() => {
    if (typeof document === 'undefined' || !document.fonts) return true;
    // Optimistic: if any chart face already checks out, treat as ready.
    return OPTOTYPE_FONT_FAMILIES.some((family) => document.fonts.check(`16px "${family}"`));
  });

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 1500);

    void ensureOptotypeFontsLoaded().then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [ready]);

  return ready;
}

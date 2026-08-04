/**
 * Optotype chart fonts used by exam + Far Acuity.
 * Prevents FOUT double-paint (system glyph + chart glyph overlapping).
 */
import 'src/features/portal/views/exam/components/exam-fonts.css';
import { FONT_MAP } from 'src/utils/constant';
import { useEffect, useState } from 'react';

/** All chart font-family names that must be ready before showing letters. */
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
 * Resolve when every optotype @font-face is available for text shaping.
 * Safe to call repeatedly — shares one in-flight promise.
 */
export function ensureOptotypeFontsLoaded(): Promise<boolean> {
  if (typeof document === 'undefined' || !document.fonts) {
    return Promise.resolve(true);
  }
  if (!fontsReadyPromise) {
    injectPreloadLinks();
    fontsReadyPromise = Promise.all(
      FONT_FILES.map(({ family }) => document.fonts.load(`16px "${family}"`))
    )
      .then(() => document.fonts.ready)
      .then(() =>
        OPTOTYPE_FONT_FAMILIES.every((family) => document.fonts.check(`16px "${family}"`))
      )
      .catch(() => false);
  }
  return fontsReadyPromise;
}

/** React helper — false until chart fonts are ready (avoids system+optotype double paint). */
export function useOptotypeFontsReady(): boolean {
  const [ready, setReady] = useState(() => {
    if (typeof document === 'undefined' || !document.fonts) return true;
    return OPTOTYPE_FONT_FAMILIES.every((family) => document.fonts.check(`16px "${family}"`));
  });

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    void ensureOptotypeFontsLoaded().then((ok) => {
      if (!cancelled) setReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  return ready;
}

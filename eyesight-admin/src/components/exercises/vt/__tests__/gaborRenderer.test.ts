import { describe, it, expect } from 'vitest';
import {
  drawGabor2AFC,
  drawGaborSingle,
  computeGaborEnvelope,
  computeGaborFadeSigmaPx,
  computeGaborFadeRingRadiusPx,
  computeGaborPlateauRadiusPx,
  computeGaborStimulusDiameterPx,
  GABOR_FADE_RING_DIAMETER_FRACTION,
} from '../stimuli/gaborRenderer';
import { orientationCssAngle } from '../core/gaborTaskModes';

describe('computeGaborEnvelope', () => {
  const patchSizePx = 120;
  const plateauRadius = computeGaborPlateauRadiusPx(patchSizePx);
  const fadeRingRadius = computeGaborFadeRingRadiusPx(patchSizePx);
  const fadeSigmaPx = computeGaborFadeSigmaPx(patchSizePx);

  it('plateau radius equals half of clinical diameter', () => {
    expect(plateauRadius).toBe(patchSizePx / 2);
  });

  it('fade ring sits outside clinical plateau', () => {
    expect(fadeRingRadius).toBe((patchSizePx * GABOR_FADE_RING_DIAMETER_FRACTION) / 2);
    expect(plateauRadius + fadeRingRadius).toBeGreaterThan(plateauRadius);
  });

  it('is 1 at centre', () => {
    expect(computeGaborEnvelope(0, 0, plateauRadius, fadeSigmaPx, plateauRadius)).toBe(1);
  });

  it('stays at 1 inside the full clinical plateau', () => {
    expect(computeGaborEnvelope(plateauRadius * 0.95, 0, plateauRadius, fadeSigmaPx, plateauRadius)).toBe(1);
  });

  it('falls off smoothly in the outer fade ring (outside clinical edge)', () => {
    const justOutside = computeGaborEnvelope(
      plateauRadius + 1,
      0,
      plateauRadius,
      fadeSigmaPx,
      plateauRadius
    );
    const midFade = computeGaborEnvelope(
      plateauRadius + fadeRingRadius * 0.5,
      0,
      plateauRadius,
      fadeSigmaPx,
      plateauRadius
    );
    const outerFade = computeGaborEnvelope(
      plateauRadius + fadeRingRadius,
      0,
      plateauRadius,
      fadeSigmaPx,
      plateauRadius
    );

    expect(justOutside).toBeGreaterThan(0.9);
    expect(midFade).toBeLessThan(justOutside);
    expect(outerFade).toBeLessThan(midFade);
    expect(outerFade).toBeGreaterThan(0);
  });

  it('is nearly invisible at outer fade edge', () => {
    const atOuterFade = computeGaborEnvelope(
      plateauRadius + fadeRingRadius,
      0,
      plateauRadius,
      fadeSigmaPx,
      plateauRadius
    );
    expect(atOuterFade).toBeLessThan(0.02);
  });

  it('stimulus diameter exceeds clinical plateau diameter', () => {
    expect(computeGaborStimulusDiameterPx(patchSizePx)).toBeGreaterThan(patchSizePx);
  });

  it('is rotation-invariant (circular envelope)', () => {
    const r = plateauRadius * 0.4;
    const a = computeGaborEnvelope(r, 0, plateauRadius, fadeSigmaPx, plateauRadius);
    const b = computeGaborEnvelope(0, r, plateauRadius, fadeSigmaPx, plateauRadius);
    expect(a).toBeCloseTo(b, 10);
  });
});

describe('drawGabor2AFC', () => {
  it('draws without throwing when patchSizePx is provided', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 324;
    canvas.height = 161;

    expect(() =>
      drawGabor2AFC({
        canvas,
        signalSide: 'left',
        contrast: 0.4,
        config: { sfCpD: 3, orientation: 'vertical', sigmaDeg: 0.5 },
        distanceM: 3,
        pixelsPerDeg: 40,
        patchSizePx: 121,
      })
    ).not.toThrow();
  });
});

describe('drawGaborSingle', () => {
  it('draws without throwing for task-mode orientations', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;

    for (const orientationDeg of [0, 45, 90, 135]) {
      expect(() =>
        drawGaborSingle({
          canvas,
          orientationDeg,
          contrast: 0.85,
          sfCpD: 3,
          pixelsPerDeg: 40,
          patchSizePx: 120,
        })
      ).not.toThrow();
    }
  });
});

describe('orientationCssAngle', () => {
  it('icon stripes match canvas stripe direction (gradient ⟂ stripes)', () => {
    expect(orientationCssAngle(0)).toBe(90);
    expect(orientationCssAngle(90)).toBe(0);
    expect(orientationCssAngle(45)).toBe(135);
    expect(orientationCssAngle(135)).toBe(45);
  });
});

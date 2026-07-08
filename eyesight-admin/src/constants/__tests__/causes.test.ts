/**
 * Unit tests for the causes code ↔ label map.
 * Guards the contract: BE stores/queries CODES; FE renders Vietnamese labels.
 */
import { describe, it, expect } from 'vitest';
import { CAUSES, getCauseLabel } from '../causes';

describe('causes constant', () => {
  it('has the 6 canonical causes', () => {
    expect(CAUSES).toHaveLength(6);
  });

  it('uses language-neutral snake_case codes (no Vietnamese/spaces in code)', () => {
    CAUSES.forEach((c) => {
      expect(c.code).toMatch(/^[a-z_]+$/);
      expect(c.label.length).toBeGreaterThan(0);
    });
  });

  it('codes are unique', () => {
    const codes = CAUSES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('matches the backend code set exactly', () => {
    // Keep in sync with backend src/config/causes.js
    expect(CAUSES.map((c) => c.code).sort()).toEqual(
      ['cataract', 'corneal_disease', 'fundus_disease', 'ptosis', 'refractive_error', 'strabismus'].sort()
    );
  });
});

describe('getCauseLabel', () => {
  it('maps a known code to its Vietnamese label', () => {
    expect(getCauseLabel('strabismus')).toBe('Lác/Lé');
    expect(getCauseLabel('refractive_error')).toBe('Tật khúc xạ');
    expect(getCauseLabel('fundus_disease')).toBe('Bệnh lý đáy mắt');
  });

  it('falls back to the raw code when unknown (e.g. legacy/unmapped value)', () => {
    expect(getCauseLabel('not_a_real_code')).toBe('not_a_real_code');
    expect(getCauseLabel('')).toBe('');
  });
});

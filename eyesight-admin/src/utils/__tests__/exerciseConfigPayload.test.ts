import { describe, expect, it } from 'vitest';
import type { ExerciseConfig } from 'src/types/core';
import { normalizeExerciseConfigPayload } from '../exerciseConfigPayload';
import { translateErrorMessage } from '../errorHandler';

describe('normalizeExerciseConfigPayload', () => {
  it('fills visionType when null (cấu hình gốc thiếu field)', () => {
    const result = normalizeExerciseConfigPayload({
      name: 'Test',
      exerciseId: 1,
      configType: 'admin',
      visionType: null as unknown as undefined,
      eye: 'both',
    });

    expect(result.visionType).toBe('far');
  });

  it('loại bỏ createdByUser và exercise khỏi payload', () => {
    const result = normalizeExerciseConfigPayload({
      name: 'Test',
      exerciseId: 1,
      configType: 'admin',
      visionType: 'far',
      eye: 'both',
      createdByUser: { id: 1, name: 'Admin' },
      exercise: { id: 1, name: '2048', code: '2048', exerciseType: '2048' },
      createdAt: '2026-01-01',
    } as Partial<ExerciseConfig>);

    expect(result).not.toHaveProperty('createdByUser');
    expect(result).not.toHaveProperty('exercise');
    expect(result).not.toHaveProperty('createdAt');
    expect(result.name).toBe('Test');
  });

  it('keeps explicit visionType', () => {
    const result = normalizeExerciseConfigPayload({
      visionType: 'near',
      eye: 'right',
      inactivityThreshold: 10,
    });

    expect(result.visionType).toBe('near');
    expect(result.inactivityThreshold).toBe(10);
  });

  it('defaults colorScheme to original when omitted', () => {
    const result = normalizeExerciseConfigPayload({
      name: 'Test',
      exerciseId: 1,
      configType: 'admin',
      eye: 'both',
    });

    expect(result.colorScheme?.preset).toBe('original');
  });

  it('sets levelOverride false without visionLevel when override disabled', () => {
    const result = normalizeExerciseConfigPayload({
      levelOverride: false,
      visionLevel: 14,
    });

    expect(result.levelOverride).toBe(false);
    expect(result).not.toHaveProperty('visionLevel');
  });

  it('omits levelOverride and visionLevel when not in values', () => {
    const result = normalizeExerciseConfigPayload({
      name: 'Test',
      visionType: 'contrast',
      eye: 'right',
    });

    expect(result).not.toHaveProperty('levelOverride');
    expect(result).not.toHaveProperty('visionLevel');
  });

  it('keeps visionLevel when levelOverride is true', () => {
    const result = normalizeExerciseConfigPayload({
      levelOverride: true,
      visionLevel: 10,
    });

    expect(result.levelOverride).toBe(true);
    expect(result.visionLevel).toBe(10);
  });

  it('omits null vtSettings (2048 / non-VT configs)', () => {
    const result = normalizeExerciseConfigPayload({
      name: '2048 Max',
      exerciseId: 1,
      configType: 'admin',
      eye: 'both',
      vtSettings: null,
    });

    expect(result).not.toHaveProperty('vtSettings');
  });
});

describe('translateErrorMessage', () => {
  it('dịch lỗi visionType cannot be null', () => {
    expect(translateErrorMessage('visionType cannot be null')).toContain('Loại thị lực');
  });

  it('dịch lỗi NOT NULL chung', () => {
    expect(translateErrorMessage('name cannot be null')).toBe('Tên cấu hình là bắt buộc.');
  });
});

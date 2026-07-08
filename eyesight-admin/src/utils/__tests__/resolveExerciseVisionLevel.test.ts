import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { resolveExerciseVisionLevel, computeExercisePatientVision, resolveExerciseAssignmentVisionLevel, resolveAssignmentTrainingEye, resolveContrastExamLevel } from '../visionUtils';

describe('resolveExerciseVisionLevel', () => {
  describe("eye='both' → mắt kém (min)", () => {
    it('E1: lấy mắt có level thấp hơn (left thấp)', () => {
      expect(resolveExerciseVisionLevel({ leftEye: 8, rightEye: 12 }, 'both')).toBe(8);
    });
    it('E2: đối xứng (right thấp)', () => {
      expect(resolveExerciseVisionLevel({ leftEye: 12, rightEye: 8 }, 'both')).toBe(8);
    });
    it('E3: hai mắt bằng nhau', () => {
      expect(resolveExerciseVisionLevel({ leftEye: 10, rightEye: 10 }, 'both')).toBe(10);
    });
    it('E8: min cho near', () => {
      expect(resolveExerciseVisionLevel({ leftEye: 3, rightEye: 5 }, 'both')).toBe(3);
    });
    it('E9: min cho contrast', () => {
      expect(resolveExerciseVisionLevel({ leftEye: 6, rightEye: 14 }, 'both')).toBe(6);
    });
  });

  describe('xử lý dữ liệu thiếu', () => {
    it('E4: thiếu mắt trái → lấy mắt phải', () => {
      expect(resolveExerciseVisionLevel({ leftEye: null, rightEye: 9 }, 'both')).toBe(9);
    });
    it('E5: thiếu mắt phải → lấy mắt trái', () => {
      expect(resolveExerciseVisionLevel({ leftEye: 7, rightEye: null }, 'both')).toBe(7);
    });
    it('E6: cả hai mắt thiếu → null', () => {
      expect(resolveExerciseVisionLevel({ leftEye: null, rightEye: null }, 'both')).toBeNull();
    });
    it('E7: level 0 coi như thiếu, loại khỏi min', () => {
      expect(resolveExerciseVisionLevel({ leftEye: 0, rightEye: 11 }, 'both')).toBe(11);
    });
    it('undefined eye values → null cho both', () => {
      expect(resolveExerciseVisionLevel({}, 'both')).toBeNull();
    });
  });

  describe('left/right giữ nguyên hành vi cũ', () => {
    it('E10: eye=left → leftEye', () => {
      expect(resolveExerciseVisionLevel({ leftEye: 8, rightEye: 12 }, 'left')).toBe(8);
    });
    it('E11: eye=right → rightEye', () => {
      expect(resolveExerciseVisionLevel({ leftEye: 8, rightEye: 12 }, 'right')).toBe(12);
    });
    it('eye=left nhưng leftEye thiếu → null', () => {
      expect(resolveExerciseVisionLevel({ leftEye: null, rightEye: 12 }, 'left')).toBeNull();
    });
    it('eye=right nhưng rightEye thiếu → null', () => {
      expect(resolveExerciseVisionLevel({ leftEye: 8, rightEye: null }, 'right')).toBeNull();
    });
  });

  describe('eye undefined/unknown → null', () => {
    it('E12: eye=undefined → null', () => {
      expect(resolveExerciseVisionLevel({ leftEye: 8, rightEye: 12 }, undefined)).toBeNull();
    });
    it('eye=null → null', () => {
      expect(resolveExerciseVisionLevel({ leftEye: 8, rightEye: 12 }, null)).toBeNull();
    });
    it('eye giá trị lạ → null', () => {
      expect(resolveExerciseVisionLevel({ leftEye: 8, rightEye: 12 }, 'weird')).toBeNull();
    });
  });

  describe('parse string', () => {
    it('E13: giá trị string được parse rồi min', () => {
      expect(resolveExerciseVisionLevel({ leftEye: '9', rightEye: '11' }, 'both')).toBe(9);
    });
    it('string cho left/right', () => {
      expect(resolveExerciseVisionLevel({ leftEye: '8', rightEye: '12' }, 'left')).toBe(8);
      expect(resolveExerciseVisionLevel({ leftEye: '8', rightEye: '12' }, 'right')).toBe(12);
    });
    it('chuỗi rỗng coi như thiếu', () => {
      expect(resolveExerciseVisionLevel({ leftEye: '', rightEye: 5 }, 'both')).toBe(5);
    });
  });

  describe('result undefined/null → null', () => {
    it('E15: result undefined → null', () => {
      expect(resolveExerciseVisionLevel(undefined, 'left')).toBeNull();
    });
    it('result null → null', () => {
      expect(resolveExerciseVisionLevel(null, 'both')).toBeNull();
    });
  });

  describe('property tests (fast-check)', () => {
    const level = fc.integer({ min: 1, max: 20 });

    it('both === Math.min(left, right) khi cả hai mắt có giá trị', () => {
      fc.assert(
        fc.property(level, level, (l, r) => {
          expect(resolveExerciseVisionLevel({ leftEye: l, rightEye: r }, 'both')).toBe(
            Math.min(l, r)
          );
        })
      );
    });

    it('both <= từng mắt (mắt kém không bao giờ dễ hơn từng mắt)', () => {
      fc.assert(
        fc.property(level, level, (l, r) => {
          const both = resolveExerciseVisionLevel({ leftEye: l, rightEye: r }, 'both') as number;
          const leftOnly = resolveExerciseVisionLevel(
            { leftEye: l, rightEye: r },
            'left'
          ) as number;
          const rightOnly = resolveExerciseVisionLevel(
            { leftEye: l, rightEye: r },
            'right'
          ) as number;
          expect(both).toBeLessThanOrEqual(leftOnly);
          expect(both).toBeLessThanOrEqual(rightOnly);
        })
      );
    });

    it('đối xứng: hoán đổi hai mắt cho cùng kết quả both', () => {
      fc.assert(
        fc.property(level, level, (l, r) => {
          expect(resolveExerciseVisionLevel({ leftEye: l, rightEye: r }, 'both')).toBe(
            resolveExerciseVisionLevel({ leftEye: r, rightEye: l }, 'both')
          );
        })
      );
    });

    it('idempotent khi một mắt null: both == mắt còn lại', () => {
      fc.assert(
        fc.property(level, (l) => {
          expect(resolveExerciseVisionLevel({ leftEye: l, rightEye: null }, 'both')).toBe(
            resolveExerciseVisionLevel({ leftEye: l, rightEye: null }, 'left')
          );
        })
      );
    });
  });
});

describe('computeExercisePatientVision', () => {
  const farResults = { far: { currentResult: { leftEye: 8, rightEye: 12 } } };

  it('override OFF + eye=both → far lấy mắt kém (min=8), near/contrast null', () => {
    const v = computeExercisePatientVision({
      levelOverride: false,
      visionType: 'far',
      eye: 'both',
      examResults: farResults,
    });
    expect(v.farVisionLevel).toBe(8);
    expect(v.nearVisionLevel).toBeNull();
    expect(v.contrastLevel).toBeNull();
  });

  it('override ON → near/contrast null khi visionType=far', () => {
    const v = computeExercisePatientVision({
      levelOverride: true,
      visionLevel: 15,
      visionType: 'far',
      eye: 'both',
      examResults: farResults,
    });
    expect(v.farVisionLevel).toBe(15);
    expect(v.nearVisionLevel).toBeNull();
    expect(v.contrastLevel).toBeNull();
  });

  it('override ON + contrast → contrastLevel override, far/near vẫn từ exam', () => {
    const v = computeExercisePatientVision({
      levelOverride: true,
      visionLevel: 10,
      visionType: 'contrast',
      eye: 'right',
      examResults: {
        far: { currentResult: { rightEye: 14 } },
        near: { currentResult: { rightEye: 4 } },
        contrast: { currentResult: { rightEye: 5 } },
      },
    });
    expect(v.contrastLevel).toBe(10);
    expect(v.farVisionLevel).toBe(14);
    expect(v.nearVisionLevel).toBe(4);
  });

  it('E6: eye=both nhưng cả hai mắt thiếu → null (không fallback)', () => {
    const v = computeExercisePatientVision({
      levelOverride: false,
      visionType: 'far',
      eye: 'both',
      examResults: { far: { currentResult: { leftEye: null, rightEye: null } } },
    });
    expect(v.farVisionLevel).toBeNull();
  });

  it('regression: eye=left → far=8; eye=right → far=12', () => {
    expect(
      computeExercisePatientVision({ visionType: 'far', eye: 'left', examResults: farResults })
        .farVisionLevel
    ).toBe(8);
    expect(
      computeExercisePatientVision({ visionType: 'far', eye: 'right', examResults: farResults })
        .farVisionLevel
    ).toBe(12);
  });

  it('override ON nhưng visionLevel falsy (0) → bỏ qua override, dùng exam', () => {
    const v = computeExercisePatientVision({
      levelOverride: true,
      visionLevel: 0,
      visionType: 'far',
      eye: 'both',
      examResults: farResults,
    });
    expect(v.farVisionLevel).toBe(8);
  });

  it('không có examResults → null (không fallback)', () => {
    const v = computeExercisePatientVision({ visionType: 'far', eye: 'both' });
    expect(v).toEqual({ farVisionLevel: null, nearVisionLevel: null, contrastLevel: null });
  });
});

describe('resolveContrastExamLevel', () => {
  it('maps level index and log score 0.15 to level 2', () => {
    expect(resolveContrastExamLevel({ rightEye: 2 }, 'right')).toBe(2);
    expect(resolveContrastExamLevel({ rightEye: 0.15 }, 'right')).toBe(2);
    expect(resolveContrastExamLevel({ rightEye: '0.15' }, 'right')).toBe(2);
  });

  it('both eyes uses worse (lower) contrast sensitivity level', () => {
    expect(
      resolveContrastExamLevel({ leftEye: 9, rightEye: 2 }, 'both')
    ).toBe(2);
  });
});

describe('resolveAssignmentTrainingEye', () => {
  it('prefers assignment trainingEye over config eye', () => {
    expect(
      resolveAssignmentTrainingEye({ trainingEye: 'right', configEye: 'both' })
    ).toBe('right');
    expect(resolveAssignmentTrainingEye({ configEye: 'both' })).toBe('both');
    expect(resolveAssignmentTrainingEye({ trainingEye: null, configEye: 'left' })).toBe('left');
  });
});

describe('resolveExerciseAssignmentVisionLevel', () => {
  it('override ON → trả visionLevel', () => {
    expect(
      resolveExerciseAssignmentVisionLevel({
        levelOverride: true,
        visionLevel: 10,
        visionType: 'far',
      })
    ).toBe(10);
  });

  it('không exam, không override → null', () => {
    expect(
      resolveExerciseAssignmentVisionLevel({
        levelOverride: false,
        visionType: 'far',
        eye: 'both',
      })
    ).toBeNull();
  });

  it('có exam far → trả level theo eye', () => {
    expect(
      resolveExerciseAssignmentVisionLevel({
        visionType: 'far',
        eye: 'left',
        examResults: { far: { currentResult: { leftEye: 8, rightEye: 12 } } },
      })
    ).toBe(8);
  });

  it('trainingEye override → dùng mắt phân công, không lấy mắt kém từ config both', () => {
    expect(
      resolveExerciseAssignmentVisionLevel({
        visionType: 'far',
        trainingEye: 'right',
        configEye: 'both',
        examResults: { far: { currentResult: { leftEye: 7, rightEye: 11 } } },
      })
    ).toBe(11);
  });
});

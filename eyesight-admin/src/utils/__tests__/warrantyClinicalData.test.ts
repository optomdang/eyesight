import { describe, it, expect } from 'vitest';
import { buildClinicalDataFromPatient, isReexamWithinSixMonths } from '../warrantyClinicalData';
import type { PatientWithCompliance } from 'src/types/core';

const mockPatient: PatientWithCompliance = {
  id: 1,
  name: 'Test',
  code: 'P001',
  userId: 1,
  phoneNumber: '0900000000',
  examResults: {
    far: {
      initialResult: { leftEye: 0.3, rightEye: 0.4, bothEye: null },
      currentResult: { leftEye: 0.5, rightEye: 0.6, bothEye: null },
      lastExamDate: '2026-01-01',
    },
    near: {
      initialResult: { leftEye: null, rightEye: null, bothEye: null },
      currentResult: { leftEye: null, rightEye: null, bothEye: null },
      lastExamDate: null,
    },
    contrast: {
      initialResult: { leftEye: null, rightEye: null, bothEye: null },
      currentResult: { leftEye: null, rightEye: null, bothEye: null },
      lastExamDate: null,
    },
    stereopsis: {
      initialResult: { leftEye: null, rightEye: null, bothEye: null },
      currentResult: { leftEye: null, rightEye: null, bothEye: null },
      lastExamDate: null,
    },
  },
  compliance: {
    far: {
      performanceRate: 92,
      status: 'good',
      completedExams: 46,
      requiredExams: 50,
      lastCalculatedAt: '2026-06-01',
    },
    near: {
      performanceRate: 0,
      status: 'poor',
      completedExams: 0,
      requiredExams: 0,
      lastCalculatedAt: null,
    },
    contrast: {
      performanceRate: 0,
      status: 'poor',
      completedExams: 0,
      requiredExams: 0,
      lastCalculatedAt: null,
    },
    stereopsis: {
      performanceRate: 0,
      status: 'poor',
      completedExams: 0,
      requiredExams: 0,
      lastCalculatedAt: null,
    },
  },
};

describe('warrantyClinicalData utils', () => {
  describe('buildClinicalDataFromPatient', () => {
    it('maps exam results and compliance from patient', () => {
      const data = buildClinicalDataFromPatient(mockPatient);

      expect(data.examResults?.far?.initial?.leftEye).toBe(0.3);
      expect(data.examResults?.far?.current?.leftEye).toBe(0.5);
      expect(data.compliance?.far?.performanceRate).toBe(92);
      expect(data.compliance?.far?.completedExams).toBe(46);
    });
  });

  describe('isReexamWithinSixMonths', () => {
    it('returns true when last completed phase is recent', () => {
      const recent = new Date();
      recent.setMonth(recent.getMonth() - 2);
      expect(isReexamWithinSixMonths([{ completedAt: recent.toISOString() }])).toBe(true);
    });

    it('returns false when no completed phases', () => {
      expect(isReexamWithinSixMonths([{ completedAt: null }])).toBe(false);
    });

    it('returns false when last phase older than 6 months', () => {
      const old = new Date();
      old.setMonth(old.getMonth() - 8);
      expect(isReexamWithinSixMonths([{ completedAt: old.toISOString() }])).toBe(false);
    });
  });
});

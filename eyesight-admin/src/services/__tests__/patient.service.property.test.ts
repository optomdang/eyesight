/**
 * Property-Based Tests for Patient Service Portal Endpoints
 *
 * **Feature: frontend-optimization, Property 6: Portal Endpoint URL Pattern**
 * - Verify all portal-specific service functions use `/me/` prefix
 * - Test URL generation with various parameters
 *
 * **Validates: Requirements 3.5**
 *
 * Uses fast-check for property-based testing with minimum 100 iterations
 */

import { describe, it, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock the request utilities to capture URLs
vi.mock('src/utils/request', () => ({
  getData: vi.fn().mockResolvedValue({}),
  getDataTable: vi
    .fn()
    .mockResolvedValue({ rows: [], count: 0, totalPages: 0, limit: 10, page: 1 }),
  postData: vi.fn().mockResolvedValue({}),
  putData: vi.fn().mockResolvedValue({}),
}));

import { getData, getDataTable, postData, putData } from 'src/utils/request';
import {
  getMyPatientInfo,
  getMyExamDashboard,
  getMyCurrentSessions,
  getMyExamSessions,
  getMyExamSession,
  startExamFromSession,
  getMyExamResults,
  createMyExamResult,
  updateMyExamResult,
  getMyAssignments,
  getMyAssignmentDetails,
  getMyExerciseResults,
  submitExerciseResult,
  getMyProgress,
  getMyAssignmentSessions,
} from '../patient.service';

// Arbitraries for test data generation
const positiveIntArb = fc.integer({ min: 1, max: 1000000 });
const pageArb = fc.integer({ min: 1, max: 100 });
const limitArb = fc.integer({ min: 1, max: 100 });
const statusArb = fc.constantFrom('active', 'paused', 'completed', 'cancelled');
const examTypeArb = fc.constantFrom('far', 'near', 'contrast', 'stereopsis');

// Generate valid date strings by constructing from components (avoids invalid date issues)
const dateStringArb = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }), // Use 28 to avoid invalid dates like Feb 30
  })
  .map(
    ({ year, month, day }) =>
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  );

// Arbitrary for exam session params
const examSessionParamsArb = fc.record({
  examType: fc.option(examTypeArb, { nil: undefined }),
  status: fc.option(fc.string(), { nil: undefined }),
  page: fc.option(pageArb, { nil: undefined }),
  limit: fc.option(limitArb, { nil: undefined }),
});

// Arbitrary for exam result params
const examResultParamsArb = fc.record({
  page: fc.option(pageArb, { nil: undefined }),
  limit: fc.option(limitArb, { nil: undefined }),
  examType: fc.option(examTypeArb, { nil: undefined }),
  status: fc.option(fc.string(), { nil: undefined }),
  examSessionId: fc.option(fc.string(), { nil: undefined }),
  startDate: fc.option(dateStringArb, { nil: undefined }),
  endDate: fc.option(dateStringArb, { nil: undefined }),
});

// Arbitrary for assignment params
const assignmentParamsArb = fc.record({
  status: fc.option(statusArb as fc.Arbitrary<'active' | 'paused' | 'completed' | 'cancelled'>, {
    nil: undefined,
  }),
  isActive: fc.option(fc.boolean(), { nil: undefined }),
  page: fc.option(pageArb, { nil: undefined }),
  limit: fc.option(limitArb, { nil: undefined }),
});

// Arbitrary for exercise result params
const exerciseResultParamsArb = fc.record({
  exerciseId: fc.option(fc.string(), { nil: undefined }),
  sessionId: fc.option(fc.string(), { nil: undefined }),
  assignmentId: fc.option(positiveIntArb, { nil: undefined }),
  startDate: fc.option(dateStringArb, { nil: undefined }),
  endDate: fc.option(dateStringArb, { nil: undefined }),
  page: fc.option(pageArb, { nil: undefined }),
  limit: fc.option(limitArb, { nil: undefined }),
});

// Arbitrary for progress params
const progressParamsArb = fc.record({
  exerciseType: fc.option(fc.string(), { nil: undefined }),
  dateFrom: fc.option(dateStringArb, { nil: undefined }),
  dateTo: fc.option(dateStringArb, { nil: undefined }),
});

// Arbitrary for session params
const sessionParamsArb = fc.record({
  status: fc.option(fc.string(), { nil: undefined }),
  page: fc.option(pageArb, { nil: undefined }),
  limit: fc.option(limitArb, { nil: undefined }),
});

/**
 * Helper to extract URL from mock calls
 */
const getLastCalledUrl = (mockFn: ReturnType<typeof vi.fn>): string | undefined => {
  const calls = mockFn.mock.calls;
  if (calls.length === 0) return undefined;
  return calls[calls.length - 1][0] as string;
};

/**
 * Helper to verify URL starts with /me/ or me/
 */
const urlStartsWithMe = (url: string | undefined): boolean => {
  if (!url) return false;
  return url.startsWith('me/') || url.startsWith('/me/');
};

describe('Property 6: Portal Endpoint URL Pattern', () => {
  /**
   * **Feature: frontend-optimization, Property 6: Portal Endpoint URL Pattern**
   *
   * *For any* portal-specific service function that accesses user-specific data,
   * the endpoint URL should start with `/me/` prefix.
   *
   * **Validates: Requirements 3.5**
   */

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Patient Info Endpoints', () => {
    it('getMyPatientInfo should always use /me/ prefix', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // No params needed
          async () => {
            vi.clearAllMocks();
            await getMyPatientInfo();
            const url = getLastCalledUrl(vi.mocked(getData));
            return urlStartsWithMe(url);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getMyExamDashboard should always use /me/ prefix', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          vi.clearAllMocks();
          await getMyExamDashboard();
          const url = getLastCalledUrl(vi.mocked(getData));
          return urlStartsWithMe(url);
        }),
        { numRuns: 100 }
      );
    });

    it('getMyCurrentSessions should always use /me/ prefix', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          vi.clearAllMocks();
          await getMyCurrentSessions();
          const url = getLastCalledUrl(vi.mocked(getData));
          return urlStartsWithMe(url);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Exam Session Endpoints', () => {
    it('getMyExamSessions should use /me/ prefix for any params', async () => {
      await fc.assert(
        fc.asyncProperty(examSessionParamsArb, async (params) => {
          vi.clearAllMocks();
          await getMyExamSessions(params);
          const url = getLastCalledUrl(vi.mocked(getData));
          return urlStartsWithMe(url);
        }),
        { numRuns: 100 }
      );
    });

    it('getMyExamSession should use /me/ prefix for any session ID', async () => {
      await fc.assert(
        fc.asyncProperty(positiveIntArb, async (sessionId) => {
          vi.clearAllMocks();
          await getMyExamSession(sessionId);
          const url = getLastCalledUrl(vi.mocked(getData));
          return urlStartsWithMe(url);
        }),
        { numRuns: 100 }
      );
    });

    it('startExamFromSession should use /me/ prefix for any session ID', async () => {
      await fc.assert(
        fc.asyncProperty(positiveIntArb, async (sessionId) => {
          vi.clearAllMocks();
          await startExamFromSession(sessionId);
          const url = getLastCalledUrl(vi.mocked(postData));
          return urlStartsWithMe(url);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Exam Result Endpoints', () => {
    it('getMyExamResults should use /me/ prefix for any params', async () => {
      await fc.assert(
        fc.asyncProperty(examResultParamsArb, async (params) => {
          vi.clearAllMocks();
          await getMyExamResults(params);
          const url = getLastCalledUrl(vi.mocked(getData));
          return urlStartsWithMe(url);
        }),
        { numRuns: 100 }
      );
    });

    it('createMyExamResult should use /me/ prefix for any data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            examType: examTypeArb,
            patientId: positiveIntArb,
          }),
          async (data) => {
            vi.clearAllMocks();
            await createMyExamResult(data);
            const url = getLastCalledUrl(vi.mocked(postData));
            return urlStartsWithMe(url);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('updateMyExamResult should use /me/ prefix for any ID and data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            examResultId: positiveIntArb,
            data: fc.record({
              status: fc.constantFrom('incomplete', 'completed'),
            }),
          }),
          async ({ examResultId, data }) => {
            vi.clearAllMocks();
            await updateMyExamResult(examResultId, data);
            const url = getLastCalledUrl(vi.mocked(putData));
            return urlStartsWithMe(url);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Exercise Assignment Endpoints', () => {
    it('getMyAssignments should use /me/ prefix for any params', async () => {
      await fc.assert(
        fc.asyncProperty(assignmentParamsArb, async (params) => {
          vi.clearAllMocks();
          await getMyAssignments(params);
          const url = getLastCalledUrl(vi.mocked(getDataTable));
          return urlStartsWithMe(url);
        }),
        { numRuns: 100 }
      );
    });

    it('getMyAssignmentDetails should use /me/ prefix for any assignment ID', async () => {
      await fc.assert(
        fc.asyncProperty(positiveIntArb, async (assignmentId) => {
          vi.clearAllMocks();
          await getMyAssignmentDetails(assignmentId);
          const url = getLastCalledUrl(vi.mocked(getData));
          return urlStartsWithMe(url);
        }),
        { numRuns: 100 }
      );
    });

    it('getMyAssignmentSessions should use /me/ prefix for any assignment ID and params', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            assignmentId: positiveIntArb,
            params: sessionParamsArb,
          }),
          async ({ assignmentId, params }) => {
            vi.clearAllMocks();
            await getMyAssignmentSessions(assignmentId, params);
            const url = getLastCalledUrl(vi.mocked(getDataTable));
            return urlStartsWithMe(url);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Exercise Result Endpoints', () => {
    it('getMyExerciseResults should use /me/ prefix for any params', async () => {
      await fc.assert(
        fc.asyncProperty(exerciseResultParamsArb, async (params) => {
          vi.clearAllMocks();
          await getMyExerciseResults(params);
          const url = getLastCalledUrl(vi.mocked(getDataTable));
          return urlStartsWithMe(url);
        }),
        { numRuns: 100 }
      );
    });

    it('submitExerciseResult should use /me/ prefix for any assignment, session, and data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            assignmentId: positiveIntArb,
            sessionId: positiveIntArb,
            data: fc.record({
              score: fc.integer({ min: 0, max: 100000 }),
              completed: fc.boolean(),
            }),
          }),
          async ({ assignmentId, sessionId, data }) => {
            vi.clearAllMocks();
            await submitExerciseResult(assignmentId, sessionId, data);
            const url = getLastCalledUrl(vi.mocked(postData));
            return urlStartsWithMe(url);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Progress Endpoints', () => {
    it('getMyProgress should use /me/ prefix for any params', async () => {
      await fc.assert(
        fc.asyncProperty(progressParamsArb, async (params) => {
          vi.clearAllMocks();
          await getMyProgress(params);
          const url = getLastCalledUrl(vi.mocked(getData));
          return urlStartsWithMe(url);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('URL Structure Verification', () => {
    it('all portal endpoints should have correct URL structure with /me/ prefix', async () => {
      /**
       * Property: For all portal service functions, the generated URL
       * should always start with 'me/' prefix (without leading slash in implementation)
       */
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            assignmentId: positiveIntArb,
            sessionId: positiveIntArb,
            examResultId: positiveIntArb,
          }),
          async ({ assignmentId, sessionId, examResultId }) => {
            vi.clearAllMocks();

            // Call all portal functions
            await getMyPatientInfo();
            await getMyExamDashboard();
            await getMyCurrentSessions();
            await getMyExamSessions();
            await getMyExamSession(sessionId);
            await getMyExamResults();
            await createMyExamResult({});
            await updateMyExamResult(examResultId, {});
            await getMyAssignments();
            await getMyAssignmentDetails(assignmentId);
            await getMyExerciseResults();
            await submitExerciseResult(assignmentId, sessionId, {});
            await getMyProgress();
            await getMyAssignmentSessions(assignmentId);
            await startExamFromSession(sessionId);

            // Collect all URLs from all mock functions
            const allUrls: string[] = [
              ...vi.mocked(getData).mock.calls.map((c) => c[0] as string),
              ...vi.mocked(getDataTable).mock.calls.map((c) => c[0] as string),
              ...vi.mocked(postData).mock.calls.map((c) => c[0] as string),
              ...vi.mocked(putData).mock.calls.map((c) => c[0] as string),
            ];

            // All URLs should start with 'me/'
            return allUrls.every((url) => url.startsWith('me/'));
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

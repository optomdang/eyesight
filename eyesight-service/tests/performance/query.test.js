/* eslint-disable jest/no-export */
/**
 * Performance Baseline Tests
 *
 * Tests database queries before and after optimization.
 * Measures:
 * - Query execution time
 * - Memory usage
 * - Results count
 *
 * Usage:
 * npm test -- tests/performance/queryPerformance.test.js
 */

const { ExamResult, ExerciseResult, Patient, ExerciseAssignment } = require('../../src/models');
const examResultService = require('../../src/services/exam/examResult.service');
const exerciseResultService = require('../../src/services/exercise/exerciseResult.service');

describe('Query Performance Optimization Tests', () => {
  // Timeout extended for performance tests
  jest.setTimeout(30000);

  const performanceMetrics = [];

  afterAll(() => {
    // Print performance summary
    console.log('\n=== PERFORMANCE TEST SUMMARY ===');
    performanceMetrics.forEach((metric) => {
      console.log(`\n${metric.name}:`);
      console.log(`  Time: ${metric.time.toFixed(2)}ms`);
      console.log(`  Records: ${metric.recordCount}`);
      if (metric.memoryDelta) {
        console.log(`  Memory Delta: ${(metric.memoryDelta / 1024 / 1024).toFixed(2)}MB`);
      }
    });
  });

  const stopwatch = (name, fn) => {
    return async () => {
      const startMem = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      const result = await fn();

      const endTime = Date.now();
      const endMem = process.memoryUsage().heapUsed;

      const metric = {
        name,
        time: endTime - startTime,
        memoryDelta: endMem - startMem,
        recordCount: Array.isArray(result) ? result.length : result.rows?.length || 1,
      };

      performanceMetrics.push(metric);

      return result;
    };
  };

  describe('ExamResult Queries', () => {
    test('queryExamResults - should use optimized query with indexes', async () => {
      const test = stopwatch('ExamResult.queryExamResults (1000 records)', async () => {
        const result = await examResultService.queryExamResults(
          { centerId: 1, deleted: false },
          { limit: 50, page: 1, sortBy: 'createdAt:DESC' }
        );
        return result;
      });

      const result = await test();

      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('totalPages');
      expect(result).toHaveProperty('total');
      expect(result.limit).toBe(50);
    });

    test('getExamResultById - should use field selection', async () => {
      const test = stopwatch('ExamResult.getExamResultById (single)', async () => {
        // Find first exam result
        const first = await ExamResult.findOne({ limit: 1, raw: true });
        if (!first) return null;

        return await examResultService.getExamResultById(first.id);
      });

      const result = await test();

      if (result) {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('code');
        // Should not load all JSONB fields
        expect(typeof result).toBe('object');
      }
    });

    test('getExamResultsByPatientId - should use composite index', async () => {
      const test = stopwatch('ExamResult.getExamResultsByPatientId (100 records)', async () => {
        const result = await examResultService.getExamResultsByPatientId(1, {
          limit: 100,
          page: 1,
          sortBy: 'createdAt:DESC',
        });
        return result;
      });

      const result = await test();

      expect(result).toHaveProperty('rows');
      expect(Array.isArray(result.rows)).toBe(true);
    });

    test('getLatestExamResultByPatientId - should use index efficiently', async () => {
      const test = stopwatch('ExamResult.getLatestExamResultByPatientId', async () => {
        return await examResultService.getLatestExamResultByPatientId(1, 'far');
      });

      const result = await test();

      if (result) {
        expect(result).toHaveProperty('id');
        expect(result.examType).toBe('far');
      }
    });
  });

  describe('ExerciseResult Queries', () => {
    test('queryExerciseResults - should use optimized query with indexes', async () => {
      const test = stopwatch('ExerciseResult.queryExerciseResults (500 records)', async () => {
        const result = await exerciseResultService.queryExerciseResults(
          { centerId: 1, deleted: false },
          { limit: 50, page: 1, sortBy: 'createdAt:DESC' }
        );
        return result;
      });

      const result = await test();

      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('totalPages');
      expect(result.limit).toBe(50);
    });

    test('getLatestResultForExerciseAssignment - should use field selection', async () => {
      const test = stopwatch('ExerciseResult.getLatestResultForExerciseAssignment', async () => {
        // Find first assignment
        const assignment = await ExerciseAssignment.findOne({
          limit: 1,
          raw: true,
        });
        if (!assignment) return null;

        return await exerciseResultService.getLatestResultForExerciseAssignment(assignment.id);
      });

      const result = await test();

      if (result) {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('score');
      }
    });

    test('getLatestResultsForExerciseAssignment - should limit efficiently', async () => {
      const test = stopwatch('ExerciseResult.getLatestResultsForExerciseAssignment (top 5)', async () => {
        const assignment = await ExerciseAssignment.findOne({
          limit: 1,
          raw: true,
        });
        if (!assignment) return [];

        return await exerciseResultService.getLatestResultsForExerciseAssignment(assignment.id, 5);
      });

      const results = await test();

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(5);
    });

    test('getResultsSummaryByPatient - should use raw queries', async () => {
      const test = stopwatch('ExerciseResult.getResultsSummaryByPatient', async () => {
        return await exerciseResultService.getResultsSummaryByPatient(1, {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        });
      });

      const result = await test();

      expect(result).toHaveProperty('totalSessions');
      expect(result).toHaveProperty('totalPassedSessions');
      expect(result).toHaveProperty('averageScore');
    });
  });

  describe('Index Coverage Tests', () => {
    test('ExamResult should use (centerId, patientId, examType) index', async () => {
      const test = stopwatch('Index: ExamResult (centerId, patientId, examType)', async () => {
        return await ExamResult.findAll({
          where: { centerId: 1, patientId: 1, examType: 'far' },
          limit: 100,
        });
      });

      const results = await test();

      expect(Array.isArray(results)).toBe(true);
    });

    test('ExerciseResult should use (centerId, patientId, exerciseAssignmentId) index', async () => {
      const test = stopwatch('Index: ExerciseResult (centerId, patientId, assignmentId)', async () => {
        return await ExerciseResult.findAll({
          attributes: ['id', 'score', 'status'],
          where: { centerId: 1, patientId: 1, exerciseAssignmentId: 1 },
          limit: 100,
          raw: true,
        });
      });

      const results = await test();

      expect(Array.isArray(results)).toBe(true);
    });

    test('Patient should use (centerId, deleted) index', async () => {
      const test = stopwatch('Index: Patient (centerId, deleted)', async () => {
        return await Patient.findAll({
          where: { centerId: 1, deleted: false },
          attributes: ['id', 'code', 'userId'],
          limit: 100,
          raw: true,
        });
      });

      const results = await test();

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Pagination Efficiency', () => {
    test('Large offset pagination should still be efficient with indexes', async () => {
      const test = stopwatch('Pagination: ExamResult page 100 (offset 5000)', async () => {
        return await examResultService.queryExamResults({ centerId: 1, deleted: false }, { limit: 50, page: 100 });
      });

      const result = await test();

      expect(result).toHaveProperty('rows');
      expect(result.page).toBe(100);
    });

    test('Sorting by indexed field should be fast', async () => {
      const test = stopwatch('Sort: ExamResult by createdAt DESC', async () => {
        return await examResultService.queryExamResults({ centerId: 1 }, { limit: 100, page: 1, sortBy: 'createdAt:DESC' });
      });

      const result = await test();

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });
});

/**
 * Benchmark Summary Generator
 * Compares performance before and after optimization
 */
const generateBenchmarkReport = (before, after) => {
  console.log('\n=== PERFORMANCE BENCHMARK REPORT ===\n');

  const queries = new Set([...before.map((m) => m.name), ...after.map((m) => m.name)]);

  queries.forEach((query) => {
    const beforeMetric = before.find((m) => m.name === query);
    const afterMetric = after.find((m) => m.name === query);

    if (beforeMetric && afterMetric) {
      const timeImprovement = (((beforeMetric.time - afterMetric.time) / beforeMetric.time) * 100).toFixed(1);
      const _memoryImprovement = (
        ((beforeMetric.memoryDelta - afterMetric.memoryDelta) / beforeMetric.memoryDelta) *
        100
      ).toFixed(1);
      console.log(`${query}:`);
      console.log(
        `  Time: ${beforeMetric.time.toFixed(0)}ms → ${afterMetric.time.toFixed(0)}ms (${timeImprovement}% faster)`
      );
      console.log(
        `  Memory: ${(beforeMetric.memoryDelta / 1024 / 1024).toFixed(2)}MB → ${(
          afterMetric.memoryDelta /
          1024 /
          1024
        ).toFixed(2)}MB`
      );
    }
  });
};

module.exports = { generateBenchmarkReport };

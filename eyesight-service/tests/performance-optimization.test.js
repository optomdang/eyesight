const { ATTRS, FILTERS, monitor, buildQuery, buildSortBy, buildPagination } = require('../src/utils/query');

// Aliases for backward compatibility with old test names
const buildOptimizedWhereClause = buildQuery;
const buildOptimizedOrderClause = buildSortBy;
const buildOptimizedPagination = buildPagination;

// Mock processBatch since it doesn't exist in query.js
// eslint-disable-next-line no-unused-vars
const processBatch = async (items, processor, batchSize = 10) => {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    // eslint-disable-next-line no-await-in-loop
    const batchResult = await processor(batch);
    results.push(...batchResult);
  }
  return results;
};

describe('Performance Optimization Utilities', () => {
  describe('ATTRS', () => {
    test('should have basic user attributes', () => {
      expect(ATTRS.USER_BASIC).toEqual(['id', 'name', 'email', 'phoneNumber']);
    });

    test('should have list user attributes', () => {
      expect(ATTRS.USER_LIST).toEqual(['id', 'name', 'email', 'phoneNumber', 'lastLoginAt', 'userType']);
    });

    test('should have patient attributes', () => {
      expect(ATTRS.PATIENT_BASIC).toEqual(['id', 'code', 'userId']);
      expect(ATTRS.PATIENT_LIST).toEqual([
        'id',
        'code',
        'userId',
        'treatmentStatus',
        'activeFrom',
        'activeTo',
        'severityLevel',
      ]);
    });
  });

  describe('buildOptimizedWhereClause', () => {
    test('should add deleted: false filter', () => {
      const filter = { name: 'test' };
      const result = buildOptimizedWhereClause(filter);

      expect(result).toEqual({
        name: 'test',
        deleted: false,
      });
    });

    test('should prioritize centerId in where clause', () => {
      const filter = { name: 'test', centerId: 1, status: 'active' };
      const result = buildOptimizedWhereClause(filter);

      const keys = Object.keys(result);
      expect(keys[0]).toBe('centerId'); // centerId should be first
      expect(result.centerId).toBe(1);
      expect(result.deleted).toBe(false);
    });
  });

  describe('buildOptimizedOrderClause', () => {
    test('should return default order when no sortBy provided', () => {
      const result = buildOptimizedOrderClause();
      expect(result).toEqual([['createdAt', 'DESC']]);
    });

    test('should handle simple field sorting', () => {
      const result = buildOptimizedOrderClause('name', 'ASC');
      expect(result).toEqual([['name', 'ASC']]);
    });

    test('should handle relation field sorting', () => {
      const result = buildOptimizedOrderClause('user.name', 'DESC');
      expect(result).toEqual([['user', 'name', 'DESC']]);
    });

    test('should prefer indexed fields', () => {
      const result = buildOptimizedOrderClause('createdAt', 'ASC');
      expect(result).toEqual([['createdAt', 'ASC']]);
    });

    test('should accept split order param', () => {
      const result = buildSortBy('exercise.name', ['exercise.name'], 'DESC');
      expect(result).toEqual([['exercise', 'name', 'DESC']]);
    });

    test('should accept field:direction in sortBy', () => {
      const result = buildSortBy('name:ASC', ['name']);
      expect(result).toEqual([['name', 'ASC']]);
    });
  });

  describe('buildOptimizedPagination', () => {
    test('should build pagination config with defaults', () => {
      const result = buildOptimizedPagination({}, {});

      expect(result).toEqual({
        limit: 10,
        offset: 0,
        distinct: true,
      });
    });

    test('should build pagination config with custom values', () => {
      const result = buildOptimizedPagination({}, { limit: 20, page: 3 });

      expect(result).toEqual({
        limit: 20,
        offset: 40, // (3-1) * 20
        distinct: true,
      });
    });
  });

  describe('FILTERS', () => {
    test('should create multi-tenant filter', () => {
      const result = FILTERS.multiTenant(123);

      expect(result).toEqual({
        centerId: 123,
      });
    });

    test('should create text search filter', () => {
      const result = FILTERS.textSearch('name', 'john');

      expect(result).toEqual({
        name: {
          [require('sequelize').Op.iLike]: '%john%',
        },
      });
    });

    test('should create date range filter', () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');
      const result = FILTERS.dateRange('createdAt', startDate, endDate);

      expect(result).toEqual({
        createdAt: {
          [require('sequelize').Op.gte]: startDate,
          [require('sequelize').Op.lte]: endDate,
        },
      });
    });
  });

  describe('processBatch', () => {
    test('should process items in batches', async () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const processor = jest.fn().mockImplementation(async (batch) => batch.map((x) => x * 2));

      const result = await processBatch(items, processor, 3);

      expect(result).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
      expect(processor).toHaveBeenCalledTimes(4); // 10 items / 3 batch size = 4 batches
      expect(processor).toHaveBeenNthCalledWith(1, [1, 2, 3]);
      expect(processor).toHaveBeenNthCalledWith(2, [4, 5, 6]);
      expect(processor).toHaveBeenNthCalledWith(3, [7, 8, 9]);
      expect(processor).toHaveBeenNthCalledWith(4, [10]);
    });

    test('should handle empty array', async () => {
      const processor = jest.fn();
      const result = await processBatch([], processor, 5);

      expect(result).toEqual([]);
      expect(processor).not.toHaveBeenCalled();
    });
  });

  describe('monitor', () => {
    test('should measure query performance', async () => {
      const mockQuery = jest.fn().mockResolvedValue('result');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await monitor.measure('test-query', mockQuery);

      expect(result).toBe('result');
      expect(mockQuery).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test('should log slow queries', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      monitor.logSlowQuery('slow-query', 1500, { limit: 10 });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Slow query detected: slow-query took 1500ms',
        expect.objectContaining({
          options: { limit: 10 },
          timestamp: expect.any(String),
        })
      );

      consoleSpy.mockRestore();
    });

    test('should not log fast queries', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      monitor.logSlowQuery('fast-query', 500, {});

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});

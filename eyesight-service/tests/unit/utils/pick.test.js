/**
 * Pick Utility Tests
 * Tests for object property picking utility
 */

const pick = require('../../../src/utils/pick');

describe('pick', () => {
  describe('basic functionality', () => {
    test('should pick specified keys from object', () => {
      const object = { a: 1, b: 2, c: 3 };
      const result = pick(object, ['a', 'c']);

      expect(result).toEqual({ a: 1, c: 3 });
    });

    test('should return empty object when no keys match', () => {
      const object = { a: 1, b: 2 };
      const result = pick(object, ['x', 'y']);

      expect(result).toEqual({});
    });

    test('should return empty object for empty keys array', () => {
      const object = { a: 1, b: 2 };
      const result = pick(object, []);

      expect(result).toEqual({});
    });

    test('should handle empty object', () => {
      const object = {};
      const result = pick(object, ['a', 'b']);

      expect(result).toEqual({});
    });
  });

  describe('value types', () => {
    test('should pick string values', () => {
      const object = { name: 'John', age: 30 };
      const result = pick(object, ['name']);

      expect(result).toEqual({ name: 'John' });
    });

    test('should pick number values', () => {
      const object = { name: 'John', age: 30 };
      const result = pick(object, ['age']);

      expect(result).toEqual({ age: 30 });
    });

    test('should pick boolean values', () => {
      const object = { active: true, deleted: false };
      const result = pick(object, ['active', 'deleted']);

      expect(result).toEqual({ active: true, deleted: false });
    });

    test('should pick null values', () => {
      const object = { name: 'John', middleName: null };
      const result = pick(object, ['middleName']);

      expect(result).toEqual({ middleName: null });
    });

    test('should pick undefined values', () => {
      const object = { name: 'John', middleName: undefined };
      const result = pick(object, ['middleName']);

      expect(result).toEqual({ middleName: undefined });
    });

    test('should pick array values', () => {
      const object = { items: [1, 2, 3], name: 'List' };
      const result = pick(object, ['items']);

      expect(result).toEqual({ items: [1, 2, 3] });
    });

    test('should pick object values', () => {
      const object = { config: { a: 1, b: 2 }, name: 'Config' };
      const result = pick(object, ['config']);

      expect(result).toEqual({ config: { a: 1, b: 2 } });
    });
  });

  describe('query parameter scenarios', () => {
    test('should pick pagination parameters', () => {
      const query = { page: 1, limit: 10, name: 'test', status: 'active' };
      const result = pick(query, ['page', 'limit']);

      expect(result).toEqual({ page: 1, limit: 10 });
    });

    test('should pick filter parameters', () => {
      const query = { page: 1, limit: 10, name: 'test', status: 'active', centerId: 1 };
      const result = pick(query, ['name', 'status', 'centerId']);

      expect(result).toEqual({ name: 'test', status: 'active', centerId: 1 });
    });

    test('should pick sorting parameters', () => {
      const query = { sortBy: 'name', order: 'ASC', page: 1 };
      const result = pick(query, ['sortBy', 'order']);

      expect(result).toEqual({ sortBy: 'name', order: 'ASC' });
    });

    test('should handle missing optional parameters', () => {
      const query = { page: 1 };
      const result = pick(query, ['page', 'limit', 'sortBy']);

      expect(result).toEqual({ page: 1 });
    });
  });

  describe('edge cases', () => {
    test('should not modify original object', () => {
      const object = { a: 1, b: 2, c: 3 };
      const original = { ...object };
      pick(object, ['a']);

      expect(object).toEqual(original);
    });

    test('should handle keys with special characters', () => {
      const object = { 'key-with-dash': 1, 'key.with.dot': 2 };
      const result = pick(object, ['key-with-dash']);

      expect(result).toEqual({ 'key-with-dash': 1 });
    });

    test('should handle numeric keys', () => {
      const object = { 0: 'zero', 1: 'one', name: 'test' };
      const result = pick(object, ['0', '1']);

      expect(result).toEqual({ 0: 'zero', 1: 'one' });
    });

    test('should handle prototype properties correctly', () => {
      const object = Object.create({ inherited: 'value' });
      object.own = 'ownValue';
      const result = pick(object, ['own', 'inherited']);

      // Should only pick own properties
      expect(result).toEqual({ own: 'ownValue' });
    });
  });

  describe('real-world usage patterns', () => {
    test('should pick user filter parameters', () => {
      const query = {
        name: 'John',
        email: 'john@example.com',
        userType: 'patient',
        centerId: 1,
        page: 1,
        limit: 10,
        sortBy: 'name',
        order: 'ASC',
      };

      const filter = pick(query, ['name', 'email', 'userType', 'centerId']);
      const options = pick(query, ['page', 'limit', 'sortBy', 'order']);

      expect(filter).toEqual({
        name: 'John',
        email: 'john@example.com',
        userType: 'patient',
        centerId: 1,
      });
      expect(options).toEqual({
        page: 1,
        limit: 10,
        sortBy: 'name',
        order: 'ASC',
      });
    });

    test('should pick patient filter parameters', () => {
      const query = {
        code: 'P001',
        status: 'active',
        severityLevel: 'moderate',
        doctorId: 1,
        centerId: 1,
        page: 1,
        limit: 20,
      };

      const filter = pick(query, ['code', 'status', 'severityLevel', 'doctorId', 'centerId']);

      expect(filter).toEqual({
        code: 'P001',
        status: 'active',
        severityLevel: 'moderate',
        doctorId: 1,
        centerId: 1,
      });
    });

    test('should pick exercise config parameters', () => {
      const query = {
        exerciseId: 1,
        visionType: 'far',
        configType: 'system',
        centerId: 1,
        page: 1,
        limit: 10,
      };

      const filter = pick(query, ['exerciseId', 'visionType', 'configType', 'centerId']);

      expect(filter).toEqual({
        exerciseId: 1,
        visionType: 'far',
        configType: 'system',
        centerId: 1,
      });
    });
  });
});

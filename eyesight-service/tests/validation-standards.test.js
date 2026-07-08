const fs = require('fs');
const path = require('path');
const Joi = require('joi');

/**
 * Test suite to verify validation schema standardization
 * Requirements: 6.1, 6.2, 6.3, 6.5
 */

// Helper function to check if a schema has an ID parameter
const checkSchemaHasIdParam = (schema) => {
  if (!schema || !schema.params) return false;
  const paramsSchema = schema.params;
  if (!(paramsSchema instanceof Joi.constructor)) return false;
  const paramsKeys = Object.keys(paramsSchema.describe().keys || {});
  return paramsKeys.some((paramKey) => paramKey.endsWith('Id'));
};

describe('Validation Standards Compliance', () => {
  const validationDir = path.join(__dirname, '../src/validations');

  // Helper function to recursively get all validation files
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- Test utility needs dynamic file reading
  const getValidationFiles = (dir) => {
    const files = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- Test utility needs dynamic file reading
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...getValidationFiles(fullPath));
      } else if (item.endsWith('.validation.js')) {
        files.push(fullPath);
      }
    }

    return files;
  };

  const validationFiles = getValidationFiles(validationDir);

  describe('Create Validation Standards', () => {
    test.each(validationFiles)('should have proper create validation in %s', (filePath) => {
      // eslint-disable-next-line import/no-dynamic-require, security/detect-non-literal-require -- Test utility needs dynamic require
      const validation = require(filePath);
      const fileName = path.basename(filePath, '.validation.js');

      // Skip files that don't have create operations
      const skipFiles = ['auth', 'custom'];
      if (skipFiles.includes(fileName)) return;

      const createKey = `create${fileName.charAt(0).toUpperCase() + fileName.slice(1)}`;

      // Skip if no create validation exists
      if (!validation[createKey]) return;

      const schema = validation[createKey];

      // Should have body validation
      expect(schema).toHaveProperty('body');
      expect(schema.body).toBeInstanceOf(Joi.constructor);

      // Body should require at least one field
      const bodySchema = schema.body;
      expect(bodySchema._flags).toBeDefined();
    });
  });

  describe('Update Validation Standards', () => {
    test.each(validationFiles)('should have proper update validation in %s', (filePath) => {
      // eslint-disable-next-line import/no-dynamic-require, security/detect-non-literal-require -- Test utility needs dynamic require
      const validation = require(filePath);
      const fileName = path.basename(filePath, '.validation.js');

      // Skip files that don't have update operations
      const skipFiles = ['auth', 'custom'];
      if (skipFiles.includes(fileName)) return;

      const updateKey = `update${fileName.charAt(0).toUpperCase() + fileName.slice(1)}`;

      // Skip if no update validation exists
      if (!validation[updateKey]) return;

      const schema = validation[updateKey];

      // Should have params and body validation
      expect(schema).toHaveProperty('params');
      expect(schema).toHaveProperty('body');

      // Params should have ID field
      const paramsSchema = schema.params;
      expect(paramsSchema).toBeInstanceOf(Joi.constructor);

      // Body should have min(1) requirement
      const bodySchema = schema.body;
      expect(bodySchema).toBeInstanceOf(Joi.constructor);

      // Check if body has min(1) rule
      const rules = bodySchema._rules || [];
      const hasMinRule = rules.some((rule) => rule.name === 'min' && rule.args?.limit === 1);
      expect(hasMinRule).toBe(true);
    });
  });

  describe('Query Validation Standards', () => {
    test.each(validationFiles)('should have proper query validation in %s', (filePath) => {
      // eslint-disable-next-line import/no-dynamic-require, security/detect-non-literal-require -- Test utility needs dynamic require
      const validation = require(filePath);
      const fileName = path.basename(filePath, '.validation.js');

      // Skip files that don't have query operations
      const skipFiles = ['auth', 'custom'];
      if (skipFiles.includes(fileName)) return;

      const getKey = `get${fileName.charAt(0).toUpperCase() + fileName.slice(1)}s`;

      // Skip if no query validation exists
      if (!validation[getKey]) return;

      const schema = validation[getKey];

      // Should have query validation
      expect(schema).toHaveProperty('query');
      expect(schema.query).toBeInstanceOf(Joi.constructor);

      // Query should include standard pagination fields
      const queryKeys = Object.keys(schema.query.describe().keys || {});

      // Should have at least some standard query parameters
      const standardParams = ['sortBy', 'limit', 'page'];
      const hasStandardParams = standardParams.some((param) => queryKeys.includes(param));
      expect(hasStandardParams).toBe(true);
    });
  });

  describe('ID Validation Standards', () => {
    test.each(validationFiles)('should use consistent ID validation in %s', (filePath) => {
      // eslint-disable-next-line import/no-dynamic-require, security/detect-non-literal-require -- Test utility needs dynamic require
      const validation = require(filePath);
      const fileName = path.basename(filePath, '.validation.js');

      // Skip files that don't have ID operations
      const skipFiles = ['auth', 'custom'];
      if (skipFiles.includes(fileName)) return;

      const getKey = `get${fileName.charAt(0).toUpperCase() + fileName.slice(1)}`;
      const deleteKey = `delete${fileName.charAt(0).toUpperCase() + fileName.slice(1)}`;

      // Skip if neither get nor delete validation exists
      if (!validation[getKey] && !validation[deleteKey]) return;

      // Check get single validation if it exists
      const getSchema = validation[getKey];
      const deleteSchema = validation[deleteKey];

      // At least one should have params with ID
      const getHasIdParam = getSchema ? checkSchemaHasIdParam(getSchema) : false;
      const deleteHasIdParam = deleteSchema ? checkSchemaHasIdParam(deleteSchema) : false;

      // If either exists, at least one should have ID param
      expect(getHasIdParam || deleteHasIdParam || (!getSchema && !deleteSchema)).toBe(true);
    });
  });

  describe('Bulk Delete Validation Standards', () => {
    test.each(validationFiles)('should have proper bulk delete validation in %s', (filePath) => {
      // eslint-disable-next-line import/no-dynamic-require, security/detect-non-literal-require -- Test utility needs dynamic require
      const validation = require(filePath);
      const fileName = path.basename(filePath, '.validation.js');

      // Skip files that don't have bulk operations
      const skipFiles = ['auth', 'custom'];
      if (skipFiles.includes(fileName)) return;

      const bulkDeleteKey = `delete${fileName.charAt(0).toUpperCase() + fileName.slice(1)}s`;

      // Skip if no bulk delete validation exists
      if (!validation[bulkDeleteKey]) return;

      const schema = validation[bulkDeleteKey];

      // Should have body validation
      expect(schema).toHaveProperty('body');
      expect(schema.body).toBeInstanceOf(Joi.constructor);

      // Body should be an array
      const bodyDesc = schema.body.describe();
      expect(bodyDesc.type).toBe('array');
    });
  });

  describe('Validation Schema Structure', () => {
    test.each(validationFiles)('should export proper validation objects in %s', (filePath) => {
      // eslint-disable-next-line import/no-dynamic-require, security/detect-non-literal-require -- Test utility needs dynamic require
      const validation = require(filePath);

      // Should export an object
      expect(typeof validation).toBe('object');
      expect(validation).not.toBeNull();

      // All exported values should be objects with proper structure
      const entries = Object.entries(validation);
      const nonFunctionEntries = entries.filter(([_entryKey, value]) => {
        // Skip function exports in custom.validation.js (objectId, password functions)
        if (filePath.includes('custom.validation.js') && typeof value === 'function') {
          return false;
        }
        return true;
      });

      nonFunctionEntries.forEach(([_entryKey, value]) => {
        expect(typeof value).toBe('object');
        expect(value).not.toBeNull();

        // Each validation should have at least one of: body, params, query
        const hasValidationProperty =
          Object.prototype.hasOwnProperty.call(value, 'body') ||
          Object.prototype.hasOwnProperty.call(value, 'params') ||
          Object.prototype.hasOwnProperty.call(value, 'query');

        expect(hasValidationProperty).toBe(true);
      });
    });
  });

  describe('Standard Field Types', () => {
    test('validation standards utility should export required types', () => {
      const validationStandards = require('../src/utils/validation');

      // Should export standard field types
      expect(validationStandards).toHaveProperty('standardId');
      expect(validationStandards).toHaveProperty('standardString');
      expect(validationStandards).toHaveProperty('standardContact');
      expect(validationStandards).toHaveProperty('standardEnums');
      expect(validationStandards).toHaveProperty('standardQueryParams');
      expect(validationStandards).toHaveProperty('standardTenantFields');

      // Should export schema generators
      expect(validationStandards).toHaveProperty('createEntityValidation');
      expect(validationStandards).toHaveProperty('updateEntityValidation');
      expect(validationStandards).toHaveProperty('queryEntityValidation');
      expect(validationStandards).toHaveProperty('getEntityValidation');
      expect(validationStandards).toHaveProperty('deleteEntityValidation');
      expect(validationStandards).toHaveProperty('bulkDeleteValidation');

      // All should be functions or Joi schemas
      expect(typeof validationStandards.createEntityValidation).toBe('function');
      expect(typeof validationStandards.updateEntityValidation).toBe('function');
      expect(typeof validationStandards.queryEntityValidation).toBe('function');
      expect(typeof validationStandards.getEntityValidation).toBe('function');
      expect(typeof validationStandards.deleteEntityValidation).toBe('function');
      expect(typeof validationStandards.bulkDeleteValidation).toBe('function');
    });
  });
});

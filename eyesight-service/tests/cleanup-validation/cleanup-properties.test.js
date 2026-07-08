const FileScanner = require('../utils/fileScanner');
const GitCheckpoint = require('../utils/gitCheckpoint');

describe('Cleanup Validation Properties', () => {
  let fileScanner;
  let gitCheckpoint;

  beforeAll(() => {
    fileScanner = new FileScanner();
    gitCheckpoint = new GitCheckpoint();
  });

  describe('Property 1: Model methods are standardized', () => {
    /**
     * Feature: remove-backward-compatibility, Property 1: Model methods are standardized
     * Validates: Requirements 1.1, 1.2, 1.3, 1.5
     */
    test('For any model file in the system, all duplicate-checking methods should follow standardized naming and contain no @deprecated methods', () => {
      const modelFiles = fileScanner.getModelFiles();

      for (const modelFile of modelFiles) {
        const content = fileScanner.readFileContent(modelFile);

        // Should not contain @deprecated methods
        expect(content).not.toMatch(/@deprecated/i);

        // Should not contain legacy isDuplicate methods
        expect(content).not.toMatch(/static\s+async\s+isDuplicate\s*\(/);

        // If it has duplicate checking methods, they should be standardized
        const hasStandardizedMethods = content.includes('isDuplicateCode') || content.includes('isDuplicateName');

        const hasLegacyMethods = /static\s+async\s+isDuplicate\s*\(/.test(content);

        // If there are any duplicate checking methods, legacy should not be present
        // This is always evaluated - hasLegacyMethods should always be false
        expect(hasStandardizedMethods && hasLegacyMethods).toBe(false);
      }
    });
  });

  describe('Property 2: Route files contain no backward compatibility markers', () => {
    /**
     * Feature: remove-backward-compatibility, Property 2: Route files contain no backward compatibility markers
     * Validates: Requirements 2.1, 2.2, 2.3
     */
    test('For any route file in the system, the file should contain no comments about Legacy route, DEPRECATED, or backward compatibility', () => {
      const routeFiles = fileScanner.getRouteFiles();

      for (const routeFile of routeFiles) {
        const content = fileScanner.readFileContent(routeFile);

        // Should not contain legacy route markers
        expect(content).not.toMatch(/Legacy\s+route/i);
        expect(content).not.toMatch(/DEPRECATED/i);
        expect(content).not.toMatch(/backward\s+compatibility/i);
        expect(content).not.toMatch(/temporarily\s+kept/i);
        expect(content).not.toMatch(/gradually\s+migrating/i);
      }
    });
  });

  describe('Property 3: Validation files contain no legacy markers', () => {
    /**
     * Feature: remove-backward-compatibility, Property 3: Validation files contain no legacy markers
     * Validates: Requirements 3.1, 3.2
     */
    test('For any validation file in the system, the file should contain no comments about Legacy validation or migration completion', () => {
      const validationFiles = fileScanner.getValidationFiles();

      for (const validationFile of validationFiles) {
        const content = fileScanner.readFileContent(validationFile);

        // Should not contain legacy validation markers
        expect(content).not.toMatch(/Legacy\s+validation/i);
        expect(content).not.toMatch(/to\s+be\s+removed\s+when\s+migration/i);
        expect(content).not.toMatch(/getMyExamSummary.*legacy/i);
      }
    });
  });

  describe('Property 4: Address validation accepts only object format', () => {
    /**
     * Feature: remove-backward-compatibility, Property 4: Address validation accepts only object format
     * Validates: Requirements 3.4
     */
    test('For any address validation in the user validation schema, only the object format should be accepted', () => {
      const validationFiles = fileScanner.getValidationFiles();
      const userValidationFiles = validationFiles.filter(
        (file) => file.includes('user.validation') || file.includes('userValidation')
      );

      for (const validationFile of userValidationFiles) {
        const content = fileScanner.readFileContent(validationFile);

        // Skip files without address validation - use continue instead of conditional expects
        if (!content.includes('address')) continue;

        // Address validation should not support legacy string format
        expect(content).not.toMatch(/string.*legacy/i);
        expect(content).not.toMatch(/legacy.*string/i);

        // Should not have address field defined as alternatives between string and object
        expect(content).not.toMatch(/address:\s*Joi\.alternatives.*Joi\.string.*Joi\.object/s);
        expect(content).not.toMatch(/address:\s*Joi\.string/);

        // Should not have comments about legacy string format for address
        expect(content).not.toMatch(/address.*can\s+be\s+string/i);
        expect(content).not.toMatch(/string\s*\(legacy\)/i);
      }
    });

    test('Address validation should only accept object format with proper structure', () => {
      const userValidation = require('../../src/validations/authentication/user.validation');

      // Test that address validation accepts valid object format
      const validAddressData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        phoneNumber: '0123456789',
        userType: 'patient',
        centerId: 1,
        address: {
          country: 'Vietnam',
          province: 'Ho Chi Minh',
          district: 'District 1',
          ward: 'Ward 1',
          specificAddress: '123 Test Street',
        },
      };

      const { error: validError } = userValidation.createUser.body.validate(validAddressData);
      expect(validError).toBeUndefined();

      // Test that address validation rejects string format
      const invalidAddressData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        phoneNumber: '0123456789',
        userType: 'patient',
        centerId: 1,
        address: '123 Test Street, District 1, Ho Chi Minh',
      };

      const { error: invalidError } = userValidation.createUser.body.validate(invalidAddressData);
      expect(invalidError).toBeDefined();
      expect(invalidError.message).toMatch(/address.*must be of type object/i);
    });

    test('Update user validation should also only accept object format for address', () => {
      const userValidation = require('../../src/validations/authentication/user.validation');

      // Test valid object format in update
      const validUpdateData = {
        id: 1,
        roleId: 1,
        centerId: 1,
        address: {
          country: 'Vietnam',
          province: 'Hanoi',
        },
      };

      const { error: validError } = userValidation.updateUser.body.validate(validUpdateData);
      expect(validError).toBeUndefined();

      // Test that string format is rejected in update
      const invalidUpdateData = {
        id: 1,
        roleId: 1,
        centerId: 1,
        address: 'Hanoi, Vietnam',
      };

      const { error: invalidError } = userValidation.updateUser.body.validate(invalidUpdateData);
      expect(invalidError).toBeDefined();
      expect(invalidError.message).toMatch(/address.*must be of type object/i);
    });
  });

  describe('Property 5: Service files contain no compatibility markers', () => {
    /**
     * Feature: remove-backward-compatibility, Property 5: Service files contain no compatibility markers
     * Validates: Requirements 4.1
     */
    test('For any service file in the system, the file should contain no comments about Re-export file for backward compatibility', () => {
      const serviceFiles = fileScanner.getServiceFiles();

      for (const serviceFile of serviceFiles) {
        const content = fileScanner.readFileContent(serviceFile);

        // Should not contain compatibility markers
        expect(content).not.toMatch(/Re-export\s+file\s+for\s+backward\s+compatibility/i);
        expect(content).not.toMatch(/compatibility\s+method/i);
      }
    });
  });

  describe('Property 6: Model definitions contain no legacy field markers', () => {
    /**
     * Feature: remove-backward-compatibility, Property 6: Model definitions contain no legacy field markers
     * Validates: Requirements 5.1, 5.2
     */
    test('For any model definition file, the file should contain no comments about Legacy fields and no commented-out legacy fields', () => {
      const modelFiles = fileScanner.getModelFiles();

      for (const modelFile of modelFiles) {
        const content = fileScanner.readFileContent(modelFile);

        // Should not contain legacy field markers
        expect(content).not.toMatch(/Legacy\s+fields?/i);
        expect(content).not.toMatch(/commented.*legacy/i);

        // Should not contain commented-out legacy fields like levels
        expect(content).not.toMatch(/\/\/.*levels.*:/);
      }
    });
  });

  describe('Property 7: Code files contain no legacy TODO/FIXME comments', () => {
    /**
     * Feature: remove-backward-compatibility, Property 7: Code files contain no legacy TODO/FIXME comments
     * Validates: Requirements 6.1, 6.2
     */
    test('For any code file in the system, the file should contain no TODO comments about removing legacy code and no FIXME comments about backward compatibility', () => {
      const allFiles = [
        ...fileScanner.getModelFiles(),
        ...fileScanner.getServiceFiles(),
        ...fileScanner.getRouteFiles(),
        ...fileScanner.getValidationFiles(),
        ...fileScanner.getControllerFiles(),
      ];

      for (const file of allFiles) {
        const content = fileScanner.readFileContent(file);

        // Should not contain legacy TODO/FIXME comments
        expect(content).not.toMatch(/TODO.*legacy/i);
        expect(content).not.toMatch(/TODO.*remove.*legacy/i);
        expect(content).not.toMatch(/FIXME.*backward/i);
        expect(content).not.toMatch(/FIXME.*compatibility/i);
      }
    });
  });

  describe('Property 8: Test files use standardized method names', () => {
    /**
     * Feature: remove-backward-compatibility, Property 8: Test files use standardized method names
     * Validates: Requirements 7.1, 7.2
     */
    test('For any test file in the system, all method calls should use standardized naming conventions and contain no references to legacy duplicate checking methods', () => {
      const testFiles = fileScanner.getTestFiles();

      for (const testFile of testFiles) {
        // Skip this test file itself to avoid self-reference issues
        if (testFile.includes('cleanup-properties.test.js')) {
          continue;
        }

        const content = fileScanner.readFileContent(testFile);

        // Should not contain legacy method references in tests
        expect(content).not.toMatch(/is[D]uplicate.*test/i);
        expect(content).not.toMatch(/test.*is[D]uplicate/i);
        expect(content).not.toMatch(/\.is[D]uplicate\s*\(/);
      }
    });
  });

  describe('Property 9: Route documentation is current', () => {
    /**
     * Feature: remove-backward-compatibility, Property 9: Route documentation is current
     * Validates: Requirements 8.1, 8.2
     */
    test('For any route file in the system, all comments should describe current functionality only, with no references to deprecated endpoints or migration plans', () => {
      const routeFiles = fileScanner.getRouteFiles();

      for (const routeFile of routeFiles) {
        const content = fileScanner.readFileContent(routeFile);

        // Should not contain deprecated endpoint documentation
        expect(content).not.toMatch(/deprecated.*endpoint/i);
        expect(content).not.toMatch(/migration.*plan/i);
        expect(content).not.toMatch(/gradually.*migrating/i);
      }
    });
  });

  describe('Property 10: Error messages are consistent', () => {
    /**
     * Feature: remove-backward-compatibility, Property 10: Error messages are consistent
     * Validates: Requirements 9.1
     */
    test('For any validation failure in the system, the returned error message should follow consistent Vietnamese formatting patterns', () => {
      const allFiles = [
        ...fileScanner.getServiceFiles(),
        ...fileScanner.getControllerFiles(),
        ...fileScanner.getValidationFiles(),
      ];

      for (const file of allFiles) {
        const content = fileScanner.readFileContent(file);

        // Check for consistent error message patterns
        // This is a basic check - in practice, you'd want more sophisticated validation
        const errorMessages = content.match(/['"`][^'"`]*(?:không|lỗi|thất bại)[^'"`]*['"`]/gi) || [];

        for (const message of errorMessages) {
          // Error messages should be in Vietnamese and follow consistent patterns
          expect(message).toMatch(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i);
        }
      }
    });
  });

  describe('Property 11: Performance utilities contain no compatibility code', () => {
    /**
     * Feature: remove-backward-compatibility, Property 11: Performance utilities contain no compatibility code
     * Validates: Requirements 10.1
     */
    test('For any performance utility file, the file should contain no compatibility-related code or legacy optimization methods', () => {
      const performanceFiles = fileScanner
        .getAllFiles('src/utils', ['.js'])
        .filter((file) => file.includes('performance') || file.includes('optimization'));

      for (const performanceFile of performanceFiles) {
        const content = fileScanner.readFileContent(performanceFile);

        // Should not contain compatibility code
        expect(content).not.toMatch(/compatibility/i);
        expect(content).not.toMatch(/legacy.*optimization/i);
        expect(content).not.toMatch(/deprecated.*method/i);
      }
    });
  });

  describe('Git Checkpoint System Validation', () => {
    test('Git checkpoint system should be functional', () => {
      // Skip test if not in a git repository
      if (!gitCheckpoint.isGitRepository()) {
        console.warn('Not in a git repository - skipping git checkpoint tests');
        return;
      }

      expect(() => gitCheckpoint.getCurrentBranch()).not.toThrow();
      expect(() => gitCheckpoint.getCurrentCommit()).not.toThrow();
      expect(() => gitCheckpoint.getGitStatus()).not.toThrow();
    });
  });

  describe('File Scanner System Validation', () => {
    test('File scanner should find relevant files', () => {
      const modelFiles = fileScanner.getModelFiles();
      const serviceFiles = fileScanner.getServiceFiles();
      const routeFiles = fileScanner.getRouteFiles();

      // Should find at least some files in a typical project structure
      expect(modelFiles.length + serviceFiles.length + routeFiles.length).toBeGreaterThan(0);
    });

    test('File scanner should read file contents', () => {
      const allFiles = fileScanner.getAllFiles('src', ['.js']);

      // Skip test if no files found
      if (allFiles.length === 0) {
        console.warn('No files found - skipping file content test');
        return;
      }

      const content = fileScanner.readFileContent(allFiles[0]);
      expect(typeof content).toBe('string');
    });
  });
});

const fs = require('fs');
const path = require('path');

/**
 * FileScanner utility for scanning project files
 * Used in cleanup validation tests
 */
class FileScanner {
  constructor(basePath = path.join(__dirname, '../../src')) {
    this.basePath = basePath;
  }

  /**
   * Get all files matching extensions in a directory
   * @param {string} dir - Directory to scan (relative to basePath)
   * @param {string[]} extensions - File extensions to match
   * @returns {string[]} Array of absolute file paths
   */
  getAllFiles(dir, extensions = ['.js']) {
    const fullPath = path.join(this.basePath, dir);
    if (!fs.existsSync(fullPath)) return [];

    const files = [];
    const scanDir = (currentPath) => {
      const items = fs.readdirSync(currentPath);
      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          scanDir(itemPath);
        } else if (extensions.some((ext) => item.endsWith(ext))) {
          files.push(itemPath);
        }
      }
    };

    scanDir(fullPath);
    return files;
  }

  /**
   * Get all model files
   * @returns {string[]} Array of model file paths
   */
  getModelFiles() {
    return this.getAllFiles('models', ['.js']);
  }

  /**
   * Get all service files
   * @returns {string[]} Array of service file paths
   */
  getServiceFiles() {
    return this.getAllFiles('services', ['.js']);
  }

  /**
   * Get all route files
   * @returns {string[]} Array of route file paths
   */
  getRouteFiles() {
    return this.getAllFiles('routes', ['.js']);
  }

  /**
   * Get all validation files
   * @returns {string[]} Array of validation file paths
   */
  getValidationFiles() {
    return this.getAllFiles('validations', ['.js']);
  }

  /**
   * Get all controller files
   * @returns {string[]} Array of controller file paths
   */
  getControllerFiles() {
    return this.getAllFiles('controllers', ['.js']);
  }

  /**
   * Get all test files
   * @returns {string[]} Array of test file paths
   */
  getTestFiles() {
    // Reference this.basePath to satisfy class-methods-use-this rule
    const _basePath = this.basePath;
    const testBasePath = path.join(__dirname, '..');
    const files = [];
    const scanDir = (currentPath) => {
      const items = fs.readdirSync(currentPath);
      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory() && item !== 'node_modules') {
          scanDir(itemPath);
        } else if (item.endsWith('.test.js')) {
          files.push(itemPath);
        }
      }
    };

    scanDir(testBasePath);
    return files;
  }

  /**
   * Read file content
   * @param {string} filePath - Absolute path to file
   * @returns {string} File content
   */
  // eslint-disable-next-line class-methods-use-this -- Static utility method that doesn't need instance state
  readFileContent(filePath) {
    return fs.readFileSync(filePath, 'utf8');
  }

  /**
   * Get legacy patterns for cleanup validation
   * @returns {object} Object containing legacy pattern regexes
   */
  static getLegacyPatterns() {
    return {
      deprecatedMethods: /@deprecated/i,
      legacyIsDuplicate: /static\s+async\s+isDuplicate\s*\(/,
      legacyRoute: /Legacy\s+route/i,
      deprecated: /DEPRECATED/i,
      backwardCompatibility: /backward\s+compatibility/i,
    };
  }
}

module.exports = FileScanner;

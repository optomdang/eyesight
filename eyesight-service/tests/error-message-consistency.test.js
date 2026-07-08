const fs = require('fs');
const path = require('path');

describe('Error Message Consistency', () => {
  const serviceDir = path.join(__dirname, '../src/services');

  // Get all JavaScript files in services directory
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- Test utility needs dynamic file reading
  const getAllJsFiles = (dir) => {
    let files = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- Test utility needs dynamic file reading
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files = files.concat(getAllJsFiles(fullPath));
      } else if (item.endsWith('.js')) {
        files.push(fullPath);
      }
    }

    return files;
  };

  test('should use ApiError instead of throw new Error for user-facing errors', () => {
    const serviceFiles = getAllJsFiles(serviceDir);
    const violations = [];

    for (const file of serviceFiles) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- Test utility needs dynamic file reading
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\\n');

      lines.forEach((line, index) => {
        // Skip utility functions that legitimately use throw new Error
        if (file.includes('exerciseFrequency.service.js')) {
          return;
        }

        // Check for throw new Error patterns that should be ApiError
        if (
          line.includes('throw new Error(') &&
          !line.includes('// Internal utility error') &&
          !line.includes('Unsupported frequency')
        ) {
          violations.push({
            file: path.relative(serviceDir, file),
            line: index + 1,
            content: line.trim(),
          });
        }
      });
    }

    if (violations.length > 0) {
      const message = violations.map((v) => `${v.file}:${v.line} - ${v.content}`).join('\\n');

      throw new Error(`Found ${violations.length} violations of ApiError usage:\\n${message}`);
    }
  });

  test('should use Vietnamese error messages consistently', () => {
    const serviceFiles = getAllJsFiles(serviceDir);
    const englishErrorPatterns = [
      /ApiError.*'[A-Z][a-z].*not found'/i,
      /ApiError.*'[A-Z][a-z].*already exists'/i,
      /ApiError.*'[A-Z][a-z].*is required'/i,
      /ApiError.*'[A-Z][a-z].*invalid'/i,
      /ApiError.*'[A-Z][a-z].*forbidden'/i,
      /ApiError.*'[A-Z][a-z].*unauthorized'/i,
    ];

    const violations = [];

    for (const file of serviceFiles) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- Test utility needs dynamic file reading
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\\n');

      lines.forEach((line, index) => {
        for (const pattern of englishErrorPatterns) {
          if (pattern.test(line)) {
            violations.push({
              file: path.relative(serviceDir, file),
              line: index + 1,
              content: line.trim(),
            });
          }
        }
      });
    }

    if (violations.length > 0) {
      const message = violations.map((v) => `${v.file}:${v.line} - ${v.content}`).join('\\n');

      throw new Error(`Found ${violations.length} English error messages that should be Vietnamese:\\n${message}`);
    }
  });

  test('should have consistent Vietnamese error message patterns', () => {
    const serviceFiles = getAllJsFiles(serviceDir);
    const expectedPatterns = {
      'không tồn tại': 'for not found errors',
      'đã tồn tại': 'for already exists errors',
      'là bắt buộc': 'for required field errors',
    };

    const patternCounts = {};
    Object.keys(expectedPatterns).forEach((patternKey) => {
      patternCounts[patternKey] = 0;
    });

    for (const file of serviceFiles) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- Test utility needs dynamic file reading
      const content = fs.readFileSync(file, 'utf8');

      Object.keys(expectedPatterns).forEach((patternKey) => {
        // eslint-disable-next-line security/detect-non-literal-regexp -- Pattern is from predefined constant
        const matches = content.match(new RegExp(patternKey, 'g'));
        if (matches) {
          patternCounts[patternKey] += matches.length;
        }
      });
    }

    // Verify we have consistent usage of Vietnamese patterns
    Object.keys(expectedPatterns).forEach((patternKey) => {
      expect(patternCounts[patternKey]).toBeGreaterThan(0);
    });

    console.log('Vietnamese error message pattern usage:');
    Object.keys(patternCounts).forEach((patternKey) => {
      console.log(`  "${patternKey}": ${patternCounts[patternKey]} occurrences`);
    });
  });
});

module.exports = {
  testEnvironment: 'node',
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },
  setupFiles: ['<rootDir>/tests/setup/globalPolyfills.js'],
  restoreMocks: true,
  coveragePathIgnorePatterns: ['node_modules', 'src/config', 'src/app.js', 'tests'],
  coverageReporters: ['text', 'lcov', 'clover', 'html'],
  transformIgnorePatterns: ['node_modules/(?!(fast-check)/)'],
  moduleNameMapper: {
    '^axios$': '<rootDir>/tests/mocks/axios.js',
    // Jest 26 can't resolve the `node:`-prefixed builtins used by @sentry/node@10.
    // Error tracking is irrelevant in tests, so stub the SDK entirely.
    '^@sentry/node$': '<rootDir>/tests/mocks/sentry.js',
  },
  // Force Jest to exit after all tests complete to avoid open handle warnings
  forceExit: true,
  // Suppress the forceExit suggestion message
  errorOnDeprecated: false,
};

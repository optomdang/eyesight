/**
 * Test stub for @sentry/node.
 *
 * The real SDK (v10) imports `node:`-prefixed builtins that jest 26 cannot resolve,
 * and error tracking has no place in the test environment. This no-op stub exposes
 * the small surface that src/config/sentry.js touches.
 */
const noop = () => {};

module.exports = {
  init: noop,
  addBreadcrumb: noop,
  captureException: noop,
  captureMessage: noop,
  setUser: noop,
  setupExpressErrorHandler: noop,
  // Misc helpers some Sentry call-sites use; harmless no-ops.
  withScope: (fn) => fn({ setTag: noop, setUser: noop, setExtra: noop }),
  getCurrentHub: () => ({ getClient: () => undefined }),
};

/**
 * Global polyfills for the jest `node` test sandbox.
 *
 * Node itself exposes `globalThis.performance` (perf_hooks) since v16, but jest's
 * node test environment does not always surface it inside the VM sandbox. Some
 * libraries in the HTTP request path read the global `performance`, so we make sure
 * it exists. No-op when already present.
 */
if (typeof global.performance === 'undefined') {
  // eslint-disable-next-line global-require
  global.performance = require('perf_hooks').performance;
}

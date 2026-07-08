const admin = require('firebase-admin');
const logger = require('../config/logger');

let initialized = false;
let disabled = false;

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }

  try {
    // Local dev only — file is gitignored and absent on Render
    // eslint-disable-next-line global-require, import/no-unresolved
    return require('../../firebase-admin-sdk.json');
  } catch {
    return null;
  }
}

function getFirebaseAdmin() {
  if (disabled) return null;
  if (initialized) return admin;

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    disabled = true;
    logger.warn('Firebase Admin disabled — push notifications skipped (no credentials).');
    return null;
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  initialized = true;
  return admin;
}

/** FCM-compatible facade; no-op when Firebase is not configured. */
module.exports = {
  messaging() {
    const instance = getFirebaseAdmin();
    if (!instance) {
      return {
        send: async () => {
          logger.warn('FCM send skipped — Firebase not configured');
          return null;
        },
        sendEachForMulticast: async () => ({ successCount: 0, failureCount: 0 }),
      };
    }
    return instance.messaging();
  },
};

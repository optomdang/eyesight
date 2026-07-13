import { axiosClient } from 'src/utils/request';

/** Warm Render/Neon cold starts while the user fills the login form. */
export const wakeApiServer = (): void => {
  void axiosClient.get('version', { timeout: 90000 }).catch(() => {
    // Non-fatal: login will retry with its own longer timeout.
  });
};

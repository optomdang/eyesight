import { axiosClient } from 'src/utils/request';

const WAKE_TIMEOUT_MS = 90_000;
const PING_TIMEOUT_MS = 15_000;
const RETRY_GAP_MS = 1_500;

let inFlight: Promise<boolean> | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const pingVersion = async (): Promise<boolean> => {
  try {
    await axiosClient.get('version', { timeout: PING_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
};

/** Keep pinging /version until the API answers or we give up. */
export const ensureApiReady = (): Promise<boolean> => {
  if (!inFlight) {
    inFlight = (async () => {
      const started = Date.now();
      while (Date.now() - started < WAKE_TIMEOUT_MS) {
        if (await pingVersion()) return true;
        await sleep(RETRY_GAP_MS);
      }
      return false;
    })().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
};

/** Start warming Render/Neon as soon as the login page opens. */
export const wakeApiServer = (): void => {
  void ensureApiReady();
};

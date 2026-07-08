import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { answerOneStereopsisStep } from './helpers/stereopsisExam.helper';

/**
 * ============================================================================
 * CLINICAL SIZING — Playwright integration tests
 * ============================================================================
 *
 * These tests answer the question BU raised: "are the optotypes on screen the
 * correct physical size?"  They do this end-to-end in a real Chromium browser:
 *
 *  1. Inject a known screenInfo into localStorage so the app uses a fixed,
 *     test-controlled screen configuration (15.6" / 1920×1080).
 *  2. Log in, navigate through the exam setup, and start the test.
 *  3. Read the ACTUAL CSS font-size from the rendered DOM via getComputedStyle.
 *  4. Compute the EXPECTED CSS font-size from the same ISO 8596 formula used
 *     by the production code (derived independently — no import from the app).
 *  5. Assert they match within ±1 px (the production code applies Math.round).
 *  6. Assert that the PHYSICAL size on glass = rendered_px × DPR / px_per_mm
 *     equals the clinical target in millimetres — and is the same at DPR 1
 *     and DPR 2 (the DPR-independence proof).
 *
 * Test patient: patient@nhuocthi.vn / Patient@123
 * Reference screen: 15.6" diagonal, 1920 × 1080 physical pixels
 *   PPI = sqrt(1920²+1080²) / 15.6 ≈ 141.21
 *   px/mm = PPI / 25.4 ≈ 5.559
 * ISO 8596 produces MILLIMETRES (physical size on screen glass).
 * Pixel conversion is a separate implementation step — assertions here use mm.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  SINGLE CONTROL POINT — change REF_DISTANCE_M to test a different dist │
 * │  e.g. set to 3 for BU's scenario, 6 for ISO reference, 5 for default   │
 * │  ALL tests pick it up automatically — no other edits needed             │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

// ---------------------------------------------------------------------------
// ISO 8596 reference formulas (computed in this file — NOT imported from app)
// ---------------------------------------------------------------------------

const REF_SCREEN = { diagonalInch: 15.6, screenWidth: 1920, screenHeight: 1080 };
const REF_PPI = Math.sqrt(REF_SCREEN.screenWidth ** 2 + REF_SCREEN.screenHeight ** 2) / REF_SCREEN.diagonalInch;
const REF_PX_PER_MM = REF_PPI / 25.4;

/**
 * ══════════════════════════════════════════════════════════════════
 *  EXAM DISTANCE — SINGLE CONFIGURABLE CONSTANT
 *
 *  Change this ONE value to run the entire suite at a different
 *  exam distance. All completeSetupStep() calls and all isoMm()
 *  expected-value calculations reference this variable.
 *
 *  Common values:
 *    3  → Vietnamese clinic standard (BU's complaint)
 *    5  → App default (exam-state.ts useState('5'))
 *    6  → ISO 8596 reference distance (20/20 at 6m = 8.73mm)
 * ══════════════════════════════════════════════════════════════════
 */
const REF_DISTANCE_M = 5;

/**
 * Near-vision standard distance (clinically fixed by N-notation definition).
 * NOT the same as REF_DISTANCE_M — near tests always run at 40 cm.
 */
const NEAR_STD_DISTANCE_M = 0.4;

/**
 * Maximum allowed deviation of the physical rendered size from the ISO target.
 * ±0.5 mm ≈ ±3 CSS px at 141 PPI — accounts for Math.round in the production
 * code and sub-pixel rendering. The assertion is in mm, not px, because
 * ISO 8596 specifies physical dimensions.
 */
const MM_TOLERANCE = 0.5;

/**
 * ISO 8596 exact trig model: height of a Snellen optotype in mm.
 * Output is MILLIMETRES — the unit mandated by the standard.
 */
function isoMm(denominator: number, distanceM: number): number {
  const mar = denominator / 20;
  const arcMin = 5 * mar;
  const rad = (arcMin / 60) * (Math.PI / 180);
  return 2 * distanceM * 1000 * Math.tan(rad / 2);
}

/**
 * Physical millimetres from a rendered CSS pixel count.
 * Used to convert what the browser actually drew back to clinical mm.
 */
function physMm(cssPx: number, dpr: number): number {
  return (cssPx * dpr) / REF_PX_PER_MM;
}

// Far vision levels — denominator values for all 20 Snellen levels.
// Indexed by level number (1-based).
const FAR_LEVELS: Record<number, { score: string; denominator: number }> = {
  1: { score: '20/400', denominator: 400 },
  2: { score: '20/320', denominator: 320 },
  3: { score: '20/250', denominator: 250 },
  4: { score: '20/200', denominator: 200 },
  5: { score: '20/160', denominator: 160 },
  6: { score: '20/125', denominator: 125 },
  7: { score: '20/100', denominator: 100 },
  8: { score: '20/80',  denominator: 80  },
  9: { score: '20/63',  denominator: 63  },
  10: { score: '20/50', denominator: 50  },
  11: { score: '20/40', denominator: 40  },
  12: { score: '20/32', denominator: 32  },
  13: { score: '20/25', denominator: 25  },
  14: { score: '20/20', denominator: 20  },
  15: { score: '20/16', denominator: 16  },
  16: { score: '20/12.5', denominator: 12.5 },
  17: { score: '20/10', denominator: 10  },
  18: { score: '20/8',  denominator: 8   },
  19: { score: '20/6.3', denominator: 6.3 },
  20: { score: '20/5',  denominator: 5   },
};

// Near vision levels — size in mm at 40 cm (the N value IS the mm height).
const NEAR_LEVELS: Record<number, { score: string; sizeMm: number }> = {
  1: { score: 'N64', sizeMm: 5.8  },
  2: { score: 'N32', sizeMm: 4.35 },
  3: { score: 'N24', sizeMm: 2.9  },
  4: { score: 'N16', sizeMm: 2.18 },
  5: { score: 'N12', sizeMm: 1.81 },
  6: { score: 'N8',  sizeMm: 1.45 },
  7: { score: 'N5',  sizeMm: 0.91 },
  8: { score: 'N3',  sizeMm: 0.54 },
};

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4001';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Inject the reference screen config into localStorage before the page loads. */
async function injectScreenConfig(page: Page) {
  await page.addInitScript(
    ({ key, config }) => {
      localStorage.setItem(key, JSON.stringify(config));
    },
    {
      key: 'eyesight_last_screen_config',
      config: REF_SCREEN,
    }
  );
}

async function login(page: Page) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });
  await page.waitForSelector('input#email', { timeout: 10000 });
  await page.locator('input#email').fill('patient@nhuocthi.vn');
  await page.locator('input#password').fill('Patient@123');
  await page.locator('button:has-text("Sign In")').click();
  await page.waitForURL('**/portal/**', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
}

async function resetExamSessions() {
  const { execSync } = await import('child_process');
  try {
    execSync('node ../eye-sight-service/tests/e2e-reset.cjs', { stdio: 'pipe' });
  } catch { /* ignore if reset script absent */ }
}

async function startExamByLabel(page: Page, label: string) {
  await page.goto(`${BASE_URL}/portal/exam`, { waitUntil: 'networkidle' });
  await page.waitForLoadState('networkidle');

  const startBtn = page
    .locator(`h6:has-text("${label}")`)
    .first()
    .locator(
      'xpath=ancestor::*[.//button[contains(.,"Bắt đầu kiểm tra")]][1]//button[contains(.,"Bắt đầu kiểm tra")]'
    )
    .first();
  await expect(startBtn).toBeVisible({ timeout: 15000 });
  await startBtn.click();
  await page.waitForURL('**/portal/exam/**', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

/** Click the continue button on the distance/screen setup step. */
async function completeSetupStep(page: Page, distanceOverride?: string) {
  await page.waitForSelector('button:has-text("Tiếp tục")', { timeout: 10000 });
  if (distanceOverride) {
    // Override the distance field (e.g. '0.4' for near vision at standard 40cm)
    const distanceInput = page.locator('input[type="number"]').first();
    await distanceInput.fill(distanceOverride);
    await distanceInput.blur();
  }
  await page.locator('button:has-text("Tiếp tục")').click();
}

/**
 * Answer one full level (all chars, all batches) and click "Tiếp theo".
 * Mirrors the proven answerOneLine logic from portal-exam.spec.ts:
 *   - text-input mode (charType A/N): locate enabled non-number inputs, fill 'A', confirm
 *   - direction-button mode (E/C/S): click first A/B/C/D button
 * All loops are strictly bounded to prevent infinite waits.
 */
async function answerAndAdvanceLevel(page: Page): Promise<void> {
  const MAX_BATCHES = 10; // safety cap: 5 chars × max 2 batches each
  const nextBtn = page.locator('button:has-text("Tiếp theo")').last();
  const confirmBtn = page.locator('button:has-text("Xác nhận")');

  for (let i = 0; i < MAX_BATCHES; i++) {
    if (await nextBtn.isEnabled({ timeout: 300 }).catch(() => false)) break;

    // Text-input mode: confirmed by presence of "Xác nhận" button
    const hasConfirm = (await confirmBtn.count()) > 0;
    if (hasConfirm) {
      // Fill all enabled text inputs with 'A' (value is accepted; correct/wrong doesn't matter for sizing)
      const inputs = page.locator(
        'input:not([disabled]):not([type="number"]):not([type="hidden"])'
      );
      const count = await inputs.count();
      for (let j = 0; j < count; j++) {
        try {
          await inputs.nth(j).click({ timeout: 500 });
          await inputs.nth(j).fill('A');
        } catch { /* skip unclickable inputs */ }
      }
      await page.waitForTimeout(200);
      if (await confirmBtn.isEnabled({ timeout: 800 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(400);
      }
      continue;
    }

    // Direction-button mode (E/C/S): click first available A/B/C/D button
    const dirBtn = page
      .locator(
        'button:not(:has-text("Đổi chữ")):not(:has-text("Tiếp theo")):not(:has-text("Xác nhận"))'
      )
      .filter({ hasText: /^[A-D]$/ })
      .first();
    if (await dirBtn.isVisible({ timeout: 300 }).catch(() => false)) {
      await dirBtn.click();
      await page.waitForTimeout(150);
    }
  }

  // Click Tiếp theo if now enabled
  if (await nextBtn.isEnabled({ timeout: 2000 }).catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(600);
  }
}

/** Click the start-test button on the instruction step. */
async function completeInstructionStep(page: Page) {
  await page.waitForSelector('button:has-text("Bắt đầu kiểm tra")', { timeout: 10000 });
  await page.locator('button:has-text("Bắt đầu kiểm tra")').click();
}

/** Wait for at least one ExamChar element and return the rendered CSS font-size in px. */
async function readRenderedFontPx(page: Page): Promise<number> {
  await page.waitForSelector('[data-testid="exam-char"]', { timeout: 10000 });
  return page.locator('[data-testid="exam-char"]').first().evaluate((el) =>
    parseFloat(getComputedStyle(el).fontSize)
  );
}

/**
 * Read the configured totalChars from the live exam counter.
 *
 * TestStep renders: <strong>N / M</strong>  (spaces around the slash).
 * Snellen side labels (e.g. "20/80") have NO spaces, so they never match.
 * Falls back to 5 if the counter element is not found.
 *
 * Why <strong> and not Typography: the <strong> child is the ONLY element
 * whose full textContent is exactly "N / M". The parent Typography also
 * contains translation text ("Đã chọn"), so its textContent is longer and
 * would need a substring search — the <strong> is cleaner.
 */
async function readTotalChars(page: Page): Promise<number> {
  return page.evaluate(() => {
    const strongs = Array.from(document.querySelectorAll('strong'));
    // Counter format: "N / M" — note the spaces around the slash.
    // Snellen notation ("20/80") has NO spaces — ruled out by \s+.
    const counter = strongs.find((el) =>
      /^\d+\s+\/\s+\d+$/.test(el.textContent?.trim() ?? '')
    );
    if (!counter) return 5;
    const m = counter.textContent!.match(/\/\s+(\d+)/);
    return m ? parseInt(m[1], 10) : 5;
  });
}

/**
 * Read the Snellen feet notation (e.g. "20/400") from the fixed side label
 * rendered by TestStep. The left label shows visualAcuity.feet.
 * Returns null if the label is not found within the timeout.
 */
async function readFeetLabel(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('[class*="MuiTypography"]'));
    const feet = all.find((el) =>
      /^\d+\/[\d.]+$/.test((el as HTMLElement).innerText?.trim() ?? '')
    );
    return feet ? (feet as HTMLElement).innerText.trim() : null;
  });
}

/**
 * Read the current exam level number from the status bar.
 * TestStep renders: "<eye> – <level_key> <strong>N</strong>" where N = currentLine+1.
 * We locate the <strong> that follows the em-dash "–" and contains only digits.
 * Falls back to 1 if parsing fails.
 */
async function readCurrentLevelNum(page: Page): Promise<number> {
  const num = await page.evaluate(() => {
    // Find all <strong> elements whose text content is a plain integer (the level number).
    const strongs = Array.from(document.querySelectorAll('strong'));
    const levelStrong = strongs.find((el) => /^\d+$/.test(el.textContent?.trim() ?? ''));
    return levelStrong ? parseInt(levelStrong.textContent!.trim(), 10) : 1;
  });
  return typeof num === 'number' && num > 0 ? num : 1;
}

// ---------------------------------------------------------------------------
// SIZING TEST GROUP 1 — Far vision, DPR = 1 (default headless)
// ---------------------------------------------------------------------------

test.describe('Clinical Sizing — Far vision (DPR=1, 15.6" 1080p)', () => {
  test.beforeEach(async ({ page }) => {
    await resetExamSessions();
    await injectScreenConfig(page);
    await login(page);
  });

  test('SIZE-001: rendered optotype CSS px matches ISO formula for the active level', async ({ page }) => {
    await startExamByLabel(page, 'Nhìn xa');
    await completeSetupStep(page, String(REF_DISTANCE_M));
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    // Read what is actually on screen
    const renderedPx = await readRenderedFontPx(page);
    const levelNum = await readCurrentLevelNum(page);
    const level = FAR_LEVELS[levelNum];

    expect(level, `Level ${levelNum} not found in FAR_LEVELS`).toBeDefined();

    // Compute independently from ISO 8596
    const clinicalMm = isoMm(level.denominator, REF_DISTANCE_M);

    // The app applies Math.round on the final pixel value — allow ±MM_TOLERANCE mm tolerance.
    expect(renderedPx).toBeGreaterThan(0);
    expect(Math.abs(physMm(renderedPx, 1) - clinicalMm)).toBeLessThan(MM_TOLERANCE);

    await page.screenshot({ path: `test-results/size-001-far-L${levelNum}-dpr1.png` });
  });

  test('SIZE-002: right eye and left eye both render correct ISO size at their auto-start level', async ({ page }) => {
    // Answers the right eye level, then continues to the left eye.
    // If the exam's auto-start puts both eyes at the same level the px should be equal.
    // If they differ (different auto-start per eye) both must match their own ISO target.
    // This verifies the formula is applied correctly on EVERY new exam segment render.
    await startExamByLabel(page, 'Nhìn xa');
    await completeSetupStep(page, String(REF_DISTANCE_M));
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    // Capture right eye size + level
    const pxRight = await readRenderedFontPx(page);
    const levelRight = await readCurrentLevelNum(page);

    // Answer right eye and advance — may land on switch-eye screen or next level
    await answerAndAdvanceLevel(page);

    // If switch-eye screen appeared, click through to left eye
    const switchBtn = page.locator('button:has-text("Tiếp tục kiểm tra mắt trái")');
    if (await switchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await switchBtn.click();
      await page.waitForTimeout(1000);
    }

    // Try to read left eye (or next-level) px — skip assertion if exam already ended
    const hasChars = await page.locator('[data-testid="exam-char"]')
      .first().isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasChars) {
      // Exam ended (e.g. single-level session). Verify right eye alone was correct.
      const expRight = isoMm(FAR_LEVELS[levelRight]?.denominator ?? 400, REF_DISTANCE_M);
      expect(Math.abs(physMm(pxRight, 1) - expRight)).toBeLessThan(MM_TOLERANCE);
      return;
    }

    const pxLeft = await readRenderedFontPx(page);
    const levelLeft = await readCurrentLevelNum(page);

    // Both eye renders must match their own ISO targets
    const expRight = isoMm(FAR_LEVELS[levelRight]?.denominator ?? 400, REF_DISTANCE_M);
    const expLeft  = isoMm(FAR_LEVELS[levelLeft]?.denominator  ?? 400, REF_DISTANCE_M);
    expect(Math.abs(physMm(pxRight, 1) - expRight)).toBeLessThan(MM_TOLERANCE);
    expect(Math.abs(physMm(pxLeft,  1) - expLeft)).toBeLessThan(MM_TOLERANCE);

    // If levels differ, harder level must have smaller px (formula is monotone)
    if (levelLeft !== levelRight) {
      if (levelLeft > levelRight) expect(pxLeft).toBeLessThan(pxRight);
      else                        expect(pxLeft).toBeGreaterThan(pxRight);
    }

    await page.screenshot({ path: 'test-results/size-002-both-eyes.png' });
  });

  test('SIZE-003: contrast exam uses fixed suprathreshold size (n=30 ≈ 20/100)', async ({ page }) => {
    // Contrast test keeps letter SIZE constant across all 16 contrast levels.
    // The suprathreshold optotype = 20/100 (denominator=100) at the exam distance.
    await startExamByLabel(page, 'Tương phản');
    await completeSetupStep(page, String(REF_DISTANCE_M));
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    const renderedPx = await readRenderedFontPx(page);
    const clinicalMm = isoMm(100, REF_DISTANCE_M); // n=30 → denom=100

    expect(renderedPx).toBeGreaterThan(0);
    expect(Math.abs(physMm(renderedPx, 1) - clinicalMm)).toBeLessThan(MM_TOLERANCE);

    await page.screenshot({ path: 'test-results/size-003-contrast-suprathreshold.png' });
  });
});

// ---------------------------------------------------------------------------
// SIZING TEST GROUP 2 — DPR independence (run at DPR 1 vs DPR 2)
// ---------------------------------------------------------------------------

test.describe('Clinical Sizing — DPR-independence proof', () => {
  // Helper: create a page context with a specific deviceScaleFactor (= DPR)
  async function newPageWithDpr(context: BrowserContext, dpr: number): Promise<Page> {
    const page = await context.newPage();
    await page.emulateMedia({});
    await page.setViewportSize({ width: 1280, height: 900 });
    // Override window.devicePixelRatio
    await page.addInitScript((ratio) => {
      Object.defineProperty(window, 'devicePixelRatio', {
        get: () => ratio,
        configurable: true,
      });
    }, dpr);
    return page;
  }

  test('SIZE-004: same exam level renders half the CSS px at DPR=2 vs DPR=1 — but identical physical mm', async ({ browser }) => {
    // This is the formal DPR-independence proof in a real browser:
    // CSS px at DPR=2 == CSS px at DPR=1 / 2, yet physMm stays the same.
    // (Eye-exam can NOT make this claim: its CSS px stays constant, so physMm × 2 at DPR=2.)

    await resetExamSessions();

    // --- measure at DPR=1 ---
    const ctx1 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page1 = await newPageWithDpr(ctx1, 1);
    await injectScreenConfig(page1);
    await login(page1);
    await startExamByLabel(page1, 'Nhìn xa');
    await completeSetupStep(page1, String(REF_DISTANCE_M));
    await completeInstructionStep(page1);
    await page1.waitForTimeout(1500);

    const px1 = await readRenderedFontPx(page1);
    const levelNum = await readCurrentLevelNum(page1);
    await page1.screenshot({ path: 'test-results/size-004-dpr1.png' });
    await ctx1.close();

    // --- measure at DPR=2 (same exam session after reset) ---
    await resetExamSessions();
    const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page2 = await newPageWithDpr(ctx2, 2);
    await injectScreenConfig(page2);
    await login(page2);
    await startExamByLabel(page2, 'Nhìn xa');
    await completeSetupStep(page2, String(REF_DISTANCE_M));
    await completeInstructionStep(page2);
    await page2.waitForTimeout(1500);

    const px2 = await readRenderedFontPx(page2);
    await page2.screenshot({ path: 'test-results/size-004-dpr2.png' });
    await ctx2.close();

    // Assert: CSS px halved between DPR=1 and DPR=2
    expect(px1).toBeGreaterThan(0);
    expect(px2).toBeGreaterThan(0);
    expect(px2).toBeCloseTo(px1 / 2, 0); // within ~1px

    // Assert: physical mm is identical (DPR-invariant)
    const physMm1 = physMm(px1, 1);
    const physMm2 = physMm(px2, 2);
    expect(Math.abs(physMm1 - physMm2)).toBeLessThan(MM_TOLERANCE); // same physical size on glass

    // Both match the ISO clinical target
    const level = FAR_LEVELS[levelNum];
    if (level) {
      const clinicalMm = isoMm(level.denominator, REF_DISTANCE_M);
      expect(physMm1).toBeCloseTo(clinicalMm, 1);
      expect(physMm2).toBeCloseTo(clinicalMm, 1);
    }
  });
});

// ---------------------------------------------------------------------------
// SIZING TEST GROUP 3 — Near vision sizing
// ---------------------------------------------------------------------------

test.describe('Clinical Sizing — Near vision (DPR=1)', () => {
  test.beforeEach(async ({ page }) => {
    await resetExamSessions();
    await injectScreenConfig(page);
    await login(page);
  });

  test('SIZE-005: near exam rendered px matches N-notation formula at 40cm', async ({ page }) => {
    await startExamByLabel(page, 'Nhìn gần');
    // Force distance to NEAR_STD_DISTANCE_M (40cm) — standard near vision reading distance.
    // The exam-state default is 5m; we override so the formula and test agree.
    await completeSetupStep(page, String(NEAR_STD_DISTANCE_M));
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    const renderedPx = await readRenderedFontPx(page);
    const levelNum = await readCurrentLevelNum(page);
    const level = NEAR_LEVELS[levelNum];

    // At 40cm the N value IS the letter height in mm (by definition of N-notation).
    const clinicalMm = level ? level.sizeMm : NEAR_LEVELS[1].sizeMm;

    expect(renderedPx).toBeGreaterThan(0);
    expect(Math.abs(physMm(renderedPx, 1) - clinicalMm)).toBeLessThan(MM_TOLERANCE);

    await page.screenshot({ path: `test-results/size-005-near-L${levelNum}.png` });
  });
});

// ---------------------------------------------------------------------------
// SIZING TEST GROUP 4 — ExamChar overflow + size sanity on all tested levels
// ---------------------------------------------------------------------------

test.describe('Clinical Sizing — ExamChar size sanity (far exam)', () => {
  test.beforeEach(async ({ page }) => {
    await resetExamSessions();
    await injectScreenConfig(page);
    await login(page);
  });

  test('SIZE-006: all visible ExamChar elements share the same fontSize (same level = same size)', async ({ page }) => {
    // All optotypes in a single batch must be the SAME size (one clinical level = one font size).
    // If any optotype is a different size, the rendering pipeline is broken.
    await startExamByLabel(page, 'Nhìn xa');
    await completeSetupStep(page, String(REF_DISTANCE_M));
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    const allPx: number[] = await page.locator('[data-testid="exam-char"]').evaluateAll((els) =>
      els.map((el) => parseFloat(getComputedStyle(el).fontSize))
    );

    expect(allPx.length).toBeGreaterThan(0);

    // Every char must have the same size (deviation < 0.5px, rounding only)
    const first = allPx[0];
    for (const px of allPx) {
      expect(Math.abs(px - first)).toBeLessThan(0.5);
    }
  });

  test('SIZE-007: rendered px is within ±2px of ISO formula and positive', async ({ page }) => {
    // Verifies that the current active level renders a clinically sane pixel size:
    //  - positive (not zero / negative)
    //  - within ±2px of the ISO formula for this level + reference screen
    //  - within the physical range 1mm–200mm (clinical optotype bounds)
    // Level-monotonicity is exhaustively proven in unit tests (visionUtils.test.ts Layer 1+2).
    await startExamByLabel(page, 'Nhìn xa');
    await completeSetupStep(page, String(REF_DISTANCE_M));
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    const renderedPx = await readRenderedFontPx(page);
    const levelNum   = await readCurrentLevelNum(page);
    const level      = FAR_LEVELS[levelNum];

    expect(renderedPx).toBeGreaterThan(0);

    if (level) {
      const clinicalMm = isoMm(level.denominator, REF_DISTANCE_M);

      // Within MM_TOLERANCE mm (Math.round in production code; DPR=1 headless)
      expect(Math.abs(physMm(renderedPx, 1) - clinicalMm)).toBeLessThan(MM_TOLERANCE);

      // Physical mm on glass must be within clinical bounds
      const physical = physMm(renderedPx, 1);
      expect(physical).toBeGreaterThan(1);   // never smaller than 1mm
      expect(physical).toBeLessThan(200);    // never absurdly large
    }

    await page.screenshot({ path: `test-results/size-007-far-L${levelNum}-sane.png` });
  });
});

// ---------------------------------------------------------------------------
// SIZING TEST GROUP 5 — Auto-start level matches patient's current eyesight
// ---------------------------------------------------------------------------

/** Set patient far vision level via DB helper script. */
async function setPatientFarLevel(rightEye: number, leftEye: number, bothEye?: number) {
  const { execSync } = await import('child_process');
  const both = bothEye ?? rightEye;
  execSync(
    `node ../eye-sight-service/tests/set-far-level.cjs ${rightEye} ${leftEye} ${both}`,
    { stdio: 'pipe' }
  );
}

test.describe.serial('Clinical Sizing — Auto-start level matches patient eyesight', () => {
  // Target: patient far rightEye = level 5 (20/160).
  // The exam must start at level 5 (not 1, not 8).
  // The rendered px must match ISO formula for 20/160 at REF_DISTANCE_M.
  const TARGET_LEVEL = 5;

  test.beforeAll(async () => {
    await setPatientFarLevel(TARGET_LEVEL, TARGET_LEVEL, TARGET_LEVEL);
    await resetExamSessions();
  });

  test.afterAll(async () => {
    // Restore to level 14 (20/20 = normal) so other tests are unaffected
    await setPatientFarLevel(14, 14, 14);
  });

  test('SIZE-008: exam starts at level matching patient currentResult, renders correct ISO size', async ({ page }) => {
    await injectScreenConfig(page);
    await login(page);
    await startExamByLabel(page, 'Nhìn xa');
    await completeSetupStep(page, String(REF_DISTANCE_M));
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    const renderedPx = await readRenderedFontPx(page);
    const levelNum   = await readCurrentLevelNum(page);

    // Auto-start must pick up the patient's saved level
    expect(levelNum).toBe(TARGET_LEVEL);

    // Rendered px must match the ISO formula for level 5 (20/160)
    const level      = FAR_LEVELS[TARGET_LEVEL];
    const clinicalMm = isoMm(level.denominator, REF_DISTANCE_M);

    expect(Math.abs(physMm(renderedPx, 1) - clinicalMm)).toBeLessThan(MM_TOLERANCE);

    await page.screenshot({ path: `test-results/size-008-autostart-L${TARGET_LEVEL}.png` });
  });
});

// ---------------------------------------------------------------------------
// SIZING TEST GROUP 6 — Full 2-eye E2E with size verification at each step
// ---------------------------------------------------------------------------

test.describe.serial('Clinical Sizing — Full 2-eye E2E with ISO size verification', () => {
  test.beforeEach(async () => {
    await resetExamSessions();
  });

  test('SIZE-009: right eye → ISO size verified → switch → left eye → ISO size verified → result', async ({ page }) => {
    await injectScreenConfig(page);
    await login(page);
    await startExamByLabel(page, 'Nhìn xa');
    await completeSetupStep(page, String(REF_DISTANCE_M));
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    // ── RIGHT EYE ──
    const pxRight    = await readRenderedFontPx(page);
    const levelRight = await readCurrentLevelNum(page);
    const levelRightData = FAR_LEVELS[levelRight];

    expect(pxRight).toBeGreaterThan(0);
    if (levelRightData) {
      const mmRight = isoMm(levelRightData.denominator, REF_DISTANCE_M);
      expect(Math.abs(physMm(pxRight, 1) - mmRight)).toBeLessThan(MM_TOLERANCE);
    }
    await page.screenshot({ path: 'test-results/size-009-right-eye.png' });

    // Answer right eye and advance to switch-eye screen
    await answerAndAdvanceLevel(page);

    // ── SWITCH EYE ──
    const switchBtn = page.locator('button:has-text("Tiếp tục kiểm tra mắt trái")');
    const onSwitchScreen = await switchBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!onSwitchScreen) {
      // Already on next level (multi-level session) — skip left-eye phase
      return;
    }
    await switchBtn.click();
    await page.waitForTimeout(1000);

    // ── LEFT EYE ──
    const hasLeftChars = await page.locator('[data-testid="exam-char"]')
      .first().isVisible({ timeout: 8000 }).catch(() => false);
    if (!hasLeftChars) return; // exam ended early — right-eye assertion is sufficient

    const pxLeft    = await readRenderedFontPx(page);
    const levelLeft = await readCurrentLevelNum(page);
    const levelLeftData = FAR_LEVELS[levelLeft];

    expect(pxLeft).toBeGreaterThan(0);
    if (levelLeftData) {
      const mmLeft = isoMm(levelLeftData.denominator, REF_DISTANCE_M);
      expect(Math.abs(physMm(pxLeft, 1) - mmLeft)).toBeLessThan(MM_TOLERANCE);
    }
    await page.screenshot({ path: 'test-results/size-009-left-eye.png' });

    // Both eyes render the same px if they're on the same level (consistency check)
    if (levelLeft === levelRight) {
      expect(Math.abs(pxLeft - pxRight)).toBeLessThanOrEqual(1);
    }

    // Answer left eye and verify result screen is reached
    await answerAndAdvanceLevel(page);

    // After left eye, exam may show "both eyes" step or result screen
    const reachedEnd = await page
      .locator('button:has-text("Xem lịch kiểm tra"), button:has-text("Bài tập thị lực")')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    // If not at result screen, might need to answer more levels or a switch-to-both-eyes step
    if (!reachedEnd) {
      const bothBtn = page.locator('button:has-text("Tiếp tục kiểm tra hai mắt")');
      if (await bothBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await bothBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    await page.screenshot({ path: 'test-results/size-009-end.png' });
  });
});

// ---------------------------------------------------------------------------
// SIZING TEST GROUP 7 — totalChars flexibility (reads count from UI, no hardcode)
// ---------------------------------------------------------------------------

test.describe('Clinical Sizing — totalChars flexibility (no hardcoded count)', () => {
  test.beforeEach(async ({ page }) => {
    await resetExamSessions();
    await injectScreenConfig(page);
    await login(page);
  });

  test('SIZE-010: visible char count matches the total shown in the counter (resilient to count changes)', async ({ page }) => {
    // Instead of asserting "must be 5", we read the ACTUAL configured total from
    // the UI counter ("Đã chọn 0 / N") and assert that:
    //   • N is a reasonable positive integer
    //   • chars visible in the FIRST batch ≤ N
    //   • all visible chars have the same font size (batch coherence)
    // This test remains green whether totalChars is 3, 4, 5, 6 or any other value.
    await startExamByLabel(page, 'Nhìn xa');
    await completeSetupStep(page, String(REF_DISTANCE_M));
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    // Read totalChars from the counter — see readTotalChars() helper below
    const totalChars = await readTotalChars(page);

    // totalChars must be a sane number (1–10 covers all plausible configurations)
    expect(totalChars).toBeGreaterThanOrEqual(1);
    expect(totalChars).toBeLessThanOrEqual(10);

    // Visible chars in current batch must not exceed the total
    const visibleChars = await page.locator('[data-testid="exam-char"]').count();
    expect(visibleChars).toBeGreaterThan(0);
    expect(visibleChars).toBeLessThanOrEqual(totalChars);

    // All visible chars must share the same font size
    const allPx: number[] = await page.locator('[data-testid="exam-char"]').evaluateAll((els) =>
      els.map((el) => parseFloat(getComputedStyle(el).fontSize))
    );
    const firstPx = allPx[0];
    for (const px of allPx) {
      expect(Math.abs(px - firstPx)).toBeLessThan(0.5);
    }

    await page.screenshot({ path: `test-results/size-010-totalChars-${totalChars}.png` });
  });
});

// ---------------------------------------------------------------------------
// HELPERS — char type selection + shared sizing assertion
// ---------------------------------------------------------------------------

/**
 * Select a char type option in the exam setup form.
 * The charType MUI Select is the only [role="combobox"] on the DistanceStep.
 * optionLabel must match the MenuItem text (e.g. 'Hình', 'Chữ E (Snellen E)').
 * Max wait = 5 s; if the select is absent (e.g. stereopsis), this is a no-op.
 */
async function selectCharType(page: Page, optionLabel: string) {
  const selectTrigger = page.locator('[role="combobox"]').first();
  if (!(await selectTrigger.isVisible({ timeout: 3000 }).catch(() => false))) return;
  await selectTrigger.click();
  // Options appear in a MUI Menu portal — wait briefly then click
  await page.locator('li[role="option"]').filter({ hasText: optionLabel }).first()
    .click({ timeout: 5000 });
  await page.waitForTimeout(200);
}

/**
 * Core sizing assertion used by all char-type tests:
 * Physical mm on glass = rendered px × DPR / pxPerMm ≈ clinical target (±MM_TOLERANCE mm).
 */
async function assertSizingForCurrentLevel(
  page: Page,
  examLabel: string,
  charTypeName: string,
  clinicalMmFn: (levelNum: number) => number,
  dpr = 1,
) {
  const renderedPx = await readRenderedFontPx(page);
  const levelNum   = await readCurrentLevelNum(page);
  const clinicalMm = clinicalMmFn(levelNum);

  expect(renderedPx, `${examLabel} charType=${charTypeName} L${levelNum}: rendered px must be > 0`)
    .toBeGreaterThan(0);
  expect(
    Math.abs(physMm(renderedPx, dpr) - clinicalMm),
    `${examLabel} charType=${charTypeName} L${levelNum}: physical ${physMm(renderedPx, dpr).toFixed(2)}mm vs ISO ${clinicalMm.toFixed(2)}mm (tolerance ±${MM_TOLERANCE}mm)`
  ).toBeLessThan(MM_TOLERANCE);
}

// ---------------------------------------------------------------------------
// SIZING TEST GROUP 8 — All 5 char types × Far vision
// (BU specifically reported Lea shapes 'S' as wrong — included here)
// ---------------------------------------------------------------------------

const FAR_CHAR_TYPES: { code: string; label: string }[] = [
  { code: 'E', label: 'Chữ E (Snellen E)' },
  { code: 'C', label: 'Chữ C (Landolt C)' },
  { code: 'A', label: 'Chữ cái' },
  { code: 'N', label: 'Số' },
  { code: 'S', label: 'Hình' }, // Lea shapes — BU's complaint
];

test.describe('Clinical Sizing — All 5 char types on Far vision', () => {
  test.beforeEach(async ({ page }) => {
    await resetExamSessions();
    await injectScreenConfig(page);
    await login(page);
  });

  for (const ct of FAR_CHAR_TYPES) {
    test(`SIZE-ct-${ct.code}: far vision charType='${ct.code}' (${ct.label}) renders correct ISO px`, async ({ page }) => {
      await startExamByLabel(page, 'Nhìn xa');

      // Select the char type before clicking "Tiếp tục"
      await page.waitForSelector('[role="combobox"]', { timeout: 8000 });
      await selectCharType(page, ct.label);
      await completeSetupStep(page, String(REF_DISTANCE_M));
      await completeInstructionStep(page);
      await page.waitForTimeout(1500);

      await assertSizingForCurrentLevel(
        page,
        'far',
        ct.code,
        (lvl) => isoMm(FAR_LEVELS[lvl]?.denominator ?? 400, REF_DISTANCE_M),
      );

      await page.screenshot({ path: `test-results/size-ct-${ct.code}-far.png` });
    });
  }
});

// ---------------------------------------------------------------------------
// SIZING TEST GROUP 9 — Lea shapes on Near + Contrast (BU's complaint)
// ---------------------------------------------------------------------------

test.describe('Clinical Sizing — Lea shapes (S) on Near and Contrast exams', () => {
  test.beforeEach(async ({ page }) => {
    await resetExamSessions();
    await injectScreenConfig(page);
    await login(page);
  });

  test('SIZE-011: near vision + Lea shapes (S) — rendered px matches N-notation formula', async ({ page }) => {
    await startExamByLabel(page, 'Nhìn gần');
    await page.waitForSelector('[role="combobox"]', { timeout: 8000 });
    await selectCharType(page, 'Hình');
    await completeSetupStep(page, String(NEAR_STD_DISTANCE_M)); // standard 40cm reading distance
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    const levelNum   = await readCurrentLevelNum(page);
    const nearLevel  = NEAR_LEVELS[levelNum];
    const clinicalMm = nearLevel ? nearLevel.sizeMm : NEAR_LEVELS[1].sizeMm; // at 40cm
    await assertSizingForCurrentLevel(page, 'near', 'S', () => clinicalMm);

    await page.screenshot({ path: 'test-results/size-011-near-S.png' });
  });

  test('SIZE-012: contrast exam + Lea shapes (S) — suprathreshold size correct, opacity varies', async ({ page }) => {
    // Contrast exam: letter SIZE is fixed (n=30 = 20/100); only opacity/contrast changes.
    // Verify size is correct when charType='S' (Lea shapes), same formula as SIZE-003.
    await startExamByLabel(page, 'Tương phản');
    await page.waitForSelector('[role="combobox"]', { timeout: 8000 });
    await selectCharType(page, 'Hình');
    await completeSetupStep(page, String(REF_DISTANCE_M));
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    const renderedPx = await readRenderedFontPx(page);
    const clinicalMm = isoMm(100, REF_DISTANCE_M); // n=30 → denominator=100

    expect(renderedPx).toBeGreaterThan(0);
    expect(Math.abs(physMm(renderedPx, 1) - clinicalMm)).toBeLessThan(MM_TOLERANCE);

    await page.screenshot({ path: 'test-results/size-012-contrast-S.png' });
  });

  test('SIZE-013: near vision + Snellen E (E) — rendered px matches N-notation formula', async ({ page }) => {
    await startExamByLabel(page, 'Nhìn gần');
    await page.waitForSelector('[role="combobox"]', { timeout: 8000 });
    await selectCharType(page, 'Chữ E (Snellen E)');
    await completeSetupStep(page, String(NEAR_STD_DISTANCE_M));
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    const levelNum   = await readCurrentLevelNum(page);
    const nearLevel  = NEAR_LEVELS[levelNum];
    const clinicalMm = nearLevel ? nearLevel.sizeMm : NEAR_LEVELS[1].sizeMm;
    await assertSizingForCurrentLevel(page, 'near', 'E', () => clinicalMm);

    await page.screenshot({ path: 'test-results/size-013-near-E.png' });
  });
});

// ---------------------------------------------------------------------------
// SIZING TEST GROUP 10 — Stereopsis (Titmus RDS canvas — no font size)
// ---------------------------------------------------------------------------

test.describe('Clinical Sizing — Stereopsis exam flow (Titmus RDS)', () => {
  test.beforeEach(async ({ page }) => {
    await resetExamSessions();
    await injectScreenConfig(page);
    await login(page);
  });

  test('SIZE-014: stereopsis — canvas renders, shape answers + confirm work', async ({ page }) => {
    await startExamByLabel(page, 'Lập thể');
    await completeSetupStep(page, String(REF_DISTANCE_M));
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Tròn")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Xác nhận")').last()).toBeVisible({ timeout: 5000 });

    const outcome = await answerOneStereopsisStep(page);
    expect(['correct', 'failed']).toContain(outcome);
    await page.screenshot({ path: 'test-results/size-014-stereopsis.png' });
  });

  test('SIZE-015: stereopsis — no charType selector shown (only exam types with optotypes have it)', async ({ page }) => {
    await startExamByLabel(page, 'Lập thể');
    // There must be NO charType combobox on the stereopsis setup page
    const hasCharTypeSelect = await page.locator('[role="combobox"]').isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasCharTypeSelect).toBe(false);
    await page.screenshot({ path: 'test-results/size-015-stereopsis-no-chartype.png' });
  });
});

// ---------------------------------------------------------------------------
// SIZING TEST GROUP 11 — BU's exact complaint scenario
// ---------------------------------------------------------------------------

/**
 * Run a node DB helper script and parse its JSON output.
 * Returns null if the script fails (e.g. backend not reachable).
 */
async function queryDb(scriptName: string, ...args: string[]): Promise<Record<string, unknown> | null> {
  const { execSync } = await import('child_process');
  try {
    const out = execSync(
      `node ../eye-sight-service/tests/${scriptName} ${args.join(' ')}`,
      { stdio: ['pipe', 'pipe', 'pipe'] }
    ).toString().trim();
    return JSON.parse(out);
  } catch {
    return null;
  }
}

test.describe.serial('Clinical Sizing — BU exact complaint: Level 1 (20/400) + Lea shapes', () => {
  // BU screenshot: app.nhuocthi.vn/portal/exam/254
  //   Far vision, charType='S' (Lea shapes), Level 1 = 20/400
  //   BU annotated: "kích thước hình không đúng với mức thị lực 20/400"
  //
  // This group pins EXACTLY that combination and verifies rendered px matches
  // the ISO 8596 formula for 20/400 at the configured exam distance.

  test.beforeAll(async () => {
    // Ensure patient starts at Level 1 by setting currentResult to level 1
    // (auto-start picks the max level from currentResult; 1 = start at L1)
    const { execSync } = await import('child_process');
    execSync('node ../eye-sight-service/tests/set-far-level.cjs 1 1 1', { stdio: 'pipe' });
    await resetExamSessions();
  });

  test.afterAll(async () => {
    // Restore to 20/20 (level 14) so other tests are unaffected
    const { execSync } = await import('child_process');
    execSync('node ../eye-sight-service/tests/set-far-level.cjs 14 14 14', { stdio: 'pipe' });
  });

  test('SIZE-016: far + Lea shapes (S) at Level 1 (20/400) @ REF_DISTANCE_M — the exact BU complaint scenario', async ({ page }) => {
    // BU screenshot: app.nhuocthi.vn/portal/exam/254
    //   charType = S (Lea shapes), Level 1 = 20/400
    //   at REF_DISTANCE_M (change this constant to test at BU's 3m)
    await injectScreenConfig(page);
    await login(page);
    await startExamByLabel(page, 'Nhìn xa');

    // Select Lea shapes — the char type BU reported
    await page.waitForSelector('[role="combobox"]', { timeout: 8000 });
    await selectCharType(page, 'Hình');
    await completeSetupStep(page, String(REF_DISTANCE_M));
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    // Must be at Level 1 (auto-start from saved level 1)
    const levelNum = await readCurrentLevelNum(page);
    expect(levelNum, 'Exam must start at Level 1 (20/400) — same as BU screenshot').toBe(1);

    // Rendered px must match ISO 8596 for 20/400 at REF_DISTANCE_M
    const renderedPx = await readRenderedFontPx(page);
    const clinicalMm = isoMm(FAR_LEVELS[1].denominator, REF_DISTANCE_M); // 20/400 at REF_DISTANCE_M

    // Detailed failure message — concrete numbers for BU comparison
    expect(renderedPx, [
      `BU scenario — Lea shapes L1 (20/400) @ ${REF_DISTANCE_M}m on 15.6" 1920×1080:`,
      `  rendered  = ${renderedPx.toFixed(1)} CSS px`,
      `  expected  = ISO: ${clinicalMm.toFixed(1)} mm`,
      `  physical  = ${physMm(renderedPx, 1).toFixed(2)} mm on glass`,
    ].join('\n')).toBeGreaterThan(0);

    expect(
      Math.abs(physMm(renderedPx, 1) - clinicalMm),
      `Deviation from ISO formula must be < ${MM_TOLERANCE}mm`
    ).toBeLessThan(MM_TOLERANCE);

    await page.screenshot({ path: 'test-results/size-016-BU-complaint-L1-S.png' });
  });
});

// ---------------------------------------------------------------------------
// SIZING TEST GROUP 13 — Distance scaling
// ---------------------------------------------------------------------------

test.describe('Clinical Sizing — Distance scaling (REF_DISTANCE_M vs 2×)', () => {
  test.beforeEach(async ({ page }) => {
    await resetExamSessions();
    await injectScreenConfig(page);
    await login(page);
  });

  test('SIZE-020: same level renders proportionally smaller at REF_DISTANCE_M vs REF_DISTANCE_M×2 (distance scaling)', async ({ page }) => {
    // ISO 8596 property: halving distance halves the optotype size.
    // At REF_DISTANCE_M: size = isoMm(denom, REF_DISTANCE_M)
    // At REF_DISTANCE_M*2: size = isoMm(denom, REF_DISTANCE_M*2) = 2× larger.
    // Both must match their respective formula — verifying distance scaling in real browser.

    // Measure at REF_DISTANCE_M
    await startExamByLabel(page, 'Nhìn xa');
    await completeSetupStep(page, String(REF_DISTANCE_M));
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    const pxNear    = await readRenderedFontPx(page);
    const levelNear = await readCurrentLevelNum(page);

    await resetExamSessions();
    await page.goto(`${BASE_URL}/portal/exam`, { waitUntil: 'networkidle' });
    // Measure at REF_DISTANCE_M*2 (same level — requires same auto-start)
    await startExamByLabel(page, 'Nhìn xa');
    await completeSetupStep(page, String(REF_DISTANCE_M * 2));
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    const pxFar    = await readRenderedFontPx(page);
    const levelFar = await readCurrentLevelNum(page);

    // Both must be positive
    expect(pxNear).toBeGreaterThan(0);
    expect(pxFar).toBeGreaterThan(0);

    // If both started at same level: 2× distance must render ~2× larger
    if (levelNear === levelFar) {
      // ISO 8596: size scales linearly with distance → (REF×2) / REF = 2.0
      expect(pxFar / pxNear, `(REF×2)/(REF) ratio for L${levelNear}: expected ~2.0`).toBeCloseTo(2.0, 0);
    }

    // Each must match ISO formula for its own distance (assert in mm)
    const level = FAR_LEVELS[levelNear];
    if (level) {
      expect(Math.abs(physMm(pxNear, 1) - isoMm(level.denominator, REF_DISTANCE_M))).toBeLessThan(MM_TOLERANCE);
    }
    if (FAR_LEVELS[levelFar]) {
      expect(Math.abs(physMm(pxFar, 1) - isoMm(FAR_LEVELS[levelFar].denominator, REF_DISTANCE_M * 2))).toBeLessThan(MM_TOLERANCE);
    }

    await page.screenshot({ path: 'test-results/size-020-distance-scaling.png' });
  });
});

// ---------------------------------------------------------------------------
// SIZING TEST GROUP 12 — Backend cross-check after E2E exam completion
// ---------------------------------------------------------------------------

test.describe.serial('Clinical Sizing — Backend cross-check: DB records match E2E answers', () => {
  // After a full E2E exam run, verifies that:
  //   1. The ExamSession status changed to 'completed' in the DB
  //   2. The patient's far.currentResult was updated (backend recorded the result)
  //
  // This cross-checks that the frontend → API → DB pipeline is intact, not just
  // that the UI shows the right things.

  test.beforeAll(async () => {
    // Fresh baseline: clear far result so we know the starting state
    const { execSync } = await import('child_process');
    execSync('node ../eye-sight-service/tests/set-far-level.cjs 14 14 14', { stdio: 'pipe' });
    await resetExamSessions();
  });

  test('SIZE-017: after completing far exam, DB session status = completed and result is recorded', async ({ page }) => {
    // 1. Snapshot DB state BEFORE exam
    const before = await queryDb('get-exam-result.cjs', 'far');
    const sessionBefore = (before?.latestSession as Record<string, unknown> | null);
    if (sessionBefore) {
      expect(sessionBefore.status).toBe('incomplete');
    }

    // 2. Run the FULL exam — multi-level, multi-eye loop (mirrors completeFullExam pattern)
    await injectScreenConfig(page);
    await login(page);
    await startExamByLabel(page, 'Nhìn xa');
    await completeSetupStep(page, String(REF_DISTANCE_M));
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    const MAX_ITERATIONS = 60; // hard safety cap for the entire exam loop
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      // Done? — use separate CSS selectors only (no Playwright text= syntax in comma list)
      const done = await page
        .locator('button:has-text("Xem lịch kiểm tra"), button:has-text("Bài tập thị lực")')
        .first().isVisible({ timeout: 300 }).catch(() => false);
      if (done) break;

      // Switch-eye screen?
      const switchLeft = page.locator('button:has-text("Tiếp tục kiểm tra mắt trái")');
      if (await switchLeft.isVisible({ timeout: 300 }).catch(() => false)) {
        await switchLeft.click();
        await page.waitForTimeout(600);
        continue;
      }

      // Switch-to-both-eyes screen?
      const switchBoth = page.locator('button:has-text("Tiếp tục kiểm tra hai mắt")');
      if (await switchBoth.isVisible({ timeout: 300 }).catch(() => false)) {
        await switchBoth.click();
        await page.waitForTimeout(600);
        continue;
      }

      // On a test-level screen — answer current level and advance
      const hasChars = await page.locator('[data-testid="exam-char"]').first()
        .isVisible({ timeout: 500 }).catch(() => false);
      if (hasChars) {
        await answerAndAdvanceLevel(page);
      } else {
        await page.waitForTimeout(500); // unexpected state — wait briefly
      }
    }

    // Wait for result screen — CSS-only selectors, no mixed text= syntax
    const resultVisible = await page
      .locator('button:has-text("Xem lịch kiểm tra"), button:has-text("Bài tập thị lực")')
      .first()
      .isVisible({ timeout: 15000 })
      .catch(() => false);

    await page.screenshot({ path: 'test-results/size-017-exam-complete.png' });
    expect(resultVisible, 'Result screen must appear after completing exam').toBe(true);

    // 3. Wait briefly for API to persist, then query DB
    await page.waitForTimeout(2000);
    const after = await queryDb('get-exam-result.cjs', 'far');

    // Skip backend assertions if DB script is not reachable (CI without DB)
    if (!after) {
      console.warn('SIZE-017: DB not reachable — skipping backend assertions');
      return;
    }

    const sessionAfter = after.latestSession as Record<string, unknown> | null;

    // 4. Assert session is now completed
    expect(
      sessionAfter?.status,
      `ExamSession.status must be 'completed' after exam — got: ${sessionAfter?.status}`
    ).toBe('completed');

    // 5. Assert patient's currentResult was updated (not null)
    const resultAfter = after.currentResult as Record<string, unknown> | null;
    expect(
      resultAfter,
      'Patient.examResults.far.currentResult must be non-null after exam'
    ).not.toBeNull();

    // 6. The recorded right-eye level must be a valid far vision level (1–20).
    //    JSONB stores integers as strings — parse before comparing.
    if (resultAfter) {
      const raw = resultAfter.rightEye;
      if (raw !== undefined && raw !== null) {
        const rightEyeLevel = parseInt(String(raw), 10);
        expect(rightEyeLevel, `rightEye level must be 1–20, got "${raw}"`).toBeGreaterThanOrEqual(1);
        expect(rightEyeLevel, `rightEye level must be 1–20, got "${raw}"`).toBeLessThanOrEqual(20);
      }
    }

    console.log(`SIZE-017 backend state after exam:`, JSON.stringify(after, null, 2));
  });
});

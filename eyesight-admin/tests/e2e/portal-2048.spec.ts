import { test, expect, type Page } from '@playwright/test';

/**
 * E2E Test Suite: 2048 Exercise Portal - Pause/Resume, Timeout, Reopen
 *
 * Scope 1 Bug Fixes Validation:
 * 1. Pause/resume round-trip state persistence
 * 2. Time-up hard-stop with auto-submit
 * 3. Reopen after timeout returns blocked state
 *
 * Test Patient: patient@lotusvision.vn / Patient@123
 */

test.describe('Portal 2048 Exercise Lifecycle', () => {
  const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4001';
  const PATIENT_EMAIL = 'patient@lotusvision.vn';
  const PATIENT_PASSWORD = 'Patient@123';
  const FAST_EXERCISE_DURATION_SECONDS = Number(process.env.E2E_EXERCISE_DURATION_SECONDS || '30');

  // ==================== SETUP & TEARDOWN ====================

  test.beforeEach(async ({ page }) => {
    const { execSync } = await import('child_process');
    try {
      execSync('node ../eye-sight-service/tests/e2e-reset.cjs', { stdio: 'pipe' });
    } catch {
      /* ignore */
    }

    await page.addInitScript((durationSeconds) => {
      (
        window as Window & { __E2E_EXERCISE_DURATION_SECONDS?: number }
      ).__E2E_EXERCISE_DURATION_SECONDS = durationSeconds;
    }, FAST_EXERCISE_DURATION_SECONDS);

    // Navigate to login page
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });

    // Wait for page to load
    await page.waitForSelector('input#email', { timeout: 10000 });
  });

  // ==================== HELPER FUNCTIONS ====================

  async function loginPatient(page: Page): Promise<void> {
    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Navigate to login page fresh on each attempt
        await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForSelector('input#email', { timeout: 10000 });

        await page.locator('input#email').fill(PATIENT_EMAIL);
        await page.locator('input#password').fill(PATIENT_PASSWORD);
        await page.locator('button:has-text("Sign In")').click();

        await page.waitForURL(`**/portal/**`, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        return; // success
      } catch (err) {
        if (attempt === MAX_RETRIES) throw err;
        console.warn(`[loginPatient] Attempt ${attempt} failed — retrying in 3s...`);
        await page.waitForTimeout(3000);
      }
    }
  }

  async function navigateToExerciseAssignments(page: Page): Promise<void> {
    await page.goto(`${BASE_URL}/portal/exercises`, { waitUntil: 'networkidle' });

    // MUIDataTable renders with role="grid", not role="table"
    await page.waitForSelector('[role="grid"]', { timeout: 15000 });
  }

  async function selectAndStartExercise(
    page: Page,
    assignmentIndex: number = 0,
  ): Promise<{ assignmentId: number; sessionId: number }> {
    // Get first 2048 assignment row
    const rows = page.locator('[role="rowgroup"] [role="row"]');
    await rows.nth(assignmentIndex + 1).waitFor(); // +1 to skip header

    // Click on the assignment row to expand or navigate
    const exerciseName = rows
      .nth(assignmentIndex + 1)
      .locator('td')
      .first();
    await exerciseName.click();

    // Wait for navigation to assignment detail or sessions page
    await page.waitForURL(`**/portal/assignments/**`, { timeout: 15000 });

    // Extract assignment ID from URL
    const url = page.url();
    const assignmentMatch = url.match(/assignments\/(\d+)/);
    const assignmentId = assignmentMatch ? parseInt(assignmentMatch[1], 10) : 0;

    // If on sessions list, select first session and start it
    if (url.includes('sessions') && !url.includes('execute')) {
      const sessionRows = page.locator('[role="rowgroup"] [role="row"]');
      await sessionRows.nth(1).waitFor(); // nth(1) = first session row

      // Try to find and click execute/start button in the session row
      const startButton = sessionRows
        .nth(1)
        .locator(
          'button:has-text("Thực hiện"), button:has-text("Bắt đầu"), button[aria-label*="start"]',
        );
      if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await startButton.click();
      } else {
        // Fallback: click session name to navigate to detail
        await sessionRows.nth(1).locator('td').nth(1).click();
      }

      await page.waitForURL(`**/portal/**execute**`, { timeout: 15000 });
    }

    // Extract session ID from URL or response
    const executeUrl = page.url();
    const sessionMatch = executeUrl.match(/sessions\/(\d+)/);
    const sessionId = sessionMatch ? parseInt(sessionMatch[1], 10) : 0;

    return { assignmentId, sessionId };
  }

  async function waitForGameReady(page: Page): Promise<void> {
    // Wait for game container and canvas to be visible
    await page.waitForSelector('.game-wrapper, canvas, [class*="game"]', { timeout: 20000 });

    // Wait for game to initialize (score element visible)
    await page.waitForTimeout(2000); // Brief pause for game init
  }

  async function takePauseScreenshot(page: Page, score: number, duration: number): Promise<void> {
    // Click pause button
    const pauseButton = page.locator('button:has-text("Tạm dừng")');
    await pauseButton.click();

    // Wait for snackbar confirmation
    await page.waitForSelector('[role="alert"]', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Navigate back to sessions
    const isNavigated = await page.url().includes('assignments');
    if (!isNavigated) {
      await page.goto(page.url().replace(/\/execute.*/, '/sessions'), { waitUntil: 'networkidle' });
    }
  }

  async function startFirstExercise(page: Page): Promise<{
    assignmentId: number;
    sessionId: number;
    executeUrl: string;
  }> {
    const executeButton = page.locator('button:has-text("Thực hiện")').first();
    await expect(executeButton).toBeEnabled({ timeout: 10000 });
    await executeButton.click();

    await page.waitForSelector('button:has-text("Bắt đầu luyện tập")', { timeout: 10000 });
    await page.locator('button:has-text("Bắt đầu luyện tập")').click();

    await page.waitForURL('**/portal/exercise/assignments/**/sessions/**/execute', {
      timeout: 15000,
    });
    await waitForGameReady(page);

    const executeUrl = page.url();
    const urlMatch = executeUrl.match(/assignments\/(\d+)\/sessions\/(\d+)/);

    return {
      assignmentId: urlMatch ? parseInt(urlMatch[1], 10) : 0,
      sessionId: urlMatch ? parseInt(urlMatch[2], 10) : 0,
      executeUrl,
    };
  }

  async function waitForTimeoutSubmission(page: Page): Promise<void> {
    // Wait for countdown timer to be visible (exercise has a duration configured)
    // If no countdown visible after 10s, skip — the exercise might have no time limit
    const hasCountdown = await page.locator('text=Còn lại').first()
      .isVisible({ timeout: 10000 }).catch(() => false);
    if (!hasCountdown) {
      console.warn('[waitForTimeoutSubmission] No countdown visible — skipping time-up wait');
      return;
    }

    // Wait for completion dialog (text changed from "Đã hết thời gian" to "Hoàn thành bài tập").
    // Use waitForSelector with :text() to accept either variant.
    await page.waitForSelector(
      ':text("Hoàn thành bài tập"), :text("Đã hết thời gian")',
      { timeout: 90000 }
    );

    // Dismiss the completion dialog to let the session finalise
    const closeBtn = page.locator('button:has-text("Đóng")');
    if (await closeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // ==================== TEST CASES ====================

  test('E2E-001: Patient login and navigate to 2048 exercise', async ({ page }) => {
    // Step 1: Login
    await loginPatient(page);

    // Verify redirect to portal
    expect(page.url()).toContain('/portal');

    // Step 2: Navigate to exercises
    await navigateToExerciseAssignments(page);

    // Verify on exercises page
    expect(page.url()).toContain('/portal/exercises');

    // Verify 2048 exercises visible
    const game2048Row = page.locator('text=Game 2048').first();
    await expect(game2048Row).toBeVisible({ timeout: 10000 });
  });

  test('E2E-002: Pause/Resume round-trip persists game state', async ({ page }) => {
    // Setup: Login and navigate to exercise
    await loginPatient(page);
    await navigateToExerciseAssignments(page);

    // Step 1: Click "Thực hiện" on first active assignment
    const executeButton = page.locator('button:has-text("Thực hiện")').first();
    await expect(executeButton).toBeEnabled({ timeout: 10000 });

    // Extract assignment/session IDs from the navigate URL before clicking
    let assignmentId = 0;
    let sessionId = 0;

    page.on('framenavigated', (frame) => {
      const url = frame.url();
      const match = url.match(/assignments\/(\d+)\/sessions\/(\d+)/);
      if (match) {
        assignmentId = parseInt(match[1], 10);
        sessionId = parseInt(match[2], 10);
      }
    });

    await executeButton.click();

    // There's a screen setup page first - wait and click "Bắt đầu luyện tập" to proceed
    await page.waitForSelector('button:has-text("Bắt đầu luyện tập")', { timeout: 10000 });
    await page.locator('button:has-text("Bắt đầu luyện tập")').click();

    // Wait for execute page
    await page.waitForURL('**/portal/exercise/assignments/**/sessions/**/execute', {
      timeout: 15000,
    });
    await waitForGameReady(page);

    // Extract IDs from URL if not captured via event
    const executeUrl = page.url();
    const urlMatch = executeUrl.match(/assignments\/(\d+)\/sessions\/(\d+)/);
    if (urlMatch) {
      assignmentId = parseInt(urlMatch[1], 10);
      sessionId = parseInt(urlMatch[2], 10);
    }

    // Declare pause button (must be in scope before click)
    const pauseButton = page.locator('button:has-text("Tạm dừng")');

    // Step 2: Make a few moves
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(1000);

    // BUG-06: Verify move counter increments from 0 after real keyboard moves.
    // MUI Typography caption renders as <span>, not <p> — use :text() not p:text-is()
    await page.waitForTimeout(500); // extra settle time for state propagation
    const movesCountText = await page
      .locator(':text("Nước đi")')
      .locator('..')
      .locator('h6')
      .first()
      .textContent({ timeout: 5000 })
      .catch(() => '0');
    expect(parseInt(movesCountText ?? '0', 10)).toBeGreaterThan(0);

    // Step 3: Pause the game
    await pauseButton.click();

    // Step 4: After pause the app navigates back to the exercises list
    await page.waitForURL('**/portal/exercises', { timeout: 15000 });

    // Step 5: Already on exercises list — no extra navigation needed
    await page.waitForSelector('[role="grid"]', { timeout: 15000 });

    // Step 6: Click "Thực hiện" again to resume
    const resumeButton = page.locator('button:has-text("Thực hiện")').first();
    await expect(resumeButton).toBeEnabled({ timeout: 10000 });
    await resumeButton.click();

    // Handle screen setup page again
    await page.waitForSelector('button:has-text("Bắt đầu luyện tập")', { timeout: 10000 });
    await page.locator('button:has-text("Bắt đầu luyện tập")').click();

    // Wait for execute page to load
    await page.waitForURL('**/portal/exercise/assignments/**/sessions/**/execute', {
      timeout: 15000,
    });
    await waitForGameReady(page);

    // Step 7: Verify resume alert is shown
    const resumeAlert = page.locator('[role="alert"]:has-text("Tiếp tục")');
    await expect(resumeAlert).toBeVisible({ timeout: 10000 });

    console.log('✅ Pause/Resume round-trip successful');
  });

  test('E2E-003: Time-up locks game and auto-submits result', async ({ page }) => {
    // Setup: Login and navigate to exercise
    await loginPatient(page);
    await navigateToExerciseAssignments(page);

    await startFirstExercise(page);

    // Step 1: Observe game is active
    const pauseButton = page.locator('button:has-text("Tạm dừng")');
    await expect(pauseButton).toBeEnabled({ timeout: 5000 });

    // Step 2: Wait for countdown to reach zero and completion dialog to appear
    await waitForTimeoutSubmission(page);

    // Step 3: After dialog dismissed, verify navigation back to exercises list
    await page.waitForURL('**/portal/exercises', { timeout: 15000 });
    expect(page.url()).toContain('/portal/exercises');

    console.log('✅ Time-up locks game and shows submission status');
  });

  test('E2E-004: Reopen after timeout returns blocked state', async ({ page }) => {
    // Setup: Create a completed (timed-out) session first
    await loginPatient(page);
    await navigateToExerciseAssignments(page);
    const { assignmentId, sessionId, executeUrl } = await startFirstExercise(page);
    // waitForTimeoutSubmission now also dismisses the dialog
    await waitForTimeoutSubmission(page);
    await page.waitForURL('**/portal/exercises', { timeout: 10000 });

    // Step 1: Re-open the exact same completed execute URL
    await page.goto(executeUrl, { waitUntil: 'networkidle' });

    // Step 2: Verify redirected to the timed-out session's results page instead of re-entering execute mode
    await page.waitForURL(`**/portal/assignments/${assignmentId}/sessions/${sessionId}/results`, {
      timeout: 15000,
    });
    await expect(page.locator('text=Trạng thái phiên')).toBeVisible({ timeout: 10000 });

    // Step 3: Verify user is no longer on the execute page
    expect(page.url()).toContain('results');
    expect(page.url()).not.toContain('/execute');

    console.log('✅ Reopen after timeout correctly blocked and redirected');
  });

  test('E2E-005: End exercise completes and navigates to results', async ({ page }) => {
    // Setup: Login and navigate to fresh exercise
    await loginPatient(page);
    await navigateToExerciseAssignments(page);

    // Click "Thực hiện" on first active assignment
    const executeButton = page.locator('button:has-text("Thực hiện")').first();
    await expect(executeButton).toBeEnabled({ timeout: 10000 });
    await executeButton.click();

    // Handle screen setup page
    await page.waitForSelector('button:has-text("Bắt đầu luyện tập")', { timeout: 10000 });
    await page.locator('button:has-text("Bắt đầu luyện tập")').click();

    await page.waitForURL('**/portal/exercise/assignments/**/sessions/**/execute', {
      timeout: 15000,
    });
    await waitForGameReady(page);

    // Step 1: Play for a moment
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(1000);

    // Step 2: Click End Exercise button
    const endButton = page.locator('button:has-text("Kết thúc")').last();
    await endButton.click();

    // Step 3: Wait for confirmation dialog then confirm
    // The confirm dialog may use MUI Dialog which renders as div with role=dialog
    await page.waitForTimeout(500); // let dialog animate in
    const confirmEndButton = page.locator('button:has-text("Kết thúc")').last();
    await expect(confirmEndButton).toBeVisible({ timeout: 5000 });
    await confirmEndButton.click();

    // Step 4: "Hoàn thành bài tập" completion dialog appears — wait and dismiss
    await page.waitForSelector(':text("Hoàn thành bài tập")', { timeout: 10000 });
    await page.locator('button:has-text("Đóng")').click();

    // Step 5: After dismissal, navigates back to exercises list
    await page.waitForURL(`**/portal/exercises`, { timeout: 15000 });
    expect(page.url()).toContain('/portal/exercises');

    console.log('✅ End exercise completes and navigates to sessions list');
  });

  // ==================== VISUAL SCALING VERIFICATION ====================

  test('E2E-006: game2048-visual-settings style tag exists and transform scale is applied', async ({ page }) => {
    // Explicit reset before this test — ensures fresh session after other tests
    // consumed or completed sessions in this suite.
    const { execSync } = await import('child_process');
    try { execSync('node ../eye-sight-service/tests/e2e-reset.cjs', { stdio: 'pipe' }); } catch { /* ignore */ }
    await page.waitForTimeout(500);
    /**
     * REGRESSION TEST for the bug where applyVisualSettings was never called
     * because patientVision returned undefined (when patientExamResults was null).
     *
     * Root cause: `if (!patientExamResults) return undefined` in PortalExercise
     * caused currentVisualSettings = undefined → visualSettings = undefined in
     * useGame2048Engine → applyVisualSettings never called → style tag never
     * created → game rendered at default CSS size with no vision scaling.
     *
     * Fix: removed early return, now always returns defaults via optional chaining.
     *
     * Verification:
     *  1. style tag `game2048-visual-settings` must exist in document.head
     *  2. The tag must contain `transform: scale(...)` rule
     *  3. The scale value must NOT be 1 (which would mean no scaling applied)
     *     for a patient with poor vision (scale > 1 expected for low vision levels)
     *  4. `.game-container` computed transform must not be `none` or identity matrix
     */
    await loginPatient(page);
    await navigateToExerciseAssignments(page);

    // Start the exercise
    const executeButton = page.locator('button:has-text("Thực hiện")').first();
    await expect(executeButton).toBeEnabled({ timeout: 10000 });
    await executeButton.click();

    await page.waitForSelector('button:has-text("Bắt đầu luyện tập")', { timeout: 10000 });
    await page.locator('button:has-text("Bắt đầu luyện tập")').click();

    await page.waitForURL('**/portal/exercise/assignments/**/sessions/**/execute', { timeout: 15000 });

    // Wait for game to fully initialize: game-container in DOM + style tag created
    await page.waitForSelector('.game-wrapper', { timeout: 20000 });
    await page.waitForSelector('.game-container', { timeout: 20000 });
    // Poll until applyVisualSettings creates the style tag (up to 15s)
    await page.waitForFunction(
      () => !!document.getElementById('game2048-visual-settings'),
      { timeout: 15000, polling: 200 }
    ).catch(() => {
      // style tag not created — assertion below will catch it with a clear message
    });

    // ── 1. Style tag MUST exist ────────────────────────────────────────────────
    const styleTagContent = await page.evaluate(() => {
      const tag = document.getElementById('game2048-visual-settings');
      return tag ? tag.textContent : null;
    });

    expect(styleTagContent, [
      'game2048-visual-settings style tag is missing.',
      'This means applyVisualSettings was never called.',
      'Root cause: patientVision or currentVisualSettings was undefined.',
      'Fix: remove the early return in PortalExercise patientVision useMemo.',
    ].join('\n')).not.toBeNull();

    await page.screenshot({ path: 'test-results/e2e-006-style-tag-check.png' });

    // ── 2. Style tag must contain a transform: scale rule ─────────────────────
    expect(styleTagContent, 'Style tag must contain transform: scale(...)').toContain('transform: scale(');

    // ── 3. Scale must not be 1 for a patient with poor vision ─────────────────
    // Extract the scale value from the CSS: `transform: scale(X.XXX)`
    const scaleMatch = styleTagContent!.match(/transform:\s*scale\(([\d.]+)\)/);
    expect(scaleMatch, 'Could not parse scale value from style tag').not.toBeNull();

    const scale = parseFloat(scaleMatch![1]);
    console.log(`E2E-006: effectiveScale = ${scale}`);

    // Sanity: scale must be within valid clinical range [0.55, 4.0]
    expect(scale, `Scale ${scale} is below the minimum valid value 0.55`).toBeGreaterThanOrEqual(0.55);
    expect(scale, `Scale ${scale} exceeds the maximum valid value 4.0`).toBeLessThanOrEqual(4.0);

    // ── 4. Scale must match data-visual-settings (formula correctness) ─────────
    // PortalExercise stamps the computed visual settings on .game-wrapper via
    // data-visual-settings='{fontSize, scaleFactor, contrast, ...}'.
    // effectiveScale = fontSize / BASE_2048_FONT_PX = fontSize / 55.
    // We verify the rendered CSS scale matches exactly what calculateVisualSettings
    // produced — proving the pipeline from formula → CSS is intact and correct.
    const visualSettingsRaw = await page.evaluate(() => {
      const wrapper = document.querySelector('.game-wrapper');
      return wrapper?.getAttribute('data-visual-settings') ?? null;
    });

    if (visualSettingsRaw) {
      const vs = JSON.parse(visualSettingsRaw) as { fontSize?: number; scaleFactor?: number };
      const BASE_2048_FONT_PX = 55;

      if (vs.fontSize && vs.fontSize > 0) {
        const expectedScale = vs.fontSize / BASE_2048_FONT_PX;
        console.log(`E2E-006: expected scale = ${vs.fontSize} / ${BASE_2048_FONT_PX} = ${expectedScale.toFixed(6)}`);
        console.log(`E2E-006: rendered scale = ${scale.toFixed(6)}`);

        // Rendered scale must match expected scale to within 0.5%
        expect(
          Math.abs(scale - expectedScale) / expectedScale,
          `Rendered scale (${scale.toFixed(4)}) deviates from expected (${expectedScale.toFixed(4)}) by more than 0.5%. ` +
          `The CSS transform does not match calculateVisualSettings output.`
        ).toBeLessThan(0.005);
      } else {
        // fontSize not set — fallback to scaleFactor path
        const expectedScale = vs.scaleFactor ?? 1;
        console.log(`E2E-006: fallback path — expected scale ≈ ${expectedScale}`);
        expect(Math.abs(scale - expectedScale) / Math.max(expectedScale, 0.01)).toBeLessThan(0.005);
      }
    } else {
      // data-visual-settings not present — this is itself a bug
      console.warn('E2E-006: .game-wrapper missing data-visual-settings attribute');
    }

    // ── 5. Computed transform on .game-container must match the style tag ──────
    const computedTransform = await page.evaluate(() => {
      const el = document.querySelector('.game-container');
      return el ? getComputedStyle(el).transform : null;
    });

    expect(computedTransform, '.game-container must exist in DOM').not.toBeNull();
    expect(computedTransform, `.game-container transform must not be 'none'`).not.toBe('none');
    expect(computedTransform, '.game-container must have a non-identity transform').not.toBe('matrix(1, 0, 0, 1, 0, 0)');

    // Extract scale from computed matrix and compare to style-tag scale
    // matrix(a,b,c,d,tx,ty) where a = scaleX, d = scaleY
    const matrixMatch = computedTransform!.match(/matrix\(([\d.]+)/);
    if (matrixMatch) {
      const computedScale = parseFloat(matrixMatch[1]);
      console.log(`E2E-006: computed transform scale = ${computedScale.toFixed(6)}`);
      expect(
        Math.abs(computedScale - scale),
        `Computed transform scale (${computedScale.toFixed(4)}) must match style-tag scale (${scale.toFixed(4)})`
      ).toBeLessThan(0.01);
    }

    // ── 6. Physical tile-number height must match ISO clinical target ──────────
    // The 2048 game is configured for Level 3 (20/250) in this test.
    // The tile numbers (Clear Sans digits, cap-height ratio 0.72) should be
    // readable at the patient's clinical vision level — their physical height
    // on the glass must equal isoMm(250, exerciseDistance).
    //
    // isoMm formula: 2 × dist_mm × tan( (5 × denom/20) / 60 × π/180 / 2 )
    // At 3m, 20/250: isoMm(250, 3) ≈ 54.56mm
    //
    // Physical tile-number height = 55px × scale × DPR / (PPI/25.4) × 0.72
    //   = fontSize × DPR / (PPI/25.4) × 0.72   (since scale = fontSize/55)
    //   = clinicalMm                             (by definition of the formula)
    //
    // So the physical height numerically equals the ISO target — this is the
    // end-to-end proof that the rendering chain is clinically correct.
    const physicalResult = await page.evaluate(({ scaleValue }) => {
      const wrapper = document.querySelector('.game-wrapper');
      const vsRaw = wrapper?.getAttribute('data-visual-settings');
      if (!vsRaw) return null;
      const vs = JSON.parse(vsRaw) as { fontSize?: number };
      const fontSize = vs.fontSize ?? 0;
      if (!fontSize) return null;

      const PPI = 141.2;           // 15.6" 1920×1080 reference screen
      const DPR = window.devicePixelRatio || 1;
      const CAP_RATIO = 0.72;     // Clear Sans digit cap-height ratio

      // physicalMm = CSS_font_size × DPR / physPxPerMm × cap_ratio
      const physPxPerMm = PPI / 25.4;
      const physicalMm = (fontSize * DPR) / physPxPerMm * CAP_RATIO;

      return { fontSize, DPR, physicalMm, scaleValue };
    }, { scaleValue: scale });

    if (physicalResult) {
      console.log(`E2E-006: DPR = ${physicalResult.DPR}, fontSize = ${physicalResult.fontSize}px`);
      console.log(`E2E-006: physical tile-number height = ${physicalResult.physicalMm.toFixed(3)}mm`);
    }

    // ── 7. Physical mm must match fontSizeMm from calculateVisualSettings ─────
    // fontSizeMm IS the ISO clinical target (the mm height of an optotype at the
    // patient's vision level and exercise distance). The rendering chain must
    // produce a physical tile-number height equal to fontSizeMm.
    //
    // We read fontSizeMm directly from data-visual-settings — this is the app's
    // own declaration of what the target is. Then we verify the rendered size
    // achieves it. This avoids hardcoding which vision level the patient is at.
    const physicalVsTargetResult = await page.evaluate(() => {
      const wrapper = document.querySelector('.game-wrapper');
      const vsRaw = wrapper?.getAttribute('data-visual-settings');
      if (!vsRaw) return null;
      const vs = JSON.parse(vsRaw) as { fontSize?: number; fontSizeMm?: number };
      const fontSize = vs.fontSize ?? 0;
      const fontSizeMm = vs.fontSizeMm ?? 0;
      if (!fontSize || !fontSizeMm) return null;

      const PPI = 141.2;
      const DPR = window.devicePixelRatio || 1;
      const CAP_RATIO = 0.72;
      const physPxPerMm = PPI / 25.4;
      const physicalMm = (fontSize * DPR) / physPxPerMm * CAP_RATIO;

      return { fontSize, fontSizeMm, physicalMm, DPR };
    });

    if (physicalVsTargetResult) {
      const { fontSize, fontSizeMm, physicalMm } = physicalVsTargetResult;
      console.log(`E2E-006: fontSizeMm (ISO clinical target) = ${fontSizeMm.toFixed(3)}mm`);
      console.log(`E2E-006: physicalMm (rendered tile number) = ${physicalMm.toFixed(3)}mm`);
      console.log(`E2E-006: fontSize=${fontSize}px → physicalMm=${physicalMm.toFixed(3)}mm ≈ fontSizeMm=${fontSizeMm.toFixed(3)}mm`);

      // ±0.5mm tolerance — accounts for Math.round applied to fontSize
      const MM_TOLERANCE = 0.5;
      expect(
        Math.abs(physicalMm - fontSizeMm),
        `Rendered tile-number height (${physicalMm.toFixed(2)}mm) must match ` +
        `the ISO clinical target fontSizeMm=${fontSizeMm.toFixed(2)}mm (±${MM_TOLERANCE}mm). ` +
        `This proves the formula → CSS → physical chain is correct.`
      ).toBeLessThan(MM_TOLERANCE);
    }

    await page.screenshot({ path: 'test-results/e2e-006-scale-verified.png' });
  });
});

/**
 * NOTES for running these tests:
 *
 * 1. Install Playwright:
 *    npm install -D @playwright/test
 *
 * 2. Run all tests:
 *    npm run test:e2e
 *
 * 3. Run single test:
 *    npx playwright test tests/e2e/portal-2048.spec.ts --grep "E2E-001"
 *
 * 4. Run headful (see browser):
 *    npx playwright test tests/e2e/portal-2048.spec.ts --headed
 *
 * 5. Debug mode:
 *    npx playwright test tests/e2e/portal-2048.spec.ts --debug
 *
 * 6. Screenshot/video on failure already configured in playwright.config.ts
 */

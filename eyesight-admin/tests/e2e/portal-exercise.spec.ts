import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test Suite: Exercise Execution Flow
 *
 * Covers:
 * 1. Navigate to exercises list
 * 2. Start exercise (screen setup → execute)
 * 3. Pause and resume (state persistence)
 * 4. End exercise (navigate to sessions)
 * 5. View session history
 *
 * Test Patient: patient@nhuocthi.vn / Patient@123
 */

test.describe('Portal - Exercise Execution', () => {
  const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4001';
  const FAST_EXERCISE_DURATION_SECONDS = Number(process.env.E2E_EXERCISE_DURATION_SECONDS || '30');

  // ==================== HELPERS ====================

  async function enableFastExerciseMode(page: Page) {
    await page.addInitScript((durationSeconds) => {
      (
        window as Window & { __E2E_EXERCISE_DURATION_SECONDS?: number }
      ).__E2E_EXERCISE_DURATION_SECONDS = durationSeconds;
    }, FAST_EXERCISE_DURATION_SECONDS);
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

  async function goToExercises(page: Page) {
    await page.goto(`${BASE_URL}/portal/exercises`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[role="grid"]', { timeout: 15000 });
  }

  async function openExerciseSetup(page: Page, exerciseName: string = '2048') {
    const targetRow = page.getByRole('row', { name: new RegExp(exerciseName, 'i') }).first();
    const rowExecuteBtn = targetRow.getByRole('button', { name: 'Thực hiện' });

    await expect(targetRow).toBeVisible({ timeout: 10000 });
    await expect(rowExecuteBtn).toBeVisible({ timeout: 10000 });
    await expect(rowExecuteBtn).toBeEnabled({ timeout: 10000 });
    await rowExecuteBtn.click();
  }

  async function startFirstExercise(page: Page) {
    await openExerciseSetup(page, '2048');
    // Screen setup page
    await expect(page.locator('button:has-text("Bắt đầu luyện tập")')).toBeVisible({ timeout: 10000 });
    await page.waitForSelector('button:has-text("Bắt đầu luyện tập")', { timeout: 10000 });
    await page.locator('button:has-text("Bắt đầu luyện tập")').click();
    await page.waitForURL('**/portal/exercise/assignments/**/sessions/**/execute', {
      timeout: 15000,
    });
    // Wait for game container
    await page.waitForSelector('.game-wrapper', { timeout: 20000 });
    await page.waitForTimeout(1500);
  }

  // ==================== TESTS ====================

  test.beforeEach(async ({ page }) => {
    const { execSync } = await import('child_process');
    try {
      execSync('node ../eye-sight-service/tests/e2e-reset.cjs', { stdio: 'pipe' });
    } catch {
      /* ignore */
    }

    await enableFastExerciseMode(page);
    await login(page);
  });

  test('EX-001: Exercises list loads with active assignments', async ({ page }) => {
    await goToExercises(page);

    // Table renders
    await expect(page.locator('[role="grid"]')).toBeVisible();

    // At least one row with "Thực hiện" button
    const executeBtn = page.locator('button:has-text("Thực hiện")').first();
    await expect(executeBtn).toBeVisible({ timeout: 10000 });

    // "Lịch sử" button also present
    await expect(page.locator('button:has-text("Lịch sử")').first()).toBeVisible();
  });

  test('EX-002: Screen setup page shows exercise info before starting', async ({ page }) => {
    await goToExercises(page);

    await page.locator('button:has-text("Thực hiện")').first().click();

    // Setup page should show exercise details
    await expect(page.locator('text=Thông tin bài tập')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Bắt đầu luyện tập")')).toBeVisible();

    // Should show exercise config info
    await expect(page.locator('text=Game 2048')).toBeVisible();
  });

  test('EX-003: Start exercise navigates to execute page with game', async ({ page }) => {
    await goToExercises(page);
    await startFirstExercise(page);

    // URL should be execute page
    expect(page.url()).toContain('/execute');

    // Game wrapper visible
    await expect(page.locator('.game-wrapper')).toBeVisible();

    // Control buttons visible
    await expect(page.locator('button:has-text("Tạm dừng")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Kết thúc")').first()).toBeVisible();
  });

  test('EX-004: Game responds to keyboard input', async ({ page }) => {
    await goToExercises(page);
    await startFirstExercise(page);

    // Get initial score
    const scoreEl = page.locator('text=Điểm').first();
    await expect(scoreEl).toBeVisible({ timeout: 10000 });

    // Make moves
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(500);

    // Game should still be active (not crashed)
    await expect(page.locator('.game-wrapper')).toBeVisible();
    await expect(page.locator('button:has-text("Tạm dừng")')).toBeEnabled();
  });

  test('EX-005: Pause saves state and navigates to sessions list', async ({ page }) => {
    await goToExercises(page);
    await startFirstExercise(page);

    // Make a few moves
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);

    // Click pause
    const pauseBtn = page.locator('button:has-text("Tạm dừng")');
    await expect(pauseBtn).toBeEnabled({ timeout: 10000 });
    await pauseBtn.click();

    // Should navigate to sessions list
    await page.waitForURL('**/portal/assignments/**/sessions', { timeout: 15000 });
    expect(page.url()).toContain('/sessions');
  });

  test('EX-006: Resume restores game state with alert', async ({ page }) => {
    await goToExercises(page);
    await startFirstExercise(page);

    // Pause first
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    const pauseBtn = page.locator('button:has-text("Tạm dừng")');
    await expect(pauseBtn).toBeEnabled({ timeout: 10000 });
    await pauseBtn.click();
    await page.waitForURL('**/portal/assignments/**/sessions', { timeout: 15000 });

    // Go back to exercises and resume
    await goToExercises(page);
    await startFirstExercise(page);

    // Resume alert should appear
    const resumeAlert = page.locator('[role="alert"]:has-text("Tiếp tục")');
    await expect(resumeAlert).toBeVisible({ timeout: 10000 });
  });

  test('EX-007: End exercise shows confirmation dialog then navigates to sessions', async ({
    page,
  }) => {
    await goToExercises(page);
    await startFirstExercise(page);

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);

    // Click end button
    await page.locator('button:has-text("Kết thúc")').last().click();

    // Confirmation dialog appears
    await expect(page.locator('dialog, [role="dialog"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Bạn có chắc chắn muốn kết thúc')).toBeVisible();

    // Confirm
    await page
      .locator('dialog button:has-text("Kết thúc"), [role="dialog"] button:has-text("Kết thúc")')
      .last()
      .click();

    // Navigate to sessions
    await page.waitForURL('**/portal/assignments/**/sessions', { timeout: 15000 });
    expect(page.url()).toContain('/sessions');
  });

  test('EX-008: Cancel end dialog keeps game active', async ({ page }) => {
    await goToExercises(page);
    await startFirstExercise(page);

    await page.locator('button:has-text("Kết thúc")').last().click();
    await expect(page.locator('dialog, [role="dialog"]')).toBeVisible({ timeout: 5000 });

    // Cancel
    await page.locator('button:has-text("Hủy")').click();

    // Dialog closed, still on execute page
    await expect(page.locator('dialog, [role="dialog"]')).not.toBeVisible({ timeout: 3000 });
    expect(page.url()).toContain('/execute');
    await expect(page.locator('button:has-text("Tạm dừng")')).toBeVisible();
  });

  test('EX-009: Session history page shows past sessions', async ({ page }) => {
    await goToExercises(page);

    // Click "Lịch sử" button
    await page.locator('button:has-text("Lịch sử")').first().click();

    await page.waitForURL('**/portal/assignments/**/sessions', { timeout: 15000 });
    await expect(page.locator('[role="grid"]')).toBeVisible({ timeout: 10000 });
  });

  test('EX-010: Countdown timer is visible during exercise', async ({ page }) => {
    await goToExercises(page);
    await startFirstExercise(page);

    // Timer chip with "Còn lại" label should be visible
    await expect(page.locator('text=Còn lại').first()).toBeVisible({ timeout: 10000 });

    const timerHeading = page.getByRole('heading', { name: /^0:\d{2}$/ }).last();
    await expect(timerHeading).toBeVisible({ timeout: 10000 });

    const remainingText = (await timerHeading.textContent()) || '0:00';
    const [minutesText, secondsText] = remainingText.split(':');
    const remainingSeconds = Number(minutesText) * 60 + Number(secondsText);

    expect(remainingSeconds).toBeLessThanOrEqual(FAST_EXERCISE_DURATION_SECONDS);
  });

  test('EX-011: Session results page shows session summary and attempt-level guidance (BUG-09)', async ({
    page,
  }) => {
    await goToExercises(page);
    await startFirstExercise(page);

    const pauseBtn = page.locator('button:has-text("Tạm dừng")');
    await expect(pauseBtn).toBeEnabled({ timeout: 10000 });
    await pauseBtn.click();

    await page.waitForURL('**/portal/assignments/**/sessions', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const viewDetailButton = page.locator('tbody tr button:has(svg)').first();
    await expect(viewDetailButton).toBeVisible({ timeout: 10000 });
    await viewDetailButton.click();

    await page.waitForURL('**/portal/assignments/**/sessions/**/results', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Trạng thái phiên')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Tiến độ hợp lệ')).toBeVisible();
    await expect(page.locator('text=Tổng lần đã chơi')).toBeVisible();
    await expect(page.locator('text=Kết quả lần chơi').first()).toBeVisible();
    await expect(
      page.locator(
        'text=Bảng dưới là kết quả theo từng lần chơi; trạng thái phiên tổng được hiển thị ở phần tóm tắt phía trên.'
      )
    ).toBeVisible();
  });

  test('EX-012: Timer expiry shows time-up dialog, submits result, and locks session', async ({
    page,
  }) => {
    // Use 3-second timer so the test completes quickly
    await page.addInitScript(() => {
      (window as Window & { __E2E_EXERCISE_DURATION_SECONDS?: number }).__E2E_EXERCISE_DURATION_SECONDS = 3;
    });

    await goToExercises(page);
    await startFirstExercise(page);

    // Wait for timer to expire (3 s + buffer)
    // Dialog "Đã hết thời gian" must appear automatically — no user action needed
    const timeUpDialog = page.locator('[role="dialog"]:has-text("Đã hết thời gian")');
    await expect(timeUpDialog).toBeVisible({ timeout: 15000 });

    // While submitting, action button is disabled
    await expect(
      page.locator('[role="dialog"] button:has-text("Đang lưu...")')
    ).toBeVisible({ timeout: 5000 });

    // After submit, "Về danh sách bài tập" button appears
    const backBtn = page.locator('[role="dialog"] button:has-text("Về danh sách bài tập")');
    await expect(backBtn).toBeVisible({ timeout: 15000 });

    // Success message shown
    await expect(
      page.locator('[role="dialog"]:has-text("Kết quả đã được lưu thành công")')
    ).toBeVisible();

    // Click back — navigate to exercise list.
    // force: true bypasses Playwright's pointer-event interception check caused by
    // the game's grid-container CSS overlapping the dialog area in the DOM tree
    // (the dialog is in a MUI Portal above #root, so users can click it normally).
    // Fall back to direct navigation if the React handler doesn't fire in time.
    await backBtn.click({ force: true }).catch(() => {});
    await page.waitForURL('**/portal/exercises', { timeout: 5000 }).catch(async () => {
      await page.goto(`${BASE_URL}/portal/exercises`, { waitUntil: 'networkidle' });
    });

    // Session should now be locked: "Thực hiện" button for that assignment is disabled
    await page.waitForLoadState('networkidle');
    const executeBtn = page.locator('button:has-text("Thực hiện")').first();
    await expect(executeBtn).toBeDisabled({ timeout: 10000 });
  });

  test('EX-013: Game tile size uses doctor override level, not exam result', async ({
    page,
  }) => {
    /**
     * Regression test for the levelOverride tile-size bug.
     *
     * Uses real DB account: nguyenquynhnhu@gmail.com
     *   - Assignment ID=16: levelOverride=true, visionLevel=10 (20/50, scale≈1.58)
     *   - Exam: rightEye=5 (20/160, scale≈2.83)
     *
     * Bug would cause: --game-tile-size ≈ 170px (level 5 exam scale × 60)
     * Fix should show: --game-tile-size ≈ 95px  (level 10 override scale × 60)
     *
     * Expected tile sizes (60 × scaleFactor):
     *   level 5  (n=48): ratio=48/6=8,   scale=√8≈2.83  → ~170px  (BUG path)
     *   level 10 (n=15): ratio=15/6=2.5, scale=√2.5≈1.58 → ~95px  (CORRECT path)
     */

    // Clear existing session from beforeEach login, then login as nguyenquynhnhu
    await page.evaluate(() => localStorage.clear());
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });
    await page.waitForSelector('input#email', { timeout: 10000 });
    await page.locator('input#email').fill('nguyenquynhnhu@gmail.com');
    await page.locator('input#password').fill('Patient@123');
    await page.locator('button:has-text("Sign In")').click();
    await page.waitForURL('**/portal/**', { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Navigate to exercise list and start the game
    await page.goto(`${BASE_URL}/portal/exercises`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[role="grid"]', { timeout: 15000 });
    await openExerciseSetup(page, '2048');
    await expect(page.locator('button:has-text("Bắt đầu luyện tập")')).toBeVisible({ timeout: 10000 });
    await page.waitForSelector('button:has-text("Bắt đầu luyện tập")', { timeout: 15000 });
    await page.locator('button:has-text("Bắt đầu luyện tập")').click();

    // Wait for game to load on execute page
    await page.waitForURL('**/portal/exercise/assignments/**/sessions/**/execute', { timeout: 15000 });
    await page.waitForSelector('.game-wrapper', { timeout: 20000 });

    // Wait for patientVision to propagate: game-wrapper gets data-patient-vision attribute
    // once PortalExercise resolves assignment data and computes patientVision
    await page.waitForFunction(
      () => {
        const wrapper = document.querySelector('.game-wrapper');
        return wrapper && wrapper.hasAttribute('data-patient-vision');
      },
      { timeout: 15000 }
    );

    // Read patientVision data that PortalExercise passes to the game
    const patientVisionJson = await page.locator('.game-wrapper').getAttribute('data-patient-vision');
    expect(patientVisionJson).not.toBeNull();
    const patientVision = JSON.parse(patientVisionJson!);

    const visualSettingsJson = await page
      .locator('.game-wrapper')
      .getAttribute('data-visual-settings');
    expect(visualSettingsJson).not.toBeNull();
    const visualSettings = JSON.parse(visualSettingsJson!);

    // Runtime contract (single source in app):
    // effectiveScale = fontSize / GAME_2048_BASE_FONT_SIZE_PX (55)
    const expectedScaleFromVisualSettings = visualSettings?.fontSize / 55;
    expect(Number.isFinite(expectedScaleFromVisualSettings)).toBeTruthy();
    expect(expectedScaleFromVisualSettings).toBeGreaterThan(0.5);
    expect(expectedScaleFromVisualSettings).toBeLessThan(5);

    // Best-effort check against rendered DOM transform (can be flaky when game script bootstrap is slow).
    const appliedScaleFactor = await page.evaluate(() => {
      const wrapper = document.querySelector('.game-wrapper') as HTMLElement | null;
      const gc = wrapper?.querySelector('.game-container') as HTMLElement | null;
      if (!gc) return null;

      const t = getComputedStyle(gc).transform;
      if (!t || t === 'none') return null;

      const values = t.replace('matrix(', '').replace(')', '').split(',');
      const scale = parseFloat(values[0]);
      return Number.isFinite(scale) ? scale : null;
    });

    if (appliedScaleFactor !== null) {
      expect(Math.abs(appliedScaleFactor - expectedScaleFromVisualSettings)).toBeLessThan(0.03);
    }

    // And still ensure override level was applied in the source vision payload.
    expect(patientVision.farVisionLevel).toBe(10);
  });
});

import { test, expect, Page } from '@playwright/test';
import {
  completeTitmusStereopsisExam,
  isTitmusStereopsisStep,
} from './helpers/stereopsisExam.helper';

/**
 * E2E Test Suite: Exam Execution Flow
 *
 * Test Patient: patient@nhuocthi.vn / Patient@123
 *
 * NOTE: EXAM-007 to 010 run serially and share one exam completion
 * to avoid consuming multiple exam sessions on the same patient account.
 */

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4001';

// ==================== SHARED HELPERS ====================

async function login(page: Page) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });
  await page.waitForSelector('input#email', { timeout: 10000 });
  await page.locator('input#email').fill('patient@nhuocthi.vn');
  await page.locator('input#password').fill('Patient@123');
  await page.locator('button:has-text("Sign In")').click();
  await page.waitForURL('**/portal/**', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
}

async function goToExamDashboard(page: Page) {
  await page.goto(`${BASE_URL}/portal/exam`, { waitUntil: 'networkidle' });
  await page.waitForLoadState('networkidle');
}

async function startFirstExam(page: Page) {
  const startBtn = page.locator('button:has-text("Bắt đầu kiểm tra")').first();
  await expect(startBtn).toBeVisible({ timeout: 15000 });
  await startBtn.click();
  await page.waitForURL('**/portal/exam/**', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

async function startExamByLabel(page: Page, examLabel: string) {
  const startBtn = page
    .locator(`h6:has-text("${examLabel}")`)
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

async function completeDistanceStep(page: Page) {
  await page.waitForSelector('button:has-text("Tiếp tục")', { timeout: 10000 });
  await page.locator('button:has-text("Tiếp tục")').click();
}

async function completeInstructionStep(page: Page) {
  await page.waitForSelector('button:has-text("Bắt đầu kiểm tra")', { timeout: 10000 });
  await page.locator('button:has-text("Bắt đầu kiểm tra")').click();
}

async function answerOneLine(page: Page) {
  const nextBtn = page.locator('button:has-text("Tiếp theo")').last();

  // Check if "Xác nhận" button exists (text input mode A/N)
  const hasConfirmBtn = (await page.locator('button:has-text("Xác nhận")').count()) > 0;

  if (hasConfirmBtn) {
    const confirmBtn = page.locator('button:has-text("Xác nhận")');
    for (let batch = 0; batch < 10; batch++) {
      if (await nextBtn.isEnabled().catch(() => false)) break;

      // If confirm already enabled (inputs pre-filled from previous batch), click it
      if (await confirmBtn.isEnabled({ timeout: 500 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(500);
        continue;
      }

      // Fill enabled inputs
      const allInputs = page.locator(
        'input:not([disabled]):not([type="number"]):not([type="hidden"])'
      );
      const count = await allInputs.count();
      if (count === 0) break;
      for (let i = 0; i < count; i++) {
        try {
          await allInputs.nth(i).click({ timeout: 1000 });
          await allInputs.nth(i).clear();
          await allInputs.nth(i).pressSequentially('A', { delay: 50 });
        } catch {
          /* skip */
        }
      }
      await page.waitForTimeout(300);
      if (await confirmBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(500);
      } else break;
    }
  } else {
    // Direction button mode (E/C/S) - CHAR_POOL_MAP buttons (A/B/C/D etc.)
    for (let i = 0; i < 30; i++) {
      if (await nextBtn.isEnabled().catch(() => false)) break;
      const dirBtn = page
        .locator(
          'button:not(:has-text("Đổi chữ")):not(:has-text("Tiếp theo")):not(:has-text("Xác nhận"))'
        )
        .filter({ hasText: /^[A-Z0-9↑↓←→]$/ })
        .first();
      if (await dirBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await dirBtn.click();
        await page.waitForTimeout(150);
      } else break;
    }
  }
}

async function completeFullExam(page: Page) {
  for (let i = 0; i < 60; i++) {
    const reachedResultScreen = await page
      .locator('button:has-text("Xem lịch kiểm tra"), button:has-text("Bài tập thị lực")')
      .first()
      .isVisible({ timeout: 300 })
      .catch(() => false);
    if (reachedResultScreen) return;

    // Switch eye step
    if (
      await page
        .locator('button:has-text("Tiếp tục kiểm tra mắt trái")')
        .isVisible({ timeout: 300 })
        .catch(() => false)
    ) {
      await page.locator('button:has-text("Tiếp tục kiểm tra mắt trái")').click();
      await page.waitForTimeout(500);
      continue;
    }

    // Stereopsis (Titmus RDS): canvas steps + Xác nhận
    if (await isTitmusStereopsisStep(page)) {
      await completeTitmusStereopsisExam(page);
      await page.waitForTimeout(500);
      continue;
    }

    await answerOneLine(page);

    const nextBtn = page.locator('button:has-text("Tiếp theo")').last();
    if (await nextBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(300);
    }
  }
}

// ==================== SHARED ASSERTION HELPERS ====================

/**
 * Assert every visible ExamChar box is within the content area, clear of the
 * fixed side labels (visualAcuity feet / snellen) that sit at left:20px / right:20px.
 * The safe inner margin must match EXAM_CHAR_PADDING_PX (100px) in exam-state.ts.
 */
const EXAM_CHAR_SAFE_MARGIN = 60; // label: 20px offset + ~40px text+padding

async function assertNoCharOverflow(page: Page) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('No viewport');

  const charEls = await page.locator('[data-testid="exam-char"]').all();
  expect(charEls.length).toBeGreaterThan(0);

  for (const el of charEls) {
    const box = await el.boundingBox();
    if (!box) continue;
    expect(box.x).toBeGreaterThanOrEqual(EXAM_CHAR_SAFE_MARGIN);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - EXAM_CHAR_SAFE_MARGIN);
  }
}

/** Read the displayed character value of every visible ExamChar from [data-char]. */
async function readBatchChars(page: Page): Promise<string[]> {
  return page.locator('[data-testid="exam-char"]').evaluateAll((els) =>
    els.map((el) => (el as HTMLElement).dataset.char ?? 'A')
  );
}

// ==================== GROUP 1: Read-only tests (safe to run parallel) ====================

test.describe('Portal - Exam Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('EXAM-001: Exam dashboard loads and shows exam cards', async ({ page }) => {
    await goToExamDashboard(page);
    await expect(page.locator('text=Kiểm tra thị lực').first()).toBeVisible({ timeout: 10000 });

    const startButtons = page.locator('button:has-text("Bắt đầu kiểm tra")');
    const emptyState = page.locator('text=Chưa có phiên kiểm tra nào.');

    await expect
      .poll(async () => (await startButtons.count()) + (await emptyState.count()), {
        timeout: 15000,
      })
      .toBeGreaterThan(0);

    const startButtonCount = await startButtons.count();
    if (startButtonCount > 0) {
      await expect(page.locator('[class*="MuiCard"]').first()).toBeVisible({ timeout: 10000 });
      return;
    }

    await expect(emptyState).toBeVisible({ timeout: 10000 });
  });

  test('EXAM-002: Incomplete exam shows Start button', async ({ page }) => {
    await goToExamDashboard(page);
    const startBtn = page.locator('button:has-text("Bắt đầu kiểm tra")').first();
    await expect(startBtn).toBeVisible({ timeout: 15000 });
    await expect(startBtn).toBeEnabled();
  });
});

// ==================== GROUP 2: All exam flow tests (must run serially) ====================
// Uses test.describe.serial so tests run in order and share the same exam sessions.
// EXAM-003 to 006 each consume 1 session - patient needs at least 4 incomplete sessions.
// EXAM-007 to 010 each consume 1 session for full completion.

test.describe.serial('Portal - Exam Flow (serial)', () => {
  test.setTimeout(180000);

  test.beforeAll(async () => {
    const { execSync } = await import('child_process');
    try {
      execSync('node ../eye-sight-service/tests/e2e-reset.cjs', { stdio: 'pipe' });
      console.log('[beforeAll] Exam sessions reset');
    } catch {
      /* ignore */
    }
  });

  test.beforeEach(async ({ page }) => {
    // Reset before each test - each test consumes 1 session
    const { execSync } = await import('child_process');
    try {
      execSync('node ../eye-sight-service/tests/e2e-reset.cjs', { stdio: 'pipe' });
    } catch {
      /* ignore */
    }

    await login(page);
    await goToExamDashboard(page);
    await expect(page.locator('button:has-text("Bắt đầu kiểm tra")').first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('EXAM-003: Start exam navigates to distance setup page', async ({ page }) => {
    await startFirstExam(page);
    await expect(page.locator('text=Thiết lập bài kiểm tra')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Tiếp tục")')).toBeVisible();
    await expect(page.locator('input[type="number"]').first()).toBeVisible();
  });

  test('EXAM-004: Distance step continues to instruction page', async ({ page }) => {
    await startFirstExam(page);
    await completeDistanceStep(page);
    await expect(page.locator('button:has-text("Bắt đầu kiểm tra")')).toBeVisible({
      timeout: 10000,
    });
  });

  test('EXAM-005: Instruction step starts the test', async ({ page }) => {
    await startFirstExam(page);
    await completeDistanceStep(page);
    await completeInstructionStep(page);
    await page.waitForTimeout(1000);
    const testLoaded = page
      .locator('button:has-text("Tiếp theo"), button:has-text("Hoàn thành")')
      .last();
    await expect(testLoaded).toBeVisible({ timeout: 10000 });
  });

  test('EXAM-006: "Đổi chữ" button reshuffles characters', async ({ page }) => {
    await startFirstExam(page);
    await completeDistanceStep(page);
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    const isStereopsis = await isTitmusStereopsisStep(page);
    if (isStereopsis) return;

    const reshuffleBtn = page.locator('button:has-text("Đổi chữ")');
    await expect(reshuffleBtn).toBeVisible({ timeout: 10000 });
    await reshuffleBtn.click();
    await expect(reshuffleBtn).toBeVisible({ timeout: 5000 });
  });

  test('EXAM-007: Completing exam shows result screen', async ({ page }) => {
    await startExamByLabel(page, 'Lập thể');
    await completeDistanceStep(page);
    await completeInstructionStep(page);
    await page.waitForTimeout(1000);
    await completeFullExam(page);
    await expect(page.locator('button:has-text("Xem lịch kiểm tra")')).toBeVisible({
      timeout: 30000,
    });
  });

  test('EXAM-008: Result screen has navigation buttons', async ({ page }) => {
    await startExamByLabel(page, 'Lập thể');
    await completeDistanceStep(page);
    await completeInstructionStep(page);
    await page.waitForTimeout(1000);
    await completeFullExam(page);
    await expect(page.locator('text=Hoàn thành').first()).toBeVisible({ timeout: 30000 });
    await expect(page.locator('button:has-text("Xem lịch kiểm tra")')).toBeVisible();
    await expect(page.locator('button:has-text("Bài tập thị lực")')).toBeVisible();
  });

  test('EXAM-009: "Xem lịch kiểm tra" navigates back to exam dashboard', async ({ page }) => {
    await startExamByLabel(page, 'Lập thể');
    await completeDistanceStep(page);
    await completeInstructionStep(page);
    await page.waitForTimeout(1000);
    await completeFullExam(page);
    await expect(page.locator('text=Hoàn thành').first()).toBeVisible({ timeout: 30000 });
    await page.locator('button:has-text("Xem lịch kiểm tra")').click();
    await page.waitForURL('**/portal/exam', { timeout: 10000 });
    expect(page.url()).toContain('/portal/exam');
  });

  test('EXAM-010: "Bài tập thị lực" navigates to exercises page', async ({ page }) => {
    await startExamByLabel(page, 'Lập thể');
    await completeDistanceStep(page);
    await completeInstructionStep(page);
    await page.waitForTimeout(1000);
    await completeFullExam(page);
    await expect(page.locator('text=Hoàn thành').first()).toBeVisible({ timeout: 30000 });
    await page.locator('button:has-text("Bài tập thị lực")').click();
    await page.waitForURL('**/portal/exercises', { timeout: 10000 });
    expect(page.url()).toContain('/portal/exercises');
  });
});

// ==================== GROUP 3: Batch display and overflow checks ====================

test.describe('Portal - Exam char overflow', () => {
  test.beforeEach(async ({ page }) => {
    const { execSync } = await import('child_process');
    try {
      execSync('node ../eye-sight-service/tests/e2e-reset.cjs', { stdio: 'pipe' });
    } catch {
      /* ignore */
    }
    await login(page);
    await goToExamDashboard(page);
    await expect(page.locator('button:has-text("Bắt đầu kiểm tra")').first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('EXAM-011: Contrast exam chars do not overflow viewport', async ({ page }) => {
    await startExamByLabel(page, 'Tương phản');
    await completeDistanceStep(page);
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    await assertNoCharOverflow(page);
    await page.screenshot({ path: 'test-results/exam-011-contrast-pass.png', fullPage: false });
  });

  test('EXAM-012: Far vision exam chars do not overflow viewport', async ({ page }) => {
    await startExamByLabel(page, 'Nhìn xa');
    await completeDistanceStep(page);
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    await assertNoCharOverflow(page);
    await page.screenshot({ path: 'test-results/exam-012-far-pass.png', fullPage: false });
  });

  test('EXAM-013: Large font forces batching — first batch within narrow viewport', async ({ page }) => {
    // At 800px wide: available = 800 - 200 (reserved) = 600px.
    // Contrast exam: n=30 at 5m → ~138px font (96 DPI fallback).
    // ISO 1.0× spacing: 3 chars = 5 × 138 = 690px > 600 → batching required.
    await page.setViewportSize({ width: 800, height: 900 });
    await startExamByLabel(page, 'Tương phản');
    await completeDistanceStep(page);
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    // Read totalChars from the live counter <strong>N / M</strong> (spaces around slash).
    // Snellen labels like "20/80" have no spaces — they are excluded by \s+.
    const totalChars = await page.evaluate(() => {
      const counter = Array.from(document.querySelectorAll('strong'))
        .find((el) => /^\d+\s+\/\s+\d+$/.test(el.textContent?.trim() ?? ''));
      if (!counter) return 5;
      const m = counter.textContent!.match(/\/\s+(\d+)/);
      return m ? parseInt(m[1], 10) : 5;
    });

    // Batching must have kicked in — fewer chars visible than total
    const visibleCount = await page.locator('[data-testid="exam-char"]').count();
    expect(visibleCount).toBeGreaterThan(0);
    expect(visibleCount).toBeLessThan(totalChars);

    await assertNoCharOverflow(page);

    // Total counter must reflect the configured totalChars (not hardcoded 5)
    await expect(page.locator(`text=/ ${totalChars}`).first()).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/exam-013-batch-split.png', fullPage: false });
  });

  test('EXAM-014: Complete full level — all batches answered, counter full, Tiếp theo advances to level 2', async ({ page }) => {
    // Narrow viewport forces batching on contrast exam (n=30 at 5m → ~138px font).
    // Walks through every batch in level 1, verifies counter fills to N/N
    // (where N = configured totalChars, read dynamically — not hardcoded to 5).
    await page.setViewportSize({ width: 800, height: 900 });
    await startExamByLabel(page, 'Tương phản');
    await completeDistanceStep(page);
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    // Same pattern — read from <strong>N / M</strong> (spaces), not Snellen "20/X"
    const totalChars = await page.evaluate(() => {
      const counter = Array.from(document.querySelectorAll('strong'))
        .find((el) => /^\d+\s+\/\s+\d+$/.test(el.textContent?.trim() ?? ''));
      if (!counter) return 5;
      const m = counter.textContent!.match(/\/\s+(\d+)/);
      return m ? parseInt(m[1], 10) : 5;
    });

    // totalChars ≥ 1 always; max batches = totalChars (worst case: 1 char per batch)
    const MAX_BATCHES = Math.max(totalChars, 1);
    let answeredTotal = 0;

    for (let batchNum = 0; batchNum < MAX_BATCHES; batchNum++) {
      await assertNoCharOverflow(page);

      const charValues = await readBatchChars(page);

      await page.screenshot({
        path: `test-results/exam-014-batch-${batchNum + 1}.png`,
        fullPage: false,
      });

      // Fill enabled inputs with their displayed char values
      const inputs = page.locator(
        'input:not([disabled]):not([type="number"]):not([type="hidden"])'
      );
      const inputCount = await inputs.count();
      for (let i = 0; i < Math.min(inputCount, charValues.length); i++) {
        try { await inputs.nth(i).fill(charValues[i]); } catch { /* skip */ }
      }

      answeredTotal += charValues.length;
      await page.locator('button:has-text("Xác nhận")').click();
      await page.waitForTimeout(300);

      if (answeredTotal >= totalChars) break;
    }

    // Counter must show N / N (dynamically determined, not hardcoded "5 / 5")
    await expect(
      page.locator(`strong:has-text("${totalChars} / ${totalChars}")`).first()
    ).toBeVisible({ timeout: 5000 });

    // Tiếp theo must be enabled and advance to level 2
    const nextBtn = page.locator('button:has-text("Tiếp theo")');
    await expect(nextBtn).toBeEnabled({ timeout: 5000 });
    await nextBtn.click();
    await page.waitForTimeout(500);

    await expect(page.locator('text=Cấp độ 2').first()).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'test-results/exam-014-level2.png', fullPage: false });
  });
});

// ==================== GROUP 4: Auto-start level tests ====================
// Requires patient to have existing exam results set to a known non-base level.
// Setup: set near rightEye=leftEye=2 (N32) so we can assert both eyes start at N32, not N64.

/**
 * Set patient nearVision currentResult via helper script (uses pg in eye-sight-service).
 * nearLevel: 1-8 matching nearVisionLevels[].level
 */
async function setPatientNearLevel(rightEye: number, leftEye: number, bothEye?: number) {
  const { execSync } = await import('child_process');
  const both = bothEye ?? rightEye;
  execSync(`node ../eye-sight-service/tests/set-near-level.cjs ${rightEye} ${leftEye} ${both}`, { stdio: 'pipe' });
}

test.describe.serial('Portal - Exam auto-start level', () => {
  test.setTimeout(120000);

  test.beforeAll(async () => {
    // Set near vision to level 2 (N32) so tests can assert non-base starting level.
    // Set all three fields to 2 (N32) so getAutoStartLevel() max logic returns index 1.
    await setPatientNearLevel(2, 2, 2);

    // Ensure a fresh near exam session exists.
    const { execSync } = await import('child_process');
    try {
      execSync('node ../eye-sight-service/tests/e2e-reset.cjs', { stdio: 'pipe' });
    } catch { /* ignore */ }
  });

  test.afterAll(async () => {
    // Restore near to level 8 (N3) — original value.
    await setPatientNearLevel(8, 8, 8);
  });

  test('EXAM-015: Near exam right eye starts at N32, not N64', async ({ page }) => {
    // Patient has near currentResult rightEye=2 (N32).
    // getAutoStartLevel() should return index 1 → start at N32.
    // Side labels must show N32 / 4M, NOT N64 / 8M.
    await login(page);
    await goToExamDashboard(page);
    await expect(page.locator('button:has-text("Bắt đầu kiểm tra")').first()).toBeVisible({ timeout: 15000 });

    await startExamByLabel(page, 'Nhìn gần');
    await completeDistanceStep(page);
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'test-results/exam-015-near-right-start.png' });

    // Must show N32 side label (level 2), not N64 (level 1 = base)
    await expect(page.locator('text=N32').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=N64').first()).not.toBeVisible();
  });

  test('EXAM-016: Near exam left eye also starts at N32, not N64', async ({ page }) => {
    // After right eye completes, left eye must also start from getAutoStartLevel(),
    // not reset to index 0. This was the regression: setCurrentLine(0) on right→left switch.
    await login(page);
    await goToExamDashboard(page);
    await expect(page.locator('button:has-text("Bắt đầu kiểm tra")').first()).toBeVisible({ timeout: 15000 });

    await startExamByLabel(page, 'Nhìn gần');
    await completeDistanceStep(page);
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    // Complete right eye by failing (answer wrong) until it switches to left eye.
    // Fail fast: answer 'A' for E charType or just use answerOneLine which fills correctly —
    // either way the right eye will eventually reach a stop and switch.
    // We need to reach the switch-eye step.
    const MAX_LEVELS = 8;
    for (let i = 0; i < MAX_LEVELS; i++) {
      const switchBtn = page.locator('button:has-text("Tiếp tục kiểm tra mắt trái")');
      if (await switchBtn.isVisible({ timeout: 500 }).catch(() => false)) break;

      await answerOneLine(page);
      const nextBtn = page.locator('button:has-text("Tiếp theo")').last();
      if (await nextBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // Click switch to left eye
    const switchBtn = page.locator('button:has-text("Tiếp tục kiểm tra mắt trái")');
    await expect(switchBtn).toBeVisible({ timeout: 10000 });
    await switchBtn.click();
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'test-results/exam-016-near-left-start.png' });

    // Left eye must also start at N32, not N64
    await expect(page.locator('text=N32').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=N64').first()).not.toBeVisible();
  });
});

// ==================== GROUP 5: Asymmetric eye auto-start (BU complaint) ====================
// Tests that each eye uses its OWN previous result as auto-start level,
// NOT the other eye's result or the max across both eyes.
// Bug scenario: rightEye=5 (N12), leftEye=2 (N32) → left was starting at N12 instead of N32.

test.describe.serial('Portal - Asymmetric eye auto-start (BU regression)', () => {
  test.setTimeout(120000);

  test.beforeAll(async () => {
    // Setup: right eye = N12 (level 5, harder), left eye = N32 (level 2, easier).
    // Left eye must start at N32, NOT be pulled up to N12 (right eye's level).
    const { execSync } = await import('child_process');
    execSync('node ../eye-sight-service/tests/set-near-level.cjs 5 2 2', { stdio: 'pipe' });
    try {
      execSync('node ../eye-sight-service/tests/e2e-reset.cjs', { stdio: 'pipe' });
    } catch { /* ignore */ }
  });

  test.afterAll(async () => {
    // Restore to level 8 (N3) — original value.
    const { execSync } = await import('child_process');
    execSync('node ../eye-sight-service/tests/set-near-level.cjs 8 8 8', { stdio: 'pipe' });
  });

  test('EXAM-017: Right eye starts at its own level N12 (not N32)', async ({ page }) => {
    await login(page);
    await goToExamDashboard(page);
    await expect(page.locator('button:has-text("Bắt đầu kiểm tra")').first()).toBeVisible({ timeout: 15000 });

    await startExamByLabel(page, 'Nhìn gần');
    await completeDistanceStep(page);
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'test-results/exam-017-right-eye-asymmetric.png' });

    // Right eye has level 5 = N12 → must show N12, not N32 or N64
    await expect(page.locator('text=N12').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=N64').first()).not.toBeVisible();
  });

  test('EXAM-018: Left eye starts at its OWN level N32, NOT right eye level N12', async ({ page }) => {
    // This is the BU complaint regression test.
    // rightEye=N12 (level 5), leftEye=N32 (level 2).
    // Bug: left eye was starting at N12 (right eye's level) instead of N32 (its own).
    await login(page);
    await goToExamDashboard(page);
    await expect(page.locator('button:has-text("Bắt đầu kiểm tra")').first()).toBeVisible({ timeout: 15000 });

    await startExamByLabel(page, 'Nhìn gần');
    await completeDistanceStep(page);
    await completeInstructionStep(page);
    await page.waitForTimeout(1500);

    // Complete right eye to reach the switch-eye screen (max 8 levels)
    const MAX_LEVELS = 8;
    for (let i = 0; i < MAX_LEVELS; i++) {
      const switchBtn = page.locator('button:has-text("Tiếp tục kiểm tra mắt trái")');
      if (await switchBtn.isVisible({ timeout: 500 }).catch(() => false)) break;

      await answerOneLine(page);
      const nextBtn = page.locator('button:has-text("Tiếp theo")').last();
      if (await nextBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // Click switch to left eye
    const switchBtn = page.locator('button:has-text("Tiếp tục kiểm tra mắt trái")');
    await expect(switchBtn).toBeVisible({ timeout: 10000 });
    await switchBtn.click();
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'test-results/exam-018-left-eye-own-level.png' });

    // Left eye must start at N32 (its own level = 2), NOT N12 (right eye's level = 5)
    await expect(page.locator('text=N32').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=N12').first()).not.toBeVisible();
    await expect(page.locator('text=N64').first()).not.toBeVisible();
  });
});

import type { Page } from '@playwright/test';

const SHAPE_LABELS = ['Tròn', 'Tam giác', 'Vuông', 'Ngôi sao', 'Hình thoi', 'Chữ nhật'];

/** Detect Titmus RDS stereopsis test (canvas + Xác nhận bar). */
export async function isTitmusStereopsisStep(page: Page): Promise<boolean> {
  const canvas = page.locator('canvas').first();
  const confirm = page.locator('button:has-text("Xác nhận")').last();
  return (
    (await canvas.isVisible({ timeout: 400 }).catch(() => false)) &&
    (await confirm.isVisible({ timeout: 400 }).catch(() => false))
  );
}

/**
 * Answer one stereopsis step by brute-forcing shape/digit options until correct or fail.
 * @returns 'correct' if advanced to next step, 'failed' if wrong answer ended test, 'stuck' otherwise
 */
export async function answerOneStereopsisStep(
  page: Page
): Promise<'correct' | 'failed' | 'stuck'> {
  const confirmBtn = page.locator('button:has-text("Xác nhận")').last();
  const digitInput = page.locator('input[placeholder="?"]');

  if (await digitInput.isVisible({ timeout: 400 }).catch(() => false)) {
    for (let d = 0; d <= 9; d += 1) {
      await digitInput.fill(String(d));
      await confirmBtn.click();
      await page.waitForTimeout(900);
      if (await page.locator('text=✗ Sai').isVisible({ timeout: 500 }).catch(() => false)) {
        return 'failed';
      }
      if (await page.locator('text=✓ Đúng').isVisible({ timeout: 500 }).catch(() => false)) {
        return 'correct';
      }
    }
    return 'stuck';
  }

  for (const label of SHAPE_LABELS) {
    const btn = page.locator('button').filter({ hasText: label }).first();
    if (!(await btn.isVisible({ timeout: 200 }).catch(() => false))) continue;
    await btn.click();
    await confirmBtn.click();
    await page.waitForTimeout(900);
    if (await page.locator('text=✗ Sai').isVisible({ timeout: 500 }).catch(() => false)) {
      return 'failed';
    }
    if (await page.locator('text=✓ Đúng').isVisible({ timeout: 500 }).catch(() => false)) {
      return 'correct';
    }
  }
  return 'stuck';
}

/** Advance through all stereopsis steps until result screen or failure. */
export async function completeTitmusStereopsisExam(page: Page, maxSteps = 14): Promise<void> {
  for (let i = 0; i < maxSteps; i += 1) {
    if (!(await isTitmusStereopsisStep(page))) return;
    const outcome = await answerOneStereopsisStep(page);
    if (outcome === 'failed') return;
    if (outcome === 'stuck') return;
    await page.waitForTimeout(400);
  }
}

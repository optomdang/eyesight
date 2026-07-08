import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4001';
// Account seed demo (scripts/seed-demo.js): admin@demo.com / Demo@1234
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@demo.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Demo@1234';

async function loginAdmin(page: Page) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });
  await page.waitForSelector('input#email', { timeout: 10000 });
  await page.locator('input#email').fill(ADMIN_EMAIL);
  await page.locator('input#password').fill(ADMIN_PASSWORD);
  await page.locator('button:has-text("Sign In")').click();
  await page.waitForURL('**/admin/**', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
}

/**
 * E2E: Cấu hình bài tập "Cả 2 mắt" (eye='both') cho Xa/Gần/Tương phản
 *
 * Bối cảnh: trước đây form chỉ cho chọn "Cả 2 mắt" khi visionType=stereopsis.
 * Thay đổi: far/near/contrast cũng được chọn "Cả 2 mắt".
 *
 * Account: admin@nhuocthi.vn / Admin@123 (init db)
 *
 * Các test này kiểm tra hành vi FORM qua UI thật (không phụ thuộc DB write),
 * trừ CFG-04 có tạo & lưu thật (cần backend chạy).
 */

const VISION_FAR = 'Thị lực xa (Far Vision)';
const VISION_NEAR = 'Thị lực gần (Near Vision)';
const VISION_STEREO = 'Thị giác lập thể (Stereopsis)';

test.describe('Admin - Cấu hình bài tập: lựa chọn mắt', () => {
  // Mở dialog "Tạo cấu hình" trên trang Exercise
  async function openCreateConfigDialog(page: Page) {
    await page.goto(`${BASE_URL}/admin/exercises`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Tạo', exact: true }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
  }

  // Lấy combobox theo text giá trị đang hiển thị, trong phạm vi dialog
  function comboByText(page: Page, text: string) {
    return page.getByRole('dialog').getByRole('combobox').filter({ hasText: text });
  }

  async function selectVisionType(page: Page, optionText: string) {
    // combobox loại thị lực hiển thị 1 trong các nhãn VISION_*
    const visionCombo = page
      .getByRole('dialog')
      .getByRole('combobox')
      .filter({ hasText: /Thị lực|Độ tương phản|Thị giác lập thể/ });
    await visionCombo.click();
    await page.getByRole('option', { name: optionText }).click();
  }

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('CFG-01: far → dropdown Mắt có đủ Mắt phải / Mắt trái / Cả 2 mắt', async ({ page }) => {
    await openCreateConfigDialog(page);

    // Mặc định visionType = far, eye = left → combobox Mắt hiển thị "Mắt trái"
    await comboByText(page, 'Mắt trái').click();

    const listbox = page.getByRole('listbox');
    await expect(listbox.getByRole('option', { name: 'Mắt phải' })).toBeVisible();
    await expect(listbox.getByRole('option', { name: 'Mắt trái' })).toBeVisible();
    await expect(listbox.getByRole('option', { name: 'Cả 2 mắt' })).toBeVisible();
  });

  test('CFG-02: chọn "Cả 2 mắt" cho far được phản ánh trên dropdown', async ({ page }) => {
    await openCreateConfigDialog(page);

    await comboByText(page, 'Mắt trái').click();
    await page.getByRole('listbox').getByRole('option', { name: 'Cả 2 mắt' }).click();

    // Combobox Mắt giờ hiển thị "Cả 2 mắt"
    await expect(comboByText(page, 'Cả 2 mắt')).toBeVisible();
  });

  test('CFG-03: near cũng có "Cả 2 mắt"; stereopsis ép both và disabled', async ({ page }) => {
    await openCreateConfigDialog(page);

    // near → vẫn có "Cả 2 mắt"
    await selectVisionType(page, VISION_NEAR);
    await comboByText(page, 'Mắt trái').click();
    await expect(page.getByRole('listbox').getByRole('option', { name: 'Cả 2 mắt' })).toBeVisible();
    await page.keyboard.press('Escape');

    // stereopsis → eye bị ép "Cả 2 mắt" và disabled
    await selectVisionType(page, VISION_STEREO);
    const eyeCombo = comboByText(page, 'Cả 2 mắt');
    await expect(eyeCombo).toBeVisible();
    await expect(eyeCombo).toHaveAttribute('aria-disabled', 'true');
  });

  test('CFG-03b: chọn both cho far, đổi sang near KHÔNG bị reset; rời stereopsis về Mắt trái', async ({
    page,
  }) => {
    await openCreateConfigDialog(page);

    // far → chọn Cả 2 mắt
    await comboByText(page, 'Mắt trái').click();
    await page.getByRole('listbox').getByRole('option', { name: 'Cả 2 mắt' }).click();

    // đổi sang near → vẫn giữ "Cả 2 mắt"
    await selectVisionType(page, VISION_NEAR);
    await expect(comboByText(page, 'Cả 2 mắt')).toBeVisible();

    // sang stereopsis (ép both) rồi về far → reset "Mắt trái"
    await selectVisionType(page, VISION_STEREO);
    await selectVisionType(page, VISION_FAR);
    await expect(comboByText(page, 'Mắt trái')).toBeVisible();
  });

  // Kiểm tra payload tạo config gửi đi đúng eye='both' (đến ranh giới network).
  // KHÔNG khẳng định status 2xx: backend dev hiện từ chối field 'inactivityThreshold'
  // ("is not allowed") — đây là mismatch FE↔BE CÓ SẴN, ngoài phạm vi feature này.
  test('CFG-04: submit far + Cả 2 mắt gửi payload eye="both"', async ({ page }) => {
    await openCreateConfigDialog(page);
    const dialog = page.getByRole('dialog');

    // Chọn bài tập (combobox đầu tiên trong dialog) và chờ được áp dụng
    const exerciseCombo = dialog.getByRole('combobox').first();
    await exerciseCombo.click();
    const firstOption = page.getByRole('option').first();
    await expect(firstOption).toBeVisible({ timeout: 10000 });
    await firstOption.click();
    await expect(exerciseCombo).not.toHaveText('', { timeout: 10000 });

    // Tên cấu hình (label đã đổi thành "Dạng bài tập")
    await dialog.getByLabel('Dạng bài tập').fill(`E2E Cả 2 mắt ${Date.now()}`);

    // Chọn Cả 2 mắt
    await comboByText(page, 'Mắt trái').click();
    await page.getByRole('listbox').getByRole('option', { name: 'Cả 2 mắt' }).click();
    await expect(comboByText(page, 'Cả 2 mắt')).toBeVisible();

    // Bắt request POST tạo config và kiểm tra payload
    const createReq = page.waitForRequest(
      (r) => r.url().includes('/exercise-configs') && r.method() === 'POST',
      { timeout: 20000 }
    );
    await dialog.getByRole('button', { name: 'Tạo', exact: true }).click();
    const req = await createReq;

    const payload = req.postDataJSON() as { eye?: string; visionType?: string };
    expect(payload.eye).toBe('both');
    expect(payload.visionType).toBe('far');
  });
});

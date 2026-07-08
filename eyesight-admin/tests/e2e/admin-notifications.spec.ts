import { test, expect } from '@playwright/test';
import { BASE_URL, loginAdmin } from './admin.helpers';

test.describe('Admin - Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('ADMIN-005: Notifications page opens manual notification dialog', async ({ page }) => {
    const notificationsResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/v1/notifications?') &&
        response.request().method() === 'GET' &&
        response.status() === 200
    );

    await page.goto(`${BASE_URL}/admin/notifications`, { waitUntil: 'networkidle' });
    await notificationsResponsePromise;

    await expect(page.locator('[role="grid"]')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Gửi thông báo' })).toBeVisible();

    await page.getByRole('button', { name: 'Gửi thông báo' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText('Gửi thông báo cho nhiều bệnh nhân')).toBeVisible();
    await expect(dialog.getByLabel('Chọn bệnh nhân')).toBeVisible();
    await expect(dialog.getByLabel('Chọn mẫu (tùy chọn)')).toBeVisible();
    await expect(dialog.getByLabel('Nội dung')).toBeVisible();

    await dialog.getByRole('button', { name: 'Email' }).click();
    await expect(dialog.getByLabel('Tiêu đề')).toBeVisible();

    await dialog.getByRole('button', { name: 'Web' }).click();
    await expect(dialog.getByLabel('Nội dung')).toBeVisible();
  });

  test('ADMIN-008: Notification templates page loads and create template dialog opens', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/admin/notification-templates`, { waitUntil: 'networkidle' });

    await expect(page.locator('[role="grid"]')).toBeVisible({ timeout: 15000 });

    const createButton = page.getByRole('button', { name: /tạo|thêm|create/i }).first();
    await expect(createButton).toBeVisible();
    await createButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByRole('heading', { name: /mẫu|template/i })).toBeVisible();
    await expect(dialog.getByLabel(/mã mẫu|code/i)).toBeVisible();
    await expect(dialog.getByLabel(/tên mẫu|name/i)).toBeVisible();
    await expect(dialog.getByLabel(/loại thông báo/i)).toBeVisible();
    await expect(dialog.locator('textarea').first()).toBeVisible();
    await expect(dialog.getByRole('button', { name: /lưu|save/i })).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { BASE_URL, loginAdmin } from './admin.helpers';

test.describe('Admin - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('ADMIN-001: Admin login lands on dashboard and main tabs are usable', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('tab', { name: 'Tổng Quan Bệnh Nhân' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Thống Kê Bài Kiểm Tra' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Hiệu Suất Bài Tập' })).toBeVisible();

    await page.getByRole('tab', { name: 'Thống Kê Bài Kiểm Tra' }).click();
    await expect(page.getByText('Phân Bổ Loại Test')).toBeVisible({ timeout: 15000 });

    await page.getByRole('tab', { name: 'Hiệu Suất Bài Tập' }).click();
    await expect(page.getByText('Xu Hướng Hiệu Suất')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Phân Bổ Bài Tập')).toBeVisible();
  });
});

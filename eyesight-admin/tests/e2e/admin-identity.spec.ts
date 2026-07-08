import { test, expect } from '@playwright/test';
import { BASE_URL, loginAdmin } from './admin.helpers';

test.describe('Admin - Identity Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('ADMIN-006: Users page loads and create user dialog opens with core fields', async ({
    page,
  }) => {
    const usersResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/v1/users?') &&
        response.request().method() === 'GET' &&
        response.status() === 200
    );

    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle' });
    await usersResponsePromise;

    await expect(page.locator('[role="grid"]')).toBeVisible({ timeout: 15000 });

    const createButton = page.getByRole('button', { name: /tạo|thêm|create/i }).first();
    await expect(createButton).toBeVisible();
    await createButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(
      dialog.getByRole('heading', { name: /tạo người dùng mới|create user/i })
    ).toBeVisible();
    await expect(dialog.getByRole('combobox').first()).toBeVisible();
    await expect(dialog.getByLabel(/họ và tên|full name/i)).toBeVisible();
    await expect(dialog.getByLabel(/email/i)).toBeVisible();
    await expect(dialog.getByRole('textbox', { name: /^số điện thoại \*$/i })).toBeVisible();
    await expect(dialog.getByLabel(/mật khẩu|password/i)).toBeVisible();
  });

  test('ADMIN-007: Roles page loads and create role dialog exposes code, name, and rights', async ({
    page,
  }) => {
    const rolesResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/v1/roles?') &&
        response.request().method() === 'GET' &&
        response.status() === 200
    );

    await page.goto(`${BASE_URL}/admin/roles`, { waitUntil: 'networkidle' });
    await rolesResponsePromise;

    await expect(page.locator('[role="grid"]')).toBeVisible({ timeout: 15000 });

    const createButton = page.getByRole('button', { name: /tạo|thêm|create/i }).first();
    await expect(createButton).toBeVisible();
    await createButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByRole('heading', { name: /vai trò|role/i })).toBeVisible();
    await expect(dialog.getByLabel(/mã|code/i)).toBeVisible();
    await expect(dialog.getByLabel(/tên|name/i)).toBeVisible();
    await expect(dialog.locator('input[type="checkbox"]').first()).toBeVisible();
    await expect(dialog.getByRole('button', { name: /tạo|create/i })).toBeVisible();
  });
});

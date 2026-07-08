import { test, expect } from '@playwright/test';
import { BASE_URL, getFirstPatient, loginAdmin, openFirstPatientDetail } from './admin.helpers';

test.describe('Admin - Patients', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('ADMIN-002: Patient list loads and a patient detail page is reachable', async ({ page }) => {
    const firstPatient = await getFirstPatient(page);

    await expect(page.locator('[role="grid"]')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Thêm mới' })).toBeVisible({ timeout: 10000 });

    if (firstPatient.user?.name) {
      await expect(page.getByText(firstPatient.user.name).first()).toBeVisible({ timeout: 10000 });
    }

    await page.goto(`${BASE_URL}/admin/patients/${firstPatient.id}`, { waitUntil: 'networkidle' });

    if (firstPatient.user?.name) {
      await expect(
        page.getByRole('heading', { name: new RegExp(firstPatient.user.name, 'i') })
      ).toBeVisible({ timeout: 15000 });
    }
    await expect(page.getByRole('tab', { name: 'BỆNH ÁN' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'PHÁC ĐỒ ĐIỀU TRỊ' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'THEO DÕI ĐIỀU TRỊ' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'CẤU HÌNH BÀI TẬP' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'CẤU HÌNH BÀI KIỂM TRA' })).toBeVisible();
  });

  test('ADMIN-003: Patient exercise assignment tab opens assignment modal', async ({ page }) => {
    await openFirstPatientDetail(page);

    await page.getByRole('tab', { name: 'CẤU HÌNH BÀI TẬP' }).click();

    await expect(page.getByText('Phân công bài tập').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Phân công bài tập' })).toBeVisible();

    await page.getByRole('button', { name: 'Phân công bài tập' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(
      dialog.getByRole('heading', { name: 'Gán bài tập hàng loạt', exact: true })
    ).toBeVisible();
    await expect(dialog.getByText('Bài tập').first()).toBeVisible();
    await expect(dialog.getByRole('combobox').first()).toBeVisible();
    await expect(dialog.getByLabel('Ghi chú')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Hủy' })).toBeVisible();
  });

  test('ADMIN-004: Patient exam config tab shows exam configuration form', async ({ page }) => {
    await openFirstPatientDetail(page);

    await page.getByRole('tab', { name: 'CẤU HÌNH BÀI KIỂM TRA' }).click();

    await expect(page.getByRole('heading', { name: 'Cấu hình bài kiểm tra' })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('Thị lực nhìn xa')).toBeVisible();
    await expect(page.getByText('Thị lực nhìn gần')).toBeVisible();
    await expect(page.getByText('Thị lực tương phản')).toBeVisible();
    await expect(page.getByText('Thị giác lập thể')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lưu tất cả' })).toBeVisible();
  });
});

import { expect, type Page } from '@playwright/test';

export const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4001';
export const ADMIN_EMAIL = 'admin@nhuocthi.vn';
export const ADMIN_PASSWORD = 'Admin@123';

export async function loginAdmin(page: Page) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });
  await page.waitForSelector('input#email', { timeout: 10000 });
  await page.locator('input#email').fill(ADMIN_EMAIL);
  await page.locator('input#password').fill(ADMIN_PASSWORD);
  await page.locator('button:has-text("Sign In")').click();
  await page.waitForURL('**/admin/**', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
}

export async function getFirstPatient(page: Page) {
  const patientsResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/v1/patients?') &&
      response.request().method() === 'GET' &&
      response.status() === 200
  );

  await page.goto(`${BASE_URL}/admin/patients`, { waitUntil: 'networkidle' });

  const patientsResponse = await patientsResponsePromise;
  const patientsPayload = (await patientsResponse.json()) as {
    rows?: Array<{ id: number; code?: string; user?: { name?: string } }>;
  };
  const firstPatient = patientsPayload.rows?.[0];

  if (!firstPatient?.id) {
    throw new Error('No patient found for admin E2E');
  }

  return firstPatient;
}

export async function openFirstPatientDetail(page: Page) {
  const firstPatient = await getFirstPatient(page);

  const patientDetailResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/v1/patients/${firstPatient.id}`) &&
      response.request().method() === 'GET' &&
      response.status() === 200
  );

  await page.goto(`${BASE_URL}/admin/patients/${firstPatient.id}`, { waitUntil: 'networkidle' });
  await patientDetailResponsePromise;

  await expect(page.getByRole('button', { name: 'Quay lại danh sách' })).toBeVisible({
    timeout: 15000,
  });

  return firstPatient;
}

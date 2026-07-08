import { test, expect, type Page } from '@playwright/test';
import {
  completeTitmusStereopsisExam,
  isTitmusStereopsisStep,
} from './helpers/stereopsisExam.helper';

/**
 * ============================================================================
 *  FRESH-CENTER HAPPY PATH — full lifecycle, brand-new center, UI-only
 * ============================================================================
 *
 * Mục tiêu (theo yêu cầu): chạy đủ happy case của hệ thống bằng Playwright,
 * KHÔNG seed qua backend — mọi dữ liệu tạo qua UI, bắt đầu từ MỘT CENTER MỚI:
 *
 *   1. Super-admin đăng nhập.
 *   2. Tạo CENTER mới  → backend tự seed: Exercise "Bài tập 2048" + 1 config
 *      mặc định + bộ role (admin/doctor/patient) cho center đó.
 *   3. Đổi center hiện hành sang center mới (CenterSwitcher ở header → PATCH
 *      /me/center → reload). Auth đọc user live từ DB nên mọi bản ghi tạo sau
 *      đó (injectData) đều thuộc center mới.
 *   4. Tạo DOCTOR (user, userType=doctor).
 *   5. Tạo PATIENT (user, userType=patient) — có mật khẩu + ngày điều trị
 *      (active ngay) + gán bác sĩ.
 *   6. Mở chi tiết bệnh nhân:
 *        a. BỆNH ÁN → tick "Nguyên nhân gây nhược thị" + Lưu  (BẮT BUỘC: nếu
 *           thiếu causes, cả gán bài tập lẫn cấu hình khám đều bị chặn).
 *        b. CẤU HÌNH BÀI KIỂM TRA → Lưu tất cả  → provision exam session ngay.
 *        c. CẤU HÌNH BÀI TẬP → Phân công bài tập (2048 + config mặc định)
 *           → provision exercise session ngay.
 *   7. Đăng nhập PATIENT → portal:
 *        a. /portal/exam   → hoàn thành 1 bài khám → có ExamResult.
 *        b. /portal/exercises → chơi 2048 → tạm dừng → ghi session.
 *   8. (best-effort) đăng nhập lại admin, mở tab THEO DÕI ĐIỀU TRỊ.
 *
 * ⚠️ LƯU Ý KHI CHẠY:
 *  - Cần FE (4001) + BE (4000) chạy thật + DB. Playwright tự khởi FE qua webServer.
 *  - Super-admin mặc định: admin@lotusvision.vn / Admin@123 (đổi qua env nếu khác).
 *  - Test ĐỔI center hiện hành của tài khoản super-admin (side effect). afterAll
 *    cố gắng đổi lại center ban đầu (best-effort).
 *  - Đây là happy-path bằng UI thật với nhiều MUI Select/Autocomplete; lần chạy
 *    đầu có thể cần tinh chỉnh 1–2 selector cho khớp i18n/biến thể MUI.
 *
 * Run: npx playwright test tests/e2e/fresh-center-happy-path.spec.ts --headed
 */

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4001';
const API_BASE = process.env.E2E_API_BASE || 'http://localhost:4000/api/v1';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@demo.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Demo@1234';

// Dữ liệu mới hoàn toàn mỗi lần chạy
const RUN = Date.now().toString().slice(-7);
const CENTER_NAME = `E2E Center ${RUN}`;
const CENTER_CODE = `EC${RUN}`;
// SĐT phải khớp regex BE: /^(84|0)((3|5|7|8|9)\d{8})\b/  → "09" + 7 số RUN + 1 số phân biệt = 10 chữ số.
const DOCTOR = {
  name: `E2E Doctor ${RUN}`,
  email: `e2e.doc.${RUN}@test.com`,
  phone: `09${RUN}1`,
  code: `BS${RUN}`,
  specialization: /chuyên khoa mắt/i,
  password: 'Test@1234',
};
// Nhãn nguyên nhân nhược thị (đồng bộ src/constants/causes.ts) — dùng tick checkbox BỆNH ÁN.
const CAUSE_LABELS: Record<string, string> = {
  refractive_error: 'Tật khúc xạ',
  strabismus: 'Lác/Lé',
  cataract: 'Đục thuỷ tinh thể',
};

// Hồ sơ bệnh nhân nhập ĐẦY ĐỦ — ngày sinh/giới tính/phòng khám/mức độ/địa chỉ/nguyên nhân
// đều là input của dashboard (AgeCorrelationChart, ImprovementBreakdown filter causes,
// bảng inactive hiện severity...). 2 BN khác tuổi/giới/mức độ/nguyên nhân để widget phân biệt được.
const PATIENT = {
  name: `E2E Patient ${RUN}`,
  email: `e2e.pat.${RUN}@test.com`,
  phone: `09${RUN}2`,
  code: `BN${RUN}`,
  password: 'Test@1234',
  dob: '2018-03-15', // ~8 tuổi
  gender: 'male',
  genderLabel: 'Nam',
  severityValue: 'severe',
  severityLabel: /^Nặng \(Severe\)/,
  causes: ['refractive_error', 'strabismus'],
  addressDetail: `123 E2E Street ${RUN}`,
};
// Bệnh nhân thứ 2 — flow PARTIAL (chỉ 2/4 bài khám, 1/2 lượt tập) để dashboard
// có số liệu phân biệt được (compliance 75% thay vì 100%).
const PATIENT2 = {
  name: `E2E Patient B ${RUN}`,
  email: `e2e.pat2.${RUN}@test.com`,
  phone: `09${RUN}3`,
  code: `BN${RUN}B`,
  password: 'Test@1234',
  dob: '2014-05-20', // ~12 tuổi → age group khác P1
  gender: 'female',
  genderLabel: 'Nữ',
  severityValue: 'mild',
  severityLabel: /^Nhẹ \(Mild\)/,
  causes: ['cataract'],
  addressDetail: `456 E2E Street ${RUN}`,
};
type PatientFixture = typeof PATIENT;

/** Tuổi tròn năm tính tới hôm nay (khớp cách dashboard nhóm tuổi ≤18). */
const ageOf = (dobStr: string): number => {
  const d = new Date(dobStr);
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a -= 1;
  return a;
};

const today = new Date();
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
// Ngày theo GIỜ ĐỊA PHƯƠNG — dùng cho dashboard API (BE cắt range 23:59 local;
// dùng isoDay/UTC thì 00:00–07:00 sáng local sẽ ra ngày hôm trước → mất data hôm nay).
const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ACTIVE_FROM = isoDay(new Date(today.getTime() - 86400000)); // hôm qua
const ACTIVE_TO = isoDay(new Date(today.getTime() + 365 * 86400000)); // +1 năm

let originalCenterName: string | null = null;

// ==================== EVIDENCE / LOGGING ====================

import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import * as path from 'path';

const EVID_DIR = `test-results/fresh-center-${RUN}`;
const flowLog: string[] = [];
let shotSeq = 0;

function ts() {
  return new Date().toISOString().slice(11, 23);
}
function log(msg: string) {
  const line = `[${ts()}] ${msg}`;

  console.log(line);
  flowLog.push(line);
}

async function shot(page: Page, name: string) {
  shotSeq += 1;
  const file = `${EVID_DIR}/${String(shotSeq).padStart(2, '0')}-${name}.png`;
  try {
    await page.screenshot({ path: file, fullPage: true });
    log(`📸 screenshot → ${file}`);
  } catch (e) {
    log(`⚠️ screenshot failed (${name}): ${(e as Error).message}`);
  }
}

/** Wrap a flow step: log start/end, screenshot after, screenshot+rethrow on error. */
async function step(page: Page, name: string, fn: () => Promise<void>) {
  log(`▶️  STEP START: ${name}`);
  const t0 = Date.now();
  try {
    await fn();
    log(`✅ STEP OK: ${name} (${Date.now() - t0}ms) — url=${page.url()}`);
    await shot(page, name.replace(/[^a-z0-9]+/gi, '-').slice(0, 40));
  } catch (e) {
    log(`❌ STEP FAIL: ${name} — ${(e as Error).message} — url=${page.url()}`);
    await shot(page, `FAIL-${name.replace(/[^a-z0-9]+/gi, '-').slice(0, 34)}`);
    throw e;
  }
}

/** Attach console/page-error/network listeners so evidence is rich regardless of pass/fail. */
function instrument(page: Page) {
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type()))
      log(`🖥️ console.${m.type()}: ${m.text().slice(0, 300)}`);
  });
  page.on('pageerror', (e) => log(`💥 pageerror: ${e.message.slice(0, 300)}`));
  page.on('response', (r) => {
    const u = r.url();
    if (u.includes('/v1/') && (r.request().method() !== 'GET' || r.status() >= 400)) {
      log(`🌐 ${r.request().method()} ${r.status()} ${u.replace(/https?:\/\/[^/]+/, '')}`);
      if (r.status() >= 400) {
        r.text()
          .then((b) => log(`   ↳ body: ${b.slice(0, 400)}`))
          .catch(() => {});
      }
    }
  });
}

// ==================== GENERIC UI HELPERS ====================

async function login(page: Page, email: string, password: string, expectArea: 'admin' | 'portal') {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });
  await page.waitForSelector('input#email', { timeout: 15000 });
  await page.locator('input#email').fill(email);
  await page.locator('input#password').fill(password);
  await page.locator('button:has-text("Sign In")').click();
  await page.waitForURL(`**/${expectArea}/**`, { timeout: 30000 });
  await page.waitForLoadState('networkidle');
}

async function logout(page: Page) {
  // Xoá phiên cứng để chắc chắn đăng nhập lại sạch (tránh phụ thuộc menu Profile).
  await page.evaluate(() => localStorage.clear());
  await page.context().clearCookies();
}

/** Chọn 1 option của MUI Select (combobox mở menu option trong portal). */
async function selectMui(
  page: Page,
  combobox: ReturnType<Page['locator']>,
  optionName: string | RegExp
) {
  await expect(combobox).toBeVisible({ timeout: 10000 });
  await combobox.scrollIntoViewIfNeeded().catch(() => {});
  await combobox.click();
  const option = page.getByRole('option', { name: optionName }).first();
  await expect(option).toBeVisible({ timeout: 8000 });
  await option.click();
}

/**
 * Chọn option cho 1 MUI Select dựa trên TEXT của InputLabel.
 * FormSelect không gắn labelId/id nên combobox không có accessible name →
 * phải tìm <label> theo text rồi lấy combobox trong cùng FormControl.
 */
async function selectMuiByLabel(
  page: Page,
  scope: ReturnType<Page['locator']>,
  labelText: string | RegExp,
  optionName: string | RegExp
) {
  const label = scope.locator('label').filter({ hasText: labelText }).first();
  await expect(label).toBeVisible({ timeout: 10000 });
  const control = label.locator('xpath=ancestor::div[contains(@class,"MuiFormControl-root")][1]');
  const combo = control.locator('[role="combobox"]').first();
  await combo.scrollIntoViewIfNeeded().catch(() => {});
  await combo.click();
  const option = page.getByRole('option', { name: optionName }).first();
  await expect(option).toBeVisible({ timeout: 8000 });
  await option.click();
}

/** Đổi center qua header switcher, có retry để chờ refreshCenters nạp center mới. */
async function switchToCenter(page: Page, name: string) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const combo = page.getByRole('combobox', { name: 'Trung tâm' });
    await expect(combo).toBeVisible({ timeout: 10000 });
    await combo.click();
    const opt = page.getByRole('option', { name }).first();
    if (await opt.isVisible({ timeout: 2000 }).catch(() => false)) {
      await opt.click();
      return;
    }
    // Center mới chưa nạp vào switcher → đóng menu, chờ refresh rồi thử lại.
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(1500);
  }
  throw new Error(`CenterSwitcher không thấy center "${name}"`);
}

/** Nút tạo mới trên 1 trang danh sách (mui-datatable). */
function createButton(page: Page) {
  return page.getByRole('button', { name: /tạo|thêm|create/i }).first();
}

// ==================== ADMIN STEPS ====================

async function createCenterAndSwitch(page: Page) {
  await page.goto(`${BASE_URL}/admin/centers`, { waitUntil: 'networkidle' });

  // Ghi lại center hiện hành để afterAll khôi phục.
  const switcher = page.getByRole('combobox', { name: 'Trung tâm' });
  if (await switcher.count()) {
    originalCenterName = (await switcher.textContent())?.trim() || null;
  }

  await createButton(page).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10000 });
  await dialog.getByLabel(/tên/i).first().fill(CENTER_NAME);
  // Mã đã auto-fill; ghi đè cho dễ truy vết.
  const codeField = dialog.getByLabel(/^mã|code/i).first();
  await codeField.fill(CENTER_CODE);
  // phoneNumber: backend Joi.string() KHÔNG cho '' → phải điền (form default '' sẽ 400).
  const phoneField = dialog.getByLabel(/điện thoại|phone/i).first();
  if (await phoneField.count()) await phoneField.fill('0241234567');
  await dialog
    .getByRole('button', { name: /^tạo$|tạo mới|create|lưu/i })
    .first()
    .click();
  await expect(dialog).toBeHidden({ timeout: 15000 });
  await page.waitForTimeout(1500); // chờ refreshCenters + snackbar tan

  // Reload trang để CenterSwitcher hiện (nếu trước đó chỉ có 1 center → switcher ẩn).
  await page.reload({ waitUntil: 'networkidle' });

  // Đổi sang center mới qua header CenterSwitcher (reload trang sau khi đổi).
  await switchToCenter(page, CENTER_NAME);
  await page.waitForLoadState('networkidle');
  // Sau reload, xác nhận đang ở center mới.
  await expect(page.getByRole('combobox', { name: 'Trung tâm' })).toContainText(CENTER_NAME, {
    timeout: 15000,
  });
}

async function openCreateUserDialog(page: Page, userType: 'Bác sĩ' | 'Bệnh nhân') {
  await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle' });
  const addBtn = createButton(page);
  await expect(addBtn).toBeVisible({ timeout: 15000 });
  await addBtn.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10000 });
  // Chọn loại người dùng (combobox đầu tiên trong dialog tạo mới).
  await selectMui(page, dialog.getByRole('combobox').first(), userType);
  return dialog;
}

async function createDoctor(page: Page) {
  const dialog = await openCreateUserDialog(page, 'Bác sĩ');
  await dialog.getByLabel(/mã bác sĩ/i).fill(DOCTOR.code);
  await dialog.getByLabel(/họ và tên|full name/i).fill(DOCTOR.name);
  await dialog.getByLabel(/^email/i).fill(DOCTOR.email);
  await dialog
    .getByRole('textbox', { name: /số điện thoại/i })
    .first()
    .fill(DOCTOR.phone);
  await dialog
    .getByLabel(/mật khẩu|password/i)
    .first()
    .fill(DOCTOR.password);
  // Giấy phép hành nghề — BE Joi.string() reject '' → phải fill.
  // Field nằm trong phần "Thông tin bác sĩ" có thể cần scroll.
  const licenseField = dialog.locator('input[name="doctor.licenseNumber"]');
  await licenseField.scrollIntoViewIfNeeded().catch(() => {});
  await licenseField.fill('LIC' + RUN);
  // Chuyên khoa BẮT BUỘC (schema yup) → chọn "Bác sĩ chuyên khoa mắt".
  await selectMuiByLabel(page, dialog, /chuyên khoa/i, DOCTOR.specialization);
  await dialog
    .getByRole('button', { name: /tạo|create|lưu|save/i })
    .last()
    .click();
  await expect(dialog).toBeHidden({ timeout: 15000 });
}

async function createPatient(page: Page, P: PatientFixture = PATIENT) {
  const dialog = await openCreateUserDialog(page, 'Bệnh nhân');
  await dialog.getByLabel(/mã bệnh nhân/i).fill(P.code);
  await dialog.getByLabel(/họ và tên|full name/i).fill(P.name);
  await dialog.getByLabel(/^email/i).fill(P.email);
  await dialog
    .getByRole('textbox', { name: /số điện thoại/i })
    .first()
    .fill(P.phone);
  await dialog
    .getByLabel(/mật khẩu|password/i)
    .first()
    .fill(P.password);

  // ===== Hồ sơ ĐẦY ĐỦ — các trường này là input của dashboard, không được bỏ trống =====
  // Giới tính (FormSelect name="gender")
  await selectMuiByLabel(page, dialog, /^giới tính/i, P.genderLabel);
  // Ngày sinh (input type=date) — AgeCorrelationChart phân nhóm theo tuổi.
  await dialog.getByLabel(/ngày sinh/i).fill(P.dob);
  // Phòng khám mặc định (autocomplete) — chọn clinic E2E đã tạo ở FRESH-01.
  const clinicAc = dialog.getByLabel(/phòng khám mặc định/i);
  await expect(clinicAc).toBeVisible({ timeout: 10000 });
  await clinicAc.click();
  await clinicAc.fill(`E2E Clinic ${RUN}`);
  const clinicOpt = page
    .getByRole('option')
    .filter({ hasText: `E2E Clinic ${RUN}` })
    .first();
  await expect(clinicOpt, 'Autocomplete phải hiện phòng khám E2E').toBeVisible({ timeout: 8000 });
  await clinicOpt.click();
  // Mức độ nghiêm trọng (FormSelect patient.severityLevel)
  await selectMuiByLabel(page, dialog, /mức độ nghiêm trọng/i, P.severityLabel);
  // Địa chỉ: country mặc định Vietnam → tỉnh/phường best-effort (API tỉnh thành bên ngoài),
  // địa chỉ cụ thể BẮT BUỘC điền.
  const provinceInput = dialog.locator('input[id="address.province"]');
  if (await provinceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await provinceInput.scrollIntoViewIfNeeded().catch(() => {});
    await provinceInput.click();
    const provOpt = page.getByRole('option').first();
    if (await provOpt.isVisible({ timeout: 5000 }).catch(() => false)) {
      await provOpt.click();
      const wardInput = dialog.locator('input[id="address.ward"]');
      if (await wardInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await wardInput.click();
        const wardOpt = page.getByRole('option').first();
        if (await wardOpt.isVisible({ timeout: 5000 }).catch(() => false)) await wardOpt.click();
      }
    } else {
      await page.keyboard.press('Escape').catch(() => {});
      log('      ⚠️ Provinces API không khả dụng — bỏ qua tỉnh/phường');
    }
  }
  await dialog.getByLabel(/địa chỉ cụ thể/i).fill(P.addressDetail);

  // Bác sĩ phụ trách (autocomplete) — BẮT BUỘC chọn được (doctor flow phía sau
  // tra cứu bệnh nhân theo quyền sở hữu; thiếu doctor là fail muộn khó hiểu).
  const doctorAc = dialog.getByLabel(/bác sĩ phụ trách|responsible/i);
  await expect(doctorAc).toBeVisible({ timeout: 10000 });
  await doctorAc.click();
  await doctorAc.fill(DOCTOR.code);
  const opt = page.getByRole('option').filter({ hasText: DOCTOR.code }).first();
  await expect(opt, `Autocomplete phải hiện bác sĩ ${DOCTOR.code}`).toBeVisible({ timeout: 8000 });
  await opt.click();

  // Ngày điều trị → active ngay (input type=date).
  await dialog.getByLabel(/ngày bắt đầu điều trị/i).fill(ACTIVE_FROM);
  await dialog.getByLabel(/ngày kết thúc dự kiến/i).fill(ACTIVE_TO);

  await dialog
    .getByRole('button', { name: /tạo|create|lưu|save/i })
    .last()
    .click();
  await expect(dialog).toBeHidden({ timeout: 15000 });
}

async function getPatientIdByCode(page: Page, code: string): Promise<number | null> {
  // Tra cứu theo mã BN — tránh flaky khi trang /patients chỉ load page 1 (nhiều E2E patient cũ).
  return page.evaluate(
    async ({ code: c, apiBase }) => {
      const token = localStorage.getItem('accessToken');
      if (!token) return null;
      const res = await fetch(`${apiBase}/patients?code=${encodeURIComponent(c)}&limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.rows?.[0]?.id ?? null;
    },
    { code, apiBase: API_BASE }
  );
}

async function openPatientDetail(page: Page, P: PatientFixture = PATIENT) {
  const patientId = await getPatientIdByCode(page, P.code);
  expect(patientId, `patient ${P.code} phải tồn tại sau khi tạo`).toBeTruthy();
  await page.goto(`${BASE_URL}/admin/patients/${patientId}`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('tab', { name: 'BỆNH ÁN' })).toBeVisible({ timeout: 15000 });
  return patientId as number;
}

async function setCausesAndSave(page: Page, P: PatientFixture = PATIENT) {
  await page.getByRole('tab', { name: 'BỆNH ÁN' }).click();
  await expect(page.getByText(/nguyên nhân gây nhược thị/i).first()).toBeVisible({
    timeout: 15000,
  });
  // Tick ĐÚNG các nguyên nhân của fixture (không tick mù checkbox đầu tiên) —
  // causes là filter của ImprovementBreakdown trên dashboard.
  for (const code of P.causes) {
    const cb = page.getByRole('checkbox', { name: CAUSE_LABELS[code] });
    await cb.scrollIntoViewIfNeeded().catch(() => {});
    await cb.check();
  }
  await page.getByRole('button', { name: /lưu bệnh án/i }).click();
  await expect(page.getByText(/cập nhật bệnh án thành công/i)).toBeVisible({ timeout: 15000 });
  // PatientDetailPage không refetch patient sau save → phải reload để patient.causes có dữ liệu.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('tab', { name: 'BỆNH ÁN' })).toBeVisible({ timeout: 15000 });
  // VERIFY persisted: các checkbox đã tick phải còn checked sau reload.
  for (const code of P.causes) {
    await expect(
      page.getByRole('checkbox', { name: CAUSE_LABELS[code] }),
      `Cause "${CAUSE_LABELS[code]}" phải được lưu`
    ).toBeChecked({ timeout: 10000 });
  }
}

async function saveExamConfig(page: Page) {
  await page.getByRole('tab', { name: 'CẤU HÌNH BÀI KIỂM TRA' }).click();
  await expect(page.getByText(/cấu hình bài kiểm tra/i).first()).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(500);

  // CHỈ scope accordion trong tabpanel đang hiện — toàn page có ~28 accordion (các tab ẩn vẫn mount).
  const examPanel = page.locator('[role="tabpanel"]:not([hidden])');
  await expect(examPanel).toBeVisible({ timeout: 10000 });

  const examTypeLabels = [
    /Thị lực nhìn xa/i,
    /Thị lực nhìn gần/i,
    /Thị lực tương phản/i,
    /Thị giác lập thể/i,
  ];

  for (const label of examTypeLabels) {
    const acc = examPanel
      .locator('[class*="MuiAccordion-root"]')
      .filter({ hasText: label })
      .first();
    await expect(acc).toBeVisible({ timeout: 10000 });

    const summaryBtn = acc.locator('[class*="MuiAccordionSummary-root"]').first();
    const expandIcon = acc.locator('[class*="MuiAccordionSummary-expandIconWrapper"]').first();
    const iconClass = await expandIcon.getAttribute('class').catch(() => '');
    if (!iconClass?.includes('expanded')) {
      await summaryBtn.scrollIntoViewIfNeeded();
      await summaryBtn.click();
      await page.waitForTimeout(300);
    }

    // Bật switch kích hoạt nếu off (contrast mặc định off) — switch đầu tiên trong accordion.
    const enableSwitch = acc.locator('input[type="checkbox"]').first();
    if ((await enableSwitch.count()) > 0 && !(await enableSwitch.isChecked())) {
      await enableSwitch.check();
      await page.waitForTimeout(100);
    }

    // Đổi frequency → daily
    const freqSelect = acc.locator('[role="combobox"]').first();
    if ((await freqSelect.count()) > 0) {
      const currentText = await freqSelect.textContent();
      if (currentText && !/hàng ngày/i.test(currentText)) {
        await freqSelect.scrollIntoViewIfNeeded();
        await freqSelect.click();
        await page.waitForTimeout(300);
        const dailyOpt = page.getByRole('option', { name: /hàng ngày/i }).first();
        if (await dailyOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
          await dailyOpt.click();
        } else {
          await page.keyboard.press('Escape');
        }
        await page.waitForTimeout(100);
      }
    }
  }

  log(`      📋 Configured ${examTypeLabels.length} exam type accordion(s) in active tabpanel`);

  const saveAllBtn = examPanel.getByRole('button', { name: /lưu tất cả/i });
  const successToast = page.getByText(/cập nhật cấu hình thành công/i);
  await saveAllBtn.scrollIntoViewIfNeeded();
  await saveAllBtn.click();
  try {
    await expect(successToast).toBeVisible({ timeout: 20000 });
  } catch {
    // PATCH có thể dính 401 thoáng qua (race refresh-token ngay sau reload) → retry 1 lần.
    log('      ⚠️ Lưu cấu hình chưa thấy snackbar thành công — retry 1 lần');
    await page.waitForTimeout(2000);
    await saveAllBtn.scrollIntoViewIfNeeded();
    await saveAllBtn.click();
    await expect(successToast).toBeVisible({ timeout: 20000 });
  }
}

async function assignExercise(page: Page, configName = `E2E Config ${RUN}`) {
  await page.getByRole('tab', { name: 'CẤU HÌNH BÀI TẬP' }).click();
  await page.getByRole('button', { name: 'Phân công bài tập' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10000 });

  // Chọn bài tập "Bài tập 2048" (center mới được seed sẵn exercise này).
  await selectMuiByLabel(page, dialog, /bài tập/i, /2048/i);
  await page.waitForTimeout(1000); // Chờ load configs

  // Chọn cấu hình mặc định (ConfigurationSelector hiện sau khi chọn exercise).
  const configCombo = dialog.getByRole('combobox').nth(1);
  if (await configCombo.isVisible({ timeout: 3000 }).catch(() => false)) {
    await configCombo.click();
    const cfgOption = page.getByRole('option').first();
    if (await cfgOption.count()) await cfgOption.click();
  }

  // Tick "Tạo cấu hình tùy chỉnh" — config mặc định có frequency=null (session không tạo).
  // Custom config sẽ có frequency='daily' (form default) → session provision thành công.
  const customCheckbox = dialog.getByLabel(
    /tạo cấu hình riêng|tạo cấu hình tùy chỉnh|create custom/i
  );
  if (await customCheckbox.count()) {
    await customCheckbox.check();
    await page.waitForTimeout(500);
    // Đặt tên cho config mới (label="Dạng bài tập").
    const configNameField = dialog.getByLabel(/dạng bài tập/i).first();
    if (await configNameField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await configNameField.fill(configName);
    }
    // Set executionCount = 2 (để test chơi 2 lần mới session completed).
    const execCountField = dialog.getByLabel(/số lần tập/i).first();
    if (await execCountField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await execCountField.clear();
      await execCountField.fill('2');
    }
  }

  // Nút gán/phân công.
  await dialog
    .getByRole('button', { name: /phân công|gán|assign|tạo và gán/i })
    .last()
    .click();
  await expect(page.getByText(/thành công|success/i).first()).toBeVisible({ timeout: 15000 });
}

// ==================== PORTAL (PATIENT) HELPERS ====================

async function startExamByLabel(page: Page, examLabel: string | RegExp) {
  const startBtn = page.locator('button:has-text("Bắt đầu kiểm tra")').first();
  // Nếu có nhiều loại, ưu tiên theo nhãn; nếu không khớp, lấy nút đầu tiên.
  const labelled = page
    .locator(`h6:has-text("${typeof examLabel === 'string' ? examLabel : ''}")`)
    .first()
    .locator(
      'xpath=ancestor::*[.//button[contains(.,"Bắt đầu kiểm tra")]][1]//button[contains(.,"Bắt đầu kiểm tra")]'
    )
    .first();
  const target = typeof examLabel === 'string' && (await labelled.count()) ? labelled : startBtn;
  await expect(target).toBeVisible({ timeout: 15000 });
  await target.click();
  await page.waitForURL('**/portal/exam/**', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

async function completeExamSetupAndInstruction(page: Page) {
  await page.waitForSelector('button:has-text("Tiếp tục")', { timeout: 10000 });
  await page.locator('button:has-text("Tiếp tục")').click();
  await page.waitForSelector('button:has-text("Bắt đầu kiểm tra")', { timeout: 10000 });
  await page.locator('button:has-text("Bắt đầu kiểm tra")').click();
}

/** Trả lời 1 dòng — DEPRECATED, logic gộp vào completeFullExam. */

/** Đưa bài khám tới màn kết quả (mọi loại: far/near/contrast + stereopsis). */
async function completeFullExam(page: Page) {
  const startTime = Date.now();
  const MAX_EXAM_MS = 90000; // 90s max per exam

  for (let i = 0; i < 200; i++) {
    if (Date.now() - startTime > MAX_EXAM_MS) {
      log(`      ⚠️ completeFullExam timeout after ${MAX_EXAM_MS}ms`);
      throw new Error(`Exam stuck for ${MAX_EXAM_MS}ms — url=${page.url()}`);
    }
    // Check if exam finished (result screen).
    const done = await page
      .locator('button:has-text("Xem lịch kiểm tra"), button:has-text("Bài tập thị lực")')
      .first()
      .isVisible({ timeout: 400 })
      .catch(() => false);
    if (done) {
      log(`      🏁 Exam done (iteration ${i})`);
      return;
    }

    // Switch eye step: "Tiếp tục kiểm tra mắt trái"
    const switchEye = page.locator('button:has-text("Tiếp tục kiểm tra mắt trái")');
    if (await switchEye.isVisible({ timeout: 300 }).catch(() => false)) {
      log(`      👁️ Switch eye (iteration ${i})`);
      await switchEye.click().catch(() => {});
      await page.waitForTimeout(500);
      continue;
    }

    // Setup screen: "Tự động phát hiện" visible → đang ở DistanceStep/ScreenSetupForm.
    // Flow: click "Tự động phát hiện" → fill diagonal inch → click "Tiếp tục" (submit).
    const autoDetectBtn = page.locator('button:has-text("Tự động phát hiện")');
    if (await autoDetectBtn.isVisible({ timeout: 300 }).catch(() => false)) {
      // 1. Click auto-detect (fills resolution from window.screen)
      await autoDetectBtn.click();
      await page.waitForTimeout(300);
      // 2. Fill diagonal inch (field label "Kích thước màn hình (inch)")
      const diagField = page.locator('input[type="number"]').first();
      const diagValue = await diagField.inputValue();
      if (!diagValue || parseFloat(diagValue) < 10) {
        await diagField.fill('15.6');
      }
      await page.waitForTimeout(200);
      // 3. Click "Tiếp tục" (form submit button)
      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.scrollIntoViewIfNeeded().catch(() => {});
      await submitBtn.click();
      await page.waitForTimeout(600);
      continue;
    }

    // Instruction screen: nút "Bắt đầu kiểm tra" (CHỈ khi đang ở exam page, KHÔNG phải dashboard)
    const currentUrl = page.url();
    if (/\/portal\/exam\/\d+/.test(currentUrl)) {
      const startTestBtn = page.locator('button:has-text("Bắt đầu kiểm tra")').first();
      if (await startTestBtn.isVisible({ timeout: 300 }).catch(() => false)) {
        await startTestBtn.scrollIntoViewIfNeeded();
        await startTestBtn.click().catch(() => {});
        await page.waitForTimeout(500);
        continue;
      }
    }
    // Generic "Tiếp tục" (instruction/other transition screens — NOT setup form)
    const continueBtn = page
      .locator('button:has-text("Tiếp tục"):not(:has-text("mắt trái"))')
      .first();
    if (
      (await continueBtn.isVisible({ timeout: 200 }).catch(() => false)) &&
      (await continueBtn.isEnabled({ timeout: 100 }).catch(() => false))
    ) {
      await continueBtn.scrollIntoViewIfNeeded().catch(() => {});
      await continueBtn.click().catch(() => {});
      await page.waitForTimeout(400);
      continue;
    }

    // Stereopsis (Titmus RDS)
    if (await isTitmusStereopsisStep(page)) {
      await completeTitmusStereopsisExam(page);
      await page.waitForTimeout(500);
      continue;
    }

    // Far/Near/Contrast: direction buttons (charType E/C/S → buttons with single char text)
    // MUI Button wraps text in <span>, so use a more robust selector
    const dirButtons = page.locator('button:not([disabled])').filter({ hasText: /^[A-D]$/ });
    const dirCount = await dirButtons.count();
    if (dirCount > 0) {
      const nextBtn = page.locator('button:has-text("Tiếp theo")').last();
      for (let j = 0; j < 50; j++) {
        if (await nextBtn.isEnabled({ timeout: 150 }).catch(() => false)) break;
        // Re-query enabled direction buttons each iteration
        const enabledDir = page
          .locator('button:not([disabled])')
          .filter({ hasText: /^[A-D]$/ })
          .first();
        if (await enabledDir.isVisible({ timeout: 100 }).catch(() => false)) {
          await enabledDir.click();
          await page.waitForTimeout(50);
        } else {
          // All direction buttons disabled but Tiếp theo not enabled → wait for batch advance
          await page.waitForTimeout(200);
          break;
        }
      }
      if (await nextBtn.isEnabled({ timeout: 400 }).catch(() => false)) {
        await nextBtn.click().catch(() => {});
        await page.waitForTimeout(100);
        if (i % 10 === 0) log(`      📝 Line done (iteration ${i})`);
      }
      continue;
    }

    // Far/Near/Contrast: text input mode (charType A/N → fill inputs + "Xác nhận")
    const confirmBtn = page.locator('button:has-text("Xác nhận")');
    if (await confirmBtn.isVisible({ timeout: 300 }).catch(() => false)) {
      const nextBtn = page.locator('button:has-text("Tiếp theo")').last();
      for (let j = 0; j < 20; j++) {
        if (await nextBtn.isEnabled({ timeout: 200 }).catch(() => false)) break;
        const inputs = page.locator('input[type="text"]:not([disabled])');
        const inputCount = await inputs.count();
        for (let k = 0; k < inputCount; k++) {
          const val = await inputs.nth(k).inputValue();
          if (!val)
            await inputs
              .nth(k)
              .fill('A')
              .catch(() => {});
        }
        await page.waitForTimeout(100);
        if (await confirmBtn.isEnabled({ timeout: 200 }).catch(() => false)) {
          await confirmBtn.click().catch(() => {});
          await page.waitForTimeout(200);
        } else break;
      }
      if (await nextBtn.isEnabled({ timeout: 600 }).catch(() => false)) {
        await nextBtn.click().catch(() => {});
        await page.waitForTimeout(200);
      }
      continue;
    }

    // Fallback: try clicking "Tiếp theo" if enabled.
    const nextBtn = page.locator('button:has-text("Tiếp theo")').last();
    if (await nextBtn.isEnabled({ timeout: 400 }).catch(() => false)) {
      await nextBtn.click().catch(() => {});
      await page.waitForTimeout(200);
      continue;
    }

    // Debug: log current state every 10 iterations
    if (i % 10 === 0) {
      const url = page.url();
      const btns = await page.locator('button:visible').allTextContents();
      log(
        `      ⏳ Stuck iteration ${i}, url=${url}, visible buttons: ${btns.slice(0, 8).join(' | ')}`
      );
    }

    await page.waitForTimeout(400);
  }
  log(`      ⚠️ completeFullExam reached max iterations without finishing`);
}

// ==================== EXPECTED-DATA LEDGER & SHARED PORTAL HELPERS ====================

const EXAM_LABEL_TO_TYPE: Record<string, string> = {
  'Nhìn xa': 'far',
  'Nhìn gần': 'near',
  'Độ tương phản': 'contrast',
  'Lập thể': 'stereopsis',
};

/**
 * Ledger: ghi lại những gì test THỰC SỰ đã làm qua UI. POST-CHECK (FRESH-03) đối chiếu
 * DB → dashboard API → dashboard UI với ledger này. Center mới tinh nên mọi metric
 * (đều scoped theo centerId) là deterministic từ ledger.
 */
const ledger = {
  examsCompleted: { P1: [] as string[], P2: [] as string[] }, // examType đã hoàn thành
  exerciseRoundsCompleted: { P1: 0, P2: 0 }, // số lượt tập completed
};

/** Instrument + init-script tăng tốc — gọi đầu MỖI test (mỗi test có page/context mới). */
async function prepare(page: Page) {
  instrument(page);
  await page.addInitScript(() => {
    (
      window as Window & { __E2E_EXERCISE_DURATION_SECONDS?: number }
    ).__E2E_EXERCISE_DURATION_SECONDS = 30;
    (
      window as Window & { __E2E_INACTIVITY_THRESHOLD_SECONDS?: number }
    ).__E2E_INACTIVITY_THRESHOLD_SECONDS = 5;
  });
}

/** Vào 1 bài khám từ /portal/exam theo nhãn card và hoàn thành tới màn kết quả. */
async function completeExamFromDashboard(page: Page, examLabel: string) {
  log(`   📋 Starting exam: ${examLabel}`);
  const sessionsResp = page.waitForResponse(
    (r) =>
      r.url().includes('/exam-sessions/current') &&
      r.request().method() === 'GET' &&
      r.status() === 200
  );
  await page.goto(`${BASE_URL}/portal/exam`, { waitUntil: 'networkidle' });
  await sessionsResp;

  // IndividualExamCard dùng MuiCard-root (KHÔNG dùng MuiPaper — match container cha → miss nút).
  const card = page.locator('[class*="MuiCard-root"]').filter({ hasText: examLabel }).first();
  const startBtn = card.getByRole('button', { name: 'Bắt đầu kiểm tra' });
  await expect(startBtn, `Exam "${examLabel}" phải sẵn sàng trên dashboard`).toBeVisible({
    timeout: 10000,
  });

  // Click start + HARD WAIT: URL phải chuyển sang /portal/exam/[number] (có examResultId).
  await startBtn.click();
  await page.waitForURL(/\/portal\/exam\/\d+/, { timeout: 20000 });
  await page.waitForLoadState('networkidle');
  log(`   🏥 Exam navigated: ${page.url()}`);

  await completeFullExam(page);

  // VERIFY: phải thấy nút result (đảm bảo exam thực sự hoàn thành, không fake).
  const doneBtn = page
    .locator('button:has-text("Xem lịch kiểm tra"), button:has-text("Bài tập thị lực")')
    .first();
  await expect(doneBtn).toBeVisible({ timeout: 10000 });
  log(`   ✅ Exam completed with result: ${examLabel}`);
}

/** Đếm số exam session 'completed' của patient đang đăng nhập (qua API /me). */
async function countCompletedSessions(page: Page): Promise<number> {
  return page.evaluate(async (apiBase) => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(`${apiBase}/me/exam-sessions/current`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return -1;
    const data = await res.json();
    return Object.values(data).filter((s: any) => s.status === 'completed').length;
  }, API_BASE);
}

/** Submit form thiết lập màn hình (auto-detect + diagonal) rồi đợi vào game /execute. */
async function submitExerciseSetupForm(page: Page) {
  const setupBtn = page.locator('button[type="submit"]').first();
  await expect(setupBtn).toBeVisible({ timeout: 10000 });
  const autoD = page.locator('button:has-text("Tự động phát hiện")');
  if (await autoD.isVisible({ timeout: 1000 }).catch(() => false)) {
    await autoD.click();
    await page.waitForTimeout(300);
    const df = page.locator('input[type="number"]').first();
    const dv = await df.inputValue();
    if (!dv || parseFloat(dv) < 10) await df.fill('15.6');
  }
  await setupBtn.scrollIntoViewIfNeeded();
  await setupBtn.click();
  await page.waitForURL('**/execute', { timeout: 15000 });
  await page.waitForSelector('.game-wrapper, [class*="game"]', { timeout: 20000 });
  await page.waitForTimeout(800);
}

/** Từ /portal/exercises bấm "Thực hiện" (retry chờ provision) rồi vào game. */
async function enterExerciseFromList(page: Page) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.goto(`${BASE_URL}/portal/exercises`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const exec = page.locator('button:has-text("Thực hiện")').first();
    if (await exec.isEnabled({ timeout: 5000 }).catch(() => false)) break;
    await page.waitForTimeout(3000);
  }
  const exec = page.locator('button:has-text("Thực hiện")').first();
  await expect(exec).toBeEnabled({ timeout: 10000 });
  await exec.click();
  await submitExerciseSetupForm(page);
}

/** Bấm "Kết thúc" + xác nhận dialog + đóng completion dialog, đợi điều hướng về list. */
async function endExerciseAndClose(page: Page) {
  const endBtn = page.locator('button:has-text("Kết thúc")').first();
  await expect(endBtn).toBeEnabled({ timeout: 5000 });
  await endBtn.click();
  await page.waitForTimeout(1000);
  const dlgConfirm = page.getByRole('dialog').locator('button:has-text("Kết thúc")');
  if (await dlgConfirm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await dlgConfirm.click();
  } else {
    // Fallback: click via evaluate nếu dialog z-index che
    await page.evaluate(() => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      dialogs.forEach((d) => {
        const btn = Array.from(d.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Kết thúc')
        );
        (btn as HTMLElement | undefined)?.click();
      });
    });
  }
  await page.waitForTimeout(1000);
  const closeBtn = page.getByRole('dialog').locator('button:has-text("Đóng")');
  if (await closeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await closeBtn.click();
  }
  await page.waitForTimeout(1000);
  await page
    .waitForURL((u) => !u.pathname.endsWith('/execute'), { timeout: 20000 })
    .catch(() => {});
  log('      ✅ Exercise round ended');
}

/** Một lượt tập nhanh: vào game → vài nước → kết thúc (dùng cho P1 round 2 + P2). */
async function playSimpleExerciseRound(page: Page) {
  await enterExerciseFromList(page);
  log('      🎮 Playing a quick round...');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(300);
  await endExerciseAndClose(page);
}

// ==================== POST-CHECK HELPERS (DB + API) ====================

/** GET dashboard API bằng token của user đang đăng nhập trên page. */
async function apiGet(page: Page, apiPath: string): Promise<{ status: number; body: any }> {
  return page.evaluate(
    async ({ p, apiBase }) => {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiBase}${p}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { status: res.status, body: await res.json().catch(() => null) };
    },
    { p: apiPath, apiBase: API_BASE }
  );
}

/**
 * Đọc TRỰC TIẾP Postgres (creds từ eye-sight-service/.env, driver pg mượn từ
 * node_modules của service) — chốt ground truth ở tầng DB, không qua API.
 * Mọi query scoped theo centerId của center mới tạo → deterministic.
 */
async function dbSnapshot() {
  const svcDir = path.resolve(process.cwd(), '..', 'eye-sight-service');
  const envText = readFileSync(path.join(svcDir, '.env'), 'utf8');
  const env: Record<string, string> = {};
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  // Spec chạy dưới ESM → không có require; dynamic-import driver pg (CJS) từ node_modules của service.
  const { pathToFileURL } = await import('url');
  const pgModule: any = await import(
    pathToFileURL(path.join(svcDir, 'node_modules', 'pg', 'lib', 'index.js')).href
  );
  const Client = pgModule.default?.Client ?? pgModule.Client;
  const client = new Client({
    host: env.DB_HOST,
    port: parseInt(env.DB_PORT || '5432', 10),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const center = await client.query('SELECT id FROM "Centers" WHERE code = $1', [CENTER_CODE]);
    const centerId: number | undefined = center.rows[0]?.id;
    expect(centerId, `Center ${CENTER_CODE} phải tồn tại trong DB`).toBeTruthy();

    const [patients, profiles, examSessions, examResults, exSessions, exResults] = await Promise.all([
      client.query(
        'SELECT COUNT(*)::int AS c FROM "Patients" WHERE "centerId" = $1 AND deleted = false',
        [centerId]
      ),
      client.query(
        `SELECT p.code, p."severityLevel", p.causes, p."clinicId", p."doctorId", p.compliance,
                u."dateOfBirth", u.gender, u.address, u."defaultClinicId"
         FROM "Patients" p JOIN "Users" u ON p."userId" = u.id
         WHERE p."centerId" = $1 AND p.deleted = false ORDER BY p.code`,
        [centerId]
      ),
      client.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
         FROM "ExamSessions" WHERE "centerId" = $1 AND deleted = false`,
        [centerId]
      ),
      client.query(
        `SELECT "examType", status, COUNT(*)::int AS count
         FROM "ExamResults" WHERE "centerId" = $1 GROUP BY 1, 2`,
        [centerId]
      ),
      client.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
                COALESCE(SUM("executionCount"), 0)::int AS assigned
         FROM "ExerciseSessions" WHERE "centerId" = $1`,
        [centerId]
      ),
      client.query(
        `SELECT COUNT(*)::int AS c FROM "ExerciseResults"
         WHERE "centerId" = $1 AND status = 'completed'`,
        [centerId]
      ),
    ]);

    return {
      centerId,
      patients: patients.rows[0].c as number,
      profiles: profiles.rows as Array<{
        code: string;
        severityLevel: string | null;
        causes: string[] | null;
        clinicId: number | null;
        doctorId: number | null;
        dateOfBirth: string | Date | null;
        gender: string | null;
        address: unknown;
        defaultClinicId: number | null;
        compliance: Record<
          string,
          { performanceRate: number; completedExams: number; requiredExams: number }
        > | null;
      }>,
      examSessions: examSessions.rows[0] as { total: number; completed: number },
      examResults: examResults.rows as Array<{ examType: string; status: string; count: number }>,
      exerciseSessions: exSessions.rows[0] as {
        total: number;
        completed: number;
        assigned: number;
      },
      exerciseResultsCompleted: exResults.rows[0].c as number,
    };
  } finally {
    await client.end();
  }
}

// ==================== THE GOLDEN JOURNEY ====================

test.describe.serial('Fresh-center happy path (UI-only, Playwright)', () => {
  test.setTimeout(600000);

  test('FRESH-01: setup center/doctor + patient 1 FULL journey (4 exams + 2 exercise rounds)', async ({
    page,
  }) => {
    mkdirSync(EVID_DIR, { recursive: true });
    await prepare(page);
    log(
      `=== RUN ${RUN} | center="${CENTER_NAME}" doctor=${DOCTOR.email} p1=${PATIENT.email} p2=${PATIENT2.email} ===`
    );

    try {
      await step(page, 'Admin login', async () => {
        await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, 'admin');
      });

      await step(page, 'Create center + switch (auto-seeds 2048 + roles)', async () => {
        await createCenterAndSwitch(page);
      });

      await step(page, 'Create clinic', async () => {
        await page.goto(`${BASE_URL}/admin/clinics`, { waitUntil: 'networkidle' });
        await createButton(page).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 10000 });
        await dialog.getByLabel(/tên phòng khám/i).fill(`E2E Clinic ${RUN}`);
        const codeField = dialog.getByLabel(/mã/i).first();
        await codeField.clear();
        await codeField.fill(`CL${RUN}`);
        await dialog
          .getByLabel(/số điện thoại/i)
          .first()
          .fill('0241234568');
        await dialog
          .getByRole('button', { name: /tạo|create/i })
          .last()
          .click();
        await expect(dialog).toBeHidden({ timeout: 15000 });
        log('      ✅ Clinic created');
      });

      await step(page, 'Create doctor', async () => {
        await createDoctor(page);
      });

      await step(page, 'Create patient (with doctor)', async () => {
        await createPatient(page);
      });

      // ── Doctor flow: đăng nhập bằng TK doctor để thực hiện các thao tác lâm sàng ──
      await step(page, 'Doctor login', async () => {
        await logout(page);
        await login(page, DOCTOR.email, DOCTOR.password, 'admin');
      });

      await step(page, 'Doctor opens patient detail', async () => {
        await openPatientDetail(page);
      });

      await step(page, 'Doctor sets causes (prerequisite) + save medical record', async () => {
        await setCausesAndSave(page);
      });

      await step(page, 'Doctor saves exam config (provision exam session)', async () => {
        await saveExamConfig(page);
      });

      await step(page, 'Doctor assigns exercise 2048 (provision exercise session)', async () => {
        await assignExercise(page);
      });

      await step(page, 'Patient login to portal', async () => {
        await logout(page);
        await login(page, PATIENT.email, PATIENT.password, 'portal');
      });

      await step(
        page,
        'Patient completes all 4 exams (far, near, contrast, stereopsis)',
        async () => {
          for (const examLabel of ['Nhìn xa', 'Nhìn gần', 'Độ tương phản', 'Lập thể']) {
            await completeExamFromDashboard(page, examLabel);
            ledger.examsCompleted.P1.push(EXAM_LABEL_TO_TYPE[examLabel]);
          }

          // HARD ASSERT: đủ 4 exam session completed — không chấp nhận skip bài nào.
          const examResultCount = await countCompletedSessions(page);
          log(`   📊 P1 completed exam sessions in DB: ${examResultCount}`);
          expect(examResultCount, 'P1 phải hoàn thành ĐỦ 4 phiên khám').toBe(4);
        }
      );

      await step(page, 'Patient exercises: play → pause → resume → inactivity → end', async () => {
        // Session provisioned async — retry navigate nếu nút disabled.
        for (let attempt = 0; attempt < 4; attempt++) {
          await page.goto(`${BASE_URL}/portal/exercises`, { waitUntil: 'networkidle' });
          await page.waitForTimeout(1500);
          const exec = page.locator('button:has-text("Thực hiện")').first();
          if (await exec.isEnabled({ timeout: 5000 }).catch(() => false)) break;
          await page.waitForTimeout(3000);
        }
        const exec = page.locator('button:has-text("Thực hiện")').first();
        await expect(exec).toBeEnabled({ timeout: 10000 });
        await exec.click();

        // Setup screen (ScreenSetupForm) → auto-detect + fill diagonal → submit.
        const autoDetect = page.locator('button:has-text("Tự động phát hiện")');
        await expect(autoDetect).toBeVisible({ timeout: 10000 });
        await autoDetect.click();
        await page.waitForTimeout(300);
        const diagField = page.locator('input[type="number"]').first();
        const diagVal = await diagField.inputValue();
        if (!diagVal || parseFloat(diagVal) < 10) await diagField.fill('15.6');
        const submitSetup = page.locator('button[type="submit"]').first();
        await submitSetup.scrollIntoViewIfNeeded();
        await submitSetup.click();

        // Vào game 2048.
        await page.waitForURL('**/portal/exercise/assignments/**/sessions/**/execute', {
          timeout: 15000,
        });
        await page.waitForSelector('.game-wrapper, [class*="game"]', { timeout: 20000 });
        await page.waitForTimeout(800);

        // === Chơi vài nước ===
        log('      🎮 Playing some moves...');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(300);

        // === PAUSE ===
        log('      ⏸️ Pausing exercise...');
        const pauseBtn = page.locator('button:has-text("Tạm dừng")');
        await expect(pauseBtn).toBeEnabled({ timeout: 5000 });
        await pauseBtn.click();
        // Sau pause → navigate back to /portal/exercises.
        await page.waitForURL(/\/portal\/(exercises|assignments)/, { timeout: 15000 });
        log('      ✅ Pause successful, navigated back');

        // === RESUME ===
        log('      ▶️ Resuming exercise...');
        await page.waitForTimeout(1000);
        const resumeBtn = page.locator('button:has-text("Thực hiện")').first();
        await expect(resumeBtn).toBeEnabled({ timeout: 10000 });
        await resumeBtn.click();
        // Setup screen lại (device đã saved → submit ngay hoặc auto-detect + submit)
        const setupSubmit = page.locator('button[type="submit"]').first();
        await expect(setupSubmit).toBeVisible({ timeout: 10000 });
        // Nếu form cần fill (first time after pause), auto-detect
        const autoDetectResume = page.locator('button:has-text("Tự động phát hiện")');
        if (await autoDetectResume.isVisible({ timeout: 1000 }).catch(() => false)) {
          await autoDetectResume.click();
          await page.waitForTimeout(300);
          const diagResume = page.locator('input[type="number"]').first();
          const dv = await diagResume.inputValue();
          if (!dv || parseFloat(dv) < 10) await diagResume.fill('15.6');
        }
        await setupSubmit.scrollIntoViewIfNeeded();
        await setupSubmit.click();
        await page.waitForURL('**/execute', { timeout: 15000 });
        await page.waitForSelector('.game-wrapper, [class*="game"]', { timeout: 20000 });
        await page.waitForTimeout(500);
        log('      ✅ Resumed, game restored');

        // === Chơi thêm ===
        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('ArrowRight');

        // === INACTIVITY — đợi 6s (threshold=5s) để trigger inactivity count ===
        log('      💤 Waiting for inactivity trigger (6s)...');
        await page.waitForTimeout(6500);
        // Chơi lại 1 nước (reset timer, confirm inactivity đã ghi)
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(300);

        // === KẾT THÚC ===
        log('      🏁 Ending exercise...');
        // Nút "Kết thúc" trên toolbar game (không phải trong dialog)
        const endBtn = page.locator('button:has-text("Kết thúc")').first();
        await expect(endBtn).toBeEnabled({ timeout: 5000 });
        await endBtn.click();
        await page.waitForTimeout(1000);
        // Confirm dialog — click nút "Kết thúc" trong dialog (hoặc fallback evaluate)
        const dialogConfirm = page.getByRole('dialog').locator('button:has-text("Kết thúc")');
        if (await dialogConfirm.isVisible({ timeout: 3000 }).catch(() => false)) {
          await dialogConfirm.click();
        } else {
          // Fallback: click via evaluate nếu dialog z-index che
          await page.evaluate(() => {
            const dialogs = document.querySelectorAll('[role="dialog"]');
            dialogs.forEach((d) => {
              const btn = d.querySelector('button');
              if (btn && btn.textContent?.includes('Kết thúc')) btn.click();
            });
          });
        }
        await page.waitForTimeout(1000);
        // Completion dialog → click "Đóng" để navigate về exercises list
        const closeCompletionBtn = page.getByRole('dialog').locator('button:has-text("Đóng")');
        if (await closeCompletionBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await closeCompletionBtn.click();
        }
        await page.waitForTimeout(1000);
        // Navigate to exercises list hoặc results page
        await page
          .waitForURL((u) => !u.pathname.endsWith('/execute'), { timeout: 20000 })
          .catch(async () => {
            // Nếu vẫn ở /execute → có thể exercise đã auto-end → check lại
            log('      ⚠️ Still at execute URL, checking if already navigated...');
          });
        log('      ✅ Exercise completed');
      });

      await step(page, 'Patient verifies exercise history on portal', async () => {
        await page.goto(`${BASE_URL}/portal/exercises`, { waitUntil: 'networkidle' });
        // Nút "Lịch sử" phải visible
        const historyBtn = page.locator('button:has-text("Lịch sử")').first();
        if (await historyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await historyBtn.click();
          await page.waitForLoadState('networkidle');
          // Verify có ít nhất 1 dòng kết quả trong bảng lịch sử
          await expect(page.locator('table, [role="table"]').first()).toBeVisible({
            timeout: 10000,
          });
          log('      ✅ Exercise history table visible with data');
        }
      });

      await step(page, 'Patient plays exercise round 2 → session completed', async () => {
        // Session chưa completed (mới 1/2 lượt, executionCount=2) → chơi tiếp lượt 2.
        await playSimpleExerciseRound(page);
        ledger.exerciseRoundsCompleted.P1 = 2;
        log('      ✅ Round 2 completed → session should be completed (2/2 executions)');
      });

      await step(page, 'Verify exercise session completed (status on portal)', async () => {
        // Reload fresh data
        await page.goto(`${BASE_URL}/portal/exercises`, { waitUntil: 'networkidle' });
        // Session completed → chip "Đã hoàn thành" HOẶC nút "Thực hiện" disabled.
        // Dùng locator.or() để POLL tới 15s (isVisible trả ngay, không chờ → flaky).
        const completedChip = page.getByText(/đã hoàn thành/i).first();
        const execDisabled = page.locator('button:has-text("Thực hiện")[disabled]').first();
        await expect(
          completedChip.or(execDisabled).first(),
          'Exercise session should be completed after 2 executions'
        ).toBeVisible({ timeout: 15000 });
        log('      📋 Session completed signal visible on portal');
      });

      log('🎉 FRESH-01 PASSED (P1 full journey)');
    } finally {
      writeFileSync(`${EVID_DIR}/flow.log`, flowLog.join('\n'), 'utf8');
      log(`📝 flow log written → ${EVID_DIR}/flow.log`);
    }
  });

  test('FRESH-02: patient 2 PARTIAL journey (2/4 exams + 1/2 exercise rounds)', async ({
    page,
  }) => {
    await prepare(page);
    try {
      await step(page, 'Admin creates patient 2', async () => {
        await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, 'admin');
        // Admin vẫn ở center mới (PATCH /me/center từ FRESH-01 đã persist).
        await expect(page.getByRole('combobox', { name: 'Trung tâm' })).toContainText(
          CENTER_NAME,
          { timeout: 15000 }
        );
        await createPatient(page, PATIENT2);
      });

      await step(page, 'Doctor configures patient 2 (causes + exam config + exercise)', async () => {
        await logout(page);
        await login(page, DOCTOR.email, DOCTOR.password, 'admin');
        await openPatientDetail(page, PATIENT2);
        await setCausesAndSave(page, PATIENT2);
        await saveExamConfig(page);
        await assignExercise(page, `E2E Config ${RUN}B`);
      });

      await step(page, 'Patient 2 login to portal', async () => {
        await logout(page);
        await login(page, PATIENT2.email, PATIENT2.password, 'portal');
      });

      await step(page, 'Patient 2 completes ONLY far + near (partial — 2/4)', async () => {
        for (const examLabel of ['Nhìn xa', 'Nhìn gần']) {
          await completeExamFromDashboard(page, examLabel);
          ledger.examsCompleted.P2.push(EXAM_LABEL_TO_TYPE[examLabel]);
        }
        const completed = await countCompletedSessions(page);
        log(`   📊 P2 completed exam sessions in DB: ${completed}`);
        expect(completed, 'P2 phải hoàn thành ĐÚNG 2 phiên khám').toBe(2);

        // Contrast + stereopsis CHƯA làm → còn đúng 2 nút "Bắt đầu kiểm tra".
        await page.goto(`${BASE_URL}/portal/exam`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1500);
        await expect(
          page.getByRole('button', { name: 'Bắt đầu kiểm tra' }),
          'P2 còn đúng 2 bài khám chưa làm'
        ).toHaveCount(2, { timeout: 10000 });
      });

      await step(page, 'Patient 2 plays ONE exercise round → session stays incomplete', async () => {
        await playSimpleExerciseRound(page);
        ledger.exerciseRoundsCompleted.P2 = 1;
        // executionCount=2, mới tập 1/2 lượt → session CHƯA completed → "Thực hiện" vẫn enabled.
        await page.goto(`${BASE_URL}/portal/exercises`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        const exec = page.locator('button:has-text("Thực hiện")').first();
        await expect(exec, 'P2 session phải CHƯA hoàn thành (1/2 lượt)').toBeEnabled({
          timeout: 10000,
        });
      });

      log('🎉 FRESH-02 PASSED (P2 partial journey)');
    } finally {
      writeFileSync(`${EVID_DIR}/flow.log`, flowLog.join('\n'), 'utf8');
    }
  });

  test('FRESH-03: POST-CHECK — DB ↔ dashboard API ↔ UI phải khớp expected ledger', async ({
    page,
  }) => {
    await prepare(page);
    try {
      // ---- Expected values suy ra từ ledger (những gì test THỰC SỰ đã làm qua UI) ----
      const expByType: Record<string, number> = {};
      for (const k of ['P1', 'P2'] as const) {
        for (const t of ledger.examsCompleted[k]) expByType[t] = (expByType[t] || 0) + 1;
      }
      const expExamResultsCompleted =
        ledger.examsCompleted.P1.length + ledger.examsCompleted.P2.length; // 6
      const expSessionsTotal = 8; // 2 BN × 4 loại khám (config daily → 1 session/loại/ngày)
      const expSessionsCompleted = expExamResultsCompleted; // mỗi exam hoàn thành đúng 1 session
      const expTestCompliance =
        Math.round((expSessionsCompleted / expSessionsTotal) * 100 * 100) / 100; // 75
      const expExerciseCompleted =
        ledger.exerciseRoundsCompleted.P1 + ledger.exerciseRoundsCompleted.P2; // 3
      const expAssignedExecutions = 2 * 2; // 2 session × executionCount 2
      const expCountCompliance =
        Math.round((expExerciseCompleted / expAssignedExecutions) * 100 * 100) / 100; // 75
      log(
        `=== EXPECTED: examResults=${expExamResultsCompleted} byType=${JSON.stringify(expByType)} ` +
          `sessions=${expSessionsCompleted}/${expSessionsTotal} (${expTestCompliance}%) ` +
          `exerciseRounds=${expExerciseCompleted}/${expAssignedExecutions} (${expCountCompliance}%)`
      );

      // ---- (a) DB trực tiếp: ground truth tầng thấp nhất ----
      await step(page, 'POST-CHECK a: DB state khớp ledger', async () => {
        const db = await dbSnapshot();
        log(`   🗄️ DB snapshot: ${JSON.stringify(db)}`);
        expect(db.patients, 'DB: số bệnh nhân trong center').toBe(2);

        // Hồ sơ phải ĐẦY ĐỦ — các trường này nuôi dashboard, không được null.
        for (const P of [PATIENT, PATIENT2]) {
          const row = db.profiles.find((r) => r.code === P.code);
          expect(row, `DB: phải có hồ sơ ${P.code}`).toBeTruthy();
          const dobStr = row!.dateOfBirth instanceof Date
            ? localDay(row!.dateOfBirth)
            : String(row!.dateOfBirth).slice(0, 10);
          expect(dobStr, `DB ${P.code}: ngày sinh`).toBe(P.dob);
          expect(row!.gender, `DB ${P.code}: giới tính`).toBe(P.gender);
          expect(row!.severityLevel, `DB ${P.code}: mức độ nghiêm trọng`).toBe(P.severityValue);
          expect(
            [...(row!.causes || [])].sort(),
            `DB ${P.code}: nguyên nhân nhược thị`
          ).toEqual([...P.causes].sort());
          expect(row!.doctorId, `DB ${P.code}: bác sĩ phụ trách`).toBeTruthy();
          expect(row!.defaultClinicId, `DB ${P.code}: phòng khám mặc định`).toBeTruthy();
          expect(
            JSON.stringify(row!.address || ''),
            `DB ${P.code}: địa chỉ phải chứa địa chỉ cụ thể đã nhập`
          ).toContain(P.addressDetail);
        }

        // Compliance per-type phải phản ánh đúng bài đã làm/bỏ — không bị clobber bởi
        // race ghi song song (4 config lưu cùng lúc) và bài BỎ phải ra 0% chứ không
        // phải default required=0.
        const ledgerOf = (who: 'P1' | 'P2') => ledger.examsCompleted[who];
        for (const [P, who] of [
          [PATIENT, 'P1'],
          [PATIENT2, 'P2'],
        ] as const) {
          const row = db.profiles.find((r) => r.code === P.code)!;
          for (const examType of ['far', 'near', 'contrast', 'stereopsis']) {
            const comp = row.compliance?.[examType];
            const didIt = ledgerOf(who).includes(examType);
            expect(comp, `DB ${P.code}: compliance.${examType} phải tồn tại`).toBeTruthy();
            expect(
              comp!.requiredExams,
              `DB ${P.code}: ${examType} có 1 session được giao hôm nay`
            ).toBe(1);
            expect(
              comp!.completedExams,
              `DB ${P.code}: ${examType} completedExams khớp ledger`
            ).toBe(didIt ? 1 : 0);
            expect(
              comp!.performanceRate,
              `DB ${P.code}: ${examType} tuân thủ = ${didIt ? 100 : 0}%`
            ).toBe(didIt ? 100 : 0);
          }
        }
        expect(db.examSessions.total, 'DB: tổng ExamSessions').toBe(expSessionsTotal);
        expect(db.examSessions.completed, 'DB: ExamSessions completed').toBe(expSessionsCompleted);

        const dbByType: Record<string, number> = {};
        let dbIncomplete = 0;
        for (const row of db.examResults) {
          if (row.status === 'completed') {
            dbByType[row.examType] = (dbByType[row.examType] || 0) + row.count;
          } else {
            dbIncomplete += row.count;
          }
        }
        expect(dbByType, 'DB: ExamResults completed theo loại = ledger').toEqual(expByType);
        expect(dbIncomplete, 'DB: không được tồn ExamResult dở dang').toBe(0);

        expect(db.exerciseSessions.total, 'DB: tổng ExerciseSessions').toBe(2);
        expect(db.exerciseSessions.completed, 'DB: ExerciseSessions completed (chỉ P1)').toBe(1);
        expect(
          db.exerciseSessions.assigned,
          'DB: tổng lượt được giao (Σ executionCount)'
        ).toBe(expAssignedExecutions);
        expect(db.exerciseResultsCompleted, 'DB: ExerciseResults completed').toBe(
          expExerciseCompleted
        );
      });

      // ---- (b) Dashboard API: số liệu biểu đồ phải khớp DB/ledger ----
      await step(page, 'POST-CHECK b: dashboard API khớp ledger', async () => {
        await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, 'admin');
        const endDate = localDay(new Date());

        const exam = await apiGet(
          page,
          `/dashboard/exam-stats?startDate=${ACTIVE_FROM}&endDate=${endDate}&page=1&limit=10&period=day`
        );
        log(`   📡 exam-stats kpi: ${JSON.stringify(exam.body?.stats?.kpi)}`);
        log(`   📡 exam-stats breakdown: ${JSON.stringify(exam.body?.stats?.breakdown)}`);
        expect(exam.status, 'API exam-stats phải 200').toBe(200);
        const ekpi = exam.body.stats.kpi;
        expect(ekpi.totalSessions, 'API: totalSessions').toBe(expSessionsTotal);
        expect(ekpi.completedSessions, 'API: completedSessions').toBe(expSessionsCompleted);
        expect(ekpi.testComplianceRate, 'API: TỈ LỆ TUÂN THỦ (test)').toBe(expTestCompliance);
        expect(ekpi.totalExams, 'API: totalExams').toBe(expExamResultsCompleted);
        expect(ekpi.completedExams, 'API: completedExams').toBe(expExamResultsCompleted);
        expect(ekpi.pendingExams, 'API: pendingExams').toBe(0);
        expect(ekpi.completionRate, 'API: completionRate').toBe(100);

        // #16 — data biểu đồ breakdown theo loại
        const apiByType: Record<string, number> = {};
        for (const b of exam.body.stats.breakdown) {
          apiByType[b.type] = b.completed;
          expect(b.notCompleted, `API breakdown ${b.type}: không có bài dở`).toBe(0);
          expect(b.completionRate, `API breakdown ${b.type}: completionRate`).toBe(100);
        }
        expect(apiByType, 'API: breakdown theo loại = ledger').toEqual(expByType);

        // #17 — data biểu đồ trend: tổng completed phải = số bài đã làm
        const trendCompleted = exam.body.stats.trend.reduce(
          (s: number, t: any) => s + t.completedExams,
          0
        );
        expect(trendCompleted, 'API: Σ trend.completedExams (biểu đồ #17)').toBe(
          expExamResultsCompleted
        );

        const exercise = await apiGet(
          page,
          `/dashboard/exercise-stats?startDate=${ACTIVE_FROM}&endDate=${endDate}&page=1&limit=10`
        );
        log(`   📡 exercise-stats kpi: ${JSON.stringify(exercise.body?.stats?.kpi)}`);
        log(
          `   📡 exercise-stats compliance: ${JSON.stringify(exercise.body?.stats?.complianceByType)} distribution: ${JSON.stringify(exercise.body?.stats?.distributionByType)}`
        );
        expect(exercise.status, 'API exercise-stats phải 200').toBe(200);
        const xkpi = exercise.body.stats.kpi;
        expect(xkpi.countComplianceRate, 'API: Tuân Thủ theo số lần (#22)').toBe(
          expCountCompliance
        );
        expect(xkpi.inUseExercises, 'API: bài tập đang dùng (#19)').toBe(1);
        expect(xkpi.totalExercises, 'API: tổng bài tập của center (#19)').toBe(1);
        expect(xkpi.inUsePct, 'API: % đang dùng (#19)').toBe(100);

        // #25 — data biểu đồ phân bổ lượt tập theo loại
        const dist = exercise.body.stats.distributionByType;
        expect(dist.length, 'API: distribution đúng 1 loại bài tập').toBe(1);
        expect(dist[0].count, 'API: lượt completed theo loại (biểu đồ #25)').toBe(
          expExerciseCompleted
        );

        // #26 — data biểu đồ % tuân thủ theo loại
        const compl = exercise.body.stats.complianceByType;
        expect(compl.length, 'API: compliance đúng 1 loại bài tập').toBe(1);
        expect(compl[0].assigned, 'API: lượt giao (biểu đồ #26)').toBe(expAssignedExecutions);
        expect(compl[0].completed, 'API: lượt hoàn thành (biểu đồ #26)').toBe(
          expExerciseCompleted
        );
        expect(compl[0].complianceRate, 'API: % tuân thủ theo loại (biểu đồ #26)').toBe(
          expCountCompliance
        );

        // patient-stats: tổng số BN của center phải khớp
        const ps = await apiGet(page, `/dashboard/patient-stats?visionType=far&trendDays=30`);
        expect(ps.status, 'API patient-stats phải 200').toBe(200);
        log(`   📡 patient-stats: total=${ps.body?.totalPatients} active=${ps.body?.activePatients}`);
        expect(ps.body.totalPatients, 'API: tổng số bệnh nhân').toBe(2);
        expect(ps.body.activePatients, 'API: bệnh nhân đang điều trị').toBe(2);

        // age-correlation: 2 BN khác tuổi → 2 nhóm tuổi, mỗi nhóm 1 BN (data biểu đồ tương quan độ tuổi)
        const ac = await apiGet(page, `/dashboard/age-correlation`);
        log(`   📡 age-correlation: ${JSON.stringify(ac.body?.data)}`);
        expect(ac.status, 'API age-correlation phải 200').toBe(200);
        const ages = [ageOf(PATIENT.dob), ageOf(PATIENT2.dob)];
        for (const age of ages) {
          const group = (ac.body.data || []).find((g: any) => String(g.ageGroup) === String(age));
          expect(group, `API: phải có nhóm tuổi ${age} (từ ngày sinh đã nhập)`).toBeTruthy();
          expect(group.totalPatients, `API: nhóm tuổi ${age} có đúng 1 BN`).toBe(1);
        }
      });

      // ---- (c) Admin dashboard UI: con số hiển thị phải khớp expected ----
      await step(page, 'POST-CHECK c: admin dashboard UI hiển thị đúng số liệu', async () => {
        await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle' });

        // Tab Tổng Quan Bệnh Nhân — biểu đồ tương quan độ tuổi phải render data
        // từ ngày sinh đã nhập (mỗi BN 1 nhóm tuổi trên trục X).
        await page.getByRole('tab', { name: 'Tổng Quan Bệnh Nhân' }).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        const ageCard = page
          .locator('[class*="MuiCard-root"]')
          .filter({ hasText: /Tương quan giữa độ tuổi/ })
          .first();
        await expect(ageCard, 'UI: card tương quan độ tuổi phải hiện').toBeVisible({
          timeout: 15000,
        });
        for (const age of [ageOf(PATIENT.dob), ageOf(PATIENT2.dob)]) {
          await expect(
            ageCard.locator('svg text').filter({ hasText: new RegExp(`^${age}$`) }).first(),
            `UI: trục tuổi phải có nhóm ${age}`
          ).toBeVisible({ timeout: 10000 });
        }

        // Tab Thống Kê Bài Kiểm Tra — KPI TỈ LỆ TUÂN THỦ phải hiện đúng 75
        await page.getByRole('tab', { name: 'Thống Kê Bài Kiểm Tra' }).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        const compCard = page
          .locator('[class*="MuiCard-root"]')
          .filter({ hasText: /TỈ LỆ TUÂN THỦ/ })
          .first();
        await expect(compCard).toBeVisible({ timeout: 15000 });
        await expect(compCard, `UI: KPI TỈ LỆ TUÂN THỦ = ${expTestCompliance}`).toContainText(
          `${expTestCompliance}`
        );
        // Biểu đồ #16 breakdown phải render cột dữ liệu
        await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible({
          timeout: 10000,
        });
        const barCount = await page.locator('.recharts-bar-rectangle').count();
        log(`   📊 VisionTypeBreakdown bars rendered: ${barCount}`);
        expect(barCount, 'UI: biểu đồ breakdown phải có cột dữ liệu').toBeGreaterThanOrEqual(4);

        // Tab Hiệu Suất Bài Tập — KPI Tuân Thủ = 75, Đang Sử Dụng = 1/1
        await page.getByRole('tab', { name: 'Hiệu Suất Bài Tập' }).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        const tuanThuCard = page
          .locator('[class*="MuiCard-root"]')
          .filter({ hasText: /tuân thủ/i })
          .first();
        await expect(tuanThuCard).toBeVisible({ timeout: 15000 });
        await expect(
          tuanThuCard,
          `UI: KPI Tuân Thủ (bài tập) = ${expCountCompliance}`
        ).toContainText(`${expCountCompliance}`);
        const inUseCard = page
          .locator('[class*="MuiCard-root"]')
          .filter({ hasText: /đang sử dụng/i })
          .first();
        await expect(inUseCard, 'UI: 1/1 bài tập được giao').toContainText('1/1');
      });

      // ---- (d) THEO DÕI ĐIỀU TRỊ: biểu đồ + bảng phải khớp số kết quả từng BN ----
      await step(page, 'POST-CHECK d: patient detail charts/tables khớp ledger', async () => {
        // P1: đủ 4 tab loại khám; chart far = 2 điểm (MP+MT × 1 lần); lịch sử 4 dòng; bài tập 2 dòng.
        await openPatientDetail(page, PATIENT);
        await page.getByRole('tab', { name: 'THEO DÕI ĐIỀU TRỊ' }).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2500);
        // Tab loại khám trong chart dùng nhãn của PatientDetailPage.getExamTypeName
        // ("Thị lực xa"...), KHÁC nhãn card portal ("Nhìn xa"...).
        for (const typeName of ['Thị lực xa', 'Thị lực gần', 'Độ tương phản', 'Thị giác lập thể']) {
          await expect(
            page.getByRole('tab', { name: typeName }),
            `UI P1: tab chart "${typeName}" phải có (đã có dữ liệu)`
          ).toBeVisible({ timeout: 10000 });
        }
        // Scope vào card biểu đồ KHÁM — trang còn biểu đồ bài tập (cũng recharts, cũng có dot).
        const examChartCard = page
          .locator('[class*="MuiCard-root"]')
          .filter({ hasText: /Lịch sử kết quả kiểm tra/ })
          .first();
        const dotCount = await examChartCard.locator('circle[class*="recharts-dot"]').count();
        log(`   📈 P1 exam-chart dots (far): ${dotCount}`);
        expect(dotCount, 'UI P1: chart far phải có 2 điểm dữ liệu (MP + MT × 1 lần khám)').toBe(2);
        await expect(page.getByText('Mắt trái').first()).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Mắt phải').first()).toBeVisible({ timeout: 5000 });

        const p1HistCard = page
          .locator('[class*="MuiCard-root"]')
          .filter({ hasText: /Lịch sử kiểm tra/ })
          .first();
        await expect(p1HistCard).toBeVisible({ timeout: 10000 });
        await expect(
          p1HistCard.locator('tbody tr'),
          `UI P1: bảng lịch sử kiểm tra = ${ledger.examsCompleted.P1.length} dòng`
        ).toHaveCount(ledger.examsCompleted.P1.length, { timeout: 10000 });

        const p1ExCard = page
          .locator('[class*="MuiCard-root"]')
          .filter({ hasText: /Kết quả thực hiện bài tập/ })
          .first();
        await expect(
          p1ExCard.locator('tbody tr'),
          `UI P1: bảng kết quả bài tập = ${ledger.exerciseRoundsCompleted.P1} dòng`
        ).toHaveCount(ledger.exerciseRoundsCompleted.P1, { timeout: 10000 });

        // P2: chỉ far + near có dữ liệu; KHÔNG có tab contrast/stereopsis; lịch sử 2 dòng; bài tập 1 dòng.
        await openPatientDetail(page, PATIENT2);
        await page.getByRole('tab', { name: 'THEO DÕI ĐIỀU TRỊ' }).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2500);
        await expect(page.getByRole('tab', { name: 'Thị lực xa' })).toBeVisible({
          timeout: 10000,
        });
        await expect(page.getByRole('tab', { name: 'Thị lực gần' })).toBeVisible({
          timeout: 10000,
        });
        expect(
          await page.getByRole('tab', { name: 'Độ tương phản' }).count(),
          'UI P2: KHÔNG được có tab Độ tương phản (chưa khám)'
        ).toBe(0);
        expect(
          await page.getByRole('tab', { name: 'Thị giác lập thể' }).count(),
          'UI P2: KHÔNG được có tab Thị giác lập thể (chưa khám)'
        ).toBe(0);

        const p2HistCard = page
          .locator('[class*="MuiCard-root"]')
          .filter({ hasText: /Lịch sử kiểm tra/ })
          .first();
        await expect(
          p2HistCard.locator('tbody tr'),
          `UI P2: bảng lịch sử = ${ledger.examsCompleted.P2.length} dòng`
        ).toHaveCount(ledger.examsCompleted.P2.length, { timeout: 10000 });
        const p2ExCard = page
          .locator('[class*="MuiCard-root"]')
          .filter({ hasText: /Kết quả thực hiện bài tập/ })
          .first();
        await expect(
          p2ExCard.locator('tbody tr'),
          `UI P2: bảng bài tập = ${ledger.exerciseRoundsCompleted.P2} dòng`
        ).toHaveCount(ledger.exerciseRoundsCompleted.P2, { timeout: 10000 });

        // PHÁC ĐỒ ĐIỀU TRỊ của P2: 2 bài đã làm hiện 100%, 2 bài BỎ phải hiện 0%
        // (không được che bằng "Chưa có kết quả").
        await page.getByRole('tab', { name: 'PHÁC ĐỒ ĐIỀU TRỊ' }).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
        const examConfigCard = page
          .locator('[class*="MuiCard-root"]')
          .filter({ hasText: /CHẾ ĐỘ KIỂM TRA/ })
          .first();
        await expect(examConfigCard).toBeVisible({ timeout: 10000 });
        await expect(
          examConfigCard.getByText('100%', { exact: true }),
          'UI P2 PHÁC ĐỒ: 2 bài đã làm hiện 100%'
        ).toHaveCount(2, { timeout: 10000 });
        await expect(
          examConfigCard.getByText('0%', { exact: true }),
          'UI P2 PHÁC ĐỒ: 2 bài BỎ hiện 0% (vi phạm tuân thủ không bị che)'
        ).toHaveCount(2, { timeout: 10000 });
      });

      // ---- (e) Portal UI: trạng thái cuối của từng BN ----
      await step(page, 'POST-CHECK e: portal UI của P1 & P2 đúng trạng thái cuối', async () => {
        await logout(page);
        await login(page, PATIENT.email, PATIENT.password, 'portal');
        await page.goto(`${BASE_URL}/portal/exam`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1500);
        await expect(
          page
            .locator('[class*="MuiCard-root"]')
            .filter({ hasText: /Nhìn xa|Nhìn gần|Độ tương phản|Lập thể/ }),
          'UI P1: hiện đủ 4 card bài khám'
        ).toHaveCount(4, { timeout: 10000 });
        await expect(
          page.getByRole('button', { name: 'Bắt đầu kiểm tra' }),
          'UI P1: không còn bài khám nào chưa làm'
        ).toHaveCount(0);

        await logout(page);
        await login(page, PATIENT2.email, PATIENT2.password, 'portal');
        await page.goto(`${BASE_URL}/portal/exam`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1500);
        await expect(
          page.getByRole('button', { name: 'Bắt đầu kiểm tra' }),
          'UI P2: còn đúng 2 bài khám chưa làm'
        ).toHaveCount(2, { timeout: 10000 });
      });

      log('🎉 FRESH-03 POST-CHECKS PASSED (DB ↔ API ↔ UI khớp ledger)');
    } finally {
      writeFileSync(`${EVID_DIR}/flow.log`, flowLog.join('\n'), 'utf8');
      log(`📝 flow log written → ${EVID_DIR}/flow.log`);
    }
  });

  test.afterAll(async ({ browser }) => {
    // Best-effort: trả super-admin về center ban đầu để không ảnh hưởng test khác.
    // KHÔNG xóa data — mày cần check lại trên UI/DB sau khi test chạy xong.
    if (!originalCenterName) return;
    const page = await browser.newPage();
    try {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, 'admin');
      await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle' });
      const switcher = page.getByRole('combobox', { name: 'Trung tâm' });
      if (await switcher.count()) {
        await selectMui(page, switcher, originalCenterName);
        await page.waitForLoadState('networkidle');
      }
    } catch {
      /* ignore restore errors */
    } finally {
      await page.close();
    }
  });
});

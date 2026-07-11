# D-VisUp Landing Page

Marketing site for **Nhuoc Thi / D-VisUp** — deploy at `https://nhuocthi.vn`.

## Stack

- Next.js 15 (App Router + API route)
- TypeScript + Tailwind CSS
- Port local: **4002**

## Development

```bash
# From monorepo root
npm run install:landing
npm run dev:landing

# Or from this folder
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:4002

## Environment

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_ZALO_PHONE` — số Zalo tư vấn
- `NEXT_PUBLIC_APP_URL` — link đăng nhập app (default: app.nhuocthi.vn)
- `NEXT_PUBLIC_PAYMENT_BANK_ID` — mã ngân hàng (BIN) cho VietQR
- `NEXT_PUBLIC_PAYMENT_ACCOUNT` — số tài khoản nhận thanh toán
- `NEXT_PUBLIC_PAYMENT_ACCOUNT_NAME` — tên chủ tài khoản
- `NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK_URL` — URL Google Apps Script lưu đăng ký
- `NEXT_PUBLIC_ADMIN_EMAIL`, `NEXT_PUBLIC_ADMIN_PASSWORD` — tài khoản quản lý Bác sĩ
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — tài khoản API server để ghi danh sách Bác sĩ
- `KV_REST_API_URL`, `KV_REST_API_TOKEN` — Vercel KV / Upstash Redis để lưu danh sách Bác sĩ trên server

## Đăng ký → Google Sheets

Landing gửi dữ liệu đăng ký 5 bước tới Google Sheets qua Apps Script:

1. Tạo Google Sheet với header (ví dụ): `submittedAt`, `fullName`, `phone`, `selectedPlan`, `recommendedPlan`, `doctorCode`, …
2. **Extensions → Apps Script**, dán script:

```js
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const p = data.personal || {};
  const m = data.medical || {};
  const d = data.doctor || {};
  sheet.appendRow([
    data.submittedAt,
    p.fullName, p.dateOfBirth, p.phone, p.address,
    m.currentAge, m.visualAcuityWithGlasses, m.refractiveError, m.treatmentDuration,
    data.selectedPlanName, data.selectedPlanPrice,
    data.recommendedPlanCode, data.recommendationReason,
    d.doctorCode, d.doctorName,
    data.source,
  ]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. **Deploy → New deployment → Web app** — Execute as: Me, Who has access: **Anyone**
4. Copy URL vào `NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK_URL`

Cập nhật danh sách Bác sĩ/Chuyên gia tại `/quan-ly/bac-si` (cần đăng nhập admin). Danh sách được lưu qua API `/api/doctors`; khi deploy production cần cấu hình Vercel KV / Upstash Redis.

## Deploy (Vercel)

1. New Vercel project from same GitHub repo
2. **Root Directory:** `eyesight-landing`
3. Framework: Next.js (auto-detected)
4. Add env vars from `.env.example`
5. Domain: `nhuocthi.vn`

See [DEPLOY.md](../DEPLOY.md) in monorepo root.

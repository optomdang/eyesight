# Eye-Sight Admin Frontend

Frontend cho hệ thống Eye-Sight, bao gồm:
- Khu vực quản trị tại `/admin`
- Khu vực bệnh nhân (portal) tại `/portal`

README này tập trung vào cách chạy local, cấu hình môi trường, test, build và deploy.

## 1. Tech Stack

- React 19 + TypeScript
- Vite 6
- Material UI 7
- React Router 7
- React Hook Form + Yup
- Vitest + Testing Library
- Playwright (E2E)

## 2. Yêu cầu môi trường

- Node.js 20+
- npm
- Backend `eye-sight-service` đang chạy (mặc định: `http://localhost:4000/api/v1`)

## 3. Cài đặt và chạy local

```bash
npm install
cp .env.example .env
npm run dev
```

Mặc định app chạy tại `http://localhost:4001`.

## 4. Scripts chính

```bash
npm run dev              # chạy local
npm run build            # build production ra dist/
npm run preview          # chạy thử bản build
npm run lint             # eslint
npm run test             # unit/integration tests
npm run test:coverage    # test + coverage
npm run test:e2e         # e2e tests (headless)
npm run test:e2e:headed  # e2e có UI
npm run test:e2e:debug   # e2e debug mode
```

Lần đầu chạy Playwright, cần cài browser:

```bash
npx playwright install
```

## 5. Biến môi trường

Các biến hiện có trong `.env.example`:

- `VITE_APP_VERSION`
- `GENERATE_SOURCEMAP`
- `PUBLIC_URL`
- `VITE_BASE_API_URL`
- `VITE_APP_BASE_NAME`
- `VITE_SENTRY_DSN`
- `VITE_SENTRY_ENVIRONMENT`
- `VITE_SENTRY_TRACES_SAMPLE_RATE`
- `VITE_SENTRY_SEND_DEFAULT_PII`

Lưu ý:
- Không commit `.env` chứa dữ liệu thật.
- `.env.example` hiện đang có giá trị mẫu thật cho Sentry DSN. Khi triển khai môi trường mới, nên thay bằng giá trị tương ứng.

## 6. Routing hiện tại

- `/auth/*`: đăng nhập, quên mật khẩu, 403/404
- `/admin/*`: khu vực quản trị (guard theo quyền admin)
- `/portal/*`: khu vực bệnh nhân (guard theo trạng thái bệnh nhân)
- `/`: điều hướng theo vai trò người dùng

Các file route chính:
- `src/routes/index.tsx`
- `src/routes/AdminRoutes.tsx`
- `src/routes/PortalRoutes.tsx`
- `src/routes/PublicRoutes.tsx`

## 7. Cấu trúc thư mục chính

```text
src/
  components/
  contexts/
  features/
    admin/
    portal/
  hooks/
  routes/
  services/
  types/
  utils/
```

Tài liệu kiến trúc chi tiết: `ARCHITECTURE.md`.

## 8. Build và deploy

### Build local

```bash
npm run build
```

Artifact: `dist/`

### Docker image

`Dockerfile` đang dùng multi-stage:
1. Build app bằng Node 20
2. Serve static files bằng Nginx

Build và chạy:

```bash
docker build -t eye-sight-admin .
docker run -p 80:80 eye-sight-admin
```

### Docker Compose

`docker-compose.yml` hiện tại chạy image có sẵn và map cổng `82:80`:

```yaml
services:
  eyesight-admin:
    image: $IMAGE_NAME
    ports:
      - "82:80"
```

Lưu ý: file này không build image từ source, cần truyền `IMAGE_NAME` trước khi chạy.

## 9. Tài liệu liên quan

- `ARCHITECTURE.md`
- `docs/`
- `playwright.config.ts`
- `Dockerfile`
- `docker-compose.yml`
# Eye-Sight Service

Backend API cho hệ thống Eye-Sight.

- Runtime: Node.js + Express
- Database: PostgreSQL (Sequelize)
- Auth: JWT
- API base path: `/api/v1`

README này tập trung vào cách chạy, cấu hình, và vận hành.

## 1. Yêu cầu môi trường

- Node.js >= 18
- Yarn
- PostgreSQL

## 2. Cài đặt và chạy local

```bash
yarn install
cp .env.example .env
yarn db:migrate
yarn db:seed
yarn dev
```

Server mặc định chạy tại `http://localhost:4000`.

## 3. API và docs

- API base: `http://localhost:4000/api/v1`
- Version endpoint: `GET /api/v1/version`
- Swagger UI: `http://localhost:4000/api/v1/docs` (chỉ bật ở `NODE_ENV=development`)

## 4. Scripts chính

```bash
yarn dev                   # chạy local với nodemon
yarn start                 # chạy bằng pm2 (production process)

yarn test                  # chạy test
yarn test:watch            # test watch
yarn coverage              # test + coverage

yarn lint                  # eslint
yarn lint:fix              # eslint --fix
yarn prettier              # prettier check
yarn prettier:fix          # prettier write

yarn db:migrate            # migrate DB
yarn db:migrate:undo       # rollback 1 migration
yarn db:migrate:undo:all   # rollback toàn bộ
yarn db:migrate:status     # trạng thái migration
yarn db:seed               # seed dữ liệu ban đầu

yarn docker:dev            # compose dev
yarn docker:prod           # compose prod
yarn docker:test           # compose test
```

## 5. Biến môi trường chính

Các biến mẫu nằm trong `.env.example`:

- `NODE_ENV`, `PORT`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`, `JWT_ACCESS_EXPIRATION_MINUTES`, `JWT_REFRESH_EXPIRATION_DAYS`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `EMAIL_FROM`
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- `ZALO_ACCESS_TOKEN`, `ZALO_APP_ID`, `ZALO_APP_SECRET`
- `DISABLE_SCHEDULERS` (đặt `true` để tắt cron scheduler)

Lưu ý:
- Không commit `.env` chứa dữ liệu thật.
- Với `FIREBASE_PRIVATE_KEY`, cần giữ nguyên escape/newline đúng format theo môi trường deploy.

## 6. Cấu trúc thư mục chính

```text
src/
  config/
  controllers/
  services/
  models/
  routes/
  validations/
  middlewares/
  utils/
  docs/
  database/
  app.js
  index.js
```

## 7. Docker

`Dockerfile` hiện tại build từ `node:alpine` và mặc định chạy `yarn dev -L`.

`docker-compose.yml` map cổng:
- host `4000` -> container `4000`

Các file compose mở rộng:
- `docker-compose.dev.yml`
- `docker-compose.prod.yml`
- `docker-compose.test.yml`

## 8. Vận hành scheduler

Scheduler được khởi tạo trong `src/app.js` khi:
- Không phải môi trường test
- `DISABLE_SCHEDULERS` khác `true`
- Chưa được khởi tạo trước đó

Bao gồm:
- Tạo phiên khám theo lịch
- Gửi nhắc lịch khám
- Nhắc bài tập
- Kiểm tra tuân thủ bài tập

## 9. Tài liệu liên quan

- `docs/`
- `DASHBOARD_REFACTOR_PLAN.md`
- `DASHBOARD_REFACTOR_SPEC.md`
- `docker-compose*.yml`
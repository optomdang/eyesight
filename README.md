# Eye-Sight Monorepo

Hệ thống quản lý khám và điều trị thị lực — gồm backend API và frontend (admin + portal bệnh nhân).

## Cấu trúc

```text
eyesight/
├── eyesight-service/   # Backend — Node.js + Express + PostgreSQL
├── eyesight-admin/     # Frontend — React + TypeScript + Vite
├── package.json        # Script tiện ích chạy cả hai phần
└── README.md
```

| Phần | URL local | Công nghệ |
|------|-----------|-----------|
| Backend API | http://localhost:4000/api/v1 | Express, Sequelize, Yarn |
| Frontend | http://localhost:4001 | React 19, MUI, npm |

> **Port 4000/4001** tránh xung đột với VisionD Clinic (thường chạy ở `localhost:3000`).

## Yêu cầu

- Node.js 20+
- PostgreSQL
- Yarn (backend) + npm (frontend) — hoặc chỉ dùng `npm` cho cả hai

## Cài đặt lần đầu

```bash
# Từ thư mục gốc monorepo
npm install              # cài concurrently ở root
npm run install:all      # cài dependency cho cả service + admin

# PostgreSQL local (Docker, port 5433 — không đụng VisionD :5432)
npm run db:local:setup   # bật DB + tạo bảng + seed dữ liệu mẫu

# Nếu backend đang chạy từ trước, khởi động lại để đọc .env mới:
# Ctrl+C rồi npm run dev

cp eyesight-service/.env.example eyesight-service/.env   # bỏ qua nếu đã có
cp eyesight-admin/.env.example eyesight-admin/.env
# Khi dev local: PUBLIC_URL=http://localhost:4001 và VITE_BASE_API_URL=http://localhost:4000/api/v1
```

**Tài khoản sau seed mẫu (`db:seed`):** `admin@nhuocthi.vn` / `Admin@123`

**Tài khoản sau seed demo (`npm run db:seed:demo`):** `admin@demo.com` / `Demo@1234` — dashboard có đủ mock (20 bệnh nhân).

Cấu hình Supabase cũ (remote) được lưu tại `eyesight-service/.env.remote` nếu cần trỏ lại.

**Triển khai production:** xem [DEPLOY.md](./DEPLOY.md) (Vercel + Render + Neon + `nhuocthi.vn`).

## Chạy development

```bash
# Chạy cả backend + frontend
npm run dev

# Hoặc chạy riêng từng phần
npm run dev:service
npm run dev:admin
```

## Tài liệu chi tiết

- Backend: [eyesight-service/README.md](./eyesight-service/README.md)
- Frontend: [eyesight-admin/README.md](./eyesight-admin/README.md)
- Kiến trúc frontend: [eyesight-admin/ARCHITECTURE.md](./eyesight-admin/ARCHITECTURE.md)

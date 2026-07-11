# Triển khai EyeSight lên production

Hướng dẫn đưa **EyeSight** (monorepo backend + frontend) lên cloud với domain **nhuocthi.vn**.

> **Khác VisionD Clinic:** VisionD là 1 app Next.js trên Vercel. EyeSight gồm **2 phần**:
> - `eyesight-service` — API Express (port 4000)
> - `eyesight-admin` — React/Vite (port 4001)

## Kiến trúc đề xuất

| Thành phần | Hosting | Domain |
|------------|---------|--------|
| Frontend (admin + portal) | **Vercel** | `https://app.nhuocthi.vn` |
| Landing (marketing) | **Vercel** (project riêng) | `https://nhuocthi.vn` |
| Backend API | **Render** (free) hoặc VPS Azdigi | `https://api.nhuocthi.vn` |
| PostgreSQL | **Neon** | (nội bộ, không public) |

Web marketing `nhuocthi.vn` nằm trong `eyesight-landing/` — deploy Vercel với Root Directory = `eyesight-landing`.

```
Browser → nhuocthi.vn (Vercel, Next.js static)
Browser → app.nhuocthi.vn (Vercel, Vite SPA)
              ↓ API calls
         api.nhuocthi.vn (Render, Express)
              ↓
         Neon PostgreSQL
```

---

## Phần A — Việc agent đã chuẩn bị sẵn

- [x] CORS backend cho `nhuocthi.vn` + biến `CORS_ORIGINS`
- [x] `eyesight-admin/vercel.json` — SPA routing
- [x] `render.yaml` — blueprint API trên Render
- [x] `.env.production.example` cho service + admin
- [x] Script `scripts/setup-neon-production.sh` — migrate DB lên Neon

---

## Phần B — Bạn làm trên GitHub (5 phút)

### B1. Tạo repo mới

1. Vào https://github.com/new
2. Tên: `eyesight` (hoặc `nhuocthi-app`)
3. **Private** nếu muốn
4. **Không** tích README / .gitignore (đã có trong code)

### B2. Push code lần đầu

Trong terminal:

```bash
cd ~/Du-an-code/eyesight

# Kiểm tra không commit file secret
git status   # không được thấy .env, .env.remote

git add .
git commit -m "Prepare EyeSight monorepo for production deploy"
git branch -M main
git remote add origin https://github.com/optomdang/eyesight.git
git push -u origin main
```

> Đổi `optomdang/eyesight` nếu bạn đặt tên repo khác.

---

## Phần C — Neon (database mới, tách VisionD)

1. Đăng nhập https://neon.tech (cùng account VisionD được)
2. **New project** → tên `eyesight` hoặc `nhuocthi`
3. Region: **Singapore** (gần VN)
4. Vào **Connection details** → copy:
   - Host, Port, User, Password, Database name

Ghi vào bảng (ví dụ):

```
DB_HOST=ep-xxxx.ap-southeast-1.aws.neon.tech
DB_PORT=5432
DB_USER=neondb_owner
DB_PASSWORD=********
DB_NAME=neondb
DB_USE_SSL=true
```

### C1. Tạo bảng trên Neon (chạy trên máy Mac)

Tạo file tạm `eyesight-service/.env.neon` (không commit) với các biến trên + `JWT_SECRET` bất kỳ ≥ 32 ký tự.

```bash
cd ~/Du-an-code/eyesight/eyesight-service
cp .env.neon .env   # hoặc export biến thủ công
cd ..
chmod +x scripts/setup-neon-production.sh
./scripts/setup-neon-production.sh
```

### C2. Tạo tài khoản admin production

```bash
cd ~/Du-an-code/eyesight/eyesight-service
NODE_ENV=development node scripts/seed-initial-data.js
```

Đăng nhập thử: `admin@nhuocthi.vn` / `Admin@123` — **đổi mật khẩu ngay** sau khi vào được.

---

## Phần D — Render (backend API)

> Express + cron jobs chạy ổn trên Render hơn Vercel serverless.

1. https://render.com → đăng nhập bằng GitHub
2. **New → Blueprint** (hoặc Web Service) → chọn repo `eyesight`
3. Nếu dùng Blueprint: Render đọc `render.yaml` tự động
4. Nếu cấu hình thủ công:

| Mục | Giá trị |
|-----|---------|
| Root Directory | `eyesight-service` |
| Runtime | Node |
| Build Command | `npm install --ignore-scripts` |
| Start Command | `npm run start:node` |
| Health Check Path | `/api/v1/version` |

5. **Environment Variables** — copy từ `eyesight-service/.env.production.example`:

| Biến | Ghi chú |
|------|---------|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Từ Neon |
| `DB_USE_SSL` | `true` |
| `JWT_SECRET` | `openssl rand -base64 48` |
| `CORS_ORIGINS` | `https://app.nhuocthi.vn,https://nhuocthi.vn` |

6. Deploy → copy URL tạm, ví dụ `https://eyesight-api.onrender.com`
7. Test: mở `https://eyesight-api.onrender.com/api/v1/version` → thấy JSON version

### Gán domain API

1. Render → service → **Settings → Custom Domains**
2. Thêm `api.nhuocthi.vn`
3. Render hiện bản ghi DNS (thường CNAME)

---

## Phần E — Vercel (frontend)

1. https://vercel.com → **Add New → Project** → import repo `eyesight`
2. **Root Directory:** `eyesight-admin` (quan trọng!)
3. Framework: Vite (auto)
4. **Environment Variables** (Production):

| Biến | Giá trị |
|------|---------|
| `VITE_BASE_API_URL` | `https://api.nhuocthi.vn/api/v1` |
| `PUBLIC_URL` | `https://app.nhuocthi.vn` |
| `VITE_APP_BASE_NAME` | `/` |

5. Deploy → URL tạm `https://eyesight-admin-xxx.vercel.app`
6. Mở thử — nếu login lỗi CORS, kiểm tra `CORS_ORIGINS` trên Render

### Gán domain app

1. Vercel → project → **Settings → Domains**
2. Thêm `app.nhuocthi.vn`

---

## Phần F — DNS Azdigi (nhuocthi.vn)

Đăng nhập Azdigi → Quản lý DNS `nhuocthi.vn`:

| Type | Host | Value | Ghi chú |
|------|------|-------|---------|
| **CNAME** | `app` | `cname.vercel-dns.com` | Frontend — copy chính xác từ Vercel |
| **CNAME** | `api` | *(giá trị Render cung cấp)* | Backend API |

Đợi DNS propagate (5 phút – 48 giờ). Vercel và Render tự cấp SSL.

### Sau khi DNS xong

1. Vercel: `PUBLIC_URL=https://app.nhuocthi.vn` → **Redeploy**
2. Render: `CORS_ORIGINS=https://app.nhuocthi.vn` → redeploy nếu đổi
3. Test:
   - https://app.nhuocthi.vn — trang login
   - https://api.nhuocthi.vn/api/v1/version — API health

---

## Checklist tổng

```
□ GitHub repo eyesight + push main
□ Neon project mới (KHÔNG dùng DB VisionD)
□ ./scripts/setup-neon-production.sh thành công
□ Seed admin + đổi mật khẩu
□ Render: eyesight-service deploy OK
□ Vercel: eyesight-admin, Root = eyesight-admin
□ DNS: app.nhuocthi.vn → Vercel
□ DNS: api.nhuocthi.vn → Render
□ Login production OK
```

---

## Lưu ý

1. **Không commit** `.env`, `.env.remote` — file `.env.remote` có credential cũ Supabase, nên xoá hoặc rotate nếu từng lộ.
2. **Render free tier** sleep sau 15 phút không dùng — request đầu có thể chậm ~30s. Nâng paid hoặc dùng VPS Azdigi nếu cần 24/7.
3. **VisionD** (`qlpk.visiondsoft.com`) không bị ảnh hưởng — DB và project deploy tách hẳn.
4. **Web marketing** `nhuocthi.vn`: deploy từ `eyesight-landing/` — xem Phần G bên dưới.

---

## Phần G — Deploy landing page (nhuocthi.vn)

### G1. Tạo Vercel project mới

1. Vercel Dashboard → **Add New Project** → import cùng repo GitHub `eyesight`
2. **Root Directory:** `eyesight-landing`
3. Framework: Next.js (tự nhận)
4. Build Command: `npm run build` (mặc định)
5. **Không** override Output Directory — để Vercel tự xử lý static export (`output: 'export'`)

### G2. Environment variables

| Biến | Ví dụ |
|------|-------|
| `NEXT_PUBLIC_SITE_URL` | `https://nhuocthi.vn` |
| `NEXT_PUBLIC_APP_URL` | `https://app.nhuocthi.vn` |
| `NEXT_PUBLIC_ZALO_PHONE` | `09xxxxxxxx` |

### G3. Domain

1. Vercel project landing → Settings → Domains → thêm `nhuocthi.vn` và `www.nhuocthi.vn`
2. DNS (tại registrar): A record hoặc CNAME theo hướng dẫn Vercel cho root domain

### G4. Chạy local

```bash
npm run install:landing
cp eyesight-landing/.env.example eyesight-landing/.env.local
npm run dev:landing   # http://localhost:4002
```

---

## Thay Render bằng VPS Azdigi (tuỳ chọn)

Nếu bạn có VPS tại Azdigi:

```bash
cd eyesight-service
docker build -t eyesight-api .
docker run -d -p 4000:4000 --env-file .env.production eyesight-api
```

Trỏ `api.nhuocthi.vn` A record về IP VPS + reverse proxy nginx + Let's Encrypt.

---

## Lệnh hữu ích sau deploy

```bash
# Migrate schema mới lên Neon
cd eyesight-service && npm run db:migrate

# Build frontend local test production API
cd eyesight-admin
VITE_BASE_API_URL=https://api.nhuocthi.vn/api/v1 npm run build && npm run preview
```

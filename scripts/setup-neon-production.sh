#!/usr/bin/env bash
# Chạy MỘT LẦN sau khi tạo Neon project — từ thư mục gốc monorepo.
# Yêu cầu: export biến DB_* hoặc file eyesight-service/.env trỏ Neon.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "→ Migrate schema lên Neon..."
npm run db:migrate

echo "→ Sửa schema local quirks (nếu cần)..."
npm run db:fix-schema || true

echo "→ Stamp migrations..."
cd eyesight-service && npm run db:stamp

echo ""
echo "✓ Schema đã sẵn sàng."
echo "  Seed admin (tuỳ chọn, trên máy local với .env trỏ Neon):"
echo "    cd eyesight-service && NODE_ENV=development node scripts/seed-initial-data.js"
echo "  Hoặc seed demo:"
echo "    npm run db:seed:demo"

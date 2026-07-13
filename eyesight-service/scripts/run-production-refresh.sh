#!/usr/bin/env bash
# One-command production refresh after deploy (Render API + optional Vercel admin).
#
# 1. Set credentials once in the terminal (use your real admin password):
#    export PRODUCTION_ADMIN_EMAIL='admin@nhuocthi.vn'
#    export PRODUCTION_ADMIN_PASSWORD='your-password'
#
# 2. Run:
#    ./scripts/run-production-refresh.sh
#
# Optional:
#    PRODUCTION_API_URL=https://api.nhuocthi.vn/api/v1 ./scripts/run-production-refresh.sh

set -euo pipefail
cd "$(dirname "$0")/.."

API="${PRODUCTION_API_URL:-https://api.nhuocthi.vn/api/v1}"
API="${API%/}"

echo "==> Waiting for API ${API}/version"
for i in $(seq 1 30); do
  if curl -fsS -m 10 "${API}/version" >/dev/null 2>&1; then
    echo "    API is up."
    break
  fi
  if [[ "$i" -eq 30 ]]; then
    echo "API not reachable. Check Render deploy: https://dashboard.render.com"
    exit 1
  fi
  sleep 10
done

echo "==> Syncing exercise session snapshots via API"
node scripts/trigger-production-sync-via-api.js "$@"

echo ""
echo "==> Done."
echo "    - Backend: snapshots + session status recalculated."
echo "    - Frontend (Vercel): auto-deploys from GitHub main; hard-refresh app.nhuocthi.vn if UI unchanged."
echo "    - Patients: F5 trang Danh sách bài tập để thấy % tuân thủ mới."

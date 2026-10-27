#!/usr/bin/env bash
set -e

echo "=== [ARL CMS] Kéo mã nguồn mới nhất từ nhánh arl-cms-backend ==="
git pull origin arl-cms-backend

# Đảm bảo các thư mục và file cấu hình cần thiết tồn tại
mkdir -p .figma/make cms-data
if [ ! -f .figma/make/site.json ]; then
    echo '{"title":"Applied Robotics Lab","language":"vi"}' > .figma/make/site.json
fi
if [ ! -f cms-data/ARL_Role_Email_Map.local.json ]; then
    echo '{"admin":["danhphan141204@gmail.com","vnh2222@gmail.com"],"editor":[],"publisher":[],"inquiries":[]}' > cms-data/ARL_Role_Email_Map.local.json
fi

# 1. Nếu đang chạy với Docker Compose
if command -v docker &> /dev/null && [ -f "docker-compose.yml" ]; then
    echo "=== [ARL CMS] Build lại và khởi động Docker Container ==="
    docker compose up -d --build
    echo "=== [ARL CMS] Deploy thành công qua Docker! ==="
    exit 0
fi

# 2. Nếu đang chạy Native với systemd
echo "=== [ARL CMS] Cài đặt dependencies với pnpm ==="
pnpm install --frozen-lockfile

echo "=== [ARL CMS] Build client & SSR ==="
pnpm run build

echo "=== [ARL CMS] Chạy kiểm tra hệ thống ==="
pnpm exec tsc --noEmit

if systemctl is-active --quiet arl-cms; then
    echo "=== [ARL CMS] Restarting systemd service arl-cms ==="
    sudo systemctl restart arl-cms
fi

echo "=== [ARL CMS] Hoàn tất triển khai! ==="

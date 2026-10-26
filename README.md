# ARL website và CMS

Source website React/Vite và backend CMS Node.js của Applied Robotics Lab.
Backend phục vụ cả website SSR, `/cms`, API liên hệ và quy trình
xem trước/đăng phiên bản. Không triển khai như một website tĩnh chỉ có `dist/`.

Trước khi hosting, đọc [DEPLOY_BEFORE_HOSTING.md](DEPLOY_BEFORE_HOSTING.md).
Riêng kết nối ba Sheet chính và Drive Zally, làm theo
[cms/HOSTING_GOOGLE_LIVE.md](cms/HOSTING_GOOGLE_LIVE.md).
Chi tiết cấu hình OAuth và Google Sheets/Drive nằm trong
[cms/OAUTH_BACKEND_HANDOFF.md](cms/OAUTH_BACKEND_HANDOFF.md); không đưa secret,
token, dữ liệu khách hàng hoặc `cms-data/` vào Git.

Kiểm tra source trên Node.js 22 và pnpm:

```sh
pnpm install --frozen-lockfile
pnpm run cms:check
pnpm exec tsc --noEmit
```

Đội hosting chịu trách nhiệm HTTPS, secrets, persistent volume, backup và
nghiệm thu production trước khi chuyển DNS.

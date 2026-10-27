# ARL WEBSITE & CMS — TÀI LIỆU BÀN GIAO TRIỂN KHAI CHO SYSTEM ADMIN (RUNBOOK)

- **Hệ thống**: Website Giới thiệu & Bảng điều khiển CMS (Applied Robotics Lab)
- **Kiến trúc**: Full-stack React 19 SSR + Node.js 22 Backend + SQLite + Cloudflare Tunnel
- **Nhánh Git triển khai**: `arl-cms-backend`
- **Phiên bản Node.js yêu cầu**: **Node.js 22 LTS trở lên** (Bắt buộc dùng `node:sqlite` built-in)
- **Mức độ sẵn sàng**: Đã kiểm thử 16/16 test PASS, preflight Google Sheets PASS 100%.

---

## 1. Sơ đồ kiến trúc & Luồng mạng (Architecture Topology)

```
[Khách truy cập] ────────► [Cloudflare Edge Network] (SSL tự động, DDoS Protection)
                                  │
                                  ▼ (Mã hóa QUIC qua Outbound Tunnel)
                          [Ubuntu PC Server]
                                  │
                       [cloudflared daemon (Service)]
                                  │ (Forward HTTP nội bộ)
                                  ▼
                     [Node.js 22 - Port 8787]
              (Dịch vụ: arl-cms.service hoặc Docker Container)
                   ├── Public Website SSR: / và /en
                   ├── CMS Dashboard: /cms
                   ├── API Endpoints: /api/*
                   ├── Cơ sở dữ liệu: /var/www/landing-page/cms-data/arl.sqlite
                   └── Tích hợp ngoài: Google Sheets API & Google Drive API (Outbound)
```

> **Ghi chú mạng**: Server **KHÔNG CẦN IP TĨNH**, **KHÔNG CẦN MỞ PORT ROUTER (NAT)**. Toàn bộ kết nối vào server đi qua Cloudflare Tunnel chiều ra (Outbound).

---

## 2. Danh mục tài nguyên bàn giao (Deliverables Checklist)

| Thành phần | Vị trí / Tên file | Mô tả |
| :--- | :--- | :--- |
| **Mã nguồn** | Nhánh `arl-cms-backend` | Toàn bộ source code React SSR và Node CMS |
| **File cấu hình mẫu** | `.env.example` | Mẫu cấu hình môi trường với đầy đủ ID các Google Sheet chính thức |
| **Systemd Service** | `arl-cms.service` | Đơn vị dịch vụ chạy ngầm trên Ubuntu, tự restart khi lỗi/khởi động lại máy |
| **Docker Stack** | `Dockerfile`, `docker-compose.yml` | Cấu hình chạy container hóa với persistent volume nếu muốn |
| **Script bảo trì** | `deploy.sh` | Script 1-click kéo code từ Git, tự build và reload dịch vụ |
| **Thư mục Secrets** | `secrets/` *(đã nén vào secrets-bundle.zip)* | Bộ 3 file JSON xác thực Google Cloud (Service Account, Drive OAuth, Sign-in OAuth) |

---

## 3. Quy trình triển khai chi tiết từng bước (Step-by-step Runbook)

### BƯỚC 1: Chuẩn bị máy chủ Ubuntu (PC Server)
Đăng nhập vào server Ubuntu qua SSH hoặc Terminal nội bộ:

```bash
# 1. Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# 2. Cài đặt Node.js 22 LTS (NodeSource chính thức) và các công cụ cần thiết
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git curl ufw

# 3. Kích hoạt pnpm (trình quản lý gói chuẩn của dự án)
sudo corepack enable
corepack prepare pnpm@latest --activate

# 4. Kiểm tra phiên bản (Yêu cầu Node >= 22.5.0)
node -v   # Ví dụ: v22.19.0 hoặc v22.20.0
pnpm -v   # Ví dụ: 10.x.x
```

---

### BƯỚC 2: Clone mã nguồn dự án

```bash
# Tạo thư mục ứng dụng
sudo mkdir -p /var/www/landing-page
sudo chown -R $USER:$USER /var/www/landing-page

# Clone đúng nhánh arl-cms-backend
git clone -b arl-cms-backend https://github.com/GW-ARLab/landing-page.git /var/www/landing-page
cd /var/www/landing-page

# Cài đặt dependencies
pnpm install --frozen-lockfile
```

---

### BƯỚC 3: Thiết lập các file khóa bảo mật (Secrets)

Tạo thư mục bảo mật riêng ngoài web root và cấp quyền nghiêm ngặt:

```bash
# Tạo thư mục secrets hệ thống
sudo mkdir -p /etc/arl-cms/secrets
sudo chown -R $USER:$USER /etc/arl-cms/secrets
sudo chmod 700 /etc/arl-cms/secrets

# Copy 3 file JSON từ gói secrets vào thư mục này:
# - service-account.json
# - drive-client.json
# - cms-signin.json
cp /path/to/secrets/* /etc/arl-cms/secrets/

# Khóa quyền chỉ cho user hiện tại đọc (Bảo mật tối đa)
chmod 600 /etc/arl-cms/secrets/*.json
```

---

### BƯỚC 4: Thiết lập file môi trường `.env`

Tạo file `/var/www/landing-page/.env` dựa trên file mẫu:

```bash
cp .env.example .env
nano .env
```

Điền các thông tin production:
```env
# Môi trường hoạt động
ARL_MODE=production
ARL_HOST=127.0.0.1
ARL_PORT=8787

# Tên miền chính thức của bạn (BẮT BUỘC có https://, KHÔNG có dấu / cuối)
ARL_SITE_URL=https://yourdomain.com

# Thư mục dữ liệu & sao lưu
ARL_DATA_DIR=/var/www/landing-page/cms-data
ARL_BACKUP_DIR=/var/backups/arl-cms

# Đường dẫn file Service Account Google
ARL_GOOGLE_CREDENTIALS=/etc/arl-cms/secrets/service-account.json

# ID 3 Google Sheets chính thức (Đã kiểm tra hợp lệ)
ARL_CONTENT_SHEET_ID=1tYbCnkU7o3AQ9Qvkgs5BbF6Mxyz22U2MEE2-6ovkjU8
ARL_INQUIRIES_SHEET_ID=1d6e5zIyp0DzxB4L9DW4ZNYz8z1c8NIhamRzVEBzNxzk
ARL_OPERATIONS_SHEET_ID=1J5_U5x8eg1VXxMlmWs0yZ9Ce2b_JKiGn8bh1UBK5_AA

# Client ID đăng nhập CMS Google
ARL_GOOGLE_CLIENT_ID=368533702412-joa46jkpq8suh5prmqtac3cog9u5jtdm.apps.googleusercontent.com

# File phân quyền nội bộ (khởi tạo ban đầu)
ARL_ROLE_EMAIL_MAP_FILE=/var/www/landing-page/cms-data/ARL_Role_Email_Map.local.json

# Cấu hình Google Drive cho Zally
ARL_DRIVE_OWNER_EMAIL=zally.aihoc@gmail.com
ARL_DRIVE_OAUTH_CLIENT_FILE=/etc/arl-cms/secrets/drive-client.json
ARL_DRIVE_TOKEN_FILE=/etc/arl-cms/secrets/drive-token.json

# Cờ ghi nội dung (mặc định để false ở giai đoạn đầu nghiệm thu)
ARL_GOOGLE_CONTENT_WRITE_ENABLED=false
ARL_DRIVE_MEDIA_WRITE_ENABLED=false
```

Tạo thư mục backup:
```bash
sudo mkdir -p /var/backups/arl-cms
sudo chown -R $USER:$USER /var/backups/arl-cms
```

---

### BƯỚC 5: Build ứng dụng & Chạy kiểm tra preflight

```bash
cd /var/www/landing-page

# Tạo các file cấu hình bắt buộc
mkdir -p .figma/make cms-data
if [ ! -f .figma/make/site.json ]; then
    echo '{"title":"Applied Robotics Lab","language":"vi"}' > .figma/make/site.json
fi
if [ ! -f cms-data/ARL_Role_Email_Map.local.json ]; then
    echo '{"admin":["danhphan141204@gmail.com","vnh2222@gmail.com"],"editor":[],"publisher":[],"inquiries":[]}' > cms-data/ARL_Role_Email_Map.local.json
fi

# Build client và SSR bundles
pnpm run build

# Chạy test kiểm tra toàn diện
pnpm run cms:check

# Chạy kiểm tra kết nối tới 3 Google Sheet chính thức
set -a && source .env && set +a
node cms/check-official-sheets.mjs
```
*(Nếu terminal in ra `Preflight hoàn tất.` nghĩa là hệ thống sẵn sàng 100%)*

---

### BƯỚC 6: Khởi chạy dịch vụ hệ thống (Systemd Service)

1. Cài đặt file service:
   ```bash
   sudo cp /var/www/landing-page/arl-cms.service /etc/systemd/system/arl-cms.service
   sudo systemctl daemon-reload
   sudo systemctl enable --now arl-cms
   ```

2. Kiểm tra trạng thái:
   ```bash
   sudo systemctl status arl-cms
   ```

3. Kiểm tra phản hồi HTTP nội bộ:
   ```bash
   curl -s http://127.0.0.1:8787/api/health
   # Kết quả mong đợi: {"ok":true,"mode":"production",...}
   ```

---

### BƯỚC 7: Cấu hình Cloudflare Tunnel trỏ Domain về Server

1. Đăng nhập **[Cloudflare Zero Trust Dashboard](https://dash.cloudflare.com/)** → **Networks** → **Tunnels**.
2. Bấm **Create a tunnel** → chọn **Cloudflare Tunnel (`cloudflared`)** → đặt tên tunnel: `arl-server`.
3. Chọn hệ điều hành **Debian / Ubuntu 64-bit**, copy lệnh do Cloudflare sinh ra và chạy trên Ubuntu server:
   ```bash
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cloudflared.deb && sudo cloudflared service install <TOKEN_CỦA_BẠN>
   ```
4. Tại bước **Public Hostnames**:
   - **Subdomain**: Để trống (hoặc `www` nếu muốn).
   - **Domain**: Chọn tên miền của bạn (`yourdomain.com`).
   - **Type**: `HTTP`
   - **URL**: `localhost:8787` (hoặc `127.0.0.1:8787`).
   - Mục **Additional application settings** → **HTTP Settings**:
     - Điền **HTTP Host Header**: `yourdomain.com` (khớp với tên domain).
5. Bấm **Save tunnel**.

---

## 4. Nghiệm thu lần đầu (First-time Acceptance Checklist)

1. **Truy cập CMS Panel**:
   Mở trình duyệt: `https://yourdomain.com/cms`
2. **Đăng nhập**:
   Dùng tài khoản Google nằm trong danh sách Admin (`danhphan141204@gmail.com` hoặc `vnh2222@gmail.com`).
3. **Xuất bản bản đầu tiên (Kích hoạt Public Website)**:
   - Chọn vai trò **Editor** → Bấm **Validate** → Bấm **Tạo Candidate**.
   - Bấm **Xem trước (Preview)** để kiểm tra hiển thị.
   - Chọn vai trò **Publisher** → Bấm **Publish**.
4. **Kiểm tra Website Public**:
   - Mở `https://yourdomain.com` → Trang chủ hiển thị đầy đủ.
   - Thử chuyển đổi ngôn ngữ Việt / Anh.
   - Thử gửi 1 form liên hệ thử nghiệm tại `/contact` → Kiểm tra tin nhắn xuất hiện trong hộp thư `/cms`.

---

## 5. Quy trình bảo trì & Vận hành (Operations Manual)

### 1. Xem logs hệ thống theo thời gian thực:
```bash
sudo journalctl -u arl-cms -f
```

### 2. Cập nhật mã nguồn khi có commit mới trên Git:
Đã có sẵn script tự động hóa:
```bash
cd /var/www/landing-page
chmod +x deploy.sh
./deploy.sh
```

### 3. Sao lưu dữ liệu (Backup):
Thực hiện sao lưu cơ sở dữ liệu SQLite và nội dung CMS:
```bash
cd /var/www/landing-page
pnpm run cms:backup
```
*Gợi ý*: Thiết lập cronjob chạy sao lưu tự động hàng ngày lúc 2h sáng:
```bash
# Mở crontab
crontab -e
# Thêm dòng sau:
0 2 * * * cd /var/www/landing-page && pnpm run cms:backup >> /var/log/arl-backup.log 2>&1
```

### 4. Tối ưu cho PC Server gia đình / văn phòng:
Tắt chế độ tự ngủ (Sleep/Suspend) để server hoạt động liên tục:
```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
```
Bật tường lửa bảo vệ SSH:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw enable
```

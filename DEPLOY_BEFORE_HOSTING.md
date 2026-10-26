# ARL website/CMS — việc cần làm trước khi hosting

Tài liệu bàn giao cho đội triển khai. Source này gồm website React/SSR và backend
CMS Node.js; **không thể chỉ tải thư mục `dist/` lên static hosting**. Domain dự
kiến: `https://landing-page-arl.aihoc.ai.vn`. Không đổi DNS hoặc thay website cũ
trước khi hoàn tất các bước nghiệm thu bên dưới.

**Kết nối chính thức với ba Google Sheet và Drive Zally:** làm từng bước theo
[`cms/HOSTING_GOOGLE_LIVE.md`](cms/HOSTING_GOOGLE_LIVE.md). Tài liệu đó phân rõ
đã kiểm tra quyền đọc, việc bên hosting phải cấu hình, và thời điểm được bật
ghi dữ liệu thật.

## 1. Trạng thái source tại ngày 27/10/2026

- `pnpm run cms:check` build client + SSR và chạy 16/16 test thành công;
  `pnpm exec tsc --noEmit` thành công trên Node.js 22.20.0.
- Các test chạy local và giả lập Google API; **chưa chứng minh production chạy
  đúng** với HTTPS, Sheet chính, OAuth Drive thật, backup/restore và tải cao.
- Google Sheet chính đã được kiểm tra **quyền đọc và schema**. Chưa ghi thử vào
  Sheet chính. Ảnh thử ở Sheet staging không được chuyển sang Sheet chính.
- Bản đầu tiên trên máy chủ mới chưa có release: `/api/content` trả 503 cho
  đến khi quản trị viên tạo candidate, xem trước và publish bản đầu tiên.
- Nội dung chính sách/điều khoản phải được ARL duyệt đủ dữ kiện và không còn
  `needs_confirmation`/`legal_draft_status=pending_facts` trước khi publish.

## 2. Nhận source và kiểm tra trước khi triển khai

1. Xác nhận nhánh bàn giao `arl-cms-backend` của repo
   `GW-ARLab/landing-page` đã có commit source mới, rồi lấy đúng commit SHA
   triển khai. Không tự động
   merge vào `main` hoặc thay website cũ.
2. Không đưa lên Git/artefact công khai: `cms-data/`, `cms-ssr/`, `dist/`,
   `node_modules/`, `.env*`, SQLite, bản sao lưu, file JSON service account,
   OAuth client secret, refresh token và dữ liệu khách hàng. File
   `cms/local/ARL_Legal_Draft.json` là bản nháp, không dùng làm nguồn production.
3. Dùng Node.js 22 (đã kiểm với 22.20.0) và pnpm theo `pnpm-lock.yaml`.
   Tại gốc dự án chạy:

   ```sh
   pnpm install --frozen-lockfile
   pnpm run cms:check
   pnpm exec tsc --noEmit
   ```

   Dừng nếu build/test lỗi. `pnpm run build` tạo cả `dist/` và `cms-ssr/` trên
   máy chủ hoặc trong artefact triển khai; giữ hai thư mục đó cùng mã backend.

## 3. Hạ tầng và dữ liệu cần chuẩn bị

- Một Node process chạy `node cms/server.mjs` dưới process manager có restart,
  log và health check. Chỉ một instance ghi vào cùng SQLite/volume; chưa thiết
  kế để chạy nhiều replica cùng ghi dữ liệu.
- Reverse proxy terminate HTTPS, chuyển **toàn bộ** `/`, `/en`, `/cms`,
  `/api/*`, `/preview/*`, `/assets/*` đến Node, giữ `Host` đúng domain. Không
  phục vụ riêng `dist/` như website tĩnh, không public cổng Node. Nếu proxy
  cùng máy, đặt `ARL_HOST=127.0.0.1`; cổng mặc định `ARL_PORT=8787`.
- Proxy cho phép request body tối thiểu 40 MB để video MP4 tối đa 25 MB qua
  JSON/base64; giới hạn thời gian tải phù hợp. Không cache `/cms`, `/api/*`
  hoặc `/preview/*`; bảo đảm video hỗ trợ HTTP Range.
- Volume bền vững, chỉ process Node được ghi: `ARL_DATA_DIR` (SQLite,
  candidates, releases, phiên đăng nhập, phân quyền, tin nhắn). Volume/đích
  backup **khác** `ARL_DATA_DIR`: `ARL_BACKUP_DIR`. Không xóa volume khi deploy
  lại. Sao lưu định kỳ bằng `pnpm run cms:backup`, mã hóa/hạn chế truy cập và
  thử khôi phục trên staging. Backup có dữ liệu liên hệ cá nhân.
- Máy chủ cần kết nối ra Google Sheets API, Drive API và Google Identity;
  đồng bộ giờ hệ thống. Secrets chỉ ở secret manager/file riêng ngoài web root,
  quyền đọc giới hạn cho process Node; không gửi qua chat hoặc đưa vào GitHub.

## 4. Cấu hình production

Đội hosting nhận các giá trị/secret bằng kênh riêng. Tài liệu
[`cms/OAUTH_BACKEND_HANDOFF.md`](cms/OAUTH_BACKEND_HANDOFF.md) ghi Client ID,
ba Sheet chính thức và các bước Google Cloud do chủ tài khoản thực hiện thủ
công. **Không dùng ID Sheet staging, OAuth client local hoặc client n8n.**

| Biến | Yêu cầu |
| --- | --- |
| `ARL_MODE` | `production` — tắt vai trò giả lập |
| `ARL_SITE_URL` | `https://landing-page-arl.aihoc.ai.vn`, không có `/cms` hoặc dấu `/` cuối |
| `ARL_HOST`, `ARL_PORT` | Bind private sau reverse proxy; mặc định `127.0.0.1:8787` |
| `ARL_GOOGLE_CREDENTIALS` | Đường dẫn tuyệt đối đến service-account JSON ngoài repo |
| `ARL_CONTENT_SHEET_ID` | Content Sheet **chính thức** |
| `ARL_INQUIRIES_SHEET_ID` | Sheet tin nhắn **riêng tư**, không công khai |
| `ARL_OPERATIONS_SHEET_ID` | Sheet nhật ký chính thức |
| `ARL_GOOGLE_CLIENT_ID` | Client ID **CMS Sign-In PROD**, không phải Drive |
| `ARL_ROLE_EMAIL_MAP_FILE` | Đường dẫn tuyệt đối đến JSON email/vai trò production đã duyệt, ngoài repo; giữ quyền admin đã xác nhận cho Danh và Hiếu |
| `ARL_DATA_DIR` | Volume bền vững cho dữ liệu CMS |
| `ARL_BACKUP_DIR` | Đích backup bền vững riêng, bắt buộc ở production |

Dùng `ARL_ROLE_EMAIL_MAP_FILE` thay cho `ARL_ROLE_MAP` nếu muốn màn hình admin
quản lý quyền thành viên hoạt động. Không chép nguyên cấu hình thử nghiệm sang
production nếu chưa kiểm tra danh sách email/quyền. Quyền trên CMS **không tự
thay thế** quyền chia sẻ Google Sheets/Drive.
Admin có thể thêm email Google mới với quyền biên tập, duyệt đăng hoặc xử lý
liên hệ ngay trong CMS; quyền admin vẫn chỉ do cấu hình server quản lý. Danh sách
được thêm và các thay đổi quyền nằm trong SQLite tại `ARL_DATA_DIR`, nên phải
backup và giữ volume này khi triển khai lại.

Hai tính năng ghi là opt-in:

- `ARL_GOOGLE_CONTENT_WRITE_ENABLED=true`: cho CMS sửa Content Sheet/tạo sản
  phẩm. Chỉ bật sau khi sao lưu Sheet và thử an toàn trên bản sao; tránh có
  người sửa cùng một dòng trực tiếp trên Sheet khi CMS đang lưu.
- Để tải ảnh/video vào My Drive của Zally: đặt
  `ARL_DRIVE_OAUTH_CLIENT_FILE`, `ARL_DRIVE_TOKEN_FILE` là **hai đường dẫn tuyệt
  đối khác nhau, ngoài repo**, `ARL_DRIVE_OWNER_EMAIL=zally.aihoc@gmail.com`,
  rồi bật `ARL_DRIVE_MEDIA_WRITE_ENABLED=true` sau khi Zally cấp quyền OAuth
  trên **domain HTTPS production**. Tải media qua CMS còn phụ thuộc vào cờ ghi
  Content Sheet ở trên. Không dùng refresh token từ client localhost.

Chủ tài khoản kiểm tra Google Cloud: origin chính xác cho CMS Sign-In, redirect
URI `https://landing-page-arl.aihoc.ai.vn/api/drive-oauth/callback` cho client
Drive riêng, Drive API đã bật, Zally là test user nếu app còn ở Testing. Trạng
thái Testing có thể làm refresh token Drive hết hạn sau khoảng 7 ngày; chưa
được coi là vận hành lâu dài. Không sửa branding/client của n8n trong project
AIHoc dùng chung.

## 5. Kiểm tra Sheet trước khi bật ghi

1. Sao lưu cả ba Sheet chính. Không chạy `pnpm run cms:bootstrap-google` trên
   Sheet đã có dữ liệu.
2. Kiểm tra tab `Inquiries`: cột S dành cho `phone`. Nếu `S1` trống, điền
   `phone` sau khi đã sao lưu; nếu cột S có dữ liệu khác, dừng và xử lý schema
   trước khi nhận form thật.
3. Cấu hình đường dẫn credential và ba Sheet ID chính thức, rồi chạy
   `pnpm run cms:check-official-sheets`. Lệnh này chỉ đọc, **không** xác nhận
   chức năng ghi/sync hoạt động. Nếu lỗi, không bật các cờ ghi.

## 6. Khởi động và nghiệm thu trên HTTPS trước khi chuyển DNS

1. Chạy build đã kiểm thử và `node cms/server.mjs`. Kiểm tra `/api/health`
   trả `mode: production`. Trước bản phát hành đầu, `active_release: null` là
   trạng thái dự kiến, **không phải đã sẵn sàng cho khách truy cập**.
2. Thử Google Sign-In bằng email được duyệt và email ngoài danh sách. Kiểm
   tra đúng quyền editor/publisher/inquiries/admin, quyền quản lý thành viên,
   cookie `Secure`/`HttpOnly`, CSRF và quyền truy cập preview/tin nhắn.
3. Quản trị viên kiểm tra nguồn Sheet, tạo candidate, xem trước cả Việt/Anh,
   rồi publish bản đầu. Xác nhận `/`, `/contact`, các trang sản phẩm, ảnh/video,
   `/api/content`, `/sitemap.xml` và trang 404 hoạt động qua domain HTTPS.
4. Khi được phép thử ghi, dùng **dữ liệu thử có kiểm soát**: sửa một nội dung,
   tạo/xem trước/đăng và rollback; gửi một form có số điện thoại bắt buộc,
   xác nhận CMS nhận đúng một bản ghi và Sheet Inquiries riêng đồng bộ đúng
   một lần; thử xử lý trạng thái, ghi chú và xóa theo quyền.
5. Zally cấp quyền Drive trên domain production; thử ảnh và video của một
   sản phẩm thử, kiểm tra file Drive và dòng Media/Products trên Content Sheet,
   preview rồi publish. Nếu tải Drive thành công nhưng ghi Sheet lỗi, kiểm
   tra file dư trước khi thử lại.
6. Kiểm tra nội dung pháp lý cuối cùng, quyền công bố ảnh/video, responsive,
   bàn phím, SEO, hiệu năng, log lỗi, cảnh báo và lịch backup. Thử **restore**
   trên staging tách biệt, không phục hồi đè lên production.

**Chỉ chuyển DNS/ra mắt khi ARL và đội hosting xác nhận toàn bộ mục này đạt.**
Giữ bản website cũ và kế hoạch quay lại nếu có lỗi; sau chuyển đổi theo dõi
`/api/health`, `/api/status` (cần tài khoản có quyền), log ứng dụng, form và
đồng bộ Sheets/Drive. Hướng dẫn kỹ thuật sâu hơn: [`cms/DEPLOYMENT.md`](cms/DEPLOYMENT.md),
[`cms/UAT.md`](cms/UAT.md), [`cms/OAUTH_BACKEND_HANDOFF.md`](cms/OAUTH_BACKEND_HANDOFF.md).

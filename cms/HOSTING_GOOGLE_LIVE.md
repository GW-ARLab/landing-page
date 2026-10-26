# Bàn giao cho bên hosting: kết nối ARL CMS với Google chính thức

Tài liệu này dành cho người triển khai backend tại
`https://landing-page-arl.aihoc.ai.vn`. Làm theo đúng thứ tự; **không** trỏ
CMS local hoặc bản staging vào ba Sheet chính để thử ghi. Không đổi website cũ
hay DNS trước khi ARL nghiệm thu. Đọc thêm
[`../DEPLOY_BEFORE_HOSTING.md`](../DEPLOY_BEFORE_HOSTING.md) cho hạ tầng, backup
và quy trình phát hành.

## 1. Hiện trạng và người chịu trách nhiệm

- Đã xác nhận service account `arl-cms-sheets@aihoc-467710.iam.gserviceaccount.com`
  là Người chỉnh sửa của cả ba Sheet chính. Ngày 27/10/2026, lệnh kiểm tra
  **chỉ đọc** đã đọc đủ 15 tab Content và tiêu đề các tab Inquiries/Operations;
  chưa ghi thử lên Sheet chính.
- OAuth Drive trên localhost dùng **client/token thử nghiệm**, không phải client
  Drive PROD. Chưa có JSON của client Drive PROD trong `C:\Json` ở máy phát
  triển; bên hosting cần nhận JSON đúng client qua kênh bảo mật. Zally phải cấp
  quyền trên domain HTTPS production sau khi triển khai.
- Chủ tài khoản Google/ARL: giữ quyền sở hữu Sheet và My Drive, cung cấp JSON
  service account và OAuth client Drive PROD qua kênh an toàn, tự xác nhận các
  cài đặt Google Cloud. **Không gửi mật khẩu, client secret, JSON, mã cấp quyền
  hoặc refresh token qua chat/GitHub.**
- Bên hosting: đặt secrets/biến môi trường, HTTPS, volume, backup, chạy preflight,
  khởi động backend và đối chiếu kết quả. Quản trị viên ARL: đăng nhập, nhấn
  kết nối Drive cùng Zally, duyệt nội dung thử và quyết định thời điểm bật ghi/
  phát hành.

## 2. Lấy đúng source và chuẩn bị máy chủ

1. Xác nhận nhánh `arl-cms-backend` **đã có commit source mới** trước khi lấy;
   không giả định nhánh đã được push chỉ vì tài liệu này tồn tại trên máy phát
   triển. Ghi SHA triển khai, không merge/ghi vào `main` hoặc tự thay website cũ.
2. Dùng Node.js 22, pnpm và đúng `pnpm-lock.yaml`. Tại gốc dự án chạy:

   ```sh
   pnpm install --frozen-lockfile
   pnpm run cms:check
   pnpm exec tsc --noEmit
   ```

   Lệnh `cms:check` build cả client `dist/` lẫn SSR `cms-ssr/`; giữ hai thư
   mục này cùng `cms/server.mjs` khi chạy. Nếu lệnh lỗi, dừng triển khai.
3. Chuẩn bị HTTPS cho đúng hostname trên, reverse proxy **toàn bộ** website,
   `/cms`, `/api/*`, `/preview/*` và `/assets/*` vào Node. Đặt
   `ARL_HOST=127.0.0.1`, cổng Node không mở công khai. Proxy giữ đúng `Host`,
   không cache CMS/API/preview, cho body ít nhất 40 MB để tải video.
4. Tạo volume bền vững `ARL_DATA_DIR` chứa SQLite, release, quyền thành viên,
   tin nhắn; `ARL_BACKUP_DIR` ở volume/đích riêng. Chỉ một process CMS ghi vào
   cùng SQLite. Không xóa các volume khi deploy lại. Chuẩn bị lịch
   `pnpm run cms:backup`, bảo vệ backup vì có dữ liệu khách hàng và thử restore
   **trên staging riêng**.

## 3. Nhận bốn tệp/cấu hình riêng tư

Các đường dẫn dưới đây là **ví dụ**, không phải file có sẵn. Thay bằng đường
dẫn tuyệt đối trên máy chủ; quyền file chỉ cho process CMS và quản trị hệ thống.
Không đặt chúng dưới thư mục source, web root hay bản build công khai.

| Tệp | Cách sử dụng |
| --- | --- |
| JSON service account ARL CMS Sheets | `ARL_GOOGLE_CREDENTIALS`; `client_email` phải là `arl-cms-sheets@aihoc-467710.iam.gserviceaccount.com` |
| JSON OAuth **ARL CMS Drive PROD** | `ARL_DRIVE_OAUTH_CLIENT_FILE`; `web.client_id` phải là `368533702412-f5un57nmm8fv23h0ckm6dqlc50qgv8l0.apps.googleusercontent.com` |
| File token Drive riêng | `ARL_DRIVE_TOKEN_FILE`; ban đầu **chưa có file**, nhưng thư mục cha phải tồn tại và process CMS được ghi. Backend tạo file sau khi Zally cấp quyền |
| JSON danh sách email/quyền ARL đã duyệt | `ARL_ROLE_EMAIL_MAP_FILE`; giữ Danh và Hiếu ở nhóm `admin`; không dùng map demo hoặc `ARL_ROLE_MAP` theo Google `sub` nếu muốn quản lý thành viên trong CMS |

Không dùng JSON OAuth `ARL CMS Drive - Zally` của localhost, token localhost,
client n8n hoặc client Sign-In để thay JSON Drive PROD. Nếu JSON PROD chưa được
chủ tài khoản tải/cung cấp thì **dừng ở bước preflight Sheet**, chưa thể kết nối
Drive chính thức. Client ID công khai không thay được JSON chứa client secret.

## 4. Đặt đúng biến môi trường production

Đặt bằng secret manager hoặc cấu hình process manager, **không commit `.env`**.
Các đường dẫn `/secure/...` và `/var/...` chỉ minh họa cho máy Linux; Windows
hoặc nền tảng khác dùng đường dẫn tuyệt đối tương ứng.

```text
ARL_MODE=production
ARL_HOST=127.0.0.1
ARL_PORT=8787
ARL_SITE_URL=https://landing-page-arl.aihoc.ai.vn
ARL_GOOGLE_CLIENT_ID=368533702412-joa46jkpq8suh5prmqtac3cog9u5jtdm.apps.googleusercontent.com
ARL_GOOGLE_CREDENTIALS=/secure/arl-cms-sheets.json
ARL_CONTENT_SHEET_ID=1tYbCnkU7o3AQ9Qvkgs5BbF6Mxyz22U2MEE2-6ovkjU8
ARL_INQUIRIES_SHEET_ID=1d6e5zIyp0DzxB4L9DW4ZNYz8z1c8NIhamRzVEBzNxzk
ARL_OPERATIONS_SHEET_ID=1J5_U5x8eg1VXxMlmWs0yZ9Ce2b_JKiGn8bh1UBK5_AA
ARL_ROLE_EMAIL_MAP_FILE=/secure/arl-role-email-map.json
ARL_DATA_DIR=/var/lib/arl-cms
ARL_BACKUP_DIR=/var/backups/arl-cms
ARL_DRIVE_OAUTH_CLIENT_FILE=/secure/arl-cms-drive-prod.json
ARL_DRIVE_TOKEN_FILE=/secure/arl-cms-drive-token.json
ARL_DRIVE_OWNER_EMAIL=zally.aihoc@gmail.com
ARL_GOOGLE_CONTENT_WRITE_ENABLED=false
ARL_DRIVE_MEDIA_WRITE_ENABLED=false
```

Hai cờ `false` chỉ khóa **biên tập Content Sheet và tải media**. Chúng **không
biến toàn bộ server thành chỉ đọc**: khi CMS chạy, form liên hệ và nhật ký có
thể ghi vào `ARL_Inquiries`/`ARL_Operations`. Vì vậy chỉ chạy server với ba
Sheet chính sau khi đã sao lưu và chuẩn bị nghiệm thu. Muốn kiểm tra hoàn toàn
không ghi, dùng lệnh preflight ở bước 5 khi server chưa chạy.

## 5. Kiểm tra ba Sheet chính mà chưa ghi dữ liệu

1. Trên Google Drive, xác nhận ba file `Web ARL`, `ARL_Inquiries`,
   `ARL_Operations` thuộc Zally, quyền chung là **Restricted** và service
   account ở trên có quyền Người chỉnh sửa. Các bản tên `STAGING` không phải
   nguồn production. Không đặt tin nhắn khách hàng trong Sheet nội dung công
   khai.
2. Sao lưu **cả ba Sheet chính** vào nơi riêng tư trước khi bật server/ghi.
   Không chạy `pnpm run cms:bootstrap-google` trên các Sheet đã có dữ liệu.
3. Trên máy hosting, khi bốn biến `ARL_GOOGLE_CREDENTIALS` và ba Sheet ID ở
   bước 4 đã được nạp vào môi trường, chạy từ gốc dự án:

   ```sh
   pnpm run cms:check-official-sheets
   ```

   Kết quả đạt: Content đọc được 15 tab, các tab Inquiries/Operations đúng
   header, kết thúc bằng `Preflight hoàn tất`. Bất kỳ lỗi quyền/ID/schema nào:
   **dừng**, không bật cờ ghi. Lệnh này chỉ đọc, không phải bài test ghi.
4. Kiểm tra tab `Inquiries` của `ARL_Inquiries`: cột **S** dành cho `phone`.
   Hiện `S1` còn trống. Sau khi backup, chủ Sheet/hosting điền đúng `phone`
   vào `S1` và xác nhận không có dữ liệu khác ở cột này. Nếu cột S đã được
   dùng cho mục đích khác, dừng để sửa schema; không ghi đè.

## 6. Xác nhận hai OAuth client và kết nối Drive

1. Chủ Google Cloud xác nhận trong project AIHoc: client **Sign-In PROD** có
   Authorized JavaScript origin chính xác
   `https://landing-page-arl.aihoc.ai.vn`; client **Drive PROD** có Authorized
   redirect URI chính xác
   `https://landing-page-arl.aihoc.ai.vn/api/drive-oauth/callback`. Drive API
   đã bật; ứng dụng cho phép Zally sử dụng. Không sửa client/branding n8n.
   URI sai dù chỉ dấu `/` cũng có thể gây `redirect_uri_mismatch`.
2. Host nạp JSON **Drive PROD** và cấu hình đường dẫn token. Không sao chép
   `C:\Json\ARL-Drive-token.json` từ máy local. Khởi động hoặc restart CMS bằng
   `node cms/server.mjs` qua process manager. `/api/health` phải trả
   `mode: production`. Trước bản đăng đầu tiên, `active_release: null` là bình
   thường nhưng **website chưa sẵn sàng cho khách**.
3. Vào `/cms` bằng tài khoản admin ARL được duyệt. Mục “Kết nối kho ảnh của
   Zally” phải hiện trạng thái chưa kết nối. Admin bấm **Kết nối Google Drive**;
   ở màn hình Google chọn đúng `zally.aihoc@gmail.com`, đọc quyền `drive.file`
   rồi chính Zally chấp thuận. CMS phải quay lại và hiển thị “Đã kết nối:
   zally.aihoc@gmail.com”. Không gửi màn hình chứa authorization code/token
   cho người khác. Nếu có lỗi, kiểm tra domain, redirect URI, đúng client ID,
   quyền ghi thư mục cha của file token và log server (không in secret).
4. Kết nối Drive **chưa tải file nào**. Khi bật media sau UAT, CMS tạo thư mục
   **ARL CMS Media** riêng trong My Drive của Zally. Backend hiện **không tự
   dùng thư mục `ARL Web` có sẵn**; không gán ID thư mục đó vào SQLite hoặc
   yêu cầu quyền toàn bộ Drive. Nếu ARL muốn dùng chính `ARL Web`, cần thay
   luồng chọn thư mục bằng Google Picker và kiểm thử riêng trước khi triển khai.

Google xác định `drive.file` là quyền theo từng file ứng dụng tạo/chọn, không
phải quyền quản lý toàn bộ My Drive. Nếu project OAuth loại External vẫn ở
trạng thái Testing, refresh token có thể hết hạn sau 7 ngày; chủ project phải
quyết định cách vận hành lâu dài mà không làm ảnh hưởng các ứng dụng AIHoc
đang dùng.

## 7. Bật ghi và nghiệm thu có kiểm soát

Chỉ làm sau khi backup ba Sheet, preflight đạt, đăng nhập/quyền trên HTTPS
đạt, Drive hiển thị đã kết nối, và ARL đồng ý thử trên dữ liệu chính:

1. Bật `ARL_GOOGLE_CONTENT_WRITE_ENABLED=true`, restart CMS. Một admin/editor
   sửa **một mục được ARL chọn để thử**, lưu; đối chiếu đúng ô ở `Web ARL`.
   Chưa publish thì website khách đang xem **không đổi**. Không để người khác
   sửa cùng dòng trực tiếp trên Sheet trong lúc CMS lưu.
2. Gửi một form liên hệ thử có số điện thoại, kiểm tra CMS nhận đúng một tin
   và `ARL_Inquiries` có đúng một dòng tương ứng (cùng activity). Không dùng
   dữ liệu cá nhân thật để thử. Xử lý/xóa dòng thử theo quy trình ARL; kiểm
   tra `pending_inquiries` và lỗi trong `/api/status` bằng tài khoản có quyền.
3. Sau khi bước 1 đạt, bật `ARL_DRIVE_MEDIA_WRITE_ENABLED=true`, restart CMS.
   Tải **một ảnh/video thử đã được phép công bố** lên một sản phẩm được chọn.
   Kiểm tra file thuộc thư mục `ARL CMS Media` của Zally và `Media`/`Products`
   trong `Web ARL` có liên kết đúng. Nếu Drive tải thành công nhưng Sheet ghi
   lỗi, kiểm tra file dư trước khi tải lại. Không chép ảnh của Sheet STAGING
   sang Sheet chính nếu ARL chưa duyệt.
4. Chạy kiểm tra nội dung → tạo bản xem trước → ARL xem lại Việt/Anh → người
   có quyền duyệt mới bấm đăng. Kiểm tra `/`, `/contact`, trang sản phẩm,
   ảnh/video, `/api/content` và rollback. **Không publish một bản thử chưa
   được ARL duyệt.** Đối chiếu tab `ARL_Operations` có job/release/audit mới.

Nếu bất kỳ bước nào thất bại: dừng thao tác, xem `source_error`,
`operations_error`, job error trong `/api/status` và log không chứa secret;
tắt lại hai cờ ghi nếu cần, giữ backup và website cũ. Không xóa hàng Sheet,
file Drive hoặc phục hồi đè production khi chưa xác định chính xác dữ liệu
bị ảnh hưởng. Chỉ chuyển DNS sau khi ARL ký nhận toàn bộ checklist trong
[`../DEPLOY_BEFORE_HOSTING.md`](../DEPLOY_BEFORE_HOSTING.md).

Nguồn Google: [OAuth web-server redirect URI](https://developers.google.com/identity/protocols/oauth2/web-server),
[quyền `drive.file`](https://developers.google.com/workspace/drive/api/guides/api-specific-auth),
[refresh token ở trạng thái Testing](https://developers.google.com/identity/protocols/oauth2).

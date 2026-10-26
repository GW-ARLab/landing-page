# OAuth của ARL: bàn giao backend

Tài liệu này chỉ mô tả cấu hình đăng nhập CMS và quyền tải media lên Drive. Đội
hosting sẽ triển khai HTTPS và đặt biến môi trường; không cần cấp quyền hosting
cho người phát triển backend. Không đưa client secret, JSON credentials,
authorization code hoặc refresh token vào Git/chat.

## URL chính thức

`ARL_SITE_URL=https://landing-page-arl.aihoc.ai.vn`

Hai Client ID production đã được chủ project cung cấp ngày 26/10/2026:

| Mục đích | Client ID |
| --- | --- |
| CMS Sign-In | `368533702412-joa46jkpq8suh5prmqtac3cog9u5jtdm.apps.googleusercontent.com` |
| Drive của Zally | `368533702412-f5un57nmm8fv23h0ckm6dqlc50qgv8l0.apps.googleusercontent.com` |

Đội hosting đặt `ARL_GOOGLE_CLIENT_ID` bằng **CMS Sign-In** ở trên. File JSON
được đặt tại `ARL_DRIVE_OAUTH_CLIENT_FILE` phải có `web.client_id` bằng **Drive
của Zally** ở trên; không dùng nhầm JSON của client Sign-In hoặc bản thử local.
Client ID không phải Client Secret. Vẫn phải kiểm tra các URI đã được **Save**
trong Google Cloud và thử luồng thật trên HTTPS trước khi đưa vào hoạt động.

Backend từ chối HTTP trong `ARL_MODE=production`. Giá trị này phải khớp chính
xác origin mà khách và nhân viên truy cập, không có `/cms`, đường dẫn hay query.
Nếu đội hosting đổi hostname, phải sửa cả biến môi trường và cấu hình Google
Cloud trước khi dùng.

## Ba Google Sheet chính thức

Ngày 27/10/2026, ARL đã cấp `arl-cms-sheets@aihoc-467710.iam.gserviceaccount.com`
quyền **Người chỉnh sửa** trên đúng ba workbook dưới đây. Đã xác nhận lại quyền
và kiểm tra service account đọc được cả ba; Content Sheet có đủ 15 tab và không
có lỗi schema. Chưa thử ghi dữ liệu thật vào các Sheet chính thức.

| Biến backend | Workbook chính thức | ID |
| --- | --- | --- |
| `ARL_CONTENT_SHEET_ID` | Web ARL | `1tYbCnkU7o3AQ9Qvkgs5BbF6Mxyz22U2MEE2-6ovkjU8` |
| `ARL_INQUIRIES_SHEET_ID` | ARL_Inquiries | `1d6e5zIyp0DzxB4L9DW4ZNYz8z1c8NIhamRzVEBzNxzk` |
| `ARL_OPERATIONS_SHEET_ID` | ARL_Operations | `1J5_U5x8eg1VXxMlmWs0yZ9Ce2b_JKiGn8bh1UBK5_AA` |

Đặt `ARL_GOOGLE_CREDENTIALS` trỏ tới JSON của service account qua secret
storage trên máy chủ. Không dùng ID của các workbook có `STAGING` trong tên.
Sau khi đặt bốn biến trên, chạy `pnpm run cms:check-official-sheets` **trước
khi** bật ghi; lệnh chỉ đọc và từ chối nhầm ID. Không chạy
`pnpm run cms:bootstrap-google` trên các workbook này vì chúng đã có dữ liệu.

Trong bản staging, ảnh thumbnail thử của Workflow Agent và một dòng Media mới
khác bản chính. ARL đã chọn **giữ Content Sheet chính nguyên trạng**, không chép
ảnh thử sang. Tab `Inquiries` chính hiện chưa có tiêu đề `phone` ở cột S; backend
sẽ thêm đúng tiêu đề này khi đồng bộ tin nhắn đầu tiên, và từ chối nếu cột S đã
có nội dung khác. Trước khi bật ghi chính thức, kiểm tra lại cột S và sao lưu
ba Sheet. `ARL_GOOGLE_CONTENT_WRITE_ENABLED=true` chỉ bật khi đội hosting sẵn
sàng cho CMS sử dụng các Sheet chính thức; không trỏ bản thử localhost đang chạy
vào các workbook này.

## Hai Web OAuth client khác nhau

1. **ARL CMS Sign-In**: dùng Google Identity Services để nhân viên đăng nhập.
   Trong Google Cloud đặt Authorized JavaScript origin là
   `https://landing-page-arl.aihoc.ai.vn`. Luồng hiện tại dùng JavaScript
   callback, nên không cần Authorized redirect URI cho client này. Chỉ Client
   ID được đưa vào `ARL_GOOGLE_CLIENT_ID`; backend xác minh chữ ký, audience,
   issuer và email đã xác minh, rồi đối chiếu danh sách phân quyền.
2. **ARL CMS Drive**: client Web application riêng cho Zally cấp quyền
   `drive.file`. Authorized redirect URI phải là
   `https://landing-page-arl.aihoc.ai.vn/api/drive-oauth/callback`.
   JSON của client nằm ngoài dự án tại `ARL_DRIVE_OAUTH_CLIENT_FILE`; refresh
   token được lưu ở đường dẫn riêng `ARL_DRIVE_TOKEN_FILE`. Hai tệp không được
   đặt trong thư mục phục vụ web. `ARL_DRIVE_OWNER_EMAIL=zally.aihoc@gmail.com`.
   Chỉ quản trị viên CMS được bắt đầu kết nối; chỉ Google account Zally được
   chấp nhận ở callback. Sau khi triển khai HTTPS, Zally phải cấp quyền một lần
   trên chính URL production; token của client local không thay thế được token
   của client production mới.

### Các bước Google Cloud do chủ tài khoản làm thủ công

1. Đăng nhập [Google Cloud Console](https://console.cloud.google.com/) bằng
   tài khoản có quyền trong project AIHoc, chọn đúng project (ID hiện dùng:
   `aihoc-467710`). Nếu Cloud hiện màn hình yêu cầu đồng ý điều khoản, chủ
   tài khoản tự đọc và quyết định; không nhờ người khác bấm hộ.
2. Mở **Google Auth Platform → Clients → Create client**. Chọn **Web
   application**, tên `ARL CMS Sign-In PROD`. Ở **Authorized JavaScript
   origins**, thêm đúng `https://landing-page-arl.aihoc.ai.vn`. Để
   **Authorized redirect URIs** trống cho client này. Tạo xong, chỉ chuyển
   **Client ID** cho đội backend/hosting; không cần đưa Client Secret của
   client Sign-In vào mã nguồn.
3. Lặp lại **Create client → Web application**, tên `ARL CMS Drive PROD`.
   Trong **Authorized redirect URIs**, thêm đúng
   `https://landing-page-arl.aihoc.ai.vn/api/drive-oauth/callback` (không có
   dấu `/` cuối). Có thể để JavaScript origins trống vì luồng này chuyển hướng
   trên server. Tải JSON của client này và lưu riêng tư, khác file client bản
   thử. Chuyển cho đội hosting qua kênh bảo mật/secret manager, không qua chat.
4. Ở **APIs & Services → Enabled APIs & services**, xác nhận **Google Drive
   API** đã bật. Ở **Google Auth Platform → Data Access**, chỉ thêm
   `https://www.googleapis.com/auth/drive.file` nếu giao diện yêu cầu khai báo
   scope cho luồng Drive; không dùng quyền toàn bộ Drive. Nếu app vẫn ở
   **Testing**, kiểm tra **Audience → Test users** có
   `zally.aihoc@gmail.com` trước khi thử cấp quyền.
5. Không sửa **Branding**, **Audience publishing status**, client n8n, client
   `ARL CMS local` hoặc `ARL CMS Drive - Zally` trong project AIHoc dùng chung.
   Nếu muốn đổi tên ứng dụng hiển thị từ n8n sang ARL, cần xử lý bằng project
   riêng thay vì đổi branding của project đang dùng chung.

Không sửa/xóa client `n8n`, `ARL CMS local` hay client Drive đang dùng ở bản
thử. Nếu tạo client mới **trong cùng Google Cloud project AIHoc**, màn hình
đồng ý OAuth vẫn dùng branding chung của project (hiện có thể hiện `n8n`).
Muốn tên ứng dụng riêng của ARL mà không ảnh hưởng n8n, cần project Google
Cloud riêng; đây là quyết định của chủ project, không giải quyết được bằng đổi
tên client.

## Biến môi trường và quyền

- `ARL_MODE=production`, `ARL_SITE_URL` như trên, `ARL_GOOGLE_CLIENT_ID` là
  client Sign-In production.
- `ARL_ROLE_EMAIL_MAP_FILE` trỏ tới danh sách email/quyền **production** nằm
  ngoài thư mục web. Theo xác nhận ARL ngày 27/10/2026, cả Phan Công Danh và
  Vũ Ngọc Hiếu (`vnh2222@gmail.com`) được giữ quyền `admin`. Backend cho
  admin biên tập, đăng website và xử lý tin nhắn. Đây là quyết định quyền
  production, không còn là quyền thử tạm thời.
- Nếu bật tải media Drive, cấu hình ba biến `ARL_DRIVE_OAUTH_CLIENT_FILE`,
  `ARL_DRIVE_TOKEN_FILE`, `ARL_DRIVE_OWNER_EMAIL` nêu trên và bật
  `ARL_DRIVE_MEDIA_WRITE_ENABLED=true` **sau** khi thử cấp quyền và tải ảnh/video.
- Service account cho Google Sheets dùng `ARL_GOOGLE_CREDENTIALS`, **không phải**
  một trong hai Web OAuth client trên. Chỉ chia sẻ đúng các workbook cần dùng.

Google Cloud phải bật Drive API cho luồng Drive. Với ứng dụng External ở trạng
thái Testing, refresh token có quyền Drive có thể hết hạn sau 7 ngày; không coi
đây là cấu hình vận hành dài hạn. Không đổi trạng thái/branding của project
AIHoc dùng chung nếu chưa đánh giá ảnh hưởng đến n8n.

## Kiểm tra trước bàn giao

1. Đăng nhập bằng email được duyệt và thử email ngoài danh sách; email ngoài
   danh sách phải nhận 403. Thử quyền editor/publisher/admin riêng.
2. Kiểm tra cookie phiên `HttpOnly`, `Secure`, `SameSite=Strict` qua HTTPS;
   mọi API sửa dữ liệu phải kiểm tra Origin và CSRF.
3. Trên CMS admin, xác nhận redirect URI Drive hiển thị đúng; Zally cấp quyền,
   kiểm tra trạng thái, tải một media thử vào Sheet/media thử. Không đưa token
   hoặc dữ liệu khách hàng thật vào môi trường thử.
4. Chạy `pnpm run cms:check`, rồi kiểm tra toàn bộ trên staging HTTPS trước
   khi thay website cũ.

Nguồn Google: [Google Identity Services setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid),
[OAuth web-server flow](https://developers.google.com/identity/protocols/oauth2/web-server),
[refresh token ở trạng thái Testing](https://developers.google.com/identity/protocols/oauth2).

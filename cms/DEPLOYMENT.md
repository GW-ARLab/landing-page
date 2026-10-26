# ARL CMS: triển khai và bàn giao

Checklist ngắn cho đội hosting trước khi nhận source và chuyển DNS nằm ở
[`../DEPLOY_BEFORE_HOSTING.md`](../DEPLOY_BEFORE_HOSTING.md). Hãy đọc tài liệu đó
trước; phần dưới giải thích chi tiết kỹ thuật và một số bước thử local.
Quy trình kết nối **ba Sheet chính thức và Drive Zally** theo thứ tự an toàn
nằm ở [`HOSTING_GOOGLE_LIVE.md`](HOSTING_GOOGLE_LIVE.md).

## Trạng thái

Bản local đã có website SSR song ngữ, 15 bảng nội dung, giao diện biên tập các trường nội dung phổ biến, candidate/preview/publish/rollback,
role-based CMS, form liên hệ riêng tư, hộp thư xử lý yêu cầu, xử lý media, audit,
sao lưu và kiểm thử tích hợp.
Google Sign-In và OAuth Drive đã được thử trên localhost; Google Sheets/Drive,
reverse proxy HTTPS, backup ngoài máy và UAT production **chưa được kiểm chứng**
đầy đủ. Không bật production khi các mục dưới đây chưa hoàn tất. Cấu hình OAuth
riêng cho domain chính thức được tóm tắt trong
[`OAUTH_BACKEND_HANDOFF.md`](OAUTH_BACKEND_HANDOFF.md).

## Chạy local

Yêu cầu Node.js 22 trở lên và pnpm. Tại thư mục dự án:

```powershell
pnpm install
pnpm run cms:check
pnpm run cms:dev
```

Mở `http://127.0.0.1:8787/cms`. Chọn **Biên tập nội dung**, chọn nhóm và mục,
sửa trường tiếng Việt/tiếng Anh rồi **Lưu bản nháp**. CMS kiểm tra dữ liệu trước
khi lưu; nếu nguồn đã được thay đổi bởi phiên khác, tải lại rồi kiểm tra trước
khi sửa tiếp. Sau đó chọn Editor để Validate và tạo candidate, xem Preview,
rồi chọn Publisher để Publish. Lưu bản nháp không thay đổi website đang hiển thị.
Trong nhóm **Sản phẩm**, người biên tập có thể chọn JPEG/PNG/WebP tối đa 10 MB,
nhập mô tả ảnh Việt/Anh, ghi nguồn/quyền sử dụng, xác nhận quyền công bố rồi
**Tải ảnh và lưu bản nháp**. Ảnh được chuẩn hóa WebP, lưu riêng tại `cms-data/media/`
(hoặc `ARL_LOCAL_MEDIA_DIR`), và được sao lưu cùng CMS; ảnh live không đổi cho
đến khi tạo preview rồi publisher duyệt đăng. Mỗi lần tải ảnh mới chỉ thay liên
kết ảnh của sản phẩm; bản phát hành cũ vẫn giữ ảnh cũ để rollback.
Người biên tập hoặc quản trị có thể mở **Tạo sản phẩm mới** tại `/cms`, điền
tên/mô tả Việt–Anh, đường dẫn, trạng thái, nút liên hệ, danh mục và tùy chọn
hiển thị ở trang chủ. Có thể chọn ảnh ngay khi tạo (kèm mô tả Việt–Anh và
xác nhận quyền công bố), hoặc chọn sản phẩm sau khi lưu để tải ảnh về sau.
Sản phẩm mới chỉ hiện trên website khi bản xem trước được duyệt
đăng; đường dẫn không thể đổi bằng biểu mẫu sau khi tạo. Khi nguồn là Google
Sheets, lưu nội dung và tạo sản phẩm chỉ hoạt động sau khi bật
`ARL_GOOGLE_CONTENT_WRITE_ENABLED=true` và đã kiểm thử quyền ghi.
Giao diện chưa hỗ trợ xóa mục, sửa các ảnh ngoài thẻ sản phẩm, quan hệ,
trạng thái biên tập và dữ liệu pháp lý cần xác nhận. Khi nguồn là Google Sheets,
CMS hỗ trợ lưu các trường được liệt kê trong `cms/editor.mjs`; các trường khác
vẫn cần xử lý trong workbook đã phân quyền. Không xem giao diện local là đăng nhập thật.
Chỉ dùng vai trò giả lập này trên `127.0.0.1`; production không nhận `X-ARL-User`.
Website: `http://127.0.0.1:8787/`; dữ liệu/phiên bản local: `cms-data/`.
Để xem tin nhắn thử, chọn vai trò **Xử lý liên hệ** ở `/cms`; để xóa tin nhắn
thử, chọn **Admin**. Sau khi sửa mã nguồn CMS, dừng và khởi động lại server Node
đang chạy rồi tải lại trang. Không dùng tin nhắn khách hàng thật trên local.

### Thử đăng nhập Google trên local, vẫn dùng dữ liệu local

Với OAuth Web Client ID `ARL CMS local`, thêm `http://localhost` và
`http://localhost:8790` vào Authorized JavaScript origins. Không cần Client
Secret cho nút đăng nhập này. Để giữ nguyên CMS đang chạy ở cổng 8787,
chạy bản thử riêng trong PowerShell:

```powershell
& '.\cms\start-google-local.ps1'
```

Mở `http://localhost:8790/cms` (không dùng `127.0.0.1` cho phép thử này).
Trong chế độ này ô chọn vai trò biến mất, người dùng phải đăng nhập đúng Google
account được duyệt; `X-ARL-User` không cấp quyền. Dữ liệu vẫn là local, chưa gửi
Sheets/Drive. Script sao chép nguồn vào một thư mục demo mới và không dừng hay
sửa server 8787. Nếu cổng 8790 đang dùng, không dừng tiến trình đó; chọn cổng
trống khác và thêm origin tương ứng vào client ARL trước khi chạy script với
`-Port <số-cổng>`. Không bật
chế độ này trên host công khai hoặc dùng dữ liệu khách hàng thật. Việc thử Google
Identity Services trên HTTP chỉ dành cho `localhost`; production cần HTTPS.

ARL đã xác nhận giữ quyền quản trị của Hiếu. Tệp phân quyền gốc trong
`cms-data/ARL_Role_Email_Map.local.json` có cả Danh và Hiếu trong nhóm `admin`.
Tham số `-GrantVnhAdminForTest` của script demo chỉ còn để tương thích với bản
phân quyền cũ; không cần dùng tham số này để Hiếu có quyền quản trị.

## Chuẩn bị dữ liệu và quyền Google

1. ARL đã tạo **ba workbook chính thức riêng**: `Web ARL` (nội dung),
   `ARL_Operations` (nhật ký) và `ARL_Inquiries` (liên hệ riêng tư). Dùng đúng
   ID ở [`OAUTH_BACKEND_HANDOFF.md`](OAUTH_BACKEND_HANDOFF.md), không tạo lại hoặc
   dùng bản `STAGING`; không đặt form liên hệ trong workbook công khai.
2. Tạo Google Cloud project, bật Sheets API và Drive API. Tạo service account và
   cấp quyền truy cập đúng ba workbook cùng các file Drive media/body. Lưu JSON
   credential ở secret store/đường dẫn chỉ server đọc, không đưa vào Git.
3. Tạo OAuth Web Client cho hostname HTTPS của website; thêm Authorized JavaScript
   Origin. Cấu hình `ARL_ROLE_EMAIL_MAP_FILE` trỏ tới tệp JSON riêng tư theo danh
   sách email đã được ARL duyệt (bản local chuẩn bị sẵn trong `cms-data/`), hoặc
   dùng `ARL_ROLE_EMAIL_MAP` nếu môi trường triển khai quản lý secret dạng biến,
   hoặc `ARL_ROLE_MAP` nếu đã biết Google `sub`. Với danh sách email, server chỉ
   nhận email Gmail/Workspace được Google xác thực, gắn email với `sub` sau lần
   đăng nhập đầu và từ đó kiểm tra đúng `sub` của tài khoản ấy. Khi thay tài khoản,
   quản trị viên phải xác minh rồi cập nhật binding; không chia sẻ một tài khoản
   Google cho nhiều người. Chỉ người nằm trong nhóm `publisher` mới được
   publish/rollback. Danh và Hiếu nằm trong nhóm `admin`; quyền này cũng bao
   gồm biên tập, publish/rollback và xử lý liên hệ. Danh còn được liệt kê riêng
   trong `publisher` và `inquiries`. Khi dùng email map và Google Sign-In, cả
   Danh và Hiếu thấy mục **Phân quyền thành viên** tại `/cms`. Quản trị viên chỉ
   có thể thêm email Google mới với ít nhất một quyền `editor`, `publisher` hoặc
   `inquiries`, cũng như đổi các quyền này cho thành viên; không thể cấp hay đổi
   quyền `admin` tại đây. Khi bỏ cả ba quyền, người đó không còn vào được CMS.
   Email mới chỉ đăng nhập được sau khi Google xác minh đúng email ấy; không có
   quyền Google Sheets/Drive chỉ vì được thêm vào CMS. Các thay đổi được ghi vào SQLite
   trong `ARL_DATA_DIR` cùng nhật ký và có hiệu lực ở lần gọi API tiếp theo.
   Thành viên nên tải lại CMS để cập nhật giao diện. Sao lưu/khôi phục SQLite
   cùng dữ liệu CMS; không xóa volume này khi triển khai lại. Không cấu hình
   `ARL_ROLE_MAP` theo Google `sub` nếu muốn dùng màn hình quản lý quyền này.
   Quyền chia sẻ trên Google Sheets/Drive vẫn phải quản lý riêng trong Google.
4. Trên workbook trống, chạy `pnpm run cms:bootstrap-google` **một lần** sau khi
   đặt biến môi trường. Script dừng nếu tab đã có dữ liệu. Kiểm tra lại các tab,
   header, định dạng cột và quyền chia sẻ trước khi cho editor dùng.
   Workbook `ARL_Inquiries` cần hai tab `Inquiries` (19 cột, gồm `updated_at`,
   `consent_version`, `consent_text`, `phone`)
   và `Inquiry_Activities` (6 cột). Nếu đã có workbook từ bản cũ, thêm tab/cột
   bằng tay sau khi sao lưu; không chạy lại bootstrap trên workbook có dữ liệu.
5. Trong Apps Script gắn với `ARL_Content`, dán `cms/google-sheets-menu.gs`;
   mở lại workbook, chọn `ARL CMS → Cấu hình URL CMS`. Menu cấp ID cho dòng đang
   chọn; thao tác Validate/Preview/Publish nằm trong CMS web và yêu cầu Google login.

Email liên hệ `zally.aihoc@gmail.com` và thời gian phản hồi 1–2 ngày làm việc
đã được ARL xác nhận và cập nhật trong seed local. Bốn leader đã được nhập vào
`Members` dưới dạng chỉ có tên; chưa tự đặt chức danh, tiểu sử hoặc ảnh.
Các trang chính sách/điều khoản trong seed vẫn có `needs_confirmation: true`:
bản mới trong `11_Chinh_sach_va_Hinh_anh.zip` đã được ARL xác nhận về nội dung,
nhưng trước khi phát hành còn phải điền đơn vị vận hành, địa chỉ,
thông báo cấu hình xử lý dữ liệu và ngày hiệu lực theo thông tin thật.
Để xem bốn bản pháp lý trong ZIP mà không thay đổi bản live, chạy
`pnpm run cms:import-legal-drafts`. Script tạo
`cms/local/ARL_Legal_Draft.json` từ bốn file Việt–Anh ở thư mục ZIP đã giải nén,
điền email liên hệ đã xác nhận và áp dụng phần ARL mới duyệt: số điện thoại
bắt buộc trong chính sách bảo vệ dữ liệu cá nhân (bản đề xuất ARL PP 1.3).
Script giữ các placeholder chưa có dữ kiện và gắn
`legal_draft_status=pending_facts`. Chạy một CMS local riêng với
`ARL_LOCAL_CONTENT_PATH` trỏ vào JSON này và `ARL_DATA_DIR` riêng; tạo candidate
để xem `/preview/<candidate-id>/privacy-policy` và
`/preview/<candidate-id>/en/privacy-policy` tương ứng.
Candidate pháp lý này bị chặn publish cho tới khi ARL cung cấp dữ kiện thật,
kiểm tra thông báo cấu hình và quyết định ngày hiệu lực. Không nhập ZIP trực tiếp
vào bản đang phục vụ khách.
Danh sách email/quyền CMS đã duyệt ở `cms-data/ACCESS_ROSTER.local.md` (riêng tư).
Google Sign-In đã được thử trên localhost; production vẫn cần đội hosting cấu hình
client HTTPS và kiểm thử đăng nhập thực tế trước khi mở cho người dùng.
Ảnh/tài liệu chỉ được xuất bản khi `visibility=public_approved`, có quyền sử dụng
và alt Việt/Anh. Với body Markdown, đặt `body_vi_file_id`/`body_en_file_id` bằng
Google Drive file ID. Cú pháp media: `![Mô tả](media:M_...)`.

## Biến môi trường production

| Biến | Ý nghĩa |
| --- | --- |
| `ARL_MODE=production` | Tắt role giả lập và bắt buộc cấu hình thật |
| `ARL_HOST=127.0.0.1` | Chỉ reverse proxy trên cùng host truy cập trực tiếp |
| `ARL_PORT=8787` | Cổng ứng dụng |
| `ARL_SITE_URL=https://your-domain.example` | Canonical URL và kiểm tra Origin |
| `ARL_GOOGLE_CREDENTIALS` | Đường dẫn tuyệt đối tới service-account JSON |
| `ARL_GOOGLE_CLIENT_ID` | OAuth Web Client ID cho Google Sign-In |
| `ARL_CONTENT_SHEET_ID` | ID workbook biên tập |
| `ARL_GOOGLE_CONTENT_WRITE_ENABLED=true` | Chỉ bật sau khi thử trên workbook sao chép và cấp quyền service account; cho phép CMS sửa từng ô và thêm sản phẩm trong Content Sheet. Mặc định tắt. |
| `ARL_DRIVE_OAUTH_CLIENT_FILE` | Đường dẫn tuyệt đối tới JSON của OAuth Web client **riêng** cho Drive, ngoài repo; không dùng client Google Sign-In CMS. |
| `ARL_DRIVE_TOKEN_FILE` | Đường dẫn tuyệt đối tới tệp refresh token sẽ được tạo sau khi Zally cấp quyền, ngoài repo và khác file client. |
| `ARL_DRIVE_OWNER_EMAIL` | Email Google phải cấp quyền Drive, hiện dự kiến `zally.aihoc@gmail.com`. |
| `ARL_DRIVE_MEDIA_WRITE_ENABLED=true` | Bật tải ảnh Google-source sau khi OAuth, Drive API và bản sao Content Sheet đã kiểm thử; mặc định tắt. |
| `ARL_OPERATIONS_SHEET_ID` | ID workbook nhật ký |
| `ARL_INQUIRIES_SHEET_ID` | ID workbook liên hệ riêng tư |
| `ARL_ROLE_EMAIL_MAP_FILE` | Đường dẫn tuyệt đối tới JSON phân quyền email riêng tư; ưu tiên khi có |
| `ARL_ROLE_EMAIL_MAP` | Thay thế cho file: JSON email được duyệt theo vai trò, ví dụ `{"editor":["user@gmail.com"],"publisher":[],"admin":[],"inquiries":[]}` |
| `ARL_ROLE_MAP` | Tùy chọn thay thế: JSON Google `sub` theo vai trò; không cần nếu đã dùng email map |
| `ARL_DATA_DIR` | Volume bền vững cho SQLite, candidates, releases |
| `ARL_BACKUP_DIR` | Volume/đích backup tách khỏi `ARL_DATA_DIR` |

Ghi nội dung từ CMS vào Google Sheets hiện là tính năng **opt-in**. Khi chưa bật
biến trên, CMS vẫn đọc nguồn Sheet để kiểm tra/xem trước nhưng không cho sửa
trực tiếp. Trước khi bật trên dữ liệu thật, thử với một bản sao workbook và tài
khoản dịch vụ chỉ được chia sẻ đúng workbook đó. CMS chỉ ghi các ô được chỉnh
hoặc thêm dòng vào các tab liên quan, không ghi đè toàn bộ workbook; tuy nhiên
Google Sheets không cung cấp điều kiện compare-and-swap giữa lần đọc và lần ghi.
Vì vậy giai đoạn đầu cần một tiến trình CMS ghi dữ liệu và tránh sửa trực tiếp
cùng dòng trên Sheet trong lúc CMS lưu. Tải ảnh lên My Drive là tính năng
**opt-in**, độc lập Google Sign-In nhân viên. Trên client OAuth Drive mới, đặt
Authorized redirect URI đúng bằng `${ARL_SITE_URL}/api/drive-oauth/callback`
(ví dụ `http://localhost:8791/api/drive-oauth/callback` khi site chạy trên
`http://localhost:8791`). Cần bật Google Drive API; quyền yêu cầu là `openid`,
`email`, `https://www.googleapis.com/auth/drive.file`. Không sửa client
`ARL CMS local`/`n8n`. Lưu client secret và refresh token ngoài repo, không đưa
vào chat, GitHub hoặc bản sao lưu công khai. CMS chỉ chấp nhận tài khoản đúng
`ARL_DRIVE_OWNER_EMAIL`, chỉ quản trị viên đăng nhập Google thật được mở luồng
cấp quyền; vai trò giả lập local bị từ chối.

Khi bật `ARL_DRIVE_MEDIA_WRITE_ENABLED=true` và Zally đã cấp quyền, lần tải ảnh
đầu tiên sẽ tạo thư mục **ARL CMS Media - TEST** ở gốc My Drive (production:
**ARL CMS Media**), không động tới thư mục `ARL Web` có sẵn. Ảnh được chuyển
WebP, tải lên Drive, đọc lại kiểm tra, rồi mới ghi Media + liên kết Products vào
**Content Sheet đang cấu hình**; website live vẫn chỉ đổi sau khi xuất bản.
Nếu ghi Sheet lỗi sau khi ảnh đã lên Drive, file chưa được gắn vào sản phẩm và
cần kiểm tra file dư trước khi tải lại. Muốn dùng thư mục `ARL Web` có sẵn cần
thêm luồng chọn thư mục bằng Google Picker hoặc di chuyển thư mục CMS tạo vào
đó bằng giao diện Drive sau khi kiểm thử. Với OAuth project loại External ở
trạng thái Testing, refresh token cho quyền Drive thường hết hạn sau 7 ngày;
chưa coi đây là cấu hình production lâu dài.

Chạy `pnpm run build` rồi `pnpm run cms:dev` dưới process manager.
Reverse proxy phải terminate HTTPS, không public cổng 8787, chỉ phục vụ qua app;
không mount `cms-data` hay service-account JSON làm static. Bảo đảm đồng bộ giờ,
giới hạn truy cập `/cms`, cập nhật Node và thư viện, có monitoring cho `/api/health`
và `operations_error`/`source_error` trong `/api/status`. Cấu hình backup hằng ngày
`pnpm run cms:backup`; định kỳ thử khôi phục trên staging riêng.

## Sao lưu và khôi phục

Backup chứa snapshot `ARL_Content.json`, SQLite online backup, toàn bộ release,
ảnh nguồn local (nếu có) và manifest hash; script kiểm tra ảnh, hash và SQLite
integrity. Private inquiries nằm
trong SQLite backup: giữ backup mã hoá, hạn chế quyền, có chính sách lưu/xoá và
không công bố file. Khi khôi phục, **dừng app trước**, sao chép SQLite và thư mục
`releases` từ backup vào đúng `ARL_DATA_DIR` gốc hoặc cập nhật đường dẫn `releases.path`
trong database. Với bản local, phục hồi cả `ARL_Content.json` vào đường dẫn nguồn
đang cấu hình và thư mục `media` vào `ARL_LOCAL_MEDIA_DIR` (mặc định
`cms-data/media/`), rồi khởi động staging để kiểm tra `/api/health`, trang chủ, các
route và rollback. Đồng bộ Google Content theo snapshot trước khi publish tiếp.
Không phục hồi một bản backup cũ vào production nếu nó có thể tái tạo lại dữ liệu
liên hệ đã được yêu cầu xoá; xử lý yêu cầu xoá theo quy trình bảo mật riêng.

## Cổng nghiệm thu production

Chỉ chuyển DNS/ra mắt sau khi: (1) ARL xác nhận nội dung pháp lý/liên hệ/thành viên;
(2) Google API và quyền 3 workbook/Drive kiểm thử thực tế; (3) Google login và
publisher allowlist được thử bằng tài khoản có/không có quyền; (4) form đi vào
workbook private đúng một lần, retry và xoá dữ liệu được thử; (5) preview/publish/
rollback, SEO/sitemap/redirect, ảnh/PDF, backup/restore, mobile accessibility và
performance được UAT trên staging HTTPS; (6) ARL chấp thuận phát hành.

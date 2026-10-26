# Kiểm thử nghiệm thu ARL CMS

`pnpm run cms:check` chạy build client/SSR và bài test tích hợp trên HTTP local.
Nó kiểm tra quyền editor/publisher, candidate/preview, cô lập nội dung draft,
nguồn đổi sau preview, publish route mới, tối ưu media, form idempotency,
đồng bộ private local và rollback. `pnpm exec tsc --noEmit` kiểm tra TypeScript.

| Nhóm | Local | Production/staging HTTPS |
| --- | --- | --- |
| Tạo candidate, hash, preview, publish, rollback | Tự động | Chưa kiểm thử |
| Nội dung song ngữ, 28 URL, SEO, 404/redirect | Tự động + trình duyệt (đổi ngôn ngữ) | Chưa kiểm thử |
| Draft không lọt bản live | Tự động | Chưa kiểm thử |
| Media approved, chuyển WebP, từ chối file không hợp lệ | Tự động một phần | Chưa kiểm thử Drive |
| OAuth Drive riêng của Zally, tạo folder thử, tải/đọc lại ảnh/video, ghi Media + Products vào Content Sheet | Kiểm thử giả lập Google API và Sheet; người dùng đã xác nhận kết nối/tải ảnh trên localhost | Chưa thử OAuth và tải media qua domain production; không bật production trước UAT |
| Form lưu bền, idempotency, giới hạn tốc độ, privacy, lưu câu và phiên bản đồng ý | Tự động một phần | Chưa kiểm thử Sheets thật |
| Hộp thư liên hệ: chỉ role phù hợp được xem, lọc, phân công, ghi chú, xóa | Tự động qua HTTP local; giao diện cần người dùng duyệt | Chưa kiểm thử Google Sheet thật |
| Google login, role allowlist, CSRF, quyền workbook | Test tự động chặn header vai trò giả lập vượt quyền; người dùng đã đăng nhập Google thật và thử vai trò admin trên localhost | Chưa kiểm thử trên HTTPS production |
| Quản trị phân quyền thành viên | Đã thử API Google-local với phiên giả lập; người dùng đã thử giao diện admin trên localhost | Chưa kiểm thử trên HTTPS production |
| Backup toàn bộ releases, integrity | Tự động/thủ công | Chưa thử restore trên staging |
| Bản nháp chính sách/điều khoản Việt–Anh từ ZIP, cảnh báo placeholder, chặn publish | Đã xem 4 route preview local và thử chặn publish tự động | Chưa nghiệm thu nội dung cuối cùng |
| CSS/JS tải đúng, hydration, menu CMS | Trình duyệt + kiểm thử HTTP; không còn lỗi console ở trang chủ | Chưa kiểm thử đa trình duyệt |
| Trình duyệt/màn hình nhỏ, bàn phím, WCAG, tốc độ | Chưa đủ kiểm thử | Chưa kiểm thử |

Các ô “chưa kiểm thử” không phải là mục đã đạt. Không dùng bản local làm bằng chứng
cho tích hợp Google hay việc sẵn sàng lên production.

Lưu ý: dữ liệu thử trong `cms-data/` không được công khai. Sau khi thêm hộp thư,
`ARL_Inquiries.local.json` và `ARL_Inquiry_Activities.local.json` là bản sao
local của Sheet riêng tư; thao tác xóa trên CMS không tự xóa các bản backup cũ.

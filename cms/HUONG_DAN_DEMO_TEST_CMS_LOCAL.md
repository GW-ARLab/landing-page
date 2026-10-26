# Hướng dẫn demo và kiểm thử ARL CMS trên máy

Tài liệu này dành cho buổi demo **trước khi hosting và kết nối Google**. Nó mô tả giao diện đang có, các bước thao tác và kết quả cần thấy. Không dùng dữ liệu khách hàng thật trong bản thử nghiệm.

## 1. Hiểu đúng phạm vi demo

- **CMS local:** chọn vai trò thử nghiệm, biên tập nội dung, tạo sản phẩm, tải ảnh, kiểm tra, xem trước, đăng, khôi phục phiên bản, xem và xử lý tin nhắn, xem lịch sử thao tác.
- **Dữ liệu local:** nội dung ở tệp JSON, tin nhắn/phiên bản ở cơ sở dữ liệu trên máy, ảnh ở thư mục media local. Chưa ghi vào Google Sheets/Drive.
- **Đăng nhập:** ô chọn vai trò không phải đăng nhập thật; bất kỳ ai sử dụng máy chạy bản local đều có thể đổi vai trò. Không đưa bản này ra Internet.
- **Website live trong tài liệu này** nghĩa là website đang chạy trên máy demo, **không phải** website công khai trên hosting.
- **Quy tắc quan trọng:** bấm “Lưu bản nháp” hoặc “Tạo bản xem trước” chưa làm thay đổi website live. Chỉ “Đăng lên website” hoặc “Quay lại bản này” mới đổi bản khách của máy demo nhìn thấy.

## 2. Chuẩn bị một bản demo riêng, không đụng CMS hiện tại

CMS hiện tại của bạn ở `http://127.0.0.1:8787/cms`. Khuyến nghị chạy **bản demo riêng ở cổng 8790**. Không cần dừng cổng 8787. Mở PowerShell mới, dán **từng dòng** sau. Đường dẫn dự án có khoảng trắng nên giữ nguyên dấu nháy:

```powershell
$projectDir = 'C:\Web ARL\Redesign ARL Website (Community) 2\Redesign ARL Website (Community) 2'
Set-Location -LiteralPath $projectDir
& 'C:\Program Files\nodejs\node.exe' --version
$demoRoot = Join-Path $projectDir ('cms-data\demo-manual-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $demoRoot
Copy-Item -LiteralPath (Join-Path $projectDir 'cms\local\ARL_Content.json') -Destination (Join-Path $demoRoot 'ARL_Content.json')
if (Test-Path -LiteralPath (Join-Path $projectDir 'cms-data\media')) { Copy-Item -LiteralPath (Join-Path $projectDir 'cms-data\media') -Destination (Join-Path $demoRoot 'media') -Recurse }
$env:ARL_MODE = 'local'
$env:ARL_AUTH_MODE = 'local'
$env:ARL_CONTENT_SHEET_ID = ''
$env:ARL_HOST = '127.0.0.1'
$env:ARL_PORT = '8790'
$env:ARL_DATA_DIR = Join-Path $demoRoot 'state'
$env:ARL_LOCAL_CONTENT_PATH = Join-Path $demoRoot 'ARL_Content.json'
$env:ARL_LOCAL_MEDIA_DIR = Join-Path $demoRoot 'media'
$env:ARL_BACKUP_DIR = Join-Path $demoRoot 'backups'
& 'C:\Program Files\nodejs\node.exe' .\cms\server.mjs
```

Giữ cửa sổ PowerShell này mở trong suốt buổi demo. Mở:

- CMS demo: <http://127.0.0.1:8790/cms>
- Website demo: <http://127.0.0.1:8790/>

Nếu website demo chưa hiện nội dung, đó là vì bản sao mới **chưa có phiên bản được đăng**; thực hiện bước 4 để tạo bản đầu tiên. Nếu báo cổng 8790 đã được dùng, đổi `ARL_PORT` sang một cổng trống, ví dụ `8791`, rồi mở URL tương ứng. Nếu Node báo thiếu bản build, chạy `pnpm run build` trong thư mục dự án rồi khởi động lại lệnh Node; nếu PowerShell không nhận `pnpm`, nhờ người hỗ trợ môi trường Node/pnpm, không tải công cụ từ liên kết lạ.

**Không chạy bài demo đầy đủ trên cổng 8787** nếu bạn muốn giữ nguyên dữ liệu/phiên bản đang thử. Quay lại một bản cũ chỉ đổi website live, không xóa sản phẩm hoặc tin nhắn đã tạo trong dữ liệu nguồn.

### Dữ liệu mẫu dùng trong demo

| Mục | Giá trị thử đề xuất |
| --- | --- |
| Tên sản phẩm VI / EN | `Robot Demo Nội Bộ` / `Internal Demo Robot` |
| Đường dẫn | `robot-demo-noi-bo` |
| Mô tả VI / EN | `Sản phẩm chỉ dùng để kiểm thử CMS.` / `A product used only for CMS testing.` |
| Trạng thái | `Beta / đang thử nghiệm` |
| Danh mục | Một danh mục đang có, ví dụ `Robot học` |
| Ảnh | JPEG/PNG/WebP do bạn có quyền sử dụng, dưới 10 MB; không chứa thông tin riêng tư |
| Mô tả ảnh VI / EN | `Ảnh thử nghiệm robot` / `Test robot image` |
| Nguồn/quyền sử dụng ảnh | `Ảnh thử nghiệm do ARL được phép sử dụng` — chỉ đánh dấu xác nhận nếu điều này đúng |
| Tên người gửi form | `Khách Demo` |
| Email người gửi | `demo@example.test` |
| Lời nhắn | `Đây là yêu cầu thử nghiệm CMS, không cần phản hồi.` |

Không dùng lại cùng một đường dẫn sản phẩm nếu đã tạo trong **cùng** bản demo. Có thể thêm hậu tố số, ví dụ `robot-demo-noi-bo-2`.

## 3. Danh sách vai trò cần trình diễn

Tại đầu CMS, đổi ô **Vai trò thử nghiệm**. Đây chỉ là mô phỏng chức năng, không chứng minh được đăng nhập Google thật.

| Vai trò chọn trên CMS | Được thấy/làm | Không được làm |
| --- | --- | --- |
| Biên tập nội dung | Sửa nội dung, tạo sản phẩm, tải ảnh, kiểm tra, tạo bản xem trước | Đăng/khôi phục phiên bản, đọc hộp thư liên hệ |
| Người đăng website | Xem trạng thái, bản xem trước; đăng và khôi phục phiên bản | Sửa nội dung, tạo sản phẩm, đọc hộp thư liên hệ |
| Xử lý liên hệ | Xem, lọc, phân công, đổi trạng thái, ghi chú yêu cầu | Biên tập/đăng website, xóa yêu cầu |
| Quản trị | Các chức năng nội dung và hộp thư; có thể xóa yêu cầu thử | Không thay thế được kiểm thử đăng nhập Google thật |

Nếu đang gõ dở hoặc đã chọn ảnh chưa lưu, CMS sẽ hỏi trước khi đổi vai trò/đổi mục. Chọn **Hủy** để giữ nội dung đang nhập. Trong bản demo riêng, có thể chọn **OK** để thử chức năng cảnh báo mất thay đổi.

## 4. Kịch bản demo chính — làm theo thứ tự

### Bước 4.1 — Tạo phiên bản đầu tiên

1. Mở CMS demo `:8790/cms`, chọn **Biên tập nội dung**.
2. Trong **Đăng nội dung lên website**, bấm **1. Kiểm tra nội dung**. Chờ thông báo nội dung hợp lệ. Nếu có lỗi, xem danh sách ngay dưới các nút và dừng demo xuất bản cho đến khi xử lý.
3. Bấm **2. Tạo bản xem trước**. CMS báo số mục thêm/sửa/bỏ và hiện **Xem bản xem trước**.
4. Mở liên kết xem trước; kiểm tra trang chủ, `/products`, `/contact`, chuyển VI/EN. Đây chưa phải website live.
5. Quay lại CMS, đổi vai trò sang **Người đăng website**. Bấm **3. Đăng lên website**.
6. Mở `http://127.0.0.1:8790/` trong tab mới. Phần **Phiên bản website** phải ghi bản đang hiển thị, và website phải tải được.

**Đạt:** bản xem trước có trước khi đăng; vai trò biên tập không bấm được nút đăng; sau khi người đăng thực hiện, website demo hiển thị bản đầu tiên.

### Bước 4.2 — Sửa chữ nhưng chưa đăng

1. Chọn lại **Biên tập nội dung**. Mở **Biên tập nội dung**.
2. Chọn nhóm **Trang website**, tìm trang chủ, đổi một dòng dễ nhận ra, ví dụ tiêu đề thành `ARL DEMO — Nội dung đang chờ duyệt`; nếu muốn kiểm tra song ngữ, sửa cả trường English.
3. Bấm **Lưu bản nháp**. Mở website demo live và xác nhận **chưa thấy** chữ mới.
4. Bấm **1. Kiểm tra nội dung**, rồi **2. Tạo bản xem trước**. Mở bản xem trước và xác nhận **có** chữ mới.
5. Đổi sang **Người đăng website**, bấm **3. Đăng lên website**. Tải lại website live; lúc này chữ mới phải xuất hiện.

**Đạt:** có ranh giới rõ giữa bản nháp → xem trước → website live. Nếu sửa nội dung sau khi đã tạo bản xem trước, CMS yêu cầu tạo bản xem trước mới trước khi đăng.

### Bước 4.3 — Kiểm thử toàn bộ nhóm có thể biên tập

Trong bản demo riêng, với vai trò **Biên tập nội dung**, mỗi lần chọn nhóm → chọn mục → sửa **một trường chữ** → **Lưu bản nháp**. Không xóa trắng trường bắt buộc. Có thể gom các thay đổi lại và chỉ tạo một bản xem trước ở cuối.

| Nhóm trong CMS | Ví dụ kiểm thử | Kết quả cần thấy sau khi đăng |
| --- | --- | --- |
| Thông tin chung | Đổi tạm tên ARL hoặc thời gian phản hồi | Vị trí tương ứng trên website cập nhật |
| Trang website | Đổi tiêu đề/giới thiệu trang chủ | Trang tương ứng cập nhật |
| Sản phẩm | Đổi tên hoặc mô tả một sản phẩm hiện có | Thẻ sản phẩm và trang chi tiết cập nhật |
| Giải pháp | Đổi thông điệp ngắn | Trang giải pháp cập nhật |
| Nghiên cứu | Đổi tiêu đề/mô tả | Trang nghiên cứu cập nhật |
| Thành viên | Đổi tên hiển thị của **bản demo** | Trang giới thiệu cập nhật; không sửa tên người thật trên bản 8787 |
| Đoạn nội dung | Đổi một đoạn thuộc trang/sản phẩm | Đoạn tương ứng cập nhật |
| Menu | Đổi nhãn VI/EN của một mục | Menu ở vị trí đó cập nhật |
| Nút kêu gọi | Đổi nhãn VI/EN | Chữ trên nút tương ứng cập nhật |

Ô **Tìm mục** lọc theo tên/tiêu đề. **Tải lại nội dung** lấy nguồn mới và bỏ thay đổi chưa lưu sau khi bạn xác nhận. Các trang chính sách/điều khoản không hiện để sửa trong biểu mẫu này vì đang theo quy trình xác nhận riêng.

### Bước 4.4 — Tạo sản phẩm mới, có ảnh ngay khi tạo

1. Chọn vai trò **Biên tập nội dung**, mở **＋ Tạo sản phẩm mới**.
2. Điền tên/mô tả VI và EN, đường dẫn, trạng thái, nút liên hệ, danh mục; có thể tích **Hiển thị ở trang chủ sau khi đăng**.
3. Chọn ảnh thử hợp lệ (JPEG, PNG hoặc WebP, tối đa 10 MB). Xem ảnh hiện ngay trong biểu mẫu. Điền mô tả ảnh VI/EN, nguồn/quyền sử dụng và xác nhận **chỉ khi thật sự có quyền**.
4. Bấm **Tạo và lưu sản phẩm**. Sản phẩm mới được chọn trong nhóm **Sản phẩm**. Mở website live: **chưa thấy** sản phẩm mới.
5. Kiểm tra nội dung → tạo bản xem trước. Trong preview, mở `/products/robot-demo-noi-bo` (hoặc slug bạn đã đặt), trang danh sách sản phẩm, trang chủ nếu đã tích hiển thị. Kiểm tra ảnh và văn bản VI/EN.
6. Đổi sang **Người đăng website**, đăng. Trên website live, mở lại các trang trên và kiểm tra sản phẩm xuất hiện.

**Thử lỗi an toàn:** tạo lại cùng đường dẫn phải bị từ chối; nếu chọn ảnh nhưng bỏ mô tả hoặc quyền công bố, CMS không cho lưu; chọn tệp sai định dạng/quá 10 MB phải bị từ chối. Không dùng ảnh mà bạn không có quyền công bố.

**Thử không có ảnh:** có thể tạo một sản phẩm khác và bỏ trống phần ảnh; website dùng hình minh họa mặc định. Sau đó chọn sản phẩm đó trong nhóm **Sản phẩm** để thử bước 4.5.

### Bước 4.5 — Thay ảnh của sản phẩm đã có

1. Chọn **Biên tập nội dung** → nhóm **Sản phẩm** → sản phẩm cần thử.
2. Ở **Ảnh đại diện sản phẩm**, chọn ảnh JPEG/PNG/WebP dưới 10 MB, nhập alt VI/EN, ghi quyền sử dụng, đánh dấu xác nhận.
3. Bấm **Tải ảnh và lưu bản nháp**. CMS báo đã lưu vào bản nháp. Website live vẫn dùng ảnh cũ/hình minh họa cũ.
4. Kiểm tra → xem trước → người đăng duyệt đăng. Sau đó ảnh mới mới hiện trên website live.

**Lưu ý:** ảnh được chuẩn hóa thành WebP khi lưu; thay ảnh mới không xóa ảnh trong các phiên bản đã đăng trước, để còn khôi phục được.

### Bước 4.6 — Gửi một tin nhắn từ website và xử lý trong CMS

1. Đảm bảo website demo đã có phiên bản đầu tiên (bước 4.1).
2. Mở `http://127.0.0.1:8790/contact` (không dùng cổng 8787). Thử bấm gửi với tên trống, email sai, lời nhắn dưới 10 ký tự hoặc chưa tích đồng ý: form phải báo lỗi, không hiện thành công.
3. Điền dữ liệu mẫu ở mục 2, chọn loại yêu cầu, tích đồng ý chính sách và bấm **Gửi tin nhắn**. Chờ thông báo thành công. Nếu trình duyệt đang giữ form cũ, tải lại trang trước khi gửi thử lần tiếp theo.
4. Trong CMS demo, chọn **Xử lý liên hệ**. Mục **Yêu cầu liên hệ** hiện tin nhắn vừa gửi. Nếu chưa thấy, bấm **Làm mới hộp thư**.
5. Bấm yêu cầu để xem tên, email, loại, sản phẩm quan tâm, lời nhắn, thời gian và trạng thái đồng bộ. Chọn **Đang xử lý**, điền người phụ trách `Danh (demo)`, ghi chú `Đã nhận để kiểm thử`, rồi bấm **Lưu xử lý**.
6. Đổi **Lọc trạng thái** sang **Đang xử lý**: yêu cầu vẫn hiện. Đổi sang **Mới**: yêu cầu không còn trong danh sách đó. Mở lại để xem **Lịch sử xử lý**.
7. Thử các trạng thái **Đang chờ**, **Đã đóng**, **Spam** nếu muốn kiểm tra đầy đủ bộ lọc. Nút **Làm mới hộp thư** cập nhật danh sách nhưng không tạo tin nhắn mới.

**Đạt:** form không nhận dữ liệu thiếu/không có đồng ý; tin nhắn hợp lệ xuất hiện trong CMS; lưu trạng thái/người phụ trách/ghi chú và lịch sử hoạt động. Trong bản local, trạng thái **Đã đồng bộ** chỉ có nghĩa đã đồng bộ vào bản lưu local, **không phải Google Sheets**.

### Bước 4.7 — Quyền xem tin nhắn và xóa bản thử

1. Đổi sang **Biên tập nội dung** hoặc **Người đăng website**: hộp thư liên hệ không hiện. API cũng chặn hai vai trò này; ẩn giao diện không phải biện pháp bảo vệ duy nhất.
2. Đổi sang **Xử lý liên hệ**: có hộp thư nhưng không có nút xóa.
3. Đổi sang **Quản trị**: mở đúng tin nhắn **demo** và thấy nút **Xóa yêu cầu**.
4. **Tùy chọn, chỉ trong bản demo 8790:** bấm Xóa, đọc hộp xác nhận và chọn Hủy để thử bảo vệ; nếu muốn test thao tác xóa, bấm lại và xác nhận. Yêu cầu biến mất khỏi danh sách.

**Cảnh báo:** xóa là thao tác khó khôi phục, và bản backup cũ có thể vẫn chứa tin nhắn. Tuyệt đối không dùng bước này với dữ liệu khách thật hoặc trên cổng 8787 nếu chưa có phương án lưu trữ/xóa phù hợp.

### Bước 4.8 — Phiên bản website, khôi phục và hoạt động gần đây

1. Sau khi đã đăng ít nhất hai lần, xem mục **Phiên bản website**. Bản hiện tại có nhãn **Đang hiển thị**; các bản trước có nút **Quay lại bản này** đối với vai trò được đăng.
2. Dùng **Người đăng website** hoặc **Quản trị** bấm **Quay lại bản này** ở một bản cũ, đọc hộp xác nhận rồi xác nhận. Website demo phải quay về nội dung/ảnh của bản đó.
3. Bấm **Cập nhật trạng thái** để lấy lại danh sách phiên bản, trạng thái nguồn và số tin nhắn chờ đồng bộ.
4. Xem **Hoạt động gần đây** để thấy các lần kiểm tra, tạo bản xem trước, đăng và đồng bộ tin nhắn. Mục **Chi tiết kỹ thuật** và mã bản xem trước chỉ dành cho hỗ trợ kỹ thuật; người demo bình thường không cần đọc mã UUID/hash.

**Quan trọng:** khôi phục chỉ đổi bản website đang hiển thị. Dữ liệu nguồn đang biên tập **không tự quay về nội dung cũ**. Nếu bấm tạo bản xem trước mới từ nguồn hiện tại rồi đăng, những thay đổi đã nhập trước đó có thể xuất hiện lại.

## 5. Các tình huống cần xác nhận thêm

| Mã | Tình huống | Kết quả mong đợi |
| --- | --- | --- |
| Q-01 | Editor nhìn nút **Đăng lên website** | Nút bị vô hiệu hóa; chỉ Publisher/Admin demo có thể đăng |
| Q-02 | Publisher mở CMS | Không có biểu mẫu biên tập/tạo sản phẩm; vẫn xem được trạng thái và phiên bản |
| Q-03 | Inquiries mở CMS | Chỉ làm việc với hộp thư, không có luồng đăng website |
| Q-04 | Sửa chữ nhưng chưa bấm **Lưu bản nháp**, đổi mục/vai trò/tải lại | Có cảnh báo bỏ thay đổi |
| Q-05 | Hai tab cùng sửa một mục; tab A lưu trước, tab B lưu dữ liệu cũ | Tab B phải được báo nguồn đã đổi và yêu cầu tải lại; không ghi đè âm thầm |
| Q-06 | Tạo bản xem trước, sau đó sửa nguồn rồi thử đăng bản cũ | CMS không cho đăng bản xem trước lỗi thời; cần tạo lại |
| Q-07 | Tạo sản phẩm trùng slug | Bị từ chối, không tạo sản phẩm thứ hai |
| Q-08 | Ảnh >10 MB, sai định dạng, thiếu mô tả/nguồn/xác nhận quyền | Bị từ chối |
| Q-09 | Form thiếu tên, email sai, lời nhắn quá ngắn, chưa đồng ý | Không gửi thành công |
| Q-10 | Website demo dừng server PowerShell | Trình duyệt báo không kết nối; khởi động lại server rồi tải lại |

Các ca Q-05/Q-06 nên làm **cuối buổi**, trên bản demo riêng, vì chúng cố ý tạo tình huống xung đột nguồn. Sau đó tải lại nội dung và tạo bản xem trước mới trước khi tiếp tục đăng.

## 6. Sao lưu và kết thúc demo

1. Trong cửa sổ PowerShell chạy server demo, nhấn **Ctrl+C** để dừng **chỉ server cổng 8790**.
2. Trong **cùng cửa sổ** (để giữ các biến `ARL_*` trỏ đến bản demo), chạy:

```powershell
& 'C:\Program Files\nodejs\node.exe' .\cms\backup.mjs
```

3. Lệnh thành công in ra đường dẫn thư mục backup và danh sách tệp. Xác nhận có `ARL_Content.json`, `arl.sqlite`, `releases`, `backup-manifest.json`; nếu đã tải ảnh, có thêm `media`.
4. Giữ thư mục demo/backup nếu cần xem lại. **Không cần và không nên xóa** để “dọn dẹp” ngay sau buổi demo. Bản CMS gốc ở 8787 không bị thay đổi bởi các bước trên.

Nếu chỉ muốn demo nhanh trong 10–15 phút: làm bước 4.1 → 4.4 → 4.6 → 4.8, rồi kết thúc bằng bước 6.

## 7. Phiếu ghi kết quả để trình bày

Điền `Đạt / Chưa đạt / Chưa thử` và ảnh chụp màn hình nếu cần:

| Nhóm cần nghiệm thu | Kết quả | Ghi chú/ảnh minh chứng |
| --- | --- | --- |
| Vai trò local và các chức năng bị chặn |  |  |
| Biên tập 9 nhóm nội dung |  |  |
| Tạo sản phẩm có/không có ảnh |  |  |
| Thay ảnh sản phẩm hiện có |  |  |
| Lưu nháp → kiểm tra → preview → đăng |  |  |
| Website VI/EN, trang danh sách/chi tiết sản phẩm |  |  |
| Form liên hệ: lỗi đầu vào và gửi thành công |  |  |
| Hộp thư: xem/lọc/phân công/ghi chú/lịch sử |  |  |
| Xóa tin nhắn demo bằng Admin (tùy chọn) |  |  |
| Khôi phục bản đã đăng và xem hoạt động |  |  |
| Backup bản demo |  |  |

### Chưa thể kết luận từ buổi demo local

Các mục sau phải kiểm thử riêng **sau** khi có Google Cloud, tài khoản/quyền, Google Sheets/Drive và hosting HTTPS: đăng nhập Google thật và danh sách email được cấp quyền; quyền chia sẻ ba workbook và tệp Drive; CMS ghi nội dung/ảnh lên Sheets/Drive (hiện **chưa có**); đồng bộ tin nhắn với Sheet thật; HTTPS, domain, giám sát, backup ngoài máy và khôi phục trên môi trường staging. Demo local **không phải** bằng chứng website đã sẵn sàng chạy production.

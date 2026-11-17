# Vận hành chương trình B1–B10 và bốn nhóm C/H

Tài liệu này áp dụng cho mã nguồn G1–G5C. Môi trường đích phải được kiểm tra riêng về schema, dữ liệu đã duyệt, tài khoản và kho video. Các commit kỹ thuật không tự nhập bộ nội dung/ảnh local và không chứng minh DB production đã có B1–B10. Không dùng cổng, tài khoản hay báo cáo nghiệm thu của máy phát triển làm cấu hình triển khai.

## Phạm vi và người phụ trách

- Quản trị kỹ thuật xác nhận phiên bản backend/frontend, M1–M4, backup/khôi phục, quyền lớp, kho video riêng tư và cấu hình worker.
- Người phụ trách nội dung đối chiếu workbook chuẩn `Chương trình sách học vietsign lớp 1-B1-B10.xlsx`, xác nhận từ/nghĩa, câu/lượt/vai, học liệu và các quyết định còn mở. Bộ nguồn đang chuẩn bị có 68 hoạt động T và 16 phương án C/H; đối chiếu manifest của gói được giao trước khi nhập, không suy ra số lượng production từ test mẫu.
- Giáo viên giao và nhận xét trong lớp được phân công. Học sinh chỉ xem/nộp bài của mình theo quyền server.

Giữ D07/D08 và các quyết định chưa chốt ở trạng thái nháp. Không chọn mặc định một phương án D07 như nội dung đã duyệt, không tự gán người chấm bài tự học D08. Giữ `CURRICULUM_AI_WORKER_ENABLED=false`. Editor chưa cung cấp thao tác xuất bản hoặc bật AI chấm chính thức.

## Giao, học và nhận xét trong lớp

1. Giáo viên vào `/grading/curriculum`, chọn lớp mình phụ trách, hoạt động đủ điều kiện giao thử và vai hội thoại nếu có. Bài giao ghim phiên bản và phạm vi tại thời điểm giao. Phương án thiếu vai/cấu trúc cần thiết tiếp tục bị chặn.
2. Học sinh vào `/curriculum`, mở bài trong lớp hoặc **Học tiếp**. Yêu cầu làm lại được ưu tiên; liên kết mở đúng lượt, phiên bản và vai. C/H hiển thị toàn ngữ cảnh, còn mục quay theo phạm vi được giao.
3. Quay từng mục, xem lại clip và gửi. Video nháp chưa gửi nằm trong IndexedDB trên thiết bị/trình duyệt đó. Không xóa dữ liệu trang, đóng phiên để bắt đầu lại hay chuyển thiết bị khi còn clip chưa gửi. Khi đủ mục, nộp kết quả để chuyển sang chờ nhận xét.
4. Giáo viên mở clip theo quyền lớp và nhận xét từng mục. Sửa nhận xét tạo lịch sử mới. Nếu có xung đột, tải bản mới và đối chiếu trước khi ghi tiếp.
5. Học sinh mở yêu cầu làm lại và nộp lại đúng mục cần sửa. Phiên mới liên kết phiên gốc và giữ nguyên phiên bản/vai. Việc biên tập tạo nháp mới không chuyển các bài lớp cũ sang phiên bản đó.

Phân biệt **đã xem**, **đã nộp**, **chờ nhận xét**, **cần làm lại**, **đã nhận xét** và **hoàn thành chính thức**. Xem thẻ không chứng minh kỹ năng ký hiệu; kết quả thực hành nháp không tạo điểm/sao/hoàn thành chính thức. Bộ lọc, bài mở và cuộn danh mục được giữ theo tài khoản trong tab. Video nháp chỉ phục hồi tại trình duyệt/thiết bị lưu nó; clip đã gửi được kiểm quyền qua server.

## Biên tập nháp và học liệu

Quản trị viên vào `/curriculum/editor`: chọn hoạt động → đề xuất sửa → nhập lý do → kiểm tra validation/diff → lưu phiên bản nháp mới. Giáo viên được xem, so sánh và xem trước. Trong lúc kiểm tra/lưu, ô nhập tạm khóa. Sửa thêm sau kiểm tra phải kiểm tra lại. Phiếu kiểm tra hết hạn sau 20 phút; nội dung hoặc học liệu đổi thì cần diff mới.

Khi mất phản hồi lưu, thử lại cùng thao tác để server trả kết quả đã lưu mà không nhân đôi. Khi xung đột phiên bản, giữ bản đề xuất rồi tải lại, đối chiếu và kiểm tra lại. Văn bản biên tập chưa lưu không được đảm bảo tồn tại sau rời trang/tải lại; sao chép phần cần giữ trước thao tác đó. Xem trước chỉ trình bày học liệu, không tạo bài giao/bài làm/kết quả. Khôi phục từ lịch sử cũng tạo một nháp mới.

Không sửa JSON trực tiếp trong DB, thay ID/nguồn/từ/câu/vai hoặc tự đóng quyết định qua editor. Chỉ gán học liệu đã có trong thư viện, đúng mục/nghĩa/vai và có URL phát. Tên trùng nhưng chưa rõ nghĩa phải giữ thiếu. URL phát được không chứng minh ký hiệu đúng; liên kết tra cứu không phải URL phát. Đánh dấu thiếu không xóa asset hay lịch sử. Ảnh nhóm 10 chấm đã xác định sai tiếp tục loại khỏi gói cho đến khi có bản thay thế được xác minh.

Học liệu bổ sung cần ghi mục/nghĩa, vai trò (tranh, bàn tay, video ký hiệu, mẫu câu/hội thoại), nguồn/quyền sử dụng, người xác minh, định dạng và URL phát. Đưa học liệu mới vào thư viện, đổi cấu trúc hoặc quyết định nội dung cần phạm vi biên soạn được chốt; editor hiện không thực hiện upload/đăng ký/xác minh/duyệt mới. Xem [G5B](G5B_DRAFT_EDITOR_ROLLOUT.md) để biết quyền, giới hạn và lịch sử.

## Trước thay đổi DB hoặc phát hành

G5C không có migration/import. Không chạy lại seed/import để cập nhật nháp đã biên tập. Với một thay đổi DB được giao riêng:

1. Xác minh đúng host/database, phiên bản MySQL, schema và migration journal. Ghi phiên bản code, checksum SQL/gói nguồn và phạm vi thay đổi.
2. Đối chiếu schema/nội dung thực tế, lập diff cụ thể về bảng/hàng được thêm hoặc đổi. So sánh các phiên bản và lịch sử cần bảo toàn. Các công cụ import chỉ được dùng với gói nguồn tương ứng đã được rà soát; không lấy fixture test làm nội dung dạy học.
3. Phối hợp các tiến trình ghi để có baseline nhất quán; backup DB và kho video riêng tư, ghi checksum, xác minh khả năng restore vào môi trường cách ly.
4. Áp đúng diff đã rà soát qua quy trình migration/import của môi trường đích. DDL MySQL có thể commit trước khi bước tiếp theo lỗi; `IF NOT EXISTS` không sửa một bảng sai schema. Nếu schema/checksum không khớp, kiểm tra phần đã áp trước khi tiếp tục.
5. Đối chiếu schema, phiên bản và tập hàng lịch sử sau thay đổi; kiểm tra quyền/luồng trên staging. Giữ báo cáo gốc. Nếu có ghi hợp lệ sau baseline, phân tích thay đổi đó, không xóa dữ liệu để ép checksum bằng nhau.

Các hướng dẫn theo phase:

- [M1](M1_SCHEMA_ROLLOUT.md): phiên bản nội dung và lượt làm bài.
- [G4A/G4B, M2](G4AB_CLASS_PRACTICE_ROLLOUT.md): bài lớp, clip, nhận xét và nộp lại.
- [G4C, M3](G4C_GROUP_RUNTIME_ROLLOUT.md): nhóm C/H và phạm vi vai.
- [G5A](G5A_LEARNING_PROGRESS_ROLLOUT.md): học tiếp, tiến độ và nháp trên thiết bị.
- [G5B, M4](G5B_DRAFT_EDITOR_ROLLOUT.md): biên tập, diff và nhật ký.
- [G5C](G5C_PERFORMANCE_ROLLOUT.md): phép đo, nghiệm thu và rollback mã nguồn.

Rollback mã nguồn không đồng nghĩa xóa bảng/version/audit. Dừng các thao tác ghi mới liên quan, quay backend/frontend về bản tương thích và giữ lịch sử/clip. Khôi phục nội dung qua phiên bản nháp mới. Phục hồi dump phải đánh giá các dữ liệu phát sinh sau backup và diễn tập trên DB cách ly trước; chưa có xác nhận diễn tập production trong phase này.

## Xử lý sự cố

| Hiện tượng | Xử lý |
|---|---|
| Danh mục/chi tiết bài lỗi | Dùng nút thử lại, kiểm tra backend; lỗi tải không đồng nghĩa không có bài. Đóng/mở nhanh cùng bài không cần gửi thêm request |
| Bài chưa được mở hoặc thiếu mẫu | Xem trạng thái nháp/quyết định và quyền lớp; giữ mục thiếu, không thay bằng nội dung khác nghĩa |
| Camera bị từ chối | Kiểm tra HTTPS/localhost, quyền trình duyệt và ứng dụng đang giữ camera; trở lại đúng mục |
| Đổi thiết bị không thấy clip nháp | Trở lại trình duyệt/thiết bị gốc; clip chưa gửi không đồng bộ qua server |
| Nộp hoặc lưu mất phản hồi | Thử lại cùng phiên/thao tác, giữ request/event ID; không tạo lượt mới để gửi lại |
| Không xem được clip | Kiểm tra owner/quyền lớp/thành viên; lấy ticket mới qua UI, không chuyển kho video sang public |
| Nhận xét/biên tập bị 409 | Giữ đề xuất, tải bản hiện hành, đối chiếu và gửi lại theo phiên bản mới |
| Editor không cho lưu do thiếu M4 | Xác minh M1–M3 và M4 theo hướng dẫn; chỉ áp sau diff/backup, không chạy SQL tùy ý |
| Bài tự học chưa có người nhận xét | Giữ chờ D08, chuyển câu hỏi cho người phụ trách nội dung/chính sách |
| AI job xuất hiện ngoài dự kiến | Giữ bằng chứng, kiểm tra cấu hình worker và nguồn tạo job; chưa công nhận kết quả AI là điểm chính thức |

Ghi thời điểm, vai trò tài khoản, mã bài/lượt, phiên bản, request ID nếu có và thông báo lỗi. Không đưa token, mật khẩu, URL ký tạm hoặc clip cá nhân vào log công khai. Kho video bài làm phải giữ riêng tư.

## Nghiệm thu và bàn giao

Kiểm thử kỹ thuật chạy trên DB/MinIO cách ly với dữ liệu mẫu và camera giả. Lệnh tái lập, phạm vi API thật/mock và giới hạn phép đo nằm trong [G5C rollout](G5C_PERFORMANCE_ROLLOUT.md). Các script checker/backup trên máy local không phải điều kiện để một checkout mới chạy được test và không nằm trong commit này.

Nghiệm thu thiết bị thật vẫn **chưa thực hiện**. Ghi model, OS, trình duyệt, ngày, người kiểm tra và kết quả cho từng mục:

- Cấp/từ chối camera, quay/dừng/xem/gửi, đổi camera nếu thiết bị hỗ trợ.
- Mất mạng/gửi lại, quay lại ứng dụng, giữ clip nháp và học tiếp đúng lượt.
- Giáo viên giao → học sinh nộp → nhận xét → nộp lại đúng mục/vai/phiên bản.
- Chạm, bàn phím, cuộn, phóng hình, xem video và đọc phản hồi khi tắt âm thanh.
- iOS/Android và máy tính đại diện theo phạm vi khách hàng chốt; viewport Chromium không thay nghiệm thu thiết bị.

Trước khi xem xét phát hành nội dung: người phụ trách chốt quyết định/học liệu, xác minh chất lượng ký hiệu, hoàn thành nghiệm thu thiết bị, duyệt cách xuất bản và phục hồi, rồi có lệnh triển khai riêng. Hoàn thành G5C kỹ thuật không tự cho phép publish, bật AI, deploy production hoặc mở rộng lớp khác.

# So khớp ký hiệu tiếng Việt — đợt commit 2

Phạm vi: helper `normalizeSignIdentity`, service `aiPractice.service.js` và test `ai-sign-matching.test.js`. Không có migration hoặc thay đổi frontend. Phần này dùng trong AI practice chung cho model1/model3, không chỉ B1–B10.

## Hành vi

- Giữ nguyên dấu tiếng Việt và chữ d/đ: `ca`, `cà`, `cá`; `o`, `ô`, `ơ`; `d`, `đ` là những nhãn khác nhau.
- Chuẩn hóa Unicode NFC, chữ hoa/thường, khoảng trắng; service nhận diện tiền tố `chữ` hoặc `ký hiệu` ở đầu nhãn. Không bỏ dấu để đối chiếu đúng/sai.
- So sánh tên ký hiệu với mục tiêu, không dùng `is_match` từ upstream để ghi đè phép so sánh. Confidence không được dùng để xác định hai nhãn có giống nhau hay không.
- Model1 ưu tiên tên nhãn từ phản hồi; nếu chỉ có ID, dùng cơ chế tra vocabulary hiện có rồi mới so khớp. ID chưa tra ra tên không được xem như tên ký hiệu. Model3 dùng tên nhãn hoặc tên từ top-k; không lấy class ID thay tên bị thiếu.
- Nếu thiếu mục tiêu/tên nhãn hoặc chuẩn hóa thành chuỗi rỗng, kết quả là `null` (chưa xác định). Tên số rõ ràng như `label_name: '3'` vẫn được so sánh; `label_id: 3` đơn độc không đủ.
- API trả quyết định tương ứng với trường `is_match` lưu vào bản ghi mới. Giữ phản hồi gốc để đối chiếu; không tính lại lịch sử cũ.

## Kiểm chứng và triển khai

Chạy tại thư mục gốc repo:

```powershell
node --test backend/tests/ai-sign-matching.test.js
```

Test thay DB và phản hồi HTTP bằng fixture, không truy cập DB hoặc dịch vụ AI thật. Kiểm tra kết quả trả về, giá trị truyền vào INSERT và việc giữ phản hồi gốc. Các ca bao gồm dấu/chữ, NFC, chuẩn hóa khoảng trắng, upstream trả kết luận trái ngược, tra tên từ ID, top-k và đầu vào rỗng.

Kiểm chứng ngày 16/11/2026 trên snapshot riêng từ `4c41386` cộng các file của đợt này: test so khớp và hai bộ hồi quy `curriculum-ai-queue.test.js`, `curriculum-submit.test.js` của commit cha đạt **17/17**, không skip. Các thay đổi runtime curriculum chưa commit không tham gia lần chạy này.

Đây là kiểm thử logic so khớp, không xác nhận độ chính xác nhận diện video hoặc tính đúng của bộ ánh xạ nhãn model/vocabulary. Cần dùng tên nhãn đúng dấu và kiểm tra ánh xạ của môi trường khi nghiệm thu; tên nhãn không dấu sẽ không tự được coi là tương đương tên có dấu.

Đưa helper và service lên backend cùng nhau. Không cần áp M1 để sử dụng thay đổi này. Có thể rollback riêng commit nếu cần; các bản ghi đã lưu giữ nguyên. Việc rollback sẽ khôi phục cách so khớp bỏ dấu cũ, nên cần cân nhắc lỗi phân biệt ký hiệu đã sửa.

Commit này không bật worker, thay cấu hình AI, xuất bản bài hoặc quyết định chính sách chấm curriculum D06. Luồng AI practice đang dùng có thể trả `false/null` ở những trường hợp trước đây bị coi nhầm là đúng; cần ghi nhận đây là thay đổi hành vi khi triển khai.

# M1: cấu trúc phiên bản nội dung và lượt làm bài

Phạm vi commit: `20261109_curriculum_m1.sql`, test schema độc lập và tài liệu này. Đây là phần nền tảng của G1. Không kèm runtime G1, seed B1–B10, nội dung đang chờ duyệt, ảnh/video hoặc công cụ xuất bản. Việc checkout/deploy commit không tự áp SQL.

## Thay đổi

Migration tạo sáu bảng InnoDB:

- `curriculum_content_item`: mục nội dung, mặc định `approval_status='draft'`.
- `curriculum_asset`: ánh xạ học liệu, mặc định `verification_status='unverified'`.
- `curriculum_activity_version`: phiên bản và hash cấu hình, mặc định `publication_status='draft'`.
- `curriculum_attempt`: snapshot lượt làm bài, unique theo user/activity/request.
- `curriculum_attempt_answer`: câu trả lời, unique theo attempt/event.
- `curriculum_upload`: liên kết clip với user/attempt/task.

`curriculum_game_progress` được thêm `attempt_id`, `version_id` nullable, unique theo attempt và khóa ngoại; `result_source` và `review_status` mặc định `legacy_unverified`. Các cột/hàng cũ giữ nguyên. Nhãn mới không xóa hay đổi điểm, sao, trạng thái hoàn thành hoặc nhận xét đã có.

Không có INSERT nội dung hoặc UPDATE nghiệp vụ trong M1. Luồng ứng dụng cũ vẫn đọc các bảng cũ và ghi bằng danh sách cột cũ; không tự chuyển danh mục sang cơ chế published của runtime G1. Các bảng mới và liên kết lịch sử không cung cấp cơ chế chấm, phân quyền hay tính bất biến ở tầng ứng dụng; các phần đó thuộc commit runtime sau.

## Điều kiện trước khi áp

1. Xác nhận đúng host, port, tên DB và `@@server_uuid`; lưu kết quả vào hồ sơ triển khai. Dùng kết nối quản trị đã cấu hình cho target, không sao chép cấu hình DB local sang production.
2. Kiểm tra hai migration trước đã được áp: `20260918_add_curriculum_activities_and_games.sql` và `20261011_add_curriculum_video_ai_queue.sql`. Không chạy lại chúng như một bước mặc định: migration cũ có câu lệnh cập nhật/xóa dữ liệu. Nếu thiếu, lập kế hoạch riêng cho phần thiếu.
3. Đối chiếu `SHOW CREATE TABLE` của `user`, `curriculum_activity`, `curriculum_game_progress`: các ID tham chiếu phải là BIGINT signed tương thích, bảng InnoDB và khóa chính tồn tại. Test của commit chạy trên MySQL 8.0; chưa xác minh biến thể DB khác.
4. Đối chiếu journal triển khai và schema thực tế. Nếu đã có một phần hoặc toàn bộ M1, dừng phân loại trạng thái thay vì chạy file lần nữa. Các môi trường local đã có M1–M4 không cần chạy lại M1.
5. Chọn cửa sổ bảo trì; tạm dừng các nguồn ghi curriculum và worker liên quan để backup/đối chiếu cùng một mốc. `ALTER TABLE` có thể giữ metadata lock; thử thời gian chạy với dung lượng gần production ở staging trước.

Các truy vấn chỉ đọc để nhận diện target và dấu hiệu M1 đã tồn tại:

```sql
SELECT DATABASE() AS target_database, @@hostname AS host,
       @@port AS port, @@server_uuid AS server_uuid, VERSION() AS mysql_version;

SELECT TABLE_NAME, ENGINE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('curriculum_content_item', 'curriculum_asset',
    'curriculum_activity_version', 'curriculum_attempt',
    'curriculum_attempt_answer', 'curriculum_upload');

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'curriculum_game_progress'
  AND COLUMN_NAME IN ('attempt_id', 'version_id', 'result_source', 'review_status');

SHOW CREATE TABLE user;
SHOW CREATE TABLE curriculum_activity;
SHOW CREATE TABLE curriculum_game_progress;
```

Một target chưa áp M1 phải không có sáu bảng và bốn cột nêu trên. Đây là kiểm tra sơ bộ; số lượng đúng không chứng minh cấu trúc đúng, vẫn cần đối chiếu DDL/khóa ngoại/index với file SQL.

## Diff, backup và thực thi

1. Lưu diff schema dự kiến: sáu bảng mới, bốn cột và các ràng buộc của M1. Lưu checksum SHA-256 của file SQL, commit nguồn và danh tính target.
2. Sao lưu đầy đủ DB bằng công cụ quản trị phù hợp, gồm schema/data và trigger/routine/event nếu hệ thống dùng. Lưu checksum dump, vị trí backup và người thực hiện. Thử phục hồi vào DB cách ly và đối chiếu trước khi áp production; không chỉ kiểm tra dump tồn tại.
3. Chụp baseline toàn bộ cột cũ của các bảng curriculum, đặc biệt `curriculum_game_progress`, `curriculum_user_activity_summary`, `curriculum_ai_job`, cùng số hàng/ID. Không chỉ so số lượng: cần đối chiếu cả giá trị điểm/sao/nhận xét/cấu hình và lịch sử.
4. Ghi trạng thái bắt đầu vào journal triển khai của môi trường. Áp đúng file `database/migrations/20261109_curriculum_m1.sql` một lần bằng kết nối target đã xác nhận. Không chạy seed/import hoặc các script `*_local.cjs` để thay thế bước này.
5. Khi thành công, kiểm tra mục bên dưới rồi ghi hoàn tất vào journal: tên migration, hash SQL, commit, DB/UUID, thời gian, người áp, backup và kết quả đối chiếu. Chỉ mở lại nguồn ghi sau khi kiểm tra đạt.

Commit này không cung cấp runner/journal tự động. Nếu môi trường chưa có journal, cần lưu hồ sơ triển khai kiểm soát được trước khi áp. `CREATE TABLE IF NOT EXISTS` không làm toàn file idempotent: chạy lại phần `ALTER TABLE` sẽ lỗi trùng cột. Không dùng tùy chọn tiếp tục sau lỗi để bỏ qua vấn đề.

## Kiểm tra sau áp

- Đối chiếu schema mới, defaults, unique indexes và foreign keys với SQL.
- Trước khi có runtime mới ghi dữ liệu, sáu bảng mới phải rỗng; không có nội dung tự được xuất bản.
- Mọi hàng lịch sử đã có phải giữ nguyên toàn bộ cột cũ và có `attempt_id/version_id=NULL`, `result_source/review_status='legacy_unverified'`. Kiểm tra trong cửa sổ dừng ghi để baseline không thay đổi.
- Danh mục/bài hiện có, media, summary và AI jobs phải khớp baseline. M1 không thay trạng thái worker/AI hiện hữu và không bật AI chấm mới.
- Trên staging, thử luồng đọc bài và nộp kết quả kiểu cũ. Test trong commit kiểm tra câu lệnh ghi history/upsert summary tương thích; không thay thế nghiệm thu HTTP/UI trên môi trường triển khai.
- Sau khi runtime mới tạo tham chiếu, khóa ngoại sẽ chặn xóa version/attempt đang được lịch sử tham chiếu. Quy trình xóa dữ liệu cũ cần được đánh giá trước khi runtime mới mở ghi.

## Khi lỗi hoặc cần quay lui

DDL MySQL có thể đã commit từng statement trước khi báo lỗi; không dựa vào `ROLLBACK` để hoàn tác toàn file. Giữ nguồn ghi dừng, lưu lỗi/journal và schema thực tế; xác định statement nào đã hoàn tất. Chuẩn bị diff sửa tiếp phù hợp trạng thái thực tế hoặc kế hoạch phục hồi đã kiểm tra, không xóa bảng/chạy lại toàn bộ theo phỏng đoán.

Nếu chỉ quay lui ứng dụng, giữ cấu trúc M1: các cột mới có default/nullable để tương thích cách ghi cũ. Không DROP bảng/cột hoặc sửa nhãn lịch sử để ép ứng dụng chạy. Nếu phải phục hồi backup DB, đối chiếu các hàng phát sinh sau backup trước; không ghi đè mất lịch sử mới.

## Kiểm thử schema độc lập

Test dùng `node:test`, `mysql2` đã có trong dependency backend và các migration đã commit. Không import service G1–G5 hay đọc `.env`. URL phải trỏ tới server MySQL tạm trên loopback, có path marker `/curriculum_m1_schema_test`. Test tự tạo DB tên ngẫu nhiên và chỉ xóa chính DB đó khi kết thúc. Không trỏ biến test vào server ứng dụng đang dùng.

Ví dụ tạo server tạm riêng; mật khẩu dưới đây chỉ dùng cho fixture dùng một lần. Kiểm tra tên container/cổng chưa bị sử dụng trước khi chạy:

```powershell
docker run --rm -d --name vietsign-m1-schema-test -e MYSQL_ROOT_PASSWORD=m1-schema-test-only -p 127.0.0.1:33129:3306 --tmpfs /var/lib/mysql mysql:8.0
# Chờ MySQL sẵn sàng bằng kết nối TCP (không chỉ kiểm tra container đang chạy):
docker exec vietsign-m1-schema-test mysql --protocol=TCP '--host=127.0.0.1' --user=root --password=m1-schema-test-only -e "SELECT 1"

$env:CURRICULUM_M1_SCHEMA_TEST_URL='mysql://root:m1-schema-test-only@127.0.0.1:33129/curriculum_m1_schema_test'
node --test backend/tests/curriculum-m1-schema.integration.test.js
# Chỉ dọn container vừa tạo cho test:
docker stop vietsign-m1-schema-test
Remove-Item Env:CURRICULUM_M1_SCHEMA_TEST_URL
```

Nếu không có biến test, test được skip; skip không được tính là kiểm chứng migration thành công. Sáu ca kiểm tra: bảo toàn dữ liệu cũ; ghi history/summary kiểu cũ; defaults nháp và version uniqueness; request/event/result uniqueness; foreign keys; lỗi khi chạy SQL lần hai mà dữ liệu vẫn được giữ.

Kiểm chứng ngày 16/11/2026: cả sáu ca và test cha đạt (7/7, không skip) trên MySQL 8.0.43 trong container riêng. Test chạy trên snapshot sạch từ `b478dc8` cộng đúng ba file của commit M1; chỉ dùng `mysql2` từ dependency có sẵn. Chưa áp vào DB ứng dụng hoặc production.

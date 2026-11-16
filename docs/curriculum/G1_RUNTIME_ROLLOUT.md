# G1 runtime — phiên bản và kết quả do server xác nhận

Đợt 3 của chuỗi commit, sau M1 và sửa so khớp ký hiệu. Phạm vi là runtime phiên bản 1; không kèm dữ liệu bài học chưa duyệt, compiler/rounds G2, import G3, bài lớp/nhận xét từng mục G4, học tiếp và editor G5. Không có migration mới ngoài M1 đã commit.

## Thay đổi và phạm vi sử dụng

- Server tạo snapshot, sinh ID lựa chọn ngẫu nhiên và xáo trộn một lần. API đọc không trả khóa đáp án; client gửi sự kiện thay vì điểm/sao. Request/event/finalize có khóa chống ghi trùng, khóa row và transaction.
- Ghi lịch sử theo version; phân biệt `legacy_unverified`, `preview`, `server`. Điểm cũ giữ nguyên nhưng không được dùng làm kết quả server xác nhận. Summary mới chỉ tính theo version published hiện hành.
- Catalog lấy counts/readiness từ DB và kiểm tra hash, nguồn, trạng thái duyệt của asset/mục. Học sinh chỉ mở hoạt động có bản published hợp lệ thuộc bài ready; giáo viên/admin được xem thử nháp hoặc cấu hình cũ có thể chuyển đổi.
- Tám entry trò chơi dùng chung UI G1 để xem/chọn/nối/sắp xếp/quay và gửi hành động lên server. Đây là lớp tương tác cơ bản: hiệu ứng kéo thả, lật cặp, đếm đồ vật và nhiều lượt chuyên biệt thuộc G2, không nằm trong commit này.
- Đã xem thẻ được ghi là `viewed_all`, không cho điểm/sao kỹ năng. Bài quay cần đủ các mục, luôn chờ nhận xét, không tự hoàn thành và không tạo AI job mới. Chưa có UI chấm từng mục hoặc quy trình bài lớp G4.
- Phiên/sự kiện đang gửi được lưu trong sessionStorage theo tài khoản và hoạt động để thử lại bằng cùng ID. Video chưa upload chỉ nằm trong trang; chưa có bộ nhớ video nháp G4A. Có thể quay bằng camera hoặc chọn file WebM/MP4 tối đa 10 MB.
- Upload gắn owner/attempt/task, giới hạn 50 clip/attempt; bucket mới riêng tư. Vé xem 5 phút kiểm lại tài khoản/quyền lớp, hỗ trợ byte ranges. Các alias tải clip cũ được kiểm quyền trước khi đọc local file/MinIO.

Runtime áp dụng cho module curriculum dùng chung, không chỉ riêng mã B1–B10. Các bài cũ chưa có published version sẽ hiển thị đang biên soạn. Commit code không tự nhập nội dung, tạo bộ B1–B10 hoặc xuất bản.

## Thay đổi API

- `POST /curriculum/activities/:activityId/attempts` với `requestId`.
- `GET /curriculum/attempts/:attemptId`.
- `POST /curriculum/attempts/:attemptId/answers` với `eventId`, `taskId`, `choiceIds` hoặc `action:'view'` hoặc `uploadId`.
- `POST /curriculum/attempts/:attemptId/submit` với `idempotencyKey`.
- `POST /curriculum/attempts/:attemptId/tasks/:taskId/uploads`, multipart `file`, tùy chọn UUID `uploadRequestId` để thử lại upload.
- `GET /curriculum/submissions/:submissionId/video-ticket` và URL phát có vé trong phản hồi.
- `GET /curriculum/catalog` và các API lesson/activity/progress/history hiện có trả metadata/trạng thái đã kiểm tra.

Đường submit cũ `/activities/:id/submit` và upload chung với `folder=curriculum-practice` trả 410. Các client cũ cần được cập nhật; không triển khai backend mới riêng lẻ rồi để client cũ tiếp tục gửi điểm.

## Trình tự triển khai

1. Kiểm tra M1 đã có và đúng schema theo [hướng dẫn M1](M1_SCHEMA_ROLLOUT.md). Không chạy M1 lần hai. Runtime G1 không dùng M2/M3/M4 và không đọc runtime_version 2; chưa triển khai snapshot này lên DB nội dung G2–G5 đang sử dụng nếu cần tiếp tục mở các nội dung đó.
2. Thử trên staging sao chép dữ liệu phù hợp; kiểm tra bài nào có thể mở sau chuyển đổi. Nếu chưa có nội dung approved/verified/published đúng hợp đồng v1, học sinh sẽ chưa vào học được. Chốt phạm vi nội dung riêng trước khi thay luồng production.
3. Sao lưu DB và policy bucket hiện tại. Xác nhận `MINIO_BUCKET_NAME`, `MINIO_PRACTICE_BUCKET_NAME` (mặc định `<bucket>-practice-private`) là hai bucket khác nhau; credential có quyền tạo bucket, đọc/ghi policy và đọc/ghi clip. Kiểm thử tài khoản storage thực tế vì quyền Deny của policy có thể khác credential quản trị dùng trong test.
4. Đặt rõ `CURRICULUM_AI_WORKER_ENABLED=false`. Worker mặc định tắt; chỉ chạy nếu cấu hình bằng chuỗi `true`. Commit không cho phép suy ra D06 đã được duyệt. Queue cũ nếu được chạy chỉ lưu kết quả hỗ trợ, không nâng điểm/sao/hoàn thành chính thức.
5. Triển khai frontend/backend cùng đợt trong cửa sổ đã chọn. Backend thiết lập policy trước khi lắng nghe HTTP; lỗi MinIO làm startup thất bại. Bucket clip mới bỏ policy anonymous; bucket mẫu giữ policy hiện có và thêm Deny cho prefix `curriculum-practice/*`.
6. Nghiệm thu bằng student, teacher cùng/khác lớp và admin: danh mục, vào nháp bị chặn, lượt làm bài, retry, nộp, quyền clip, quay camera trên HTTPS và lịch sử. Xác nhận không tạo AI job mới và các liên kết clip mẫu vẫn dùng được.

Không có lệnh apply/import/publish production trong commit này. Không dùng seed cũ để tự tạo nội dung approved hoặc published.

## Kiểm thử snapshot

Backend dùng MySQL/MinIO tạm riêng; test tạo DB tên ngẫu nhiên và xóa DB của nó. URL DB phải dùng loopback với path marker `/curriculum_g1_test`; không chỉ tới server ứng dụng. Cấp MinIO fixture riêng với user `g1testadmin`, password `g1-fixture-only`, không dùng credential thật. Sau test dừng container tạm để dọn bucket thử.

```powershell
$env:CURRICULUM_TEST_DB_URL='mysql://root:g1-fixture-only@127.0.0.1:33129/curriculum_g1_test'
$env:CURRICULUM_TEST_MINIO_PORT='33130'
node --test backend/tests/curriculum-content.test.js backend/tests/curriculum-m1.integration.test.js backend/tests/curriculum-submit.test.js backend/tests/curriculum-ai-queue.test.js
```

Test integration cũ mặc định ghi DB ứng dụng được thay bằng test cách ly. Không có các biến fixture thì integration sẽ skip; không tính skip là đạt.

Frontend: cài dependency bằng lockfile, cài Chromium cho Playwright nếu chưa có, build rồi chạy:

```powershell
cd frontend
npx next build --webpack
npx tsc --noEmit
npm run test:curriculum:g1
```

Browser test tự mở server ở `127.0.0.1:33131`; toàn bộ API được mock, không dùng account/DB thật. Test này kiểm giao diện theo hợp đồng API; HTTP/backend/storage thật được kiểm trong test integration riêng, không gọi là nghiệm thu xuyên suốt UI tới DB thật.

Kết quả kiểm tra snapshot ngày 16/11/2026: 20 backend và 10 browser đạt, không skip; TypeScript và lint các file frontend thay đổi đạt. Camera vật lý và nội dung ký hiệu cần nghiệm thu riêng trước phát hành. Những cảnh báo workspace nhiều lockfile, baseline-browser-mapping cũ và cấu hình standalone khi chạy test server không được coi là phép thử production thực tế.

## Quay lui

Giữ M1 và dữ liệu lịch sử/phiên/clip. Khi gặp lỗi, dừng các đường ghi curriculum trước; không phục hồi anonymous policy cho clip học sinh hoặc mở lại submit tin điểm client. Bản trước G1 có các hành vi cũ này, vì vậy không rollback mù toàn ứng dụng; chuẩn bị bản bảo trì chặn các đường curriculum write trong khi sửa lỗi.

Không DROP bảng, xóa version hoặc ghi đè config của phiên đã tồn tại. Khi cần khôi phục DB, đối chiếu các hàng phát sinh sau backup. Các quyết định D02–D08 và nội dung chưa duyệt tiếp tục được xử lý riêng.

# G2 — bộ trò chơi theo lượt

Đợt 4, sau runtime G1 (`93a189c`). Commit gồm compiler, schema cấu hình, runtime v2 và giao diện trò chơi. Không nhập hoặc xuất bản B1–B10, không kèm ảnh sách, dữ liệu biên tập hay quyết định nội dung đang chờ duyệt. Không thêm API preview hoặc trang thử vào ứng dụng.

## Phạm vi

- Chia thẻ/cặp thành các lượt, giữ phần dư; chỉ mở lượt tiếp theo theo kết quả server.
- Thẻ xem; ghép hai cột và hai mảnh; quiz có thử lại; đếm từng vật 1–10; dãy có ô cố định và giữ ô đúng; phân loại giỏ; memory 3–6 cặp với số lượt lật.
- Compiler yêu cầu item/asset refs, khóa đáp án và mapping giỏ tường minh. Dữ liệu thiếu học liệu, fixture hoặc chưa duyệt không đủ điều kiện xuất bản. Chính sách sao là đầu vào, không tự chốt D05.
- Renderer hỗ trợ chữ, ảnh, video, nhóm đếm, phóng to, xem chậm và góc quay nếu có học liệu. `CurriculumMediaPlayer` chỉ dùng trong curriculum; trình phát dùng chung của các màn khác giữ nguyên.
- Mọi thao tác chấm và kết quả vẫn do server G1 xác nhận. Phiên v1 đã lưu tiếp tục dùng quy tắc v1; adapter cho lần tạo phiên từ cấu hình legacy sinh v2. Giữ khóa sessionStorage G1 để không bỏ phiên hoặc sự kiện đang gửi khi nâng cấp.
- Quay/nộp video tiếp tục dùng cơ chế G1, giới hạn 10 MB, chưa có lưu video nháp hoặc nhận xét từng mục G4. Video chưa gửi chỉ tồn tại khi trang còn mở. Bài quay chờ nhận xét, không tự hoàn thành và không tạo AI job mới.
- Xem đủ thẻ không cho điểm/sao kỹ năng. Giữ bảo vệ task label đáp án, các quyền xem clip, lịch sử theo phiên bản và worker mặc định tắt của G1.

## Triển khai

1. Cần các commit M1, sửa so khớp ký hiệu và G1 runtime. Đọc [hướng dẫn G1](G1_RUNTIME_ROLLOUT.md) về xuất bản, quyền học liệu, MinIO và rollback.
2. **Không có migration mới.** V2 dùng JSON và các bảng của M1. Không chạy lại M1 nếu schema đã được áp.
3. Cài backend theo lockfile để có Ajv; cài frontend theo lockfile và build. Cập nhật frontend/backend cùng đợt: frontend G1 chưa xử lý nhiệm vụ memory/count của v2.
4. Giữ `CURRICULUM_AI_WORKER_ENABLED=false`. Không import gói local hoặc đổi publication status để mở bài. Nội dung published phải qua validation và kiểm tra học liệu riêng; commit code không thay thế việc khách hàng duyệt.
5. Nghiệm thu staging với phiên v1 cũ và nội dung v2 được duyệt: quyền student/teacher, retry/reload, các loại game, upload và lịch sử. Nếu cần sửa DB/nạp nội dung sau này, kiểm tra diff và backup trước khi áp.

Không rollback backend về G1 khi đã có phiên v2 đang dùng: G1 chỉ đọc v1. Giữ DB/lịch sử, chặn tạm đường ghi curriculum và sửa tiến khi có sự cố; không xóa phiên/version để ép tương thích.

## Kiểm thử độc lập

Backend dùng MySQL và MinIO disposable như [G1](G1_RUNTIME_ROLLOUT.md), không trỏ tới DB ứng dụng:

```powershell
$env:CURRICULUM_TEST_DB_URL='mysql://root:g1-fixture-only@127.0.0.1:33129/curriculum_g1_test'
$env:CURRICULUM_TEST_MINIO_PORT='33130'
node --test backend/tests/curriculum-content.test.js backend/tests/curriculum-g2.test.js backend/tests/curriculum-m1.integration.test.js backend/tests/curriculum-submit.test.js backend/tests/curriculum-ai-queue.test.js
```

Browser chạy độc lập, intercept toàn bộ API bằng dữ liệu tổng hợp; không cần tài khoản thật, DB ứng dụng hay flag preview. Bộ G1 kiểm tra tương thích phiên v1 trên giao diện mới. SVG thử được tạo trong test, clip WebM chỉ là mẫu kỹ thuật, không phải mẫu ký hiệu. Tất cả nằm trong thư mục tests/e2e, không phải học liệu public.

```powershell
cd frontend
npx next build --webpack
npx tsc --noEmit
npm run test:curriculum:g2
```

Kết quả snapshot ngày 16/11/2026: 32/32 kiểm thử backend và 24/24 kiểm thử trình duyệt đạt, không skip; build Next.js webpack, TypeScript và lint các file frontend thay đổi đạt. Build/test server còn cảnh báo cấu hình standalone, workspace nhiều lockfile và baseline-browser-mapping cũ có sẵn.

Đây là kiểm thử kỹ thuật. Camera trình duyệt dùng thiết bị giả Chromium; camera vật lý, mobile thật, quyền nhúng YouTube và nội dung ký hiệu cần nghiệm thu riêng. Không dùng số liệu hoặc kết quả nghiệm thu bản local G0–G5 để kết luận về snapshot này.

Dừng sau G2. Công cụ nhập bài B1–B10 thuộc đợt G3; học liệu và nội dung được duyệt sẽ được đóng gói riêng.

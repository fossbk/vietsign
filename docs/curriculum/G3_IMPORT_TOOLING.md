# G3 — công cụ nhập nháp B1–B10

Đợt 5 của chuỗi commit, sau G2 (`379888c`). Đây là mã công cụ và kiểm thử, không phải gói nội dung đã được khách hàng duyệt. Không có migration mới, seed, ảnh sách, workbook, parser Excel hoặc bản đồ nội dung B1–B10 trong commit này.

## Thành phần và phạm vi

- `curriculumImport.service.js`: G3A cập nhật metadata của đúng 5 bài/33 hoạt động B1–B5 **đã tồn tại**, giữ ID và `game_config` cũ, thêm phiên bản draft bất biến. Từ chối hoạt động đã có bản published, item/asset xung đột hoặc gói cũ khi có draft mới hơn.
- `curriculumG3bImport.service.js`: G3B thêm đúng 5 bài/35 hoạt động B6–B10; dữ liệu tồn tại phải khớp để tái sử dụng. Không cập nhật các hàng nội dung có sẵn. Tái sử dụng icon cần đúng gói G3A và đủ 33 phiên bản tương ứng đang có trong DB, không chỉ một chuỗi checksum khai báo.
- Cả hai kiểm tra checksum, phạm vi, liên kết bài–hoạt động–game–nguồn, asset refs, trạng thái nháp và cấu hình G2. Áp dụng trong transaction trên **một connection riêng**, dùng chung advisory lock; kiểm lại diff trước ghi, so fingerprint lịch sử và phiên bản cũ trước commit. Không xóa lịch sử hoặc tự công nhận kết quả AI.
- Rollback G3A khôi phục metadata và archive phiên bản vừa thêm. Rollback G3B archive phiên bản mới và tắt bài/hoạt động mới. Giữ item, asset và mọi attempt/snapshot. Report phải có `report_hash`; toàn bộ trạng thái nội dung phải còn khớp sau import. Có thay đổi nội dung mới thì dừng để xử lý thủ công, không tự ẩn bài chứa hoạt động được thêm sau đó. Lượt làm bài mới không bị xóa.
- CLI `backend/src/scripts/curriculum-import.cjs` chỉ có `validate`, `snapshot`, `plan`. **Không có lệnh apply/rollback/publish**. Service cung cấp API ghi cho runner vận hành đã kiểm tra target, backup và diff; commit này chưa cung cấp runner triển khai production tự động.

Giữ nguyên runtime/UI G2: không thêm đường tắt mở khóa lượt nháp, trang preview, màn biên tập hoặc luồng lớp học G4/G5. Việc commit công cụ không làm B1–B10 xuất hiện trên production.

## Đầu vào độc lập

Nhận JSON qua đường dẫn rõ ràng; không đọc mặc định `docs/curriculum/g3*/package.json`, `scripts/data/`, DB ứng dụng local hoặc `.env`.

Gói có `schema_version`, `phase` (`G3A`/`G3B`), `package_id`, `publication_status:'draft'`, `source.sha256`, `lessons`, `activities`, `items`, `assets`, `package_hash`. G3B thêm `depends_on:{phase:'G3A',package_hash}` và cần truyền **gói G3A gốc** khi tạo diff/apply. Activity chứa config runtime v2 và `sourcePackage` khớp package, workbook checksum, activity code; item/asset giữ draft, lesson giữ `drafting`. Package checksum là `hash(body)` do service xuất ra, bỏ trường `package_hash` khỏi body trước khi tính.

Validator kiểm tra cấu trúc/tham chiếu và điều kiện nháp. Nó **không** đọc Excel, xác nhận nội dung ngôn ngữ ký hiệu, kiểm chứng quyền sử dụng ảnh hay checksum file học liệu thật. Phải đối chiếu nguồn và học liệu trong bước chuẩn bị gói riêng. D03/D05 cùng các quyết định chưa chốt tiếp tục giữ nguyên; ảnh nhóm 10 chấm sai bị loại. Fixture trong tests chỉ là dữ liệu tổng hợp để thử transaction, không phải nội dung nhập production.

## Kiểm tra và tạo diff

Chạy từ root sau khi cài dependency backend theo lockfile. Tạo thư mục đầu ra riêng; các file output phải chưa tồn tại.

```powershell
node backend/src/scripts/curriculum-import.cjs validate --package <g3a.json>
# Đặt CURRICULUM_IMPORT_DB_URL bằng cơ chế quản lý bí mật của môi trường đích.
# Không đặt credential thật trong Git, lịch sử lệnh hoặc tài liệu.
node backend/src/scripts/curriculum-import.cjs snapshot --out <state.json>
node backend/src/scripts/curriculum-import.cjs plan --package <g3a.json> --state <state.json> --out <g3a-diff.json>
node backend/src/scripts/curriculum-import.cjs plan --package <g3b.json> --dependency <g3a.json> --state <state-after-g3a.json> --out <g3b-diff.json>
```

`snapshot` yêu cầu URL MySQL tường minh, chạy transaction read-only với consistent snapshot, ghi `db`/`server_uuid`, state và checksum; dùng UTC (`timezone:'Z'`). `validate`/`plan` chạy offline, không mở DB. Diff có `target`, `review_hash` và `plan.plan_hash`. File snapshot/diff chứa nội dung hiện tại, nên lưu trong khu vực vận hành riêng và không commit.

## Hợp đồng cho runner ghi dữ liệu

Trước khi gọi service: xác nhận đúng target, dừng các luồng ghi curriculum/editor/worker trong cửa sổ bảo trì, sao lưu DB và kiểm khả năng phục hồi. Kiểm checksum workbook/học liệu được chuẩn bị ngoài công cụ, đọc diff và ghi nhận người duyệt. Checksum chỉ phát hiện thay đổi, **không phải chữ ký hoặc bằng chứng phê duyệt**.

Runner cần:

1. Tạo MySQL connection riêng (không truyền pool), `charset:'utf8mb4'`, `timezone:'Z'` và cùng cách xử lý số nguyên như snapshot. Không có transaction bên ngoài đang mở.
2. Kiểm `review_hash` của envelope, so `envelope.target.db/server_uuid` với `SELECT DATABASE(),@@server_uuid` trên chính connection đó; không chỉ dựa vào hostname.
3. Lưu bằng chứng backup, target, checksum file và thời điểm vào nhật ký vận hành riêng; không thêm trường vào object `plan` đã có checksum.
4. Gọi `g3a.apply(connection,bundle,envelope.plan)` hoặc `g3b.apply(connection,bundle,envelope.plan,g3aBundle)`. Service kiểm lại package, trạng thái DB và diff dưới lock; có drift thì tạo và duyệt diff mới.
5. Lưu nguyên report trả về (có `report_hash`) ngay sau thành công. Metadata vận hành/target/backup đặt **bên ngoài** report, không sửa report đã hash. Nếu ghi report ra file thất bại sau DB commit, giữ cửa sổ bảo trì và đối chiếu DB; không giả định transaction đã rollback.
6. Khi được giao rollback, kiểm lại target và backup hiện tại, truyền nguyên report vào `service.rollback(connection,report)`. Report cũ của script local chưa có `report_hash` không tương thích; không tự thêm hash để bỏ qua việc đối chiếu.

G3A cần có sẵn B1–B5/33 activity; nó không khởi tạo các hàng này. G3B chỉ chạy sau G3A đúng gói. Nếu schema đang ở các phase sau M1, cần kiểm tra thêm bảng/history và writer của các phase đó trong runner trước khi vận hành; bộ kiểm thử của commit này dùng đúng schema M1. Các API cấp thấp không tự backup hoặc chứng minh mọi writer đã dừng.

## Kiểm thử snapshot

```powershell
# MySQL disposable trên loopback; không dùng DB ứng dụng.
$env:CURRICULUM_TEST_DB_URL='mysql://root:g1-fixture-only@127.0.0.1:33129/curriculum_g1_test'
node --test backend/tests/curriculum-import-tooling.test.js backend/tests/curriculum-g3a-import.integration.test.js backend/tests/curriculum-g3b-import.integration.test.js
```

Test tạo database tên ngẫu nhiên, áp các prerequisite và M1, kiểm 33/35 phiên bản bằng nội dung tổng hợp rồi xóa đúng DB test. Bao gồm diff chỉ đọc, CLI snapshot, stale diff, lỗi insert và transaction rollback, chạy lặp, quyền xem nháp, phiên cũ, bảo toàn B1–B5 và từ chối rollback khi có nội dung thêm sau import. Thiếu biến test DB thì integration skip; không tính skip là đạt.

Snapshot ngày 17/11/2026 đạt **25/25 kiểm thử**, không skip, trên MySQL disposable. Hai gói nháp G3A/G3B hiện có được kiểm tra cấu trúc offline thành công, nhưng không nằm trong commit và không được nạp DB ứng dụng. Đợt này không đổi frontend hoặc runtime G1/G2, nên không chạy lại build/browser của các đợt trước.

Dừng sau G3. Phần nội dung/học liệu đã được duyệt sẽ đóng gói riêng; đợt code tiếp theo là G4A/G4B bài thực hành trong lớp và nhận xét.

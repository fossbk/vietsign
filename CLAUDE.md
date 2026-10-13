# CLAUDE.md — VietSign Upstream / Curriculum Game System

> File context cho AI agent (Antigravity CLI / Claude Code) khi làm việc trong workspace này.
> Đọc file này trước khi bắt đầu bất kỳ task nào liên quan đến hệ thống Curriculum/Game.

---

## 1. Tổng quan dự án

**VietSignSchool** — hệ thống hỗ trợ dạy và học ký hiệu ngôn ngữ (sign language) cho trẻ khiếm thính,
dựa trên nội dung sách "Kết nối tri thức với cuộc sống". Repo: `VietSign_Upstream`.

Đang triển khai module mới: **Khung nội dung Curriculum + Game Engine** (nguồn: file Excel
`B2026. Khung Nội dung hỗ trợ dạy và học ký hiệu.xlsx`), gồm:
- Nội dung bài học phân cấp: **Lớp → Chủ đề → Bài → Hoạt động**
- 8 loại Game Component để học sinh tương tác/luyện tập

## 2. Stack kỹ thuật

| Layer | Công nghệ |
|---|---|
| Backend | Node.js, Express, `mysql2/promise` (raw SQL, không ORM) |
| Frontend | Next.js 16 + React 19 + TypeScript |
| Styling | Tailwind CSS v4 (utility classes) |
| UI Library | Ant Design (antd v6) + Lucide React (icons) |
| HTTP Client (FE) | Axios qua `http.tsx` — tự gắn `Authorization: Bearer <token>` từ `localStorage.access_token` |
| API pattern (FE) | Entity Model kế thừa `base.ts` — `apiGet()/apiPost()/apiPut()` |
| Database | MySQL 8.0 (Docker container `vietsign_db`, port host `3308:3306`) |
| Infra | Docker Compose (`vietsign_backend`, `vietsign_frontend`, `vietsign_db`, `vietsign_minio`) |
| Test runner | `node:test` + `node:assert` (native, không cài Jest/Mocha — theo triết lý ponytail) |
| Auth | JWT — token chỉ chứa `{ user_id, email }`. Role user nằm ở cột `code` trong bảng `user` (`STUDENT`/`TEACHER`/`ADMIN`/`SUPER_ADMIN`) |

## 3. Quy ước mã hóa nội dung (từ sheet "Quy ước")

- **Lesson code**: `[Lớp].[Chủđề].[STT]` — VD: `L1.BT.01`
  - Level: L1–L5 | Topic: BT (Bản thân), GD (Gia đình), TH (Trường học), TN-ĐN (Thiên nhiên - Đất nước)
- **Activity code**: `[MãBài].[Cấpđộ][STT]` — VD: `L1.BT.01.T01`
  - Cấp độ: T = Từ (50%), C = Câu (30%), H = Hội thoại (20%)
- **Media code**: `[ID Bài].[Loại].[STT]` — VD: `L1.BT.01.V01`

## 4. Database Schema (đã tạo & test — MIGRATION KHÔNG ĐƯỢC SỬA LẠI, chỉ thêm migration mới nếu cần đổi)

File: `database/migrations/20260918_add_curriculum_activities_and_games.sql`

5 bảng:
1. **`curriculum_lesson`** — bài học theo Level/Topic, có `content_status` ENUM('ready','drafting','not_started')
2. **`curriculum_activity`** — hoạt động, `game_type` ENUM 8 giá trị: `FlipCardViewer, LineMatchingGame, ChoiceQuizGame, JigsawPuzzleGame, BucketDropGame, MemoryCardGame, SequenceOrderGame, VideoPracticeRecorder`
3. **`curriculum_media`** — bảng media riêng (video/ảnh), KHÔNG nhét link vào JSON
4. **`curriculum_game_progress`** — **bảng LỊCH SỬ**: mỗi lần nộp bài = 1 dòng mới (KHÔNG unique theo user+activity — quyết định có chủ đích để giữ lịch sử từng lần làm)
5. **`curriculum_user_activity_summary`** — bảng TỔNG HỢP: best_score/best_stars/total_attempts mới nhất, UNIQUE(user_id, activity_id), dùng `GREATEST()` qua `ON DUPLICATE KEY UPDATE` để không bị điểm thấp hơn ghi đè

**Đã test integration thật trên MySQL container** — transaction 2 bước (insert history + upsert summary) hoạt động đúng, `GREATEST()` giữ điểm cao nhất qua nhiều lần nộp.

## 5. Backend API (đã tạo & test)

Mount tại prefix **`/curriculum`** (project KHÔNG dùng prefix `/api` cho bất kỳ module nào — đồng bộ với `/learn`, `/teaching-management`, `/organizations`).

File: `backend/src/features/curriculum/{services,controllers,routes}/curriculum.*.js`

| Method & Path | Chức năng |
|---|---|
| GET `/curriculum/lessons?level=&topic=` | Danh sách bài học |
| GET `/curriculum/lessons/:lessonCode` | Chi tiết bài + activities |
| GET `/curriculum/activities/:activityCode` | Chi tiết activity + media |
| POST `/curriculum/activities/:activityId/submit` | Nộp kết quả (TRANSACTION: insert history + upsert summary) |
| GET `/curriculum/users/:userId/progress?lessonCode=` | Tiến độ theo bài học |
| GET `/curriculum/users/:userId/activities/:activityId/history` | Lịch sử làm bài |
| PATCH `/curriculum/progress/:progressId/feedback` | Giáo viên nhận xét (chỉ teacher/admin) |

**Bảo mật đã áp dụng (KHÔNG được bỏ khi sửa code sau này):**
- `userId` cho `submit` lấy từ `req.user.user_id` (auth middleware), **KHÔNG bao giờ tin `req.body.userId`**
- IDOR protection ở `getUserProgress`/`getActivityHistory`: học sinh chỉ xem được của chính mình; teacher/admin/super_admin xem được tất cả — check qua helper `getCallerRole()`
- `updateFeedback` chỉ cho phép role teacher/admin/super_admin

**Điểm chưa xác minh 100% (cần lưu ý khi debug):** giá trị thật của cột `user.code` (`'STUDENT'` hoa hay thường?) chưa được test integration riêng — mới verify qua đọc code.

## 6. Frontend — Game Components (đang làm)

Cấu trúc: `frontend/src/features/<name>/components/`, export qua `index.ts`.

**Component có sẵn, PHẢI tái sử dụng (không viết lại từ đầu):**
- `FlipCardStep.tsx` (275 dòng) — pattern lật thẻ CSS 3D (`perspective`, `rotateY(180deg)`, `backfaceVisibility`)
- `VideoPlayer.tsx` (386 dòng) — đã có playback rate (0.5x–2x), fullscreen, progress bar, tự phân biệt ảnh/video

**Quyết định sản phẩm đã chốt cho FlipCardViewer:**
- `isCompleted = true` chỉ khi xem hết 100% thẻ ít nhất 1 lần (nút Hoàn thành disable trước đó, có progress indicator dạng chấm tròn)
- Khi hoàn thành: luôn gửi `score = 100, stars = 3` (không tính theo tỷ lệ — vì là hoạt động xem thụ động, không có đúng/sai)

**Tiến độ 8 Game Component:**
- [x] Database schema + API hỗ trợ tất cả 8 loại
- [~] `FlipCardViewer` — đang code (tái sử dụng VideoPlayer + FlipCardStep, thêm zoom lens qua `transform: scale()`)
- [ ] `LineMatchingGame`, `ChoiceQuizGame`, `JigsawPuzzleGame`, `BucketDropGame`, `MemoryCardGame`, `SequenceOrderGame`, `VideoPracticeRecorder` — chưa bắt đầu

## 7. Yêu cầu UI/UX bắt buộc (đối tượng: trẻ khiếm thính)

- Visual cues là chính, KHÔNG dùng âm thanh làm tín hiệu chính: nhấp nháy mũi chỉ, chấm tròn đếm số, kính lúp phóng to cử chỉ tay, thang bậc tăng dần
- Nút bấm kích thước lớn, dễ nhấn cho trẻ nhỏ
- Trạng thái loading/error rõ ràng

## 8. Trạng thái dữ liệu nội dung (từ Excel)

- Lớp 1: chỉ mới ~6/105 bài có nội dung chi tiết đầy đủ — schema thiết kế để nhập dần
- Cấp độ Câu (C) và Hội thoại (H): hầu như CHƯA có dữ liệu mẫu, mới có cấp Từ (T)
- Nhiều Tiểu chủ đề còn trống (status = `not_started`/`drafting`)

## 9. Công cụ/Skill đã cài trong Antigravity CLI (`agy`)

- **ponytail** (`/ponytail full`) — ưu tiên giải pháp tối giản, tận dụng code/thư viện có sẵn, tránh over-engineering. **Luôn bật khi code.**
- 65 skill từ `antigravity-awesome-skills` (category: development, backend, frontend, database, testing, security) — cài tại `~/.gemini/antigravity-cli/skills`. Dùng qua `@skill-name`, VD: `@api-endpoint-builder`, `@bug-hunter`, `@codebase-audit-pre-push`, `@design-taste-frontend`, `@container-security-hardening`.

## 10. Nguyên tắc làm việc đã thống nhất (QUAN TRỌNG)

1. **Làm từng bước một**, review kỹ trước khi sang bước kế — không gộp Schema + API + UI vào 1 prompt.
2. **Luôn xem full diff** (`f` để mở rộng) trước khi "Yes, allow" — đặc biệt với migration DB.
3. Bản tóm tắt (summary) của agent **không thay thế được việc đọc code thật** — `node --check` chỉ kiểm tra cú pháp, không kiểm tra logic.
4. Test bằng mock chỉ chứng minh luồng code đúng thứ tự — **phải có ít nhất 1 lần test integration thật trên MySQL container** trước khi tin schema/transaction hoạt động đúng.
5. Với các quyết định về sản phẩm/sư phạm (VD: cách tính điểm, điều kiện hoàn thành) — **hỏi người phụ trách trước, không để AI tự giả định.**
6. Không đổi tên/convention đã có sẵn trong project (prefix route, style code, framework) trừ khi được yêu cầu rõ ràng.

---
*File này nên được cập nhật mỗi khi hoàn thành 1 bước lớn hoặc có quyết định kiến trúc mới, để agent luôn có context đúng mà không cần giải thích lại từ đầu.*

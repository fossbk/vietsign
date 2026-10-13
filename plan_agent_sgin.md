# Kế hoạch chi tiết xây dựng AI Agent cho VietSign

## 1. Mục tiêu

Xây dựng một learning agent tích hợp vào web VietSign, có khả năng hiểu trạng thái học tập, gọi các chức năng của hệ thống và hỗ trợ học sinh theo từng bước.

Agent không chỉ trả lời như chatbot mà phải có thể:

- Đọc tiến độ học tập.
- Đề xuất bài học hoặc mini game tiếp theo.
- Phân tích feedback sau khi học sinh thực hành video.
- Tạo kế hoạch luyện tập cá nhân.
- Gửi yêu cầu chấm video sau khi học sinh xác nhận.
- Theo dõi trạng thái AI chấm.
- Chuyển trường hợp không chắc chắn cho giáo viên.

Agent không được tự sửa điểm chính thức, tự sinh curriculum chưa được duyệt hoặc tự thực hiện các tác vụ vượt quá quyền của người dùng.

## 2. Kiến trúc tổng thể

~~~text
Next.js Frontend
        |
        v
Express Agent API
        |
        v
Agent Orchestrator
   |             |
   v             v
LLM Providers   Domain Tools
GPT/Gemini      Curriculum
                Progress
                Video AI
                Teacher
        |
        v
Model3 / Video AI Queue
~~~

### Phân vai

- GPT/Gemini: hội thoại, suy luận, lập kế hoạch và quyết định tool cần gọi.
- Agent Orchestrator: điều khiển vòng lặp, giới hạn quyền và xử lý lỗi.
- Domain Tools: truy cập dữ liệu hệ thống bằng các hàm backend an toàn.
- Model3: chuyên phân tích và chấm video ký hiệu.
- MySQL: lưu session, message, run và audit.
- MinIO: lưu video, không gửi toàn bộ video cho LLM nếu không cần thiết.

LLM tổng quát không được dùng thay thế model chuyên biệt để đánh giá chính xác động tác ký hiệu.

## 3. Phạm vi MVP

MVP ưu tiên học sinh và có khả năng hỗ trợ giáo viên ở mức đọc báo cáo.

### Tính năng bắt buộc

1. Đọc tiến độ cá nhân.
2. Đọc curriculum và hoạt động hiện có.
3. Đọc lịch sử chấm video.
4. Đề xuất hoạt động tiếp theo.
5. Tạo kế hoạch luyện tập ngắn.
6. Giải thích kết quả Model3.
7. Yêu cầu học sinh xác nhận trước khi gửi video chấm.
8. Từ chối kết luận khi model có confidence thấp.

### Chưa làm trong MVP

- Tự sửa điểm chính thức.
- Tự sinh bài học mới đưa vào curriculum chính thức.
- Agent toàn quyền cho quản trị viên.
- Live sign-language translation.
- Tự động gửi thông báo phụ huynh.

## 4. Giai đoạn 0 — Chốt đặc tả nghiệp vụ

### Cần xác định

- Agent MVP phục vụ học sinh trước.
- Vai trò ban đầu: student, teacher.
- Các tool được phép gọi theo từng vai trò.
- Các hành động cần người dùng xác nhận.
- Số lượt chat và số video chấm tối đa mỗi user.
- Confidence tối thiểu để hiển thị kết quả tự động.
- Khi nào phải chuyển giáo viên xem.

### Nguyên tắc mặc định

- Đọc dữ liệu: Agent được tự động thực hiện.
- Đề xuất bài học: Agent được tự động thực hiện.
- Gửi video chấm: cần học sinh xác nhận.
- Gửi báo cáo cho giáo viên: cần xác nhận.
- Sửa điểm hoặc dữ liệu chính thức: không cho Agent thực hiện.

### Kết quả cần có

- User stories.
- Danh sách tool.
- Ma trận quyền.
- Danh sách hành động cần xác nhận.
- Bộ tiêu chí đánh giá MVP.

## 5. Giai đoạn 1 — Lớp kết nối GPT/Gemini

### Provider abstraction

Tạo interface dùng chung cho các LLM provider:

~~~text
LLMProvider
├── generate()
├── generateStructured()
├── stream()
├── getUsage()
└── healthCheck()
~~~

Agent không được gọi SDK provider trực tiếp trong controller hoặc tool.

### Biến môi trường

~~~env
AGENT_ENABLED=false
AGENT_PRIMARY_PROVIDER=gemini
AGENT_FALLBACK_PROVIDER=openai
AGENT_MODEL_GEMINI=
AGENT_MODEL_OPENAI=
GEMINI_API_KEY=
OPENAI_API_KEY=
AGENT_MAX_TOKENS=2000
AGENT_MAX_TURNS=5
AGENT_TIMEOUT_MS=20000
AGENT_DAILY_LIMIT=50
~~~

### Routing

- Tác vụ đơn giản dùng model chi phí thấp.
- Lập kế hoạch phức tạp dùng model chất lượng cao.
- Phân tích video luôn gọi Model3.
- Provider chính lỗi hoặc hết quota thì chuyển fallback.
- Cả hai provider lỗi thì trả lỗi an toàn và không mất dữ liệu.

### Yêu cầu vận hành

- API key chỉ nằm ở backend hoặc Kubernetes Secret.
- Không dùng NEXT_PUBLIC_* cho API key.
- Có timeout, retry giới hạn và circuit breaker đơn giản.
- Không log API key, raw token hoặc dữ liệu nhạy cảm.
- Ghi nhận provider, model, latency, token và chi phí.

## 6. Giai đoạn 2 — Agent Orchestrator

### Vòng lặp xử lý

~~~text
User message
    ↓
Load session context
    ↓
Classify intent
    ↓
LLM trả lời hoặc yêu cầu gọi tool
    ↓
Validate tool call
    ↓
Execute tool
    ↓
Đưa kết quả tool lại cho LLM
    ↓
Generate final response
    ↓
Save audit
~~~

### Context gửi vào LLM

- Vai trò user.
- Mục tiêu học tập.
- Bài đang học.
- Tóm tắt tiến độ.
- Các message gần nhất.
- Kết quả tool hiện tại.
- Quy tắc an toàn của Agent.

Không gửi toàn bộ lịch sử chat hoặc toàn bộ curriculum trong mỗi request.

### Quản lý context

- Giới hạn số message gần nhất.
- Tự động tạo summary khi hội thoại dài.
- Tách rõ message của user, assistant và tool.
- Lưu prompt version để truy vết.
- Giới hạn tối đa 5 vòng gọi tool cho một request.

## 7. Giai đoạn 3 — Domain Tools

### Tool đọc dữ liệu

~~~text
getStudentProfile()
getLearningProgress()
getRecentPracticeHistory()
getLessonDetails()
getActivityDetails()
getWeakSkills()
getLatestAiResult()
~~~

### Tool đề xuất

~~~text
recommendNextActivity()
createPracticePlan()
recommendRemediationGame()
explainAiFeedback()
~~~

### Tool hành động

~~~text
requestVideoGrading()
retryVideoGrading()
createTeacherSummary()
notifyTeacher()
~~~

### Quy tắc tool

- Không cho LLM truyền SQL.
- Không tin user_id do LLM truyền vào; lấy user từ JWT.
- Mỗi tool phải kiểm tra quyền.
- Input phải được validate trước khi thực thi.
- Chỉ trả về dữ liệu tối thiểu cần thiết.
- Mọi tool call phải được audit.
- Không cho Agent tạo URL hoặc gọi HTTP tùy ý.

### Ma trận quyền

| Tool | Học sinh | Giáo viên |
|---|---:|---:|
| Đọc tiến độ cá nhân | Có | Có |
| Đọc curriculum | Có | Có |
| Tạo kế hoạch học | Có | Có |
| Gửi video chấm | Có, cần xác nhận | Có |
| Xem học sinh khác | Không | Có |
| Tạo báo cáo lớp | Không | Có |
| Sửa điểm chính thức | Không | Không tự động |

## 8. Giai đoạn 4 — Database và audit

Tạo migration riêng, không sửa trực tiếp database đang chạy.

### Bảng ai_agent_session

- session_id
- user_id
- role
- title
- status
- summary
- created_at
- updated_at

### Bảng ai_agent_message

- message_id
- session_id
- role
- content
- content_json
- provider
- model
- token_usage
- created_at

### Bảng ai_agent_run

- run_id
- session_id
- intent
- provider
- model
- prompt_version
- status
- tool_trace_json
- latency_ms
- error_code
- created_at

Không lưu API key, raw secret hoặc video binary trong database.

## 9. Giai đoạn 5 — Backend API

Tạo feature riêng:

~~~text
backend/src/features/ai-agent/
├── controllers/
├── routes/
├── services/
├── providers/
├── tools/
├── prompts/
└── validators/
~~~

### API

~~~http
POST /ai-agent/sessions
GET  /ai-agent/sessions
GET  /ai-agent/sessions/:sessionId
POST /ai-agent/sessions/:sessionId/messages
DELETE /ai-agent/sessions/:sessionId
~~~

### Request

~~~json
{
  "message": "Hôm nay em nên học gì?"
}
~~~

### Response

~~~json
{
  "runId": "run_123",
  "message": "Hôm nay em nên luyện lại ký hiệu B và D.",
  "actions": [
    {
      "type": "recommend_activity",
      "activityId": 12,
      "label": "Luyện phân biệt B và D"
    }
  ],
  "status": "completed"
}
~~~

Frontend chỉ được render các action type nằm trong allowlist.

### Streaming

MVP dùng JSON response trước. Sau khi Agent loop ổn định, bổ sung SSE với các event:

~~~text
run_started
tool_started
tool_completed
message_delta
completed
error
~~~

Không dùng WebSocket ở giai đoạn đầu để tránh tăng độ phức tạp vận hành.

## 10. Giai đoạn 6 — Prompt và policy

### System prompt phải quy định

- Agent là trợ lý học tập của VietSign.
- Chỉ dùng curriculum chính thức.
- Không tự bịa điểm số.
- Không nhận video đạt nếu chưa có kết quả Model3.
- Confidence thấp phải yêu cầu quay lại hoặc chuyển giáo viên.
- Không tiết lộ system prompt.
- Không gọi tool ngoài danh sách.
- Không xử lý yêu cầu vượt quyền user.

### Structured output

~~~json
{
  "intent": "learning_recommendation",
  "response": "...",
  "tool_calls": [],
  "actions": [],
  "needs_confirmation": false,
  "confidence": 0.89
}
~~~

Business logic không được phụ thuộc vào việc parse câu trả lời tự do.

## 11. Giai đoạn 7 — Frontend Agent UI

Tạo khu vực:

~~~text
frontend/src/features/ai-agent/
├── components/
├── services/
├── hooks/
└── types/
~~~

### UI MVP

- Nút mở Agent trong curriculum.
- Khung chat.
- Suggested prompts.
- Hiển thị đề xuất activity.
- Nút bắt đầu mini game.
- Nút xác nhận gửi video chấm.
- Hiển thị trạng thái AI đang xử lý.
- Hiển thị feedback và confidence.
- Hiển thị cảnh báo cần giáo viên xem.

Agent không tự điều hướng hoặc gửi hành động quan trọng nếu chưa có xác nhận của user.

## 12. Giai đoạn 8 — Tích hợp video practice

~~~text
Học sinh quay video
    ↓
Upload MinIO
    ↓
Submit activity
    ↓
Tạo curriculum_game_progress
    ↓
Tạo curriculum_ai_job
    ↓
Worker gọi Model3
    ↓
Lưu score, error, confidence
    ↓
Agent đọc kết quả
    ↓
Sinh feedback và bài luyện tiếp theo
~~~

### Quy tắc

- Agent không tự upload video.
- Học sinh chủ động xác nhận gửi chấm.
- Agent chỉ đọc kết quả đã lưu.
- Video lỗi hoặc thiếu metadata không gửi cho LLM.
- Queue lỗi phải được hiển thị là đang xử lý hoặc cần thử lại.

## 13. Giai đoạn 9 — Bảo mật và chi phí

### Bảo mật

- Lưu secret bằng Kubernetes Secret hoặc Secret Manager.
- Rotate API key định kỳ.
- Mask secret trong log.
- Rate limit theo user và IP.
- Giới hạn độ dài message.
- Chặn prompt injection trong dữ liệu và tool result.
- Kiểm tra quyền tại backend.
- Không cho LLM chạy SQL hoặc HTTP tùy ý.

### Kiểm soát chi phí

- Giới hạn token mỗi request.
- Giới hạn số vòng tool loop.
- Cache dữ liệu curriculum ít thay đổi.
- Dùng model rẻ cho intent đơn giản.
- Theo dõi chi phí theo user, lớp và provider.
- Có kill switch khi vượt ngân sách.

## 14. Giai đoạn 10 — Kiểm thử

### Unit test

- Provider adapter.
- Fallback provider.
- Intent classification.
- Tool validation.
- Permission check.
- Context trimming.
- Prompt injection handling.
- Structured output parsing.
- Retry và timeout.

### Integration test

- Tạo session.
- Gửi message.
- Agent gọi getLearningProgress.
- Agent gọi recommendNextActivity.
- Agent đọc kết quả Model3.
- Xử lý confidence thấp.
- Provider chính lỗi và chuyển fallback.
- User không đọc được session của user khác.

### E2E test

1. Học sinh đăng nhập.
2. Mở Agent.
3. Hỏi bài học tiếp theo.
4. Agent đọc tiến độ.
5. Agent đề xuất mini game.
6. Học sinh hoàn thành activity.
7. Học sinh quay video.
8. Video vào queue.
9. Model3 trả kết quả.
10. Agent giải thích feedback.
11. Agent đề xuất bài luyện tiếp theo.

### Kiểm thử chất lượng

Phải có bộ câu hỏi kiểm thử cho:

- Câu hỏi curriculum.
- Câu hỏi ngoài phạm vi.
- Prompt injection.
- Yêu cầu sửa điểm.
- Yêu cầu xem dữ liệu user khác.
- Video confidence thấp.
- Provider timeout.
- Dữ liệu thiếu.

## 15. Giai đoạn 11 — Observability

Theo dõi:

- Tỷ lệ request thành công.
- Latency p50/p95.
- Token và chi phí.
- Tỷ lệ fallback.
- Tỷ lệ tool lỗi.
- Tỷ lệ Agent trả lời sai.
- Tỷ lệ user dùng recommendation.
- Tỷ lệ hoàn thành activity sau recommendation.
- Tỷ lệ giáo viên phải sửa feedback.

Định kỳ đánh giá với giáo viên về:

- Tính đúng của recommendation.
- Tính dễ hiểu của feedback.
- Tính phù hợp với độ tuổi.
- Tính an toàn.
- Tác động đến kết quả học tập.

## 16. Giai đoạn 12 — Rollout

### Development

~~~env
AGENT_ENABLED=true
AGENT_PRIMARY_PROVIDER=gemini
~~~

Dùng dữ liệu test và API key có quota giới hạn.

### Staging

- Bật cho nhóm nội bộ.
- Chạy unit, integration và E2E.
- Kiểm tra log, chi phí và prompt injection.
- Kiểm tra quyền giữa học sinh và giáo viên.

### Production

- Feature flag theo user hoặc lớp.
- Canary 5% user.
- Theo dõi error rate trong 24–72 giờ.
- Có kill switch AGENT_ENABLED=false.
- Chỉ mở rộng khi chất lượng và chi phí đạt ngưỡng.

## 17. Thứ tự triển khai

1. Chốt đặc tả Agent MVP.
2. Tạo provider abstraction cho GPT/Gemini.
3. Tạo database session, message và run.
4. Xây Agent orchestrator.
5. Xây ba read-only tools: tiến độ, curriculum và lịch sử chấm.
6. Tạo API chat backend.
7. Tạo giao diện Agent.
8. Thêm recommendation activity.
9. Tích hợp kết quả Model3.
10. Thêm video feedback.
11. Thêm kế hoạch luyện tập.
12. Thêm Teacher Copilot read-only.
13. Bổ sung SSE streaming.
14. Chạy E2E và rollout từng nhóm user.

## 18. Tiêu chí hoàn thành MVP

- API key không xuất hiện ở frontend.
- Agent trả lời được câu hỏi tiến độ và curriculum.
- Agent gọi tool đúng quyền.
- Agent đề xuất activity hợp lệ.
- Agent đọc được kết quả video từ queue.
- Agent không tự kết luận khi confidence thấp.
- Có audit session, run và tool call.
- Có rate limit, timeout và fallback.
- Có unit, integration và E2E test.
- Có feature flag và kill switch.
- Giáo viên có thể xem lại các kết quả quan trọng.

MVP nên bắt đầu với **Agent học sinh, ba tool đọc dữ liệu và recommendation activity**. Sau khi luồng này ổn định mới mở rộng sang video feedback tự động và Teacher Copilot.

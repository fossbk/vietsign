-- ==============================================================================
-- Seed Data: 20260918_seed_curriculum_lop1.sql (UTF-8 Clean)
-- ==============================================================================

SET NAMES utf8mb4;

-- 1. Lessons
INSERT INTO `curriculum_lesson` (`lesson_id`, `lesson_code`, `level_code`, `topic_code`, `title`, `description`, `content_status`, `display_order`, `is_active`) VALUES
(1, 'L1.BT.01', 'L1', 'BT', 'Bài 1: A a, B b, \ (thanh huyền)', '', 'ready', 1, 1),
(2, 'L1.BT.02', 'L1', 'BT', 'Bài 2: C c, E e, Ê ê, / (thanh sắc)', 'Từ trong bài: ca, cà, cá, bè, bé, bế', 'ready', 2, 1),
(3, 'L1.BT.03', 'L1', 'BT', 'Bài 3: Số 1, 2, 3, 4, 5', '', 'ready', 3, 1),
(4, 'L1.BT.04', 'L1', 'BT', 'Bài 4: Số 6, 7, 8, 9, 10', '', 'ready', 4, 1),
(5, 'L1.BT.05', 'L1', 'BT', 'Bài 5: o, ô, ? (thanh hỏi)', 'Từ trong bài: bò, cỏ, bó, cò, bố, cô, cổ, bộ, bể cá, cô bé, cổ cò', 'ready', 5, 1)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `description` = VALUES(`description`), `content_status` = VALUES(`content_status`);

-- 2. Activities
INSERT INTO `curriculum_activity` (`activity_id`, `lesson_id`, `activity_code`, `activity_level`, `game_type`, `title`, `instruction`, `display_order`, `game_config`, `pass_score`, `is_active`) VALUES
(1, 1, 'L1.BT.01.T01', 'T', 'FlipCardViewer', '1. Thẻ lật thông minh (trẻ làm ký hiệu theo video mẫu)', '3 thẻ chữ A, B, thanh huyền và 3 thẻ tranh "bà, ba, ba ba" đặt cạnh nhau. Trẻ chạm vào từng thẻ thì mặt trong được lật ra là video chữ cái ngón tay A. Trẻ sẽ xem là làm chữ cái ngón tay A theo mẫu. Tương tự với thẻ B và dấu huyền. Mỗi video có thể chọn tốc độ nhanh, chậm, tua lại.', 1, '{"source": "- Chữ A: https://www.youtube.com/watch?v=tsREwMZdHmg \n- Chữ B: https://www.youtube.com/watch?v=W6GFoY2STdc \n- Dấu huyền: https://www.youtube.com/watch?v=4eomxDxnBhw", "targetWords": ["Chữ A", "Chữ B", "Dấu huyền"]}', 80.0, 1),
(2, 1, 'L1.BT.01.T02', 'T', 'LineMatchingGame', '2. Nối kí hiệu tương ứng với hình', 'Chia làm 2 cột:
1 cột là chữ a, b, thanh huyền và thẻ tranh bà, ba, ba ba
1 cột là kí hiệu sắp xếp ngẫu nhiên 
HS sẽ nối hai cột với nhau', 2, '{"source": "Sách bài tập bổ trợ Tiếng Việt tập 2 - trang....", "targetWords": null}', 80.0, 1),
(3, 1, 'L1.BT.01.T03', 'T', 'ChoiceQuizGame', '3. Xem hình chọn kí hiệu tương ứng', '1 thẻ hình ở dòng trên
2 video kí hiệu ở dòng dưới
HS nhìn thẻ hình, xem và chọn video kí hiệu phù hợp
Thực hiện lần lượt với thẻ chữ A (A và dấu huyền), B (dấu huyền và B) và thẻ tranh bà (bà và ba)', 3, '{"source": "- Chữ A: https://www.youtube.com/watch?v=tsREwMZdHmg  \n- Chữ B: https://www.youtube.com/watch?v=W6GFoY2STdc  \n- Dấu huyền: https://www.youtube.com/watch?v=4eomxDxnBhw \n- Bà: https://www.youtube.com/watch?v=ZKcsAk7u0Fw \n- Ba: quay bổ sung", "targetWords": ["Chữ A", "Chữ B", "Dấu huyền", "Bà", "Ba"]}', 80.0, 1),
(4, 1, 'L1.BT.01.T04', 'T', 'ChoiceQuizGame', '4. Xem video kí hiệu chọn thẻ tranh tương ứng', '1 video kí hiệu ở dòng trên
2 thẻ tranh ở dòng dưới
HS xem video và chọn thẻ tranh tương ứng
Thực hiện lần lượt với các video dấu huyền (thẻ chữ A và thẻ dấu huyền), ba (thẻ bà và ba), ba ba (thẻ ba ba và B)', 4, '{"source": "- Ba ba: https://qipedc.moet.gov.vn/dictionary (đánh từ khóa ba ba vào tìm kiếm)", "targetWords": ["Ba ba"]}', 80.0, 1),
(5, 1, 'L1.BT.01.T05', 'T', 'ChoiceQuizGame', '5. Chọn thẻ chữ tương ứng với kí hiệu', '1 video kí hiệu ở dòng trên
2 thẻ chữ ở dòng dưới
Thực hiện lần lượt video kí hiệu chữ A (thẻ chữ A và Bà), chữ B (thẻ chữ ba và B), bà (thẻ chữ bà và ba ba), dấu huyền (thẻ dấu huyền và bà), ba (thẻ chữ ba và baba), ba ba (thẻ chữ bà và ba ba)', 5, '{"source": null, "targetWords": null}', 80.0, 1),
(6, 1, 'L1.BT.01.T06', 'T', 'VideoPracticeRecorder', '6. Làm kí hiệu tương ứng với hình', 'Từng thẻ tranh A, B, dấu huyền, bà, ba, ba ba xuất hiện
Hướng dẫn người dùng tự quay video và đăng tải video để giáo viên kiểm tra và có thể phản hồi trực tiếp trên bài đăng của học sinh', 6, '{"source": null, "targetWords": null}', 80.0, 1),
(7, 2, 'L1.BT.02.T01', 'T', 'FlipCardViewer', '1.Thẻ lật thông minh (giới thiệu kí hiệu mới)', 'Chia 3 phần để không quá 6 thẻ/phần:
 - Phần 1: 4 thẻ chữ C, E, Ê, thanh sắc
 - Phần 2: 3 thẻ tranh ca, cà, cá
 - Phần 3: 3 thẻ tranh bè, bé, bế
 Trẻ chạm vào từng thẻ thì mặt trong lật ra là video kí hiệu tương ứng, trẻ xem và làm theo mẫu.
 Lưu ý: Mỗi video có thể chọn tốc độ nhanh, chậm, tua lại.', 1, '{"source": null, "targetWords": null}', 80.0, 1),
(8, 2, 'L1.BT.02.T02', 'T', 'LineMatchingGame', '2. Nối kí hiệu tương ứng với hình', 'Chia làm 2 cột, mỗi lượt tối đa 5 cặp:
 1 cột là chữ c, e, ê, thanh sắc và thẻ tranh ca, cà, cá, bè, bé, bế
 1 cột là kí hiệu sắp xếp ngẫu nhiên
 HS sẽ nối hai cột với nhau
 Lượt 1: c, e, ê, thanh sắc - Lượt 2: ca, cà, cá - Lượt 3: bè, bé, bế', 2, '{"source": null, "targetWords": null}', 80.0, 1),
(9, 2, 'L1.BT.02.T03', 'T', 'JigsawPuzzleGame', '3. Ghép hình', 'Thẻ ghép 2 miếng có khớp răng cưa: một nửa là ảnh kí hiệu, nửa kia là mặt chữ tương ứng.
 Các miếng xáo trộn, HS kéo - thả để ghép. Ghép đúng thì 2 miếng dính liền và sáng lên, ghép sai thì miếng bật về chỗ cũ kèm rung nhẹ (không mất thẻ).
 Mỗi lượt tối đa 5 cặp. Lượt 1 dùng chữ cái, lượt 2 dùng từ.', 3, '{"source": null, "targetWords": null}', 80.0, 1),
(10, 2, 'L1.BT.02.T04', 'T', 'ChoiceQuizGame', '4. Xem video kí hiệu chọn thẻ chữ', '1 video kí hiệu ở dòng trên
 3 thẻ chữ ở dòng dưới (nâng lên 3 lựa chọn vì đây là hoạt động chính)
 \'- video ca (ca / cà / cá), video cà (ca / cà / cá), video cá (ca / cà / cá),
 \'- video bè (bè / bé / bế), video bé (bè / bé / bế), video bế (bè / bé / bế)
 -Vị trí đáp án xáo trộn mỗi lần. Sai thì phát lại video rồi cho chọn lại (tối đa 2 lần).', 4, '{"source": null, "targetWords": null}', 80.0, 1),
(11, 2, 'L1.BT.02.T05', 'T', 'BucketDropGame', '5.  Thả hình', '3 giỏ: KHÔNG DẤU / DẤU HUYỀN / DẤU SẮC, mỗi giỏ có biểu tượng kí hiệu dấu thanh ở trên.
 HS kéo các thẻ từ (ba, bà, ca, cà, cá, be, bè, bé) vào đúng giỏ. Mỗi thẻ vừa hiện mặt chữ vừa có nút nhỏ xem lại video kí hiệu.
 Vùng thả rộng và sáng lên khi kéo tới. Thả sai thì thẻ bật ra chứ không mất.', 5, '{"source": null, "targetWords": null}', 80.0, 1),
(12, 2, 'L1.BT.02.T06', 'T', 'MemoryCardGame', '6. Lật thẻ tìm cặp', 'Bảng 12 thẻ úp (6 cặp): 1 thẻ mặt chữ - 1 thẻ kí hiệu, lấy đúng 6 từ ca, cà, cá, bè, bé, bế.
 HS lật 2 thẻ mỗi lượt; đúng cặp thì thẻ sáng lên và ở lại, sai thì úp lại sau 1 giây.
 KHÔNG đếm giờ, chỉ đếm số lượt lật; hết bài hiện số sao theo số lượt.', 6, '{"source": null, "targetWords": null}', 80.0, 1),
(13, 2, 'L1.BT.02.T07', 'T', 'VideoPracticeRecorder', '7. Làm kí hiệu tương ứng với hình', 'Từng thẻ C, E, Ê, thanh sắc, ca, cà, cá, bè, bé, bế xuất hiện
 Hướng dẫn người dùng tự quay video và đăng tải video để giáo viên kiểm tra và có thể phản hồi trực tiếp trên bài đăng của học sinh', 7, '{"source": null, "targetWords": null}', 80.0, 1),
(14, 3, 'L1.BT.03.T01', 'T', 'FlipCardViewer', '1. Thẻ lật thông minh (giới thiệu kí hiệu số)', '5 thẻ chữ số 1, 2, 3, 4, 5. Trẻ chạm vào từng thẻ thì mặt trong lật ra là video kí hiệu số bằng ngón tay, trẻ xem và làm theo mẫu.
 Mỗi thẻ chữ số hiện kèm số chấm tròn tương ứng để HS gắn số với lượng ngay từ đầu. Video có nút tua lại và chọn tốc độ nhanh/chậm.', 1, '{"source": null, "targetWords": null}', 80.0, 1),
(15, 3, 'L1.BT.03.T02', 'T', 'ChoiceQuizGame', '2. Đếm đồ vật và chọn kí hiệu số', 'Hiện một nhóm đồ vật (ví dụ 3 con cá) xếp thành hàng đều, không chồng lấn.
 HS chạm vào từng đồ vật thì đồ vật sáng lên và hiện số thứ tự 1, 2, 3… để hỗ trợ đếm.
 Sau đó HS chọn 1 trong 3 video kí hiệu số ở dòng dưới.
 Đồ vật lấy theo từ đã học (ba ba, cá, cà) để vừa ôn từ vừa học số.', 2, '{"source": null, "targetWords": null}', 80.0, 1),
(16, 3, 'L1.BT.03.T03', 'T', 'LineMatchingGame', '3. Nối số lượng - kí hiệu', 'Chia làm 2 cột, 5 cặp:
 1 cột là thẻ tranh nhóm đồ vật (1-5 vật)
 1 cột là kí hiệu số sắp xếp ngẫu nhiên
 HS sẽ nối hai cột với nhau', 3, '{"source": null, "targetWords": null}', 80.0, 1),
(17, 3, 'L1.BT.03.T04', 'T', 'JigsawPuzzleGame', '4. Ghép hình thẻ 2 miếng (chữ số - kí hiệu)', 'Thẻ ghép 2 miếng: nửa là chữ số, nửa là ảnh bàn tay làm kí hiệu số. 5 cặp mỗi lượt.
 Ghép đúng thì 2 miếng dính liền và sáng lên, ghép sai thì bật về chỗ cũ.', 4, '{"source": null, "targetWords": null}', 80.0, 1),
(18, 3, 'L1.BT.03.T05', 'T', 'SequenceOrderGame', '5. Sắp xếp thứ tự 1 → 5', '5 thẻ kí hiệu số xáo trộn ở dòng trên, 5 ô trống viền nét đứt ở dòng dưới.
 HS kéo - thả vào đúng thứ tự tăng dần. Các ô có sẵn hình bậc thang cao dần để gợi ý trực quan.
 Chỉ kiểm tra khi HS bấm nút Kiểm tra. Làm lại thì giữ nguyên các ô đã đúng.', 5, '{"source": null, "targetWords": null}', 80.0, 1),
(19, 3, 'L1.BT.03.T06', 'T', 'VideoPracticeRecorder', '6. Làm kí hiệu tương ứng với hình', 'Từng thẻ số 1, 2, 3, 4, 5 và các thẻ nhóm đồ vật xuất hiện
 Hướng dẫn người dùng tự quay video và đăng tải video để giáo viên kiểm tra và có thể phản hồi trực tiếp trên bài đăng của học sinh', 6, '{"source": null, "targetWords": null}', 80.0, 1),
(20, 4, 'L1.BT.04.T01', 'T', 'FlipCardViewer', '1. Thẻ lật thông minh (giới thiệu kí hiệu số)', '5 thẻ chữ số 6, 7, 8, 9, 10 kèm số chấm tròn tương ứng (xếp 2 hàng cho dễ nhìn).
 Trẻ chạm vào thẻ thì lật ra video kí hiệu số, trẻ xem và làm theo mẫu.
 Các số dễ nhầm (6-9, 7-8) quay thêm 1 góc nghiêng, HS bấm nút đổi góc để xem. Có nút kính lúp phóng to bàn tay.', 1, '{"source": null, "targetWords": null}', 80.0, 1),
(21, 4, 'L1.BT.04.T02', 'T', 'ChoiceQuizGame', '2. Phân biệt', '1 video kí hiệu số ở dòng trên
 2 thẻ chữ số ở dòng dưới, luôn là cặp dễ nhầm:
 video 6 (6 và 9), video 9 (9 và 6), video 7 (7 và 8), video 8 (8 và 7), video 10 (10 và 5 - ôn Bài 3)
 Video chạy mặc định, có nút kính lúp. Chọn sai thì phát lại video chậm có KHOANH TRÒN vị trí ngón tay khác biệt giữa 2 số, rồi cho chọn lại.', 2, '{"source": null, "targetWords": null}', 80.0, 1),
(22, 4, 'L1.BT.04.T03', 'T', 'ChoiceQuizGame', '3. Đếm đồ vật và chọn kí hiệu số', 'Hiện nhóm 6-10 đồ vật xếp thành hai hàng đều nhau(số lượng lớn nên xếp 1 hàng sẽ khó đếm).
 HS chạm vào từng đồ vật thì đồ vật sáng lên và hiện số thứ tự.
 Sau đó HS chọn 1 trong 3 video kí hiệu số.', 3, '{"source": null, "targetWords": null}', 80.0, 1),
(23, 4, 'L1.BT.04.T04', 'T', 'SequenceOrderGame', '4. Điền số còn thiếu trong dãy', 'Dãy số có 1-2 ô trống, ví dụ: 6, 7, __, 9, __ 
 HS kéo thẻ kí hiệu số vào ô trống. Mỗi lượt 3 dãy.
 Mức nâng cao: dãy đếm ngược 10, 9, __, 7, __', 4, '{"source": null, "targetWords": null}', 80.0, 1),
(24, 4, 'L1.BT.04.T05', 'T', 'SequenceOrderGame', '5. Sắp xếp thứ tự 6 → 10', '5 thẻ kí hiệu số xáo trộn, HS kéo - thả theo thứ tự tăng dần.
 Mức nâng cao (mở khoá sau khi làm đúng): sắp xếp cả dãy 1 → 10 bằng thẻ kí hiệu.', 5, '{"source": null, "targetWords": null}', 80.0, 1),
(25, 4, 'L1.BT.04.T06', 'T', 'MemoryCardGame', '6. Lật thẻ tìm cặp (trò chơi củng cố)', '10 thẻ úp (5 cặp): 1 thẻ chữ số - 1 thẻ kí hiệu số 6-10. Luật như trò lật thẻ ở Bài 2, không đếm giờ.', 6, '{"source": null, "targetWords": null}', 80.0, 1),
(26, 4, 'L1.BT.04.T07', 'T', 'VideoPracticeRecorder', '7. Làm kí hiệu tương ứng với hình', 'Từng thẻ số 6, 7, 8, 9, 10 và các thẻ nhóm đồ vật xuất hiện
 Hướng dẫn người dùng tự quay video và đăng tải video để giáo viên kiểm tra và có thể phản hồi trực tiếp trên bài đăng của học sinh', 7, '{"source": null, "targetWords": null}', 80.0, 1),
(27, 5, 'L1.BT.05.T01', 'T', 'FlipCardViewer', '1. Thẻ lật thông minh (giới thiệu kí hiệu mới)', 'Chia 4 phần để không quá 6 thẻ/phần:
 - Phần 1: 3 thẻ chữ O, Ô, thanh hỏi
 - Phần 2: 4 thẻ tranh bò, cỏ, bó, cò (từ có o)
 - Phần 3: 4 thẻ tranh bố, cô, cổ, bộ (từ có ô)
 - Phần 4: 3 thẻ tranh bể cá, cô bé, cổ cò (từ 2 tiếng)
 Trẻ chạm vào thẻ thì lật ra video kí hiệu, trẻ xem và làm theo mẫu.
 Lưu ý: o và ô chỉ khác dấu mũ → khi hiện mặt chữ cho dấu mũ nhấp nháy 2 lần.', 1, '{"source": null, "targetWords": null}', 80.0, 1),
(28, 5, 'L1.BT.05.T02', 'T', 'LineMatchingGame', '2. Nối từ - kí hiệu (chia lượt theo nhóm)', 'Chia làm 2 cột, mỗi lượt tối đa 4 cặp cùng nhóm để HS so sánh được các từ gần giống nhau:
 Lượt 1: o, ô, thanh hỏi - Lượt 2: bò, cỏ, bó, cò - Lượt 3: bố, cô, cổ, bộ
 1 cột là mặt chữ, 1 cột là kí hiệu sắp xếp ngẫu nhiên. HS nối hai cột với nhau.', 2, '{"source": null, "targetWords": null}', 80.0, 1),
(29, 5, 'L1.BT.05.T03', 'T', 'LineMatchingGame', '3. Nối từ - hình ảnh', 'Như hoạt động 2 nhưng cột phải là tranh minh họa nghĩa của từ, không phải kí hiệu.
 Mục đích: tách bạch 2 việc - nhớ kí hiệu và hiểu nghĩa từ. Mỗi lượt 4 cặp cùng nhóm.', 3, '{"source": null, "targetWords": null}', 80.0, 1),
(30, 5, 'L1.BT.05.T04', 'T', 'ChoiceQuizGame', '4. Xem video kí hiệu chọn thẻ chữ', '1 video kí hiệu ở dòng trên
 3 thẻ chữ ở dòng dưới
 Bộ nhiễu lấy đúng các cặp dễ nhầm trong bài:
 bò (bò / bó / bộ), bó (bò / bó / bộ), bộ (bò / bó / bộ),
 cò (cò / cỏ / cô), cỏ (cò / cỏ / cô), cổ (cổ / cô / cỏ)
 Mỗi lượt 6 câu, vị trí đáp án xáo trộn. Sai thì hiện đáp án kèm video kí hiệu chậm 0.5x.', 4, '{"source": null, "targetWords": null}', 80.0, 1),
(31, 5, 'L1.BT.05.T05', 'T', 'JigsawPuzzleGame', '5. Ghép hình từ 2 tiếng (bể cá, cô bé, cổ cò)', 'Hoạt động riêng cho từ 2 tiếng: thẻ ghép 2 miếng, nửa là tranh minh họa, nửa là kí hiệu của cả từ.
 Chú ý: từ 2 tiếng làm 1 thẻ kí hiệu duy nhất, không tách rời khi kéo thả, để HS hiểu đây là một đơn vị nghĩa chứ không phải 2 từ rời.', 5, '{"source": null, "targetWords": null}', 80.0, 1),
(32, 5, 'L1.BT.05.T06', 'T', 'BucketDropGame', '6. Kéo thả phân loại theo dấu thanh', '4 giỏ: KHÔNG DẤU / DẤU HUYỀN / DẤU SẮC / DẤU HỎI, mỗi giỏ có biểu tượng kí hiệu dấu thanh.
 HS kéo các thẻ từ (bo, bò, bó, cỏ, cò, cô, cổ, bộ, ba, bà, ca, cá…) vào đúng giỏ. Mỗi thẻ có nút nhỏ xem lại video kí hiệu.
 Mỗi lượt tối đa 8 thẻ. Thả sai thì thẻ bật ra chứ không mất.', 6, '{"source": null, "targetWords": null}', 80.0, 1),
(33, 5, 'L1.BT.05.T07', 'T', 'VideoPracticeRecorder', '7. Làm kí hiệu tương ứng với hình', 'Từng thẻ O, Ô, thanh hỏi và 11 từ trong bài xuất hiện (chia theo 4 nhóm như hoạt động 1)
 Hướng dẫn người dùng tự quay video và đăng tải video để giáo viên kiểm tra và có thể phản hồi trực tiếp trên bài đăng của học sinh', 7, '{"source": null, "targetWords": null}', 80.0, 1)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `instruction` = VALUES(`instruction`), `game_config` = VALUES(`game_config`);

-- 3. Media
INSERT INTO `curriculum_media` (`media_id`, `activity_id`, `media_code`, `media_type`, `source_url`, `display_order`) VALUES
(1, 1, 'L1.BT.01.V01', 'video', 'https://www.youtube.com/watch?v=tsREwMZdHmg', 1),
(2, 1, 'L1.BT.01.V02', 'video', 'https://www.youtube.com/watch?v=W6GFoY2STdc', 2),
(3, 1, 'L1.BT.01.V03', 'video', 'https://www.youtube.com/watch?v=4eomxDxnBhw', 3),
(4, 2, 'L1.BT.01.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.01_v01.mp4', 1),
(5, 2, 'L1.BT.01.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.01_v02.mp4', 2),
(6, 2, 'L1.BT.01.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.01_v03.mp4', 3),
(7, 2, 'L1.BT.01.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.01_v04.mp4', 4),
(8, 3, 'L1.BT.01.V01', 'video', 'https://www.youtube.com/watch?v=tsREwMZdHmg', 1),
(9, 3, 'L1.BT.01.V02', 'video', 'https://www.youtube.com/watch?v=W6GFoY2STdc', 2),
(10, 3, 'L1.BT.01.V03', 'video', 'https://www.youtube.com/watch?v=4eomxDxnBhw', 3),
(11, 3, 'L1.BT.01.V04', 'video', 'https://www.youtube.com/watch?v=ZKcsAk7u0Fw', 4),
(12, 4, 'L1.BT.01.V01', 'video', 'https://qipedc.moet.gov.vn/dictionary', 1),
(13, 5, 'L1.BT.01.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.01_v01.mp4', 1),
(14, 5, 'L1.BT.01.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.01_v02.mp4', 2),
(15, 5, 'L1.BT.01.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.01_v03.mp4', 3),
(16, 5, 'L1.BT.01.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.01_v04.mp4', 4),
(17, 6, 'L1.BT.01.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.01_v01.mp4', 1),
(18, 6, 'L1.BT.01.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.01_v02.mp4', 2),
(19, 6, 'L1.BT.01.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.01_v03.mp4', 3),
(20, 6, 'L1.BT.01.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.01_v04.mp4', 4),
(21, 7, 'L1.BT.02.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v01.mp4', 1),
(22, 7, 'L1.BT.02.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v02.mp4', 2),
(23, 7, 'L1.BT.02.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v03.mp4', 3),
(24, 7, 'L1.BT.02.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v04.mp4', 4),
(25, 8, 'L1.BT.02.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v01.mp4', 1),
(26, 8, 'L1.BT.02.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v02.mp4', 2),
(27, 8, 'L1.BT.02.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v03.mp4', 3),
(28, 8, 'L1.BT.02.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v04.mp4', 4),
(29, 9, 'L1.BT.02.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v01.mp4', 1),
(30, 9, 'L1.BT.02.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v02.mp4', 2),
(31, 9, 'L1.BT.02.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v03.mp4', 3),
(32, 9, 'L1.BT.02.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v04.mp4', 4),
(33, 10, 'L1.BT.02.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v01.mp4', 1),
(34, 10, 'L1.BT.02.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v02.mp4', 2),
(35, 10, 'L1.BT.02.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v03.mp4', 3),
(36, 10, 'L1.BT.02.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v04.mp4', 4),
(37, 11, 'L1.BT.02.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v01.mp4', 1),
(38, 11, 'L1.BT.02.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v02.mp4', 2),
(39, 11, 'L1.BT.02.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v03.mp4', 3),
(40, 11, 'L1.BT.02.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v04.mp4', 4),
(41, 12, 'L1.BT.02.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v01.mp4', 1),
(42, 12, 'L1.BT.02.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v02.mp4', 2),
(43, 12, 'L1.BT.02.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v03.mp4', 3),
(44, 12, 'L1.BT.02.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v04.mp4', 4),
(45, 13, 'L1.BT.02.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v01.mp4', 1),
(46, 13, 'L1.BT.02.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v02.mp4', 2),
(47, 13, 'L1.BT.02.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v03.mp4', 3),
(48, 13, 'L1.BT.02.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.02_v04.mp4', 4),
(49, 14, 'L1.BT.03.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v01.mp4', 1),
(50, 14, 'L1.BT.03.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v02.mp4', 2),
(51, 14, 'L1.BT.03.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v03.mp4', 3),
(52, 14, 'L1.BT.03.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v04.mp4', 4),
(53, 15, 'L1.BT.03.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v01.mp4', 1),
(54, 15, 'L1.BT.03.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v02.mp4', 2),
(55, 15, 'L1.BT.03.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v03.mp4', 3),
(56, 15, 'L1.BT.03.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v04.mp4', 4),
(57, 16, 'L1.BT.03.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v01.mp4', 1),
(58, 16, 'L1.BT.03.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v02.mp4', 2),
(59, 16, 'L1.BT.03.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v03.mp4', 3),
(60, 16, 'L1.BT.03.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v04.mp4', 4),
(61, 17, 'L1.BT.03.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v01.mp4', 1),
(62, 17, 'L1.BT.03.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v02.mp4', 2),
(63, 17, 'L1.BT.03.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v03.mp4', 3),
(64, 17, 'L1.BT.03.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v04.mp4', 4),
(65, 18, 'L1.BT.03.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v01.mp4', 1),
(66, 18, 'L1.BT.03.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v02.mp4', 2),
(67, 18, 'L1.BT.03.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v03.mp4', 3),
(68, 18, 'L1.BT.03.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v04.mp4', 4),
(69, 19, 'L1.BT.03.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v01.mp4', 1),
(70, 19, 'L1.BT.03.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v02.mp4', 2),
(71, 19, 'L1.BT.03.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v03.mp4', 3),
(72, 19, 'L1.BT.03.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.03_v04.mp4', 4),
(73, 20, 'L1.BT.04.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v01.mp4', 1),
(74, 20, 'L1.BT.04.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v02.mp4', 2),
(75, 20, 'L1.BT.04.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v03.mp4', 3),
(76, 20, 'L1.BT.04.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v04.mp4', 4),
(77, 21, 'L1.BT.04.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v01.mp4', 1),
(78, 21, 'L1.BT.04.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v02.mp4', 2),
(79, 21, 'L1.BT.04.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v03.mp4', 3),
(80, 21, 'L1.BT.04.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v04.mp4', 4),
(81, 22, 'L1.BT.04.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v01.mp4', 1),
(82, 22, 'L1.BT.04.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v02.mp4', 2),
(83, 22, 'L1.BT.04.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v03.mp4', 3),
(84, 22, 'L1.BT.04.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v04.mp4', 4),
(85, 23, 'L1.BT.04.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v01.mp4', 1),
(86, 23, 'L1.BT.04.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v02.mp4', 2),
(87, 23, 'L1.BT.04.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v03.mp4', 3),
(88, 23, 'L1.BT.04.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v04.mp4', 4),
(89, 24, 'L1.BT.04.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v01.mp4', 1),
(90, 24, 'L1.BT.04.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v02.mp4', 2),
(91, 24, 'L1.BT.04.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v03.mp4', 3),
(92, 24, 'L1.BT.04.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v04.mp4', 4),
(93, 25, 'L1.BT.04.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v01.mp4', 1),
(94, 25, 'L1.BT.04.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v02.mp4', 2),
(95, 25, 'L1.BT.04.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v03.mp4', 3),
(96, 25, 'L1.BT.04.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v04.mp4', 4),
(97, 26, 'L1.BT.04.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v01.mp4', 1),
(98, 26, 'L1.BT.04.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v02.mp4', 2),
(99, 26, 'L1.BT.04.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v03.mp4', 3),
(100, 26, 'L1.BT.04.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.04_v04.mp4', 4),
(101, 27, 'L1.BT.05.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v01.mp4', 1),
(102, 27, 'L1.BT.05.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v02.mp4', 2),
(103, 27, 'L1.BT.05.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v03.mp4', 3),
(104, 27, 'L1.BT.05.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v04.mp4', 4),
(105, 28, 'L1.BT.05.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v01.mp4', 1),
(106, 28, 'L1.BT.05.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v02.mp4', 2),
(107, 28, 'L1.BT.05.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v03.mp4', 3),
(108, 28, 'L1.BT.05.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v04.mp4', 4),
(109, 29, 'L1.BT.05.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v01.mp4', 1),
(110, 29, 'L1.BT.05.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v02.mp4', 2),
(111, 29, 'L1.BT.05.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v03.mp4', 3),
(112, 29, 'L1.BT.05.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v04.mp4', 4),
(113, 30, 'L1.BT.05.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v01.mp4', 1),
(114, 30, 'L1.BT.05.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v02.mp4', 2),
(115, 30, 'L1.BT.05.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v03.mp4', 3),
(116, 30, 'L1.BT.05.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v04.mp4', 4),
(117, 31, 'L1.BT.05.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v01.mp4', 1),
(118, 31, 'L1.BT.05.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v02.mp4', 2),
(119, 31, 'L1.BT.05.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v03.mp4', 3),
(120, 31, 'L1.BT.05.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v04.mp4', 4),
(121, 32, 'L1.BT.05.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v01.mp4', 1),
(122, 32, 'L1.BT.05.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v02.mp4', 2),
(123, 32, 'L1.BT.05.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v03.mp4', 3),
(124, 32, 'L1.BT.05.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v04.mp4', 4),
(125, 33, 'L1.BT.05.V01', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v01.mp4', 1),
(126, 33, 'L1.BT.05.V02', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v02.mp4', 2),
(127, 33, 'L1.BT.05.V03', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v03.mp4', 3),
(128, 33, 'L1.BT.05.V04', 'video', 'https://vietsign.ibme.edu.vn/videos/L1.BT.05_v04.mp4', 4)
ON DUPLICATE KEY UPDATE `source_url` = VALUES(`source_url`), `display_order` = VALUES(`display_order`);

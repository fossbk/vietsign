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
(1, 1, 'L1.BT.01.T01', 'T', 'FlipCardViewer', '1. Thẻ lật thông minh (trẻ làm ký hiệu theo video mẫu)', '3 thẻ chữ A, B, thanh huyền và 3 thẻ tranh "bà, ba, ba ba" đặt cạnh nhau. Trẻ chạm vào từng thẻ thì mặt trong được lật ra là video chữ cái ngón tay A. Trẻ sẽ xem là làm chữ cái ngón tay A theo mẫu. Tương tự với thẻ B và dấu huyền. Mỗi video có thể chọn tốc độ nhanh, chậm, tua lại.', 1, '{"source":"- Chữ A: https://www.youtube.com/watch?v=tsREwMZdHmg \\n- Chữ B: https://www.youtube.com/watch?v=W6GFoY2STdc \\n- Dấu huyền: https://www.youtube.com/watch?v=4eomxDxnBhw","targetWords":["Chữ A","Chữ B","Dấu huyền"]}', 80.0, 1),
(2, 1, 'L1.BT.01.T02', 'T', 'LineMatchingGame', '2. Nối kí hiệu tương ứng với hình', 'Chia làm 2 cột:
1 cột là chữ a, b, thanh huyền và thẻ tranh bà, ba, ba ba
1 cột là kí hiệu sắp xếp ngẫu nhiên 
HS sẽ nối hai cột với nhau', 2, '{"source":"Sách bài tập bổ trợ Tiếng Việt tập 2 - trang....","targetWords":["Chữ A","Chữ B","Dấu huyền","Bà","Ba","Ba ba"],"pairs":[{"text":"Chữ A"},{"text":"Chữ B"},{"text":"Dấu huyền"},{"text":"Bà"},{"text":"Ba"},{"text":"Ba ba"}]}', 80.0, 1),
(3, 1, 'L1.BT.01.T03', 'T', 'ChoiceQuizGame', '3. Xem hình chọn kí hiệu tương ứng', '1 thẻ hình ở dòng trên
2 video kí hiệu ở dòng dưới
HS nhìn thẻ hình, xem và chọn video kí hiệu phù hợp
Thực hiện lần lượt với thẻ chữ A (A và dấu huyền), B (dấu huyền và B) và thẻ tranh bà (bà và ba)', 3, '{"source":"- Chữ A: https://www.youtube.com/watch?v=tsREwMZdHmg  \\n- Chữ B: https://www.youtube.com/watch?v=W6GFoY2STdc  \\n- Dấu huyền: https://www.youtube.com/watch?v=4eomxDxnBhw \\n- Bà: https://www.youtube.com/watch?v=ZKcsAk7u0Fw \\n- Ba: quay bổ sung","targetWords":["Chữ A","Chữ B","Dấu huyền","Bà","Ba"],"questions":[{"id":1,"promptType":"text","promptContent":"Chữ A","options":[{"id":1,"text":"Chữ A","isCorrect":true,"mediaUrl":"https://www.youtube.com/watch?v=tsREwMZdHmg","mediaType":"video"},{"id":2,"text":"Chữ B","isCorrect":false,"mediaUrl":"https://www.youtube.com/watch?v=W6GFoY2STdc","mediaType":"video"},{"id":3,"text":"Dấu huyền","isCorrect":false,"mediaUrl":"https://www.youtube.com/watch?v=4eomxDxnBhw","mediaType":"video"}]},{"id":2,"promptType":"text","promptContent":"Chữ B","options":[{"id":11,"text":"Chữ B","isCorrect":true,"mediaUrl":"https://www.youtube.com/watch?v=W6GFoY2STdc","mediaType":"video"},{"id":12,"text":"Dấu huyền","isCorrect":false,"mediaUrl":"https://www.youtube.com/watch?v=4eomxDxnBhw","mediaType":"video"},{"id":13,"text":"Bà","isCorrect":false,"mediaUrl":"https://www.youtube.com/watch?v=ZKcsAk7u0Fw","mediaType":"video"}]},{"id":3,"promptType":"text","promptContent":"Dấu huyền","options":[{"id":21,"text":"Dấu huyền","isCorrect":true,"mediaUrl":"https://www.youtube.com/watch?v=4eomxDxnBhw","mediaType":"video"},{"id":22,"text":"Bà","isCorrect":false,"mediaUrl":"https://www.youtube.com/watch?v=ZKcsAk7u0Fw","mediaType":"video"},{"id":23,"text":"Ba","isCorrect":false,"mediaUrl":"/images/study/defaultvideo.png","mediaType":"image"}]},{"id":4,"promptType":"text","promptContent":"Bà","options":[{"id":31,"text":"Bà","isCorrect":true,"mediaUrl":"https://www.youtube.com/watch?v=ZKcsAk7u0Fw","mediaType":"video"},{"id":32,"text":"Ba","isCorrect":false,"mediaUrl":"/images/study/defaultvideo.png","mediaType":"image"},{"id":33,"text":"Chữ A","isCorrect":false,"mediaUrl":"https://www.youtube.com/watch?v=tsREwMZdHmg","mediaType":"video"}]},{"id":5,"promptType":"text","promptContent":"Ba","options":[{"id":41,"text":"Ba","isCorrect":true,"mediaUrl":"/images/study/defaultvideo.png","mediaType":"image"},{"id":42,"text":"Chữ A","isCorrect":false,"mediaUrl":"https://www.youtube.com/watch?v=tsREwMZdHmg","mediaType":"video"},{"id":43,"text":"Chữ B","isCorrect":false,"mediaUrl":"https://www.youtube.com/watch?v=W6GFoY2STdc","mediaType":"video"}]}]}', 80.0, 1),
(4, 1, 'L1.BT.01.T04', 'T', 'ChoiceQuizGame', '4. Xem video kí hiệu chọn thẻ tranh tương ứng', '1 video kí hiệu ở dòng trên
2 thẻ tranh ở dòng dưới
HS xem video và chọn thẻ tranh tương ứng
Thực hiện lần lượt với các video dấu huyền (thẻ chữ A và thẻ dấu huyền), ba (thẻ bà và ba), ba ba (thẻ ba ba và B)', 4, '{"source":"- Ba ba: https://qipedc.moet.gov.vn/dictionary (đánh từ khóa ba ba vào tìm kiếm)","targetWords":["Dấu huyền","Ba","Ba ba"],"questions":[{"id":1,"promptType":"image","promptContent":"/images/study/defaultvideo.png","options":[{"id":1,"text":"Dấu huyền","isCorrect":true},{"id":2,"text":"Ba","isCorrect":false},{"id":3,"text":"Ba ba","isCorrect":false}]},{"id":2,"promptType":"image","promptContent":"/images/study/defaultvideo.png","options":[{"id":11,"text":"Ba","isCorrect":true},{"id":12,"text":"Ba ba","isCorrect":false},{"id":13,"text":"Dấu huyền","isCorrect":false}]},{"id":3,"promptType":"image","promptContent":"/images/study/defaultvideo.png","options":[{"id":21,"text":"Ba ba","isCorrect":true},{"id":22,"text":"Dấu huyền","isCorrect":false},{"id":23,"text":"Ba","isCorrect":false}]}]}', 80.0, 1),
(5, 1, 'L1.BT.01.T05', 'T', 'ChoiceQuizGame', '5. Chọn thẻ chữ tương ứng với kí hiệu', '1 video kí hiệu ở dòng trên
2 thẻ chữ ở dòng dưới
Thực hiện lần lượt video kí hiệu chữ A (thẻ chữ A và Bà), chữ B (thẻ chữ ba và B), bà (thẻ chữ bà và ba ba), dấu huyền (thẻ dấu huyền và bà), ba (thẻ chữ ba và baba), ba ba (thẻ chữ bà và ba ba)', 5, '{"source":null,"targetWords":["Chữ A","Chữ B","Dấu huyền","Bà","Ba","Ba ba"],"questions":[{"id":1,"promptType":"image","promptContent":"/A-Z/A.webp","options":[{"id":1,"text":"Chữ A","isCorrect":true},{"id":2,"text":"Chữ B","isCorrect":false},{"id":3,"text":"Dấu huyền","isCorrect":false}]},{"id":2,"promptType":"image","promptContent":"/A-Z/B.webp","options":[{"id":11,"text":"Chữ B","isCorrect":true},{"id":12,"text":"Dấu huyền","isCorrect":false},{"id":13,"text":"Bà","isCorrect":false}]},{"id":3,"promptType":"image","promptContent":"/images/study/defaultvideo.png","options":[{"id":21,"text":"Dấu huyền","isCorrect":true},{"id":22,"text":"Bà","isCorrect":false},{"id":23,"text":"Ba","isCorrect":false}]},{"id":4,"promptType":"image","promptContent":"/images/study/defaultvideo.png","options":[{"id":31,"text":"Bà","isCorrect":true},{"id":32,"text":"Ba","isCorrect":false},{"id":33,"text":"Ba ba","isCorrect":false}]},{"id":5,"promptType":"image","promptContent":"/images/study/defaultvideo.png","options":[{"id":41,"text":"Ba","isCorrect":true},{"id":42,"text":"Ba ba","isCorrect":false},{"id":43,"text":"Chữ A","isCorrect":false}]},{"id":6,"promptType":"image","promptContent":"/images/study/defaultvideo.png","options":[{"id":51,"text":"Ba ba","isCorrect":true},{"id":52,"text":"Chữ A","isCorrect":false},{"id":53,"text":"Chữ B","isCorrect":false}]}]}', 80.0, 1),
(6, 1, 'L1.BT.01.T06', 'T', 'VideoPracticeRecorder', '6. Làm kí hiệu tương ứng với hình', 'Từng thẻ tranh A, B, dấu huyền, bà, ba, ba ba xuất hiện
Hướng dẫn người dùng tự quay video và đăng tải video để giáo viên kiểm tra và có thể phản hồi trực tiếp trên bài đăng của học sinh', 6, '{"source":null,"targetWords":["Chữ A","Chữ B","Dấu huyền","Bà","Ba","Ba ba"]}', 80.0, 1),
(7, 2, 'L1.BT.02.T01', 'T', 'FlipCardViewer', '1.Thẻ lật thông minh (giới thiệu kí hiệu mới)', 'Chia 3 phần để không quá 6 thẻ/phần:
 - Phần 1: 4 thẻ chữ C, E, Ê, thanh sắc
 - Phần 2: 3 thẻ tranh ca, cà, cá
 - Phần 3: 3 thẻ tranh bè, bé, bế
 Trẻ chạm vào từng thẻ thì mặt trong lật ra là video kí hiệu tương ứng, trẻ xem và làm theo mẫu.
 Lưu ý: Mỗi video có thể chọn tốc độ nhanh, chậm, tua lại.', 1, '{"source":null,"targetWords":["Chữ C","Chữ E","Chữ Ê","Dấu sắc","Ca","Cà","Cá","Bè","Bé","Bế"]}', 80.0, 1),
(8, 2, 'L1.BT.02.T02', 'T', 'LineMatchingGame', '2. Nối kí hiệu tương ứng với hình', 'Chia làm 2 cột, mỗi lượt tối đa 5 cặp:
 1 cột là chữ c, e, ê, thanh sắc và thẻ tranh ca, cà, cá, bè, bé, bế
 1 cột là kí hiệu sắp xếp ngẫu nhiên
 HS sẽ nối hai cột với nhau
 Lượt 1: c, e, ê, thanh sắc - Lượt 2: ca, cà, cá - Lượt 3: bè, bé, bế', 2, '{"source":null,"targetWords":["Chữ C","Chữ E","Chữ Ê","Dấu sắc","Ca","Cà","Cá","Bè","Bé","Bế"],"pairs":[{"text":"Chữ C"},{"text":"Chữ E"},{"text":"Chữ Ê"},{"text":"Dấu sắc"},{"text":"Ca"},{"text":"Cà"},{"text":"Cá"},{"text":"Bè"},{"text":"Bé"},{"text":"Bế"}]}', 80.0, 1),
(9, 2, 'L1.BT.02.T03', 'T', 'JigsawPuzzleGame', '3. Ghép hình', 'Thẻ ghép 2 miếng có khớp răng cưa: một nửa là ảnh kí hiệu, nửa kia là mặt chữ tương ứng.
 Các miếng xáo trộn, HS kéo - thả để ghép. Ghép đúng thì 2 miếng dính liền và sáng lên, ghép sai thì miếng bật về chỗ cũ kèm rung nhẹ (không mất thẻ).
 Mỗi lượt tối đa 5 cặp. Lượt 1 dùng chữ cái, lượt 2 dùng từ.', 3, '{"source":null,"targetWords":["Chữ C","Chữ E","Chữ Ê","Dấu sắc","Ca","Cà","Cá","Bè","Bé","Bế"]}', 80.0, 1),
(10, 2, 'L1.BT.02.T04', 'T', 'ChoiceQuizGame', '4. Xem video kí hiệu chọn thẻ chữ', '1 video kí hiệu ở dòng trên
 3 thẻ chữ ở dòng dưới (nâng lên 3 lựa chọn vì đây là hoạt động chính)
 \'- video ca (ca / cà / cá), video cà (ca / cà / cá), video cá (ca / cà / cá),
 \'- video bè (bè / bé / bế), video bé (bè / bé / bế), video bế (bè / bé / bế)
 -Vị trí đáp án xáo trộn mỗi lần. Sai thì phát lại video rồi cho chọn lại (tối đa 2 lần).', 4, '{"source":null,"targetWords":["Ca","Cà","Cá","Bè","Bé","Bế"],"questions":[{"id":1,"promptType":"image","promptContent":"/images/study/defaultvideo.png","options":[{"id":1,"text":"Ca","isCorrect":true},{"id":2,"text":"Cà","isCorrect":false},{"id":3,"text":"Cá","isCorrect":false}]},{"id":2,"promptType":"image","promptContent":"/images/study/defaultvideo.png","options":[{"id":11,"text":"Cà","isCorrect":true},{"id":12,"text":"Cá","isCorrect":false},{"id":13,"text":"Bè","isCorrect":false}]},{"id":3,"promptType":"image","promptContent":"/images/study/defaultvideo.png","options":[{"id":21,"text":"Cá","isCorrect":true},{"id":22,"text":"Bè","isCorrect":false},{"id":23,"text":"Bé","isCorrect":false}]},{"id":4,"promptType":"image","promptContent":"/images/study/defaultvideo.png","options":[{"id":31,"text":"Bè","isCorrect":true},{"id":32,"text":"Bé","isCorrect":false},{"id":33,"text":"Bế","isCorrect":false}]},{"id":5,"promptType":"image","promptContent":"/images/study/defaultvideo.png","options":[{"id":41,"text":"Bé","isCorrect":true},{"id":42,"text":"Bế","isCorrect":false},{"id":43,"text":"Ca","isCorrect":false}]},{"id":6,"promptType":"image","promptContent":"/images/study/defaultvideo.png","options":[{"id":51,"text":"Bế","isCorrect":true},{"id":52,"text":"Ca","isCorrect":false},{"id":53,"text":"Cà","isCorrect":false}]}]}', 80.0, 1),
(11, 2, 'L1.BT.02.T05', 'T', 'BucketDropGame', '5.  Thả hình', '3 giỏ: KHÔNG DẤU / DẤU HUYỀN / DẤU SẮC, mỗi giỏ có biểu tượng kí hiệu dấu thanh ở trên.
 HS kéo các thẻ từ (ba, bà, ca, cà, cá, be, bè, bé) vào đúng giỏ. Mỗi thẻ vừa hiện mặt chữ vừa có nút nhỏ xem lại video kí hiệu.
 Vùng thả rộng và sáng lên khi kéo tới. Thả sai thì thẻ bật ra chứ không mất.', 5, '{"source":null,"targetWords":["Ba","Bà","Ca","Cà","Cá","Be","Bè","Bé"],"buckets":[{"id":1,"label":"KHÔNG DẤU","color":"blue"},{"id":2,"label":"DẤU HUYỀN","color":"emerald"},{"id":3,"label":"DẤU SẮC","color":"amber"}],"items":[{"label":"Ba","targetBucketId":1,"mediaIndex":0},{"label":"Bà","targetBucketId":2,"mediaIndex":1},{"label":"Ca","targetBucketId":1,"mediaIndex":2},{"label":"Cà","targetBucketId":2,"mediaIndex":3},{"label":"Cá","targetBucketId":3,"mediaIndex":4},{"label":"Be","targetBucketId":1,"mediaIndex":5},{"label":"Bè","targetBucketId":2,"mediaIndex":6},{"label":"Bé","targetBucketId":3,"mediaIndex":7}]}', 80.0, 1),
(12, 2, 'L1.BT.02.T06', 'T', 'MemoryCardGame', '6. Lật thẻ tìm cặp', 'Bảng 12 thẻ úp (6 cặp): 1 thẻ mặt chữ - 1 thẻ kí hiệu, lấy đúng 6 từ ca, cà, cá, bè, bé, bế.
 HS lật 2 thẻ mỗi lượt; đúng cặp thì thẻ sáng lên và ở lại, sai thì úp lại sau 1 giây.
 KHÔNG đếm giờ, chỉ đếm số lượt lật; hết bài hiện số sao theo số lượt.', 6, '{"source":null,"targetWords":["Ca","Cà","Cá","Bè","Bé","Bế"]}', 80.0, 1),
(13, 2, 'L1.BT.02.T07', 'T', 'VideoPracticeRecorder', '7. Làm kí hiệu tương ứng với hình', 'Từng thẻ C, E, Ê, thanh sắc, ca, cà, cá, bè, bé, bế xuất hiện
 Hướng dẫn người dùng tự quay video và đăng tải video để giáo viên kiểm tra và có thể phản hồi trực tiếp trên bài đăng của học sinh', 7, '{"source":null,"targetWords":["Chữ C","Chữ E","Chữ Ê","Dấu sắc","Ca","Cà","Cá","Bè","Bé","Bế"]}', 80.0, 1),
(14, 3, 'L1.BT.03.T01', 'T', 'FlipCardViewer', '1. Thẻ lật thông minh (giới thiệu kí hiệu số)', '5 thẻ chữ số 1, 2, 3, 4, 5. Trẻ chạm vào từng thẻ thì mặt trong lật ra là video kí hiệu số bằng ngón tay, trẻ xem và làm theo mẫu.
 Mỗi thẻ chữ số hiện kèm số chấm tròn tương ứng để HS gắn số với lượng ngay từ đầu. Video có nút tua lại và chọn tốc độ nhanh/chậm.', 1, '{"source":null,"targetWords":["1","2","3","4","5"]}', 80.0, 1),
(15, 3, 'L1.BT.03.T02', 'T', 'ChoiceQuizGame', '2. Đếm đồ vật và chọn kí hiệu số', 'Hiện một nhóm đồ vật (ví dụ 3 con cá) xếp thành hàng đều, không chồng lấn.
 HS chạm vào từng đồ vật thì đồ vật sáng lên và hiện số thứ tự 1, 2, 3… để hỗ trợ đếm.
 Sau đó HS chọn 1 trong 3 video kí hiệu số ở dòng dưới.
 Đồ vật lấy theo từ đã học (ba ba, cá, cà) để vừa ôn từ vừa học số.', 2, '{"source":null,"targetWords":["1","2","3","4","5"],"questions":[{"id":1,"promptType":"text","promptContent":"1","options":[{"id":1,"text":"1","isCorrect":true,"mediaUrl":"/1-9/1.webp","mediaType":"image"},{"id":2,"text":"2","isCorrect":false,"mediaUrl":"/1-9/2.webp","mediaType":"image"},{"id":3,"text":"3","isCorrect":false,"mediaUrl":"/1-9/3.webp","mediaType":"image"}]},{"id":2,"promptType":"text","promptContent":"2","options":[{"id":11,"text":"2","isCorrect":true,"mediaUrl":"/1-9/2.webp","mediaType":"image"},{"id":12,"text":"3","isCorrect":false,"mediaUrl":"/1-9/3.webp","mediaType":"image"},{"id":13,"text":"4","isCorrect":false,"mediaUrl":"/1-9/4.webp","mediaType":"image"}]},{"id":3,"promptType":"text","promptContent":"3","options":[{"id":21,"text":"3","isCorrect":true,"mediaUrl":"/1-9/3.webp","mediaType":"image"},{"id":22,"text":"4","isCorrect":false,"mediaUrl":"/1-9/4.webp","mediaType":"image"},{"id":23,"text":"5","isCorrect":false,"mediaUrl":"/1-9/5.webp","mediaType":"image"}]},{"id":4,"promptType":"text","promptContent":"4","options":[{"id":31,"text":"4","isCorrect":true,"mediaUrl":"/1-9/4.webp","mediaType":"image"},{"id":32,"text":"5","isCorrect":false,"mediaUrl":"/1-9/5.webp","mediaType":"image"},{"id":33,"text":"1","isCorrect":false,"mediaUrl":"/1-9/1.webp","mediaType":"image"}]},{"id":5,"promptType":"text","promptContent":"5","options":[{"id":41,"text":"5","isCorrect":true,"mediaUrl":"/1-9/5.webp","mediaType":"image"},{"id":42,"text":"1","isCorrect":false,"mediaUrl":"/1-9/1.webp","mediaType":"image"},{"id":43,"text":"2","isCorrect":false,"mediaUrl":"/1-9/2.webp","mediaType":"image"}]}]}', 80.0, 1),
(16, 3, 'L1.BT.03.T03', 'T', 'LineMatchingGame', '3. Nối số lượng - kí hiệu', 'Chia làm 2 cột, 5 cặp:
 1 cột là thẻ tranh nhóm đồ vật (1-5 vật)
 1 cột là kí hiệu số sắp xếp ngẫu nhiên
 HS sẽ nối hai cột với nhau', 3, '{"source":null,"targetWords":["1","2","3","4","5"],"pairs":[{"text":"1"},{"text":"2"},{"text":"3"},{"text":"4"},{"text":"5"}]}', 80.0, 1),
(17, 3, 'L1.BT.03.T04', 'T', 'JigsawPuzzleGame', '4. Ghép hình thẻ 2 miếng (chữ số - kí hiệu)', 'Thẻ ghép 2 miếng: nửa là chữ số, nửa là ảnh bàn tay làm kí hiệu số. 5 cặp mỗi lượt.
 Ghép đúng thì 2 miếng dính liền và sáng lên, ghép sai thì bật về chỗ cũ.', 4, '{"source":null,"targetWords":["1","2","3","4","5"]}', 80.0, 1),
(18, 3, 'L1.BT.03.T05', 'T', 'SequenceOrderGame', '5. Sắp xếp thứ tự 1 → 5', '5 thẻ kí hiệu số xáo trộn ở dòng trên, 5 ô trống viền nét đứt ở dòng dưới.
 HS kéo - thả vào đúng thứ tự tăng dần. Các ô có sẵn hình bậc thang cao dần để gợi ý trực quan.
 Chỉ kiểm tra khi HS bấm nút Kiểm tra. Làm lại thì giữ nguyên các ô đã đúng.', 5, '{"source":null,"targetWords":["1","2","3","4","5"],"sequence":["1","2","3","4","5"]}', 80.0, 1),
(19, 3, 'L1.BT.03.T06', 'T', 'VideoPracticeRecorder', '6. Làm kí hiệu tương ứng với hình', 'Từng thẻ số 1, 2, 3, 4, 5 và các thẻ nhóm đồ vật xuất hiện
 Hướng dẫn người dùng tự quay video và đăng tải video để giáo viên kiểm tra và có thể phản hồi trực tiếp trên bài đăng của học sinh', 6, '{"source":null,"targetWords":["1","2","3","4","5"]}', 80.0, 1),
(20, 4, 'L1.BT.04.T01', 'T', 'FlipCardViewer', '1. Thẻ lật thông minh (giới thiệu kí hiệu số)', '5 thẻ chữ số 6, 7, 8, 9, 10 kèm số chấm tròn tương ứng (xếp 2 hàng cho dễ nhìn).
 Trẻ chạm vào thẻ thì lật ra video kí hiệu số, trẻ xem và làm theo mẫu.
 Các số dễ nhầm (6-9, 7-8) quay thêm 1 góc nghiêng, HS bấm nút đổi góc để xem. Có nút kính lúp phóng to bàn tay.', 1, '{"source":null,"targetWords":["6","7","8","9","10"]}', 80.0, 1),
(21, 4, 'L1.BT.04.T02', 'T', 'ChoiceQuizGame', '2. Phân biệt', '1 video kí hiệu số ở dòng trên
 2 thẻ chữ số ở dòng dưới, luôn là cặp dễ nhầm:
 video 6 (6 và 9), video 9 (9 và 6), video 7 (7 và 8), video 8 (8 và 7), video 10 (10 và 5 - ôn Bài 3)
 Video chạy mặc định, có nút kính lúp. Chọn sai thì phát lại video chậm có KHOANH TRÒN vị trí ngón tay khác biệt giữa 2 số, rồi cho chọn lại.', 2, '{"source":null,"targetWords":["6","7","8","9","10"],"questions":[{"id":1,"promptType":"image","promptContent":"/1-9/6.webp","options":[{"id":1,"text":"6","isCorrect":true},{"id":2,"text":"7","isCorrect":false},{"id":3,"text":"8","isCorrect":false}]},{"id":2,"promptType":"image","promptContent":"/1-9/7.webp","options":[{"id":11,"text":"7","isCorrect":true},{"id":12,"text":"8","isCorrect":false},{"id":13,"text":"9","isCorrect":false}]},{"id":3,"promptType":"image","promptContent":"/1-9/8.webp","options":[{"id":21,"text":"8","isCorrect":true},{"id":22,"text":"9","isCorrect":false},{"id":23,"text":"10","isCorrect":false}]},{"id":4,"promptType":"image","promptContent":"/1-9/9.webp","options":[{"id":31,"text":"9","isCorrect":true},{"id":32,"text":"10","isCorrect":false},{"id":33,"text":"6","isCorrect":false}]},{"id":5,"promptType":"image","promptContent":"/images/study/defaultvideo.png","options":[{"id":41,"text":"10","isCorrect":true},{"id":42,"text":"6","isCorrect":false},{"id":43,"text":"7","isCorrect":false}]}]}', 80.0, 1),
(22, 4, 'L1.BT.04.T03', 'T', 'ChoiceQuizGame', '3. Đếm đồ vật và chọn kí hiệu số', 'Hiện nhóm 6-10 đồ vật xếp thành hai hàng đều nhau(số lượng lớn nên xếp 1 hàng sẽ khó đếm).
 HS chạm vào từng đồ vật thì đồ vật sáng lên và hiện số thứ tự.
 Sau đó HS chọn 1 trong 3 video kí hiệu số.', 3, '{"source":null,"targetWords":["6","7","8","9","10"],"questions":[{"id":1,"promptType":"text","promptContent":"6","options":[{"id":1,"text":"6","isCorrect":true,"mediaUrl":"/1-9/6.webp","mediaType":"image"},{"id":2,"text":"7","isCorrect":false,"mediaUrl":"/1-9/7.webp","mediaType":"image"},{"id":3,"text":"8","isCorrect":false,"mediaUrl":"/1-9/8.webp","mediaType":"image"}]},{"id":2,"promptType":"text","promptContent":"7","options":[{"id":11,"text":"7","isCorrect":true,"mediaUrl":"/1-9/7.webp","mediaType":"image"},{"id":12,"text":"8","isCorrect":false,"mediaUrl":"/1-9/8.webp","mediaType":"image"},{"id":13,"text":"9","isCorrect":false,"mediaUrl":"/1-9/9.webp","mediaType":"image"}]},{"id":3,"promptType":"text","promptContent":"8","options":[{"id":21,"text":"8","isCorrect":true,"mediaUrl":"/1-9/8.webp","mediaType":"image"},{"id":22,"text":"9","isCorrect":false,"mediaUrl":"/1-9/9.webp","mediaType":"image"},{"id":23,"text":"10","isCorrect":false,"mediaUrl":"/images/study/defaultvideo.png","mediaType":"image"}]},{"id":4,"promptType":"text","promptContent":"9","options":[{"id":31,"text":"9","isCorrect":true,"mediaUrl":"/1-9/9.webp","mediaType":"image"},{"id":32,"text":"10","isCorrect":false,"mediaUrl":"/images/study/defaultvideo.png","mediaType":"image"},{"id":33,"text":"6","isCorrect":false,"mediaUrl":"/1-9/6.webp","mediaType":"image"}]},{"id":5,"promptType":"text","promptContent":"10","options":[{"id":41,"text":"10","isCorrect":true,"mediaUrl":"/images/study/defaultvideo.png","mediaType":"image"},{"id":42,"text":"6","isCorrect":false,"mediaUrl":"/1-9/6.webp","mediaType":"image"},{"id":43,"text":"7","isCorrect":false,"mediaUrl":"/1-9/7.webp","mediaType":"image"}]}]}', 80.0, 1),
(23, 4, 'L1.BT.04.T04', 'T', 'SequenceOrderGame', '4. Điền số còn thiếu trong dãy', 'Dãy số có 1-2 ô trống, ví dụ: 6, 7, __, 9, __ 
 HS kéo thẻ kí hiệu số vào ô trống. Mỗi lượt 3 dãy.
 Mức nâng cao: dãy đếm ngược 10, 9, __, 7, __', 4, '{"source":null,"targetWords":["6","7","8","9","10"],"sequence":["6","7","8","9","10"],"fixedSlots":[0,1,3]}', 80.0, 1),
(24, 4, 'L1.BT.04.T05', 'T', 'SequenceOrderGame', '5. Sắp xếp thứ tự 6 → 10', '5 thẻ kí hiệu số xáo trộn, HS kéo - thả theo thứ tự tăng dần.
 Mức nâng cao (mở khoá sau khi làm đúng): sắp xếp cả dãy 1 → 10 bằng thẻ kí hiệu.', 5, '{"source":null,"targetWords":["6","7","8","9","10"],"sequence":["6","7","8","9","10"]}', 80.0, 1),
(25, 4, 'L1.BT.04.T06', 'T', 'MemoryCardGame', '6. Lật thẻ tìm cặp (trò chơi củng cố)', '10 thẻ úp (5 cặp): 1 thẻ chữ số - 1 thẻ kí hiệu số 6-10. Luật như trò lật thẻ ở Bài 2, không đếm giờ.', 6, '{"source":null,"targetWords":["6","7","8","9","10"]}', 80.0, 1),
(26, 4, 'L1.BT.04.T07', 'T', 'VideoPracticeRecorder', '7. Làm kí hiệu tương ứng với hình', 'Từng thẻ số 6, 7, 8, 9, 10 và các thẻ nhóm đồ vật xuất hiện
 Hướng dẫn người dùng tự quay video và đăng tải video để giáo viên kiểm tra và có thể phản hồi trực tiếp trên bài đăng của học sinh', 7, '{"source":null,"targetWords":["6","7","8","9","10"]}', 80.0, 1),
(27, 5, 'L1.BT.05.T01', 'T', 'FlipCardViewer', '1. Thẻ lật thông minh (giới thiệu kí hiệu mới)', 'Chia 4 phần để không quá 6 thẻ/phần:
 - Phần 1: 3 thẻ chữ O, Ô, thanh hỏi
 - Phần 2: 4 thẻ tranh bò, cỏ, bó, cò (từ có o)
 - Phần 3: 4 thẻ tranh bố, cô, cổ, bộ (từ có ô)
 - Phần 4: 3 thẻ tranh bể cá, cô bé, cổ cò (từ 2 tiếng)
 Trẻ chạm vào thẻ thì lật ra video kí hiệu, trẻ xem và làm theo mẫu.
 Lưu ý: o và ô chỉ khác dấu mũ → khi hiện mặt chữ cho dấu mũ nhấp nháy 2 lần.', 1, '{"source":null,"targetWords":["Chữ O","Chữ Ô","Dấu hỏi","Bò","Cỏ","Bó","Cò","Bố","Cô","Cổ","Bộ","Bể cá","Cô bé","Cổ cò"]}', 80.0, 1),
(28, 5, 'L1.BT.05.T02', 'T', 'LineMatchingGame', '2. Nối từ - kí hiệu (chia lượt theo nhóm)', 'Chia làm 2 cột, mỗi lượt tối đa 4 cặp cùng nhóm để HS so sánh được các từ gần giống nhau:
 Lượt 1: o, ô, thanh hỏi - Lượt 2: bò, cỏ, bó, cò - Lượt 3: bố, cô, cổ, bộ
 1 cột là mặt chữ, 1 cột là kí hiệu sắp xếp ngẫu nhiên. HS nối hai cột với nhau.', 2, '{"source":null,"targetWords":["Chữ O","Chữ Ô","Dấu hỏi","Bò","Cỏ","Bó","Cò","Bố","Cô","Cổ","Bộ"],"pairs":[{"text":"Chữ O"},{"text":"Chữ Ô"},{"text":"Dấu hỏi"},{"text":"Bò"},{"text":"Cỏ"},{"text":"Bó"},{"text":"Cò"},{"text":"Bố"},{"text":"Cô"},{"text":"Cổ"},{"text":"Bộ"}]}', 80.0, 1),
(29, 5, 'L1.BT.05.T03', 'T', 'LineMatchingGame', '3. Nối từ - hình ảnh', 'Như hoạt động 2 nhưng cột phải là tranh minh họa nghĩa của từ, không phải kí hiệu.
 Mục đích: tách bạch 2 việc - nhớ kí hiệu và hiểu nghĩa từ. Mỗi lượt 4 cặp cùng nhóm.', 3, '{"source":null,"targetWords":["Bò","Cỏ","Bó","Cò"],"pairs":[{"text":"Bò"},{"text":"Cỏ"},{"text":"Bó"},{"text":"Cò"}]}', 80.0, 1),
(30, 5, 'L1.BT.05.T04', 'T', 'ChoiceQuizGame', '4. Xem video kí hiệu chọn thẻ chữ', '1 video kí hiệu ở dòng trên
 3 thẻ chữ ở dòng dưới
 Bộ nhiễu lấy đúng các cặp dễ nhầm trong bài:
 bò (bò / bó / bộ), bó (bò / bó / bộ), bộ (bò / bó / bộ),
 cò (cò / cỏ / cô), cỏ (cò / cỏ / cô), cổ (cổ / cô / cỏ)
 Mỗi lượt 6 câu, vị trí đáp án xáo trộn. Sai thì hiện đáp án kèm video kí hiệu chậm 0.5x.', 4, '{"source":null,"targetWords":["Bò","Bó","Bộ","Cò","Cỏ","Cổ"],"questions":[{"id":1,"promptType":"image","promptContent":"/images/study/defaultvideo.png","options":[{"id":1,"text":"Bò","isCorrect":true},{"id":2,"text":"Bó","isCorrect":false},{"id":3,"text":"Bộ","isCorrect":false}]},{"id":2,"promptType":"image","promptContent":"/images/study/defaultvideo.png","options":[{"id":11,"text":"Bó","isCorrect":true},{"id":12,"text":"Bộ","isCorrect":false},{"id":13,"text":"Cò","isCorrect":false}]},{"id":3,"promptType":"image","promptContent":"/images/study/defaultvideo.png","options":[{"id":21,"text":"Bộ","isCorrect":true},{"id":22,"text":"Cò","isCorrect":false},{"id":23,"text":"Cỏ","isCorrect":false}]},{"id":4,"promptType":"image","promptContent":"/images/study/defaultvideo.png","options":[{"id":31,"text":"Cò","isCorrect":true},{"id":32,"text":"Cỏ","isCorrect":false},{"id":33,"text":"Cổ","isCorrect":false}]},{"id":5,"promptType":"image","promptContent":"/images/study/defaultvideo.png","options":[{"id":41,"text":"Cỏ","isCorrect":true},{"id":42,"text":"Cổ","isCorrect":false},{"id":43,"text":"Bò","isCorrect":false}]},{"id":6,"promptType":"image","promptContent":"/images/study/defaultvideo.png","options":[{"id":51,"text":"Cổ","isCorrect":true},{"id":52,"text":"Bò","isCorrect":false},{"id":53,"text":"Bó","isCorrect":false}]}]}', 80.0, 1),
(31, 5, 'L1.BT.05.T05', 'T', 'JigsawPuzzleGame', '5. Ghép hình từ 2 tiếng (bể cá, cô bé, cổ cò)', 'Hoạt động riêng cho từ 2 tiếng: thẻ ghép 2 miếng, nửa là tranh minh họa, nửa là kí hiệu của cả từ.
 Chú ý: từ 2 tiếng làm 1 thẻ kí hiệu duy nhất, không tách rời khi kéo thả, để HS hiểu đây là một đơn vị nghĩa chứ không phải 2 từ rời.', 5, '{"source":null,"targetWords":["Bể cá","Cô bé","Cổ cò"]}', 80.0, 1),
(32, 5, 'L1.BT.05.T06', 'T', 'BucketDropGame', '6. Kéo thả phân loại theo dấu thanh', '4 giỏ: KHÔNG DẤU / DẤU HUYỀN / DẤU SẮC / DẤU HỎI, mỗi giỏ có biểu tượng kí hiệu dấu thanh.
 HS kéo các thẻ từ (bo, bò, bó, cỏ, cò, cô, cổ, bộ, ba, bà, ca, cá…) vào đúng giỏ. Mỗi thẻ có nút nhỏ xem lại video kí hiệu.
 Mỗi lượt tối đa 8 thẻ. Thả sai thì thẻ bật ra chứ không mất.', 6, '{"source":null,"targetWords":["Bo","Bò","Bó","Cỏ","Cò","Cô","Cổ","Ba"],"buckets":[{"id":1,"label":"KHÔNG DẤU","color":"blue"},{"id":2,"label":"DẤU HUYỀN","color":"emerald"},{"id":3,"label":"DẤU SẮC","color":"amber"},{"id":4,"label":"DẤU HỎI","color":"orange"}],"items":[{"label":"Bo","targetBucketId":1,"mediaIndex":0},{"label":"Bò","targetBucketId":2,"mediaIndex":1},{"label":"Bó","targetBucketId":3,"mediaIndex":2},{"label":"Cỏ","targetBucketId":4,"mediaIndex":3},{"label":"Cò","targetBucketId":2,"mediaIndex":4},{"label":"Cô","targetBucketId":1,"mediaIndex":5},{"label":"Cổ","targetBucketId":4,"mediaIndex":6},{"label":"Ba","targetBucketId":1,"mediaIndex":7}]}', 80.0, 1),
(33, 5, 'L1.BT.05.T07', 'T', 'VideoPracticeRecorder', '7. Làm kí hiệu tương ứng với hình', 'Từng thẻ O, Ô, thanh hỏi và 11 từ trong bài xuất hiện (chia theo 4 nhóm như hoạt động 1)
 Hướng dẫn người dùng tự quay video và đăng tải video để giáo viên kiểm tra và có thể phản hồi trực tiếp trên bài đăng của học sinh', 7, '{"source":null,"targetWords":["Chữ O","Chữ Ô","Dấu hỏi","Bò","Cỏ","Bó","Cò","Bố","Cô","Cổ","Bộ","Bể cá","Cô bé","Cổ cò"]}', 80.0, 1)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `instruction` = VALUES(`instruction`), `game_config` = VALUES(`game_config`);

-- 3. Media
INSERT INTO `curriculum_media` (`media_id`, `activity_id`, `media_code`, `media_type`, `source_url`, `display_order`) VALUES
(1, 1, 'L1.BT.01.T01.V01', 'video', 'https://www.youtube.com/watch?v=tsREwMZdHmg', 1),
(2, 1, 'L1.BT.01.T01.V02', 'video', 'https://www.youtube.com/watch?v=W6GFoY2STdc', 2),
(3, 1, 'L1.BT.01.T01.V03', 'video', 'https://www.youtube.com/watch?v=4eomxDxnBhw', 3),
(4, 2, 'L1.BT.01.T02.V01', 'image', '/A-Z/A.webp', 1),
(5, 2, 'L1.BT.01.T02.V02', 'image', '/A-Z/B.webp', 2),
(6, 2, 'L1.BT.01.T02.V03', 'image', '/images/study/defaultvideo.png', 3),
(7, 2, 'L1.BT.01.T02.V04', 'image', '/images/study/defaultvideo.png', 4),
(8, 2, 'L1.BT.01.T02.V05', 'image', '/images/study/defaultvideo.png', 5),
(9, 2, 'L1.BT.01.T02.V06', 'image', '/images/study/defaultvideo.png', 6),
(10, 3, 'L1.BT.01.T03.V01', 'video', 'https://www.youtube.com/watch?v=tsREwMZdHmg', 1),
(11, 3, 'L1.BT.01.T03.V02', 'video', 'https://www.youtube.com/watch?v=W6GFoY2STdc', 2),
(12, 3, 'L1.BT.01.T03.V03', 'video', 'https://www.youtube.com/watch?v=4eomxDxnBhw', 3),
(13, 3, 'L1.BT.01.T03.V04', 'video', 'https://www.youtube.com/watch?v=ZKcsAk7u0Fw', 4),
(14, 3, 'L1.BT.01.T03.V05', 'image', '/images/study/defaultvideo.png', 5),
(15, 4, 'L1.BT.01.T04.V01', 'image', '/images/study/defaultvideo.png', 1),
(16, 4, 'L1.BT.01.T04.V02', 'image', '/images/study/defaultvideo.png', 2),
(17, 4, 'L1.BT.01.T04.V03', 'image', '/images/study/defaultvideo.png', 3),
(18, 5, 'L1.BT.01.T05.V01', 'image', '/A-Z/A.webp', 1),
(19, 5, 'L1.BT.01.T05.V02', 'image', '/A-Z/B.webp', 2),
(20, 5, 'L1.BT.01.T05.V03', 'image', '/images/study/defaultvideo.png', 3),
(21, 5, 'L1.BT.01.T05.V04', 'image', '/images/study/defaultvideo.png', 4),
(22, 5, 'L1.BT.01.T05.V05', 'image', '/images/study/defaultvideo.png', 5),
(23, 5, 'L1.BT.01.T05.V06', 'image', '/images/study/defaultvideo.png', 6),
(24, 6, 'L1.BT.01.T06.V01', 'image', '/A-Z/A.webp', 1),
(25, 6, 'L1.BT.01.T06.V02', 'image', '/A-Z/B.webp', 2),
(26, 6, 'L1.BT.01.T06.V03', 'image', '/images/study/defaultvideo.png', 3),
(27, 6, 'L1.BT.01.T06.V04', 'image', '/images/study/defaultvideo.png', 4),
(28, 6, 'L1.BT.01.T06.V05', 'image', '/images/study/defaultvideo.png', 5),
(29, 6, 'L1.BT.01.T06.V06', 'image', '/images/study/defaultvideo.png', 6),
(30, 7, 'L1.BT.02.T01.V01', 'image', '/A-Z/C.webp', 1),
(31, 7, 'L1.BT.02.T01.V02', 'image', '/A-Z/E.webp', 2),
(32, 7, 'L1.BT.02.T01.V03', 'image', '/images/study/defaultvideo.png', 3),
(33, 7, 'L1.BT.02.T01.V04', 'image', '/images/study/defaultvideo.png', 4),
(34, 7, 'L1.BT.02.T01.V05', 'image', '/images/study/defaultvideo.png', 5),
(35, 7, 'L1.BT.02.T01.V06', 'image', '/images/study/defaultvideo.png', 6),
(36, 7, 'L1.BT.02.T01.V07', 'image', '/images/study/defaultvideo.png', 7),
(37, 7, 'L1.BT.02.T01.V08', 'image', '/images/study/defaultvideo.png', 8),
(38, 7, 'L1.BT.02.T01.V09', 'image', '/images/study/defaultvideo.png', 9),
(39, 7, 'L1.BT.02.T01.V10', 'image', '/images/study/defaultvideo.png', 10),
(40, 8, 'L1.BT.02.T02.V01', 'image', '/A-Z/C.webp', 1),
(41, 8, 'L1.BT.02.T02.V02', 'image', '/A-Z/E.webp', 2),
(42, 8, 'L1.BT.02.T02.V03', 'image', '/images/study/defaultvideo.png', 3),
(43, 8, 'L1.BT.02.T02.V04', 'image', '/images/study/defaultvideo.png', 4),
(44, 8, 'L1.BT.02.T02.V05', 'image', '/images/study/defaultvideo.png', 5),
(45, 8, 'L1.BT.02.T02.V06', 'image', '/images/study/defaultvideo.png', 6),
(46, 8, 'L1.BT.02.T02.V07', 'image', '/images/study/defaultvideo.png', 7),
(47, 8, 'L1.BT.02.T02.V08', 'image', '/images/study/defaultvideo.png', 8),
(48, 8, 'L1.BT.02.T02.V09', 'image', '/images/study/defaultvideo.png', 9),
(49, 8, 'L1.BT.02.T02.V10', 'image', '/images/study/defaultvideo.png', 10),
(50, 9, 'L1.BT.02.T03.V01', 'image', '/A-Z/C.webp', 1),
(51, 9, 'L1.BT.02.T03.V02', 'image', '/A-Z/E.webp', 2),
(52, 9, 'L1.BT.02.T03.V03', 'image', '/images/study/defaultvideo.png', 3),
(53, 9, 'L1.BT.02.T03.V04', 'image', '/images/study/defaultvideo.png', 4),
(54, 9, 'L1.BT.02.T03.V05', 'image', '/images/study/defaultvideo.png', 5),
(55, 9, 'L1.BT.02.T03.V06', 'image', '/images/study/defaultvideo.png', 6),
(56, 9, 'L1.BT.02.T03.V07', 'image', '/images/study/defaultvideo.png', 7),
(57, 9, 'L1.BT.02.T03.V08', 'image', '/images/study/defaultvideo.png', 8),
(58, 9, 'L1.BT.02.T03.V09', 'image', '/images/study/defaultvideo.png', 9),
(59, 9, 'L1.BT.02.T03.V10', 'image', '/images/study/defaultvideo.png', 10),
(60, 10, 'L1.BT.02.T04.V01', 'image', '/images/study/defaultvideo.png', 1),
(61, 10, 'L1.BT.02.T04.V02', 'image', '/images/study/defaultvideo.png', 2),
(62, 10, 'L1.BT.02.T04.V03', 'image', '/images/study/defaultvideo.png', 3),
(63, 10, 'L1.BT.02.T04.V04', 'image', '/images/study/defaultvideo.png', 4),
(64, 10, 'L1.BT.02.T04.V05', 'image', '/images/study/defaultvideo.png', 5),
(65, 10, 'L1.BT.02.T04.V06', 'image', '/images/study/defaultvideo.png', 6),
(66, 11, 'L1.BT.02.T05.V01', 'image', '/images/study/defaultvideo.png', 1),
(67, 11, 'L1.BT.02.T05.V02', 'image', '/images/study/defaultvideo.png', 2),
(68, 11, 'L1.BT.02.T05.V03', 'image', '/images/study/defaultvideo.png', 3),
(69, 11, 'L1.BT.02.T05.V04', 'image', '/images/study/defaultvideo.png', 4),
(70, 11, 'L1.BT.02.T05.V05', 'image', '/images/study/defaultvideo.png', 5),
(71, 11, 'L1.BT.02.T05.V06', 'image', '/images/study/defaultvideo.png', 6),
(72, 11, 'L1.BT.02.T05.V07', 'image', '/images/study/defaultvideo.png', 7),
(73, 11, 'L1.BT.02.T05.V08', 'image', '/images/study/defaultvideo.png', 8),
(74, 12, 'L1.BT.02.T06.V01', 'image', '/images/study/defaultvideo.png', 1),
(75, 12, 'L1.BT.02.T06.V02', 'image', '/images/study/defaultvideo.png', 2),
(76, 12, 'L1.BT.02.T06.V03', 'image', '/images/study/defaultvideo.png', 3),
(77, 12, 'L1.BT.02.T06.V04', 'image', '/images/study/defaultvideo.png', 4),
(78, 12, 'L1.BT.02.T06.V05', 'image', '/images/study/defaultvideo.png', 5),
(79, 12, 'L1.BT.02.T06.V06', 'image', '/images/study/defaultvideo.png', 6),
(80, 13, 'L1.BT.02.T07.V01', 'image', '/A-Z/C.webp', 1),
(81, 13, 'L1.BT.02.T07.V02', 'image', '/A-Z/E.webp', 2),
(82, 13, 'L1.BT.02.T07.V03', 'image', '/images/study/defaultvideo.png', 3),
(83, 13, 'L1.BT.02.T07.V04', 'image', '/images/study/defaultvideo.png', 4),
(84, 13, 'L1.BT.02.T07.V05', 'image', '/images/study/defaultvideo.png', 5),
(85, 13, 'L1.BT.02.T07.V06', 'image', '/images/study/defaultvideo.png', 6),
(86, 13, 'L1.BT.02.T07.V07', 'image', '/images/study/defaultvideo.png', 7),
(87, 13, 'L1.BT.02.T07.V08', 'image', '/images/study/defaultvideo.png', 8),
(88, 13, 'L1.BT.02.T07.V09', 'image', '/images/study/defaultvideo.png', 9),
(89, 13, 'L1.BT.02.T07.V10', 'image', '/images/study/defaultvideo.png', 10),
(90, 14, 'L1.BT.03.T01.V01', 'image', '/1-9/1.webp', 1),
(91, 14, 'L1.BT.03.T01.V02', 'image', '/1-9/2.webp', 2),
(92, 14, 'L1.BT.03.T01.V03', 'image', '/1-9/3.webp', 3),
(93, 14, 'L1.BT.03.T01.V04', 'image', '/1-9/4.webp', 4),
(94, 14, 'L1.BT.03.T01.V05', 'image', '/1-9/5.webp', 5),
(95, 15, 'L1.BT.03.T02.V01', 'image', '/1-9/1.webp', 1),
(96, 15, 'L1.BT.03.T02.V02', 'image', '/1-9/2.webp', 2),
(97, 15, 'L1.BT.03.T02.V03', 'image', '/1-9/3.webp', 3),
(98, 15, 'L1.BT.03.T02.V04', 'image', '/1-9/4.webp', 4),
(99, 15, 'L1.BT.03.T02.V05', 'image', '/1-9/5.webp', 5),
(100, 16, 'L1.BT.03.T03.V01', 'image', '/1-9/1.webp', 1),
(101, 16, 'L1.BT.03.T03.V02', 'image', '/1-9/2.webp', 2),
(102, 16, 'L1.BT.03.T03.V03', 'image', '/1-9/3.webp', 3),
(103, 16, 'L1.BT.03.T03.V04', 'image', '/1-9/4.webp', 4),
(104, 16, 'L1.BT.03.T03.V05', 'image', '/1-9/5.webp', 5),
(105, 17, 'L1.BT.03.T04.V01', 'image', '/1-9/1.webp', 1),
(106, 17, 'L1.BT.03.T04.V02', 'image', '/1-9/2.webp', 2),
(107, 17, 'L1.BT.03.T04.V03', 'image', '/1-9/3.webp', 3),
(108, 17, 'L1.BT.03.T04.V04', 'image', '/1-9/4.webp', 4),
(109, 17, 'L1.BT.03.T04.V05', 'image', '/1-9/5.webp', 5),
(110, 18, 'L1.BT.03.T05.V01', 'image', '/1-9/1.webp', 1),
(111, 18, 'L1.BT.03.T05.V02', 'image', '/1-9/2.webp', 2),
(112, 18, 'L1.BT.03.T05.V03', 'image', '/1-9/3.webp', 3),
(113, 18, 'L1.BT.03.T05.V04', 'image', '/1-9/4.webp', 4),
(114, 18, 'L1.BT.03.T05.V05', 'image', '/1-9/5.webp', 5),
(115, 19, 'L1.BT.03.T06.V01', 'image', '/1-9/1.webp', 1),
(116, 19, 'L1.BT.03.T06.V02', 'image', '/1-9/2.webp', 2),
(117, 19, 'L1.BT.03.T06.V03', 'image', '/1-9/3.webp', 3),
(118, 19, 'L1.BT.03.T06.V04', 'image', '/1-9/4.webp', 4),
(119, 19, 'L1.BT.03.T06.V05', 'image', '/1-9/5.webp', 5),
(120, 20, 'L1.BT.04.T01.V01', 'image', '/1-9/6.webp', 1),
(121, 20, 'L1.BT.04.T01.V02', 'image', '/1-9/7.webp', 2),
(122, 20, 'L1.BT.04.T01.V03', 'image', '/1-9/8.webp', 3),
(123, 20, 'L1.BT.04.T01.V04', 'image', '/1-9/9.webp', 4),
(124, 20, 'L1.BT.04.T01.V05', 'image', '/images/study/defaultvideo.png', 5),
(125, 21, 'L1.BT.04.T02.V01', 'image', '/1-9/6.webp', 1),
(126, 21, 'L1.BT.04.T02.V02', 'image', '/1-9/7.webp', 2),
(127, 21, 'L1.BT.04.T02.V03', 'image', '/1-9/8.webp', 3),
(128, 21, 'L1.BT.04.T02.V04', 'image', '/1-9/9.webp', 4),
(129, 21, 'L1.BT.04.T02.V05', 'image', '/images/study/defaultvideo.png', 5),
(130, 22, 'L1.BT.04.T03.V01', 'image', '/1-9/6.webp', 1),
(131, 22, 'L1.BT.04.T03.V02', 'image', '/1-9/7.webp', 2),
(132, 22, 'L1.BT.04.T03.V03', 'image', '/1-9/8.webp', 3),
(133, 22, 'L1.BT.04.T03.V04', 'image', '/1-9/9.webp', 4),
(134, 22, 'L1.BT.04.T03.V05', 'image', '/images/study/defaultvideo.png', 5),
(135, 23, 'L1.BT.04.T04.V01', 'image', '/1-9/6.webp', 1),
(136, 23, 'L1.BT.04.T04.V02', 'image', '/1-9/7.webp', 2),
(137, 23, 'L1.BT.04.T04.V03', 'image', '/1-9/8.webp', 3),
(138, 23, 'L1.BT.04.T04.V04', 'image', '/1-9/9.webp', 4),
(139, 23, 'L1.BT.04.T04.V05', 'image', '/images/study/defaultvideo.png', 5),
(140, 24, 'L1.BT.04.T05.V01', 'image', '/1-9/6.webp', 1),
(141, 24, 'L1.BT.04.T05.V02', 'image', '/1-9/7.webp', 2),
(142, 24, 'L1.BT.04.T05.V03', 'image', '/1-9/8.webp', 3),
(143, 24, 'L1.BT.04.T05.V04', 'image', '/1-9/9.webp', 4),
(144, 24, 'L1.BT.04.T05.V05', 'image', '/images/study/defaultvideo.png', 5),
(145, 25, 'L1.BT.04.T06.V01', 'image', '/1-9/6.webp', 1),
(146, 25, 'L1.BT.04.T06.V02', 'image', '/1-9/7.webp', 2),
(147, 25, 'L1.BT.04.T06.V03', 'image', '/1-9/8.webp', 3),
(148, 25, 'L1.BT.04.T06.V04', 'image', '/1-9/9.webp', 4),
(149, 25, 'L1.BT.04.T06.V05', 'image', '/images/study/defaultvideo.png', 5),
(150, 26, 'L1.BT.04.T07.V01', 'image', '/1-9/6.webp', 1),
(151, 26, 'L1.BT.04.T07.V02', 'image', '/1-9/7.webp', 2),
(152, 26, 'L1.BT.04.T07.V03', 'image', '/1-9/8.webp', 3),
(153, 26, 'L1.BT.04.T07.V04', 'image', '/1-9/9.webp', 4),
(154, 26, 'L1.BT.04.T07.V05', 'image', '/images/study/defaultvideo.png', 5),
(155, 27, 'L1.BT.05.T01.V01', 'image', '/A-Z/O.webp', 1),
(156, 27, 'L1.BT.05.T01.V02', 'image', '/images/study/defaultvideo.png', 2),
(157, 27, 'L1.BT.05.T01.V03', 'image', '/images/study/defaultvideo.png', 3),
(158, 27, 'L1.BT.05.T01.V04', 'image', '/images/study/defaultvideo.png', 4),
(159, 27, 'L1.BT.05.T01.V05', 'image', '/images/study/defaultvideo.png', 5),
(160, 27, 'L1.BT.05.T01.V06', 'image', '/images/study/defaultvideo.png', 6),
(161, 27, 'L1.BT.05.T01.V07', 'image', '/images/study/defaultvideo.png', 7),
(162, 27, 'L1.BT.05.T01.V08', 'image', '/images/study/defaultvideo.png', 8),
(163, 27, 'L1.BT.05.T01.V09', 'image', '/images/study/defaultvideo.png', 9),
(164, 27, 'L1.BT.05.T01.V10', 'image', '/images/study/defaultvideo.png', 10),
(165, 27, 'L1.BT.05.T01.V11', 'image', '/images/study/defaultvideo.png', 11),
(166, 27, 'L1.BT.05.T01.V12', 'image', '/images/study/defaultvideo.png', 12),
(167, 27, 'L1.BT.05.T01.V13', 'image', '/images/study/defaultvideo.png', 13),
(168, 27, 'L1.BT.05.T01.V14', 'image', '/images/study/defaultvideo.png', 14),
(169, 28, 'L1.BT.05.T02.V01', 'image', '/A-Z/O.webp', 1),
(170, 28, 'L1.BT.05.T02.V02', 'image', '/images/study/defaultvideo.png', 2),
(171, 28, 'L1.BT.05.T02.V03', 'image', '/images/study/defaultvideo.png', 3),
(172, 28, 'L1.BT.05.T02.V04', 'image', '/images/study/defaultvideo.png', 4),
(173, 28, 'L1.BT.05.T02.V05', 'image', '/images/study/defaultvideo.png', 5),
(174, 28, 'L1.BT.05.T02.V06', 'image', '/images/study/defaultvideo.png', 6),
(175, 28, 'L1.BT.05.T02.V07', 'image', '/images/study/defaultvideo.png', 7),
(176, 28, 'L1.BT.05.T02.V08', 'image', '/images/study/defaultvideo.png', 8),
(177, 28, 'L1.BT.05.T02.V09', 'image', '/images/study/defaultvideo.png', 9),
(178, 28, 'L1.BT.05.T02.V10', 'image', '/images/study/defaultvideo.png', 10),
(179, 28, 'L1.BT.05.T02.V11', 'image', '/images/study/defaultvideo.png', 11),
(180, 29, 'L1.BT.05.T03.V01', 'image', '/images/study/defaultvideo.png', 1),
(181, 29, 'L1.BT.05.T03.V02', 'image', '/images/study/defaultvideo.png', 2),
(182, 29, 'L1.BT.05.T03.V03', 'image', '/images/study/defaultvideo.png', 3),
(183, 29, 'L1.BT.05.T03.V04', 'image', '/images/study/defaultvideo.png', 4),
(184, 30, 'L1.BT.05.T04.V01', 'image', '/images/study/defaultvideo.png', 1),
(185, 30, 'L1.BT.05.T04.V02', 'image', '/images/study/defaultvideo.png', 2),
(186, 30, 'L1.BT.05.T04.V03', 'image', '/images/study/defaultvideo.png', 3),
(187, 30, 'L1.BT.05.T04.V04', 'image', '/images/study/defaultvideo.png', 4),
(188, 30, 'L1.BT.05.T04.V05', 'image', '/images/study/defaultvideo.png', 5),
(189, 30, 'L1.BT.05.T04.V06', 'image', '/images/study/defaultvideo.png', 6),
(190, 31, 'L1.BT.05.T05.V01', 'image', '/images/study/defaultvideo.png', 1),
(191, 31, 'L1.BT.05.T05.V02', 'image', '/images/study/defaultvideo.png', 2),
(192, 31, 'L1.BT.05.T05.V03', 'image', '/images/study/defaultvideo.png', 3),
(193, 32, 'L1.BT.05.T06.V01', 'image', '/images/study/defaultvideo.png', 1),
(194, 32, 'L1.BT.05.T06.V02', 'image', '/images/study/defaultvideo.png', 2),
(195, 32, 'L1.BT.05.T06.V03', 'image', '/images/study/defaultvideo.png', 3),
(196, 32, 'L1.BT.05.T06.V04', 'image', '/images/study/defaultvideo.png', 4),
(197, 32, 'L1.BT.05.T06.V05', 'image', '/images/study/defaultvideo.png', 5),
(198, 32, 'L1.BT.05.T06.V06', 'image', '/images/study/defaultvideo.png', 6),
(199, 32, 'L1.BT.05.T06.V07', 'image', '/images/study/defaultvideo.png', 7),
(200, 32, 'L1.BT.05.T06.V08', 'image', '/images/study/defaultvideo.png', 8),
(201, 33, 'L1.BT.05.T07.V01', 'image', '/A-Z/O.webp', 1),
(202, 33, 'L1.BT.05.T07.V02', 'image', '/images/study/defaultvideo.png', 2),
(203, 33, 'L1.BT.05.T07.V03', 'image', '/images/study/defaultvideo.png', 3),
(204, 33, 'L1.BT.05.T07.V04', 'image', '/images/study/defaultvideo.png', 4),
(205, 33, 'L1.BT.05.T07.V05', 'image', '/images/study/defaultvideo.png', 5),
(206, 33, 'L1.BT.05.T07.V06', 'image', '/images/study/defaultvideo.png', 6),
(207, 33, 'L1.BT.05.T07.V07', 'image', '/images/study/defaultvideo.png', 7),
(208, 33, 'L1.BT.05.T07.V08', 'image', '/images/study/defaultvideo.png', 8),
(209, 33, 'L1.BT.05.T07.V09', 'image', '/images/study/defaultvideo.png', 9),
(210, 33, 'L1.BT.05.T07.V10', 'image', '/images/study/defaultvideo.png', 10),
(211, 33, 'L1.BT.05.T07.V11', 'image', '/images/study/defaultvideo.png', 11),
(212, 33, 'L1.BT.05.T07.V12', 'image', '/images/study/defaultvideo.png', 12),
(213, 33, 'L1.BT.05.T07.V13', 'image', '/images/study/defaultvideo.png', 13),
(214, 33, 'L1.BT.05.T07.V14', 'image', '/images/study/defaultvideo.png', 14)
ON DUPLICATE KEY UPDATE `activity_id` = VALUES(`activity_id`), `media_type` = VALUES(`media_type`), `source_url` = VALUES(`source_url`), `display_order` = VALUES(`display_order`);

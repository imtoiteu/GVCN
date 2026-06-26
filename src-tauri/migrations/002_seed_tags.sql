-- GVCN AutoReport — seed the controlled observation-tag catalog (migration 002).
--
-- This is a DRAFT taxonomy. Per SPEC Risk #3, confirm categories/labels with a real
-- homeroom teacher before M3 (Weekly Records). Tags are data, not code, so the catalog
-- can change without schema changes. INSERT OR IGNORE keys on the unique `code` so this
-- migration is idempotent and safe to re-run.
--
-- Tone follows CLAUDE.md: "ghi nhận / hỗ trợ / phối hợp / tiến bộ" — supportive, never
-- punitive. "concern" sentiment flags something to support, not to punish.

-- attendance — chuyên cần
INSERT OR IGNORE INTO observation_tags (category, code, label_vi, sentiment, sort_order) VALUES
  ('attendance', 'attendance.full',            'Đi học đầy đủ',                     'positive', 10),
  ('attendance', 'attendance.punctual',        'Đúng giờ',                          'positive', 11),
  ('attendance', 'attendance.absent_excused',  'Nghỉ học có phép',                  'neutral',  12),
  ('attendance', 'attendance.late',            'Đi học muộn',                       'concern',  13),
  ('attendance', 'attendance.absent_unexcused','Nghỉ học không phép',               'concern',  14);

-- study — học tập
INSERT OR IGNORE INTO observation_tags (category, code, label_vi, sentiment, sort_order) VALUES
  ('study', 'study.active',          'Tích cực phát biểu',                  'positive', 20),
  ('study', 'study.improved',        'Có tiến bộ trong học tập',            'positive', 21),
  ('study', 'study.good_result',     'Kết quả học tập tốt',                 'positive', 22),
  ('study', 'study.needs_focus',     'Cần tập trung hơn trong giờ học',     'concern',  23),
  ('study', 'study.homework_missing','Chưa hoàn thành bài tập về nhà',      'concern',  24);

-- discipline — nề nếp
INSERT OR IGNORE INTO observation_tags (category, code, label_vi, sentiment, sort_order) VALUES
  ('discipline', 'discipline.good',      'Thực hiện tốt nội quy',               'positive', 30),
  ('discipline', 'discipline.uniform',   'Trang phục, tác phong gọn gàng',      'positive', 31),
  ('discipline', 'discipline.talking',   'Nói chuyện riêng trong giờ học',      'concern',  32),
  ('discipline', 'discipline.violation', 'Cần điều chỉnh việc thực hiện nội quy','concern', 33);

-- good_deed — việc tốt
INSERT OR IGNORE INTO observation_tags (category, code, label_vi, sentiment, sort_order) VALUES
  ('good_deed', 'good_deed.help_friend', 'Giúp đỡ bạn bè',                      'positive', 40),
  ('good_deed', 'good_deed.honesty',     'Trung thực, thật thà',                'positive', 41),
  ('good_deed', 'good_deed.volunteer',   'Tích cực tham gia hoạt động chung',   'positive', 42),
  ('good_deed', 'good_deed.keep_clean',  'Giữ gìn vệ sinh lớp học',             'positive', 43);

-- support — cần hỗ trợ (neutral: flags where the teacher wants to coordinate help)
INSERT OR IGNORE INTO observation_tags (category, code, label_vi, sentiment, sort_order) VALUES
  ('support', 'support.academic',  'Cần hỗ trợ thêm về học tập',           'neutral', 50),
  ('support', 'support.emotional', 'Cần quan tâm, động viên về tâm lý',    'neutral', 51),
  ('support', 'support.family',    'Cần phối hợp với gia đình',            'neutral', 52),
  ('support', 'support.health',    'Cần quan tâm về sức khỏe',             'neutral', 53);

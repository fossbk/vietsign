import json

with open("backend/src/scripts/curriculum_lop1_data.json", "r", encoding="utf-8") as f:
    lessons = json.load(f)

sql_lines = []
sql_lines.append("-- ==============================================================================")
sql_lines.append("-- Seed Data: 20260918_seed_curriculum_lop1.sql (UTF-8 Clean)")
sql_lines.append("-- ==============================================================================\n")
sql_lines.append("SET NAMES utf8mb4;\n")

# 1. Lessons
sql_lines.append("-- 1. Lessons")
sql_lines.append("INSERT INTO `curriculum_lesson` (`lesson_id`, `lesson_code`, `level_code`, `topic_code`, `title`, `description`, `content_status`, `display_order`, `is_active`) VALUES")
lesson_vals = []
for idx, l in enumerate(lessons, 1):
    desc = l['description'].replace("'", "\\'")
    title = l['title'].replace("'", "\\'")
    lesson_vals.append(f"({idx}, '{l['lesson_code']}', '{l['level_code']}', '{l['topic_code']}', '{title}', '{desc}', '{l['content_status']}', {l['display_order']}, 1)")
sql_lines.append(",\n".join(lesson_vals))
sql_lines.append("ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `description` = VALUES(`description`), `content_status` = VALUES(`content_status`);\n")

# 2. Activities
sql_lines.append("-- 2. Activities")
sql_lines.append("INSERT INTO `curriculum_activity` (`activity_id`, `lesson_id`, `activity_code`, `activity_level`, `game_type`, `title`, `instruction`, `display_order`, `game_config`, `pass_score`, `is_active`) VALUES")
act_vals = []
act_counter = 1
media_list = []
media_counter = 1

for l_idx, l in enumerate(lessons, 1):
    for a in l['activities']:
        a_id = act_counter
        act_counter += 1
        title = a['title'].replace("'", "\\'")
        instr = a['instruction'].replace("'", "\\'") if a['instruction'] else ''
        config_json = json.dumps(a['game_config'], ensure_ascii=False).replace("'", "\\'")
        act_vals.append(f"({a_id}, {l_idx}, '{a['activity_code']}', '{a['activity_level']}', '{a['game_type']}', '{title}', '{instr}', {a['display_order']}, '{config_json}', {a['pass_score']}, 1)")
        
        for m in a.get('media', []):
            media_list.append(f"({media_counter}, {a_id}, '{m['media_code']}', '{m['media_type']}', '{m['source_url']}', {m['display_order']})")
            media_counter += 1

sql_lines.append(",\n".join(act_vals))
sql_lines.append("ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `instruction` = VALUES(`instruction`), `game_config` = VALUES(`game_config`);\n")

# 3. Media
if media_list:
    sql_lines.append("-- 3. Media")
    sql_lines.append("INSERT INTO `curriculum_media` (`media_id`, `activity_id`, `media_code`, `media_type`, `source_url`, `display_order`) VALUES")
    sql_lines.append(",\n".join(media_list))
    sql_lines.append("ON DUPLICATE KEY UPDATE `source_url` = VALUES(`source_url`), `display_order` = VALUES(`display_order`);\n")

output_sql = "\n".join(sql_lines)
with open("database/migrations/20260918_seed_curriculum_lop1.sql", "w", encoding="utf-8") as f:
    f.write(output_sql)

print(f"Generated clean UTF-8 SQL file with {len(lessons)} lessons, {len(act_vals)} activities, {len(media_list)} media rows.")

import sys, zipfile, re, json, xml.etree.ElementTree as ET
sys.stdout.reconfigure(encoding='utf-8')

LESSON_ITEMS = {
    1: ["Chữ A", "Chữ B", "Dấu huyền", "Bà", "Ba", "Ba ba"],
    2: ["Chữ C", "Chữ E", "Chữ Ê", "Dấu sắc", "Ca", "Cà", "Cá", "Bè", "Bé", "Bế"],
    3: ["1", "2", "3", "4", "5"],
    4: ["6", "7", "8", "9", "10"],
    5: ["Chữ O", "Chữ Ô", "Dấu hỏi", "Bò", "Cỏ", "Bó", "Cò", "Bố", "Cô", "Cổ", "Bộ", "Bể cá", "Cô bé", "Cổ cò"],
}

ACTIVITY_ITEMS = {
    (1, 1): ["Chữ A", "Chữ B", "Dấu huyền"],
    (1, 3): ["Chữ A", "Chữ B", "Dấu huyền", "Bà", "Ba"],
    (1, 4): ["Dấu huyền", "Ba", "Ba ba"],
    (2, 4): ["Ca", "Cà", "Cá", "Bè", "Bé", "Bế"],
    (2, 5): ["Ba", "Bà", "Ca", "Cà", "Cá", "Be", "Bè", "Bé"],
    (2, 6): ["Ca", "Cà", "Cá", "Bè", "Bé", "Bế"],
    (5, 2): ["Chữ O", "Chữ Ô", "Dấu hỏi", "Bò", "Cỏ", "Bó", "Cò", "Bố", "Cô", "Cổ", "Bộ"],
    (5, 3): ["Bò", "Cỏ", "Bó", "Cò"],
    (5, 4): ["Bò", "Bó", "Bộ", "Cò", "Cỏ", "Cổ"],
    (5, 5): ["Bể cá", "Cô bé", "Cổ cò"],
    (5, 6): ["Bo", "Bò", "Bó", "Cỏ", "Cò", "Cô", "Cổ", "Ba"],
}

def local_asset(label):
    normalized = label.replace("Chữ ", "").strip().upper()
    if len(normalized) == 1 and "A" <= normalized <= "Z":
        return f"/A-Z/{normalized}.webp"
    if normalized.isdigit() and 1 <= int(normalized) <= 9:
        return f"/1-9/{normalized}.webp"
    return "/images/study/defaultvideo.png"

def build_media(activity_code, labels, urls):
    direct_urls = [u.rstrip(').') for u in urls if "qipedc.moet.gov.vn/dictionary" not in u]
    result = []
    for idx, label in enumerate(labels):
        source = direct_urls[idx] if idx < len(direct_urls) else local_asset(label)
        media_type = "video" if "youtube.com" in source or "youtu.be" in source or re.search(r'\.(mp4|webm)(?:\?|$)', source, re.I) else "image"
        result.append({
            "media_code": f"{activity_code}.V{idx + 1:02d}",
            "media_type": media_type,
            "source_url": source,
            "display_order": idx + 1,
        })
    return result

def build_questions(labels, media, text_prompt=False):
    questions = []
    for idx, label in enumerate(labels[:6]):
        option_indexes = [idx]
        offset = 1
        while len(option_indexes) < min(3, len(labels)):
            candidate = (idx + offset) % len(labels)
            if candidate not in option_indexes:
                option_indexes.append(candidate)
            offset += 1
        options = []
        for option_id, item_idx in enumerate(option_indexes, 1):
            option = {
                "id": idx * 10 + option_id,
                "text": labels[item_idx],
                "isCorrect": item_idx == idx,
            }
            if text_prompt:
                option["mediaUrl"] = media[item_idx]["source_url"]
                option["mediaType"] = media[item_idx]["media_type"]
            options.append(option)
        questions.append({
            "id": idx + 1,
            "promptType": "text" if text_prompt else media[idx]["media_type"],
            "promptContent": label if text_prompt else media[idx]["source_url"],
            "options": options,
        })
    return questions

def build_game_config(lesson_idx, act_idx, game_type, title, source, labels, media):
    config = {"source": source or None, "targetWords": labels}
    if game_type == "LineMatchingGame":
        config["pairs"] = [{"text": label} for label in labels]
    elif game_type == "ChoiceQuizGame":
        text_prompt = "xem hình" in title.lower() or "đếm đồ vật" in title.lower()
        config["questions"] = build_questions(labels, media, text_prompt)
    elif game_type == "BucketDropGame":
        if lesson_idx == 2:
            config["buckets"] = [
                {"id": 1, "label": "KHÔNG DẤU", "color": "blue"},
                {"id": 2, "label": "DẤU HUYỀN", "color": "emerald"},
                {"id": 3, "label": "DẤU SẮC", "color": "amber"},
            ]
            targets = [1, 2, 1, 2, 3, 1, 2, 3]
        else:
            config["buckets"] = [
                {"id": 1, "label": "KHÔNG DẤU", "color": "blue"},
                {"id": 2, "label": "DẤU HUYỀN", "color": "emerald"},
                {"id": 3, "label": "DẤU SẮC", "color": "amber"},
                {"id": 4, "label": "DẤU HỎI", "color": "orange"},
            ]
            targets = [1, 2, 3, 4, 2, 1, 4, 1]
        config["items"] = [
            {"label": label, "targetBucketId": targets[idx], "mediaIndex": idx}
            for idx, label in enumerate(labels)
        ]
    elif game_type == "SequenceOrderGame":
        config["sequence"] = labels
        if "điền số còn thiếu" in title.lower():
            config["fixedSlots"] = [0, 1, 3]
    return config

def map_game_type(act_title):
    t = act_title.lower()
    if "lật thẻ thông minh" in t or "thẻ lật" in t:
        return "FlipCardViewer"
    elif "nối" in t:
        return "LineMatchingGame"
    elif "ghép hình" in t:
        return "JigsawPuzzleGame"
    elif "thả hình" in t or "kéo thả phân loại" in t:
        return "BucketDropGame"
    elif "lật thẻ tìm cặp" in t or "tìm cặp" in t:
        return "MemoryCardGame"
    elif "sắp xếp thứ tự" in t or "điền số còn thiếu" in t:
        return "SequenceOrderGame"
    elif "làm kí hiệu" in t or "quay video" in t:
        return "VideoPracticeRecorder"
    elif "chọn" in t or "đếm đồ vật" in t or "phân biệt" in t:
        return "ChoiceQuizGame"
    return "ChoiceQuizGame"

with zipfile.ZipFile('B2026. Khung Nội dung hỗ trợ dạy và học ký hiệu.xlsx') as z:
    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
            shared.append(''.join(t.text for t in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text))
    
    tree = ET.fromstring(z.read('xl/worksheets/sheet4.xml'))
    rows = tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
    
    lessons = []
    current_lesson = None
    lesson_idx = 0
    act_idx = 0
    
    for row in rows:
        cells = {}
        for c in row.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
            ref = c.attrib.get('r')
            col = ''.join([ch for ch in ref if ch.isalpha()])
            v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
            t = c.attrib.get('t')
            val = ''
            if v is not None and v.text:
                val = shared[int(v.text)].strip() if t == 's' else v.text.strip()
            cells[col] = val
        
        b = cells.get('B', '')
        c = cells.get('C', '')
        d = cells.get('D', '')
        e = cells.get('E', '')
        
        # New lesson row
        if b and b.startswith('Bài '):
            lesson_idx += 1
            act_idx = 0
            lines = b.split('\n')
            title = lines[0].strip()
            desc = '\n'.join(lines[1:]).strip() if len(lines) > 1 else ''
            lesson_code = f"L1.BT.{lesson_idx:02d}"
            
            current_lesson = {
                "lesson_code": lesson_code,
                "level_code": "L1",
                "topic_code": "BT",
                "title": title,
                "description": desc,
                "content_status": "ready",
                "display_order": lesson_idx,
                "activities": []
            }
            lessons.append(current_lesson)
        
        # Activity row
        if current_lesson and c and (c[0].isdigit() or "Thẻ" in c or "Nối" in c or "Ghép" in c or "Xem" in c or "Chọn" in c):
            act_idx += 1
            act_code = f"{current_lesson['lesson_code']}.T{act_idx:02d}"
            game_type = map_game_type(c)
            
            # Extract URLs from E or D
            all_text = f"{d} {e}"
            urls = re.findall(r'https?://[^\s,;]+', all_text)
            
            labels = ACTIVITY_ITEMS.get((lesson_idx, act_idx), LESSON_ITEMS[lesson_idx])
            media_items = build_media(act_code, labels, urls)
            game_config = build_game_config(lesson_idx, act_idx, game_type, c, e, labels, media_items)
            
            current_lesson['activities'].append({
                "activity_code": act_code,
                "activity_level": "T",
                "game_type": game_type,
                "title": c,
                "instruction": d,
                "display_order": act_idx,
                "pass_score": 80.00,
                "game_config": game_config,
                "media": media_items
            })

output_path = "backend/src/scripts/curriculum_lop1_data.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(lessons, f, ensure_ascii=False, indent=2)

print(f"Successfully generated {output_path} with {len(lessons)} lessons and {sum(len(l['activities']) for l in lessons)} activities!")

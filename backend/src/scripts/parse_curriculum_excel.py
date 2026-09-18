import sys, zipfile, re, json, xml.etree.ElementTree as ET
sys.stdout.reconfigure(encoding='utf-8')

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
            
            # Extract items/words mentioned
            words = []
            words_match = re.findall(r'[-•]\s*([^:\n]+)[:\s]', e)
            if words_match:
                words = [w.strip() for w in words_match]
            
            # Build media items
            media_items = []
            if urls:
                for u_idx, u in enumerate(urls):
                    m_code = f"{current_lesson['lesson_code']}.V{u_idx+1:02d}"
                    media_items.append({
                        "media_code": m_code,
                        "media_type": "video" if ("youtube" in u or "video" in u or "qipedc" in u) else "image",
                        "source_url": u,
                        "display_order": u_idx + 1
                    })
            else:
                # Default media placeholder for activities without explicit links
                for u_idx in range(4):
                    m_code = f"{current_lesson['lesson_code']}.V{u_idx+1:02d}"
                    media_items.append({
                        "media_code": m_code,
                        "media_type": "video",
                        "source_url": f"https://vietsign.ibme.edu.vn/videos/{current_lesson['lesson_code']}_v{u_idx+1:02d}.mp4",
                        "display_order": u_idx + 1
                    })
            
            current_lesson['activities'].append({
                "activity_code": act_code,
                "activity_level": "T",
                "game_type": game_type,
                "title": c,
                "instruction": d,
                "display_order": act_idx,
                "pass_score": 80.00,
                "game_config": {
                    "source": e if e else None,
                    "targetWords": words if words else None
                },
                "media": media_items
            })

output_path = "backend/src/scripts/curriculum_lop1_data.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(lessons, f, ensure_ascii=False, indent=2)

print(f"Successfully generated {output_path} with {len(lessons)} lessons and {sum(len(l['activities']) for l in lessons)} activities!")

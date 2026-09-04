-- Topic assignment is now explicit through classroom_topic.
-- Remove links created from the legacy topic.class_room_id relationship.
DELETE ct
FROM classroom_topic ct
INNER JOIN topic t ON t.topic_id = ct.topic_id
WHERE t.class_room_id IS NOT NULL;

UPDATE topic
SET class_room_id = NULL
WHERE class_room_id IS NOT NULL;

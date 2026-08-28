import Topics from "@/domain/entities/Topic";
import Dictionary from "@/domain/entities/Dictionary";
import { repairVietnameseMojibake } from "@/shared/utils/text";

export interface TopicItem {
  id: number;
  name: string;
  classroomId?: number;
  description?: string;
  imageLocation?: string;
  creatorId?: number;
  classroomCount?: number;
  vocabularyCount?: number;
}

export interface TopicVocabularyItem {
  id: number;
  word: string;
  description?: string;
  vocabularyType?: string;
  status?: string;
  imageUrl?: string;
  videoUrl?: string;
}

const mapTopic = (topic: any): TopicItem => ({
  id: Number(topic.topic_id || topic.id),
  name: repairVietnameseMojibake(topic.name || topic.content || ""),
  classroomId: topic.classroom_id
    ? Number(topic.classroom_id)
    : undefined,
  description: repairVietnameseMojibake(topic.description || ""),
  imageLocation: cleanUrl(topic.image_location),
  creatorId: topic.creator_id ? Number(topic.creator_id) : undefined,
  classroomCount: Number(topic.classroom_count || 0),
  vocabularyCount: Number(topic.vocabulary_count || 0),
});

/**
 * Clean double slash trong URL (giữ nguyên protocol https://)
 * VD: "https://wesign.ibme.edu.vn/upload/vocabularies//file.mp4"
 *  → "https://wesign.ibme.edu.vn/upload/vocabularies/file.mp4"
 */
function cleanUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return url.replace(/([^:])\/\/+/g, "$1/");
}

export async function fetchAllTopics(query: any = {}): Promise<TopicItem[]> {
  try {
    const response = await Topics.getTopics({ limit: 1000, ...query });
    const data = response.data || response;
    // Check if data is array or object with data property
    const items = Array.isArray(data) ? data : data.data || [];

    return Array.isArray(items)
      ? items.map(mapTopic)
      : [];
  } catch (error) {
    console.error("Error fetching topics:", error);
    return [];
  }
}

export async function fetchTopicsByClassroom(
  classroomId: number,
): Promise<TopicItem[]> {
  try {
    const response = await Topics.getTopicsByClassroom(classroomId);
    const data = response.data || response;
    const items = Array.isArray(data) ? data : data.data || [];

    return Array.isArray(items)
      ? items.map(mapTopic)
      : [];
  } catch (error) {
    console.error("Error fetching topics by classroom:", error);
    return [];
  }
}

export async function fetchMyTopics(): Promise<TopicItem[]> {
  const response = await Topics.getMyTopics();
  const data = response.data || response;
  const items = Array.isArray(data) ? data : data.data || [];
  return Array.isArray(items) ? items.map(mapTopic) : [];
}

export async function fetchAvailableTopicsForClassroom(
  classroomId: number,
): Promise<TopicItem[]> {
  const response = await Topics.getAvailableTopics(classroomId);
  const data = response.data || response;
  const items = Array.isArray(data) ? data : data.data || [];
  return Array.isArray(items) ? items.map(mapTopic) : [];
}

export async function assignTopicsToClassroom(
  classroomId: number,
  topicIds: number[],
): Promise<void> {
  await Topics.assignTopics(classroomId, topicIds);
}

export async function removeTopicFromClassroom(
  classroomId: number,
  topicId: number,
): Promise<void> {
  await Topics.removeTopicFromClassroom(classroomId, topicId);
}

export async function fetchSelectedTopicVocabularies(
  topicId: number,
): Promise<TopicVocabularyItem[]> {
  const response = await Topics.getTopicVocabularies(topicId);
  const data = response.data || response;
  const items = Array.isArray(data) ? data : data.data || [];
  return items.map((item: any) => ({
    id: Number(item.id || item.vocabulary_id),
    word: repairVietnameseMojibake(item.word || item.content || ""),
    description: repairVietnameseMojibake(item.description || ""),
    vocabularyType: item.vocabulary_type,
    status: item.status,
    imageUrl: cleanUrl(item.image_url),
    videoUrl: cleanUrl(item.video_url),
  }));
}

export async function replaceTopicVocabularies(
  topicId: number,
  vocabularyIds: number[],
): Promise<void> {
  await Topics.replaceTopicVocabularies(topicId, vocabularyIds);
}

export async function fetchVocabulariesByTopic(
  topicId: number,
): Promise<any[]> {
  try {
    const response = await Dictionary.getAllWords({ topic_id: topicId });
    const data = response.data || response;
    const items = Array.isArray(data) ? data : data.data || [];

    return Array.isArray(items)
      ? items.map((v: any) => ({
          id: v.vocabulary_id || v.id,
          word: repairVietnameseMojibake(v.word || v.content || ""),
          vocabularyImageResList: v.vocabularyImageResList || [],
          vocabularyVideoResList: v.vocabularyVideoResList || [],
          imageUrl: cleanUrl(v.images_path || v.imageUrl),
          videoUrl: cleanUrl(v.videos_path || v.videoUrl),
        }))
      : [];
  } catch (error) {
    console.error("Error fetching vocabularies by topic:", error);
    return [];
  }
}

export async function createTopic(data: any): Promise<any> {
  try {
    const response = await Topics.createTopic(data);
    return response.data || response;
  } catch (error) {
    console.error("Error creating topic:", error);
    throw error;
  }
}

export async function updateTopic(id: number, data: any): Promise<any> {
  try {
    const response = await Topics.updateTopic(id, data);
    return response.data || response;
  } catch (error) {
    console.error(`Error updating topic ${id}:`, error);
    throw error;
  }
}

export async function deleteTopic(id: number): Promise<any> {
  try {
    const response = await Topics.deleteTopic(id);
    return response.data || response;
  } catch (error) {
    console.error(`Error deleting topic ${id}:`, error);
    throw error;
  }
}

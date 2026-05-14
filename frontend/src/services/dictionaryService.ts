import DictionaryModel from "@/domain/entities/Dictionary";
import { DictionaryItem } from "@/data/dictionaryData";
import { API_BASE_URL, API_BASE_URL_NODE } from "@/core/config/api";

/**
 * Convert API response to DictionaryItem
 */
function convertApiToDictionaryItem(item: any): DictionaryItem {
  const baseUrl = API_BASE_URL_NODE || API_BASE_URL || "http://localhost:5000";

  const getFullUrl = (path?: string) => {
    if (!path) return undefined;

    let url = path;

    // Nếu là absolute URL → dùng thẳng nhưng clean double slash trong path
    if (url.startsWith("http")) {
      // Fix double slash trong path (giữ nguyên phần protocol https://)
      url = url.replace(/([^:])\/\/+/g, "$1/");
      return url;
    }

    // Nếu là relative path → prepend baseUrl
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return `${baseUrl}${cleanPath}`;
  };

  return {
    id: item.id || item.vocabulary_id,
    word: item.content || item.word,
    category: item.topic_name || item.category || "Chưa phân loại",
    videoUrl: getFullUrl(item.videos_path || item.videoUrl),
    imageUrl: getFullUrl(item.images_path || item.imageUrl),
    views: item.view_count || item.views || 0,
    status: item.status === "APPROVED" ? "published" : "draft",
    description: item.meaning || item.description,
    vocabularyType: item.vocabulary_type || item.vocabularyType || "WORD",
  };
}

/**
 * Convert DictionaryItem to API payload
 */
function convertItemToApiPayload(data: any): any {
  return {
    content: data.word,
    description: data.description || data.meaning || "",
    topic_id: data.topic_id || data.topicId || null,
    classroom_id: data.class_room_id || data.classId || null,
    vocabulary_type: data.vocabularyType || data.vocabulary_type || "WORD",
    images_path: data.imageUrl,
    videos_path: data.videoUrl,
    status: data.status === "published" ? "APPROVED" : "PENDING",
  };
}

export const fetchAllWords = async (query?: any): Promise<DictionaryItem[]> => {
  try {
    // Map frontend query 'q' to backend 'content' if needed (handled in Entity now)
    const res = await DictionaryModel.getAllWords(query);
    if (Array.isArray(res)) return res.map(convertApiToDictionaryItem);
    if (res?.data && Array.isArray(res.data))
      return res.data.map(convertApiToDictionaryItem);
    return [];
  } catch (error) {
    return [];
  }
};

export const fetchWordById = async (
  id: number,
): Promise<DictionaryItem | undefined> => {
  try {
    const res = await DictionaryModel.getWordById(id);
    const data = res?.data || res;
    return convertApiToDictionaryItem(data);
  } catch (error) {
    return undefined;
  }
};

export const createWord = async (data: any): Promise<DictionaryItem | null> => {
  try {
    const payload = convertItemToApiPayload(data);
    const res = await DictionaryModel.createWord(payload);
    const resultData = res?.data || res;
    return convertApiToDictionaryItem(resultData);
  } catch (error) {
    console.error("Error creating word:", error);
    throw error;
  }
};

export const createMultipleWords = async (data: any[]): Promise<boolean> => {
  try {
    const payload = data.map(convertItemToApiPayload);
    await DictionaryModel.createMultipleWords(payload);
    return true;
  } catch (error) {
    console.error("Error creating multiple words:", error);
    throw error;
  }
};

export const updateWord = async (
  id: number,
  data: any,
): Promise<DictionaryItem | null> => {
  try {
    const payload = convertItemToApiPayload(data);
    const res = await DictionaryModel.updateWord(id, payload);
    const resultData = res?.data || res;
    return convertApiToDictionaryItem(resultData);
  } catch (error) {
    console.error(`Error updating word ${id}:`, error);
    throw error;
  }
};

export const deleteWord = async (id: number): Promise<boolean> => {
  try {
    await DictionaryModel.deleteWord(id);
    return true;
  } catch (error) {
    console.error(`Error deleting word ${id}:`, error);
    throw error;
  }
};

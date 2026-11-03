import { CurriculumActivity, CurriculumMedia } from "@/domain/entities/Curriculum";

type ConfigRecord = Record<string, unknown>;

export function getGameConfig(activity: CurriculumActivity | null): ConfigRecord {
  const raw = activity?.game_config;
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as ConfigRecord;
    } catch {
      return {};
    }
  }
  return raw;
}

export function getActivityLabels(activity: CurriculumActivity | null): string[] {
  const config = getGameConfig(activity);
  const candidates = [config.targetWords, config.labels, config.sequence];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const labels = candidate
        .map((item) => {
          if (typeof item === "string" || typeof item === "number") return String(item);
          if (item && typeof item === "object" && "label" in item) {
            return String((item as { label: unknown }).label);
          }
          return "";
        })
        .filter(Boolean);
      if (labels.length > 0) return labels;
    }
  }

  return [];
}

export function getMediaLabel(
  activity: CurriculumActivity | null,
  media: CurriculumMedia,
  index: number,
): string {
  const config = getGameConfig(activity);
  const pairs = Array.isArray(config.pairs) ? config.pairs : [];
  const pair = pairs[index];
  if (pair && typeof pair === "object" && "text" in pair) {
    return String((pair as { text: unknown }).text);
  }

  return getActivityLabels(activity)[index] || media.media_code || `Mục ${index + 1}`;
}

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

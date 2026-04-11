import { Base } from "@/domain/entities/base";
import { mockNotifications, NotificationItem } from "@/data";

export async function fetchAllNotifications(): Promise<NotificationItem[]> {
  return mockNotifications;
}

export async function markAsRead(id: number): Promise<void> {
  // Mock - TODO: implement actual API call
}

export async function markAllAsRead(): Promise<void> {
  // Mock - TODO: implement actual API call
}

export async function deleteNotification(id: number): Promise<void> {
  // Mock - TODO: implement actual API call
}

import { api } from "@/lib/api";
import { Notification } from "@/types";

export const notificationService = {
  async getNotifications(unreadOnly = false): Promise<Notification[]> {
    const res = await api.get<Notification[]>("/notifications", {
      params: { unread_only: unreadOnly },
    });
    return res.data;
  },

  async getUnreadCount(): Promise<number> {
    const res = await api.get<{ unread_count: number }>("/notifications/unread-count");
    return res.data.unread_count;
  },

  async markAsRead(id: string): Promise<Notification> {
    const res = await api.patch<Notification>(`/notifications/${id}/read`);
    return res.data;
  },

  async markAllAsRead(): Promise<{ message: string }> {
    const res = await api.patch<{ message: string }>("/notifications/read-all");
    return res.data;
  },
};

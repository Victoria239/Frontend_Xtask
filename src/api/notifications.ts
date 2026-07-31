/* Notifications API (P-04 in-app channel) */

import apiClient from "./client";

export type NotifKind = "info" | "success" | "warning" | "error";

export interface Notification {
  id: number;
  tenant_id: number;
  user_id: number;
  kind: NotifKind | string;
  category: string;
  title: string;
  body: string | null;
  action_url: string | null;
  meta: Record<string, unknown>;
  read_at: string | null;
  archived: boolean;
  created_at: string;
}

export interface UnreadCount {
  unread: number;
  total: number;
}

export const list = (unreadOnly = false) =>
  apiClient
    .get<Notification[]>("/notifications", { params: unreadOnly ? { unread_only: true } : undefined })
    .then((r) => r.data);

export const count = () =>
  apiClient.get<UnreadCount>("/notifications/count").then((r) => r.data);

export const markRead = (ids?: number[]) =>
  apiClient
    .post<UnreadCount>("/notifications/mark-read", { ids: ids ?? null })
    .then((r) => r.data);

export const archive = (id: number) =>
  apiClient.delete(`/notifications/${id}`);

/* Preferencias de notificación + test email (P-04.2) */

import apiClient from "./client";

export interface Preferences {
  email_enabled: boolean;
  category_overrides: Record<string, boolean>;
}

export interface EmailMode {
  mode: "sendgrid" | "smtp" | "mock";
}

export const getMode = () =>
  apiClient.get<EmailMode>("/notifications/email/mode").then((r) => r.data);

export const getPreferences = () =>
  apiClient.get<Preferences>("/notifications/preferences").then((r) => r.data);

export const updatePreferences = (data: Partial<Preferences>) =>
  apiClient.put<Preferences>("/notifications/preferences", data).then((r) => r.data);

export const testEmail = (to: string, subject?: string, body?: string) =>
  apiClient.post<{ status: string; mode: string; detail: string }>(
    "/notifications/email/test",
    { to, subject, body },
  ).then((r) => r.data);

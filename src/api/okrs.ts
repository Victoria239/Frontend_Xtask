/* OKRs API (C-02) — cascada con KRs y check-ins. */

import apiClient from "./client";

export interface KeyResult {
  id: number;
  okr_id: number;
  name: string;
  metric_type: string;
  unit: string | null;
  baseline: number;
  target: number;
  current: number;
  weight: number;
  linked_kpi_id: number | null;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface KeyResultIn {
  name: string;
  metric_type?: string;
  unit?: string | null;
  baseline?: number;
  target: number;
  current?: number;
  weight?: number;
  linked_kpi_id?: number | null;
}

export interface OkrSummary {
  id: number;
  parent_id: number | null;
  scope: "company" | "team" | "individual";
  owner_employee_id: number | null;
  owner_department: string | null;
  objective: string;
  description: string | null;
  period: string;
  status: "on-track" | "at-risk" | "off-track" | "exceeded" | "met";
  progress: number;
  weight: number;
  created_at: string;
  updated_at: string;
}

export interface OkrDetail extends OkrSummary {
  key_results: KeyResult[];
}

export interface OkrTreeNode extends OkrDetail {
  children: OkrTreeNode[];
}

export interface OkrIn {
  scope?: "company" | "team" | "individual";
  parent_id?: number | null;
  owner_employee_id?: number | null;
  owner_department?: string | null;
  objective: string;
  description?: string | null;
  period: string;
  weight?: number;
  key_results?: KeyResultIn[];
}

export interface OkrUpdate {
  scope?: "company" | "team" | "individual";
  parent_id?: number | null;
  owner_employee_id?: number | null;
  owner_department?: string | null;
  objective?: string;
  description?: string | null;
  period?: string;
  weight?: number;
}

export interface CheckinIn {
  kr_id: number;
  value: number;
  confidence?: string | null;
  comment?: string | null;
}

/* OKRs */
export const listOkrs = (period?: string) =>
  apiClient.get<OkrSummary[]>("/okrs/", { params: period ? { period } : undefined }).then((r) => r.data);

export const getCascade = (period?: string) =>
  apiClient.get<OkrTreeNode[]>("/okrs/cascade", { params: period ? { period } : undefined }).then((r) => r.data);

export const getOkr = (id: number) =>
  apiClient.get<OkrDetail>(`/okrs/${id}`).then((r) => r.data);

export const createOkr = (data: OkrIn) =>
  apiClient.post<OkrDetail>("/okrs/", data).then((r) => r.data);

export const updateOkr = (id: number, data: OkrUpdate) =>
  apiClient.put<OkrDetail>(`/okrs/${id}`, data).then((r) => r.data);

export const deleteOkr = (id: number) =>
  apiClient.delete(`/okrs/${id}`);

/* Key Results */
export const addKr = (okrId: number, data: KeyResultIn) =>
  apiClient.post<KeyResult>(`/okrs/${okrId}/key-results`, data).then((r) => r.data);

export const updateKr = (krId: number, data: Partial<KeyResultIn>) =>
  apiClient.put<KeyResult>(`/okrs/key-results/${krId}`, data).then((r) => r.data);

export const deleteKr = (krId: number) =>
  apiClient.delete(`/okrs/key-results/${krId}`);

/* Check-ins */
export const checkin = (data: CheckinIn) =>
  apiClient.post<KeyResult>("/okrs/checkin", data).then((r) => r.data);

/* What-if (AI-07) */
export interface WhatIfOkr {
  id: number;
  parent_id: number | null;
  objective: string;
  scope: string;
  period: string;
  current_progress: number;
  current_status: string;
  sim_progress: number;
  sim_status: string;
  delta_progress: number;
}

export interface WhatIfKr {
  id: number;
  okr_id: number;
  name: string;
  baseline: number;
  target: number;
  current: number;
  sim_current: number;
  current_progress: number;
  sim_progress: number;
}

export interface WhatIfResponse {
  period: string | null;
  affected_okrs: WhatIfOkr[];
  affected_krs: WhatIfKr[];
}

export const whatif = (krOverrides: Record<number, number>, period?: string) =>
  apiClient.post<WhatIfResponse>("/okrs/whatif", { kr_overrides: krOverrides }, { params: period ? { period } : undefined }).then((r) => r.data);


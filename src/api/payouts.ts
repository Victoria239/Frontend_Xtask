/* Payouts API (C-04) — calculadora de pagos. */

import apiClient from "./client";

export type RunStatus = "draft" | "pending_approval" | "approved" | "paid" | "cancelled";

export interface RunSummary {
  id: number;
  plan_id: number;
  plan_name: string;
  period_label: string;
  period_start: string;
  period_end: string;
  department_filter: string | null;
  currency: string;
  status: RunStatus;
  total_amount: number;
  employee_count: number;
  created_at: string;
}

export interface PayoutLine {
  id: number;
  run_id: number;
  employee_id: number;
  employee_name: string;
  department: string | null;
  context: Record<string, unknown>;
  amount: number;
  matched_rules: number;
  trace: Array<{ rule_id?: number; label?: string; matched: boolean; amount?: number; error?: string }>;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface RunDetail extends RunSummary {
  payouts: PayoutLine[];
}

export interface RunIn {
  plan_id: number;
  period_label: string;
  period_start: string;
  period_end: string;
  department_filter?: string | null;
  notes?: string | null;
  context_overrides?: Record<number, Record<string, unknown>>;
}

export const listRuns = (status?: RunStatus) =>
  apiClient.get<RunSummary[]>("/payouts/runs", { params: status ? { status } : undefined }).then((r) => r.data);

export const getRun = (id: number) =>
  apiClient.get<RunDetail>(`/payouts/runs/${id}`).then((r) => r.data);

export const computeRun = (data: RunIn) =>
  apiClient.post<RunDetail>("/payouts/runs/compute", data).then((r) => r.data);

export const updateStatus = (id: number, status: RunStatus, note?: string) =>
  apiClient.post<RunDetail>(`/payouts/runs/${id}/status`, { status, note: note || null }).then((r) => r.data);

export const deleteRun = (id: number) =>
  apiClient.delete(`/payouts/runs/${id}`);

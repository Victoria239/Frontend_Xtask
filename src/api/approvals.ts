/* Approvals API (C-05) — engine genérico de workflows de aprobación. */

import apiClient from "./client";

export interface Step {
  id: number;
  flow_id: number;
  position: number;
  name: string;
  approver_role: string;
  approver_user_id: number | null;
  auto_approve_below: number | null;
  sla_hours: number;
}

export interface FlowOut {
  id: number;
  name: string;
  description: string | null;
  target_kind: string;
  priority: number;
  active: boolean;
  filter_jsonlogic: Record<string, unknown> | null;
  created_at: string;
}

export interface FlowDetail extends FlowOut {
  steps: Step[];
}

export interface FlowIn {
  name: string;
  description?: string | null;
  target_kind: string;
  priority?: number;
  active?: boolean;
  filter_jsonlogic?: Record<string, unknown> | null;
  steps: Array<{
    name: string;
    position: number;
    approver_role: string;
    approver_user_id?: number | null;
    auto_approve_below?: number | null;
    sla_hours?: number;
  }>;
}

export interface InstanceStep {
  id: number;
  instance_id: number;
  position: number;
  name: string;
  approver_user_id: number | null;
  status: "pending" | "approved" | "rejected" | "skipped";
  decided_at: string | null;
  decided_by: number | null;
  note: string | null;
}

export interface InstanceSummary {
  id: number;
  flow_id: number;
  target_kind: string;
  target_id: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  current_step_position: number;
  summary: string | null;
  target_employee_id: number | null;
  requester_user_id: number | null;
  created_at: string;
}

export interface InstanceDetail extends InstanceSummary {
  steps: InstanceStep[];
}

/* Flows */
export const listFlows = (targetKind?: string) =>
  apiClient.get<FlowOut[]>("/approvals/flows", { params: targetKind ? { target_kind: targetKind } : undefined }).then((r) => r.data);

export const getFlow = (id: number) =>
  apiClient.get<FlowDetail>(`/approvals/flows/${id}`).then((r) => r.data);

export const createFlow = (data: FlowIn) =>
  apiClient.post<FlowDetail>("/approvals/flows", data).then((r) => r.data);

/* Instances */
export const listInstances = (params?: { status?: string; mine?: boolean }) =>
  apiClient.get<InstanceSummary[]>("/approvals/instances", { params }).then((r) => r.data);

export const getInstance = (id: number) =>
  apiClient.get<InstanceDetail>(`/approvals/instances/${id}`).then((r) => r.data);

export const decide = (instanceId: number, decision: "approved" | "rejected", note?: string) =>
  apiClient.post<InstanceDetail>(`/approvals/instances/${instanceId}/decision`, { decision, note: note || null }).then((r) => r.data);

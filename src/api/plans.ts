/* Plans API (C-03) — motor de comisiones con reglas JSONLogic. */

import apiClient from "./client";

export interface JsonLogicExpr {
  [op: string]: unknown;
}

export interface Rule {
  id: number;
  plan_id: number;
  label: string;
  priority: number;
  when: JsonLogicExpr;
  amount: JsonLogicExpr;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RuleIn {
  label: string;
  priority?: number;
  when: JsonLogicExpr;
  amount: JsonLogicExpr;
  notes?: string | null;
}

export interface PlanSummary {
  id: number;
  name: string;
  description: string | null;
  scope_department: string | null;
  scope_role: string | null;
  period: string;
  currency: string;
  strategy: string;
  active: boolean;
  rule_count: number;
  created_at: string;
}

export interface PlanDetail {
  id: number;
  tenant_id: number;
  name: string;
  description: string | null;
  scope_department: string | null;
  scope_role: string | null;
  period: string;
  currency: string;
  strategy: string;
  active: boolean;
  defaults: Record<string, unknown>;
  rules: Rule[];
  created_at: string;
  updated_at: string;
}

export interface PlanIn {
  name: string;
  description?: string | null;
  scope_department?: string | null;
  scope_role?: string | null;
  period?: string;
  currency?: string;
  strategy?: string;
  defaults?: Record<string, unknown>;
  rules?: RuleIn[];
}

export interface PlanUpdate {
  name?: string;
  description?: string | null;
  scope_department?: string | null;
  scope_role?: string | null;
  period?: string;
  currency?: string;
  strategy?: string;
  active?: boolean;
  defaults?: Record<string, unknown>;
}

export interface SimulateRequest {
  employee_id?: number | null;
  context: Record<string, unknown>;
}

export interface RuleTrace {
  rule_id: number;
  label: string;
  matched: boolean;
  amount?: number | null;
  error?: string | null;
}

export interface SimulateResponse {
  plan_id: number;
  plan_name: string;
  strategy: string;
  currency: string;
  total_amount: number;
  matched_rules: number;
  trace: RuleTrace[];
  context: Record<string, unknown>;
}

export const listPlans = (active?: boolean) =>
  apiClient.get<PlanSummary[]>("/plans/", { params: active !== undefined ? { active } : undefined }).then((r) => r.data);

export const getPlan = (id: number) =>
  apiClient.get<PlanDetail>(`/plans/${id}`).then((r) => r.data);

export const createPlan = (data: PlanIn) =>
  apiClient.post<PlanDetail>("/plans/", data).then((r) => r.data);

export const updatePlan = (id: number, data: PlanUpdate) =>
  apiClient.put<PlanDetail>(`/plans/${id}`, data).then((r) => r.data);

export const deletePlan = (id: number) =>
  apiClient.delete(`/plans/${id}`);

export const addRule = (planId: number, data: RuleIn) =>
  apiClient.post<Rule>(`/plans/${planId}/rules`, data).then((r) => r.data);

export const updateRule = (ruleId: number, data: RuleIn) =>
  apiClient.put<Rule>(`/plans/rules/${ruleId}`, data).then((r) => r.data);

export const deleteRule = (ruleId: number) =>
  apiClient.delete(`/plans/rules/${ruleId}`);

export const simulate = (planId: number, data: SimulateRequest) =>
  apiClient.post<SimulateResponse>(`/plans/${planId}/simulate`, data).then((r) => r.data);

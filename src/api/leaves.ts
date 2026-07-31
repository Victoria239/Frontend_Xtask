/* Leaves API (H-04) — ausencias y permisos */

import apiClient from "./client";

export type LeaveStatus = "requested" | "approved" | "rejected" | "cancelled" | "taken";

export interface LeaveType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  accrual_strategy: string;
  days_per_year: number;
  accrual_config: Record<string, unknown> | null;
  color: string;
  requires_approval: boolean;
  allow_negative_balance: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaveTypeIn {
  code: string;
  name: string;
  description?: string | null;
  accrual_strategy?: string;
  days_per_year?: number;
  color?: string;
  requires_approval?: boolean;
  allow_negative_balance?: boolean;
  active?: boolean;
}

export interface LeaveSummary {
  id: number;
  employee_id: number;
  type_id: number;
  type_name: string;
  type_color: string;
  start_date: string;
  end_date: string;
  business_days: number;
  status: LeaveStatus;
  created_at: string;
}

export interface Leave {
  id: number;
  employee_id: number;
  type_id: number;
  type_name: string | null;
  start_date: string;
  end_date: string;
  business_days: number;
  status: LeaveStatus;
  reason: string | null;
  approval_note: string | null;
  requested_by: number | null;
  decided_by: number | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveIn {
  type_id: number;
  start_date: string;
  end_date: string;
  reason?: string | null;
}

export interface LeaveDecision {
  decision: "approved" | "rejected";
  note?: string | null;
}

export interface Balance {
  id: number;
  employee_id: number;
  type_id: number;
  type_name: string;
  type_color: string;
  year: number;
  accrued: number;
  used: number;
  pending: number;
  adjustments: number;
  available: number;
  last_computed_at: string;
}

export interface LeaveEvent {
  id: number;
  leave_id: number;
  from_status: string | null;
  to_status: string;
  note: string | null;
  actor_user_id: number | null;
  created_at: string;
}

/* Types */
export const listTypes = () =>
  apiClient.get<LeaveType[]>("/leaves/types").then((r) => r.data);

export const createType = (data: LeaveTypeIn) =>
  apiClient.post<LeaveType>("/leaves/types", data).then((r) => r.data);

export const updateType = (id: number, data: LeaveTypeIn) =>
  apiClient.put<LeaveType>(`/leaves/types/${id}`, data).then((r) => r.data);

/* Leaves */
export const listLeaves = (params?: { employee_id?: number; status?: LeaveStatus; date_from?: string; date_to?: string }) =>
  apiClient.get<LeaveSummary[]>("/leaves/", { params }).then((r) => r.data);

export const getLeave = (id: number) =>
  apiClient.get<Leave>(`/leaves/${id}`).then((r) => r.data);

export const listEvents = (id: number) =>
  apiClient.get<LeaveEvent[]>(`/leaves/${id}/events`).then((r) => r.data);

export const requestLeave = (employeeId: number, data: LeaveIn) =>
  apiClient.post<Leave>(`/leaves/employee/${employeeId}`, data).then((r) => r.data);

export const decideLeave = (id: number, data: LeaveDecision) =>
  apiClient.post<Leave>(`/leaves/${id}/decision`, data).then((r) => r.data);

export const cancelLeave = (id: number) =>
  apiClient.post<Leave>(`/leaves/${id}/cancel`).then((r) => r.data);

/* Balances */
export const listBalances = (employeeId: number, year: number) =>
  apiClient.get<Balance[]>(`/leaves/employee/${employeeId}/balances`, { params: { year } }).then((r) => r.data);

export const adjustBalance = (employeeId: number, typeId: number, year: number, delta: number, note?: string) =>
  apiClient.post<Balance>(`/leaves/employee/${employeeId}/balances/${typeId}/adjust`, { delta, note }, { params: { year } }).then((r) => r.data);

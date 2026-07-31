/* Admin dashboard tenants (P-03) */

import apiClient from "./client";

export interface TenantStats {
  id: number;
  slug: string;
  name: string;
  plan: string;
  is_active: boolean;
  domain: string | null;
  created_at: string;
  employees_total: number;
  employees_active: number;
  documents: number;
  contracts_total: number;
  contracts_active: number;
  okrs: number;
  kpis: number;
  last_activity_at: string | null;
  plan_limit_employees: number | null;
  plan_monthly_cost_eur: number;
}

export interface TenantAdminDetail extends TenantStats {
  notifications_30d: number;
  payouts_30d_total: number;
  pipelines_open: number;
}

export const listDashboard = () =>
  apiClient.get<TenantStats[]>("/tenants/admin/dashboard").then((r) => r.data);

export const getDetail = (id: number) =>
  apiClient.get<TenantAdminDetail>(`/tenants/admin/${id}/detail`).then((r) => r.data);

export const suspend = (id: number, reason?: string) =>
  apiClient.post<{ id: number; is_active: boolean }>(`/tenants/admin/${id}/suspend`, { reason: reason || null }).then((r) => r.data);

export const reactivate = (id: number) =>
  apiClient.post<{ id: number; is_active: boolean }>(`/tenants/admin/${id}/reactivate`).then((r) => r.data);

export const changePlan = (id: number, plan: string) =>
  apiClient.put<{ id: number; plan: string }>(`/tenants/admin/${id}/plan`, null, { params: { plan } }).then((r) => r.data);

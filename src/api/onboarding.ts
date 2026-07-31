/* Onboarding API (H-02) — checklist por empleado + templates reusables. */

import apiClient from "./client";

export type StepStatus = "pending" | "in_progress" | "done" | "skipped";

export interface TemplateStep {
  id?: number;
  position: number;
  title: string;
  description?: string | null;
  category: string;
  due_days: number;
  required: boolean;
}

export interface Template {
  id: number;
  tenant_id: number;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  steps: TemplateStep[];
}

export interface AssignmentStep {
  id: number;
  assignment_id: number;
  position: number;
  title: string;
  description: string | null;
  category: string;
  required: boolean;
  due_date: string | null;
  status: StepStatus | string;
  completed_at: string | null;
  completed_by: number | null;
}

export interface Assignment {
  id: number;
  tenant_id: number;
  employee_id: number;
  template_id: number | null;
  started_at: string;
  completed_at: string | null;
  steps: AssignmentStep[];
}

export interface Summary {
  assignment_id: number;
  employee_id: number;
  employee_name: string;
  total_steps: number;
  done_steps: number;
  started_at: string;
  completed_at: string | null;
}

/* Templates */
export const listTemplates = () =>
  apiClient.get<Template[]>("/onboarding/templates").then((r) => r.data);

export const createTemplate = (data: { name: string; description?: string; is_default?: boolean; steps: TemplateStep[] }) =>
  apiClient.post<Template>("/onboarding/templates", data).then((r) => r.data);

export const deleteTemplate = (id: number) =>
  apiClient.delete(`/onboarding/templates/${id}`);

/* Assignments */
export const assign = (employee_id: number, template_id?: number) =>
  apiClient.post<Assignment>("/onboarding/assign", { employee_id, template_id }).then((r) => r.data);

export const getForEmployee = (employee_id: number) =>
  apiClient.get<Assignment | null>(`/onboarding/employee/${employee_id}`).then((r) => r.data);

export const updateStep = (step_id: number, status: StepStatus) =>
  apiClient.patch<Assignment>(`/onboarding/steps/${step_id}`, { status }).then((r) => r.data);

export const summary = () =>
  apiClient.get<Summary[]>("/onboarding/summary").then((r) => r.data);

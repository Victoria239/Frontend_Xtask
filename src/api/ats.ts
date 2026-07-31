/* ATS API (H-03) — Applicant Tracking System */

import apiClient from "./client";

export interface Stage {
  id: number;
  pipeline_id: number;
  name: string;
  position: number;
  is_terminal: boolean;
  color: string;
}

export interface StageIn {
  name: string;
  position?: number;
  is_terminal?: boolean;
  color?: string;
}

export interface PipelineSummary {
  id: number;
  title: string;
  description: string | null;
  department: string | null;
  location: string | null;
  status: string;
  hiring_manager_employee_id: number | null;
  created_at: string;
  application_count: number;
}

export interface PipelineDetail extends PipelineSummary {
  stages: Stage[];
}

export interface PipelineIn {
  title: string;
  description?: string | null;
  department?: string | null;
  location?: string | null;
  hiring_manager_employee_id?: number | null;
  status?: string;
  stages?: StageIn[];
}

export interface Candidate {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  tags: string[] | null;
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateIn {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  resume_url?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  source?: string | null;
}

export interface KanbanCard {
  application_id: number;
  candidate_id: number;
  candidate_name: string;
  candidate_email: string | null;
  candidate_source: string | null;
  stage_id: number;
  days_in_stage: number;
}

export interface KanbanColumn {
  stage: Stage;
  cards: KanbanCard[];
}

export interface KanbanView {
  pipeline_id: number;
  pipeline_title: string;
  columns: KanbanColumn[];
}

export interface Application {
  id: number;
  pipeline_id: number;
  candidate_id: number;
  stage_id: number;
  final_decision: string | null;
  expected_salary: string | null;
  offered_salary: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationEvent {
  id: number;
  application_id: number;
  kind: string;
  from_stage_id: number | null;
  to_stage_id: number | null;
  note: string | null;
  actor_user_id: number | null;
  created_at: string;
}

/* Pipelines */
export const listPipelines = (status?: string) =>
  apiClient.get<PipelineSummary[]>("/ats/pipelines", { params: status ? { status } : undefined }).then((r) => r.data);

export const getPipeline = (id: number) =>
  apiClient.get<PipelineDetail>(`/ats/pipelines/${id}`).then((r) => r.data);

export const createPipeline = (data: PipelineIn) =>
  apiClient.post<PipelineDetail>("/ats/pipelines", data).then((r) => r.data);

export const updatePipeline = (id: number, data: Partial<PipelineIn>) =>
  apiClient.put<PipelineDetail>(`/ats/pipelines/${id}`, data).then((r) => r.data);

export const deletePipeline = (id: number) =>
  apiClient.delete(`/ats/pipelines/${id}`);

/* Kanban */
export const getKanban = (pipelineId: number) =>
  apiClient.get<KanbanView>(`/ats/pipelines/${pipelineId}/kanban`).then((r) => r.data);

/* Candidates */
export const listCandidates = (search?: string) =>
  apiClient.get<Candidate[]>("/ats/candidates", { params: search ? { search } : undefined }).then((r) => r.data);

export const createCandidate = (data: CandidateIn) =>
  apiClient.post<Candidate>("/ats/candidates", data).then((r) => r.data);

export const updateCandidate = (id: number, data: CandidateIn) =>
  apiClient.put<Candidate>(`/ats/candidates/${id}`, data).then((r) => r.data);

/* Applications */
export const addApplication = (pipelineId: number, candidateId: number, expectedSalary?: string) =>
  apiClient.post<Application>(`/ats/pipelines/${pipelineId}/applications`, { candidate_id: candidateId, expected_salary: expectedSalary || null }).then((r) => r.data);

export const moveApplication = (appId: number, toStageId: number, note?: string) =>
  apiClient.post<Application>(`/ats/applications/${appId}/move`, { to_stage_id: toStageId, note: note || null }).then((r) => r.data);

export const listApplicationEvents = (appId: number) =>
  apiClient.get<ApplicationEvent[]>(`/ats/applications/${appId}/events`).then((r) => r.data);

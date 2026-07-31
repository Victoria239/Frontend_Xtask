/* Reviews 360° API (H-05) */
import apiClient from "./client";

export interface ReviewCycle {
  id: number;
  name: string;
  period: string;
  status: "open" | "in_progress" | "closed";
  deadline: string | null;
  created_at: string;
  closed_at: string | null;
  assignments_count: number;
  submitted_count: number;
}

export interface AssignmentSummary {
  id: number;
  cycle_id: number;
  cycle_name: string;
  cycle_period: string;
  target_employee_id: number;
  target_name: string;
  role: "self" | "manager" | "peer" | "report";
  status: string;
}

export interface ReviewQuestion {
  code: string;
  category: string;
  text: string;
}

export interface ReviewForm {
  assignment_id: number;
  cycle_id: number;
  role: string;
  status: string;
  target_employee_id: number;
  target_name: string;
  target_position: string | null;
  questions: ReviewQuestion[];
}

export interface SubmittedResponse {
  question_code: string;
  score: number;
  comment?: string;
}

export interface ReviewSummary {
  cycle_id: number;
  cycle_name: string;
  cycle_period: string;
  employee_id: number;
  employee_name: string;
  overall_score: number;
  by_category: Record<string, number>;
  by_role: Record<string, number>;
  responses_count: number;
}

export const listCycles = async (): Promise<ReviewCycle[]> => (await apiClient.get("/reviews/cycles")).data;
export const createCycle = async (p: { name: string; period: string; deadline?: string | null }): Promise<ReviewCycle> =>
  (await apiClient.post("/reviews/cycles", p)).data;
export const assignCycle = async (id: number) => (await apiClient.post(`/reviews/cycles/${id}/assign`)).data;
export const closeCycle = async (id: number) => (await apiClient.post(`/reviews/cycles/${id}/close`)).data;

export const myPending = async (): Promise<AssignmentSummary[]> =>
  (await apiClient.get("/reviews/my-pending")).data;
export const getForm = async (id: number): Promise<ReviewForm> =>
  (await apiClient.get(`/reviews/assignments/${id}/form`)).data;
export const submit = async (id: number, responses: SubmittedResponse[]) =>
  (await apiClient.post(`/reviews/assignments/${id}/submit`, { responses })).data;

export const mySummary = async (): Promise<ReviewSummary[]> =>
  (await apiClient.get("/reviews/my-summary")).data;

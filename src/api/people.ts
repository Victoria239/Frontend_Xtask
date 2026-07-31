/* People Analytics API (H-07) */
import apiClient from "./client";

export interface NineBoxCell {
  perf_tier: number;        // 0 bajo, 1 medio, 2 alto
  retention_tier: number;   // 0 baja retención (alto riesgo), 2 alta
  label: string;
  count: number;
  employees: { employee_id: number; name: string; department: string; performance: number; attrition_score: number }[];
}

export interface SpanOfControl {
  manager_id: number;
  manager_name: string;
  direct_reports: number;
  reports: string[];
}

export interface SegmentRisk {
  department: string;
  seniority: string;
  headcount: number;
  avg_risk: number;
  max_risk: number;
}

export interface DiversityRow {
  department: string;
  headcount: number;
  avg_salary: number;
  salary_spread: number;
  seniority_mix: Record<string, number>;
}

export interface PeopleOverview {
  total_employees: number;
  avg_tenure_months: number;
  avg_performance: number;
  managers_count: number;
  tenure_distribution: { bucket: string; count: number }[];
  span_of_control: SpanOfControl[];
  nine_box: NineBoxCell[];
  segment_risk: SegmentRisk[];
  diversity: DiversityRow[];
  band_saturation: { below_p25: number; p25_p50: number; p50_p75: number; above_p75: number };
}

export const getPeopleOverview = async (): Promise<PeopleOverview> =>
  (await apiClient.get("/predictions/people/overview")).data;

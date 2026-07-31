/* Compensation Analytics API (C-06) */
import apiClient from "./client";

export interface CompBand {
  department: string;
  seniority: string;
  headcount: number;
  p25: number;
  p50: number;
  p75: number;
  min: number;
  max: number;
}

export interface CompOutlier {
  employee_id: number;
  name: string;
  department: string;
  position: string;
  seniority: string;
  salary: number;
  band_p50: number;
  compa_ratio: number;
  flag: "below" | "above";
  delta_eur: number;
  reason: string;
}

export interface DepartmentSpend {
  department: string;
  headcount: number;
  total_payroll: number;
  avg_salary: number;
  share_pct: number;
}

export interface TopEarner {
  employee_id: number;
  name: string;
  department: string;
  position: string;
  salary: number;
}

export interface TenurePoint {
  employee_id: number;
  name: string;
  department: string;
  tenure_months: number;
  salary: number;
}

export interface CompOverview {
  total_employees: number;
  total_payroll_annual: number;
  avg_salary: number;
  median_salary: number;
  gap_factor: number;
  compa_ratio_avg: number;
  departments: DepartmentSpend[];
  bands: CompBand[];
  outliers: CompOutlier[];
  top_earners: TopEarner[];
  tenure_vs_salary: TenurePoint[];
}

export const getCompOverview = async (): Promise<CompOverview> =>
  (await apiClient.get("/predictions/comp/overview")).data;

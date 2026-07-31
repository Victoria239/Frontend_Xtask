/* Attrition risk API — AI-06 */
import apiClient from "./client";

export interface AttritionFactor {
  code: string;
  label: string;
  level: number;
  weight: number;
  contribution: number;
  rationale: string;
}

export interface AttritionResult {
  employee_id: number;
  employee_name: string;
  department: string | null;
  position: string | null;
  risk_score: number;
  risk_band: "low" | "medium" | "high";
  factors: AttritionFactor[];
  top_drivers: string[];
}

export interface AttritionList {
  generated_at: string;
  total_employees: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  by_department: Record<string, number>;
  employees: AttritionResult[];
}

export async function listAttrition(): Promise<AttritionList> {
  const { data } = await apiClient.get("/predictions/attrition/all");
  return data;
}

export async function getEmployeeAttrition(id: number): Promise<AttritionResult> {
  const { data } = await apiClient.get(`/predictions/attrition/employee/${id}`);
  return data;
}

/* Predictions API (AI-04) — forecast de KPIs */

import apiClient from "./client";

export interface ForecastPoint {
  t: string;
  value: number;
  ic_low: number;
  ic_high: number;
}

export interface ForecastResponse {
  kpi_id: number;
  kpi_name: string;
  horizon: number;
  freq_days: number;
  method: "linear" | "holt" | "naive";
  r2: number | null;
  last_observed_at: string | null;
  last_observed_value: number | null;
  target: number | null;
  forecast: ForecastPoint[];
  history: ForecastPoint[];
}

export const forecastKpi = (kpiId: number, opts?: { horizon?: number; freq_days?: number; method?: "linear" | "holt" | "naive" }) =>
  apiClient.get<ForecastResponse>(`/predictions/kpi/${kpiId}/forecast`, { params: opts }).then((r) => r.data);

/* AI-05 Recomendación beneficios */
export interface BenefitRecommendation {
  benefit_code: string;
  benefit_name: string;
  category: string;
  monthly_cost_eur: number;
  score: number;
  rationale: string;
}

export interface RecommendResponse {
  employee_id: number;
  employee_name: string;
  tenure_months: number;
  performance_score: number;
  budget_eur: number;
  recommendations: BenefitRecommendation[];
}

export interface BenefitCatalogItem {
  code: string;
  name: string;
  category: string;
  monthly_cost_eur: number;
  description: string;
  min_tenure_months: number;
  min_performance: number;
}

export const recommendBenefits = (employeeId: number, budgetEur: number = 200, topN: number = 5) =>
  apiClient.get<RecommendResponse>(`/predictions/benefits/employee/${employeeId}`, { params: { budget_eur: budgetEur, top_n: topN } }).then((r) => r.data);

export const benefitsCatalog = () =>
  apiClient.get<BenefitCatalogItem[]>(`/predictions/benefits/catalog`).then((r) => r.data);

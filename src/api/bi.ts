/* BI Executive Overview (E-05 + E-06) */
import apiClient from "./client";

export interface HiringPoint {
  month: string;
  headcount: number;
  new_hires: number;
}

export interface AttritionRiskPerson {
  employee_id: number;
  name: string;
  score: number;
  department: string | null;
}

export interface BIOverview {
  generated_at: string;
  north_star: {
    arr_eur: number;
    headcount: number;
    active_clients: number;
    okr_avg_progress: number;
  };
  financial: {
    arr_eur: number;
    payroll_annual_eur: number;
    avg_salary_eur: number;
    pnl_annual_eur: number;
    runway_implied_months: number;
  };
  people: {
    headcount_total: number;
    headcount_by_department: { department: string; n: number }[];
    hiring_trend: HiringPoint[];
    pending_leave_approvals: number;
    attrition: {
      high: number;
      medium: number;
      low: number;
      top_risks: AttritionRiskPerson[];
    };
  };
  performance: {
    okrs: { avg_progress: number; total: number; completed: number };
  };
  revenue: {
    top_clients: { name: string; annual_eur: number }[];
  };
}

export async function getOverview(): Promise<BIOverview> {
  const { data } = await apiClient.get("/dashboard/bi/overview");
  return data;
}

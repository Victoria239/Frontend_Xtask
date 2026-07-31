/* Self-service portal API (H-06) */
import apiClient from "./client";

export interface MyProfile {
  employee_id: number;
  name: string;
  position: string | null;
  department: string | null;
  hire_date: string | null;
  manager: string | null;
  manager_id: number | null;
}

export interface MyContract {
  id: number;
  title: string;
  contract_type: string;
  status: string;
  starts_on: string | null;
  expires_on: string | null;
  signed_on: string | null;
}

export interface LeaveBalance {
  type_code: string;
  type_name: string;
  color: string | null;
  annual_days: number;
  used_days: number;
  remaining_days: number;
}

export interface MyLeave {
  id: number;
  start_date: string;
  end_date: string;
  business_days: number;
  status: string;
  type_name: string | null;
  color: string | null;
}

export interface MyReviewPending {
  id: number;
  cycle_name: string;
  period: string;
  deadline: string | null;
  role: string;
  target_employee_id: number;
  target_name: string;
}

export interface MyOKR {
  id: number;
  objective: string;
  scope: string;
  period: string;
  progress: number;
  status: string;
}

export interface BenefitRec {
  code: string;
  name: string;
  category: string;
  score: number;
  rationale: string;
}

export interface MyPortal {
  profile: MyProfile;
  reports: { id: number; first_name: string; last_name: string; position: string | null }[];
  contracts: MyContract[];
  leaves: {
    balance: { year: number; by_type: LeaveBalance[] };
    recent: MyLeave[];
  };
  reviews_pending: MyReviewPending[];
  okrs: MyOKR[];
  benefits_recommended: BenefitRec[];
  error?: string;
}

export const getMyPortal = async (): Promise<MyPortal> =>
  (await apiClient.get("/dashboard/me/portal")).data;

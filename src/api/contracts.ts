/* Contracts API (E-02) — state machine + bridge desde DocGen. */

import apiClient from "./client";

export type ContractStatus = "draft" | "review" | "signed" | "expired" | "cancelled";

export interface ContractSummary {
  id: number;
  employee_id: number;
  counterparty: string | null;
  title: string;
  contract_type: string;
  status: ContractStatus;
  expires_on: string | null;
  days_to_expiry: number | null;
  source: "manual" | "docgen";
  created_at: string;
}

export interface SourceDocument {
  document_id: number;
  document_title: string;
  snippet: string;
  score: number;
}

export interface Contract {
  id: number;
  tenant_id: number;
  employee_id: number;
  counterparty: string | null;
  title: string;
  contract_type: string;
  status: ContractStatus;
  body_md: string | null;
  body_html: string | null;
  source: "manual" | "docgen";
  generated_doc_id: number | null;
  starts_on: string | null;
  expires_on: string | null;
  signed_on: string | null;
  meta: Record<string, unknown> | null;
  source_documents: SourceDocument[];
  days_to_expiry: number | null;
  created_at: string;
  updated_at: string;
}

export interface ContractIn {
  employee_id: number;
  counterparty?: string | null;
  title: string;
  contract_type?: string;
  body_md?: string | null;
  starts_on?: string | null;
  expires_on?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface ContractUpdate {
  counterparty?: string | null;
  title?: string;
  contract_type?: string;
  body_md?: string | null;
  starts_on?: string | null;
  expires_on?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface ContractEvent {
  id: number;
  kind: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  actor_user_id: number | null;
  created_at: string;
}

export interface StatusTransition {
  to_status: ContractStatus;
  note?: string | null;
  signed_on?: string | null;
}

export interface ContractFromDocgen {
  generated_doc_id: number;
  employee_id: number;
  contract_type?: string;
  counterparty?: string | null;
  starts_on?: string | null;
  expires_on?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface GenerateContractRequest {
  template_id: number;
  employee_id: number;
  contract_type?: string;
  counterparty?: string | null;
  starts_on?: string | null;
  expires_on?: string | null;
  custom_context?: Record<string, unknown>;
  title_override?: string | null;
}

export const listContracts = (params?: { status?: ContractStatus; employee_id?: number }) =>
  apiClient.get<ContractSummary[]>("/contracts/", { params }).then((r) => r.data);

export const getContract = (id: number) =>
  apiClient.get<Contract>(`/contracts/${id}`).then((r) => r.data);

export const listEvents = (id: number) =>
  apiClient.get<ContractEvent[]>(`/contracts/${id}/events`).then((r) => r.data);

export const createContract = (data: ContractIn) =>
  apiClient.post<Contract>("/contracts/", data).then((r) => r.data);

export const createFromDocgen = (data: ContractFromDocgen) =>
  apiClient.post<Contract>("/contracts/from-docgen", data).then((r) => r.data);

export const updateContract = (id: number, data: ContractUpdate) =>
  apiClient.put<Contract>(`/contracts/${id}`, data).then((r) => r.data);

export const deleteContract = (id: number) =>
  apiClient.delete(`/contracts/${id}`);

export const transition = (id: number, data: StatusTransition) =>
  apiClient.post<Contract>(`/contracts/${id}/transition`, data).then((r) => r.data);

export const generateContract = (data: GenerateContractRequest) =>
  apiClient.post<Contract>("/contracts/generate", data).then((r) => r.data);

/* E-04 eSign */
export interface ESignResult {
  envelope_id: string;
  signing_url: string;
  provider: string;
  status: string;
}

export const getEsignMode = () =>
  apiClient.get<{ mode: "docusign" | "mock" }>("/contracts/esign/mode").then((r) => r.data);

export const sendForSigning = (contractId: number, signerEmail: string, signerName: string, returnUrl?: string) =>
  apiClient.post<ESignResult>(`/contracts/${contractId}/esign/send`, {
    signer_email: signerEmail, signer_name: signerName, return_url: returnUrl || null,
  }).then((r) => r.data);

export const mockSignConfirm = (contractId: number, envelopeId: string, signatureDataUrl?: string) =>
  apiClient.post<Contract>(`/contracts/${contractId}/esign/mock-confirm`, {
    envelope_id: envelopeId, signature_data_url: signatureDataUrl || null,
  }).then((r) => r.data);

/* Trigger del scan de alertas — admin. Tenant inferido del JWT. */
export const scanExpiry = () =>
  apiClient.post<{ scanned: number; contracts_alerted: number; notifications_sent: number }>(
    "/contracts/scan-expiry",
  ).then((r) => r.data);

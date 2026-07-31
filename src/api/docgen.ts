/* DocGen API (AI-03) — generación documental con plantillas Jinja2 + RAG. */

import apiClient from "./client";

export interface DocTemplate {
  id: number;
  tenant_id: number;
  name: string;
  description: string | null;
  category: string;
  body: string;
  rag_query: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateIn {
  name: string;
  description?: string | null;
  category?: string;
  body: string;
  rag_query?: string | null;
}

export interface GenCitation {
  document_id: number;
  document_title: string;
  snippet: string;
  score: number;
}

export interface GeneratedDoc {
  id: number;
  tenant_id: number;
  template_id: number | null;
  template_name: string;
  employee_id: number;
  title: string;
  body_md: string;
  body_html: string;
  citations: GenCitation[];
  custom_context: Record<string, unknown>;
  created_by: number | null;
  created_at: string;
}

export interface GeneratedDocSummary {
  id: number;
  template_id: number | null;
  template_name: string;
  employee_id: number;
  title: string;
  citation_count: number;
  created_at: string;
}

/* Templates */
export const listTemplates = () =>
  apiClient.get<DocTemplate[]>("/docgen/templates").then((r) => r.data);

export const createTemplate = (data: TemplateIn) =>
  apiClient.post<DocTemplate>("/docgen/templates", data).then((r) => r.data);

export const updateTemplate = (id: number, data: TemplateIn) =>
  apiClient.put<DocTemplate>(`/docgen/templates/${id}`, data).then((r) => r.data);

export const deleteTemplate = (id: number) =>
  apiClient.delete(`/docgen/templates/${id}`);

/* Generation */
export const generate = (template_id: number, employee_id: number, custom_context: Record<string, unknown> = {}, title?: string) =>
  apiClient.post<GeneratedDoc>("/docgen/generate", { template_id, employee_id, custom_context, title }).then((r) => r.data);

export const listDocuments = (employee_id?: number) =>
  apiClient.get<GeneratedDocSummary[]>("/docgen/documents", { params: employee_id ? { employee_id } : undefined }).then((r) => r.data);

export const getDocument = (id: number) =>
  apiClient.get<GeneratedDoc>(`/docgen/documents/${id}`).then((r) => r.data);

export const deleteDocument = (id: number) =>
  apiClient.delete(`/docgen/documents/${id}`);

/* E-03: seed de plantillas pre-configuradas (requiere rol admin) */
export const seedContractTemplates = () =>
  apiClient.post<{ created: number; updated: number; kept: number }>(
    `/docgen/seed-contract-templates`,
  ).then((r) => r.data);

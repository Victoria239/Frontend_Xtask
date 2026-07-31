/* RAG API · Corpus documental + búsqueda
 * Backend: services/rag (AI-01 + AI-02)
 */

import apiClient from "./client";

export interface RagDocument {
  id: number;
  tenant_id: number;
  title: string;
  source_type: string;
  source_uri: string | null;
  mime_type: string | null;
  language: string;
  status: string;             // "pending" | "embedded" | "failed"
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface IngestResponse {
  document_id: number;
  chunks: number;
  embedded: number;
  status: string;
  provider: string | null;
}

export interface SearchHit {
  document_id: number;
  document_title: string;
  position: number;
  content: string;
  score: number;
  meta: Record<string, unknown>;
  source_type?: string;
  source_uri?: string | null;
}

export interface SearchResponse {
  query: string;
  hits: SearchHit[];
}

/* Listar documentos del corpus del tenant */
export const list = () =>
  apiClient.get<RagDocument[]>("/rag/documents").then((r) => r.data);

/* Obtener un documento por id */
export const get = (id: number) =>
  apiClient.get<RagDocument>(`/rag/documents/${id}`).then((r) => r.data);

/* Eliminar (requiere rol manager+) */
export const remove = (id: number) =>
  apiClient.delete(`/rag/documents/${id}`);

/* Ingresar texto crudo (requiere rol manager+) */
export const ingestText = (data: {
  title: string;
  content: string;
  source_type?: string;
  source_uri?: string;
  mime_type?: string;
  language?: string;
  meta?: Record<string, unknown>;
}) =>
  apiClient
    .post<IngestResponse>("/rag/ingest/text", { source_type: "raw", language: "es", meta: {}, ...data })
    .then((r) => r.data);

/* Ingresar archivo (multipart, requiere rol manager+) */
export const ingestFile = (file: File, opts?: { title?: string; language?: string }) => {
  const form = new FormData();
  form.append("file", file);
  if (opts?.title) form.append("title", opts.title);
  form.append("language", opts?.language || "es");
  return apiClient
    .post<IngestResponse>("/rag/ingest/file", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

/* Búsqueda semántica */
export const search = (query: string, top_k = 5) =>
  apiClient
    .post<SearchResponse>("/rag/search", { query, top_k })
    .then((r) => r.data);

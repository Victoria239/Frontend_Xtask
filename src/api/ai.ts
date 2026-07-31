/* AI Assistant API · copiloto conversacional con RAG (AI-08)
 * Backend: services/ai_assistant
 */

import apiClient from "./client";

export interface Citation {
  document_id: number;
  document_title: string;
  position: number;
  score: number;
  snippet: string;
  source_type?: string;
  source_uri?: string | null;
}

export interface ChatRequest {
  conversation_id?: number;
  message: string;
  top_k?: number;
}

export interface ChatResponse {
  conversation_id: number;
  answer: string;
  citations: Citation[];
  provider: string;
  used_rag: boolean;
}

export interface Conversation {
  id: number;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  role: "user" | "assistant" | string;
  content: string;
  citations: Citation[] | unknown[];
  created_at: string;
}

export const chat = (req: ChatRequest) =>
  apiClient.post<ChatResponse>("/ai/chat", { top_k: 4, ...req }).then((r) => r.data);

export const listConversations = () =>
  apiClient.get<Conversation[]>("/ai/conversations").then((r) => r.data);

export const listMessages = (conversation_id: number) =>
  apiClient.get<Message[]>(`/ai/conversations/${conversation_id}/messages`).then((r) => r.data);

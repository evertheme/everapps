export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentHints {
  char_count: number;
  section_count: number;
  is_large: boolean;
  estimated_chunks: number;
  format_warnings: string[];
  processing_note: string | null;
}

export interface Document {
  id: string;
  project_id: string;
  filename: string;
  file_type: string;
  current_version: number;
  latest_content?: string | null;
  hints?: DocumentHints | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  content: string;
  file_path: string | null;
  created_at: string;
}

export interface Story {
  id: string;
  project_id: string;
  document_id: string | null;
  title: string;
  description: string;
  acceptance_criteria: string | null;
  priority: "critical" | "high" | "medium" | "low";
  story_points: number | null;
  status: "draft" | "reviewed" | "approved" | "exported";
  current_version: number;
  created_at: string;
  updated_at: string;
}

export interface StoryVersion {
  id: string;
  story_id: string;
  version_number: number;
  content: Record<string, unknown>;
  created_at: string;
}

export interface ReviewFeedbackItem {
  score: number;
  comment: string;
}

export interface StoryReview {
  id: string;
  story_id: string;
  overall_status: "clear" | "ambiguous" | "incomplete";
  feedback: Record<string, ReviewFeedbackItem>;
  suggestions: string | null;
  created_at: string;
}

export interface LLMSettings {
  id: string;
  user_id: string;
  provider: string;
  model: string;
  base_url: string | null;
  azure_deployment: string | null;
  has_api_key: boolean;
  updated_at: string;
}

export interface PMIntegration {
  id: string;
  project_id: string;
  provider: string;
  name: string;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ExportResult {
  story_id: string;
  success: boolean;
  external_id: string | null;
  external_url: string | null;
  error: string | null;
}

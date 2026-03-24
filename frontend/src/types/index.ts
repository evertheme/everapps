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

// ── Requirements Document Assistant ──────────────────────────────────────────

export type GapStatus = "missing" | "thin" | "present";
export type RequiredLevel = "required" | "recommended" | "optional";
export type SectionApprovalStatus = "pending" | "in_progress" | "complete" | "skipped";

export interface SectionTemplate {
  section_type: string;
  display_name: string;
  standard_source: string;
  required_level: RequiredLevel;
  order: number;
  content_standard: string;
  prompt_questions: string[];
}

export interface SectionStatus {
  section_type: string;
  display_name: string;
  required_level: RequiredLevel;
  gap_status: GapStatus;
  completeness_score: number;
  ai_feedback: string | null;
  content: string;
  /** Server-side approval status: pending | in_progress | complete | skipped */
  status: SectionApprovalStatus;
}

export interface GapAnalysisReport {
  session_id: string;
  document_id: string;
  overall_score: number;
  status: string;
  sections: SectionStatus[];
  created_at: string;
  /** True when document_header and executive_summary are both approved */
  can_save: boolean;
}

export interface SectionFillResponse {
  section_type: string;
  content: string;
  ai_feedback: string | null;
}

export interface SaveDocumentResponse {
  document_id: string;
  version_number: number;
  message: string;
}

// ── Requirements Wizard ───────────────────────────────────────────────────────

export type CurrentStateType =
  | "new_product"
  | "launch_mvp"
  | "enhance_existing"
  | "replace_legacy"
  | "other";

export type FeaturePriority = "must_have" | "nice_to_have" | "future";

export const FEATURE_PRIORITY_OPTIONS: { value: FeaturePriority; label: string }[] = [
  { value: "must_have",    label: "Must Have" },
  { value: "nice_to_have", label: "Nice to Have" },
  { value: "future",       label: "Future Feature" },
];

export interface WizardFeature {
  description: string;
  priority: FeaturePriority;
}

export const CURRENT_STATE_OPTIONS: { value: CurrentStateType; label: string }[] = [
  { value: "new_product",       label: "New Product (no current state)" },
  { value: "launch_mvp",        label: "Launch MVP" },
  { value: "enhance_existing",  label: "Enhance Existing Product" },
  { value: "replace_legacy",    label: "Replace Legacy System" },
  { value: "other",             label: "Other" },
];

export type DeployTarget =
  | "web"
  | "ios"
  | "android"
  | "desktop"
  | "api_service"
  | "other";

export const DEPLOY_TARGET_OPTIONS: { value: DeployTarget; label: string; hint: string }[] = [
  { value: "web",         label: "Web",           hint: "Browser-based app" },
  { value: "ios",         label: "iOS",           hint: "Native iPhone / iPad" },
  { value: "android",     label: "Android",       hint: "Native Android device" },
  { value: "desktop",     label: "Desktop",       hint: "Windows / macOS / Linux app" },
  { value: "api_service", label: "API / Service", hint: "Backend service or integration" },
  { value: "other",       label: "Other",         hint: "" },
];

export interface WizardSuggestions {
  business_problem: string;
  business_objectives: string[];
  current_state_notes: string;
  desired_state_notes: string;
}

export interface WizardFeatureSuggestions {
  features: WizardFeature[];
}

export interface WizardGenerateResponse {
  document_id: string;
  message: string;
}

export interface WizardPrefillData {
  product_name: string;
  description: string;
  executive_summary: string;
  business_problem: string;
  business_objectives: string[];
  current_state_type: CurrentStateType;
  current_state_notes: string;
  desired_state_notes: string;
  features: WizardFeature[];
  deploy_targets: DeployTarget[];
}

export interface WizardUpdateResponse {
  document_id: string;
  version_number: number;
  message: string;
}

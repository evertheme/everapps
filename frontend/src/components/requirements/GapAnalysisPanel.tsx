"use client";

import { useState, useCallback } from "react";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Info,
  Sparkles,
  Loader2,
  Check,
  Save,
} from "lucide-react";
import type { GapAnalysisReport, SectionStatus, GapStatus } from "@/types";

export interface GapAnalysisPanelProps {
  report: GapAnalysisReport;
  /** Called when the user clicks "Fill with AI". Must return the drafted content. */
  onFill: (sectionType: string) => Promise<string>;
  /** Called when the user approves a section with the (edited) content. */
  onApprove: (sectionType: string, content: string) => Promise<void>;
  /** Called when the user clicks "Save Document". */
  onSaveDocument: () => Promise<{ document_id: string; version_number: number }>;
}

const GAP_CONFIG: Record<
  GapStatus,
  { label: string; icon: React.ReactNode; badgeClass: string; rowClass: string }
> = {
  present: {
    label: "Present",
    icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    badgeClass: "text-green-700 bg-green-50 border-green-200",
    rowClass: "border-l-4 border-l-green-400",
  },
  thin: {
    label: "Thin",
    icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
    badgeClass: "text-amber-700 bg-amber-50 border-amber-200",
    rowClass: "border-l-4 border-l-amber-400",
  },
  missing: {
    label: "Missing",
    icon: <XCircle className="w-4 h-4 text-red-400" />,
    badgeClass: "text-red-700 bg-red-50 border-red-200",
    rowClass: "border-l-4 border-l-red-400",
  },
};

const REQUIRED_LEVEL_LABELS: Record<string, string> = {
  required: "Required",
  recommended: "Recommended",
  optional: "Optional",
};

function ScoreBar({ score }: { score: number }) {
  const colour =
    score >= 80
      ? "bg-green-500"
      : score >= 40
      ? "bg-amber-500"
      : score > 0
      ? "bg-red-400"
      : "bg-gray-200";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colour}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{score}%</span>
    </div>
  );
}

function SectionRow({
  section,

  isApproved,
  isClientApproved,
  isSelected,
  onSelect,
}: {
  section: SectionStatus;
  isApproved: boolean;
  isClientApproved: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const effectiveGapStatus: GapStatus = isApproved ? "present" : section.gap_status;
  const config = GAP_CONFIG[effectiveGapStatus];
  // Client-approved sections show 75; server-pre-approved sections keep their original score
  const displayScore = isClientApproved ? 75 : section.completeness_score;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
        isSelected ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-gray-50"
      } ${config.rowClass}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          {config.icon}
          <span
            className={`text-sm font-medium truncate ${
              isSelected ? "text-brand-700" : "text-gray-800"
            }`}
          >
            {section.display_name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`text-xs font-medium border px-1.5 py-0.5 rounded-full ${config.badgeClass}`}
          >
            {config.label}
          </span>
          {isSelected ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>
      </div>
      <ScoreBar score={displayScore} />
    </button>
  );
}

function SectionDetail({
  section,
  content,
  isApproved,
  isClientApproved,
  isFilling,
  onContentChange,
  onFill,
  onApprove,
}: {
  section: SectionStatus;
  content: string;
  isApproved: boolean;
  isClientApproved: boolean;
  isFilling: boolean;
  onContentChange: (v: string) => void;
  onFill: () => void;
  onApprove: () => void;
}) {
  const effectiveGapStatus: GapStatus = isApproved ? "present" : section.gap_status;
  const config = GAP_CONFIG[effectiveGapStatus];
  const displayScore = isClientApproved ? 75 : section.completeness_score;
  // Show fill button for missing/thin sections not yet client-approved
  const canFill = !isClientApproved && (section.gap_status === "missing" || section.gap_status === "thin");
  // Show approve button when there's content, not yet client-approved (server-approved sections
  // with a present gap_status can still be manually re-approved if the user edits them)
  const canApprove = !isClientApproved && content.trim().length > 0 && section.gap_status !== "present";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {section.display_name}
          </h3>
          <span className="text-xs text-gray-400">
            {REQUIRED_LEVEL_LABELS[section.required_level]}
          </span>
        </div>
        <span
          className={`text-sm font-medium border px-2 py-1 rounded-full ${config.badgeClass} shrink-0`}
        >
          {config.label} — {displayScore}%
        </span>
      </div>

      {/* AI feedback note */}
      {section.ai_feedback && !isApproved && (
        <div className="flex gap-2.5 rounded-lg bg-gray-50 border border-gray-200 p-3">
          <Info className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-700">{section.ai_feedback}</p>
        </div>
      )}

      {/* Approved banner — only shown after explicit client-side approval */}
      {isClientApproved && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-700 font-medium">
            Section approved and included in the saved document.
          </p>
        </div>
      )}

      {/* Content area */}
      {isClientApproved ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Approved content
          </p>
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 max-h-72 overflow-y-auto">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {content}
            </p>
          </div>
        </div>
      ) : content.trim() ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            {section.gap_status === "missing" || section.gap_status === "thin"
              ? "Edit content"
              : "Extracted content"}
          </p>
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-brand-300"
            aria-label={`Edit content for ${section.display_name}`}
          />
        </div>
      ) : (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">
            No content was found for this section.
            {section.required_level === "required" &&
              " This is a required section — fill it in to complete your document."}
          </p>
        </div>
      )}

      {/* Action bar */}
      {!isApproved && (
        <div className="flex items-center gap-2 pt-1">
          {canFill && (
            <button
              onClick={onFill}
              disabled={isFilling}
              className="btn-secondary text-xs flex items-center gap-1.5"
              aria-label={`Fill ${section.display_name} with AI`}
            >
              {isFilling ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Drafting…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Fill with AI
                </>
              )}
            </button>
          )}
          {canApprove && (
            <button
              onClick={onApprove}
              className="btn-primary text-xs flex items-center gap-1.5"
              aria-label={`Approve ${section.display_name}`}
            >
              <Check className="w-3.5 h-3.5" />
              Approve
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function OverallScoreRing({ score }: { score: number }) {
  const size = 88;
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const colour = score >= 80 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#e5e7eb" strokeWidth={8}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={colour} strokeWidth={8}
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round"
        />
        <text
          x="50%" y="50%"
          dominantBaseline="middle" textAnchor="middle"
          style={{
            fill: colour, fontSize: "16px", fontWeight: 800,
            transform: "rotate(90deg)", transformOrigin: "center",
          }}
        >
          {score}%
        </text>
      </svg>
      <span className="text-xs text-gray-500 font-medium">Overall</span>
    </div>
  );
}

export function GapAnalysisPanel({
  report,
  onFill,
  onApprove,
  onSaveDocument,
}: GapAnalysisPanelProps) {
  const [selectedType, setSelectedType] = useState<string>(
    report.sections[0]?.section_type ?? ""
  );

  // Per-section textarea content — initialised from server data
  const [draftContent, setDraftContent] = useState<Record<string, string>>(
    () => Object.fromEntries(report.sections.map((s) => [s.section_type, s.content]))
  );

  // Sections that were already complete when the report loaded (Phase 1 "present")
  const serverApprovedSet = new Set(
    report.sections.filter((s) => s.status === "complete").map((s) => s.section_type)
  );

  // Sections the customer explicitly approved in this browser session
  const [clientApprovedSections, setClientApprovedSections] = useState<Set<string>>(
    () => new Set<string>()
  );

  const approvedSections = new Set([...serverApprovedSet, ...clientApprovedSections]);

  const [fillingSection, setFillingSection] = useState<string | null>(null);
  const [savingDoc, setSavingDoc] = useState(false);

  const canSave =
    approvedSections.has("document_header") &&
    approvedSections.has("executive_summary");

  const handleFill = useCallback(
    async (sectionType: string) => {
      setFillingSection(sectionType);
      try {
        const drafted = await onFill(sectionType);
        setDraftContent((prev) => ({ ...prev, [sectionType]: drafted }));
      } finally {
        setFillingSection(null);
      }
    },
    [onFill]
  );

  const handleApprove = useCallback(
    async (sectionType: string) => {
      const content = draftContent[sectionType] ?? "";
      await onApprove(sectionType, content);
      setClientApprovedSections((prev) => new Set([...prev, sectionType]));
    },
    [draftContent, onApprove]
  );

  const handleSaveDocument = useCallback(async () => {
    setSavingDoc(true);
    try {
      await onSaveDocument();
    } finally {
      setSavingDoc(false);
    }
  }, [onSaveDocument]);

  const selectedSection = report.sections.find(
    (s) => s.section_type === selectedType
  );

  const stats = {
    present: report.sections.filter(
      (s) => approvedSections.has(s.section_type) || s.gap_status === "present"
    ).length,
    thin: report.sections.filter(
      (s) => !approvedSections.has(s.section_type) && s.gap_status === "thin"
    ).length,
    missing: report.sections.filter(
      (s) => !approvedSections.has(s.section_type) && s.gap_status === "missing"
    ).length,
  };

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="card p-4 flex items-center gap-6 flex-wrap">
        <OverallScoreRing score={report.overall_score} />

        <div className="flex-1 min-w-0 space-y-1">
          <h2 className="text-base font-semibold text-gray-900">
            Gap Analysis Report
          </h2>
          <p className="text-sm text-gray-500">
            {report.sections.length} sections analysed
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm shrink-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="font-medium text-gray-700">{stats.present}</span>
            <span className="text-gray-400">present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className="font-medium text-gray-700">{stats.thin}</span>
            <span className="text-gray-400">thin</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="font-medium text-gray-700">{stats.missing}</span>
            <span className="text-gray-400">missing</span>
          </div>
        </div>

        {/* Save Document button */}
        <button
          onClick={handleSaveDocument}
          disabled={!canSave || savingDoc}
          aria-label="Save complete document"
          className={`btn-primary text-sm flex items-center gap-2 shrink-0 ${
            !canSave ? "opacity-40 cursor-not-allowed" : ""
          }`}
          title={
            !canSave
              ? "Approve Document Header and Executive Summary to unlock"
              : "Save approved sections as a new document version"
          }
        >
          {savingDoc ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {savingDoc ? "Saving…" : "Save Document"}
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: section checklist */}
        <div className="lg:col-span-2 card p-3 space-y-1 max-h-[600px] overflow-y-auto">
          {report.sections.map((section) => (
            <SectionRow
              key={section.section_type}
              section={section}
              isApproved={approvedSections.has(section.section_type)}
              isClientApproved={clientApprovedSections.has(section.section_type)}
              isSelected={selectedType === section.section_type}
              onSelect={() => setSelectedType(section.section_type)}
            />
          ))}
        </div>

        {/* Right: section detail */}
        <div className="lg:col-span-3 card p-5">
          {selectedSection ? (
            <SectionDetail
              section={selectedSection}
              content={draftContent[selectedSection.section_type] ?? ""}
              isApproved={approvedSections.has(selectedSection.section_type)}
              isClientApproved={clientApprovedSections.has(selectedSection.section_type)}
              isFilling={fillingSection === selectedSection.section_type}
              onContentChange={(v) =>
                setDraftContent((prev) => ({
                  ...prev,
                  [selectedSection.section_type]: v,
                }))
              }
              onFill={() => handleFill(selectedSection.section_type)}
              onApprove={() => handleApprove(selectedSection.section_type)}
            />
          ) : (
            <p className="text-sm text-gray-400">
              Select a section to view details.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

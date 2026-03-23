"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";
import type { GapAnalysisReport, SectionStatus, GapStatus } from "@/types";

interface GapAnalysisPanelProps {
  report: GapAnalysisReport;
}

const GAP_CONFIG: Record<
  GapStatus,
  { label: string; icon: React.ReactNode; badgeClass: string; rowClass: string }
> = {
  present: {
    label: "Present",
    icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    badgeClass:
      "text-green-700 bg-green-50 border-green-200",
    rowClass: "border-l-4 border-l-green-400",
  },
  thin: {
    label: "Thin",
    icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
    badgeClass:
      "text-amber-700 bg-amber-50 border-amber-200",
    rowClass: "border-l-4 border-l-amber-400",
  },
  missing: {
    label: "Missing",
    icon: <XCircle className="w-4 h-4 text-red-400" />,
    badgeClass:
      "text-red-700 bg-red-50 border-red-200",
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
  isSelected,
  onSelect,
}: {
  section: SectionStatus;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const config = GAP_CONFIG[section.gap_status];

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
        isSelected
          ? "bg-brand-50 ring-1 ring-brand-200"
          : "hover:bg-gray-50"
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
      <ScoreBar score={section.completeness_score} />
    </button>
  );
}

function SectionDetail({ section }: { section: SectionStatus }) {
  const config = GAP_CONFIG[section.gap_status];

  return (
    <div className="space-y-4">
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
          {config.label} — {section.completeness_score}%
        </span>
      </div>

      {section.ai_feedback && (
        <div className="flex gap-2.5 rounded-lg bg-gray-50 border border-gray-200 p-3">
          <Info className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-700">{section.ai_feedback}</p>
        </div>
      )}

      {section.content ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Extracted content
          </p>
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 max-h-72 overflow-y-auto">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {section.content}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">
            No content was found for this section in the uploaded document.
            {section.required_level === "required" &&
              " This is a required section — your requirements document needs this to be complete."}
          </p>
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

  const colour =
    score >= 80 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth={8}
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round"
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          style={{
            fill: colour,
            fontSize: "16px",
            fontWeight: 800,
            transform: "rotate(90deg)",
            transformOrigin: "center",
          }}
        >
          {score}%
        </text>
      </svg>
      <span className="text-xs text-gray-500 font-medium">Overall</span>
    </div>
  );
}

export function GapAnalysisPanel({ report }: GapAnalysisPanelProps) {
  const [selectedType, setSelectedType] = useState<string>(
    report.sections[0]?.section_type ?? ""
  );

  const selectedSection = report.sections.find(
    (s) => s.section_type === selectedType
  );

  const stats = {
    present: report.sections.filter((s) => s.gap_status === "present").length,
    thin: report.sections.filter((s) => s.gap_status === "thin").length,
    missing: report.sections.filter((s) => s.gap_status === "missing").length,
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
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: section checklist */}
        <div className="lg:col-span-2 card p-3 space-y-1 max-h-[600px] overflow-y-auto">
          {report.sections.map((section) => (
            <SectionRow
              key={section.section_type}
              section={section}
              isSelected={selectedType === section.section_type}
              onSelect={() => setSelectedType(section.section_type)}
            />
          ))}
        </div>

        {/* Right: section detail */}
        <div className="lg:col-span-3 card p-5">
          {selectedSection ? (
            <SectionDetail section={selectedSection} />
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

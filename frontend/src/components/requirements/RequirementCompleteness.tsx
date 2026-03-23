"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, AlertCircle, ChevronRight } from "lucide-react";
import type { GapAnalysisReport, SectionStatus } from "@/types";

interface RequirementCompletenessProps {
  report: GapAnalysisReport;
  projectId: string;
  /** When true renders a compact inline variant (for project page sidebar) */
  compact?: boolean;
}

function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;

  const colour =
    score >= 80
      ? "#16a34a" // green-600
      : score >= 50
      ? "#d97706" // amber-600
      : "#dc2626"; // red-600

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={6}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={colour}
        strokeWidth={6}
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeLinecap="round"
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="rotate-90"
        style={{
          fill: colour,
          fontSize: size < 56 ? "10px" : "14px",
          fontWeight: 700,
          transform: `rotate(90deg)`,
          transformOrigin: "center",
        }}
      >
        {score}%
      </text>
    </svg>
  );
}

function sectionIcon(status: SectionStatus) {
  if (status.gap_status === "present") {
    return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />;
  }
  if (status.gap_status === "thin") {
    return <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />;
  }
  return <Circle className="w-4 h-4 text-red-400 shrink-0" />;
}

function gapBadge(gap: SectionStatus["gap_status"]) {
  if (gap === "present")
    return (
      <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
        Present
      </span>
    );
  if (gap === "thin")
    return (
      <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
        Thin
      </span>
    );
  return (
    <span className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
      Missing
    </span>
  );
}

export function RequirementCompleteness({
  report,
  projectId,
  compact = false,
}: RequirementCompletenessProps) {
  const router = useRouter();
  const requiredSections = report.sections.filter(
    (s) => s.required_level === "required"
  );
  const incompleteRequired = requiredSections.filter(
    (s) => s.gap_status !== "present"
  );

  if (compact) {
    return (
      <button
        onClick={() => router.push(`/projects/${projectId}/requirements`)}
        className="card p-4 flex items-center gap-4 w-full text-left hover:shadow-md transition-shadow"
      >
        <ScoreRing score={report.overall_score} size={52} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            Requirements Coverage
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {incompleteRequired.length === 0
              ? "All required sections complete"
              : `${incompleteRequired.length} required section${incompleteRequired.length !== 1 ? "s" : ""} incomplete`}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
      </button>
    );
  }

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center gap-5">
        <ScoreRing score={report.overall_score} size={72} />
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Document Completeness
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {incompleteRequired.length === 0
              ? "All required sections are complete — ready for story generation."
              : `${incompleteRequired.length} required section${
                  incompleteRequired.length !== 1 ? "s" : ""
                } still need attention.`}
          </p>
          <button
            onClick={() =>
              router.push(`/projects/${projectId}/requirements`)
            }
            className="mt-2 text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            View full analysis →
          </button>
        </div>
      </div>

      {incompleteRequired.length > 0 && (
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Required sections to complete
          </p>
          {incompleteRequired.map((s) => (
            <div
              key={s.section_type}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                {sectionIcon(s)}
                <span className="text-sm text-gray-700 truncate">
                  {s.display_name}
                </span>
              </div>
              {gapBadge(s.gap_status)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

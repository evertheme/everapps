import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RequirementCompleteness } from "@/components/requirements/RequirementCompleteness";
import type { GapAnalysisReport } from "@/types";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const ALL_SECTIONS: GapAnalysisReport["sections"] = [
  { section_type: "document_header",           display_name: "Document Header",                    required_level: "required",    gap_status: "present", completeness_score: 90, ai_feedback: null, content: "…" },
  { section_type: "executive_summary",         display_name: "Executive Summary",                  required_level: "required",    gap_status: "present", completeness_score: 80, ai_feedback: null, content: "…" },
  { section_type: "project_context",           display_name: "Project Context & Business Objectives", required_level: "required", gap_status: "present", completeness_score: 75, ai_feedback: null, content: "…" },
  { section_type: "scope",                     display_name: "Scope",                              required_level: "required",    gap_status: "present", completeness_score: 85, ai_feedback: null, content: "…" },
  { section_type: "stakeholders",              display_name: "Stakeholders & User Personas",       required_level: "required",    gap_status: "present", completeness_score: 70, ai_feedback: null, content: "…" },
  { section_type: "functional_requirements",   display_name: "Functional Requirements",            required_level: "required",    gap_status: "present", completeness_score: 80, ai_feedback: null, content: "…" },
  { section_type: "non_functional_requirements", display_name: "Non-Functional Requirements",    required_level: "required",    gap_status: "present", completeness_score: 72, ai_feedback: null, content: "…" },
  { section_type: "data_requirements",         display_name: "Data & Integration Requirements",   required_level: "recommended", gap_status: "missing", completeness_score: 0,  ai_feedback: null, content: "" },
  { section_type: "constraints",               display_name: "Constraints & Assumptions",         required_level: "recommended", gap_status: "missing", completeness_score: 0,  ai_feedback: null, content: "" },
  { section_type: "success_metrics",           display_name: "Success Metrics & Acceptance Criteria", required_level: "recommended", gap_status: "missing", completeness_score: 0, ai_feedback: null, content: "" },
  { section_type: "timeline",                  display_name: "Timeline & Prioritisation",         required_level: "optional",    gap_status: "missing", completeness_score: 0,  ai_feedback: null, content: "" },
  { section_type: "glossary",                  display_name: "Glossary",                          required_level: "recommended", gap_status: "missing", completeness_score: 0,  ai_feedback: null, content: "" },
];

function makeReport(overrides: Partial<GapAnalysisReport> = {}): GapAnalysisReport {
  return {
    session_id: "session-1",
    document_id: "doc-1",
    overall_score: 78,
    status: "complete",
    created_at: "2026-01-01T00:00:00Z",
    sections: ALL_SECTIONS,
    ...overrides,
  };
}

describe("RequirementCompleteness", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  describe("full (non-compact) mode", () => {
    it("renders the overall score", () => {
      render(<RequirementCompleteness report={makeReport()} projectId="proj-1" />);
      expect(screen.getByText("78%")).toBeInTheDocument();
    });

    it("shows 'All required sections are complete' when all required sections are present", () => {
      render(<RequirementCompleteness report={makeReport()} projectId="proj-1" />);
      expect(
        screen.getByText(/all required sections are complete/i)
      ).toBeInTheDocument();
    });

    it("shows incomplete required section count when some are missing", () => {
      const report = makeReport({
        sections: ALL_SECTIONS.map((s) =>
          s.section_type === "executive_summary" || s.section_type === "scope"
            ? { ...s, gap_status: "missing" as const, completeness_score: 0 }
            : s
        ),
      });
      render(<RequirementCompleteness report={report} projectId="proj-1" />);
      expect(screen.getByText(/2 required sections/i)).toBeInTheDocument();
    });

    it("does not show the incomplete list when all required are present", () => {
      render(<RequirementCompleteness report={makeReport()} projectId="proj-1" />);
      expect(
        screen.queryByText(/required sections to complete/i)
      ).not.toBeInTheDocument();
    });

    it("lists only required incomplete sections in the breakdown", () => {
      const report = makeReport({
        sections: ALL_SECTIONS.map((s) =>
          s.section_type === "functional_requirements"
            ? { ...s, gap_status: "missing" as const, completeness_score: 0 }
            : s
        ),
      });
      render(<RequirementCompleteness report={report} projectId="proj-1" />);
      expect(screen.getByText("Functional Requirements")).toBeInTheDocument();
      // Optional/recommended missing sections should not appear here
      expect(screen.queryByText("Timeline & Prioritisation")).not.toBeInTheDocument();
    });

    it("navigates to requirements page when 'View full analysis' is clicked", () => {
      render(<RequirementCompleteness report={makeReport()} projectId="proj-42" />);
      fireEvent.click(screen.getByText(/view full analysis/i));
      expect(mockPush).toHaveBeenCalledWith("/projects/proj-42/requirements");
    });
  });

  describe("compact mode", () => {
    it("renders the overall score in compact mode", () => {
      render(
        <RequirementCompleteness report={makeReport()} projectId="proj-1" compact />
      );
      expect(screen.getByText("78%")).toBeInTheDocument();
    });

    it("shows 'All required sections complete' in compact mode when none are missing", () => {
      render(
        <RequirementCompleteness report={makeReport()} projectId="proj-1" compact />
      );
      expect(
        screen.getByText(/all required sections complete/i)
      ).toBeInTheDocument();
    });

    it("shows incomplete count in compact mode when required sections are missing", () => {
      const report = makeReport({
        sections: ALL_SECTIONS.map((s) =>
          s.required_level === "required"
            ? { ...s, gap_status: "missing" as const, completeness_score: 0 }
            : s
        ),
      });
      render(
        <RequirementCompleteness report={report} projectId="proj-1" compact />
      );
      expect(screen.getByText(/7 required sections/i)).toBeInTheDocument();
    });

    it("navigates to requirements page on click in compact mode", () => {
      render(
        <RequirementCompleteness report={makeReport()} projectId="proj-99" compact />
      );
      fireEvent.click(screen.getByRole("button"));
      expect(mockPush).toHaveBeenCalledWith("/projects/proj-99/requirements");
    });

    it("does not render the breakdown list in compact mode", () => {
      const report = makeReport({
        sections: ALL_SECTIONS.map((s) =>
          s.section_type === "scope"
            ? { ...s, gap_status: "missing" as const, completeness_score: 0 }
            : s
        ),
      });
      render(
        <RequirementCompleteness report={report} projectId="proj-1" compact />
      );
      expect(
        screen.queryByText(/required sections to complete/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("gap status badges", () => {
    it("renders Missing badge for an incomplete required section", () => {
      const report = makeReport({
        sections: ALL_SECTIONS.map((s) =>
          s.section_type === "scope"
            ? { ...s, gap_status: "missing" as const, completeness_score: 0 }
            : s
        ),
      });
      render(<RequirementCompleteness report={report} projectId="proj-1" />);
      expect(screen.getByText("Missing")).toBeInTheDocument();
    });

    it("renders Thin badge for a thin required section", () => {
      const report = makeReport({
        sections: ALL_SECTIONS.map((s) =>
          s.section_type === "scope"
            ? { ...s, gap_status: "thin" as const, completeness_score: 40 }
            : s
        ),
      });
      render(<RequirementCompleteness report={report} projectId="proj-1" />);
      expect(screen.getByText("Thin")).toBeInTheDocument();
    });
  });
});

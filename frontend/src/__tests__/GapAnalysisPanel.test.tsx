import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { GapAnalysisPanel } from "@/components/requirements/GapAnalysisPanel";
import type { GapAnalysisReport } from "@/types";

const REPORT: GapAnalysisReport = {
  session_id: "session-1",
  document_id: "doc-1",
  overall_score: 62,
  status: "complete",
  created_at: "2026-01-01T00:00:00Z",
  sections: [
    {
      section_type: "document_header",
      display_name: "Document Header",
      required_level: "required",
      gap_status: "present",
      completeness_score: 90,
      ai_feedback: null,
      content: "Project Alpha v1.0 — drafted 2026-01-01",
    },
    {
      section_type: "executive_summary",
      display_name: "Executive Summary",
      required_level: "required",
      gap_status: "missing",
      completeness_score: 0,
      ai_feedback: "No executive summary was found in the document.",
      content: "",
    },
    {
      section_type: "functional_requirements",
      display_name: "Functional Requirements",
      required_level: "required",
      gap_status: "thin",
      completeness_score: 45,
      ai_feedback: "Requirements lack acceptance criteria and unique IDs.",
      content: "Users must be able to log in.",
    },
    {
      section_type: "glossary",
      display_name: "Glossary",
      required_level: "recommended",
      gap_status: "missing",
      completeness_score: 0,
      ai_feedback: null,
      content: "",
    },
  ],
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe("GapAnalysisPanel", () => {
  describe("summary bar", () => {
    it("renders the overall score", () => {
      render(<GapAnalysisPanel report={REPORT} />);
      expect(screen.getByText("62%")).toBeInTheDocument();
    });

    it("renders the correct section counts", () => {
      render(<GapAnalysisPanel report={REPORT} />);
      // 1 present, 1 thin, 2 missing
      const counts = screen.getAllByText(/^[0-9]+$/);
      const values = counts.map((el) => el.textContent);
      expect(values).toContain("1"); // present
      expect(values).toContain("2"); // missing
    });

    it("shows total sections analysed", () => {
      render(<GapAnalysisPanel report={REPORT} />);
      expect(screen.getByText(/4 sections analysed/i)).toBeInTheDocument();
    });
  });

  describe("section checklist", () => {
    it("renders all section names in the sidebar", () => {
      render(<GapAnalysisPanel report={REPORT} />);
      expect(screen.getAllByText("Document Header").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Executive Summary").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Functional Requirements").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Glossary").length).toBeGreaterThanOrEqual(1);
    });

    it("renders Present, Thin, and Missing badges", () => {
      render(<GapAnalysisPanel report={REPORT} />);
      expect(screen.getAllByText("Present").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Thin").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Missing").length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("section detail panel", () => {
    it("shows the first section detail by default", () => {
      render(<GapAnalysisPanel report={REPORT} />);
      // document_header content should be visible in the detail panel
      expect(screen.getByText(/Project Alpha v1\.0/i)).toBeInTheDocument();
    });

    it("switches detail when a different section is clicked", () => {
      render(<GapAnalysisPanel report={REPORT} />);
      const execSummaryButtons = screen.getAllByText("Executive Summary");
      // Click the sidebar row (the button)
      fireEvent.click(execSummaryButtons[0]);
      expect(
        screen.getByText(/No executive summary was found/i)
      ).toBeInTheDocument();
    });

    it("shows AI feedback for a thin section", () => {
      render(<GapAnalysisPanel report={REPORT} />);
      const frButtons = screen.getAllByText("Functional Requirements");
      fireEvent.click(frButtons[0]);
      expect(
        screen.getByText(/lack acceptance criteria/i)
      ).toBeInTheDocument();
    });

    it("shows missing-content message when section has no content", () => {
      render(<GapAnalysisPanel report={REPORT} />);
      const execSummaryButtons = screen.getAllByText("Executive Summary");
      fireEvent.click(execSummaryButtons[0]);
      expect(screen.getByText(/No content was found/i)).toBeInTheDocument();
    });

    it("shows extracted content when section content is present", () => {
      render(<GapAnalysisPanel report={REPORT} />);
      // document_header is selected by default and has content
      expect(screen.getByText(/Project Alpha v1\.0/i)).toBeInTheDocument();
      expect(screen.getByText(/Extracted content/i)).toBeInTheDocument();
    });

    it("shows required level label in detail panel", () => {
      render(<GapAnalysisPanel report={REPORT} />);
      // The first section is required
      expect(screen.getAllByText("Required").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("gap status score bars", () => {
    it("renders a score of 90% for a present section", () => {
      render(<GapAnalysisPanel report={REPORT} />);
      // Score should appear in the detail header badge
      expect(screen.getByText(/Present — 90%/i)).toBeInTheDocument();
    });

    it("renders a score of 0% for a missing section", () => {
      render(<GapAnalysisPanel report={REPORT} />);
      const execButtons = screen.getAllByText("Executive Summary");
      fireEvent.click(execButtons[0]);
      expect(screen.getByText(/Missing — 0%/i)).toBeInTheDocument();
    });
  });
});

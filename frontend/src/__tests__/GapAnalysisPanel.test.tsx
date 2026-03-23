import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { GapAnalysisPanel } from "@/components/requirements/GapAnalysisPanel";
import type { GapAnalysisReport } from "@/types";

// ── Default mock callbacks ────────────────────────────────────────────────────

const mockFill = jest.fn<Promise<string>, [string]>();
const mockApprove = jest.fn<Promise<void>, [string, string]>();
const mockSaveDocument = jest.fn<Promise<{ document_id: string; version_number: number }>, []>();

function makeCallbacks() {
  return {
    onFill: mockFill,
    onApprove: mockApprove,
    onSaveDocument: mockSaveDocument,
  };
}

// ── Test report ───────────────────────────────────────────────────────────────

const REPORT: GapAnalysisReport = {
  session_id: "session-1",
  document_id: "doc-1",
  overall_score: 62,
  status: "complete",
  created_at: "2026-01-01T00:00:00Z",
  can_save: false,
  sections: [
    {
      section_type: "document_header",
      display_name: "Document Header",
      required_level: "required",
      gap_status: "present",
      completeness_score: 90,
      ai_feedback: null,
      content: "Project Alpha v1.0 — drafted 2026-01-01",
      status: "complete",
    },
    {
      section_type: "executive_summary",
      display_name: "Executive Summary",
      required_level: "required",
      gap_status: "missing",
      completeness_score: 0,
      ai_feedback: "No executive summary was found in the document.",
      content: "",
      status: "pending",
    },
    {
      section_type: "functional_requirements",
      display_name: "Functional Requirements",
      required_level: "required",
      gap_status: "thin",
      completeness_score: 45,
      ai_feedback: "Requirements lack acceptance criteria and unique IDs.",
      content: "Users must be able to log in.",
      status: "pending",
    },
    {
      section_type: "glossary",
      display_name: "Glossary",
      required_level: "recommended",
      gap_status: "missing",
      completeness_score: 0,
      ai_feedback: null,
      content: "",
      status: "pending",
    },
  ],
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

beforeEach(() => {
  mockFill.mockReset();
  mockApprove.mockReset();
  mockSaveDocument.mockReset();
  mockFill.mockResolvedValue("AI-drafted content.");
  mockApprove.mockResolvedValue(undefined);
  mockSaveDocument.mockResolvedValue({ document_id: "doc-1", version_number: 2 });
});

// ── Display: summary bar ──────────────────────────────────────────────────────

describe("GapAnalysisPanel — summary bar", () => {
  it("renders the overall score", () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    expect(screen.getByText("62%")).toBeInTheDocument();
  });

  it("shows total sections analysed", () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    expect(screen.getByText(/4 sections analysed/i)).toBeInTheDocument();
  });

  it("renders present / thin / missing counts", () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    // 1 present (document_header), 1 thin (functional_requirements), 2 missing
    expect(screen.getByText("present")).toBeInTheDocument();
    expect(screen.getByText("thin")).toBeInTheDocument();
    expect(screen.getByText("missing")).toBeInTheDocument();
  });

  it("renders Save Document button", () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    expect(
      screen.getByRole("button", { name: /save complete document/i })
    ).toBeInTheDocument();
  });

  it("Save Document button is disabled when can_save conditions not met", () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    expect(screen.getByRole("button", { name: /save complete document/i })).toBeDisabled();
  });
});

// ── Display: section checklist ────────────────────────────────────────────────

describe("GapAnalysisPanel — section checklist", () => {
  it("renders all section names in the sidebar", () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    expect(screen.getAllByText("Document Header").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Executive Summary").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Functional Requirements").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Glossary").length).toBeGreaterThanOrEqual(1);
  });

  it("renders Present, Thin, and Missing badges", () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    expect(screen.getAllByText("Present").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Thin").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Missing").length).toBeGreaterThanOrEqual(2);
  });
});

// ── Display: section detail panel ─────────────────────────────────────────────

describe("GapAnalysisPanel — section detail panel", () => {
  it("shows the first section detail by default", () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    expect(screen.getByText(/Project Alpha v1\.0/i)).toBeInTheDocument();
  });

  it("switches detail when a different section is clicked", () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    const execSummaryButtons = screen.getAllByText("Executive Summary");
    fireEvent.click(execSummaryButtons[0]);
    expect(
      screen.getByText(/No executive summary was found/i)
    ).toBeInTheDocument();
  });

  it("shows AI feedback for a thin section", () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    const frButtons = screen.getAllByText("Functional Requirements");
    fireEvent.click(frButtons[0]);
    expect(screen.getByText(/lack acceptance criteria/i)).toBeInTheDocument();
  });

  it("shows missing-content message when section has no content", () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    const execSummaryButtons = screen.getAllByText("Executive Summary");
    fireEvent.click(execSummaryButtons[0]);
    expect(screen.getByText(/No content was found/i)).toBeInTheDocument();
  });

  it("shows an editable textarea for thin sections with content", () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    // Functional Requirements: thin, has content, not yet client-approved
    fireEvent.click(screen.getAllByText("Functional Requirements")[0]);
    const textarea = screen.getByRole("textbox", {
      name: /edit content for functional requirements/i,
    });
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue("Users must be able to log in.");
  });

  it("renders a score badge for the selected section", () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    // document_header is the default selection; it's server-pre-approved (status=complete)
    // so the badge shows its original score (90), not 75
    expect(screen.getByText(/Present — 90%/i)).toBeInTheDocument();
  });

  it("renders required level label in detail panel", () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    expect(screen.getAllByText("Required").length).toBeGreaterThanOrEqual(1);
  });
});

// ── Phase 2: interactive fill ─────────────────────────────────────────────────

describe("GapAnalysisPanel — Fill with AI", () => {
  it("shows Fill with AI button for missing sections", () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    fireEvent.click(screen.getAllByText("Executive Summary")[0]);
    expect(
      screen.getByRole("button", { name: /fill executive summary with ai/i })
    ).toBeInTheDocument();
  });

  it("shows Fill with AI button for thin sections", () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    fireEvent.click(screen.getAllByText("Functional Requirements")[0]);
    expect(
      screen.getByRole("button", { name: /fill functional requirements with ai/i })
    ).toBeInTheDocument();
  });

  it("does NOT show Fill with AI for already-present sections", () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    // document_header is present — no fill button
    expect(
      screen.queryByRole("button", { name: /fill document header with ai/i })
    ).not.toBeInTheDocument();
  });

  it("calls onFill with the correct section type when clicked", async () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    fireEvent.click(screen.getAllByText("Executive Summary")[0]);
    const fillBtn = screen.getByRole("button", {
      name: /fill executive summary with ai/i,
    });
    await act(async () => { fireEvent.click(fillBtn); });
    expect(mockFill).toHaveBeenCalledWith("executive_summary");
  });

  it("populates textarea with AI draft after fill", async () => {
    mockFill.mockResolvedValue("AI-generated executive summary text.");
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    fireEvent.click(screen.getAllByText("Executive Summary")[0]);
    const fillBtn = screen.getByRole("button", {
      name: /fill executive summary with ai/i,
    });
    await act(async () => { fireEvent.click(fillBtn); });
    await waitFor(() => {
      expect(
        screen.getByDisplayValue("AI-generated executive summary text.")
      ).toBeInTheDocument();
    });
  });

  it("shows Drafting… spinner while fill is in progress", async () => {
    let resolveF!: (v: string) => void;
    mockFill.mockReturnValue(new Promise((res) => { resolveF = res; }));
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    fireEvent.click(screen.getAllByText("Executive Summary")[0]);
    fireEvent.click(
      screen.getByRole("button", { name: /fill executive summary with ai/i })
    );
    expect(screen.getByText(/Drafting…/i)).toBeInTheDocument();
    await act(async () => { resolveF("done"); });
  });
});

// ── Phase 2: approve ─────────────────────────────────────────────────────────

describe("GapAnalysisPanel — Approve", () => {
  it("shows Approve button when section has content and is not yet approved", () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    fireEvent.click(screen.getAllByText("Functional Requirements")[0]);
    expect(
      screen.getByRole("button", { name: /approve functional requirements/i })
    ).toBeInTheDocument();
  });

  it("does NOT show Approve button for an already-approved (complete) section", () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    // document_header is complete (status='complete') → pre-approved on load
    expect(
      screen.queryByRole("button", { name: /approve document header/i })
    ).not.toBeInTheDocument();
  });

  it("calls onApprove with section type and current content", async () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    fireEvent.click(screen.getAllByText("Functional Requirements")[0]);
    const approveBtn = screen.getByRole("button", {
      name: /approve functional requirements/i,
    });
    await act(async () => { fireEvent.click(approveBtn); });
    expect(mockApprove).toHaveBeenCalledWith(
      "functional_requirements",
      "Users must be able to log in."
    );
  });

  it("shows approved banner after approving a section", async () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    fireEvent.click(screen.getAllByText("Functional Requirements")[0]);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /approve functional requirements/i })
      );
    });
    await waitFor(() => {
      expect(
        screen.getByText(/section approved and included/i)
      ).toBeInTheDocument();
    });
  });

  it("shows Present badge in sidebar after approving a section", async () => {
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    fireEvent.click(screen.getAllByText("Functional Requirements")[0]);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /approve functional requirements/i })
      );
    });
    await waitFor(() => {
      const presentBadges = screen.getAllByText("Present");
      // Should now be 2: document_header + functional_requirements
      expect(presentBadges.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ── Phase 2: save document ────────────────────────────────────────────────────

describe("GapAnalysisPanel — Save Document", () => {
  it("Save Document button is enabled when both required sections are approved", async () => {
    // executive_summary is missing; approve it via the UI
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    // Give exec summary some content by filling it first
    mockFill.mockResolvedValue("Executive summary content.");
    fireEvent.click(screen.getAllByText("Executive Summary")[0]);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /fill executive summary with ai/i }));
    });
    await waitFor(() => {
      expect(screen.getByDisplayValue("Executive summary content.")).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /approve executive summary/i }));
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save complete document/i })).not.toBeDisabled();
    });
  });

  it("calls onSaveDocument when Save Document is clicked and both sections approved", async () => {
    mockFill.mockResolvedValue("Summary.");
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    fireEvent.click(screen.getAllByText("Executive Summary")[0]);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /fill executive summary with ai/i }));
    });
    await waitFor(() => expect(screen.getByDisplayValue("Summary.")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /approve executive summary/i }));
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save complete document/i })).not.toBeDisabled()
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save complete document/i }));
    });
    expect(mockSaveDocument).toHaveBeenCalled();
  });

  it("shows Saving… while save is in progress", async () => {
    let resolveSave!: () => void;
    mockSaveDocument.mockReturnValue(
      new Promise((res) => { resolveSave = () => res({ document_id: "doc-1", version_number: 2 }); })
    );
    mockFill.mockResolvedValue("Summary.");
    render(<GapAnalysisPanel report={REPORT} {...makeCallbacks()} />);
    fireEvent.click(screen.getAllByText("Executive Summary")[0]);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /fill executive summary with ai/i }));
    });
    await waitFor(() => expect(screen.getByDisplayValue("Summary.")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /approve executive summary/i }));
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save complete document/i })).not.toBeDisabled()
    );
    fireEvent.click(screen.getByRole("button", { name: /save complete document/i }));
    expect(screen.getByText(/Saving…/i)).toBeInTheDocument();
    await act(async () => { resolveSave(); });
  });
});

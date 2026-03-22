import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import ReviewPanel from "@/components/ReviewPanel";
import type { StoryReview } from "@/types";

const BASE_REVIEW: StoryReview = {
  id: "rev-1",
  story_id: "story-1",
  overall_status: "clear",
  feedback: {
    clarity: { score: 5, comment: "Crystal clear description" },
    completeness: { score: 4, comment: "All fields present" },
    testability: { score: 5, comment: "Well-defined acceptance criteria" },
    independence: { score: 3, comment: "Somewhat coupled" },
    value: { score: 5, comment: "High business value" },
  },
  suggestions: null,
  created_at: "2024-01-01T00:00:00Z",
};

describe("ReviewPanel", () => {
  it("shows the overall status badge", () => {
    render(<ReviewPanel review={BASE_REVIEW} />);
    expect(screen.getByText(/AI Review: Clear/i)).toBeInTheDocument();
  });

  it("renders all feedback criteria", () => {
    render(<ReviewPanel review={BASE_REVIEW} />);
    expect(screen.getByText(/Clarity/i)).toBeInTheDocument();
    expect(screen.getByText(/Completeness/i)).toBeInTheDocument();
    expect(screen.getByText(/Testability/i)).toBeInTheDocument();
    expect(screen.getByText(/Independence/i)).toBeInTheDocument();
    expect(screen.getByText(/Business Value/i)).toBeInTheDocument();
  });

  it("renders feedback comments", () => {
    render(<ReviewPanel review={BASE_REVIEW} />);
    expect(screen.getByText(/Crystal clear description/i)).toBeInTheDocument();
    expect(screen.getByText(/Somewhat coupled/i)).toBeInTheDocument();
  });

  it("shows suggestions section when present", () => {
    const review: StoryReview = {
      ...BASE_REVIEW,
      overall_status: "ambiguous",
      suggestions: "Please clarify the user role and add more specific acceptance criteria.",
    };
    render(<ReviewPanel review={review} />);
    expect(screen.getByText(/Suggestions/i)).toBeInTheDocument();
    expect(screen.getByText(/Please clarify the user role/i)).toBeInTheDocument();
  });

  it("does not show suggestions section when null", () => {
    render(<ReviewPanel review={BASE_REVIEW} />);
    expect(screen.queryByText(/Suggestions/i)).not.toBeInTheDocument();
  });

  it("applies correct status styling for ambiguous", () => {
    const review: StoryReview = { ...BASE_REVIEW, overall_status: "ambiguous" };
    render(<ReviewPanel review={review} />);
    expect(screen.getByText(/AI Review: Ambiguous/i)).toBeInTheDocument();
  });

  it("applies correct status styling for incomplete", () => {
    const review: StoryReview = { ...BASE_REVIEW, overall_status: "incomplete" };
    render(<ReviewPanel review={review} />);
    expect(screen.getByText(/AI Review: Incomplete/i)).toBeInTheDocument();
  });
});

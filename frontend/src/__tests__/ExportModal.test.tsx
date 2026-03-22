import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ExportModal from "@/components/ExportModal";
import type { PMIntegration } from "@/types";

const MOCK_INTEGRATIONS: PMIntegration[] = [
  {
    id: "int-jira",
    project_id: "proj-1",
    provider: "jira",
    name: "My JIRA",
    config: { project_key: "TEST" },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "int-asana",
    project_id: "proj-1",
    provider: "asana",
    name: "My Asana",
    config: {},
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

describe("ExportModal", () => {
  it("shows number of selected stories in the heading", () => {
    render(
      <ExportModal
        integrations={MOCK_INTEGRATIONS}
        selectedCount={5}
        loading={false}
        onExport={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText(/Export 5 stories/i)).toBeInTheDocument();
  });

  it("lists all available integrations", () => {
    render(
      <ExportModal
        integrations={MOCK_INTEGRATIONS}
        selectedCount={2}
        loading={false}
        onExport={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("My JIRA")).toBeInTheDocument();
    expect(screen.getByText("My Asana")).toBeInTheDocument();
  });

  it("shows provider labels", () => {
    render(
      <ExportModal
        integrations={MOCK_INTEGRATIONS}
        selectedCount={1}
        loading={false}
        onExport={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("JIRA")).toBeInTheDocument();
    expect(screen.getByText("Asana")).toBeInTheDocument();
  });

  it("calls onExport with the selected integration id", () => {
    const onExport = jest.fn();
    render(
      <ExportModal
        integrations={MOCK_INTEGRATIONS}
        selectedCount={3}
        loading={false}
        onExport={onExport}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText(/My JIRA/i) ?? screen.getAllByRole("radio")[0]);
    fireEvent.click(screen.getByText(/Export to selected tool/i));

    expect(onExport).toHaveBeenCalledWith("int-jira");
  });

  it("calls onClose when X button is clicked", () => {
    const onClose = jest.fn();
    render(
      <ExportModal
        integrations={MOCK_INTEGRATIONS}
        selectedCount={1}
        loading={false}
        onExport={jest.fn()}
        onClose={onClose}
      />
    );
    // The X button is identified by its icon — click the button near the heading
    const closeButton = screen.getByRole("button", { name: "" });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it("disables export button while loading", () => {
    render(
      <ExportModal
        integrations={MOCK_INTEGRATIONS}
        selectedCount={1}
        loading={true}
        onExport={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const exportButton = screen.getByRole("button", { name: /Exporting/i });
    expect(exportButton).toBeDisabled();
  });

  it("shows empty state when no integrations are configured", () => {
    render(
      <ExportModal
        integrations={[]}
        selectedCount={3}
        loading={false}
        onExport={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText(/No integrations configured/i)).toBeInTheDocument();
  });
});

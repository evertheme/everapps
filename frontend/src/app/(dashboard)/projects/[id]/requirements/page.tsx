"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  FileSearch,
  Loader2,
  RefreshCw,
  ArrowLeft,
  FileText,
  Sparkles,
  Download,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type {
  Document,
  GapAnalysisReport,
  Project,
  SectionFillResponse,
  SaveDocumentResponse,
} from "@/types";
import { GapAnalysisPanel } from "@/components/requirements/GapAnalysisPanel";

export default function RequirementsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [runningForDocId, setRunningForDocId] = useState<string | null>(null);

  const { data: project } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: async () => (await api.get(`/projects/${projectId}`)).data,
  });

  const { data: documents = [], isLoading: docsLoading } = useQuery<Document[]>({
    queryKey: ["documents", projectId],
    queryFn: async () => (await api.get(`/documents/${projectId}/`)).data,
  });

  const {
    data: report,
    isLoading: reportLoading,
    refetch: refetchReport,
  } = useQuery<GapAnalysisReport>({
    queryKey: ["gap-analysis-report", projectId],
    queryFn: async () =>
      (await api.get(`/req-assistant/${projectId}/gap-analysis/report`)).data,
    retry: (failureCount, error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      return status !== 404 && failureCount < 2;
    },
  });

  // ── Phase 1: run analysis ──────────────────────────────────────────────────

  const gapAnalysisMutation = useMutation({
    mutationFn: (documentId: string) =>
      api.post(`/req-assistant/${projectId}/gap-analysis`, {
        document_id: documentId,
      }),
    onSuccess: () => {
      toast.success("Gap analysis complete");
      qc.invalidateQueries({ queryKey: ["gap-analysis-report", projectId] });
      setRunningForDocId(null);
    },
    onError: () => {
      toast.error("Gap analysis failed — check your LLM settings");
      setRunningForDocId(null);
    },
  });

  const handleRunAnalysis = (docId: string) => {
    setRunningForDocId(docId);
    gapAnalysisMutation.mutate(docId);
  };

  // ── Phase 2: fill / approve / save ────────────────────────────────────────

  const handleFill = async (sectionType: string): Promise<string> => {
    const res = await api.post<SectionFillResponse>(
      `/req-assistant/${projectId}/gap-analysis/section/${sectionType}/fill`
    );
    return res.data.content;
  };

  const handleApprove = async (
    sectionType: string,
    content: string
  ): Promise<void> => {
    await api.post(
      `/req-assistant/${projectId}/gap-analysis/section/${sectionType}/approve`,
      { content }
    );
    // Silently refresh so report.can_save reflects the approval
    qc.invalidateQueries({ queryKey: ["gap-analysis-report", projectId] });
  };

  const handleSaveDocument = async (): Promise<{
    document_id: string;
    version_number: number;
  }> => {
    const res = await api.post<SaveDocumentResponse>(
      `/req-assistant/${projectId}/gap-analysis/save-document`
    );
    toast.success(
      `Saved as version ${res.data.version_number} — ready for story generation.`
    );
    // Refresh the doc list so the new version is visible
    qc.invalidateQueries({ queryKey: ["documents", projectId] });
    return { document_id: res.data.document_id, version_number: res.data.version_number };
  };

  const isRunning = gapAnalysisMutation.isPending;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
        <button
          onClick={() => router.push("/dashboard")}
          className="hover:text-gray-600"
        >
          Projects
        </button>
        <span>/</span>
        <button
          onClick={() => router.push(`/projects/${projectId}`)}
          className="hover:text-gray-600"
        >
          {project?.name ?? "…"}
        </button>
        <span>/</span>
        <span className="text-gray-700 font-medium">Requirements</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Requirements Document Assistant
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Analyse your document for completeness and fill any gaps with AI
            before generating your story backlog.
          </p>
        </div>
        <button
          onClick={() => router.push(`/projects/${projectId}`)}
          className="btn-secondary text-sm flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Document picker */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">
            Select a document to analyse
          </h2>
          <a
            href="/templates/requirements-template.docx"
            download="requirements-template.docx"
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Download template
          </a>
        </div>

        {docsLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse h-12 rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="flex items-start gap-3 text-sm text-gray-500 py-4">
            <FileText className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
            <span>
              No documents uploaded yet.{" "}
              <button
                onClick={() => router.push(`/projects/${projectId}`)}
                className="text-brand-600 hover:underline"
              >
                Upload one on the project page.
              </button>{" "}
              Don&apos;t have one yet?{" "}
              <a
                href="/templates/requirements-template.docx"
                download="requirements-template.docx"
                className="text-brand-600 hover:underline"
              >
                Download our template
              </a>{" "}
              to get started.
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-brand-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {doc.filename}
                    </p>
                    <p className="text-xs text-gray-400">
                      v{doc.current_version} · {formatDate(doc.updated_at)}
                    </p>
                  </div>
                </div>
                <button
                  className="btn-primary text-xs py-1.5 px-3 shrink-0 flex items-center gap-1.5"
                  onClick={() => handleRunAnalysis(doc.id)}
                  disabled={isRunning}
                >
                  {isRunning && runningForDocId === doc.id ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Analysing…
                    </>
                  ) : (
                    <>
                      <FileSearch className="w-3 h-3" />
                      Analyse
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report section */}
      {reportLoading ? (
        <div className="card p-8 flex items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading latest report…</span>
        </div>
      ) : report ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Latest analysis
              <span className="text-gray-400 font-normal ml-2">
                · {formatDate(report.created_at)}
              </span>
            </h2>
            <button
              onClick={() => refetchReport()}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>

          <GapAnalysisPanel
            report={report}
            onFill={handleFill}
            onApprove={handleApprove}
            onSaveDocument={handleSaveDocument}
          />

          {/* Story generation CTA — shown when document has been saved (has v2+) */}
          {documents.some((d) => d.current_version >= 2) && (
            <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-brand-800">
                  Requirements document saved — ready for story generation
                </p>
                <p className="text-xs text-brand-600 mt-0.5">
                  Select the saved version on the project page and click Generate
                  Stories.
                </p>
              </div>
              <button
                onClick={() => router.push(`/projects/${projectId}`)}
                className="btn-primary text-sm shrink-0 flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                Go to Project
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-8 text-center space-y-3">
          <FileSearch className="w-10 h-10 text-gray-200 mx-auto" />
          <p className="text-sm text-gray-500">
            No gap analysis has been run yet. Select a document above and click
            Analyse.
          </p>
        </div>
      )}
    </div>
  );
}

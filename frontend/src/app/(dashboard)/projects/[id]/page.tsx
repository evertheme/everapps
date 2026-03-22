"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  Loader2,
  Sparkles,
  BookOpen,
  AlertTriangle,
  Clock,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Document, DocumentHints, Project } from "@/types";

export default function ProjectPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [uploading, setUploading] = useState(false);
  const [docHints, setDocHints] = useState<Record<string, DocumentHints>>({});
  const [dismissedHints, setDismissedHints] = useState<Set<string>>(new Set());
  const [confirmDocId, setConfirmDocId] = useState<string | null>(null);

  const { data: project } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: async () => (await api.get(`/projects/${projectId}`)).data,
  });

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["documents", projectId],
    queryFn: async () => (await api.get(`/documents/${projectId}/`)).data,
  });

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setUploading(true);
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await api.post(`/documents/${projectId}/upload`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        qc.invalidateQueries({ queryKey: ["documents", projectId] });
        toast.success("Document uploaded");
        if (res.data?.hints && res.data?.id) {
          setDocHints((prev) => ({ ...prev, [res.data.id]: res.data.hints }));
        }
      } catch {
        toast.error("Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [projectId, qc]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
    multiple: false,
  });

  const generateMutation = useMutation({
    mutationFn: (document_id: string) =>
      api.post("/stories/generate", { project_id: projectId, document_id }),
    onSuccess: () => {
      toast.success("Stories generated!");
      router.push(`/projects/${projectId}/stories`);
    },
    onError: () => toast.error("Generation failed — check your LLM settings"),
  });

  const handleGenerateClick = (docId: string) => {
    const hints = docHints[docId];
    const hasWarnings =
      hints && (hints.is_large || hints.format_warnings.length > 0);
    if (hasWarnings) {
      setConfirmDocId(docId);
    } else {
      generateMutation.mutate(docId);
    }
  };

  const handleConfirmGenerate = () => {
    if (confirmDocId) {
      generateMutation.mutate(confirmDocId);
      setConfirmDocId(null);
    }
  };

  const dismissHint = (docId: string) => {
    setDismissedHints((prev) => new Set(prev).add(docId));
  };

  const renderAdvisoryCard = (doc: Document) => {
    const hints = docHints[doc.id];
    if (!hints || dismissedHints.has(doc.id)) return null;
    if (!hints.is_large && hints.format_warnings.length === 0) return null;

    return (
      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="space-y-1">
              {hints.is_large && (
                <p className="font-medium text-amber-800">
                  Large document detected (
                  {Math.round(hints.char_count / 5).toLocaleString()} words
                  {hints.section_count > 0 && ` · ${hints.section_count} sections`})
                </p>
              )}
              {hints.processing_note && (
                <p className="text-amber-700">{hints.processing_note}</p>
              )}
              {hints.format_warnings.map((w, i) => (
                <p key={i} className="text-amber-700">{w}</p>
              ))}
            </div>
          </div>
          <button
            onClick={() => dismissHint(doc.id)}
            className="text-amber-400 hover:text-amber-600 shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderConfirmModal = () => {
    if (!confirmDocId) return null;
    const hints = docHints[confirmDocId];
    if (!hints) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Generate Stories — Large Document
          </h2>

          {hints.is_large && hints.processing_note && (
            <div className="flex gap-3">
              <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Extra processing time
                </p>
                <p className="text-sm text-gray-500">{hints.processing_note}</p>
              </div>
            </div>
          )}

          {hints.format_warnings.map((w, i) => (
            <div key={i} className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Format suggestion
                </p>
                <p className="text-sm text-gray-500">{w}</p>
              </div>
            </div>
          ))}

          {hints.is_large && (
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Potential risks
                </p>
                <p className="text-sm text-gray-500">
                  Stories near section boundaries may occasionally overlap.
                  Review the generated backlog for duplicates.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button
              className="btn-secondary text-sm"
              onClick={() => setConfirmDocId(null)}
            >
              Cancel
            </button>
            <button
              className="btn-primary text-sm"
              onClick={handleConfirmGenerate}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Sparkles className="w-3 h-3 mr-1" />
              )}
              Generate anyway
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {renderConfirmModal()}

      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <button onClick={() => router.push("/dashboard")} className="hover:text-gray-600">
            Projects
          </button>
          <span>/</span>
          <span className="text-gray-700 font-medium">{project?.name ?? "…"}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{project?.name}</h1>
        {project?.description && (
          <p className="text-gray-500 mt-1">{project.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => router.push(`/projects/${projectId}/stories`)}
          className="card p-5 text-left hover:shadow-md transition-shadow flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Backlog</p>
            <p className="text-xs text-gray-500">View & edit stories</p>
          </div>
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Requirement Documents
        </h2>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
            isDragActive
              ? "border-brand-400 bg-brand-50"
              : "border-gray-200 hover:border-brand-300"
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-brand-600">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-medium">Parsing document…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <Upload className="w-8 h-8" />
              <p className="text-sm font-medium text-gray-600">
                {isDragActive ? "Drop to upload" : "Drop a file or click to browse"}
              </p>
              <p className="text-xs">.docx, .pdf, .txt, .md</p>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="card p-4 animate-pulse h-16" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No documents uploaded yet
          </p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id}>
                <div className="card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-brand-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {doc.filename}
                      </p>
                      <p className="text-xs text-gray-400">
                        v{doc.current_version} · {formatDate(doc.updated_at)}
                      </p>
                    </div>
                  </div>
                  <button
                    className="btn-primary text-xs py-1.5 px-3"
                    onClick={() => handleGenerateClick(doc.id)}
                    disabled={generateMutation.isPending}
                  >
                    {generateMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 mr-1" />
                        Generate stories
                      </>
                    )}
                  </button>
                </div>
                {renderAdvisoryCard(doc)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

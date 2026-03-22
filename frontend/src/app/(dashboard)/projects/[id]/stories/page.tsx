"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, Download, Loader2, Filter } from "lucide-react";
import { api } from "@/lib/api";
import type { Project, Story, PMIntegration, ExportResult } from "@/types";
import StoryCard from "@/components/StoryCard";
import ExportModal from "@/components/ExportModal";

export default function StoriesPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showExport, setShowExport] = useState(false);

  const { data: project } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: async () => (await api.get(`/projects/${projectId}`)).data,
  });

  const { data: stories = [], isLoading } = useQuery<Story[]>({
    queryKey: ["stories", projectId],
    queryFn: async () => (await api.get(`/stories/${projectId}/`)).data,
  });

  const { data: integrations = [] } = useQuery<PMIntegration[]>({
    queryKey: ["integrations"],
    queryFn: async () => (await api.get("/integrations/")).data,
  });

  const projectIntegrations = integrations.filter((i) => i.project_id === projectId);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((s) => s.id)));
  };

  const filtered = stories.filter((s) => statusFilter === "all" || s.status === statusFilter);

  const exportMutation = useMutation({
    mutationFn: ({ integrationId, storyIds }: { integrationId: string; storyIds: string[] }) =>
      api.post<ExportResult[]>(`/integrations/${integrationId}/export`, {
        story_ids: storyIds,
        integration_id: integrationId,
      }),
    onSuccess: (res) => {
      const success = res.data.filter((r) => r.success).length;
      const fail = res.data.filter((r) => !r.success).length;
      if (fail === 0) toast.success(`${success} stories exported`);
      else toast.error(`${success} exported, ${fail} failed`);
      setShowExport(false);
      setSelected(new Set());
    },
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {project?.name}
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Backlog</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stories.length} stories</p>
        </div>
        {selected.size > 0 && (
          <button
            className="btn-primary"
            onClick={() => setShowExport(true)}
          >
            <Download className="w-4 h-4 mr-2" />
            Export {selected.size} selected
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg p-1">
          {["all", "draft", "reviewed", "approved", "exported"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                statusFilter === s ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {filtered.length > 0 && (
          <button onClick={toggleAll} className="text-xs text-brand-600 hover:underline">
            {selected.size === filtered.length ? "Deselect all" : "Select all"}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-5 animate-pulse h-20" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="font-medium">No stories yet</p>
          <p className="text-sm">Upload a document and click &quot;Generate stories&quot; to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              projectId={projectId}
              selected={selected.has(story.id)}
              onSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {showExport && (
        <ExportModal
          integrations={projectIntegrations}
          selectedCount={selected.size}
          loading={exportMutation.isPending}
          onExport={(integrationId) =>
            exportMutation.mutate({ integrationId, storyIds: Array.from(selected) })
          }
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}

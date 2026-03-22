"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, FolderOpen, Calendar, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Project } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => (await api.get("/projects/")).data,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; description: string }) =>
      api.post("/projects/", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setShowNew(false);
      setForm({ name: "", description: "" });
      toast.success("Project created");
    },
    onError: () => toast.error("Failed to create project"),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your requirements and backlogs</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New project
        </button>
      </div>

      {showNew && (
        <div className="card p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">New project</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Project name</label>
              <input
                className="input"
                placeholder="My Product v2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="What are you building?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create project"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowNew(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No projects yet</p>
          <p className="text-sm">Create your first project to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <button
              key={p.id}
              className="card p-5 w-full text-left hover:shadow-md transition-shadow flex items-center justify-between group"
              onClick={() => router.push(`/projects/${p.id}`)}
            >
              <div>
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                {p.description && (
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{p.description}</p>
                )}
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                  <Calendar className="w-3 h-3" />
                  {formatDate(p.created_at)}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

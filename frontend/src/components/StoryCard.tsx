"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ChevronDown, ChevronUp, Sparkles, Loader2, Edit2, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { cn, PRIORITY_COLORS, STATUS_COLORS } from "@/lib/utils";
import type { Story, StoryReview } from "@/types";
import ReviewPanel from "./ReviewPanel";

interface Props {
  story: Story;
  projectId: string;
  selected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
}

export default function StoryCard({ story, projectId, selected, onSelect }: Props) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    title: story.title,
    description: story.description,
    acceptance_criteria: story.acceptance_criteria ?? "",
    priority: story.priority,
    story_points: story.story_points?.toString() ?? "",
  });
  const [latestReview, setLatestReview] = useState<StoryReview | null>(null);

  const reviewMutation = useMutation({
    mutationFn: () =>
      api.post<StoryReview>(`/stories/${projectId}/${story.id}/review`),
    onSuccess: (res) => {
      setLatestReview(res.data);
      qc.invalidateQueries({ queryKey: ["stories", projectId] });
      toast.success("Review complete");
    },
    onError: () => toast.error("Review failed"),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.put(`/stories/${projectId}/${story.id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stories", projectId] });
      setEditing(false);
      toast.success("Story updated");
    },
    onError: () => toast.error("Update failed"),
  });

  const handleSave = () => {
    updateMutation.mutate({
      title: draft.title,
      description: draft.description,
      acceptance_criteria: draft.acceptance_criteria || null,
      priority: draft.priority,
      story_points: draft.story_points ? parseInt(draft.story_points) : null,
    });
  };

  return (
    <div className={cn("card overflow-hidden", selected && "ring-2 ring-brand-500")}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {onSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(story.id, e.target.checked)}
              className="mt-1 rounded"
            />
          )}
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                className="input text-sm font-semibold mb-2"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            ) : (
              <h3 className="font-semibold text-gray-900 text-sm leading-snug">{story.title}</h3>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={cn("badge", PRIORITY_COLORS[story.priority])}>{story.priority}</span>
              <span className={cn("badge", STATUS_COLORS[story.status])}>{story.status}</span>
              {story.story_points && (
                <span className="badge bg-gray-100 text-gray-600">{story.story_points} pts</span>
              )}
              <span className="text-xs text-gray-400">v{story.current_version}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!editing ? (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => reviewMutation.mutate()}
                  disabled={reviewMutation.isPending}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50"
                  title="AI Review"
                >
                  {reviewMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="p-1.5 rounded-lg text-green-600 hover:bg-green-50"
                  title="Save"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {editing && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="label text-xs">Description</label>
              <textarea
                className="input text-sm resize-none"
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <div>
              <label className="label text-xs">Acceptance Criteria <span className="text-gray-400 font-normal">(one criterion per line)</span></label>
              <textarea
                className="input text-sm resize-none"
                rows={4}
                placeholder={"Given valid credentials, the user is logged in.\nAn error is shown for invalid input."}
                value={draft.acceptance_criteria}
                onChange={(e) => setDraft({ ...draft, acceptance_criteria: e.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="label text-xs">Priority</label>
                <select
                  className="input text-sm"
                  value={draft.priority}
                  onChange={(e) => setDraft({ ...draft, priority: e.target.value as Story["priority"] })}
                >
                  {["critical", "high", "medium", "low"].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="label text-xs">Story Points</label>
                <input
                  className="input text-sm"
                  type="number"
                  placeholder="e.g. 3"
                  value={draft.story_points}
                  onChange={(e) => setDraft({ ...draft, story_points: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {expanded && !editing && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{story.description}</p>
          </div>
          {story.acceptance_criteria && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Acceptance Criteria
              </h4>
              <ul className="space-y-1">
                {story.acceptance_criteria
                  .split("\n")
                  .filter(Boolean)
                  .map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
                      {item}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          {latestReview && <ReviewPanel review={latestReview} />}
        </div>
      )}
    </div>
  );
}

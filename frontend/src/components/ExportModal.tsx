"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import type { PMIntegration } from "@/types";

interface Props {
  integrations: PMIntegration[];
  selectedCount: number;
  loading: boolean;
  onExport: (integrationId: string) => void;
  onClose: () => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  jira: "JIRA",
  asana: "Asana",
  trello: "Trello",
  azure_devops: "Azure DevOps",
};

export default function ExportModal({ integrations, selectedCount, loading, onExport, onClose }: Props) {
  const [selected, setSelected] = useState<string>("");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Export {selectedCount} stories</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {integrations.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No integrations configured for this project. Add one in Settings.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {integrations.map((i) => (
                  <label
                    key={i.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selected === i.id
                        ? "border-brand-500 bg-brand-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="integration"
                      value={i.id}
                      checked={selected === i.id}
                      onChange={() => setSelected(i.id)}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{i.name}</p>
                      <p className="text-xs text-gray-400">{PROVIDER_LABELS[i.provider] ?? i.provider}</p>
                    </div>
                  </label>
                ))}
              </div>
              <button
                className="btn-primary w-full"
                disabled={!selected || loading}
                onClick={() => onExport(selected)}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting…
                  </>
                ) : (
                  "Export to selected tool"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

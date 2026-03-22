"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Cpu, Plug, Plus, Trash2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { LLMSettings, Project, PMIntegration } from "@/types";

const PROVIDERS = [
  { value: "openai", label: "OpenAI", models: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"] },
  { value: "anthropic", label: "Anthropic", models: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229"] },
  { value: "azure_openai", label: "Azure OpenAI", models: [] },
  { value: "ollama", label: "Ollama (local)", models: ["llama3", "mistral", "codellama"] },
];

const PM_PROVIDERS = [
  { value: "jira", label: "JIRA" },
  { value: "asana", label: "Asana" },
  { value: "trello", label: "Trello" },
  { value: "azure_devops", label: "Azure DevOps" },
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"llm" | "integrations">("llm");
  const [llmForm, setLlmForm] = useState({
    provider: "openai",
    model: "gpt-4o",
    api_key: "",
    base_url: "",
    azure_deployment: "",
  });
  const [showAddIntegration, setShowAddIntegration] = useState(false);

  const { data: llmSettings } = useQuery<LLMSettings>({
    queryKey: ["llm-settings"],
    queryFn: async () => {
      const { data } = await api.get("/settings/llm");
      setLlmForm((prev) => ({
        ...prev,
        provider: data.provider,
        model: data.model,
        base_url: data.base_url ?? "",
        azure_deployment: data.azure_deployment ?? "",
      }));
      return data;
    },
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => (await api.get("/projects/")).data,
  });

  const { data: integrations = [] } = useQuery<PMIntegration[]>({
    queryKey: ["integrations"],
    queryFn: async () => (await api.get("/integrations/")).data,
  });

  const saveLLMMutation = useMutation({
    mutationFn: () => api.put("/settings/llm", {
      provider: llmForm.provider,
      model: llmForm.model,
      api_key: llmForm.api_key || null,
      base_url: llmForm.base_url || null,
      azure_deployment: llmForm.azure_deployment || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["llm-settings"] });
      toast.success("LLM settings saved");
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const deleteIntegration = useMutation({
    mutationFn: (id: string) => api.delete(`/integrations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations"] });
      toast.success("Integration removed");
    },
  });

  const currentProvider = PROVIDERS.find((p) => p.value === llmForm.provider);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-8">
        {[
          { key: "llm", label: "LLM Provider", icon: Cpu },
          { key: "integrations", label: "PM Integrations", icon: Plug },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as "llm" | "integrations")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "llm" && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">LLM Provider</h2>
          {llmSettings?.has_api_key && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
              API key saved (encrypted)
            </div>
          )}
          <div>
            <label className="label">Provider</label>
            <select
              className="input"
              value={llmForm.provider}
              onChange={(e) => setLlmForm({ ...llmForm, provider: e.target.value, model: "" })}
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Model</label>
            {currentProvider && currentProvider.models.length > 0 ? (
              <select
                className="input"
                value={llmForm.model}
                onChange={(e) => setLlmForm({ ...llmForm, model: e.target.value })}
              >
                {currentProvider.models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                placeholder="e.g. gpt-4o or custom deployment name"
                value={llmForm.model}
                onChange={(e) => setLlmForm({ ...llmForm, model: e.target.value })}
              />
            )}
          </div>
          <div>
            <label className="label">API Key</label>
            <input
              className="input"
              type="password"
              placeholder={llmSettings?.has_api_key ? "Leave blank to keep existing" : "sk-…"}
              value={llmForm.api_key}
              onChange={(e) => setLlmForm({ ...llmForm, api_key: e.target.value })}
            />
          </div>
          {(llmForm.provider === "ollama" || llmForm.provider === "azure_openai") && (
            <div>
              <label className="label">
                {llmForm.provider === "ollama" ? "Ollama Base URL" : "Azure Endpoint"}
              </label>
              <input
                className="input"
                placeholder={llmForm.provider === "ollama" ? "http://localhost:11434" : "https://….openai.azure.com"}
                value={llmForm.base_url}
                onChange={(e) => setLlmForm({ ...llmForm, base_url: e.target.value })}
              />
            </div>
          )}
          {llmForm.provider === "azure_openai" && (
            <div>
              <label className="label">Deployment Name</label>
              <input
                className="input"
                placeholder="my-gpt4-deployment"
                value={llmForm.azure_deployment}
                onChange={(e) => setLlmForm({ ...llmForm, azure_deployment: e.target.value })}
              />
            </div>
          )}
          <button
            className="btn-primary"
            onClick={() => saveLLMMutation.mutate()}
            disabled={saveLLMMutation.isPending}
          >
            {saveLLMMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
            ) : "Save LLM settings"}
          </button>
        </div>
      )}

      {tab === "integrations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">PM Tool Integrations</h2>
            <button className="btn-secondary" onClick={() => setShowAddIntegration(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add integration
            </button>
          </div>

          {integrations.length === 0 ? (
            <div className="card p-8 text-center text-gray-400">
              <Plug className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-sm">No integrations yet</p>
              <p className="text-xs mt-1">Connect JIRA, Asana, Trello, or Azure DevOps to export stories</p>
            </div>
          ) : (
            <div className="space-y-3">
              {integrations.map((i) => (
                <div key={i.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{i.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{i.provider.replace("_", " ")}</p>
                  </div>
                  <button
                    onClick={() => deleteIntegration.mutate(i.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showAddIntegration && (
            <AddIntegrationForm
              projects={projects}
              onClose={() => setShowAddIntegration(false)}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ["integrations"] });
                setShowAddIntegration(false);
                toast.success("Integration added");
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function AddIntegrationForm({
  projects,
  onClose,
  onSaved,
}: {
  projects: Project[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    project_id: projects[0]?.id ?? "",
    provider: "jira",
    name: "",
    credentials: {} as Record<string, string>,
    config: {} as Record<string, string>,
  });

  const CREDENTIAL_FIELDS: Record<string, { key: string; label: string; type?: string }[]> = {
    jira: [
      { key: "server", label: "JIRA Server URL" },
      { key: "email", label: "Email" },
      { key: "api_token", label: "API Token", type: "password" },
    ],
    asana: [{ key: "access_token", label: "Personal Access Token", type: "password" }],
    trello: [
      { key: "api_key", label: "API Key" },
      { key: "api_token", label: "API Token", type: "password" },
    ],
    azure_devops: [
      { key: "organization", label: "Organization" },
      { key: "personal_access_token", label: "Personal Access Token", type: "password" },
    ],
  };

  const CONFIG_FIELDS: Record<string, { key: string; label: string }[]> = {
    jira: [
      { key: "project_key", label: "Project Key (e.g. PROJ)" },
      { key: "issue_type", label: "Issue Type (default: Story)" },
    ],
    asana: [{ key: "project_gid", label: "Project GID" }],
    trello: [{ key: "list_id", label: "List ID" }],
    azure_devops: [
      { key: "project", label: "Project Name" },
      { key: "work_item_type", label: "Work Item Type (default: User Story)" },
    ],
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      api.post("/integrations/", {
        project_id: form.project_id,
        provider: form.provider,
        name: form.name,
        credentials: form.credentials,
        config: form.config,
      }),
    onSuccess: onSaved,
    onError: () => toast.error("Failed to add integration"),
  });

  return (
    <div className="card p-6 space-y-4">
      <h3 className="font-semibold text-gray-900">Add Integration</h3>
      <div>
        <label className="label">Project</label>
        <select className="input" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Provider</label>
        <select className="input" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value, credentials: {}, config: {} })}>
          {PM_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Integration Name</label>
        <input className="input" placeholder="My JIRA" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      {CREDENTIAL_FIELDS[form.provider]?.map((f) => (
        <div key={f.key}>
          <label className="label">{f.label}</label>
          <input
            className="input"
            type={f.type ?? "text"}
            value={form.credentials[f.key] ?? ""}
            onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, [f.key]: e.target.value } })}
          />
        </div>
      ))}
      {CONFIG_FIELDS[form.provider]?.map((f) => (
        <div key={f.key}>
          <label className="label">{f.label}</label>
          <input
            className="input"
            value={form.config[f.key] ?? ""}
            onChange={(e) => setForm({ ...form, config: { ...form.config, [f.key]: e.target.value } })}
          />
        </div>
      ))}
      <div className="flex gap-3">
        <button className="btn-primary" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name}>
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save integration"}
        </button>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

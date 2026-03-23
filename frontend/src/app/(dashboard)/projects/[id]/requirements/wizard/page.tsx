"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { api } from "@/lib/api";
import type {
  Project,
  WizardSuggestions,
  WizardFeatureSuggestions,
  WizardGenerateResponse,
  WizardUpdateResponse,
  WizardPrefillData,
  CurrentStateType,
  WizardFeature,
  FeaturePriority,
} from "@/types";
import { CURRENT_STATE_OPTIONS as STATE_OPTIONS, FEATURE_PRIORITY_OPTIONS } from "@/types";

// ── Wizard state ──────────────────────────────────────────────────────────────

interface WizardData {
  // Step 1
  productName: string;
  description: string;
  // Step 2
  executiveSummary: string;
  // Step 3
  businessProblem: string;
  businessObjectives: string[];
  currentStateType: CurrentStateType;
  currentStateNotes: string;
  desiredStateNotes: string;
  // Step 4
  features: WizardFeature[];
}

const INITIAL: WizardData = {
  productName: "",
  description: "",
  executiveSummary: "",
  businessProblem: "",
  businessObjectives: ["", "", ""],
  currentStateType: "new_product",
  currentStateNotes: "",
  desiredStateNotes: "",
  features: [],
};

const STEPS = [
  { number: 1, label: "Header" },
  { number: 2, label: "Executive Summary" },
  { number: 3, label: "Project Context" },
  { number: 4, label: "Features" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                step.number < current
                  ? "bg-brand-600 text-white"
                  : step.number === current
                  ? "bg-brand-600 text-white ring-4 ring-brand-100"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {step.number < current ? (
                <Check className="w-4 h-4" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={`text-xs font-medium ${
                step.number === current ? "text-brand-700" : "text-gray-400"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`h-px w-12 sm:w-20 mb-5 mx-1 transition-colors ${
                step.number < current ? "bg-brand-400" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function FieldLabel({
  label,
  required,
  hint,
}: {
  label: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1.5">
      <label className="block text-sm font-medium text-gray-800">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function SuggestionChip({
  text,
  onApply,
}: {
  text: string;
  onApply: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onApply}
      className="flex items-start gap-1.5 text-left w-full rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800 hover:bg-brand-100 transition-colors"
    >
      <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-brand-400" />
      <span className="leading-snug">{text}</span>
    </button>
  );
}

// ── Step 1: Header Info ────────────────────────────────────────────────────────

function Step1({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <FieldLabel
          label="Product name"
          required
          hint="The name of the product or system you are building."
        />
        <input
          type="text"
          value={data.productName}
          onChange={(e) => onChange({ productName: e.target.value })}
          placeholder="e.g. Acme Scheduler"
          className="input w-full"
          autoFocus
        />
      </div>
      <div>
        <FieldLabel
          label="Brief description"
          required
          hint="One or two sentences describing what the product does and for whom."
        />
        <textarea
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="e.g. An online appointment scheduling tool for small service businesses to eliminate phone-based booking."
          rows={3}
          className="input w-full resize-none"
        />
      </div>
    </div>
  );
}

// ── Step 2: Executive Summary ─────────────────────────────────────────────────

function Step2({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
        Write 1–3 paragraphs for a <strong>non-technical stakeholder</strong>{" "}
        covering: the problem, who it is for, and the intended outcome.
      </div>
      <div>
        <FieldLabel label="Executive summary" required />
        <textarea
          value={data.executiveSummary}
          onChange={(e) => onChange({ executiveSummary: e.target.value })}
          placeholder={
            "Small service businesses spend 5–10 hours per week managing appointments by phone and email…\n\nThis product is for…\n\nOnce deployed, the outcome will be…"
          }
          rows={10}
          className="input w-full resize-y"
        />
      </div>
    </div>
  );
}

// ── Step 3: Project Context ───────────────────────────────────────────────────

function Step3({
  data,
  onChange,
  suggestions,
  loadingSuggestions,
  onGetSuggestions,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
  suggestions: WizardSuggestions | null;
  loadingSuggestions: boolean;
  onGetSuggestions: () => void;
}) {
  const updateObjective = (index: number, value: string) => {
    const updated = [...data.businessObjectives];
    updated[index] = value;
    onChange({ businessObjectives: updated });
  };

  const addObjective = () => {
    onChange({ businessObjectives: [...data.businessObjectives, ""] });
  };

  const removeObjective = (index: number) => {
    const updated = data.businessObjectives.filter((_, i) => i !== index);
    onChange({ businessObjectives: updated.length ? updated : [""] });
  };

  const showCurrentStateNotes = data.currentStateType !== "new_product";

  return (
    <div className="space-y-6">
      {/* AI Suggestions button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Fill in the fields below or let AI suggest content based on your
          previous answers.
        </p>
        <button
          type="button"
          onClick={onGetSuggestions}
          disabled={loadingSuggestions}
          className="btn-secondary text-xs flex items-center gap-1.5 shrink-0 ml-4"
        >
          {loadingSuggestions ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Thinking…
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Get AI suggestions
            </>
          )}
        </button>
      </div>

      {/* Business Problem */}
      <div>
        <FieldLabel
          label="Business problem statement"
          required
          hint="Describe the core business pain or gap this product addresses (2–4 sentences)."
        />
        {suggestions?.business_problem && !data.businessProblem && (
          <SuggestionChip
            text={suggestions.business_problem}
            onApply={() =>
              onChange({ businessProblem: suggestions.business_problem })
            }
          />
        )}
        <textarea
          value={data.businessProblem}
          onChange={(e) => onChange({ businessProblem: e.target.value })}
          placeholder="e.g. Service businesses lose an average of 15% of bookings due to scheduling errors and missed follow-ups…"
          rows={4}
          className="input w-full resize-none mt-2"
        />
      </div>

      {/* Business Objectives */}
      <div>
        <FieldLabel
          label="Business objectives"
          required
          hint={'Use "To [verb] [metric] by [target]" format where possible. Add at least one.'}
        />
        {suggestions?.business_objectives && (
          <div className="space-y-1.5 mb-2">
            {suggestions.business_objectives
              .filter(
                (s) =>
                  !data.businessObjectives.some(
                    (o) => o.trim() === s.trim()
                  )
              )
              .map((sug, i) => (
                <SuggestionChip
                  key={i}
                  text={sug}
                  onApply={() => {
                    const empty = data.businessObjectives.findIndex(
                      (o) => !o.trim()
                    );
                    if (empty !== -1) {
                      updateObjective(empty, sug);
                    } else {
                      onChange({
                        businessObjectives: [
                          ...data.businessObjectives,
                          sug,
                        ],
                      });
                    }
                  }}
                />
              ))}
          </div>
        )}
        <div className="space-y-2 mt-2">
          {data.businessObjectives.map((obj, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={obj}
                onChange={(e) => updateObjective(i, e.target.value)}
                placeholder={`Objective ${i + 1}…`}
                className="input flex-1"
              />
              {data.businessObjectives.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeObjective(i)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                  aria-label={`Remove objective ${i + 1}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addObjective}
            className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Add objective
          </button>
        </div>
      </div>

      {/* Current State */}
      <div>
        <FieldLabel label="Current state" />
        <select
          value={data.currentStateType}
          onChange={(e) =>
            onChange({ currentStateType: e.target.value as CurrentStateType })
          }
          className="input w-full"
        >
          {STATE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {showCurrentStateNotes && (
          <div className="mt-3">
            <FieldLabel
              label="Describe the current state (optional)"
              hint="How does this work today, and why is it a problem?"
            />
            {suggestions?.current_state_notes && !data.currentStateNotes && (
              <SuggestionChip
                text={suggestions.current_state_notes}
                onApply={() =>
                  onChange({
                    currentStateNotes: suggestions.current_state_notes,
                  })
                }
              />
            )}
            <textarea
              value={data.currentStateNotes}
              onChange={(e) => onChange({ currentStateNotes: e.target.value })}
              placeholder="e.g. Bookings are currently managed via phone calls…"
              rows={3}
              className="input w-full resize-none mt-2"
            />
          </div>
        )}
      </div>

      {/* Desired State */}
      <div>
        <FieldLabel
          label="Desired future state (optional)"
          hint="Describe what success looks like once the product is built."
        />
        {suggestions?.desired_state_notes && !data.desiredStateNotes && (
          <SuggestionChip
            text={suggestions.desired_state_notes}
            onApply={() =>
              onChange({ desiredStateNotes: suggestions.desired_state_notes })
            }
          />
        )}
        <textarea
          value={data.desiredStateNotes}
          onChange={(e) => onChange({ desiredStateNotes: e.target.value })}
          placeholder="e.g. Customers self-schedule online via a branded booking page…"
          rows={3}
          className="input w-full resize-none mt-2"
        />
      </div>
    </div>
  );
}

// ── Step 4: Features ─────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<FeaturePriority, string> = {
  must_have:    "bg-red-50 text-red-700 border-red-200",
  nice_to_have: "bg-amber-50 text-amber-700 border-amber-200",
  future:       "bg-blue-50 text-blue-700 border-blue-200",
};

function Step4({
  data,
  onChange,
  featureSuggestions,
  loadingFeatureSuggestions,
  onGetFeatureSuggestions,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
  featureSuggestions: WizardFeature[] | null;
  loadingFeatureSuggestions: boolean;
  onGetFeatureSuggestions: () => void;
}) {
  const updateDescription = (index: number, value: string) => {
    const updated = data.features.map((f, i) =>
      i === index ? { ...f, description: value } : f
    );
    onChange({ features: updated });
  };

  const updatePriority = (index: number, value: FeaturePriority) => {
    const updated = data.features.map((f, i) =>
      i === index ? { ...f, priority: value } : f
    );
    onChange({ features: updated });
  };

  const addFeature = (description = "", priority: FeaturePriority = "must_have") => {
    onChange({ features: [...data.features, { description, priority }] });
  };

  const removeFeature = (index: number) => {
    onChange({ features: data.features.filter((_, i) => i !== index) });
  };

  const applyFeatureSuggestion = (feat: WizardFeature) => {
    // Only apply if not already present
    const alreadyAdded = data.features.some(
      (f) => f.description.trim().toLowerCase() === feat.description.trim().toLowerCase()
    );
    if (!alreadyAdded) {
      addFeature(feat.description, feat.priority as FeaturePriority);
    }
  };

  const pendingSuggestions = featureSuggestions?.filter(
    (s) =>
      !data.features.some(
        (f) => f.description.trim().toLowerCase() === s.description.trim().toLowerCase()
      )
  ) ?? [];

  const hasFeatures = data.features.length > 0;

  return (
    <div className="space-y-5">
      {/* Header row with AI button */}
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-gray-600">
          List the capabilities the system should deliver. Assign a priority to
          each one. <span className="text-red-500">*</span>
        </p>
        <button
          type="button"
          onClick={onGetFeatureSuggestions}
          disabled={loadingFeatureSuggestions}
          className="btn-secondary text-xs flex items-center gap-1.5 shrink-0"
        >
          {loadingFeatureSuggestions ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Thinking…
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Get AI suggestions
            </>
          )}
        </button>
      </div>

      {/* AI suggestion chips */}
      {pendingSuggestions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
            AI suggestions — click to add
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {pendingSuggestions.map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applyFeatureSuggestion(sug)}
                className="flex items-center gap-2 text-left w-full rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 hover:bg-brand-100 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0 text-brand-400" />
                <span className="text-sm text-brand-800 flex-1 leading-snug">
                  {sug.description}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${PRIORITY_COLORS[sug.priority as FeaturePriority]}`}
                >
                  {FEATURE_PRIORITY_OPTIONS.find((o) => o.value === sug.priority)?.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feature list */}
      {!hasFeatures && !featureSuggestions && (
        <button
          type="button"
          onClick={() => addFeature()}
          className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700"
        >
          <Plus className="w-4 h-4" />
          Add a feature
        </button>
      )}

      {hasFeatures && (
        <div className="space-y-3">
          {/* Column headers */}
          <div className="flex gap-2 items-center px-0.5">
            <span className="text-xs text-gray-400 font-mono w-12 shrink-0">ID</span>
            <span className="text-xs text-gray-400 flex-1">Description</span>
            <span className="text-xs text-gray-400 w-36 shrink-0">Priority</span>
            <span className="w-5" />
          </div>

          {data.features.map((feat, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-xs text-gray-400 font-mono w-12 shrink-0">
                FR-{String(i + 1).padStart(3, "0")}
              </span>
              <input
                type="text"
                value={feat.description}
                onChange={(e) => updateDescription(i, e.target.value)}
                placeholder="e.g. Book appointments via a public booking page"
                className="input flex-1"
                autoFocus={i === data.features.length - 1 && feat.description === ""}
              />
              <select
                value={feat.priority}
                onChange={(e) => updatePriority(i, e.target.value as FeaturePriority)}
                className={`input w-36 shrink-0 text-xs font-medium border rounded-md py-1.5 px-2 ${PRIORITY_COLORS[feat.priority]}`}
                aria-label={`Priority for feature ${i + 1}`}
              >
                {FEATURE_PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeFeature(i)}
                className="text-gray-300 hover:text-red-400 transition-colors"
                aria-label={`Remove feature ${i + 1}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addFeature()}
            className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 mt-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add another feature
          </button>
        </div>
      )}

      {/* Validation hint */}
      {!hasFeatures && featureSuggestions !== null && (
        <p className="text-xs text-red-500">
          Add at least one feature to continue.
        </p>
      )}
    </div>
  );
}

// ── Main Wizard Page ──────────────────────────────────────────────────────────

export default function WizardPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const documentId = searchParams.get("documentId");
  const isUpdate = Boolean(documentId);

  const { data: project } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: async () => (await api.get(`/projects/${projectId}`)).data,
  });

  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(INITIAL);
  const [prefillLoading, setPrefillLoading] = useState(isUpdate);
  const [suggestions, setSuggestions] = useState<WizardSuggestions | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [featureSuggestions, setFeatureSuggestions] = useState<WizardFeatureSuggestions | null>(null);
  const [loadingFeatureSuggestions, setLoadingFeatureSuggestions] = useState(false);
  const [generating, setGenerating] = useState(false);

  const onChange = useCallback((patch: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  // Pre-populate wizard when editing an existing document
  useEffect(() => {
    if (!documentId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<WizardPrefillData>(
          `/req-assistant/${projectId}/wizard/prefill/${documentId}`
        );
        if (!cancelled) {
          const p = res.data;
          setData({
            productName: p.product_name,
            description: p.description,
            executiveSummary: p.executive_summary,
            businessProblem: p.business_problem,
            businessObjectives:
              p.business_objectives.length > 0 ? p.business_objectives : ["", "", ""],
            currentStateType: p.current_state_type || "new_product",
            currentStateNotes: p.current_state_notes,
            desiredStateNotes: p.desired_state_notes,
            features: p.features,
          });
        }
      } catch {
        // Pre-fill failed silently — user can fill in manually
      } finally {
        if (!cancelled) setPrefillLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [documentId, projectId]);

  // ── Step validations
  const step1Valid = data.productName.trim().length > 0 && data.description.trim().length > 0;
  const step2Valid = data.executiveSummary.trim().length > 0;
  const step3Valid =
    data.businessProblem.trim().length > 0 &&
    data.businessObjectives.some((o) => o.trim().length > 0);
  const step4Valid = data.features.some((f) => f.description.trim().length > 0);

  const canAdvance =
    step === 1 ? step1Valid
    : step === 2 ? step2Valid
    : step === 3 ? step3Valid
    : step4Valid;

  const handleGetSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await api.post<WizardSuggestions>(
        `/req-assistant/${projectId}/wizard/suggestions`,
        {
          product_name: data.productName,
          description: data.description,
          executive_summary: data.executiveSummary,
        }
      );
      setSuggestions(res.data);
    } catch {
      toast.error("Could not generate suggestions — check your LLM settings");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleGetFeatureSuggestions = async () => {
    setLoadingFeatureSuggestions(true);
    try {
      const res = await api.post<WizardFeatureSuggestions>(
        `/req-assistant/${projectId}/wizard/feature-suggestions`,
        {
          product_name: data.productName,
          description: data.description,
          executive_summary: data.executiveSummary,
          business_problem: data.businessProblem,
          business_objectives: data.businessObjectives.filter((o) => o.trim()),
        }
      );
      setFeatureSuggestions(res.data);
    } catch {
      toast.error("Could not generate feature suggestions — check your LLM settings");
    } finally {
      setLoadingFeatureSuggestions(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const body = {
      product_name: data.productName,
      description: data.description,
      executive_summary: data.executiveSummary,
      business_problem: data.businessProblem,
      business_objectives: data.businessObjectives.filter((o) => o.trim()),
      current_state_type: data.currentStateType,
      current_state_notes: data.currentStateNotes,
      desired_state_notes: data.desiredStateNotes,
      features: data.features.filter((f) => f.description.trim()),
    };
    try {
      if (isUpdate && documentId) {
        const res = await api.post<WizardUpdateResponse>(
          `/req-assistant/${projectId}/wizard/update/${documentId}`,
          body
        );
        toast.success(`Saved as version ${res.data.version_number}`);
      } else {
        await api.post<WizardGenerateResponse>(
          `/req-assistant/${projectId}/wizard/generate`,
          body
        );
        toast.success("Requirements document created!");
      }
      router.push(`/projects/${projectId}`);
    } catch {
      toast.error(isUpdate ? "Update failed — please try again" : "Generation failed — please try again");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Loading overlay while prefill is fetching */}
      {prefillLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <p className="text-sm">Loading document…</p>
        </div>
      )}

      {!prefillLoading && <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
        <button onClick={() => router.push("/dashboard")} className="hover:text-gray-600">
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
        <span className="text-gray-700 font-medium">
          {isUpdate ? "Edit with Wizard" : "Requirements Wizard"}
        </span>
      </div>

      {/* Title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
          <Wand2 className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isUpdate ? "Edit with Wizard" : "Requirements Wizard"}
          </h1>
          <p className="text-sm text-gray-500">
            {isUpdate
              ? "Update your answers and save a new version of the document."
              : "Answer a few questions and we\u2019ll generate a starter requirements document."}
          </p>
        </div>
      </div>

      <StepIndicator current={step} />

      {/* Step card */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          {step === 1 && "Step 1 — Product overview"}
          {step === 2 && "Step 2 — Executive summary"}
          {step === 3 && "Step 3 — Project context & objectives"}
          {step === 4 && "Step 4 — Features *"}
        </h2>

        {step === 1 && <Step1 data={data} onChange={onChange} />}
        {step === 2 && <Step2 data={data} onChange={onChange} />}
        {step === 3 && (
          <Step3
            data={data}
            onChange={onChange}
            suggestions={suggestions}
            loadingSuggestions={loadingSuggestions}
            onGetSuggestions={handleGetSuggestions}
          />
        )}
        {step === 4 && (
          <Step4
            data={data}
            onChange={onChange}
            featureSuggestions={featureSuggestions?.features ?? null}
            loadingFeatureSuggestions={loadingFeatureSuggestions}
            onGetFeatureSuggestions={handleGetFeatureSuggestions}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-5">
        <button
          onClick={() =>
            step > 1 ? setStep(step - 1) : router.push(`/projects/${projectId}`)
          }
          className="btn-secondary text-sm flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 1 ? "Cancel" : "Back"}
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canAdvance}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
                       onClick={handleGenerate}
                       disabled={generating || !step4Valid}
                       className="btn-primary text-sm flex items-center gap-2"
                     >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {isUpdate ? "Save new version" : "Generate document"}
              </>
            )}
          </button>
        )}
      </div>

      {/* Progress hint */}
      <p className="text-center text-xs text-gray-400 mt-4">
        Step {step} of {STEPS.length}
        {" · Required fields marked with "}
        <span className="text-red-400">*</span>
      </p>
      </>}
    </div>
  );
}

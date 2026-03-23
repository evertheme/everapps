"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
  WizardGenerateResponse,
  CurrentStateType,
} from "@/types";
import { CURRENT_STATE_OPTIONS as STATE_OPTIONS } from "@/types";

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
  mustHaveFeatures: string[];
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
  mustHaveFeatures: [],
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

// ── Step 4: Must-Have Features ────────────────────────────────────────────────

function Step4({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}) {
  const updateFeature = (index: number, value: string) => {
    const updated = [...data.mustHaveFeatures];
    updated[index] = value;
    onChange({ mustHaveFeatures: updated });
  };

  const addFeature = () => {
    onChange({ mustHaveFeatures: [...data.mustHaveFeatures, ""] });
  };

  const removeFeature = (index: number) => {
    onChange({
      mustHaveFeatures: data.mustHaveFeatures.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
        List the capabilities the system <strong>must</strong> deliver for the
        product to be considered successful. These will become{" "}
        <em>Must-have</em> functional requirements.{" "}
        <span className="text-gray-400">(Optional — you can skip this step.)</span>
      </div>

      {data.mustHaveFeatures.length === 0 ? (
        <button
          type="button"
          onClick={addFeature}
          className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700"
        >
          <Plus className="w-4 h-4" />
          Add a must-have feature
        </button>
      ) : (
        <div className="space-y-2">
          {data.mustHaveFeatures.map((feat, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-xs text-gray-400 font-mono w-12 shrink-0">
                FR-{String(i + 1).padStart(3, "0")}
              </span>
              <input
                type="text"
                value={feat}
                onChange={(e) => updateFeature(i, e.target.value)}
                placeholder="e.g. Book appointments via a public booking page"
                className="input flex-1"
                autoFocus={i === data.mustHaveFeatures.length - 1}
              />
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
            onClick={addFeature}
            className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 mt-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add another feature
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Wizard Page ──────────────────────────────────────────────────────────

export default function WizardPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: project } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: async () => (await api.get(`/projects/${projectId}`)).data,
  });

  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(INITIAL);
  const [suggestions, setSuggestions] = useState<WizardSuggestions | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [generating, setGenerating] = useState(false);

  const onChange = useCallback((patch: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  // ── Step 1 validation
  const step1Valid = data.productName.trim().length > 0 && data.description.trim().length > 0;
  // ── Step 2 validation
  const step2Valid = data.executiveSummary.trim().length > 0;
  // ── Step 3 validation
  const step3Valid =
    data.businessProblem.trim().length > 0 &&
    data.businessObjectives.some((o) => o.trim().length > 0);

  const canAdvance =
    step === 1 ? step1Valid : step === 2 ? step2Valid : step === 3 ? step3Valid : true;

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

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.post<WizardGenerateResponse>(
        `/req-assistant/${projectId}/wizard/generate`,
        {
          product_name: data.productName,
          description: data.description,
          executive_summary: data.executiveSummary,
          business_problem: data.businessProblem,
          business_objectives: data.businessObjectives.filter((o) => o.trim()),
          current_state_type: data.currentStateType,
          current_state_notes: data.currentStateNotes,
          desired_state_notes: data.desiredStateNotes,
          must_have_features: data.mustHaveFeatures.filter((f) => f.trim()),
        }
      );
      toast.success("Requirements document created!");
      router.push(`/projects/${projectId}`);
    } catch {
      toast.error("Generation failed — please try again");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
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
        <span className="text-gray-700 font-medium">Requirements Wizard</span>
      </div>

      {/* Title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
          <Wand2 className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Requirements Wizard
          </h1>
          <p className="text-sm text-gray-500">
            Answer a few questions and we&apos;ll generate a starter requirements
            document.
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
          {step === 4 && "Step 4 — Must-have features"}
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
        {step === 4 && <Step4 data={data} onChange={onChange} />}
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
            disabled={generating}
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
                Generate document
              </>
            )}
          </button>
        )}
      </div>

      {/* Progress hint */}
      <p className="text-center text-xs text-gray-400 mt-4">
        Step {step} of {STEPS.length}
        {step < 4 && " · Required fields marked with "}
        {step < 4 && <span className="text-red-400">*</span>}
      </p>
    </div>
  );
}

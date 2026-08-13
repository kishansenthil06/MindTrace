import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Save, Sparkles, Wand2 } from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { CapturePanel } from "@/components/assessment/CapturePanel";
import { StepRail } from "@/components/assessment/StepRail";
import { NumericField } from "@/components/assessment/NumericField";
import { AnalysisTransition } from "@/components/assessment/AnalysisTransition";
import { Disclaimer, ErrorState, PageHeader, SectionLabel } from "@/components/common";
import { ALL_FIELDS, DEFAULT_INPUTS, DEMO_INPUTS, FIELD_GROUPS } from "@/lib/fields";
import { analyzeAssessment } from "@/lib/api";
import { useStore } from "@/lib/store";

const DRAFT_KEY = "mindtrace-draft";
const STEPS = ["Facial signal", "Speech signal", "Self-report", "Behavioral", "Facial", "Acoustic", "Physiological", "Review"];
const GROUP_BY_STEP = { 2: "self_report", 3: "behavioral", 4: "facial", 5: "acoustic", 6: "physiological" };

const readDraft = () => {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null") || {};
  } catch {
    return {};
  }
};

function CaptureStep({ title, description, children, chips }) {
  return (
    <div>
      <SectionLabel className="text-cyan-400/80">Signal capture</SectionLabel>
      <h2 className="mt-2 font-display text-2xl font-medium">{title}</h2>
      <p className="mt-2 max-w-lg text-sm text-slate-400">{description}</p>
      <div className="mt-6">{children}</div>
      {chips && (
        <div className="mt-5 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span key={chip} className="rounded-full border border-[#262A38] bg-[#0F1118] px-3 py-1.5 text-[11px] text-slate-400">
              {chip}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupStep({ group, inputs, update }) {
  return (
    <div>
      <SectionLabel className="text-cyan-400/80">{group.label} indicators</SectionLabel>
      <h2 className="mt-2 font-display text-2xl font-medium">{group.title}</h2>
      <p className="mt-2 max-w-xl text-sm text-slate-400">{group.description}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {group.fields.map((field) => (
          <NumericField key={field.key} field={field} value={inputs[field.key]} onChange={(value) => update(field.key, value)} />
        ))}
      </div>
    </div>
  );
}

export default function Assessment() {
  const navigate = useNavigate();
  const { saveResult, refreshHistory } = useStore();
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState(() => ({ ...DEFAULT_INPUTS, ...readDraft() }));
  const [photoCaptured, setPhotoCaptured] = useState(false);
  const [audioCaptured, setAudioCaptured] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const update = (key, value) => setInputs((prev) => ({ ...prev, [key]: value }));

  const invalidFields = useMemo(
    () => ALL_FIELDS.filter((field) => {
      const value = inputs[field.key];
      return value === "" || Number.isNaN(Number(value)) || value < field.min || value > field.max;
    }),
    [inputs]
  );

  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(inputs));
    toast.success("Draft saved on this device");
  };

  const loadDemo = () => {
    setInputs({ ...DEMO_INPUTS });
    toast.success("Demo profile loaded");
  };

  const submit = async () => {
    if (invalidFields.length) {
      toast.error(`Check ${invalidFields[0].label} — value is out of range`);
      return;
    }
    setError("");
    setAnalyzing(true);
    const started = Date.now();
    try {
      const result = await analyzeAssessment(inputs);
      const elapsed = Date.now() - started;
      if (elapsed < 2300) await new Promise((resolve) => setTimeout(resolve, 2300 - elapsed));
      saveResult(result);
      refreshHistory();
      localStorage.removeItem(DRAFT_KEY);
      setAnalyzing(false);
      navigate("/results");
    } catch {
      setAnalyzing(false);
      setError("We couldn't complete the assessment. Please try again.");
      setStep(STEPS.length - 1);
    }
  };

  const renderStep = () => {
    if (step === 0)
      return (
        <CaptureStep
          title="Facial analysis"
          description="Capture a still frame so the session has a facial reference. The image stays in your browser."
          chips={["Expression framing", "Local only", "Retake anytime"]}
        >
          <CapturePanel type="camera" captured={photoCaptured} setCaptured={setPhotoCaptured} />
        </CaptureStep>
      );
    if (step === 1)
      return (
        <CaptureStep
          title="Speech analysis"
          description="Record a short spoken sample. Nothing is recorded until you press record."
          chips={["Press record to start", "Preview before continuing", "Local only"]}
        >
          <CapturePanel type="audio" captured={audioCaptured} setCaptured={setAudioCaptured} />
        </CaptureStep>
      );
    if (GROUP_BY_STEP[step]) {
      const group = FIELD_GROUPS.find((item) => item.id === GROUP_BY_STEP[step]);
      return <GroupStep group={group} inputs={inputs} update={update} />;
    }
    return (
      <div>
        <SectionLabel className="text-cyan-400/80">Review</SectionLabel>
        <h2 className="mt-2 font-display text-2xl font-medium">Assessment ready</h2>
        <p className="mt-2 max-w-xl text-sm text-slate-400">
          Confirm the captured signals, then run the analysis. You can step back to change any value.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2" data-testid="review-checklist">
          {[
            ["Facial signal", photoCaptured ? "Photo captured" : "Optional — not captured"],
            ["Speech signal", audioCaptured ? "Recording captured" : "Optional — not captured"],
            ...FIELD_GROUPS.map((group) => [
              `${group.label} information`,
              `${group.fields.length} indicators ready`,
            ]),
          ].map(([label, value]) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border border-[#22262f] bg-[#0F1118] px-4 py-3">
              <span className="grid h-6 w-6 place-items-center rounded-full border border-emerald-400/50 bg-emerald-400/10 text-emerald-300">
                <Check size={12} />
              </span>
              <div className="min-w-0">
                <b className="block truncate text-xs font-medium text-slate-200">{label}</b>
                <small className="text-[11px] text-slate-500">{value}</small>
              </div>
            </div>
          ))}
        </div>
        {invalidFields.length > 0 && (
          <p className="mt-5 text-xs text-red-400" data-testid="review-validation-error">
            {invalidFields.length} value{invalidFields.length > 1 ? "s" : ""} out of range — starting with {invalidFields[0].label}.
          </p>
        )}
        {error && <div className="mt-6"><ErrorState message={error} onRetry={submit} testId="assessment-error" /></div>}
        <Disclaimer className="mt-6" testId="assessment-disclaimer" />
      </div>
    );
  };

  return (
    <>
      <AnalysisTransition active={analyzing} />
      <PageTransition testId="assessment-page">
        <PageHeader
          eyebrow={`Step ${step + 1} of ${STEPS.length}`}
          title="Start an Assessment"
          description="Provide the available information and let MindTrace analyze the patterns."
          actions={
            <>
              <button className="btn-secondary" onClick={loadDemo} data-testid="populate-demo-data-button">
                <Wand2 size={14} /> Populate demo data
              </button>
              <button className="btn-ghost" onClick={saveDraft} data-testid="save-draft-button">
                <Save size={14} /> Save draft
              </button>
            </>
          }
        />

        <StepRail steps={STEPS} current={step} onSelect={setStep} />

        <motion.section
          key={step}
          className="mt-card p-6 sm:p-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          data-testid={`assessment-step-panel-${step}`}
        >
          {renderStep()}
        </motion.section>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            className="btn-secondary"
            onClick={() => setStep((value) => Math.max(value - 1, 0))}
            disabled={step === 0}
            data-testid="assessment-back-button"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-xs text-slate-500 sm:block" data-testid="step-counter">
              {step + 1} / {STEPS.length}
            </span>
            {step < STEPS.length - 1 ? (
              <button className="btn-primary" onClick={() => setStep((value) => value + 1)} data-testid="assessment-next-button">
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button className="btn-primary px-6" onClick={submit} disabled={analyzing} data-testid="run-multimodal-assessment-button">
                <Sparkles size={15} /> Analyze My Assessment
              </button>
            )}
          </div>
        </div>
      </PageTransition>
    </>
  );
}

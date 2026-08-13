import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, ArrowRight, BarChart3, Brain, Camera, ClipboardList, HeartPulse, Mic, Waves } from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { Disclaimer, EmptyState, PageHeader, ProbabilityBars, SectionLabel, Skeleton, StatusPill, fadeUp, staggerContainer } from "@/components/common";
import { fetchAssessment, formatDate, formatTime, statusMeta } from "@/lib/api";
import { useStore } from "@/lib/store";

const MODALITY_META = {
  self_report: { icon: ClipboardList, label: "Self-report" },
  facial: { icon: Camera, label: "Facial signal" },
  speech: { icon: Mic, label: "Speech signal" },
  behavior: { icon: Activity, label: "Behavioral" },
  physiology: { icon: HeartPulse, label: "Physiological" },
};

function ConfidenceRing({ value = 0, color }) {
  const safeVal = typeof value === "number" && !isNaN(value) ? value : 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative grid h-36 w-36 place-items-center" data-testid="confidence-ring">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="#1C1F2B" strokeWidth="8" />
        <motion.circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (circumference * safeVal) / 100 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.25 }}
        />
      </svg>
      <div className="text-center">
        <p className="font-display text-3xl font-semibold leading-none" data-testid="result-confidence-score">
          {safeVal.toFixed(0)}%
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">confidence</p>
      </div>
    </div>
  );
}

export default function Results() {
  const location = useLocation();
  const store = useStore();
  const result = location.state?.result || store.result;
  const { saveResult, history, historyState } = store;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (result || historyState !== "ready" || !history.length) return;
    setLoading(true);
    fetchAssessment(history[0].id)
      .then(saveResult)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [result, history, historyState, saveResult]);

  if (loading || (!result && historyState === "loading")) {
    return (
      <PageTransition testId="results-loading">
        <Skeleton className="h-10 w-64" />
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </PageTransition>
    );
  }

  if (!result) {
    return (
      <PageTransition testId="results-empty">
        <PageHeader eyebrow="Results" title="Your Assessment" description="AI-generated mental-health assessment." />
        <EmptyState
          testId="results-empty-state"
          title="No assessment yet"
          description="Run your first analysis and your report will appear here."
          action={
            <button className="btn-primary" onClick={() => navigate("/assessment")} data-testid="empty-start-assessment">
              Start Your First Assessment <ArrowRight size={14} />
            </button>
          }
        />
      </PageTransition>
    );
  }

  const meta = statusMeta(result.mental_health_status);
  const modalities = Object.entries(result.modalities || {});

  return (
    <PageTransition testId="results-page" wide>
      <PageHeader
        eyebrow="Assessment report"
        title="Your Assessment"
        description="AI-generated mental-health assessment."
        actions={
          <>
            <Link to="/explainability" className="btn-secondary" data-testid="results-explain-link">
              <Brain size={14} /> Why this prediction?
            </Link>
            <Link to="/assessment" className="btn-primary" data-testid="results-new-assessment">
              New assessment
            </Link>
          </>
        }
      />

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <motion.section
          variants={fadeUp}
          className="mt-card relative overflow-hidden p-7 sm:p-9"
          data-testid="result-hero-card"
        >
          <div
            className="absolute inset-0"
            style={{ background: `radial-gradient(70% 90% at 12% 0%, ${meta.soft}, transparent 68%)` }}
          />
          <div className="relative flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <div>
              <SectionLabel>Predicted status</SectionLabel>
              <motion.h2
                className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl"
                style={{ color: meta.color }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                data-testid="results-status"
              >
                {result.mental_health_status}
              </motion.h2>
              <p className="mt-3 font-mono text-xs text-slate-400">
                {formatDate(result.timestamp)} · {formatTime(result.timestamp)} · model {result.model_version}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <StatusPill status={result.mental_health_status} testId="results-status-pill" />
                <span className="rounded-full border border-[#262A38] bg-[#0F1118] px-3 py-1 text-xs text-slate-400">
                  id {result.id?.slice(0, 8)}
                </span>
              </div>
            </div>
            <ConfidenceRing value={result.confidence} color={meta.color} />
          </div>
        </motion.section>

        <motion.section variants={fadeUp} className="mt-card p-7" data-testid="probability-card">
          <SectionLabel>Classification distribution</SectionLabel>
          <p className="mb-6 mt-2 text-xs text-slate-500">Probability assigned to each class by the deployed model.</p>
          <ProbabilityBars probabilities={result.probabilities} />
        </motion.section>
      </motion.div>

      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="mt-card mt-5 p-7"
        data-testid="model-summary-card"
      >
        <SectionLabel>What the model found</SectionLabel>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300" data-testid="assessment-summary">
          {result.assessment_summary}
        </p>
      </motion.section>

      <section className="mt-5" data-testid="severity-section">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <SectionLabel className="text-cyan-400/80">Psychological severity</SectionLabel>
            <h3 className="mt-2 font-display text-xl font-medium">Depression · Anxiety · Stress</h3>
          </div>
          <p className="text-xs text-slate-500" data-testid="score-source">Source: {result.score_source}</p>
        </div>
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-3">
          {[
            ["Depression", result?.scores?.depression, 34],
            ["Anxiety", result?.scores?.anxiety, 24],
            ["Stress", result?.scores?.stress, 39],
          ].map(([label, value, max]) => {
            const safeVal = typeof value === "number" && !isNaN(value) ? value : 0;
            return (
              <motion.div
                key={label}
                variants={fadeUp}
                className="mt-card p-5"
                data-testid={`severity-card-${label.toLowerCase()}`}
              >
                <div className="flex items-baseline justify-between">
                  <SectionLabel>{label}</SectionLabel>
                  <span className="font-mono text-[11px] text-slate-500">/ {max}</span>
                </div>
                <p className="mt-3 font-display text-2xl font-semibold">{safeVal.toFixed(1)}</p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#1C1F2B]">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((safeVal / max) * 100, 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      <section className="mt-8" data-testid="modality-section">
        <SectionLabel className="text-cyan-400/80">Modality influence</SectionLabel>
        <h3 className="mt-2 font-display text-xl font-medium">Where the signal came from</h3>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          {modalities.map(([key, value]) => {
            const info = MODALITY_META[key] || { icon: Waves, label: key };
            const labelStr = typeof value === "object" && value !== null ? value.label : String(value ?? "");
            const contrib = typeof value === "object" && value !== null ? Number(value.contribution ?? 0) : 0;
            const safeContrib = !isNaN(contrib) ? contrib : 0;
            return (
              <motion.div
                key={key}
                variants={fadeUp}
                className="mt-card mt-card-hover p-5"
                data-testid={`modality-card-${key}`}
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-[#262A38] bg-[#0A0B10] text-cyan-400">
                  <info.icon size={15} />
                </span>
                <b className="mt-4 block text-sm font-medium">{info.label}</b>
                <small className="mt-1 block truncate text-xs text-slate-500">{labelStr}</small>
                <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Influence</span>
                  <span className="font-mono text-slate-300">{safeContrib}%</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#1C1F2B]">
                  <motion.div
                    className="h-full rounded-full bg-cyan-400/80"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(safeContrib, 100)}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="mt-card p-7" data-testid="insights-card">
          <SectionLabel>Model notes</SectionLabel>
          <ul className="mt-4 space-y-3">
            {(result.insights || []).map((insight, index) => (
              <li key={index} className="flex gap-3 text-sm leading-relaxed text-slate-400">
                <i className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/70" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-5">
          <Link to="/insights" className="mt-card mt-card-hover flex items-center gap-4 p-6" data-testid="results-insights-link">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-[#262A38] bg-[#0A0B10] text-cyan-400">
              <BarChart3 size={17} />
            </span>
            <span>
              <b className="block text-sm font-medium">Model performance</b>
              <small className="text-xs text-slate-500">Held-out metrics behind this prediction</small>
            </span>
          </Link>
          <Disclaimer testId="results-disclaimer" />
        </div>
      </section>
    </PageTransition>
  );
}

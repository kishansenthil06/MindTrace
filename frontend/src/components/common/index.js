import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { AlertTriangle, Inbox, RefreshCw, ShieldCheck } from "lucide-react";
import { statusMeta } from "@/lib/api";

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export function Reveal({ children, className = "", delay = 0 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

export function SectionLabel({ children, className = "" }) {
  return <p className={`label-xs ${className}`}>{children}</p>;
}

export function PageHeader({ eyebrow, title, description, actions, testId }) {
  return (
    <motion.header
      className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
      variants={fadeUp}
      initial="hidden"
      animate="show"
      data-testid={testId}
    >
      <div className="max-w-2xl">
        {eyebrow && <SectionLabel className="mb-3 text-cyan-400/80">{eyebrow}</SectionLabel>}
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 text-sm leading-relaxed text-slate-400 md:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </motion.header>
  );
}

export function StatusPill({ status, size = "sm", testId }) {
  const meta = statusMeta(status);
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-medium ${
        size === "lg" ? "px-4 py-1.5 text-sm" : "px-3 py-1 text-xs"
      }`}
      style={{ borderColor: `${meta.color}45`, background: meta.soft, color: meta.color }}
      data-testid={testId}
    >
      <i className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {status}
    </span>
  );
}

export function StatCard({ icon: Icon, label, value, sub, accent = "#22D3EE", testId }) {
  return (
    <motion.div variants={fadeUp} className="mt-card mt-card-hover p-5" data-testid={testId}>
      <div className="flex items-start justify-between gap-3">
        <SectionLabel>{label}</SectionLabel>
        {Icon && (
          <span
            className="grid h-8 w-8 place-items-center rounded-lg border border-[#262A38]"
            style={{ background: `${accent}14`, color: accent }}
          >
            <Icon size={15} />
          </span>
        )}
      </div>
      <p className="mt-4 font-display text-2xl font-semibold leading-none">{value}</p>
      {sub && <p className="mt-2 text-xs text-slate-500">{sub}</p>}
    </motion.div>
  );
}

export function EmptyState({ title, description, action, testId }) {
  return (
    <div className="mt-card flex flex-col items-center px-6 py-16 text-center" data-testid={testId}>
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-[#262A38] bg-[#0A0B10] text-cyan-400">
        <Inbox size={22} />
      </span>
      <h3 className="mt-5 font-display text-xl font-medium">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-400">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ onRetry, testId = "error-state", message }) {
  return (
    <div className="mt-card flex flex-col items-center px-6 py-14 text-center" data-testid={testId}>
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400">
        <AlertTriangle size={20} />
      </span>
      <h3 className="mt-5 font-display text-lg font-medium">Something went wrong</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-400">
        {message || "We couldn't complete this request. Please try again."}
      </p>
      {onRetry && (
        <button className="btn-secondary mt-6" onClick={onRetry} data-testid="retry-button">
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-[#1C1F2B] ${className}`} data-testid="skeleton" />;
}

export function Disclaimer({ className = "", testId = "medical-disclaimer" }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border border-[#262A38] bg-[#0F1118] px-5 py-4 ${className}`}
      data-testid={testId}
    >
      <ShieldCheck size={16} className="mt-0.5 shrink-0 text-cyan-400/80" />
      <p className="text-xs leading-relaxed text-slate-400">
        MindTrace AI is a research and decision-support prototype. Its outputs are not medical diagnoses and
        should not replace professional mental-health evaluation.
      </p>
    </div>
  );
}

export function ProbabilityBars({ probabilities, testId = "probability-bars" }) {
  const entries = Object.entries(probabilities || {});
  return (
    <div className="space-y-4" data-testid={testId}>
      {entries.map(([label, value], index) => {
        const meta = statusMeta(label);
        return (
          <div key={label} data-testid={`probability-row-${label.toLowerCase().replaceAll(" ", "-")}`}>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-slate-300">{label}</span>
              <span className="font-mono text-slate-400">{value.toFixed(1)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#1C1F2B]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: meta.color }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(value, 0.6)}%` }}
                transition={{ duration: 0.7, delay: 0.15 + index * 0.08, ease: "easeOut" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function QuickLink({ to, icon: Icon, title, description, testId }) {
  return (
    <Link
      to={to}
      className="mt-card mt-card-hover group flex items-center gap-4 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
      data-testid={testId}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#262A38] bg-[#0A0B10] text-cyan-400 transition-transform group-hover:-translate-y-0.5">
        <Icon size={17} />
      </span>
      <span className="min-w-0">
        <b className="block text-sm font-medium text-slate-100">{title}</b>
        <small className="block truncate text-xs text-slate-500">{description}</small>
      </span>
    </Link>
  );
}

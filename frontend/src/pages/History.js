import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Clock3, X } from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { EmptyState, ErrorState, PageHeader, ProbabilityBars, SectionLabel, Skeleton, StatusPill, fadeUp, staggerContainer } from "@/components/common";
import { formatDate, formatTime, relativeDay, statusMeta } from "@/lib/api";
import { useStore } from "@/lib/store";

export default function History() {
  const { history, historyState, refreshHistory, saveResult } = useStore();
  const [detail, setDetail] = useState(null);
  const navigate = useNavigate();

  if (historyState === "loading") {
    return (
      <PageTransition testId="history-loading">
        <Skeleton className="h-10 w-56" />
        <div className="mt-8 space-y-4">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-24" />)}</div>
      </PageTransition>
    );
  }

  if (historyState === "error") {
    return (
      <PageTransition testId="history-error">
        <PageHeader eyebrow="History" title="Assessment history" />
        <ErrorState onRetry={refreshHistory} testId="history-error-state" />
      </PageTransition>
    );
  }

  const trend = [...history].reverse().map((item) => ({
    label: formatDate(item.timestamp),
    confidence: item.confidence,
    status: item.mental_health_status,
  }));

  const open = (item) => {
    saveResult(item);
    navigate("/results");
  };

  return (
    <PageTransition testId="history-page" wide>
      <PageHeader
        eyebrow="History"
        title="Assessment history"
        description="Every analysis you have run, newest first."
        actions={<Link to="/assessment" className="btn-primary" data-testid="history-new-assessment">New assessment</Link>}
      />

      {!history.length ? (
        <EmptyState
          testId="history-empty-state"
          title="No assessments yet"
          description="Your assessment history will appear here after your first AI analysis."
          action={
            <Link to="/assessment" className="btn-primary" data-testid="history-start-first">
              Start Your First Assessment <ArrowRight size={14} />
            </Link>
          }
        />
      ) : (
        <>
          <section className="mt-card mb-6 p-6" data-testid="history-trend-card">
            <SectionLabel>Confidence trend</SectionLabel>
            <div className="mt-5 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid stroke="#1c202b" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis unit="%" domain={[0, 100]} tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#13151D", border: "1px solid #262A38", borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: "#94A3B8" }}
                  />
                  <Line type="monotone" dataKey="confidence" stroke="#22D3EE" strokeWidth={2} dot={{ r: 3, fill: "#22D3EE" }} name="Confidence" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3" data-testid="history-list">
            {history.map((item) => {
              const meta = statusMeta(item.mental_health_status);
              return (
                <motion.article
                  key={item.id}
                  variants={fadeUp}
                  className="mt-card mt-card-hover flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                  data-testid={`history-row-${item.id}`}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border"
                      style={{ borderColor: `${meta.color}40`, background: meta.soft, color: meta.color }}
                    >
                      <Clock3 size={16} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <b className="font-display text-base font-medium">{item.mental_health_status}</b>
                        <StatusPill status={item.mental_health_status} />
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">
                        {relativeDay(item.timestamp)} · {formatDate(item.timestamp)} {formatTime(item.timestamp)} · id {item.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <p className="font-mono text-sm text-slate-200">{item.confidence.toFixed(1)}%</p>
                      <p className="text-[11px] text-slate-500">confidence</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-ghost" onClick={() => setDetail(item)} data-testid={`history-quick-view-${item.id}`}>
                        Quick view
                      </button>
                      <button className="btn-secondary" onClick={() => open(item)} data-testid={`history-open-${item.id}`}>
                        View <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </>
      )}

      <AnimatePresence>
        {detail && (
          <motion.div
            className="fixed inset-0 z-[60] grid place-items-center bg-black/70 px-5 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDetail(null)}
            data-testid="history-detail-modal"
          >
            <motion.div
              className="mt-card w-full max-w-lg p-7"
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <SectionLabel>{formatDate(detail.timestamp)} · {formatTime(detail.timestamp)}</SectionLabel>
                  <h3 className="mt-2 font-display text-2xl font-semibold" style={{ color: statusMeta(detail.mental_health_status).color }}>
                    {detail.mental_health_status}
                  </h3>
                  <p className="mt-1 font-mono text-xs text-slate-500">{detail.confidence.toFixed(1)}% confidence</p>
                </div>
                <button className="btn-ghost !px-2" onClick={() => setDetail(null)} aria-label="Close" data-testid="history-detail-close">
                  <X size={16} />
                </button>
              </div>
              <div className="mt-6">
                <ProbabilityBars probabilities={detail.probabilities} testId="history-detail-probabilities" />
              </div>
              <p className="mt-6 text-xs leading-relaxed text-slate-400">{detail.assessment_summary}</p>
              <button className="btn-primary mt-6 w-full" onClick={() => open(detail)} data-testid="history-detail-open-full">
                Open full report <ArrowRight size={14} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

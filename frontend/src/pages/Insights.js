import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Boxes, Cpu, Database, Gauge, Layers } from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { ErrorState, PageHeader, SectionLabel, Skeleton, StatCard, fadeUp, staggerContainer } from "@/components/common";
import { STATUS_ORDER, fetchDatasetInfo, fetchPerformance, statusMeta } from "@/lib/api";

const tooltipProps = {
  contentStyle: { background: "#13151D", border: "1px solid #262A38", borderRadius: 12, fontSize: 12 },
  labelStyle: { color: "#94A3B8" },
};

const pct = (value) => `${(value * 100).toFixed(1)}%`;

export default function Insights() {
  const [performance, setPerformance] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [state, setState] = useState("loading");

  const load = useCallback(() => {
    setState("loading");
    Promise.all([fetchPerformance(), fetchDatasetInfo()])
      .then(([perf, data]) => { setPerformance(perf); setDataset(data); setState("ready"); })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (state === "loading") {
    return (
      <PageTransition testId="insights-loading" wide>
        <Skeleton className="h-10 w-72" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-28" />)}
        </div>
        <Skeleton className="mt-6 h-72" />
      </PageTransition>
    );
  }

  if (state === "error") {
    return (
      <PageTransition testId="insights-error" wide>
        <PageHeader eyebrow="Model insights" title="Model performance" />
        <ErrorState onRetry={load} testId="insights-error-state" />
      </PageTransition>
    );
  }

  const metrics = performance.classification;
  const history = performance.training_history.epoch.map((epoch, index) => ({
    epoch,
    trainLoss: performance.training_history.train_loss[index],
    valLoss: performance.training_history.val_loss[index],
    trainAcc: performance.training_history.train_accuracy[index] * 100,
    valAcc: performance.training_history.val_accuracy[index] * 100,
  }));
  const distribution = STATUS_ORDER.map((label) => ({
    label,
    count: performance.class_distribution[label.replace(" ", "_")] || 0,
  }));
  const matrix = performance.confusion_matrix;
  const maxCell = Math.max(...matrix.flat(), 1);

  return (
    <PageTransition testId="insights-page" wide>
      <PageHeader
        eyebrow="Model insights"
        title="Model performance"
        description="Every number on this page is measured on the held-out test split — nothing is estimated or illustrative."
      />

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Gauge} label="Accuracy" value={pct(metrics.Accuracy)} sub="Held-out test split" testId="metric-accuracy" />
        <StatCard icon={Layers} label="Macro F1" value={pct(metrics["Macro F1"])} sub="Primary metric" accent="#3B82F6" testId="metric-macro-f1" />
        <StatCard icon={Cpu} label="Weighted F1" value={pct(metrics["F1-Score"])} sub="Class-frequency weighted" accent="#10B981" testId="metric-weighted-f1" />
        <StatCard icon={Boxes} label="Precision / Recall" value={`${pct(metrics.Precision)} / ${pct(metrics.Recall)}`} sub="Weighted average" accent="#F97316" testId="metric-precision-recall" />
      </motion.div>

      <section className="mt-card mt-6 overflow-hidden" data-testid="model-comparison-section">
        <div className="border-b border-[#262A38] p-6">
          <SectionLabel>Model comparison</SectionLabel>
          <p className="mt-2 text-xs text-slate-500">
            Random Forest vs neural network, sensor-only vs sensors + self-report, evaluated on identical splits.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead>
              <tr className="border-b border-[#262A38] text-[10px] uppercase tracking-[0.12em] text-slate-500">
                {["Model", "Accuracy", "Macro F1", "Weighted F1", "Precision", "Recall"].map((head) => (
                  <th key={head} className="px-6 py-3 font-semibold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {performance.model_comparison.map((row) => {
                const deployedName = performance.deployed.model === "neural_network" ? "Neural Network" : "Random Forest";
                const deployed = row.variant === performance.deployed.variant && row.model.includes(deployedName);
                return (
                  <tr
                    key={row.model}
                    className={`border-b border-[#1c202b] last:border-0 ${deployed ? "bg-cyan-400/[0.06]" : ""}`}
                    data-testid={`comparison-row-${row.model.toLowerCase().replaceAll(" ", "-").replaceAll("·", "")}`}
                  >
                    <td className="px-6 py-3.5 text-slate-200">
                      {row.model}
                      {deployed && <span className="ml-2 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] text-emerald-300">deployed</span>}
                    </td>
                    {["Accuracy", "Macro F1", "F1-Score", "Precision", "Recall"].map((key) => (
                      <td key={key} className={`px-6 py-3.5 font-mono ${deployed ? "text-cyan-300" : "text-slate-400"}`}>
                        {pct(row[key])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-[#262A38] p-6 text-xs leading-relaxed text-slate-500" data-testid="baseline-note">
          {performance.notice}
        </p>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="mt-card p-6" data-testid="training-loss-card">
          <SectionLabel>Training / validation loss</SectionLabel>
          <div className="mt-5 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid stroke="#1c202b" vertical={false} />
                <XAxis dataKey="epoch" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipProps} />
                <Line type="monotone" dataKey="trainLoss" stroke="#3B82F6" strokeWidth={2} dot={false} name="Train loss" />
                <Line type="monotone" dataKey="valLoss" stroke="#22D3EE" strokeWidth={2} dot={false} name="Val loss" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="mt-card p-6" data-testid="training-accuracy-card">
          <SectionLabel>Training / validation accuracy</SectionLabel>
          <div className="mt-5 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid stroke="#1c202b" vertical={false} />
                <XAxis dataKey="epoch" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis unit="%" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipProps} />
                <Line type="monotone" dataKey="trainAcc" stroke="#10B981" strokeWidth={2} dot={false} name="Train accuracy" />
                <Line type="monotone" dataKey="valAcc" stroke="#EAB308" strokeWidth={2} dot={false} name="Val accuracy" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <section className="mt-card p-6" data-testid="confusion-matrix-card">
          <SectionLabel>Confusion matrix</SectionLabel>
          <p className="mt-2 text-xs text-slate-500">Held-out test split · raw counts (rows = actual, columns = predicted)</p>
          <div className="mt-6 overflow-x-auto">
            <div className="min-w-[420px]">
              <div className="grid grid-cols-[110px_repeat(4,1fr)] gap-1.5 text-[10px] text-slate-500">
                <span />
                {STATUS_ORDER.map((label) => <span key={label} className="text-center">{label.replace(" Stress", "")}</span>)}
              </div>
              {matrix.map((row, rowIndex) => (
                <div key={rowIndex} className="mt-1.5 grid grid-cols-[110px_repeat(4,1fr)] items-center gap-1.5">
                  <span className="truncate text-[11px] text-slate-400">{STATUS_ORDER[rowIndex]}</span>
                  {row.map((cell, cellIndex) => (
                    <span
                      key={cellIndex}
                      className="grid h-11 place-items-center rounded-lg border border-[#22262f] font-mono text-xs"
                      style={{
                        background: `rgba(34,211,238,${(cell / maxCell) * 0.35})`,
                        color: cell / maxCell > 0.45 ? "#E0F2FE" : "#94A3B8",
                      }}
                      data-testid={`confusion-cell-${rowIndex}-${cellIndex}`}
                    >
                      {cell}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-card p-6" data-testid="class-distribution-card">
          <SectionLabel>Class distribution</SectionLabel>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution}>
                <CartesianGrid stroke="#1c202b" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipProps} cursor={{ fill: "rgba(255,255,255,.03)" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={38}>
                  {distribution.map((entry) => (
                    <Cell key={entry.label} fill={statusMeta(entry.label).color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <section className="mt-card p-6" data-testid="regression-card">
          <SectionLabel>Severity regression head</SectionLabel>
          <p className="mt-2 text-xs text-slate-500">Sensor-only estimator used when self-report scores are unavailable.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {Object.entries(performance.regression).map(([label, value]) => (
              <div key={label} className="rounded-xl border border-[#22262f] bg-[#0F1118] p-4">
                <SectionLabel>{label}</SectionLabel>
                <p className="mt-2 font-display text-xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {Object.entries(performance.regression_per_target).map(([target, values]) => (
              <div key={target} className="flex items-center justify-between rounded-xl border border-[#1f2431] px-4 py-2.5 text-xs">
                <span className="text-slate-300">{target.replace("_Score", "")}</span>
                <span className="font-mono text-slate-500">MAE {values.MAE} · R² {values["R²"]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-card p-6" data-testid="dataset-card">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-[#262A38] bg-[#0A0B10] text-cyan-400">
              <Database size={15} />
            </span>
            <div>
              <SectionLabel>Dataset report</SectionLabel>
              <p className="mt-1 text-xs text-slate-500">{dataset.file}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              ["Samples", dataset.n_samples],
              ["Model features", dataset.n_model_features],
              ["Missing values", dataset.total_missing],
              ["Duplicate rows", dataset.duplicate_rows],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-[#22262f] bg-[#0F1118] p-4">
                <SectionLabel>{label}</SectionLabel>
                <p className="mt-2 font-display text-xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <SectionLabel>Strongest label correlations</SectionLabel>
            <div className="mt-3 space-y-2">
              {Object.entries(dataset.label_correlation).slice(0, 5).map(([feature, value]) => (
                <div key={feature} className="flex items-center justify-between text-xs">
                  <span className="truncate text-slate-400">{feature.replaceAll("_", " ")}</span>
                  <span className="font-mono text-slate-500">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-5 border-t border-[#1f2431] pt-4 text-xs leading-relaxed text-slate-500">
            {dataset.modality_note}
          </p>
        </section>
      </div>
    </PageTransition>
  );
}

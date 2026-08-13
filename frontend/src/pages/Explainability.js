import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bar, BarChart, Cell, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Camera, Lock, Mic } from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { Disclaimer, EmptyState, PageHeader, SectionLabel, StatusPill, fadeUp, staggerContainer } from "@/components/common";
import { useStore } from "@/lib/store";

const tooltipStyle = {
  contentStyle: { background: "#13151D", border: "1px solid #262A38", borderRadius: 12, fontSize: 12 },
  labelStyle: { color: "#94A3B8" },
};

export default function Explainability() {
  const { result } = useStore();

  if (!result) {
    return (
      <PageTransition testId="explainability-empty">
        <PageHeader eyebrow="Explainability" title="Why this prediction?" description="Feature-level attribution for your latest assessment." />
        <EmptyState
          testId="explainability-empty-state"
          title="No prediction to explain yet"
          description="Run an assessment first and the attribution breakdown will appear here."
          action={<Link to="/assessment" className="btn-primary" data-testid="explain-start-assessment">Start Assessment <ArrowRight size={14} /></Link>}
        />
      </PageTransition>
    );
  }

  const attributions = (result.feature_attributions || []).map((item) => ({ ...item }));
  const modalities = Object.entries(result.modalities || {}).map(([key, value]) => ({
    modality: key.replace("_", " "),
    contribution: value.contribution,
  }));

  return (
    <PageTransition testId="explainability-page" wide>
      <PageHeader
        eyebrow="Explainability"
        title="Why this prediction?"
        description="Each value below is measured on the deployed classifier by replacing one indicator with its training median and recording the real change in the predicted probability."
        actions={<StatusPill status={result.mental_health_status} size="lg" testId="explain-status-pill" />}
      />

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <motion.section variants={fadeUp} className="mt-card p-7" data-testid="feature-contributions-card">
          <SectionLabel>Feature contributions</SectionLabel>
          <p className="mb-6 mt-2 text-xs text-slate-500">Ranked by absolute impact on the predicted class.</p>
          <div className="space-y-4">
            {attributions.map((item, index) => (
              <div key={item.feature} data-testid={`attribution-row-${index}`}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-slate-300">{item.feature}</span>
                  <span className="shrink-0 font-mono text-slate-500">
                    {item.delta > 0 ? "+" : ""}{item.delta}% · {item.impact}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#1C1F2B]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: item.direction === "risk" ? "#F97316" : "#22D3EE" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.impact}%` }}
                    transition={{ duration: 0.7, delay: index * 0.06, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-4 border-t border-[#1f2431] pt-5 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-orange-500" /> pushed toward this class</span>
            <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-cyan-400" /> pulled away from this class</span>
          </div>
        </motion.section>

        <motion.section variants={fadeUp} className="mt-card p-7" data-testid="modality-contribution-card">
          <SectionLabel>Modality contribution</SectionLabel>
          <p className="mb-4 mt-2 text-xs text-slate-500">Share of total measured influence per signal family.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={modalities} outerRadius="72%">
                <PolarGrid stroke="#262A38" />
                <PolarAngleAxis dataKey="modality" tick={{ fill: "#64748B", fontSize: 11, textTransform: "capitalize" }} />
                <Radar dataKey="contribution" stroke="#22D3EE" fill="#22D3EE" fillOpacity={0.22} />
                <Tooltip {...tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>
      </motion.div>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="mt-card p-7" data-testid="impact-chart-card">
          <SectionLabel>Impact profile</SectionLabel>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attributions} layout="vertical" margin={{ left: 12, right: 16 }}>
                <XAxis type="number" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="feature" width={150} tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,.03)" }} />
                <Bar dataKey="impact" radius={[0, 6, 6, 0]} barSize={14}>
                  {attributions.map((item) => (
                    <Cell key={item.feature} fill={item.direction === "risk" ? "#F97316" : "#22D3EE"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {[
            { icon: Camera, title: "Facial attention (Grad-CAM)", copy: "Pixel-level attention maps arrive once the facial encoder is trained and linked to samples." },
            { icon: Mic, title: "Speech attribution", copy: "Spectrogram attribution will be available when server-side acoustic extraction ships." },
          ].map((item) => (
            <div key={item.title} className="mt-card p-6 opacity-80" data-testid={`locked-card-${item.title.toLowerCase().slice(0, 6)}`}>
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-[#262A38] bg-[#0A0B10] text-slate-500">
                  <item.icon size={15} />
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#262A38] px-2.5 py-1 text-[10px] text-slate-500">
                  <Lock size={10} /> Not yet available
                </span>
              </div>
              <b className="mt-4 block text-sm font-medium text-slate-300">{item.title}</b>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{item.copy}</p>
            </div>
          ))}
          <Disclaimer testId="explainability-disclaimer" />
        </div>
      </section>
    </PageTransition>
  );
}

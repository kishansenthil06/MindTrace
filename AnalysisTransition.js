import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

const STAGES = [
  "Behavioral patterns",
  "Physiological indicators",
  "Feature relationships",
  "Running AI model",
  "Preparing results",
];

export function AnalysisTransition({ active }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!active) { setStage(0); return; }
    const timer = setInterval(() => setStage((value) => Math.min(value + 1, STAGES.length)), 520);
    return () => clearInterval(timer);
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-[#0A0B10]/92 px-5 backdrop-blur-md"
      data-testid="analysis-transition"
    >
      <motion.div
        className="mt-card w-full max-w-md p-8"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
            <Loader2 size={17} className="animate-spin" />
          </span>
          <div>
            <b className="block font-display text-lg font-medium">Analyzing signals</b>
            <small className="text-xs text-slate-500">Processing your assessment</small>
          </div>
        </div>
        <ul className="mt-7 space-y-3.5">
          {STAGES.map((label, index) => {
            const done = index < stage;
            const running = index === stage;
            return (
              <li key={label} className="flex items-center gap-3 text-sm" data-testid={`analysis-stage-${index}`}>
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] transition-colors ${
                    done
                      ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300"
                      : running
                        ? "border-cyan-400/70 text-cyan-300"
                        : "border-[#2b3040] text-slate-600"
                  }`}
                >
                  {done ? <Check size={11} /> : running ? <Loader2 size={11} className="animate-spin" /> : "○"}
                </span>
                <span className={done ? "text-slate-300" : running ? "text-slate-200" : "text-slate-600"}>
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-7 h-1 overflow-hidden rounded-full bg-[#1C1F2B]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
            animate={{ width: `${Math.min((stage / STAGES.length) * 100, 96)}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </motion.div>
    </div>
  );
}

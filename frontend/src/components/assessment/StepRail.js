import { motion } from "framer-motion";
import { Check } from "lucide-react";

export function StepRail({ steps, current, onSelect }) {
  return (
    <div className="mt-card mb-6 overflow-x-auto p-4" data-testid="step-rail">
      <div className="flex min-w-max items-center gap-1 sm:min-w-0 sm:justify-between">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <button
              key={step}
              onClick={() => onSelect(index)}
              className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
              data-testid={`assessment-step-${index + 1}-button`}
              aria-current={active ? "step" : undefined}
            >
              <span
                className={`relative grid h-6 w-6 shrink-0 place-items-center rounded-full border font-mono text-[10px] transition-colors ${
                  done
                    ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300"
                    : active
                      ? "border-cyan-400 text-cyan-300"
                      : "border-[#2b3040] text-slate-500"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="step-glow"
                    className="absolute -inset-1 rounded-full border border-cyan-400/30"
                    transition={{ duration: 0.25 }}
                  />
                )}
                {done ? <Check size={12} /> : index + 1}
              </span>
              <span
                className={`hidden text-xs transition-colors sm:block ${
                  active ? "text-slate-100" : done ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {step}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { motion } from "framer-motion";
import { STATUS_ORDER, statusMeta } from "@/lib/api";

const PREVIEW = { "Healthy": 12, "Mild Stress": 18, "Moderate Stress": 61, "Severe Stress": 9 };

export function ProductPreview() {
  return (
    <div className="relative" data-testid="product-preview">
      <div className="absolute -inset-6 rounded-[32px] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(59,130,246,.14),transparent_70%)]" />
      <div className="mt-card relative overflow-hidden p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="label-xs">Mental health assessment</p>
            <p className="mt-2 font-display text-2xl font-semibold text-orange-400">Moderate Stress</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-medium tracking-wide text-slate-400">
            Illustrative preview
          </span>
        </div>
        <p className="mb-7 font-mono text-xs text-slate-500">78% model confidence</p>
        <div className="space-y-4">
          {STATUS_ORDER.map((label, index) => {
            const meta = statusMeta(label);
            return (
              <div key={label}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-slate-300">{label}</span>
                  <span className="font-mono text-slate-500">{PREVIEW[label]}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#1C1F2B]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: meta.color }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${PREVIEW[label]}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.1 + index * 0.1, ease: "easeOut" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-7 border-t border-[#1f2431] pt-5 text-xs leading-relaxed text-slate-500">
          Sample layout only — every real assessment renders values returned by the model.
        </p>
      </div>
    </div>
  );
}

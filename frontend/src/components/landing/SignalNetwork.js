import { motion } from "framer-motion";

const NODES = [
  { id: "core", x: 50, y: 50, r: 7 },
  { id: "behavior", x: 50, y: 12, r: 4.2 },
  { id: "facial", x: 85, y: 32, r: 4.2 },
  { id: "acoustic", x: 82, y: 74, r: 4.2 },
  { id: "physio", x: 50, y: 90, r: 4.2 },
  { id: "self", x: 16, y: 70, r: 4.2 },
  { id: "model", x: 18, y: 28, r: 4.2 },
];

const EDGES = NODES.slice(1).map((node) => ({ from: NODES[0], to: node }));

export function SignalNetwork() {
  return (
    <div className="relative aspect-square w-full max-w-lg" data-testid="signal-network">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,.16),transparent_62%)] blur-2xl" />
      <svg viewBox="0 0 100 100" className="relative h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.35" />
          </linearGradient>
          <radialGradient id="core">
            <stop offset="0%" stopColor="#67E8F9" />
            <stop offset="100%" stopColor="#2563EB" />
          </radialGradient>
        </defs>

        {[40, 30, 20].map((radius, index) => (
          <motion.circle
            key={radius}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#22D3EE"
            strokeWidth="0.15"
            strokeOpacity="0.18"
            animate={{ rotate: index % 2 === 0 ? 360 : -360 }}
            transition={{ duration: 60 + index * 20, repeat: Infinity, ease: "linear" }}
            style={{ originX: "50%", originY: "50%" }}
            strokeDasharray={index === 1 ? "1.5 3" : undefined}
          />
        ))}

        {EDGES.map((edge, index) => (
          <g key={edge.to.id}>
            <line x1={edge.from.x} y1={edge.from.y} x2={edge.to.x} y2={edge.to.y} stroke="url(#edge)" strokeWidth="0.28" />
            <motion.circle
              r="0.85"
              fill="#A5F3FC"
              initial={{ opacity: 0 }}
              animate={{
                cx: [edge.to.x, edge.from.x],
                cy: [edge.to.y, edge.from.y],
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 2.6, repeat: Infinity, delay: index * 0.42, ease: "easeInOut" }}
            />
          </g>
        ))}

        {NODES.slice(1).map((node, index) => (
          <motion.circle
            key={node.id}
            cx={node.x}
            cy={node.y}
            r={node.r}
            fill="#0F172A"
            stroke="#22D3EE"
            strokeWidth="0.3"
            strokeOpacity="0.65"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 4, repeat: Infinity, delay: index * 0.3, ease: "easeInOut" }}
            style={{ originX: `${node.x}%`, originY: `${node.y}%` }}
          />
        ))}

        <motion.circle
          cx="50"
          cy="50"
          r="9"
          fill="url(#core)"
          animate={{ opacity: [0.85, 1, 0.85], scale: [1, 1.05, 1] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: "50%", originY: "50%" }}
        />
        <circle cx="50" cy="50" r="13" fill="none" stroke="#22D3EE" strokeWidth="0.2" strokeOpacity="0.35" />
      </svg>

      <div className="pointer-events-none absolute inset-x-6 inset-y-4 hidden sm:block">
        {[
          { label: "Behavioral", top: "-2%", left: "50%" },
          { label: "Facial", top: "22%", left: "97%" },
          { label: "Acoustic", top: "80%", left: "95%" },
          { label: "Physiological", top: "102%", left: "50%" },
          { label: "Self-report", top: "78%", left: "3%" },
          { label: "Model", top: "18%", left: "5%" },
        ].map((tag, index) => (
          <motion.span
            key={tag.label}
            className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-white/10 bg-[#0F1118]/85 px-2.5 py-1 text-[10px] font-medium tracking-wide text-slate-400 backdrop-blur"
            style={{ top: tag.top, left: tag.left }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 + index * 0.12, duration: 0.5 }}
          >
            {tag.label}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

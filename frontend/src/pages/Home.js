import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, Layers, LineChart, Lock, Sparkles, UserCircle2 } from "lucide-react";
import { SignalNetwork } from "@/components/landing/SignalNetwork";
import { ProductPreview } from "@/components/landing/ProductPreview";
import { Disclaimer, Reveal, SectionLabel } from "@/components/common";

const TRUST = [
  { icon: Layers, title: "Multimodal", copy: "Combine multiple measurable indicators." },
  { icon: BrainCircuit, title: "Intelligent", copy: "AI-powered mental-health classification." },
  { icon: LineChart, title: "Explainable", copy: "Understand the factors behind predictions." },
];

const STEPS = [
  { n: "01", title: "Provide Signals", copy: "Enter or upload the available assessment data." },
  { n: "02", title: "AI Analysis", copy: "The model processes the provided information." },
  { n: "03", title: "Understand Results", copy: "View the predicted status and supporting insights." },
];

const WHY = [
  { icon: Layers, title: "Multimodal Analysis", copy: "Combines behavioral, facial, acoustic, physiological and self-report information sources." },
  { icon: UserCircle2, title: "Personalized Profiles", copy: "Keep assessment history organized per person, with trends over time." },
  { icon: LineChart, title: "Explainable Predictions", copy: "See which indicators moved the model, measured on the deployed classifier." },
  { icon: Lock, title: "Privacy-Conscious Design", copy: "Captured photos and recordings stay in your browser; only the numbers you review are sent." },
];

export default function Home() {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      data-testid="landing-page"
    >
      <section className="radial-glow relative overflow-hidden">
        <div className="grid-lines absolute inset-0 opacity-60" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-32 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pb-28 lg:pt-40">
          <div>
            <motion.span
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-3.5 py-1.5 text-xs font-medium text-cyan-200 shadow-[0_0_24px_-8px_rgba(34,211,238,.6)]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              data-testid="hero-badge"
            >
              <Sparkles size={13} /> Explainable AI for Mental Health
            </motion.span>

            <motion.h1
              className="mt-7 font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.55, ease: "easeOut" }}
              data-testid="hero-heading"
            >
              Understand the signals behind mental wellbeing.
            </motion.h1>

            <motion.p
              className="mt-6 max-w-xl text-base leading-relaxed text-slate-400"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, duration: 0.5 }}
            >
              MindTrace uses AI to analyze behavioral and multimodal indicators to provide an interpretable
              mental-health assessment experience.
            </motion.p>

            <motion.div
              className="mt-9 flex flex-wrap items-center gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.45 }}
            >
              <Link to="/assessment" className="btn-primary px-6 py-3" data-testid="begin-assessment-button">
                Begin Assessment <ArrowRight size={15} />
              </Link>
              <a href="#how-it-works" className="btn-secondary px-6 py-3" data-testid="explore-mindtrace-button">
                Explore MindTrace
              </a>
            </motion.div>

            <motion.div
              className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-xs text-slate-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <span>4,000-sample research dataset</span>
              <span>21 measured indicators</span>
              <span>Held-out evaluation reported openly</span>
            </motion.div>
          </div>

          <motion.div
            className="flex justify-center lg:justify-end"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
          >
            <SignalNetwork />
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <div className="grid gap-5 sm:grid-cols-3">
          {TRUST.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.08}>
              <div className="mt-card mt-card-hover h-full p-6" data-testid={`trust-card-${item.title.toLowerCase()}`}>
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-[#262A38] bg-[#0A0B10] text-cyan-400">
                  <item.icon size={17} />
                </span>
                <h3 className="mt-5 font-display text-lg font-medium">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.copy}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-24 px-5 pb-24 sm:px-8">
        <Reveal>
          <SectionLabel className="text-cyan-400/80">How it works</SectionLabel>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            A guided path from signals to understanding.
          </h2>
        </Reveal>
        <div className="relative mt-12">
          <div className="absolute left-6 top-3 hidden h-px w-[calc(100%-3rem)] bg-gradient-to-r from-blue-500/40 via-cyan-400/25 to-transparent md:block" />
          <div className="absolute left-[7px] top-3 h-[calc(100%-1.5rem)] w-px bg-gradient-to-b from-blue-500/40 to-transparent md:hidden" />
          <div className="grid gap-10 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <Reveal key={step.n} delay={index * 0.1}>
                <div className="relative pl-8 md:pl-0" data-testid={`how-step-${step.n}`}>
                  <span className="absolute left-0 top-1.5 grid h-4 w-4 place-items-center rounded-full border border-cyan-400/50 bg-[#0A0B10] md:left-4 md:top-[-2px]">
                    <i className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  </span>
                  <div className="md:pt-8">
                    <p className="font-mono text-xs text-cyan-400/80">{step.n}</p>
                    <h3 className="mt-2 font-display text-lg font-medium">{step.title}</h3>
                    <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-400">{step.copy}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
          <Reveal>
            <SectionLabel className="text-cyan-400/80">What you receive</SectionLabel>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              A report you can actually interpret.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
              Each assessment returns a predicted status, the probability spread across all four classes, the
              indicators that moved the model, and the honest held-out performance of the model that produced it.
            </p>
            <Link to="/assessment" className="btn-secondary mt-7" data-testid="preview-cta">
              Try it now <ArrowRight size={14} />
            </Link>
          </Reveal>
          <Reveal delay={0.1}>
            <ProductPreview />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <Reveal>
          <SectionLabel className="text-cyan-400/80">Why MindTrace</SectionLabel>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for research rigour, not for hype.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {WHY.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.06}>
              <div
                className="mt-card mt-card-hover group h-full p-6"
                data-testid={`why-card-${item.title.toLowerCase().replaceAll(" ", "-")}`}
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-[#262A38] bg-[#0A0B10] text-cyan-400 transition-transform duration-300 group-hover:-translate-y-0.5">
                  <item.icon size={17} />
                </span>
                <h3 className="mt-5 font-display text-lg font-medium">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.copy}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <Reveal>
          <div className="mt-card relative overflow-hidden p-8 sm:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(70%_120%_at_20%_0%,rgba(59,130,246,.16),transparent_70%)]" />
            <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-xl">
                <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  Ready to trace the signals?
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  Run a full multimodal assessment in under two minutes and see exactly how the model reached
                  its conclusion.
                </p>
              </div>
              <Link to="/assessment" className="btn-primary px-6 py-3" data-testid="footer-cta-assessment">
                Begin Assessment <ArrowRight size={15} />
              </Link>
            </div>
          </div>
          <Disclaimer className="mt-6" testId="landing-disclaimer" />
        </Reveal>
      </section>
    </motion.main>
  );
}

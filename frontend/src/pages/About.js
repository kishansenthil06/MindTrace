import { Link } from "react-router-dom";
import { ArrowRight, Brain, Database, Lock, ShieldAlert } from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { Disclaimer, PageHeader, Reveal, SectionLabel } from "@/components/common";

const PIPELINE = [
  { title: "Data", copy: "A 4,000-sample research dataset of behavioral, facial, acoustic, physiological and self-report indicators. Duplicates removed, missing values imputed from the training split only." },
  { title: "Models", copy: "A Random Forest baseline and a neural classifier (128 → 64 → 32 → 4 softmax) trained on identical stratified 80/10/10 splits. The stronger macro-F1 model is deployed." },
  { title: "Explanations", copy: "Per-prediction attributions are measured by occlusion on the deployed model, so the numbers shown reflect the model actually serving you." },
];

export default function About() {
  return (
    <PageTransition testId="about-page">
      <PageHeader
        eyebrow="About"
        title="Explainable AI for mental-health research"
        description="MindTrace AI is a decision-support prototype that turns measurable indicators into an interpretable assessment, with its own limitations stated openly."
      />

      <section className="grid gap-5 md:grid-cols-3">
        {PIPELINE.map((item, index) => (
          <Reveal key={item.title} delay={index * 0.08}>
            <div className="mt-card h-full p-6" data-testid={`about-card-${item.title.toLowerCase()}`}>
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-[#262A38] bg-[#0A0B10] text-cyan-400">
                {index === 0 ? <Database size={17} /> : index === 1 ? <Brain size={17} /> : <ShieldAlert size={17} />}
              </span>
              <h3 className="mt-5 font-display text-lg font-medium">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.copy}</p>
            </div>
          </Reveal>
        ))}
      </section>

      <section id="privacy" className="mt-card mt-6 scroll-mt-28 p-7" data-testid="about-privacy">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-[#262A38] bg-[#0A0B10] text-cyan-400">
            <Lock size={15} />
          </span>
          <SectionLabel>Privacy</SectionLabel>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-400">
          Your information is used to generate your assessment and display your results. The indicator values you
          submit are stored with the assessment record so you can revisit the report. Photos captured with your
          camera and voice recordings never leave your browser — they are not uploaded or stored on the server.
          Your profile details are kept in your browser's local storage.
        </p>
      </section>

      <section id="disclaimer" className="mt-6 scroll-mt-28" data-testid="about-disclaimer">
        <Disclaimer testId="about-disclaimer-box" />
      </section>

      <section id="contact" className="mt-card mt-6 scroll-mt-28 p-7" data-testid="about-contact">
        <SectionLabel>Contact</SectionLabel>
        <p className="mt-4 text-sm text-slate-400">
          This is a hackathon research prototype. For questions about the methodology, start with the model
          insights page — it publishes the full held-out evaluation, including where the model performs poorly.
        </p>
        <Link to="/insights" className="btn-secondary mt-6" data-testid="about-insights-link">
          Review model performance <ArrowRight size={14} />
        </Link>
      </section>
    </PageTransition>
  );
}

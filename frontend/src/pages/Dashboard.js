import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, ArrowRight, BarChart3, Brain, CalendarCheck, Clock3, Flame, PlayCircle, UserCircle2 } from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { Disclaimer, EmptyState, PageHeader, QuickLink, SectionLabel, Skeleton, StatCard, StatusPill, fadeUp, staggerContainer } from "@/components/common";
import { formatDate, formatTime, relativeDay, statusMeta } from "@/lib/api";
import { useStore } from "@/lib/store";

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

export default function Dashboard() {
  const { profile, history, historyState, stats, saveResult } = useStore();
  const navigate = useNavigate();
  const firstName = profile.name.split(" ")[0];

  const open = (item) => { saveResult(item); navigate("/results"); };

  return (
    <PageTransition testId="dashboard-page" wide>
      <PageHeader
        eyebrow="Workspace"
        title={`${greeting()}, ${firstName}`}
        description="Here's your MindTrace overview."
        actions={
          <Link to="/assessment" className="btn-primary" data-testid="dashboard-start-assessment">
            <PlayCircle size={15} /> Start Assessment
          </Link>
        }
      />

      {historyState === "loading" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-28" />)}
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Activity} label="Assessments" value={stats.total} sub={stats.total ? "Total runs recorded" : "No runs yet"} testId="stat-assessments" />
          <StatCard
            icon={Brain}
            label="Latest result"
            value={stats.latest ? stats.latest.mental_health_status : "—"}
            sub={stats.latest ? `${stats.latest.confidence.toFixed(1)}% confidence` : "Run your first assessment"}
            accent={stats.latest ? statusMeta(stats.latest.mental_health_status).color : "#64748B"}
            testId="stat-latest-result"
          />
          <StatCard icon={CalendarCheck} label="Last assessment" value={stats.latest ? relativeDay(stats.latest.timestamp) : "—"} sub={stats.latest ? formatDate(stats.latest.timestamp) : "Nothing recorded"} accent="#3B82F6" testId="stat-last-assessment" />
          <StatCard icon={Flame} label="Streak" value={`${stats.streak} day${stats.streak === 1 ? "" : "s"}`} sub="Consecutive days assessed" accent="#F97316" testId="stat-streak" />
        </motion.div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.45fr_1fr]">
        <section data-testid="recent-assessments-section">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <SectionLabel className="text-cyan-400/80">Recent assessments</SectionLabel>
              <h2 className="mt-2 font-display text-xl font-medium">Your latest analyses</h2>
            </div>
            {history.length > 0 && (
              <Link to="/history" className="text-xs text-cyan-300 hover:text-cyan-200" data-testid="dashboard-view-all">
                View all
              </Link>
            )}
          </div>

          {!history.length ? (
            <EmptyState
              testId="dashboard-empty-state"
              title="No assessments yet"
              description="Your assessment history will appear here after your first AI analysis."
              action={
                <Link to="/assessment" className="btn-primary" data-testid="dashboard-start-first">
                  Start Your First Assessment <ArrowRight size={14} />
                </Link>
              }
            />
          ) : (
            <motion.ol variants={staggerContainer} initial="hidden" animate="show" className="relative space-y-3 pl-6">
              <span className="absolute left-[7px] top-2 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-cyan-400/40 to-transparent" />
              {history.slice(0, 5).map((item) => (
                <motion.li key={item.id} variants={fadeUp} className="relative">
                  <span
                    className="absolute -left-6 top-5 grid h-3.5 w-3.5 place-items-center rounded-full border bg-[#0A0B10]"
                    style={{ borderColor: statusMeta(item.mental_health_status).color }}
                  >
                    <i className="h-1.5 w-1.5 rounded-full" style={{ background: statusMeta(item.mental_health_status).color }} />
                  </span>
                  <button
                    className="mt-card mt-card-hover flex w-full items-center justify-between gap-4 p-4 text-left"
                    onClick={() => open(item)}
                    data-testid={`dashboard-history-item-${item.id}`}
                  >
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <b className="text-sm font-medium">{relativeDay(item.timestamp)}</b>
                        <StatusPill status={item.mental_health_status} />
                      </span>
                      <small className="mt-1 block text-xs text-slate-500">
                        {formatDate(item.timestamp)} · {formatTime(item.timestamp)}
                      </small>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-sm text-slate-200">{item.confidence.toFixed(1)}%</span>
                      <small className="text-[11px] text-slate-500">confidence</small>
                    </span>
                  </button>
                </motion.li>
              ))}
            </motion.ol>
          )}
        </section>

        <aside className="space-y-5" data-testid="quick-actions-section">
          <div>
            <SectionLabel className="text-cyan-400/80">Quick actions</SectionLabel>
            <div className="mt-4 space-y-3">
              <QuickLink to="/assessment" icon={PlayCircle} title="Start Assessment" description="Run a new multimodal analysis" testId="quick-start-assessment" />
              <QuickLink to="/history" icon={Clock3} title="View History" description="Browse previous reports" testId="quick-view-history" />
              <QuickLink to="/profile" icon={UserCircle2} title="View Profile" description="Your details and activity" testId="quick-view-profile" />
              <QuickLink to="/insights" icon={BarChart3} title="Model Insights" description="Held-out performance metrics" testId="quick-view-insights" />
            </div>
          </div>
          <Disclaimer testId="dashboard-disclaimer" />
        </aside>
      </div>
    </PageTransition>
  );
}

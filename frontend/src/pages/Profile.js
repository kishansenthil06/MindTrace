import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, CalendarDays, Flame, Mail, Settings2, Sparkles } from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { EmptyState, PageHeader, SectionLabel, StatCard, StatusPill, fadeUp, staggerContainer } from "@/components/common";
import { formatDate, formatTime, relativeDay, statusMeta } from "@/lib/api";
import { useStore } from "@/lib/store";

export default function Profile() {
  const { profile, initials, history, stats } = useStore();

  return (
    <PageTransition testId="profile-page" wide>
      <PageHeader
        eyebrow="Account"
        title="Your Profile"
        description="Local demo profile — details are stored on this device only."
        actions={
          <Link to="/settings" className="btn-secondary" data-testid="profile-edit-link">
            <Settings2 size={14} /> Edit profile
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        <motion.section variants={fadeUp} initial="hidden" animate="show" className="mt-card p-7" data-testid="personal-information-card">
          <SectionLabel>Personal information</SectionLabel>
          <div className="mt-6 flex flex-col items-center text-center">
            {profile.avatar ? (
              <img src={profile.avatar} alt="" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 font-display text-xl font-semibold">
                {initials}
              </span>
            )}
            <h2 className="mt-5 font-display text-xl font-medium" data-testid="profile-name">{profile.name}</h2>
            <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-400" data-testid="profile-email">
              <Mail size={13} /> {profile.email}
            </p>
            <div className="mt-6 w-full space-y-3 border-t border-[#1f2431] pt-6 text-left text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Member since</span>
                <span className="text-slate-300">{formatDate(profile.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Assessments</span>
                <span className="text-slate-300">{stats.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Last active</span>
                <span className="text-slate-300">{stats.latest ? relativeDay(stats.latest.timestamp) : "—"}</span>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="space-y-5">
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2">
            <StatCard icon={Activity} label="Total assessments" value={stats.total} sub="Recorded on this backend" testId="profile-stat-total" />
            <StatCard
              icon={Sparkles}
              label="Latest assessment"
              value={stats.latest ? stats.latest.mental_health_status : "—"}
              sub={stats.latest ? `${stats.latest.confidence.toFixed(1)}% confidence` : "Nothing recorded yet"}
              accent={stats.latest ? statusMeta(stats.latest.mental_health_status).color : "#64748B"}
              testId="profile-stat-latest"
            />
            <StatCard icon={CalendarDays} label="Last active" value={stats.latest ? relativeDay(stats.latest.timestamp) : "—"} accent="#3B82F6" testId="profile-stat-active" />
            <StatCard icon={Flame} label="Assessment streak" value={`${stats.streak} day${stats.streak === 1 ? "" : "s"}`} accent="#F97316" testId="profile-stat-streak" />
          </motion.div>

          {stats.averages && (
            <section className="mt-card p-6" data-testid="profile-averages-card">
              <SectionLabel>Average severity across your history</SectionLabel>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[["Depression", stats.averages.depression, 34], ["Anxiety", stats.averages.anxiety, 24], ["Stress", stats.averages.stress, 39]].map(
                  ([label, value, max]) => (
                    <div key={label} className="rounded-xl border border-[#22262f] bg-[#0F1118] p-4">
                      <div className="flex items-baseline justify-between">
                        <SectionLabel>{label}</SectionLabel>
                        <span className="font-mono text-[10px] text-slate-500">/ {max}</span>
                      </div>
                      <p className="mt-2 font-display text-lg font-semibold">{value}</p>
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          <section data-testid="recent-activity-section">
            <SectionLabel className="text-cyan-400/80">Recent activity</SectionLabel>
            {!history.length ? (
              <div className="mt-4">
                <EmptyState
                  testId="profile-empty-state"
                  title="No activity yet"
                  description="Once you run an assessment your timeline will appear here."
                  action={<Link to="/assessment" className="btn-primary" data-testid="profile-start-assessment">Start Assessment</Link>}
                />
              </div>
            ) : (
              <ol className="relative mt-5 space-y-4 pl-6">
                <span className="absolute left-[7px] top-2 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-cyan-400/40 to-transparent" />
                {history.slice(0, 6).map((item) => (
                  <li key={item.id} className="relative" data-testid={`profile-activity-${item.id}`}>
                    <span
                      className="absolute -left-6 top-1.5 grid h-3.5 w-3.5 place-items-center rounded-full border bg-[#0A0B10]"
                      style={{ borderColor: statusMeta(item.mental_health_status).color }}
                    >
                      <i className="h-1.5 w-1.5 rounded-full" style={{ background: statusMeta(item.mental_health_status).color }} />
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      <b className="text-sm font-medium">{relativeDay(item.timestamp)}</b>
                      <StatusPill status={item.mental_health_status} />
                      <span className="text-xs text-slate-500">{formatTime(item.timestamp)}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </PageTransition>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, Save } from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageHeader, SectionLabel } from "@/components/common";
import { useStore } from "@/lib/store";

export default function Settings() {
  const { profile, initials, updateProfile, signOut } = useStore();
  const [form, setForm] = useState({ name: profile.name, email: profile.email, avatar: profile.avatar });
  const navigate = useNavigate();

  const save = (event) => {
    event.preventDefault();
    if (!form.name.trim()) { toast.error("Name cannot be empty"); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) { toast.error("Enter a valid email address"); return; }
    updateProfile({ ...form, name: form.name.trim() });
    toast.success("Profile updated");
  };

  return (
    <PageTransition testId="settings-page">
      <PageHeader eyebrow="Account" title="Settings" description="Your profile lives on this device only — no account is created." />

      <form className="mt-card max-w-2xl p-7" onSubmit={save} data-testid="settings-form">
        <SectionLabel>Profile details</SectionLabel>
        <div className="mt-6 flex items-center gap-5">
          {form.avatar ? (
            <img src={form.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 font-display font-semibold">
              {initials}
            </span>
          )}
          <p className="text-xs text-slate-500">Paste any image URL to use a custom avatar, or leave it empty to keep initials.</p>
        </div>

        <div className="mt-7 space-y-5">
          <div>
            <label htmlFor="name" className="label-xs">Full name</label>
            <input
              id="name"
              className="mt-input mt-2"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              data-testid="settings-name-input"
            />
          </div>
          <div>
            <label htmlFor="email" className="label-xs">Email</label>
            <input
              id="email"
              type="email"
              className="mt-input mt-2"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              data-testid="settings-email-input"
            />
          </div>
          <div>
            <label htmlFor="avatar" className="label-xs">Avatar URL</label>
            <input
              id="avatar"
              className="mt-input mt-2"
              placeholder="https://..."
              value={form.avatar}
              onChange={(event) => setForm({ ...form, avatar: event.target.value })}
              data-testid="settings-avatar-input"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[#1f2431] pt-6">
          <button type="submit" className="btn-primary" data-testid="settings-save-button">
            <Save size={14} /> Save changes
          </button>
          <button
            type="button"
            className="btn-ghost text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={() => { signOut(); toast.success("Local profile reset"); navigate("/"); }}
            data-testid="settings-sign-out-button"
          >
            <LogOut size={14} /> Sign out and reset local data
          </button>
        </div>
      </form>
    </PageTransition>
  );
}

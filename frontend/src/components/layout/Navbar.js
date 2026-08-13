import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ChevronDown, Clock3, LayoutDashboard, LogOut, Menu, Settings, User, X } from "lucide-react";
import { useStore } from "@/lib/store";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/assessment", label: "Assessment" },
  { to: "/history", label: "History" },
  { to: "/insights", label: "Insights" },
  { to: "/about", label: "About" },
];

export function Logo({ compact = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 focus-visible:outline-none" data-testid="brand-logo">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-cyan-400/25 bg-gradient-to-br from-blue-600/25 to-cyan-500/15">
        <Activity size={17} className="text-cyan-300" />
        <motion.span
          className="absolute inset-0 rounded-xl border border-cyan-400/30"
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </span>
      {!compact && (
        <span className="font-display text-[17px] font-semibold tracking-tight">
          Mind<span className="text-cyan-300">Trace</span>
        </span>
      )}
    </Link>
  );
}

function Avatar({ initials, avatar, size = 34 }) {
  return avatar ? (
    <img src={avatar} alt="" className="rounded-full object-cover" style={{ height: size, width: size }} />
  ) : (
    <span
      className="grid place-items-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 font-display text-xs font-semibold text-white"
      style={{ height: size, width: size }}
    >
      {initials}
    </span>
  );
}

function ProfileMenu() {
  const { profile, initials, signOut } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const close = (event) => { if (ref.current && !ref.current.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, []);

  const items = [
    { label: "Profile", icon: User, to: "/profile", testId: "menu-profile" },
    { label: "Assessment History", icon: Clock3, to: "/history", testId: "menu-history" },
    { label: "Settings", icon: Settings, to: "/settings", testId: "menu-settings" },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-2 rounded-full border border-[#262A38] bg-[#13151D] py-1 pl-1 pr-2.5 transition-colors hover:border-[#38415a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
        data-testid="profile-menu-button"
      >
        <Avatar initials={initials} avatar={profile.avatar} size={28} />
        <span className="hidden text-xs font-medium text-slate-300 sm:block">{profile.name.split(" ")[0]}</span>
        <ChevronDown size={13} className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            className="glass absolute right-0 top-[calc(100%+10px)] w-64 overflow-hidden rounded-2xl shadow-2xl shadow-black/60"
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            data-testid="profile-dropdown"
          >
            <div className="flex items-center gap-3 border-b border-white/5 p-4">
              <Avatar initials={initials} avatar={profile.avatar} size={38} />
              <div className="min-w-0">
                <b className="block truncate text-sm font-medium" data-testid="dropdown-profile-name">{profile.name}</b>
                <small className="block truncate text-xs text-slate-500">{profile.email}</small>
              </div>
            </div>
            <div className="p-2">
              {items.map((item) => (
                <button
                  key={item.label}
                  role="menuitem"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                  onClick={() => { setOpen(false); navigate(item.to); }}
                  data-testid={item.testId}
                >
                  <item.icon size={15} className="text-slate-500" /> {item.label}
                </button>
              ))}
            </div>
            <div className="border-t border-white/5 p-2">
              <button
                role="menuitem"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
                onClick={() => { setOpen(false); signOut(); navigate("/"); }}
                data-testid="menu-sign-out"
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-white/5 bg-[#0A0B10]/80 backdrop-blur-xl" : "border-b border-transparent bg-transparent"
      }`}
      data-testid="navbar"
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Logo />
        <div className="hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `relative rounded-full px-4 py-2 text-sm transition-colors ${
                  isActive ? "text-white" : "text-slate-400 hover:text-slate-100"
                }`
              }
              data-testid={`nav-${link.label.toLowerCase()}`}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-full border border-cyan-400/20 bg-white/[0.06]"
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    />
                  )}
                  <span className="relative">{link.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <Link to="/assessment" className="btn-primary hidden md:inline-flex" data-testid="nav-start-assessment">
            Start Assessment
          </Link>
          <ProfileMenu />
          <button
            className="btn-ghost !px-2 lg:hidden"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label="Toggle navigation"
            data-testid="mobile-menu-button"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="glass mx-4 mb-3 overflow-hidden rounded-2xl lg:hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            data-testid="mobile-menu"
          >
            <div className="p-3">
              {LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${
                      isActive ? "bg-white/[0.07] text-white" : "text-slate-300"
                    }`
                  }
                  data-testid={`mobile-nav-${link.label.toLowerCase()}`}
                >
                  <LayoutDashboard size={14} className="text-slate-500" /> {link.label}
                </NavLink>
              ))}
              <Link to="/assessment" className="btn-primary mt-2 w-full" data-testid="mobile-start-assessment">
                Start Assessment
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

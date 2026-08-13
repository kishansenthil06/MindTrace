import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchHistory } from "@/lib/api";

const PROFILE_KEY = "mindtrace-profile";
const RESULT_KEY = "mindtrace-latest-result";

const defaultProfile = {
  name: "Guest Researcher",
  email: "guest@mindtrace.ai",
  avatar: "",
  createdAt: new Date().toISOString(),
};

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [profile, setProfile] = useState(() => ({ ...defaultProfile, ...readJson(PROFILE_KEY, {}) }));
  const [result, setResult] = useState(() => readJson(RESULT_KEY, null));
  const [history, setHistory] = useState([]);
  const [historyState, setHistoryState] = useState("loading");

  useEffect(() => { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); }, [profile]);

  const refreshHistory = useCallback(async () => {
    setHistoryState("loading");
    try {
      setHistory(await fetchHistory());
      setHistoryState("ready");
    } catch {
      setHistoryState("error");
    }
  }, []);

  useEffect(() => { refreshHistory(); }, [refreshHistory]);

  const saveResult = useCallback((next) => {
    setResult(next);
    if (next) localStorage.setItem(RESULT_KEY, JSON.stringify(next));
    else localStorage.removeItem(RESULT_KEY);
  }, []);

  const updateProfile = useCallback((patch) => setProfile((prev) => ({ ...prev, ...patch })), []);

  const signOut = useCallback(() => {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(RESULT_KEY);
    localStorage.removeItem("mindtrace-draft");
    setProfile({ ...defaultProfile, createdAt: new Date().toISOString() });
    setResult(null);
  }, []);

  const stats = useMemo(() => {
    const total = history.length;
    const latest = history[0] || null;
    const days = new Set(history.map((item) => new Date(item.timestamp).toDateString()));
    let streak = 0;
    const cursor = new Date();
    while (days.has(cursor.toDateString())) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    const averages = total
      ? ["depression", "anxiety", "stress"].reduce((acc, key) => {
          acc[key] = Number((history.reduce((sum, item) => sum + (item.scores?.[key] || 0), 0) / total).toFixed(1));
          return acc;
        }, {})
      : null;
    return { total, latest, streak, averages };
  }, [history]);

  const initials = useMemo(
    () => profile.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "MT",
    [profile.name]
  );

  const value = useMemo(
    () => ({ profile, initials, updateProfile, signOut, result, saveResult, history, historyState, refreshHistory, stats }),
    [profile, initials, updateProfile, signOut, result, saveResult, history, historyState, refreshHistory, stats]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside StoreProvider");
  return context;
};

import axios from "axios";

const BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const client = axios.create({ baseURL: BASE, timeout: 30000 });

export const analyzeAssessment = (payload) =>
  client.post("/assessments/analyze", payload).then((res) => res.data);
export const fetchHistory = () => client.get("/assessments/history").then((res) => res.data);
export const fetchAssessment = (id) => client.get(`/assessments/${id}`).then((res) => res.data);
export const fetchPerformance = () => client.get("/performance").then((res) => res.data);
export const fetchModelInfo = () => client.get("/model-info").then((res) => res.data);
export const fetchDatasetInfo = () => client.get("/dataset-info").then((res) => res.data);

export const STATUS_ORDER = ["Healthy", "Mild Stress", "Moderate Stress", "Severe Stress"];

export const STATUS_META = {
  "Healthy": { color: "#10B981", soft: "rgba(16,185,129,.14)", text: "text-emerald-400" },
  "Mild Stress": { color: "#EAB308", soft: "rgba(234,179,8,.14)", text: "text-yellow-400" },
  "Moderate Stress": { color: "#F97316", soft: "rgba(249,115,22,.14)", text: "text-orange-400" },
  "Severe Stress": { color: "#EF4444", soft: "rgba(239,68,68,.14)", text: "text-red-400" },
};

export const statusMeta = (status) =>
  STATUS_META[status] || { color: "#64748B", soft: "rgba(100,116,139,.14)", text: "text-slate-400" };

export const formatDate = (iso) => {
  if (!iso) return "—";
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export const formatTime = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

export const relativeDay = (iso) => {
  if (!iso) return "—";
  const now = new Date();
  const then = new Date(iso);
  const days = Math.floor((now.setHours(0, 0, 0, 0) - new Date(then).setHours(0, 0, 0, 0)) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(iso);
};

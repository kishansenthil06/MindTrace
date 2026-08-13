import { Component, Suspense } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { StoreProvider } from "@/lib/store";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Assessment from "@/pages/Assessment";
import Results from "@/pages/Results";
import Explainability from "@/pages/Explainability";
import Insights from "@/pages/Insights";
import History from "@/pages/History";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import About from "@/pages/About";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto my-16 max-w-md rounded-2xl border border-red-500/30 bg-[#0F1118] p-8 text-center">
          <h2 className="font-display text-xl font-medium text-red-400">Something went wrong</h2>
          <p className="mt-2 text-xs text-slate-400">An unexpected error occurred while rendering this page.</p>
          <button
            className="btn-primary mt-6 text-xs"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = "/results";
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/assessment" element={<Assessment />} />
      <Route path="/results" element={<Results />} />
      <Route path="/explainability" element={<Explainability />} />
      <Route path="/insights" element={<Insights />} />
      <Route path="/history" element={<History />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/about" element={<About />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <div className="flex min-h-screen flex-col bg-[#0A0B10]">
          <Navbar />
          <div className="flex-1">
            <ErrorBoundary>
              <Suspense fallback={null}>
                <AnimatedRoutes />
              </Suspense>
            </ErrorBoundary>
          </div>
          <Footer />
        </div>
        <Toaster theme="dark" position="top-right" />
      </BrowserRouter>
    </StoreProvider>
  );
}

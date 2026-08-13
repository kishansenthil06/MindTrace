import { Suspense } from "react";
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

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
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
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <div className="flex min-h-screen flex-col bg-[#0A0B10]">
          <Navbar />
          <div className="flex-1">
            <Suspense fallback={null}>
              <AnimatedRoutes />
            </Suspense>
          </div>
          <Footer />
        </div>
        <Toaster theme="dark" position="top-right" />
      </BrowserRouter>
    </StoreProvider>
  );
}

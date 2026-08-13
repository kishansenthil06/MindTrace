import { Link } from "react-router-dom";
import { Logo } from "@/components/layout/Navbar";

export function Footer() {
  return (
    <footer className="border-t border-[#1a1d28] bg-[#0A0B10]" data-testid="footer">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-slate-500">
            Explainable AI for mental-health assessment research.
          </p>
          <p className="mt-4 text-xs leading-relaxed text-slate-600" data-testid="footer-privacy">
            Privacy: your information is used to generate your assessment and display your results. Captured
            photos and voice recordings stay in your browser and are not uploaded.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-2">
          <div>
            <p className="label-xs mb-4">Product</p>
            <ul className="space-y-3">
              <li><Link to="/assessment" className="link-quiet" data-testid="footer-assessment">Assessment</Link></li>
              <li><Link to="/insights" className="link-quiet" data-testid="footer-insights">Model insights</Link></li>
              <li><Link to="/history" className="link-quiet" data-testid="footer-history">History</Link></li>
            </ul>
          </div>
          <div>
            <p className="label-xs mb-4">Company</p>
            <ul className="space-y-3">
              <li><Link to="/about" className="link-quiet" data-testid="footer-about">About</Link></li>
              <li><Link to="/about#privacy" className="link-quiet" data-testid="footer-privacy-link">Privacy</Link></li>
              <li><Link to="/about#disclaimer" className="link-quiet" data-testid="footer-disclaimer">Disclaimer</Link></li>
              <li><Link to="/about#contact" className="link-quiet" data-testid="footer-contact">Contact</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-[#15181f] px-5 py-6 text-center text-xs text-slate-600 sm:px-8">
        © 2026 MindTrace AI · Research prototype, not a medical device.
      </div>
    </footer>
  );
}

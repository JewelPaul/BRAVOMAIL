import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { initializeSecurityProtections } from "@/utils/security";
import Index from "./pages/Index";
import About from "./pages/About";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import TermsAndConditions from "./pages/TermsAndConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import HelpCenter from "./pages/HelpCenter";
import Articles from "./pages/Articles";
import TemporaryEmailPrivacySecurity from "./pages/articles/TemporaryEmailPrivacySecurity";
import PreventSpamPhishing from "./pages/articles/PreventSpamPhishing";
import DigitalSafetyBestPractices from "./pages/articles/DigitalSafetyBestPractices";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Initialize security protections on app start
    initializeSecurityProtections();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="/help-center" element={<HelpCenter />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/articles/temporary-email-privacy-security" element={<TemporaryEmailPrivacySecurity />} />
            <Route path="/articles/prevent-spam-phishing" element={<PreventSpamPhishing />} />
            <Route path="/articles/digital-safety-best-practices" element={<DigitalSafetyBestPractices />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

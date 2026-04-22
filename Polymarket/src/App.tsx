import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "@/contexts/WalletContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Leaderboard from "./pages/Leaderboard";
import CopyTrading from "./pages/CopyTrading";
import Settings from "./pages/Settings";
import Trade from "./pages/Trade";
import Positions from "./pages/Positions";
import NotFound from "./pages/NotFound";

// Lazy load 3D background to avoid blocking initial render
const Background3D = lazy(() => import("@/components/ui/Background3D"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WalletProvider>
      <TooltipProvider>
        {/* 3D Background */}
        <Suspense fallback={null}>
          <Background3D />
        </Suspense>
        
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/trade" element={<Trade />} />
            <Route path="/positions" element={<Positions />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/copy" element={<CopyTrading />} />
            <Route path="/settings" element={<Settings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </WalletProvider>
  </QueryClientProvider>
);

export default App;

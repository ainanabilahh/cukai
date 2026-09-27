import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FileStorageProvider } from "@/contexts/FileStorageContext";
import { TaxRatesProvider } from "@/contexts/TaxRatesContext";
import Index from "./pages/Index";
import Charts from "./pages/Charts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <FileStorageProvider>
        <TaxRatesProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/charts" element={<Charts />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TaxRatesProvider>
      </FileStorageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

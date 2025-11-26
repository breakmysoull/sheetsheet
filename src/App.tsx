import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import InventoryPage from "./pages/InventoryPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import AuditPage from "./pages/AuditPage";
import ReportsPage from "./pages/ReportsPage";
import { AuthProvider } from "./context/AuthContext";
import RecipesPage from "./pages/RecipesPage";
import ProductionPage from "./pages/ProductionPage";
import PurchasesPage from "./pages/PurchasesPage";
import ChecklistPage from "./pages/ChecklistPage";
import UtensilsPage from "./pages/UtensilsPage";
import ForecastPage from "./pages/ForecastPage";
import { useAuth } from "./context/AuthContext";
import InventoryCheckPage from "./pages/InventoryCheckPage";
import InventoryDailyPage from "./pages/InventoryDailyPage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ perm, element }: { perm: string; element: JSX.Element }) => {
  const { can } = useAuth();
  return can(perm) ? element : <NotFound />
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/inventory-daily" element={<InventoryDailyPage />} />
            <Route path="/inventory-daily-check" element={<InventoryCheckPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/audit" element={<ProtectedRoute perm="logs.viewAll" element={<AuditPage />} />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/recipes" element={<RecipesPage />} />
            <Route path="/production" element={<ProductionPage />} />
            <Route path="/purchases" element={<PurchasesPage />} />
            <Route path="/checklist" element={<ChecklistPage />} />
            <Route path="/utensils" element={<UtensilsPage />} />
            <Route path="/forecast" element={<ForecastPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/home" element={<Home />} />
            <Route path="/help" element={<Help />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

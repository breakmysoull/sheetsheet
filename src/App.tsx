import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
const Home = lazy(() => import('./pages/Home'));
const Help = lazy(() => import('./pages/Help'));
const NotFound = lazy(() => import('./pages/NotFound'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
import { AuthProvider } from "./context/AuthContext";
const RecipesPage = lazy(() => import('./pages/RecipesPage'));
const ProductionPage = lazy(() => import('./pages/ProductionPage'));
const PurchasesPage = lazy(() => import('./pages/PurchasesPage'));
const RequestsPage = lazy(() => import('./pages/RequestsPage'));
const RequestCreationPage = lazy(() => import('./pages/RequestCreationPage'));
const ChecklistPage = lazy(() => import('./pages/ChecklistPage'));
const UtensilsPage = lazy(() => import('./pages/UtensilsPage'));
const ForecastPage = lazy(() => import('./pages/ForecastPage'));
import { useAuth } from "./context/AuthContext";
import { useInventory } from "@/hooks/useInventory";
const InventoryCheckPage = lazy(() => import('./pages/InventoryCheckPage'));
const InventoryDailyPage = lazy(() => import('./pages/InventoryDailyPage'));
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
const AdminPage = lazy(() => import('./pages/AdminPage'));
const SuperAdminPage = lazy(() => import('./pages/SuperAdminPage'));

const queryClient = new QueryClient();

const ProtectedRoute = ({ perm, element }: { perm: string; element: JSX.Element }) => {
  const { can, user } = useAuth();
  
  if (!user) {
    return <LoginPage />;
  }
  
  return can(perm) ? element : <NotFound />
}

const AppRoutes = () => {
  const { role } = useAuth()
  const { setKitchenCode } = useInventory() as any
  const [impersonationCode, setImpersonationCode] = React.useState<string | null>(null)
  React.useEffect(() => {
    try {
      const active = localStorage.getItem('impersonation_active')
      const code = localStorage.getItem('kitchen_code')
      const orig = localStorage.getItem('impersonation_original_kitchen_code')
      if (active === 'true' && code && orig) setImpersonationCode(code)
      else setImpersonationCode(null)
    } catch {
      setImpersonationCode(null)
    }
  }, [])
  const exitImpersonation = () => {
    try {
      const orig = localStorage.getItem('impersonation_original_kitchen_code') || ''
      if (orig) localStorage.setItem('kitchen_code', orig)
      localStorage.removeItem('impersonation_active')
      localStorage.removeItem('impersonation_original_kitchen_code')
      setKitchenCode(orig)
    } catch {}
    window.location.reload()
  }
  return (
    <>
      {role === 'super_admin' && impersonationCode && (
        <div className="w-full bg-yellow-200 text-yellow-900 text-sm px-4 py-2">
          Você está visualizando como {impersonationCode}. <button className="underline" onClick={exitImpersonation}>Clique aqui para voltar ao seu tenant.</button>
        </div>
      )}
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Carregando…</div>}>
      <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/inventory" element={<InventoryPage />} />
      <Route path="/inventory-daily" element={<InventoryDailyPage />} />
      <Route path="/inventory-daily-check" element={<InventoryCheckPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/audit" element={<ProtectedRoute perm="logs.viewAll" element={<AuditPage />} />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/recipes" element={<RecipesPage />} />
      <Route path="/production" element={<ProtectedRoute perm="production.register" element={<ProductionPage />} />} />
      <Route path="/purchases" element={<PurchasesPage />} />
      <Route path="/requests" element={<RequestsPage />} />
      <Route path="/requests/new" element={<RequestCreationPage />} />
      <Route path="/checklist" element={<ChecklistPage />} />
      <Route path="/utensils" element={<UtensilsPage />} />
      <Route path="/forecast" element={<ForecastPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/home" element={<Home />} />
      <Route path="/help" element={<Help />} />
      <Route path="/admin" element={<ProtectedRoute perm="admin.viewUsers" element={<AdminPage />} />} />
      <Route path="/super-admin" element={<ProtectedRoute perm="admin.systemConfig" element={<SuperAdminPage />} />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </>
  )
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle className="text-center">Ocorreu um erro</CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => location.reload()}>Recarregar</Button>
            </CardContent>
          </Card>
        </div>
      )
    }
    return this.props.children
  }
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
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

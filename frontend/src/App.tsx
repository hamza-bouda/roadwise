import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import SignalementsList from "./pages/SignalementsList";
import SignalementDetails from "./pages/SignalementDetails";
import Map from "./pages/Map";
import Maintenances from "./pages/MaintenancesList";
import MaintenanceDetails from "./pages/MaintenanceDetails";
import Profile from "./pages/Profile";  // <-- import Profile here
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import Teams from "./pages/Teams";
import { AuthProvider } from "./contexts/AuthContext";
import PendingMaintenances from "./pages/PendingMaintenances";

const queryClient = new QueryClient();

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to={`/login?redirect=${location.pathname}`} replace />;

  return <Outlet />;  // <-- render nested protected routes here
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SidebarProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              {/* Protected routes wrapped inside ProtectedRoute */}
              <Route element={<ProtectedRoute />}>
                {/* Layout is the wrapper with sidebar and header */}
                <Route element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="reports" element={<SignalementsList />} />
                  <Route path="reports/:id" element={<SignalementDetails />} />
                  <Route path="map" element={<Map />} />
                  <Route path="maintenances" element={<Maintenances />} />
                  <Route path="maintenance/:id" element={<MaintenanceDetails />} />
                  <Route path="teams" element={<Teams />} />
                  <Route path="profile" element={<Profile />} />  
                  <Route path="pendingmaintenances" element={<PendingMaintenances />} />  

                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </SidebarProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

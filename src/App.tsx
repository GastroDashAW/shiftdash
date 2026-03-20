import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { AuthPage } from "@/components/AuthPage";
import { useAuth } from "@/hooks/useAuth";
import AdminDashboard from "./pages/AdminDashboard";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import ShiftTypes from "./pages/ShiftTypes";
import Schedule from "./pages/Schedule";
import Validation from "./pages/Validation";
import ExportPage from "./pages/Export";
import TimeControl from "./pages/TimeControl";
import Budget from "./pages/Budget";
import Business from "./pages/Business";
import Groups from "./pages/Groups";
import LeaveRequests from "./pages/LeaveRequests";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><p>Laden...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p>Laden...</p></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/clock" element={<Dashboard />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/leave" element={<LeaveRequests />} />
              <Route path="/employees" element={<ProtectedRoute adminOnly><Employees /></ProtectedRoute>} />
              <Route path="/shifts" element={<ProtectedRoute adminOnly><ShiftTypes /></ProtectedRoute>} />
              <Route path="/time-control" element={<ProtectedRoute adminOnly><TimeControl /></ProtectedRoute>} />
              <Route path="/validation" element={<ProtectedRoute adminOnly><Validation /></ProtectedRoute>} />
              <Route path="/export" element={<ProtectedRoute adminOnly><ExportPage /></ProtectedRoute>} />
              <Route path="/budget" element={<ProtectedRoute adminOnly><Budget /></ProtectedRoute>} />
              <Route path="/business" element={<ProtectedRoute adminOnly><Business /></ProtectedRoute>} />
              <Route path="/groups" element={<ProtectedRoute adminOnly><Groups /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;

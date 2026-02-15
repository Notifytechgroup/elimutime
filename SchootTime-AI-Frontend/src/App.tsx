import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useSessionManager } from "@/hooks/useSessionManager";
import { initializeUUIDSafety } from "@/lib/supabase-uuid-safety";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import RoleSelection from "./pages/RoleSelection";
import Dashboard from "./pages/Dashboard";
import Teachers from "./pages/Teachers";
import Streams from "./pages/Streams";
import Timetables from "./pages/Timetables";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSchools from "./pages/admin/AdminSchools";
import AdminSchoolDetail from "./pages/admin/AdminSchoolDetail";
import AdminTemplates from "./pages/admin/AdminTemplates";
import AdminTimetables from "./pages/admin/AdminTimetables";
import AdminBilling from "./pages/admin/AdminBilling";
import TestLogin from "./pages/TestLogin";
import DebugSession from "./pages/DebugSession";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Session manager wrapper component
const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  useSessionManager();

  // Initialize UUID safety checks on mount
  useEffect(() => {
    initializeUUIDSafety();
  }, []);
  return <>{children}</>;
};

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />

          <BrowserRouter>
            <SessionProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/signup" element={<Auth isSignUp={true} />} />
                <Route path="/test-login" element={<TestLogin />} />
                <Route path="/debug-session" element={<DebugSession />} />
                <Route path="/role-selection" element={<RoleSelection />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/teachers" element={<Teachers />} />
                <Route path="/streams" element={<Streams />} />
                <Route path="/timetables" element={<Timetables />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/schools" element={<AdminSchools />} />
                <Route path="/admin/schools/:schoolId" element={<AdminSchoolDetail />} />
                <Route path="/admin/templates" element={<AdminTemplates />} />
                <Route path="/admin/timetables" element={<AdminTimetables />} />
                <Route path="/admin/billing" element={<AdminBilling />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SessionProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;

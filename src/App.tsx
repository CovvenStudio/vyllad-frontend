import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { monitoring } from "@/lib/monitoring/monitoring";
import Index from "./pages/Index.tsx";
import PropertyPage from "./pages/PropertyPage.tsx";
import PropertyPublic from "./pages/PropertyPublic.tsx";
import AnnouncementPublic from "./pages/AnnouncementPublic.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Agents from "./pages/Agents.tsx";
import Appointments from "./pages/Appointments.tsx";
import LeadFormSettings from "./pages/LeadFormSettings.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import SubscriptionGuard from "./components/SubscriptionGuard.tsx";
import FeatureRoute from "./components/FeatureRoute.tsx";
import VisitBooking from "./pages/VisitBooking.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import AgencySelect from "./pages/AgencySelect.tsx";
import CheckoutReturn from "./pages/CheckoutReturn.tsx";
import AcceptInvite from "./pages/AcceptInvite.tsx";
import ScoringConfig from './pages/ScoringConfig';
import AgencySettings from './pages/AgencySettings';
import VisitSlotPicker from './pages/VisitSlotPicker';
import Billing from './pages/Billing';
import UpgradePlan from './pages/UpgradePlan';
import Imoveis from './pages/Imoveis';
import PropertyDetail from './pages/PropertyDetail';
import SystemUnavailable from './pages/SystemUnavailable';
import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext';

const queryClient = new QueryClient();
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

const ErrorFallback = (
  <div className="min-h-screen flex items-center justify-center text-center px-4">
    <div>
      <h1 className="text-lg font-semibold mb-2">Algo correu mal</h1>
      <p className="text-sm text-muted-foreground">Por favor recarregue a página.</p>
    </div>
  </div>
);

const App = () => (
  <monitoring.ErrorBoundary fallback={ErrorFallback}>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FeatureFlagsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/p/:agencySlug/:propertySlug" element={<PropertyPage />} />
                <Route path="/property/:id" element={<PropertyPublic />} />
                <Route path="/announcement/:id" element={<AnnouncementPublic />} />
                <Route path="/visit/:candidateId" element={<VisitSlotPicker />} />
                <Route path="/select-agency" element={<ProtectedRoute><AgencySelect /></ProtectedRoute>} />
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                <Route path="/checkout/success" element={<ProtectedRoute><CheckoutReturn /></ProtectedRoute>} />
                <Route path="/invite/:token" element={<AcceptInvite />} />
                <Route path="/dashboard" element={<ProtectedRoute><SubscriptionGuard><FeatureRoute featureKey="dashboard.module_enabled" fallbackTo="/properties"><Dashboard /></FeatureRoute></SubscriptionGuard></ProtectedRoute>} />
                <Route path="/properties" element={<ProtectedRoute><SubscriptionGuard><FeatureRoute featureKey="properties.module_enabled"><Imoveis /></FeatureRoute></SubscriptionGuard></ProtectedRoute>} />
                <Route path="/properties/:id" element={<ProtectedRoute><SubscriptionGuard><FeatureRoute featureKey="properties.module_enabled"><PropertyDetail /></FeatureRoute></SubscriptionGuard></ProtectedRoute>} />
                <Route path="/agents" element={<ProtectedRoute><SubscriptionGuard><FeatureRoute featureKey="agents.management_enabled"><Agents /></FeatureRoute></SubscriptionGuard></ProtectedRoute>} />
                <Route path="/appointments" element={<ProtectedRoute><SubscriptionGuard><FeatureRoute featureKey="appointments.module_enabled"><Appointments /></FeatureRoute></SubscriptionGuard></ProtectedRoute>} />
                <Route path="/screening" element={<ProtectedRoute><SubscriptionGuard><FeatureRoute featureKey="screening.module_enabled"><LeadFormSettings /></FeatureRoute></SubscriptionGuard></ProtectedRoute>} />
                <Route path="/scoring" element={<ProtectedRoute><SubscriptionGuard><FeatureRoute featureKey="scoring.module_enabled"><ScoringConfig /></FeatureRoute></SubscriptionGuard></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SubscriptionGuard><FeatureRoute featureKey="settings.module_enabled"><AgencySettings /></FeatureRoute></SubscriptionGuard></ProtectedRoute>} />
                <Route path="/billing" element={<ProtectedRoute><SubscriptionGuard><FeatureRoute featureKey="billing.module_enabled"><Billing /></FeatureRoute></SubscriptionGuard></ProtectedRoute>} />
                <Route path="/onboarding/upgrade" element={<ProtectedRoute><UpgradePlan /></ProtectedRoute>} />
                <Route path="/system-unavailable" element={<SystemUnavailable />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </FeatureFlagsProvider>
      </AuthProvider>
    </QueryClientProvider>
  </GoogleOAuthProvider>
  </monitoring.ErrorBoundary>
);

export default App;

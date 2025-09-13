import { HashRouter, BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import HomePage from "@/pages/home-page";
import LandingPage from "@/pages/landing-page";
import AuthPage from "@/pages/auth-page";
import PasswordGate from "@/pages/password-gate";
import { ThemeProvider } from "next-themes";
import { ProtectedRoute } from "@/lib/protected-route";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { PasswordGateProvider, usePasswordGate } from "@/hooks/use-password-gate";

// Lazy load heavy components for better performance
const ListingsPage = lazy(() => import("@/pages/listings-page"));
const ListingDetailsPage = lazy(() => import("@/pages/listing-details-page"));
const CreateListingPage = lazy(() => import("@/pages/create-listing-page"));
const BrowseListingsPage = lazy(() => import("@/pages/browse-listings-page").then(m => ({ default: m.BrowseListingsPage })));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const ProfilePage = lazy(() => import("@/pages/profile-page"));
const MessagesPage = lazy(() => import("@/pages/messages-page"));
const CannabisProductsPage = lazy(() => import("@/pages/cannabis-products-page"));
const OrdersPage = lazy(() => import("@/pages/orders-page"));
const OrderDetailsPage = lazy(() => import("@/pages/order-details-page"));
const BlockchainPage = lazy(() => import("@/pages/blockchain-page"));
const GeographicPage = lazy(() => import("@/pages/geographic-page"));
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const BuySignalsPage = lazy(() => import("@/pages/BuySignalsPage"));
const CreateBuySignalPage = lazy(() => import("@/pages/CreateBuySignalPage"));
const BuySignalDetailPage = lazy(() => import("@/pages/BuySignalDetailPage"));
const SellerOnboarding = lazy(() => import("@/pages/onboarding/seller-onboarding"));
const BrokerOnboarding = lazy(() => import("@/pages/onboarding/broker-onboarding"));
const BrokerDashboard = lazy(() => import("@/pages/broker/broker-dashboard"));
const OrganizationAdmin = lazy(() => import("@/pages/seller/organization-admin"));
const CreateOrganization = lazy(() => import("@/pages/organizations/create-organization"));
const UploadDocuments = lazy(() => import("@/pages/documents/upload-documents"));
const DocumentsPage = lazy(() => import("@/pages/documents-page"));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-border" />
  </div>
);

function AppContent() {
  const { hasAccess, isLoading, grantAccess } = usePasswordGate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!hasAccess) {
    return <PasswordGate onPasswordCorrect={grantAccess} />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/onboarding/seller" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <SellerOnboarding />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/onboarding/broker" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <BrokerOnboarding />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/broker/dashboard" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <BrokerDashboard />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/seller/organization" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <OrganizationAdmin />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/organizations/create" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <CreateOrganization />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/documents" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <DocumentsPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/documents/upload" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <UploadDocuments />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <HomePage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/home" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <HomePage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/search" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <SearchPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/listings" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <ListingsPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/listings/create" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <CreateListingPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/listings/:id" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <ListingDetailsPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <ProfilePage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <MessagesPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/cannabis-products" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <CannabisProductsPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <OrdersPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/orders/:id" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <OrderDetailsPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/blockchain" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <BlockchainPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/geographic" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <GeographicPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/buy-signals" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <BuySignalsPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/buy-signals/create" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <CreateBuySignalPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/buy-signals/:id" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <BuySignalDetailPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <AdminDashboard />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
}

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        } />
        <Route path="/listings" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <ListingsPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/listings/create" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <CreateListingPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/listings/:id" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <ListingDetailsPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/search" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <SearchPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/documents" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <DocumentsPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <ProfilePage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <MessagesPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/cannabis-products" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <CannabisProductsPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <OrdersPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/orders/:id" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <OrderDetailsPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/blockchain" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <BlockchainPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/geographic" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <GeographicPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/buy-signals" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <BuySignalsPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/buy-signals/create" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <CreateBuySignalPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/buy-signals/:id" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <BuySignalDetailPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <AdminDashboard />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <PasswordGateProvider>
            <AuthProvider>
              <AppContent />
              <Toaster />
            </AuthProvider>
          </PasswordGateProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { useSupabaseInit } from './hooks/useSupabaseInit';
import { useRealtimeOrders } from './hooks/useRealtimeOrders';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageLoader } from './components/PageLoader';

// ── Lazy-loaded route chunks ──────────────────────────────────────────────────
// Each group maps to a manualChunk in vite.config.ts for optimal caching.

// Public / auth
const Landing               = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const Login                 = lazy(() => import('./pages/auth/Login').then(m => ({ default: m.Login })));
const RegisterStoreOwner    = lazy(() => import('./pages/auth/RegisterStoreOwner').then(m => ({ default: m.RegisterStoreOwner })));
const RegisterServiceProvider = lazy(() => import('./pages/auth/RegisterServiceProvider').then(m => ({ default: m.RegisterServiceProvider })));
const RegisterCustomer      = lazy(() => import('./pages/auth/RegisterCustomer').then(m => ({ default: m.RegisterCustomer })));

// Admin
const AdminDashboard  = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminProducts   = lazy(() => import('./pages/admin/AdminProducts').then(m => ({ default: m.AdminProducts })));
const AdminServices   = lazy(() => import('./pages/admin/AdminServices').then(m => ({ default: m.AdminServices })));
const AdminStores     = lazy(() => import('./pages/admin/AdminStores').then(m => ({ default: m.AdminStores })));
const AdminOrders     = lazy(() => import('./pages/admin/AdminOrders').then(m => ({ default: m.AdminOrders })));
const AdminAnalytics  = lazy(() => import('./pages/admin/AdminAnalytics').then(m => ({ default: m.AdminAnalytics })));
const AdminPayouts    = lazy(() => import('./pages/admin/AdminPayouts').then(m => ({ default: m.AdminPayouts })));
const AdminAgents     = lazy(() => import('./pages/admin/AdminAgents').then(m => ({ default: m.AdminAgents })));
const AdminHomepage   = lazy(() => import('./pages/admin/AdminHomepage').then(m => ({ default: m.AdminHomepage })));
const AdminUsers      = lazy(() => import('./pages/admin/AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminRoles      = lazy(() => import('./pages/admin/AdminRoles').then(m => ({ default: m.AdminRoles })));
const AdminInsights   = lazy(() => import('./pages/admin/AdminInsights').then(m => ({ default: m.AdminInsights })));
const AdminTracking   = lazy(() => import('./pages/admin/AdminTracking').then(m => ({ default: m.AdminTracking })));

// Store owner
const StoreDashboard  = lazy(() => import('./pages/store-owner/StoreDashboard').then(m => ({ default: m.StoreDashboard })));
const StoreProfile    = lazy(() => import('./pages/store-owner/StoreProfile').then(m => ({ default: m.StoreProfile })));
const StoreOrders     = lazy(() => import('./pages/store-owner/StoreOrders').then(m => ({ default: m.StoreOrders })));
const StoreWallet     = lazy(() => import('./pages/store-owner/StoreWallet').then(m => ({ default: m.StoreWallet })));
const StoreCustomize  = lazy(() => import('./pages/store-owner/StoreCustomize').then(m => ({ default: m.StoreCustomize })));

// Service provider
const ServiceProviderDashboard = lazy(() => import('./pages/service-provider/ServiceProviderDashboard').then(m => ({ default: m.ServiceProviderDashboard })));
const ServiceProviderServices  = lazy(() => import('./pages/service-provider/ServiceProviderServices').then(m => ({ default: m.ServiceProviderServices })));
const ServiceProviderOrders    = lazy(() => import('./pages/service-provider/ServiceProviderOrders').then(m => ({ default: m.ServiceProviderOrders })));
const ServiceProviderWallet    = lazy(() => import('./pages/service-provider/ServiceProviderWallet').then(m => ({ default: m.ServiceProviderWallet })));
const ServiceProviderProfile   = lazy(() => import('./pages/service-provider/ServiceProviderProfile').then(m => ({ default: m.ServiceProviderProfile })));

// Customer
const CustomerStorefront = lazy(() => import('./pages/customer/CustomerStorefront').then(m => ({ default: m.CustomerStorefront })));
const CustomerCart       = lazy(() => import('./pages/customer/CustomerCart').then(m => ({ default: m.CustomerCart })));
const CustomerCheckout   = lazy(() => import('./pages/customer/CustomerCheckout').then(m => ({ default: m.CustomerCheckout })));
const CustomerOrders     = lazy(() => import('./pages/customer/CustomerOrders').then(m => ({ default: m.CustomerOrders })));
const CustomerServices   = lazy(() => import('./pages/customer/CustomerServices').then(m => ({ default: m.CustomerServices })));
const ProductDetail      = lazy(() => import('./pages/customer/ProductDetail').then(m => ({ default: m.ProductDetail })));
const ServiceDetail      = lazy(() => import('./pages/customer/ServiceDetail').then(m => ({ default: m.ServiceDetail })));
const StoreStorefront    = lazy(() => import('./pages/customer/StoreStorefront').then(m => ({ default: m.StoreStorefront })));
const StoresListing      = lazy(() => import('./pages/customer/StoresListing').then(m => ({ default: m.StoresListing })));

// Agent
const AgentDashboard = lazy(() => import('./pages/agent/AgentDashboard').then(m => ({ default: m.AgentDashboard })));
const AgentProducts  = lazy(() => import('./pages/agent/AgentProducts').then(m => ({ default: m.AgentProducts })));
const AgentServices  = lazy(() => import('./pages/agent/AgentServices').then(m => ({ default: m.AgentServices })));
const AgentOrders    = lazy(() => import('./pages/agent/AgentOrders').then(m => ({ default: m.AgentOrders })));
const AgentWallet    = lazy(() => import('./pages/agent/AgentWallet').then(m => ({ default: m.AgentWallet })));

// ── Route guards ──────────────────────────────────────────────────────────────
type Role = 'admin' | 'store_owner' | 'service_provider' | 'customer' | 'agent';

const ProtectedRoute: React.FC<{ role: Role; children: React.ReactNode }> = ({ role, children }) => {
  const { currentUser } = useAppStore();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.role !== role) {
    if (currentUser.role === 'admin')             return <Navigate to="/admin"            replace />;
    if (currentUser.role === 'store_owner')       return <Navigate to="/store"            replace />;
    if (currentUser.role === 'service_provider')  return <Navigate to="/service-provider" replace />;
    if (currentUser.role === 'agent')             return <Navigate to="/agent"            replace />;
    return <Navigate to="/shop" replace />;
  }
  return <>{children}</>;
};

const AnyAuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAppStore();
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  // Initialise Supabase session on mount and listen for auth changes.
  // In mock mode (no env vars) this is a no-op that sets supabaseReady = true.
  useSupabaseInit();
  // Subscribe to Supabase realtime changes for orders (admin, store_owner, provider)
  useRealtimeOrders();

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Public ────────────────────────────────────────────────────── */}
            <Route path="/"                        element={<Landing />} />
            <Route path="/login"                   element={<Login />} />
            <Route path="/register/store-owner"    element={<RegisterStoreOwner />} />
            <Route path="/register/service-provider" element={<RegisterServiceProvider />} />
            <Route path="/register/customer"       element={<RegisterCustomer />} />

            {/* ── Admin ─────────────────────────────────────────────────────── */}
            <Route path="/admin"           element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/products"  element={<ProtectedRoute role="admin"><AdminProducts /></ProtectedRoute>} />
            <Route path="/admin/services"  element={<ProtectedRoute role="admin"><AdminServices /></ProtectedRoute>} />
            <Route path="/admin/stores"    element={<ProtectedRoute role="admin"><AdminStores /></ProtectedRoute>} />
            <Route path="/admin/orders"    element={<ProtectedRoute role="admin"><AdminOrders /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute role="admin"><AdminAnalytics /></ProtectedRoute>} />
            <Route path="/admin/payouts"   element={<ProtectedRoute role="admin"><AdminPayouts /></ProtectedRoute>} />
            <Route path="/admin/agents"    element={<ProtectedRoute role="admin"><AdminAgents /></ProtectedRoute>} />
            <Route path="/admin/homepage"  element={<ProtectedRoute role="admin"><AdminHomepage /></ProtectedRoute>} />
            <Route path="/admin/users"     element={<ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/roles"     element={<ProtectedRoute role="admin"><AdminRoles /></ProtectedRoute>} />
            <Route path="/admin/insights"  element={<ProtectedRoute role="admin"><AdminInsights /></ProtectedRoute>} />
            <Route path="/admin/tracking"  element={<ProtectedRoute role="admin"><AdminTracking /></ProtectedRoute>} />

            {/* ── Store Owner ────────────────────────────────────────────────── */}
            <Route path="/store"           element={<ProtectedRoute role="store_owner"><StoreDashboard /></ProtectedRoute>} />
            <Route path="/store/profile"   element={<ProtectedRoute role="store_owner"><StoreProfile /></ProtectedRoute>} />
            <Route path="/store/orders"    element={<ProtectedRoute role="store_owner"><StoreOrders /></ProtectedRoute>} />
            <Route path="/store/wallet"    element={<ProtectedRoute role="store_owner"><StoreWallet /></ProtectedRoute>} />
            <Route path="/store/customize" element={<ProtectedRoute role="store_owner"><StoreCustomize /></ProtectedRoute>} />

            {/* ── Service Provider ───────────────────────────────────────────── */}
            <Route path="/service-provider"          element={<ProtectedRoute role="service_provider"><ServiceProviderDashboard /></ProtectedRoute>} />
            <Route path="/service-provider/services" element={<ProtectedRoute role="service_provider"><ServiceProviderServices /></ProtectedRoute>} />
            <Route path="/service-provider/orders"   element={<ProtectedRoute role="service_provider"><ServiceProviderOrders /></ProtectedRoute>} />
            <Route path="/service-provider/wallet"   element={<ProtectedRoute role="service_provider"><ServiceProviderWallet /></ProtectedRoute>} />
            <Route path="/service-provider/profile"  element={<ProtectedRoute role="service_provider"><ServiceProviderProfile /></ProtectedRoute>} />

            {/* ── Customer ───────────────────────────────────────────────────── */}
            <Route path="/shop"                  element={<AnyAuthRoute><CustomerStorefront /></AnyAuthRoute>} />
            <Route path="/shop/services"         element={<AnyAuthRoute><CustomerServices /></AnyAuthRoute>} />
            <Route path="/shop/stores"           element={<AnyAuthRoute><StoresListing /></AnyAuthRoute>} />
            <Route path="/shop/cart"             element={<ProtectedRoute role="customer"><CustomerCart /></ProtectedRoute>} />
            <Route path="/shop/checkout"         element={<ProtectedRoute role="customer"><CustomerCheckout /></ProtectedRoute>} />
            <Route path="/shop/orders"           element={<ProtectedRoute role="customer"><CustomerOrders /></ProtectedRoute>} />
            <Route path="/shop/product/:id"      element={<ProductDetail />} />
            <Route path="/shop/service/:id"      element={<ServiceDetail />} />
            <Route path="/shop/store/:slug"      element={<StoreStorefront />} />

            {/* ── Agent ─────────────────────────────────────────────────────── */}
            <Route path="/agent"          element={<ProtectedRoute role="agent"><AgentDashboard /></ProtectedRoute>} />
            <Route path="/agent/products" element={<ProtectedRoute role="agent"><AgentProducts /></ProtectedRoute>} />
            <Route path="/agent/services" element={<ProtectedRoute role="agent"><AgentServices /></ProtectedRoute>} />
            <Route path="/agent/orders"   element={<ProtectedRoute role="agent"><AgentOrders /></ProtectedRoute>} />
            <Route path="/agent/wallet"   element={<ProtectedRoute role="agent"><AgentWallet /></ProtectedRoute>} />

            {/* ── Fallback ───────────────────────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

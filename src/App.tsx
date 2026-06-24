/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, type ReactNode, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { lazyWithRetry } from './lib/lazyWithRetry';
import { identifyUser, resetAnalytics } from './lib/analytics';
import { AnalyticsProvider } from './components/AnalyticsProvider';
import ToastContainer from './components/ui/Toast';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

const Landing = lazyWithRetry(() => import('./pages/Landing'));
const SalonDetails = lazyWithRetry(() => import('./pages/SalonDetails'));
const CustomerDashboard = lazyWithRetry(() => import('./pages/CustomerDashboard'));
const SellerDashboard = lazyWithRetry(() => import('./pages/SellerDashboard'));
const AdminDashboard = lazyWithRetry(() => import('./pages/AdminDashboard'));
const BookingAction = lazyWithRetry(() => import('./pages/BookingAction'));
const AdminSalonManage = lazyWithRetry(() => import('./pages/AdminSalonManage'));
const ContactUs = lazyWithRetry(() => import('./pages/ContactUs'));
const TermsOfService = lazyWithRetry(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazyWithRetry(() => import('./pages/PrivacyPolicy'));

function ProtectedRoute({
  children,
  role,
  roles,
}: {
  children: ReactNode;
  role?: string;
  roles?: string[];
}) {
  const { user } = useAuthStore();
  const location = useLocation();
  const allowed = roles ?? (role ? [role] : undefined);

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (allowed && !allowed.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function RouteFallback() {
  return <div className="py-10 text-center text-stone-500">Loading page...</div>;
}

function AppShell() {
  return (
    <Layout>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/explore" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/salon/:id" element={<SalonDetails />} />
          <Route
            path="/booking/action/:token"
            element={
              <ProtectedRoute roles={['SELLER', 'ADMIN']}>
                <BookingAction />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/customer"
            element={
              <ProtectedRoute role="CUSTOMER">
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/seller"
            element={
              <ProtectedRoute role="SELLER">
                <SellerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/salon/:id"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminSalonManage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/explore" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

function AuthAnalyticsSync() {
  const { user } = useAuthStore();
  useEffect(() => {
    if (user) {
      identifyUser(user.id, { email: user.email, role: user.role, name: user.name });
    } else {
      resetAnalytics();
    }
  }, [user]);
  return null;
}

export default function App() {
  return (
    <Router>
      <AuthAnalyticsSync />
      <AnalyticsProvider>
        <ToastContainer />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="*" element={<AppShell />} />
          </Routes>
        </Suspense>
      </AnalyticsProvider>
    </Router>
  );
}

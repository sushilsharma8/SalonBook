/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { lazyWithRetry } from './lib/lazyWithRetry';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
const SalonDetails = lazyWithRetry(() => import('./pages/SalonDetails'));
const CustomerDashboard = lazyWithRetry(() => import('./pages/CustomerDashboard'));
const SellerDashboard = lazyWithRetry(() => import('./pages/SellerDashboard'));
const AdminDashboard = lazyWithRetry(() => import('./pages/AdminDashboard'));
const BookingAction = lazyWithRetry(() => import('./pages/BookingAction'));
const AdminSalonManage = lazyWithRetry(() => import('./pages/AdminSalonManage'));

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

export default function App() {
  return (
    <Router>
      <Layout>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
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
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}


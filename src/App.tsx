/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
const SalonDetails = lazy(() => import('./pages/SalonDetails'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const BookingAction = lazy(() => import('./pages/BookingAction'));
const AdminSalonManage = lazy(() => import('./pages/AdminSalonManage'));

function ProtectedRoute({ children, role }: { children: ReactNode, role?: string }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
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
            <Route path="/booking/action/:token" element={<BookingAction />} />
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


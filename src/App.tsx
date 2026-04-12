/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import SalonDetails from './pages/SalonDetails';
import CustomerDashboard from './pages/CustomerDashboard';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BookingAction from './pages/BookingAction';
import AdminSalonManage from './pages/AdminSalonManage';

function ProtectedRoute({ children, role }: { children: React.ReactNode, role?: string }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <Layout>
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
      </Layout>
    </Router>
  );
}


import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InquiriesList from './pages/InquiriesList';
import InquiryForm from './pages/InquiryForm';
import InquiryDetails from './pages/InquiryDetails';
import AdminDashboard from './pages/AdminDashboard';
import Success from './pages/Success';
import DesignSystem from './pages/DesignSystem';
import { useAuthStore } from './store/authStore';

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inquiries"
        element={
          <ProtectedRoute>
            <InquiriesList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inquiries/:id"
        element={
          <ProtectedRoute>
            <InquiryDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inquiry"
        element={
          <ProtectedRoute>
            <InquiryForm />
          </ProtectedRoute>
        }
      />

      <Route
        path="/success"
        element={
          <ProtectedRoute>
            <Success />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin-dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin', 'manager']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="/design-system" element={<DesignSystem />} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

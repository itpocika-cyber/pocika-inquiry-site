import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InquiriesList from './pages/InquiriesList';
import InquiryForm from './pages/InquiryForm';
import InquiryDetails from './pages/InquiryDetails';
import AdminDashboard from './pages/AdminDashboard';
import ManageTeam from './pages/ManageTeam';
import SalesMemberDetail from './pages/SalesMemberDetail';
import Success from './pages/Success';
import DesignSystem from './pages/DesignSystem';
import ProductCatalog from './pages/ProductCatalog';
import ManageCatalog from './pages/ManageCatalog';
import { useAuthStore } from './store/authStore';

function RootRedirect() {
  const { user } = useAuthStore();
  const isAdmin = ['admin', 'super_admin', 'manager'].includes(user?.role);
  return <Navigate to={isAdmin ? '/admin-dashboard' : '/dashboard'} replace />;
}

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Root smart redirect */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RootRedirect />
            </ProtectedRoute>
          }
        />

        {/* Shared Inquiries & Dashboard Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['sales_person', 'admin', 'super_admin', 'manager']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inquiries"
          element={
            <ProtectedRoute allowedRoles={['sales_person', 'admin', 'super_admin', 'manager']}>
              <InquiriesList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inquiry"
          element={
            <ProtectedRoute allowedRoles={['sales_person']}>
              <InquiryForm />
            </ProtectedRoute>
          }
        />

        <Route
          path="/success"
          element={
            <ProtectedRoute allowedRoles={['sales_person']}>
              <Success />
            </ProtectedRoute>
          }
        />

        {/* Shared Detail Route (Sales viewing own, Admin reviewing all) */}
        <Route
          path="/inquiries/:id"
          element={
            <ProtectedRoute>
              <InquiryDetails />
            </ProtectedRoute>
          }
        />

        {/* Admin / Manager Only Routes */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'manager']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/team"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <ManageTeam />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/team/:userId"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'manager']}>
              <SalesMemberDetail />
            </ProtectedRoute>
          }
        />

        {/* Catalog Reference Route (Available to both sales and admins) */}
        <Route
          path="/catalog"
          element={
            <ProtectedRoute>
              <ProductCatalog />
            </ProtectedRoute>
          }
        />

        {/* Manage Catalog Route (Admin/Manager only) */}
        <Route
          path="/admin/catalog"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'manager']}>
              <ManageCatalog />
            </ProtectedRoute>
          }
        />

        <Route path="/design-system" element={<DesignSystem />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

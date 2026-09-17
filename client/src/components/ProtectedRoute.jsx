import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user) {
    const isAllowed = allowedRoles.includes(user.role);
    if (!isAllowed) {
      const isAdmin = ['admin', 'manager', 'super_admin'].includes(user.role);
      return <Navigate to={isAdmin ? '/admin-dashboard' : '/dashboard'} replace />;
    }
  }

  return children;
}

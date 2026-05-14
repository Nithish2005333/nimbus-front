import { Navigate } from 'react-router-dom';
import { hasToken } from '../services/api';

export function ProtectedRoute({ children, adminOnly = false }) {
  const isAdminRoute = window.location.pathname === '/admin';
  const isAdminAuthenticated = localStorage.getItem('isAdminAuthenticated') === 'true';

  if (!hasToken() && !(isAdminRoute && isAdminAuthenticated)) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly) {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}


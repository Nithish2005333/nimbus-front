import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Login from '../pages/Login';
import AdminLogin from '../pages/AdminLogin';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Files from '../pages/Files';
import Upload from '../pages/Upload';
import Admin from '../pages/Admin';
import Settings from '../pages/Settings';
import AIAssistant from '../pages/AIAssistant';
import Terms from '../pages/Terms';
import Privacy from '../pages/Privacy';
import Profile from '../pages/Profile';
import Analytics from '../pages/Analytics';
import ShareHub from '../pages/ShareHub';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { hasToken } from '../services/api';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={<Login />}
        />
        <Route
          path="/admin-login"
          element={<AdminLogin />}
        />
        <Route
          path="/register"
          element={<Register />}
        />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />

        {/* Protected Routes - Require Authentication */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/files"
          element={
            <ProtectedRoute>
              <Layout>
                <Files />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/shared"
          element={
            <ProtectedRoute>
              <Layout>
                <ShareHub />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Layout>
                <Upload />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly={true}>
              <Layout>
                <Admin />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute adminOnly={true}>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-assistant"
          element={
            <ProtectedRoute>
              <Layout>
                <AIAssistant />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute adminOnly={true}>
              <Layout>
                <Analytics />
              </Layout>
            </ProtectedRoute>
          }
        />
        {/* Default redirect */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}


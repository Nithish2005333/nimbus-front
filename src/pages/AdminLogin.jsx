import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import Logo from '../components/Logo';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleLogin = (e) => {
    e.preventDefault();
    
    // Check against environment variables
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;

    if (email === adminEmail && password === adminPassword) {
      localStorage.setItem('isAdminAuthenticated', 'true');
      showToast('Admin access granted', 'success');
      navigate('/admin');
    } else {
      showToast('Invalid admin credentials', 'error');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 p-8 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-10">
        <div className="flex flex-col items-center">
          <Logo className="h-12 w-auto mb-4" />
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] text-center">
            Admin Access
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] font-medium">
            Enter credentials to access the control room
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-[var(--text-secondary)] mb-1">
                Admin Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] sm:text-sm transition-colors"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-[var(--text-secondary)] mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] sm:text-sm transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            className="group relative flex w-full justify-center rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
}

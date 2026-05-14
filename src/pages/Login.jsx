import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import CloudVisualization from '../components/CloudVisualization';
import Logo from '../components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authAPI.login(email, password);
      showToast('Login successful!', 'success');
      navigate('/dashboard');
    } catch (error) {
      showToast(error.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const diagramSteps = [
    {
      title: 'Client Device',
      detail: 'Your data originates on your device with local processing',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-cyan-300">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      title: 'Client Encryption',
      detail: 'AES-256 encryption happens on your device before upload. Keys never leave your device.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-emerald-300">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    },
    {
      title: 'Cloud Storage',
      detail: 'Only encrypted data is stored. Cloud has zero knowledge of your content.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-sky-300">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      )
    },
    {
      title: 'Client Decryption',
      detail: 'Decryption happens on your device. Your keys remain private and secure.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-amber-300">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
      )
    },
  ];

  return (
    <div className="relative min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),transparent_55%)] pointer-events-none" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1320px] flex-col lg:flex-row lg:gap-8">
        {/* Header Section - Order 1 on mobile, appears in left side on desktop */}
        <div className="w-full lg:hidden px-4 pt-6 pb-4 sm:px-6 sm:pt-8 sm:pb-6 order-1">
          <div className="text-center flex flex-col items-center">
            <Logo className="h-10 w-auto mb-1" />
            <h2 className="text-xl sm:text-2xl font-black tracking-widest bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-700 bg-clip-text text-transparent">NIMBUS CLOUD</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-widest font-medium opacity-80">Next-gen secure storage</p>
          </div>
        </div>

        {/* Left Side - Visualization and Info (Order 3 on mobile, 1 on desktop) */}
        <div className="flex-1 flex flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12 order-3 lg:order-1">
          <div className="w-full max-w-[960px] mx-auto space-y-6 sm:space-y-8">
            {/* Header Section - Hidden on mobile, shown on desktop */}
            <div className="hidden lg:block text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-4">
                <Logo className="h-14 w-auto" />
                <div>
                  <h2 className="text-3xl font-black tracking-widest bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-700 bg-clip-text text-transparent">NIMBUS CLOUD</h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 uppercase tracking-widest font-medium opacity-80">Next-gen secure storage</p>
                </div>
              </div>
            </div>

            {/* 3D Cloud Visualization */}
            <div className="w-full h-[300px] sm:h-[350px] md:h-[400px] lg:h-[500px] rounded-2xl sm:rounded-3xl border border-[var(--border-color)] bg-gradient-to-br from-[var(--bg-primary)] via-[var(--bg-secondary)] to-[var(--bg-primary)] p-3 sm:p-4 lg:p-6 shadow-xl shadow-black/10">
              <CloudVisualization />
            </div>

            {/* Data Flow Details */}
            <div className="rounded-2xl sm:rounded-3xl border border-[var(--border-color)] bg-[var(--bg-primary)]/50 p-4 sm:p-6 lg:p-8 shadow-inner">
              <p className="text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] text-[var(--text-muted)] mb-4 sm:mb-6">Data Flow Process</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {diagramSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="flex gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 sm:p-4 hover:bg-[var(--bg-primary)] transition-all shadow-sm"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <span className="text-xl sm:text-2xl flex-shrink-0">{step.icon}</span>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">{step.title}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form (Order 2 on mobile, 2 on desktop, Fixed position on large screens) */}
        <div className="w-full lg:w-[450px] lg:flex-shrink-0 lg:sticky lg:top-0 lg:h-screen flex items-center justify-center px-4 py-6 sm:py-8 lg:py-12 order-2 lg:order-2">
          <div className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/95 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/10">
            <div className="mb-6 sm:mb-8 text-center flex flex-col items-center">
              <div className="lg:hidden mb-4">
                <Logo className="h-10 w-auto" />
              </div>
              <p className="text-xs uppercase tracking-[0.3em] sm:tracking-[0.5em] text-[var(--text-muted)]">Access</p>
              <h2 className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-semibold text-[var(--text-primary)]">Sign in to Nimbus Cloud</h2>
              <p className="mt-2 text-xs sm:text-sm text-[var(--text-muted)]">Secure login with adaptive protection</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="relative">
                <label htmlFor="email" className="block text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2 font-bold">
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full input-field text-sm sm:text-base"
                    placeholder="you@workspace.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2 font-bold">
                  Password
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 input-field text-sm sm:text-base"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="btn-secondary px-2.5 sm:px-3 py-2 text-xs whitespace-nowrap"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-2.5 sm:py-3 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in…' : 'Enter dashboard'}
              </button>
            </form>

            <div className="mt-5 sm:mt-6 rounded-xl sm:rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 sm:p-4 text-xs sm:text-sm text-[var(--text-secondary)]">
              <p className="font-medium text-[var(--text-primary)]">New to Nimbus?</p>
              <p className="mt-1 text-[var(--text-muted)]">Create an account to start uploading instantly.</p>
              <Link to="/register" className="mt-2 sm:mt-3 inline-flex items-center gap-1 text-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors text-xs sm:text-sm font-bold">
                Create account →
              </Link>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
}

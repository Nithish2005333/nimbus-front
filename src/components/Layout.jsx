import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { removeToken, userAPI, filesAPI } from '../services/api';
import { clearEncryptionKeys } from '../utils/encryption';
import { useToast } from '../context/ToastContext';
import { useUpload } from '../context/UploadContext';
import { useTheme } from '../context/ThemeContext';
import Logo from './Logo';
import GlobalUploader from './GlobalUploader';
import StorageLimitOverlay from './StorageLimitOverlay';

export default function Layout({ children }) {
  const { isDarkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { clearAll } = useUpload();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [userName, setUserName] = useState(localStorage.getItem('userName') || 'Explorer');
  const [userAvatar, setUserAvatar] = useState(null);
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'user');
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (commandPaletteOpen) {
      const fetchFiles = async () => {
        if (!hasToken()) return;
        try {
          const data = await filesAPI.getFiles();
          if (data.files) setFiles(data.files);
        } catch (error) {
          console.error('Failed to fetch files for search', error);
        }
      };
      fetchFiles();
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!hasToken()) return;
      try {
        const data = await userAPI.getProfile();
        if (data.success && data.user) {
          if (data.user.name) setUserName(data.user.name);
          if (data.user.avatar) setUserAvatar(data.user.avatar);
          if (data.user.role) {
            setUserRole(data.user.role);
            localStorage.setItem('userRole', data.user.role);
          }

          // Sync localStorage for backup/offline
          if (data.user.name) localStorage.setItem('userName', data.user.name);
        }
      } catch (error) {
        console.error('Failed to fetch profile in layout:', error);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const greeting = useMemo(() => {
    const hour = now.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    if (hour < 22) return 'Good evening';
    return 'Late night flow';
  }, [now]);

  const formattedTime = useMemo(
    () =>
      new Intl.DateTimeFormat('en', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(now),
    [now],
  );

  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat('en', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }).format(now),
    [now],
  );

  const handleLogout = () => {
    removeToken();
    clearEncryptionKeys(); // Clear encryption keys for zero-knowledge security
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    clearAll();
    showToast('Logged out successfully', 'success');
    navigate('/login');
  };

  const navItems = [
    {
      path: '/dashboard',
      label: 'Command Center',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      description: 'Insights & quick stats'
    },
    {
      path: '/analytics',
      label: 'Analytics',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      description: 'Performance metrics'
    },
    {
      path: '/ai-assistant',
      label: 'AI Assistant',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      description: 'Ask questions & get help'
    },
    {
      path: '/files',
      label: 'Library',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
      description: 'Browse and organise'
    },
    {
      path: '/shared',
      label: 'Shared Hub',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      ),
      description: 'Shared with me'
    },
    {
      path: '/upload',
      label: 'Upload Hub',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      description: 'Smart uploader'
    },
    {
      path: '/settings',
      label: 'Control Room',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      description: 'API & workspace'
    },
  ].filter(item => {
    if (userRole === 'admin') return true;
    return !['/analytics', '/settings'].includes(item.path);
  });



  const isActive = (path) => location.pathname.startsWith(path);

  const closeSidebarIfNeeded = () => {
    if (sidebarOpen) setSidebarOpen(false);
  };

  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase();

    // Base system actions
    const baseActions = [
      {
        title: 'Search in Library',
        path: '/files',
        icon: (
          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
          </svg>
        )
      },
      {
        title: 'New Upload',
        path: '/upload',
        icon: (
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        )
      },
      {
        title: 'View Dashboard',
        path: '/dashboard',
        icon: (
          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )
      },
      {
        title: 'Open AI Assistant',
        path: '/ai-assistant',
        icon: (
          <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )
      },
      {
        title: 'Profile Settings',
        path: '/profile',
        icon: (
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )
      },
      {
        title: 'System Settings',
        path: '/settings',
        icon: (
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      },
    ];

    // Filter system actions
    const systemActions = baseActions
      .filter(a => {
        if (userRole === 'admin') return true;
        return !['/analytics', '/settings'].includes(a.path);
      })
      .filter(a => a.title.toLowerCase().includes(q))
      .map(a => ({
        title: a.title,
        icon: a.icon, // Ensure icon is passed
        action: () => { navigate(a.path); setCommandPaletteOpen(false); setSearchQuery(''); }
      }));

    // Real file search results
    const fileResults = q.length > 0 ? files
      .filter(f => (f.originalName || f.filename || '').toLowerCase().includes(q))
      .slice(0, 5)
      .map(f => ({
        title: f.originalName || f.filename,
        icon: '📄', // You could differentiate icons based on mimetype here if desired
        action: () => { navigate('/files'); setCommandPaletteOpen(false); setSearchQuery(''); }
      })) : [];

    return [...systemActions, ...fileResults];
  }, [searchQuery, navigate]);

  return (
    <div className={`relative min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.12),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.15),transparent_40%)]" />

      <div className="relative flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-[80vw] max-w-xs sm:w-64 bg-[var(--card-bg)] backdrop-blur-2xl border-r border-[var(--border-color)] transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 h-full ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <div className="flex h-full flex-col px-4 py-6 sm:px-5">
            <div className="flex items-center gap-2">
              <Logo className="h-7 w-auto" />
              <h2 className="text-lg font-bold tracking-wider bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-lg">NIMBUS CLOUD</h2>
            </div>

            <div className="mt-6 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeSidebarIfNeeded}
                  className={`group relative block rounded-xl px-4 py-2.5 transition-all duration-300 overflow-hidden ${isActive(item.path)
                    ? 'bg-gradient-to-r from-[var(--accent-primary)]/10 to-[var(--accent-secondary)]/10 text-[var(--accent-primary)] shadow-sm ring-1 ring-[var(--accent-primary)]/20'
                    : 'text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/5 hover:translate-x-1'
                    }`}
                >
                  {isActive(item.path) && (
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-400 to-violet-500 shadow-[0_0_10px_rgba(79,70,229,0.8)]" />
                  )}

                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg transition-transform duration-300 group-hover:scale-110 ${isActive(item.path) ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--accent-primary)]'}`}>
                        {item.icon}
                      </span>
                      <div>
                        <p className={`font-bold tracking-wide text-[13px] transition-all ${isActive(item.path) ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)] group-hover:text-[var(--accent-primary)]'}`}>
                          {item.label}
                        </p>
                        <p className={`text-[9px] uppercase tracking-wider font-bold transition-colors ${isActive(item.path) ? 'text-[var(--accent-primary)]/80' : 'text-[var(--text-muted)] group-hover:text-[var(--accent-primary)]/80'}`}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                    {isActive(item.path) ? (
                      <div className="h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(99,102,241,1)] animate-pulse" />
                    ) : (
                      <svg className="h-4 w-4 text-[var(--text-muted)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--accent-primary)]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="relative flex h-full flex-1 flex-col overflow-hidden max-w-full">
          <header className="shrink-0 z-20 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/70 px-4 py-4 backdrop-blur-3xl sm:px-6 lg:px-10">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <button
                  className="btn-ghost lg:hidden p-2 hover:bg-white/5 rounded-xl transition-colors"
                  onClick={() => setSidebarOpen((prev) => !prev)}
                  aria-label="Toggle navigation"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-0.5">{formattedDate}</span>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                      {greeting}, <span className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">{userName}</span>
                    </h2>

                  </div>
                </div>
              </div>

              <div className="flex w-full items-center gap-3 sm:w-auto sm:justify-end">
                <div className="relative flex-1 sm:w-80 sm:flex-none">
                  <button
                    onClick={() => {
                      setCommandPaletteOpen(true);
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 transition-all duration-200 group text-xs shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="h-4 w-4 text-[var(--accent-primary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                      </svg>
                      <span className="font-bold">Search files & commands...</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1">
                      <kbd className="h-5 px-1.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)] text-[10px] font-mono font-medium text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">Ctrl</kbd>
                      <kbd className="h-5 px-1.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)] text-[10px] font-mono font-medium text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">K</kbd>
                    </div>
                  </button>
                </div>

                <div className="h-8 w-px bg-[var(--border-color)] mx-1 hidden sm:block"></div>

                <button
                  onClick={handleLogout}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-all hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/30 group active:scale-95"
                  title="Logout"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4.5 h-4.5 group-hover:rotate-12 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>

                <button
                  onClick={toggleTheme}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-all hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] group active:scale-95 shadow-sm"
                  title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDarkMode ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>

                <Link
                  to="/profile"
                  className="relative h-9 w-9 shrink-0 rounded-xl overflow-hidden ring-1 ring-[var(--border-color)] transition-all hover:ring-[var(--accent-primary)]/50 hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                  title="Edit Profile"
                >
                  {userAvatar ? (
                    <img src={userAvatar} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[var(--bg-primary)] text-sm font-bold text-[var(--text-primary)]">
                      {(userName || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-xl"></div>
                </Link>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 py-4 sm:px-5 lg:px-8 lg:py-6 pb-24 lg:pb-6 max-w-full overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]">{children}</div>
        </main>
      </div >

      <nav className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] px-4 py-3 text-xs backdrop-blur-2xl shadow-2xl shadow-indigo-500/10 lg:hidden">
        <div className="flex items-center justify-between px-2">
          {navItems.slice(0, 5).map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  closeSidebarIfNeeded();
                }}
                className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'
                  }`}
              >
                <div className={`transition-transform duration-300 ${active ? '-translate-y-1' : ''}`}>
                  <span className="text-xl">{item.icon}</span>
                </div>
                <span className={`text-[10px] font-medium ${active ? 'opacity-100' : 'opacity-80'}`}>
                  {item.label === 'Command Center' ? 'Home' : item.label.split(' ')[0]}
                </span>
                {active && (
                  <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {
        commandPaletteOpen && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm px-4 py-10"
            onClick={() => {
              setCommandPaletteOpen(false);
              setSearchQuery('');
            }}
          >
            <div
              className="w-full max-w-lg rounded-3xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-2xl sm:max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-slate-400">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Jump to anything: files, pages, actions…"
                  className="flex-1 bg-transparent text-lg text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none"
                />
                <button onClick={() => { setCommandPaletteOpen(false); setSearchQuery(''); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] font-bold transition-colors">
                  esc
                </button>
              </div>
              <div className="mt-6 space-y-3">
                {filteredItems.map((cmd) => (
                  <button
                    key={cmd.title}
                    onClick={cmd.action}
                    className="flex w-full items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-left text-sm text-[var(--text-primary)] transition hover:border-[var(--accent-primary)]/30 hover:bg-[var(--bg-secondary)]"
                  >
                    <span>{cmd.title}</span>
                    <span className="text-xs text-[var(--text-muted)]">↵</span>
                  </button>
                ))}
                {filteredItems.length === 0 && (
                  <p className="text-center py-4 text-[var(--text-muted)]">No results found for "{searchQuery}"</p>
                )}
              </div>
            </div>
          </div>
        )
      }
      <GlobalUploader />
      <StorageLimitOverlay />
    </div >
  );
}


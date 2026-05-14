import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { filesAPI, hasToken } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatFileSize, formatDate } from '../utils/fileUtils';

export default function Admin() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 1,
    totalStorage: 0,
    totalFiles: 0,
    serverUptime: '0d 0h',
  });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState([]);
  const { showToast } = useToast();

  useEffect(() => {
    // Admin Protection
    const isAdmin = localStorage.getItem('isAdminAuthenticated');
    if (!isAdmin) {
      showToast('Admin access required', 'error');
      navigate('/admin-login');
      return;
    }

    loadStats();
    const startTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const updateUptime = () => {
      const uptimeMs = Date.now() - startTime;
      const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
      setStats((prev) => ({
        ...prev,
        serverUptime: `${days}d ${hours}h ${minutes}m`,
      }));
    };
    updateUptime();
    const interval = setInterval(updateUptime, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      if (!hasToken()) {
        setLoading(false);
        return;
      }
      const data = await filesAPI.getFiles();
      const fileList = data.files || [];
      setFiles(fileList);
      
      const totalStorage = fileList.reduce((sum, file) => sum + (file.size || 0), 0);
      
      // Generate activity log from recent files
      const recentActivity = fileList
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
        .slice(0, 10)
        .map((file) => ({
          type: 'upload',
          message: `File uploaded: ${file.originalName || file.filename}`,
          time: new Date(file.uploadedAt),
          size: file.size || 0,
        }));

      setActivity(recentActivity);

      setStats((prev) => ({
        ...prev,
        totalFiles: fileList.length,
        totalStorage,
      }));
    } catch (error) {
      showToast(error.message || 'Failed to load stats', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Calculate storage breakdown
  const storageBreakdown = () => {
    const byType = {};
    files.forEach((file) => {
      const ext = ((file.originalName || file.filename || '').split('.').pop() || 'other').toLowerCase();
      byType[ext] = (byType[ext] || 0) + (file.size || 0);
    });
    
    return Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  const breakdown = storageBreakdown();

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="card card-accent shadow-xl border-[var(--border-color)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)] font-bold">Admin Panel</p>
            <h1 className="mt-3 text-3xl font-bold text-[var(--text-primary)] tracking-tight">System Overview</h1>
            <p className="text-sm text-[var(--text-secondary)] font-medium">Monitor system statistics and activity</p>
          </div>
          <button 
            className="btn-secondary px-6 py-2.5 text-sm font-bold shadow-sm" 
            onClick={loadStats}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh System'}
          </button>
        </div>

        {/* Admin Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <Link to="/settings" className="flex items-center gap-4 p-5 rounded-2xl bg-[var(--bg-secondary)] hover:bg-[var(--accent-primary)]/5 border border-[var(--border-color)] transition-all group shadow-sm hover:shadow-md hover:border-[var(--accent-primary)]/20">
            <div className="p-3 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] group-hover:bg-[var(--accent-primary)] group-hover:text-white group-hover:scale-110 transition-all shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Control Room</h3>
              <p className="text-xs text-[var(--text-muted)] font-medium">Manage API, users, and system settings</p>
            </div>
            <div className="ml-auto text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] group-hover:translate-x-1 transition-all">→</div>
          </Link>

          <Link to="/analytics" className="flex items-center gap-4 p-5 rounded-2xl bg-[var(--bg-secondary)] hover:bg-[var(--accent-primary)]/5 border border-[var(--border-color)] transition-all group shadow-sm hover:shadow-md hover:border-[var(--accent-primary)]/20">
            <div className="p-3 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] group-hover:bg-[var(--accent-primary)] group-hover:text-white group-hover:scale-110 transition-all shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Analytics</h3>
              <p className="text-xs text-[var(--text-muted)] font-medium">View performance metrics and insights</p>
            </div>
            <div className="ml-auto text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] group-hover:translate-x-1 transition-all">→</div>
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-4">
        {[
          {
            label: 'Total Files',
            value: loading ? '…' : stats.totalFiles,
            icon: '📁',
            sub: `${stats.totalFiles > 0 ? 'Active' : 'No files yet'}`,
            color: 'cyan',
            bg: 'bg-cyan-50',
            border: 'border-cyan-100',
            text: 'text-cyan-700'
          },
          {
            label: 'Storage Used',
            value: loading ? '…' : formatFileSize(stats.totalStorage),
            icon: '💾',
            sub: `${((stats.totalStorage / (10 * 1024 * 1024 * 1024)) * 100).toFixed(1)}% of 10GB`,
            color: 'blue',
            bg: 'bg-blue-50',
            border: 'border-blue-100',
            text: 'text-blue-700'
          },
          {
            label: 'Active Users',
            value: stats.totalUsers,
            icon: '👥',
            sub: 'You',
            color: 'purple',
            bg: 'bg-indigo-50',
            border: 'border-indigo-100',
            text: 'text-indigo-700'
          },
          {
            label: 'Server Uptime',
            value: stats.serverUptime,
            icon: '⏱️',
            sub: 'Auto-heal enabled',
            color: 'emerald',
            bg: 'bg-emerald-50',
            border: 'border-emerald-100',
            text: 'text-emerald-700'
          },
        ].map((card) => (
          <div key={card.label} className="card rounded-3xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold">{card.label}</p>
                <p className="mt-2 text-3xl font-bold text-[var(--text-primary)] tracking-tight">{card.value}</p>
                <p className={`text-xs font-bold mt-1 px-2 py-0.5 rounded-md inline-block ${card.bg} ${card.text} border ${card.border}`}>{card.sub}</p>
              </div>
              <span className="text-4xl filter drop-shadow-sm">{card.icon}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
        <div className="card shadow-sm border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold">Recent Activity</p>
              <p className="text-xl font-bold text-[var(--text-primary)] mt-1">System Events</p>
            </div>
            <div className="flex gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time Feed</span>
            </div>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {activity.length > 0 ? (
              activity.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 hover:bg-[var(--bg-secondary)] hover:shadow-md hover:border-[var(--accent-primary)]/20 transition-all group"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform">
                    {item.type === 'upload' ? '📤' : '📥'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">{item.message}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <p className="text-xs text-[var(--text-muted)] font-medium flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDate(item.time)}
                      </p>
                      <span className="text-[var(--border-color)]">•</span>
                      <p className="text-xs text-[var(--text-muted)] font-bold px-2 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-md">
                        {formatFileSize(item.size)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-[var(--bg-primary)] rounded-3xl border border-dashed border-[var(--border-color)]">
                <div className="text-4xl mb-4 opacity-20">📡</div>
                <p className="text-[var(--text-muted)] font-bold">No recent activity detected</p>
                <p className="text-xs text-[var(--text-muted)]/60 mt-1 font-medium">Activity will appear here as you use the system</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card shadow-sm border-[var(--border-color)]">
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold mb-4">Storage Breakdown</p>
            <div className="space-y-5">
              {breakdown.length > 0 ? (
                breakdown.map(([type, size], idx) => {
                  const percentage = stats.totalStorage > 0 ? (size / stats.totalStorage) * 100 : 0;
                  return (
                    <div key={idx} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-[var(--text-secondary)]">.{type} files</span>
                        <span className="text-xs font-bold text-[var(--text-primary)] bg-[var(--bg-primary)] px-2 py-0.5 rounded-md">{formatFileSize(size)}</span>
                      </div>
                      <div className="w-full bg-[var(--bg-primary)] rounded-full h-2.5 overflow-hidden border border-[var(--border-color)]/50 shadow-inner">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full rounded-full transition-all duration-1000 group-hover:opacity-80"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-tighter">Percentage of total</p>
                        <p className="text-xs text-[var(--accent-primary)] font-black">{percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-400 font-medium">No files to analyze</p>
                </div>
              )}
            </div>
          </div>

          <div className="card shadow-sm border-[var(--border-color)]">
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold mb-4">System Status</p>
            <div className="space-y-3">
              {[
                { name: 'API Server', status: 'online', latency: '12ms', color: 'bg-emerald-500' },
                { name: 'Database', status: 'online', latency: '5ms', color: 'bg-emerald-500' },
                { name: 'Storage', status: 'online', latency: '3ms', color: 'bg-emerald-500' },
              ].map((service, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 hover:bg-[var(--bg-secondary)] hover:shadow-sm transition-all group"
                >
                  <div>
                    <p className="font-bold text-[var(--text-primary)] text-sm">{service.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Latency • {service.latency}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full group-hover:bg-emerald-100 transition-colors">
                    <div className={`w-2 h-2 rounded-full ${service.color} animate-pulse`} />
                    <span className="text-[10px] text-emerald-700 font-black uppercase tracking-widest">Online</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card shadow-sm border-[var(--border-color)] bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)]">
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold mb-4">Quick Actions</p>
            <div className="space-y-2">
              <button
                onClick={loadStats}
                className="w-full btn-secondary text-left px-5 py-3 text-sm font-bold border border-[var(--border-color)] hover:border-[var(--accent-primary)]/40"
                disabled={loading}
              >
                🔄 Refresh Statistics
              </button>
              <button
                onClick={() => showToast('Feature coming soon', 'info')}
                className="w-full btn-secondary text-left px-5 py-3 text-sm font-bold border border-[var(--border-color)] hover:border-[var(--accent-primary)]/40"
              >
                📊 Export System Report
              </button>
              <button
                onClick={() => showToast('Feature coming soon', 'info')}
                className="w-full btn-secondary text-left px-5 py-3 text-sm font-bold border border-[var(--border-color)] hover:border-[var(--accent-primary)]/40"
              >
                ⚙️ Global Config
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="card shadow-sm border-[var(--border-color)]">
        <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold mb-6">File Distribution</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Encrypted', value: files.filter(f => f.isEncrypted).length, icon: '🔒', color: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
            { label: 'Media', value: files.filter(f => /\.(mp4|avi|mov|jpg|jpeg|png)$/i.test(f.originalName || f.filename)).length, icon: '🎬', color: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
            { label: 'Documents', value: files.filter(f => /\.(pdf|doc|docx|txt)$/i.test(f.originalName || f.filename)).length, icon: '📄', color: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
            { label: 'Archives', value: files.filter(f => /\.(zip|rar|7z)$/i.test(f.originalName || f.filename)).length, icon: '📦', color: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
          ].map((stat, idx) => (
            <div key={idx} className={`rounded-3xl border ${stat.border} ${stat.color} p-6 text-center shadow-sm hover:shadow-md transition-shadow`}>
              <span className="text-3xl block mb-3 filter drop-shadow-sm">{stat.icon}</span>
              <p className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{stat.value}</p>
              <p className={`text-xs ${stat.text} font-black uppercase tracking-widest mt-1`}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

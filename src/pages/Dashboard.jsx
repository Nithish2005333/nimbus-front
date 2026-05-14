import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { filesAPI, userAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatFileSize, formatDate } from '../utils/fileUtils';
import AIAssistant from '../components/AIAssistant';
import FileIcon from '../components/FileIcon';

const parseStorageLimit = (planString) => {
  if (!planString) return 10 * 1024 * 1024 * 1024; // Default 10GB
  const unit = planString.replace(/[0-9.]/g, '').trim().toUpperCase();
  const value = parseFloat(planString.replace(/[^0-9.]/g, ''));

  if (unit === 'TB') return value * 1024 * 1024 * 1024 * 1024;
  if (unit === 'GB') return value * 1024 * 1024 * 1024;
  if (unit === 'MB') return value * 1024 * 1024;
  return 10 * 1024 * 1024 * 1024;
};

const TypeIcon = ({ type }) => {
  const iconConfig = {
    documents: {
      bg: 'bg-[var(--accent-primary)]/10',
      border: 'border-[var(--accent-primary)]/20',
      icon: 'text-[var(--accent-primary)]',
      path: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z'
    },
    images: {
      bg: 'bg-[var(--accent-secondary)]/10',
      border: 'border-[var(--accent-secondary)]/20',
      icon: 'text-[var(--accent-secondary)]',
      path: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'
    },
    media: {
      bg: 'bg-fuchsia-500/10',
      border: 'border-fuchsia-500/20',
      icon: 'text-fuchsia-500',
      path: 'M8 5v14l11-7z'
    },
    archives: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      icon: 'text-amber-500',
      path: 'M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2.06 11L15 15.28 12.06 17l.78-3.33-2.59-2.24 3.41-.29L15 8l1.34 3.14 3.41.29-2.59 2.24.78 3.33z'
    }
  };

  const config = iconConfig[type] || iconConfig.archives;

  return (
    <div className={`h-12 w-12 rounded-xl ${config.bg} border ${config.border} flex items-center justify-center transition-all hover:scale-110 duration-300`}>
      <svg viewBox="0 0 24 24" className={`h-6 w-6 ${config.icon}`} fill="currentColor">
        <path d={config.path} />
      </svg>
    </div>
  );
};

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storagePlan, setStoragePlan] = useState(10 * 1024 * 1024 * 1024); // Default 10GB
  const [planName, setPlanName] = useState('Free Plan');
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch files
      const filesData = await filesAPI.getFiles();
      const fileList = filesData.files || [];
      setFiles(fileList);
      const total = fileList.reduce((sum, file) => sum + (file.size || 0), 0);
      setStorageUsed(total);

      // Fetch user profile for plan details
      const userData = await userAPI.getProfile();
      if (userData.success && userData.user) {
        if (userData.user.storagePlan) {
          setStoragePlan(parseStorageLimit(userData.user.storagePlan));
          setPlanName(userData.user.storagePlan);
        }
      }
    } catch (error) {
      showToast(error.message || 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const storagePercentage = useMemo(() => Math.min((storageUsed / storagePlan) * 100, 100), [storageUsed, storagePlan]);

  const typeBreakdown = useMemo(() => {
    const blueprint = {
      documents: { label: 'Documents', volume: 0, color: 'from-indigo-400 to-violet-400' },
      images: { label: 'Images', volume: 0, color: 'from-violet-400 to-fuchsia-500' },
      media: { label: 'Media', volume: 0, color: 'from-fuchsia-500 to-rose-500' },
      archives: { label: 'Archives', volume: 0, color: 'from-amber-400 to-orange-500' },
    };

    const byType = { ...blueprint };
    const map = {
      documents: ['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'xls', 'xlsx'],
      images: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'],
      media: ['mp4', 'mov', 'avi', 'mp3', 'wav', 'ogg'],
      archives: ['zip', 'rar', '7z', 'tar', 'gz'],
    };

    files.forEach((file) => {
      const name = (file.originalName || file.filename || '').toLowerCase();
      const extension = name.split('.').pop();
      const size = file.size || 0;
      const bucket = Object.entries(map).find(([, list]) => list.includes(extension));
      if (bucket) {
        byType[bucket[0]].volume += size;
      } else {
        byType.documents.volume += size * 0.1;
      }
    });

    return byType;
  }, [files]);

  const recentFiles = useMemo(() => files.slice(0, 6), [files]);

  const nextMilestone = useMemo(() => {
    if (storagePercentage > 90) return 'Storage almost full — consider upgrading';
    if (storagePercentage > 60) return 'You have plenty of space available';
    return 'You have plenty of space available';
  }, [storagePercentage]);

  return (
    <div className="space-y-8">
      <AIAssistant files={files} />

      <section className="grid gap-6 lg:grid-cols-2">
        {/* Storage Summary Card */}
        <div className="card card-accent relative overflow-hidden min-h-[400px]">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 blur-3xl" />

          <div className="relative z-10 h-full flex flex-col">
            {/* Header with Plan Badge */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-primary)] font-bold mb-2">Storage Overview</p>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Your Cloud Vault</h1>
              </div>
              {/* Unique Plan Badge */}
              <div className="relative group">
                {/* Gradient border effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 rounded-xl opacity-75 group-hover:opacity-100 blur-sm transition-all duration-300" />
                <div className="relative bg-[var(--bg-secondary)] backdrop-blur-xl rounded-xl px-5 py-3 border border-[var(--border-color)] shadow-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Current Plan</p>
                  </div>
                  <p className="text-xl font-black tracking-tighter bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">{planName}</p>
                </div>
              </div>
            </div>

            {/* Main Storage Display - Split Layout */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-6 mb-8">
                {/* Used Space */}
                <div className="relative">
                  <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-indigo-500 rounded-full" />
                  <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-bold mb-3">Used Space</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-[var(--text-primary)] tracking-tight">
                      {formatFileSize(storageUsed).split(' ')[0]}
                    </span>
                    <span className="text-xl font-bold text-[var(--text-secondary)]">
                      {formatFileSize(storageUsed).split(' ')[1]}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-[var(--text-secondary)] font-medium">
                    of {formatFileSize(storagePlan)}
                  </div>
                </div>

                {/* Available Space */}
                <div className="relative">
                  <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-violet-400 rounded-full" />
                  <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-bold mb-3">Available</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-[var(--accent-primary)] tracking-tight">
                      {formatFileSize(storagePlan - storageUsed).split(' ')[0]}
                    </span>
                    <span className="text-xl font-bold text-[var(--accent-primary)]">
                      {formatFileSize(storagePlan - storageUsed).split(' ')[1]}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-[var(--accent-primary)] font-medium">
                    {storagePercentage.toFixed(1)}% capacity used
                  </div>
                </div>
              </div>

              {/* Upgraded Storage Usage Bar */}
              <div className="relative space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Storage Usage</span>
                  <span className="text-xs text-[var(--text-secondary)] font-bold">{formatFileSize(storageUsed)} / {formatFileSize(storagePlan)}</span>
                </div>
                <div className="relative h-6 w-full bg-[var(--bg-primary)] rounded-full overflow-hidden border border-[var(--border-color)] shadow-inner">
                  {/* Progress Fill */}
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-400 transition-all duration-1000 ease-out relative"
                    style={{ width: `${storagePercentage}%` }}
                  >
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
                    {/* Glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/50 to-violet-400/50 blur-sm" />
                  </div>
                  {/* Percentage Text Inside Bar */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">{storagePercentage.toFixed(1)}%</span>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-muted)] font-medium italic">{nextMilestone}</p>
              </div>
            </div>

            {/* Simple Upload Button Area */}
            <div className="mt-8 flex gap-3">
              <Link
                to="/upload"
                className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-900/30 hover:shadow-indigo-900/50 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Files
              </Link>
              <Link
                to="/files"
                className="px-6 py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[var(--accent-primary)]/30 text-[var(--text-secondary)] font-semibold rounded-xl transition-all duration-200"
              >
                Browse
              </Link>
            </div>
          </div>
        </div>

        {/* File Type Breakdown */}
        <div className="card flex flex-col">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold">Distribution</p>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-1">Files by Type</h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 flex-1 content-start min-w-0">
            {Object.entries(typeBreakdown).map(([key, data]) => {
              const percentage = Math.min((data.volume / storagePlan) * 100, 100);
              return (
                <div
                  key={key}
                  className="group relative rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 hover:border-[var(--accent-primary)] transition-all duration-300 min-w-0 shadow-sm hover:shadow-md"
                >
                  {/* Subtle glow on hover */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${data.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none`} />

                  <div className="relative">
                    {/* Icon and Size */}
                    <div className="flex items-center justify-between mb-4">
                      <TypeIcon type={key} />
                      <div className="text-right">
                        <span className="text-2xl font-bold text-[var(--text-primary)] block">{formatFileSize(data.volume).split(' ')[0]}</span>
                        <span className="text-sm font-bold text-[var(--text-secondary)]">{formatFileSize(data.volume).split(' ')[1]}</span>
                      </div>
                    </div>

                    {/* Label */}
                    <p className="text-sm font-semibold text-[var(--text-secondary)] mb-3">{data.label}</p>

                    {/* Enhanced Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--text-muted)] font-bold">Storage Used</span>
                        <span className="text-xs font-black text-[var(--text-secondary)]">{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="relative h-2.5 w-full bg-[var(--bg-primary)] rounded-full overflow-hidden border border-[var(--border-color)]">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${data.color} transition-all duration-1000 ease-out relative`}
                          style={{ width: `${percentage}%` }}
                        >
                          {/* Shimmer effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recent Files Section */}
      <section className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold">Activity</p>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-1">Recent Uploads</h2>
          </div>
          <Link to="/files" className="text-sm font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary)]/80 transition-colors">
            View library →
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
            {[1, 2, 3].map((skeleton) => (
              <div key={skeleton} className="h-24 rounded-2xl bg-[var(--bg-primary)]" />
            ))}
          </div>
        ) : recentFiles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-color)] p-12 text-center">
            <p className="text-[var(--text-secondary)] font-medium mb-4">Your cloud is empty.</p>
            <Link to="/upload" className="btn-primary inline-flex">
              Upload first file
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentFiles.map((file) => (
              <div
                key={file._id}
                className="group relative rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-4 transition-all hover:bg-[var(--bg-secondary)] hover:border-[var(--accent-primary)] hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl transition-transform group-hover:scale-110 duration-300 text-[var(--accent-primary)] shrink-0">
                    <FileIcon fileName={file.originalName || file.filename} className="w-8 h-8" />
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                      {file.originalName || file.filename}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-[var(--text-secondary)] font-medium truncate">{formatDate(file.uploadedAt)}</p>
                      <span className="text-[var(--text-muted)] font-bold">•</span>
                      <p className="text-xs font-mono text-[var(--text-muted)] font-bold shrink-0">
                        {formatFileSize(file.size || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import { formatFileSize, formatDate } from '../utils/fileUtils';
import FileIcon from './FileIcon';

export default function FileCard({
  file,
  onDownload,
  onDelete,
  onRename,
  onMove,
  onPreview,
  deletingId,
  isSelected = false,
  onSelectToggle,
  onInspect,
  onMoreOptions,
  currentUserId = null,
  className = "",
  downloadProgress, // New prop
}) {
  const displayName = file.originalName || file.filename;
  const ownerId = file.userId?._id || file.userId;
  const isShared = currentUserId && ownerId && ownerId.toString() !== currentUserId.toString();


  return (
    <div
      className={`group relative flex flex-col p-6 rounded-[2.5rem] border transition-all duration-500 bg-[var(--bg-secondary)] hover:-translate-y-2 overflow-hidden
        ${isSelected
          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 shadow-lg ring-1 ring-[var(--accent-primary)]/40'
          : 'border-[var(--border-color)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--bg-primary)] hover:shadow-lg shadow-sm'
        } ${className}`}
    >
      {/* Download Progress Overlay */}
      {downloadProgress > 0 && (
        <div className="absolute inset-0 z-50 bg-[var(--bg-primary)]/90 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full border-4 border-[var(--border-color)] border-t-[var(--accent-primary)] animate-spin mb-4 shadow-lg shadow-[var(--accent-primary)]/20"></div>
          <div className="text-3xl font-black text-[var(--text-primary)] tracking-tighter mb-1">{Math.round(downloadProgress)}%</div>
          <p className="text-[10px] uppercase font-black text-[var(--accent-primary)] tracking-[0.2em] animate-pulse">Decrypting Asset</p>
        </div>
      )}

      {/* Top Section: Selection & Options */}
      <div className="flex justify-between items-start mb-2">
        <button
          onClick={(e) => { e.stopPropagation(); onSelectToggle && onSelectToggle(e); }}
          className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-300
            ${isSelected
              ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]/50 scale-105 shadow-lg'
              : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-[var(--accent-primary)]/60 hover:bg-[var(--bg-primary)]'}`}
        >
          {isSelected ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-white" strokeWidth={5}><path d="M5 13l4 4L19 7" /></svg>
          ) : (
            <div className="w-2 h-2 rounded-full bg-[var(--text-muted)] group-hover:bg-[var(--accent-primary)] transition-colors"></div>
          )}
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onMoreOptions?.(e); }}
          className="w-10 h-10 rounded-2xl bg-[var(--bg-primary)] hover:bg-[var(--accent-primary)] text-[var(--text-secondary)] hover:text-white transition-all border border-[var(--border-color)] flex items-center justify-center shadow-sm z-30 active:scale-95"
          title="More Options"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>
      </div>

      {/* Center Section: Icon & Preview Action */}
      <div
        className="flex flex-col items-center justify-center py-5 cursor-pointer relative"
        onClick={(e) => { e.stopPropagation(); onPreview && onPreview(file); }}
      >
        <div className="relative group/icon mb-4">
          {/* Dynamic Glow Effect */}
          <div className={`absolute inset-0 rounded-full blur-[30px] opacity-0 group-hover/icon:opacity-100 transition-all duration-700
              ${isSelected ? 'bg-[var(--accent-primary)]/20' : 'bg-[var(--accent-primary)]/10'}`}></div>

          <FileIcon fileName={displayName} className="w-24 h-24 relative z-10 transition-all duration-500 group-hover/icon:scale-110 group-hover/icon:-rotate-3 drop-shadow-xl" />

          {/* Interactive Preview Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/icon:opacity-100 z-20 transition-all duration-500">
            <div className="w-16 h-16 rounded-full bg-[var(--accent-primary)] shadow-lg flex items-center justify-center text-white scale-50 group-hover/icon:scale-100 rotate-12 group-hover/icon:rotate-0 transition-all">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-8 h-8" strokeWidth={3}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </div>
          </div>
        </div>

        <div className="text-center w-full px-2">
          <h3 className="text-base font-bold text-[var(--text-primary)] truncate mb-1.5 group-hover:text-[var(--accent-primary)] transition-colors tracking-tight">
            {displayName}
          </h3>
          <div className="flex items-center justify-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest">
              {formatFileSize(file.size || 0)}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-bold">•</span>
            <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-tighter">
              {formatDate(file.uploadedAt)}
            </span>
            {isShared && (
              <span className="ml-2 px-2.5 py-1 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-[10px] font-black uppercase tracking-widest border border-[var(--accent-primary)]/20 shadow-sm">
                Shared
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Dual Primary Actions */}
      <div className="mt-auto pt-6 flex flex-col gap-2.5">
        <button
          onClick={(e) => { e.stopPropagation(); onPreview && onPreview(file); }}
          className="w-full py-3 rounded-2xl bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-black text-[10px] uppercase tracking-[0.15em] transition-all duration-300 border border-[var(--border-color)] hover:border-[var(--accent-primary)]/30 shadow-sm flex items-center justify-center gap-2 group/preview"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 text-[var(--accent-primary)] transition-transform group-hover/preview:scale-110" strokeWidth={3}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          Preview
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(file._id); }}
          className="w-full py-3 rounded-2xl bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-[10px] uppercase tracking-[0.15em] transition-all duration-300 flex items-center justify-center gap-2 group/btn shadow-lg shadow-[var(--accent-primary)]/20"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 transition-transform group-hover/btn:translate-y-0.5" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </button>
      </div>
    </div>
  );
}

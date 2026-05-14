import { useRef, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUpload } from '../context/UploadContext';
import { formatFileSize, truncateFileName } from '../utils/fileUtils';
import FileIcon from '../components/FileIcon';
import FolderPicker from '../components/FolderPicker';

export default function Upload() {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const [targetFolder, setTargetFolder] = useState(null); // null = root
  const [showPicker, setShowPicker] = useState(false);
  const location = useLocation();
  const targetGroup = location.state?.targetGroup || null;

  const {
    files,
    addFiles,
    removeFile,
    startUpload,
    activeUploads,
    clearAll,
    retryUpload,
    UPLOAD_STATUS
  } = useUpload();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (fileList) => {
    addFiles(fileList, targetFolder ? targetFolder.id : null, targetGroup);
  };

  const completedCount = files.filter(f => f.status === UPLOAD_STATUS.COMPLETED).length;
  const uploadingCount = files.filter(f => f.status === UPLOAD_STATUS.UPLOADING).length;
  const pendingCount = files.filter(f => f.status === UPLOAD_STATUS.PENDING).length;

  return (
    <div className="mx-auto max-w-5xl pt-4 pb-20 px-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[var(--accent-primary)]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-20 -right-20 w-80 h-80 bg-[var(--accent-secondary)]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center mb-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 text-[10px] font-black tracking-[0.2em] text-[var(--accent-primary)] mb-4 uppercase shadow-sm">
          <span className="flex h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse"></span>
          {targetGroup ? 'Sharing Directly to Circle' : 'Direct Secure Channel Active'}
        </div>
        <h1 className="text-5xl sm:text-7xl font-black text-[var(--text-primary)] mb-4 tracking-tighter leading-none">
          <span className="bg-gradient-to-b from-[var(--text-primary)] via-[var(--text-secondary)] to-[var(--text-muted)] bg-clip-text text-transparent drop-shadow-xl">
            Upload to Vault
          </span>
        </h1>
        <p className="text-[var(--text-secondary)] max-w-xl mx-auto text-lg leading-relaxed font-medium">
          Securely encrypt and transmit your assets to the Nimbus Cloud vault using localized military-grade protocols.
        </p>
      </div>

      {/* Target Directory Selector - Premium Redesign */}
      <div className="flex justify-center mb-4 relative z-20">
        <div className="group relative">
          {/* Outer Glow */}
          <div className="absolute inset-0 bg-[var(--accent-primary)]/10 blur-2xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center bg-[var(--bg-secondary)]/90 backdrop-blur-3xl border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-[var(--border-color)]/20 group-hover:border-[var(--accent-primary)]/50 transition-all">
            {/* Folder Info Section */}
            <div className="flex items-center gap-4 px-6 py-4 sm:border-r border-[var(--border-color)]">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/20 blur-lg rounded-full animate-pulse" />
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-amber-500 relative z-10 drop-shadow-lg">
                  <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] mb-0.5">Target Vault</span>
                <span className="text-[var(--text-primary)] font-black truncate max-w-[200px] text-sm tracking-tight">
                  {targetFolder ? targetFolder.name : 'My Cloud (Root)'}
                </span>
              </div>
            </div>

            {/* Action Section */}
            <button
              onClick={() => setShowPicker(true)}
              className="px-6 py-4 bg-[var(--bg-primary)] hover:bg-[var(--accent-primary)] text-[var(--accent-primary)] hover:text-white transition-all flex items-center justify-center gap-2 group/btn active:scale-95 border-t sm:border-t-0"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 transition-transform group-hover/btn:rotate-180" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span className="text-xs font-black uppercase tracking-widest">Change Location</span>
            </button>

            {/* Status Indicator (Mobile Hidden) */}
            <div className="hidden lg:flex items-center gap-2 px-6 border-l border-[var(--border-color)] opacity-60">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm"></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] font-mono">Secured</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-2xl rounded-[2.5rem] border border-[var(--border-color)] p-3 sm:p-4 shadow-2xl relative overflow-hidden ring-1 ring-[var(--border-color)]/20 group-hover:ring-[var(--accent-primary)]/10 transition-all">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

        {/* Holographic Uplink Port (Dropzone) */}
        <div className="relative group/zone transition-transform duration-700">
          {/* Intense background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[60%] bg-[var(--accent-primary)]/100/5 blur-[120px] rounded-full pointer-events-none group-hover/zone:bg-[var(--accent-primary)]/100/10 transition-colors" />

          <div
            className={`relative rounded-[3rem] border-2 border-dashed transition-all duration-700 min-h-[420px] flex flex-col items-center justify-center p-12 text-center cursor-pointer overflow-hidden
            ${dragActive
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 scale-[0.98] shadow-inner'
                : 'border-[var(--border-color)] bg-[var(--bg-primary)]/50 hover:bg-[var(--bg-primary)] hover:border-[var(--text-muted)] shadow-sm backdrop-blur-3xl'
              }
          `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={(e) => {
              if (e.target.tagName !== 'BUTTON') {
                fileInputRef.current?.click();
              }
            }}
          >
            {/* Scanning Light Bar (Animated) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[3rem]">
              <div className={`h-px w-full bg-gradient-to-r from-transparent via-cyan-600 to-transparent absolute top-0 left-0 transition-all duration-[3s] linear infinite shadow-[0_0_20px_rgba(8,145,178,0.8)] ${dragActive ? 'animate-[bounce_2s_infinite]' : 'animate-[none] opacity-0'}`} />
            </div>

            <div className="relative z-10 flex flex-col items-center pointer-events-none">
              {/* Unique Uplink Icon */}
              <div className={`w-32 h-32 rounded-[2.5rem] mb-10 flex items-center justify-center transition-all duration-700 relative
              ${dragActive
                  ? 'bg-[var(--accent-primary)] shadow-lg shadow-[var(--accent-primary)]/20 rotate-[360deg] scale-110'
                  : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] group-hover/zone:border-[var(--accent-primary)]/50 shadow-sm'
                }`}>

                {/* Spinning Ring */}
                <div className={`absolute inset-0 border-2 border-cyan-400/20 rounded-[2.5rem] animate-[spin_8s_linear_infinite] ${dragActive ? 'opacity-100' : 'opacity-0'}`} />

                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`w-28 h-28 transition-all duration-700 ${dragActive ? 'text-white -translate-y-12 scale-125 drop-shadow-xl' : 'text-[var(--accent-primary)]'}`}>
                  <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40" />
                  <path d="M12 18V9m0 0l-3 3m3-3l3 3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <h3 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] mb-4 tracking-tighter">
                {dragActive ? 'Engaging Uplink...' : 'Drop Assets to Vault'}
              </h3>
              <p className="text-[var(--text-secondary)] mb-10 max-w-sm mx-auto text-base font-medium opacity-80">
                {dragActive ? 'Localized encryption in progress...' : 'Select files or drag them directly into the port'}
              </p>

              <div className="flex items-center gap-10">
                {['Media', 'Docs', 'Archives'].map(label => (
                  <div key={label} className="flex flex-col items-center gap-2 group/type">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-primary)] group-hover/type:bg-[var(--accent-primary)] transition-colors shadow-none group-hover/type:shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] group-hover/type:text-[var(--text-muted)] transition-colors">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <input ref={fileInputRef} type="file" multiple onChange={handleFileInput} className="hidden" />
          </div>
        </div>

        {files.length > 0 && (
          <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700 relative z-20">
            <div className="flex items-center justify-between px-2">
              <div className="flex flex-col">
                <h4 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Active Queue</h4>
                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">Pending Transfer Assets</p>
              </div>
              <button
                onClick={clearAll}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-white hover:bg-rose-500 transition-all rounded-xl border border-rose-500/20"
              >
                Flush Queue
              </button>
            </div>

            {/* Queue Grid */}
            <div className="grid grid-cols-1 gap-4">
              {files.map((fileState) => (
                <div
                  key={fileState.id}
                  className="group relative flex items-center gap-6 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm transition-all hover:bg-[var(--bg-primary)] hover:border-[var(--text-muted)]"
                >
                  {/* Glassmorphic Icon */}
                  <div className="relative p-4 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] text-[var(--accent-primary)] shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileIcon fileName={fileState.name} className="w-10 h-10 relative z-10" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex flex-col min-w-0">
                        <p className="font-black text-[var(--text-primary)] truncate text-base tracking-tight" title={fileState.name}>
                          {truncateFileName(fileState.name, 40)}
                        </p>
                        <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">{formatFileSize(fileState.size)}</span>
                      </div>

                      <button
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 transition-all active:scale-90 border border-[var(--border-color)] shadow-sm"
                        onClick={(e) => { e.stopPropagation(); removeFile(fileState.id); }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center justify-between mb-3 text-[10px] font-black uppercase tracking-widest min-h-[16px]">
                      {fileState.status === UPLOAD_STATUS.UPLOADING ? (
                        <div className="flex items-center gap-3 text-[var(--accent-primary)] w-full">
                          {/* Speed */}
                          <div className="flex items-center gap-1.5 min-w-[80px]">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3 opacity-70" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="font-bold">
                              {fileState.speed > 0 ? `${formatFileSize(fileState.speed)}/s` : '0 B/s'}
                            </span>
                          </div>

                          {/* Separator */}
                          <div className="h-3 w-px bg-[var(--border-color)]" />

                          {/* Time Remaining */}
                          <div className="flex items-center gap-1.5 min-w-[80px]">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3 opacity-70" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-bold text-[var(--text-secondary)]">
                              {fileState.timeRemaining || '--'}
                            </span>
                          </div>

                          {/* Separator */}
                          <div className="h-3 w-px bg-[var(--border-color)]" />


                        </div>
                      ) : fileState.status === UPLOAD_STATUS.COMPLETED ? (
                        <div className="flex items-center gap-2 text-emerald-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Transmission Complete
                        </div>
                      ) : fileState.status === UPLOAD_STATUS.ERROR ? (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2 text-rose-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Uplink Error: {fileState.error}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); retryUpload(fileState.id); }}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[9px] font-black uppercase tracking-wider transition-all border border-rose-500/20"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Retry
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[var(--text-muted)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--border-color)]" />
                          Standby
                        </div>
                      )}

                    </div>

                    {/* Pro Micro-Progress Bar */}
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-full bg-[var(--bg-primary)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${fileState.status === UPLOAD_STATUS.COMPLETED ? 'bg-emerald-500 shadow-sm' :
                            fileState.status === UPLOAD_STATUS.ERROR ? 'bg-rose-500' :
                              'bg-cyan-600 shadow-sm shadow-[var(--accent-primary)]/20'
                            }`}
                          style={{ width: `${fileState.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-[var(--text-muted)] min-w-[24px] text-right">
                        {Math.round(fileState.progress)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {pendingCount > 0 && (
              <div className="pt-8 flex justify-center">
                <button
                  onClick={startUpload}
                  disabled={uploadingCount > 0}
                  className="group/init overflow-hidden relative px-12 py-5 rounded-[2rem] bg-[var(--accent-primary)] text-white font-black text-xs uppercase tracking-[0.3em] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[var(--accent-primary)]/20 hover:shadow-[var(--accent-primary)]/40 disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-[var(--bg-primary)]/10 translate-y-full group-hover/init:translate-y-0 transition-transform duration-300" />
                  <div className="relative flex items-center justify-center gap-3">
                    {uploadingCount > 0 ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Transmitting...
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 transition-transform group-hover/init:-translate-y-1" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m-7 7l7-7 7 7" />
                        </svg>
                        Initiate Asset Uplink
                      </>
                    )}
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {showPicker && (
        <FolderPicker
          title="Select Upload Location"
          actionLabel="Use This Folder"
          onCancel={() => setShowPicker(false)}
          onConfirm={(folderId, folderObj) => {
            setTargetFolder(folderObj ? { id: folderObj._id || folderObj.id, name: folderObj.name } : null);
            setShowPicker(false);
          }}
        />
      )}
    </div>
  );
}

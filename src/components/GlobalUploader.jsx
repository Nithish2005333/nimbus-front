import { useState, useEffect } from 'react';
import { useUpload } from '../context/UploadContext';
import { formatFileSize, truncateFileName } from '../utils/fileUtils';
import FileIcon from './FileIcon';

export default function GlobalUploader() {
    const { files, UPLOAD_STATUS, startUpload, clearCompleted, clearAll, activeUploads } = useUpload();
    const [minimized, setMinimized] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // Auto-show when files are added
    useEffect(() => {
        if (files.length > 0 && !isVisible) {
            setIsVisible(true);
            setMinimized(false);
        } else if (files.length === 0) {
            setIsVisible(false);
        }
    }, [files.length]);

    if (!isVisible || files.length === 0) return null;

    const uploadingCount = files.filter(f => f.status === UPLOAD_STATUS.UPLOADING).length;
    const pendingCount = files.filter(f => f.status === UPLOAD_STATUS.PENDING).length;
    const completedCount = files.filter(f => f.status === UPLOAD_STATUS.COMPLETED).length;
    const errorCount = files.filter(f => f.status === UPLOAD_STATUS.ERROR).length;

    const overallProgress = files.length > 0
        ? files.reduce((acc, f) => acc + (f.progress || 0), 0) / files.length
        : 0;

    const getTotalStatus = () => {
        if (uploadingCount > 0) return `Uploading ${uploadingCount} file(s)...`;
        if (pendingCount > 0) return `${pendingCount} file(s) pending`;
        if (completedCount === files.length) return 'All uploads completed';
        return `${completedCount} completed, ${errorCount} failed`;
    };

    if (minimized) {
        return (
            <div className="fixed bottom-24 lg:bottom-4 right-4 z-50 w-[calc(100vw-2rem)] sm:w-72 rounded-xl bg-slate-900/95 border border-white/10 shadow-2xl backdrop-blur-md overflow-hidden transition-all animate-in slide-in-from-bottom-5">
                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setMinimized(false)}>
                    <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 flex items-center justify-center rounded-full bg-white/5">
                            {uploadingCount > 0 ? (
                                <svg className="animate-spin h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : pendingCount > 0 ? (
                                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-emerald-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                            <div className="absolute inset-0 rounded-full border border-white/10"></div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">{getTotalStatus()}</p>
                            <div className="h-1 w-24 bg-slate-700 rounded-full mt-1.5 overflow-hidden">
                                <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${overallProgress}%` }}></div>
                            </div>
                        </div>
                    </div>
                    <button className="text-slate-400 hover:text-white pb-6 pl-2" onClick={(e) => { e.stopPropagation(); setIsVisible(false); }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-24 lg:bottom-4 right-4 z-50 w-[calc(100vw-2rem)] sm:w-96 rounded-2xl bg-slate-900/95 border border-white/10 shadow-3xl backdrop-blur-xl flex flex-col max-h-[80vh] transition-all animate-in slide-in-from-bottom-5">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-800/50 rounded-t-2xl cursor-pointer" onClick={() => setMinimized(true)}>
                <h3 className="font-semibold text-white flex items-center gap-2">
                    {uploadingCount > 0 ? (
                        <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                    ) : (
                        <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                    )}
                    Uploads ({files.length})
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setMinimized(true);
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsVisible(false);
                            // Optional: clearCompleted() if we want specific behavior
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {files.map(file => (
                    <div key={file.id} className="group relative pr-1">
                        <div className="flex items-start gap-3">
                            <FileIcon fileName={file.name} className="w-8 h-8 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-sm font-medium text-slate-200 truncate pr-2" title={file.name}>{truncateFileName(file.name, 25)}</p>

                                    {file.status === UPLOAD_STATUS.UPLOADING && (
                                        <span className="text-[10px] text-cyan-400 flex-shrink-0">{Math.round(file.progress)}%</span>
                                    )}
                                </div>

                                {/* Progress Bar */}
                                <div className="h-1 w-full bg-slate-700/50 rounded-full overflow-hidden mb-1">
                                    <div
                                        className={`h-full transition-all duration-300 ${file.status === UPLOAD_STATUS.COMPLETED ? 'bg-emerald-500' :
                                            file.status === UPLOAD_STATUS.ERROR ? 'bg-rose-500' : 'bg-cyan-500'
                                            }`}
                                        style={{ width: `${file.progress}%` }}
                                    />
                                </div>

                                <div className="flex justify-between items-center text-[10px] text-slate-500">
                                    <span>{formatFileSize(file.size)}</span>

                                    {file.status === UPLOAD_STATUS.UPLOADING && (
                                        <div className="flex items-center gap-2">
                                            <span>{file.speed > 0 ? formatFileSize(file.speed) + '/s' : 'Initializing...'}</span>
                                            {file.timeRemaining && (
                                                <>
                                                    <span className="text-slate-700 w-1 h-1 rounded-full bg-slate-700"></span>
                                                    <span className="text-cyan-400 font-bold">{file.timeRemaining} left</span>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {file.status === UPLOAD_STATUS.PENDING && (
                                        <span className="text-amber-400 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Pending
                                        </span>
                                    )}

                                    {file.status === UPLOAD_STATUS.COMPLETED && (
                                        <span className="text-emerald-400 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Done
                                        </span>
                                    )}

                                    {file.status === UPLOAD_STATUS.ERROR && (
                                        <span className="text-rose-400">{file.error || 'Failed'}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Actions */}
            <div className="p-3 border-t border-white/10 bg-slate-800/30 rounded-b-2xl flex justify-between items-center gap-2">
                {uploadingCount > 0 ? (
                    <p className="text-xs text-cyan-400 animate-pulse font-medium px-2">Uploading {uploadingCount} files...</p>
                ) : completedCount > 0 ? (
                    <p className="text-xs text-emerald-400 font-medium px-2">Uploads complete</p>
                ) : (
                    <p className="text-xs text-slate-400 px-2">Pending...</p>
                )}

                <div className="flex gap-2">
                    {completedCount > 0 && (
                        <button
                            onClick={clearCompleted}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            Clear Done
                        </button>
                    )}

                    {/* If files are pending but not uploading, we show start button here too? */}
                    {pendingCount > 0 && uploadingCount === 0 && (
                        <button
                            onClick={startUpload}
                            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-blue-500/20 transition-all"
                        >
                            Resume
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

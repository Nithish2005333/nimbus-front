import { useState, useEffect } from 'react';
import { foldersAPI } from '../services/api';

/**
 * FolderPicker - Premium Directory Navigation Terminal
 */
export default function FolderPicker({
    onCancel,
    onMove,
    onConfirm,
    movingItemName,
    title = "Move Item",
    actionLabel = "Move Here"
}) {
    const handleConfirm = onConfirm || onMove;

    const [currentFolder, setCurrentFolder] = useState(null); // null = root
    const [path, setPath] = useState([{ id: null, name: 'Root' }]);
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedFolderId, setSelectedFolderId] = useState(null);

    useEffect(() => {
        loadFolders();
    }, [currentFolder]);

    const loadFolders = async () => {
        setLoading(true);
        try {
            const res = await foldersAPI.getFolders(currentFolder ? currentFolder.id : null);
            setFolders(res.folders || []);
        } catch (error) {
            console.error("Failed to load folders", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEnterFolder = (folder) => {
        setCurrentFolder({ id: folder._id, name: folder.name });
        setPath([...path, { id: folder._id, name: folder.name }]);
        setSelectedFolderId(null);
    };

    const handleNavigateUp = () => {
        if (path.length <= 1) return;
        const newPath = path.slice(0, -1);
        setPath(newPath);
        setCurrentFolder(newPath[newPath.length - 1]);
        setSelectedFolderId(null);
    };

    const handleBreadcrumbClick = (index) => {
        const newPath = path.slice(0, index + 1);
        setPath(newPath);
        setCurrentFolder(newPath[newPath.length - 1]);
        setSelectedFolderId(null);
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md" onClick={onCancel}>
            <div
                className="relative w-full max-w-xl bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-[2.5rem] overflow-hidden shadow-[0_0_60px_rgba(34,211,238,0.2)] animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Background Ambient Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-primary)]/5 blur-[80px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 blur-[80px] pointer-events-none" />

                {/* Header */}
                <div className="p-6 pb-4 border-b border-[var(--border-color)] relative z-10">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-[var(--accent-primary)] font-black uppercase tracking-[0.3em] mb-1">Target Directory</span>
                            <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter leading-none">{title}</h3>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Secure Link</span>
                        </div>
                    </div>
                    {movingItemName && (
                        <p className="text-sm text-[var(--text-muted)] font-medium truncate mt-2">
                            Transmitting: <span className="text-[var(--text-primary)] font-bold">{movingItemName}</span>
                        </p>
                    )}
                </div>

                {/* Breadcrumb Navigation - Technical Design */}
                <div className="px-8 py-4 bg-[var(--bg-secondary)]/40 border-b border-[var(--border-color)] flex items-center gap-1 overflow-x-auto scrollbar-hide relative z-10">
                    {path.map((item, index) => (
                        <div key={item.id || 'root'} className="flex items-center shrink-0">
                            {index > 0 && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5 text-[var(--text-muted)] mx-1" strokeWidth={3}><path d="M13 5l7 7-7 7" /></svg>
                            )}
                            <button
                                onClick={() => handleBreadcrumbClick(index)}
                                className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg transition-all ${index === path.length - 1 ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`}
                            >
                                {item.name === 'Root' ? 'Nimbus Cloud' : item.name}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 min-h-0 relative z-10 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-[var(--text-muted)]">
                            <div className="relative w-12 h-12">
                                <div className="absolute inset-0 border-2 border-[var(--accent-primary)]/20 rounded-xl animate-spin" />
                                <div className="absolute inset-2 border-2 border-[var(--accent-primary)]/40 rounded-lg animate-[spin_2s_linear_infinite_reverse]" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Querying Node...</span>
                        </div>
                    ) : folders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
                            <div className="w-20 h-20 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center mb-6 opacity-40">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-10 h-10" strokeWidth={1}><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest opacity-40">Empty Sub-Directory</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {folders.map(folder => (
                                <div
                                    key={folder._id}
                                    onClick={() => setSelectedFolderId(folder._id === selectedFolderId ? null : folder._id)}
                                    onDoubleClick={() => handleEnterFolder(folder)}
                                    className={`group relative flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border
                                    ${selectedFolderId === folder._id
                                            ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30 shadow-[0_0_30px_rgba(34,211,238,0.15)] ring-1 ring-[var(--accent-primary)]/20'
                                            : 'border-[var(--border-color)] bg-[var(--bg-secondary)]/40 hover:bg-[var(--bg-secondary)] hover:border-[var(--border-color)] hover:-translate-x-1'
                                        }`}
                                >
                                    <div className={`relative transition-transform duration-500 ${selectedFolderId === folder._id ? 'scale-110' : 'group-hover:scale-105'}`}>
                                        {/* Folder Icon with Liquid Effect */}
                                        <svg viewBox="0 0 24 24" fill="none" className={`w-12 h-12 relative z-10 transition-colors duration-500 ${selectedFolderId === folder._id ? 'text-amber-400' : 'text-[var(--text-muted)] group-hover:text-amber-500/60'}`}>
                                            <path d="M4 4h4.5l2 2H20a2 2 0 012 2v10a3 3 0 01-3 3H5a3 3 0 01-3-3V7a3 3 0 013-3z" fill="currentColor" fillOpacity={0.15} />
                                            <path d="M2.5 10.5h19v6.5c0 1.38-1.12 2.5-2.5 2.5H5c-1.38 0-2.5-1.12-2.5-2.5v-6.5z" fill="currentColor" fillOpacity={0.2} />
                                            <path d="M4 4h4.5l2 2H20a2 2 0 012 2" stroke="currentColor" strokeWidth={2} />
                                        </svg>
                                        {selectedFolderId === folder._id && (
                                            <div className="absolute inset-0 bg-[var(--accent-primary)]/20 blur-xl rounded-full animate-pulse" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className={`text-base font-black tracking-tight truncate transition-colors ${selectedFolderId === folder._id ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
                                            {folder.name}
                                        </p>
                                        <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-0.5 opacity-60">Directory Node</p>
                                    </div>

                                    {/* Open Folder Action */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEnterFolder(folder);
                                        }}
                                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--bg-primary)]/5 text-[var(--text-muted)] hover:text-cyan-400 transition-all active:scale-90 border border-transparent hover:border-cyan-500/20"
                                        title="Enter Folder"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={3}><path d="M13 5l7 7-7 7" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-[var(--bg-secondary)]/60 border-t border-[var(--border-color)] relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex flex-col items-center sm:items-start">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">Current Anchor</span>
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full transition-colors shadow-lg ${selectedFolderId ? 'bg-[var(--accent-primary)] shadow-[var(--accent-primary)]/50' : 'bg-[var(--text-muted)]'}`} />
                            <p className="text-xs font-bold text-[var(--text-primary)] tracking-widest uppercase">
                                {selectedFolderId ? "Node Targeted" : (currentFolder ? currentFolder.name : 'Root Container')}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            onClick={onCancel}
                            className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-muted)] font-bold uppercase tracking-widest hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-all border border-transparent hover:border-[var(--border-color)] text-[10px]"
                        >
                            Abort
                        </button>
                        <button
                            onClick={() => {
                                const targetId = selectedFolderId || currentFolder?.id || null;
                                const targetFolder = selectedFolderId
                                    ? folders.find(f => f._id === selectedFolderId)
                                    : currentFolder;
                                handleConfirm(targetId, targetFolder);
                            }}
                            className="flex-[2] sm:flex-none px-8 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-cyan-500/20 active:scale-95 text-[10px]"
                        >
                            {selectedFolderId ? "Confirm Link" : actionLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}


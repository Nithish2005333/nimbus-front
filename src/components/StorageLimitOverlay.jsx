import React, { useEffect, useState } from 'react';
import { useUpload } from '../context/UploadContext';

export default function StorageLimitOverlay() {
    const { storageFullTrigger, setStorageFullTrigger } = useUpload();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (storageFullTrigger) {
            setVisible(true);
        }
    }, [storageFullTrigger]);

    const handleClose = () => {
        setVisible(false);
        setStorageFullTrigger(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center px-4 py-6 sm:p-0">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
                onClick={handleClose}
            />

            {/* Modal Card */}
            <div className="relative w-full max-w-sm sm:max-w-md transform overflow-hidden rounded-3xl border border-rose-500/20 bg-slate-900/90 p-6 text-left shadow-[0_0_50px_rgba(244,63,94,0.2)] backdrop-blur-xl transition-all animate-in slide-in-from-bottom-10 fade-in zoom-in-95 duration-300">

                {/* Glow Effect */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-rose-500/20 rounded-full blur-[50px] pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center text-center">

                    {/* Warning Icon with Ripple */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-rose-500/20 rounded-full animate-ping opacity-75" />
                        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-8 h-8 text-white" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>

                    <h3 className="text-2xl font-black text-white mb-2 tracking-tight">
                        Storage Capacity Critical
                    </h3>

                    <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed max-w-xs">
                        Your secure vault has reached its maximum capacity. <br />
                        <span className="text-rose-400 font-bold">New uploads have been halted.</span>
                    </p>

                    {/* Usage Stats Visual */}
                    <div className="w-full bg-slate-950/50 rounded-2xl p-4 border border-white/5 mb-8">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Usage</span>
                            <span className="text-xs font-black text-rose-400">100%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-rose-500 to-orange-500 w-full animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-mono">
                            <span>10.0 GB Used</span>
                            <span>10.0 GB Limit</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 w-full">
                        <button
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-orange-600 text-white font-black uppercase tracking-[0.1em] text-sm shadow-[0_0_20px_rgba(244,63,94,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            Expand Capacity
                        </button>
                        <button
                            onClick={handleClose}
                            className="w-full py-3.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 font-bold hover:text-white hover:bg-white/10 transition-all text-xs uppercase tracking-wider"
                        >
                            Dismiss Warning
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}

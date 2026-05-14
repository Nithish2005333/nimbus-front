import { useEffect, useRef, useState } from 'react';

export default function ContextMenu({ show, x, y, options, onClose }) {
    const menuRef = useRef(null);
    const [adjustedPos, setAdjustedPos] = useState({ top: y, left: x });

    useEffect(() => {
        if (!show || !menuRef.current) return;

        const menu = menuRef.current;
        const rect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let newLeft = x;
        let newTop = y;

        // Prevent horizontal overflow
        if (x + rect.width > viewportWidth) {
            newLeft = x - rect.width;
        }

        // Prevent vertical overflow
        if (y + rect.height > viewportHeight) {
            newTop = y - rect.height;
        }

        setAdjustedPos({ top: Math.max(0, newTop), left: Math.max(0, newLeft) });
    }, [show, x, y, options]);

    if (!show || !options || options.length === 0) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-[99]"
                onClick={onClose}
                onContextMenu={(e) => { e.preventDefault(); onClose(); }}
            ></div>
            <div
                ref={menuRef}
                className="fixed z-[100] min-w-[200px] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-2 animate-in fade-in zoom-in-95 duration-150"
                style={{ top: adjustedPos.top, left: adjustedPos.left }}
            >
                {options.map((opt, idx) => (
                    opt === 'separator' ? (
                        <div key={idx} className="h-px bg-white/10 my-1.5 mx-2"></div>
                    ) : (
                        <button
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); opt.action(); onClose(); }}
                            disabled={opt.disabled}
                            className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl flex items-center gap-3 transition-all ${opt.disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10 group'} ${opt.danger ? 'text-rose-400 hover:text-white hover:bg-rose-500 shadow-rose-900/20' : 'text-slate-300 hover:text-white'}`}
                        >
                            {opt.icon && <span className="w-4 h-4 text-inherit transition-transform group-hover:scale-110">{opt.icon}</span>}
                            {opt.label}
                        </button>
                    )
                ))}
            </div>
        </>
    );
}

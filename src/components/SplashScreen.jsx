import Logo from './Logo';

export default function SplashScreen() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050b14] overflow-hidden">
            {/* 1. Animated Background Mesh aka 'Vortex' */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/50 via-[#050b14] to-[#050b14] z-10" />
                <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[200vw] h-[200vw] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(6,182,212,0.1)_360deg)] animate-[spin_8s_linear_infinite] opacity-50" />
                <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[200vw] h-[200vw] bg-[conic-gradient(from_180deg,transparent_0_340deg,rgba(139,92,246,0.1)_360deg)] animate-[spin_12s_linear_infinite_reverse] opacity-50" />
            </div>

            {/* 2. Cyber Grid Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-[1] mix-blend-overlay"></div>
            <div className="absolute inset-0 z-[2] bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]" />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center">
                {/* Logo Section */}
                <div className="relative mb-8 sm:mb-12 group">
                    {/* Energy Rings */}
                    <div className="absolute inset-0 -m-8 rounded-full border border-cyan-500/20 opacity-0 scale-50 animate-[ping_3s_ease-out_infinite]" />
                    <div className="absolute inset-0 -m-12 rounded-full border border-purple-500/10 opacity-0 scale-50 animate-[ping_4s_ease-out_infinite_1s]" />

                    {/* Glow backdrop */}
                    <div className="absolute inset-0 bg-cyan-500/10 blur-[60px] rounded-full animate-pulse-slow" />

                    {/* Floating Logo */}
                    <div className="relative h-32 w-32 sm:h-56 sm:w-56 animate-float">
                        <Logo className="h-full w-full object-contain drop-shadow-[0_0_25px_rgba(6,182,212,0.6)]" />
                    </div>
                </div>

                {/* Text Section */}
                <div className="text-center space-y-4">
                    <h1 className="relative text-4xl sm:text-7xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-slate-400 drop-shadow-2xl animate-title-reveal">
                        NIMBUS
                        <span className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 text-[0.6rem] sm:text-xs font-mono text-cyan-500/50 animate-pulse">v2.0</span>
                    </h1>

                    <div className="flex items-center justify-center gap-3 overflow-hidden">
                        <div className="h-[1px] w-8 sm:w-12 bg-gradient-to-r from-transparent to-cyan-500/50"></div>
                        <p className="text-[10px] sm:text-sm font-mono tracking-[0.4em] text-cyan-400/80 uppercase animate-slide-up">
                            Secure Cloud Environment
                        </p>
                        <div className="h-[1px] w-8 sm:w-12 bg-gradient-to-l from-transparent to-cyan-500/50"></div>
                    </div>
                </div>
            </div>

            {/* Footer / Loader */}
            <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center z-20">
                <div className="w-64 h-[2px] bg-slate-800/80 rounded-full overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400 to-transparent w-1/2 animate-shimmer-slide" />
                </div>
                <div className="mt-3 flex gap-1.5 items-end h-4">
                    <span className="w-1 h-1 bg-cyan-500 rounded-full animate-[bounce_1s_infinite_0ms]" />
                    <span className="w-1 h-1 bg-cyan-500 rounded-full animate-[bounce_1s_infinite_200ms]" />
                    <span className="w-1 h-1 bg-cyan-500 rounded-full animate-[bounce_1s_infinite_400ms]" />
                </div>
            </div>

            <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(1deg); }
        }
        @keyframes shimmer-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes title-reveal {
          0% { opacity: 0; letter-spacing: 1em; filter: blur(10px); }
          100% { opacity: 1; letter-spacing: 0.1em; filter: blur(0px); }
        }
        @keyframes slide-up {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-shimmer-slide { animation: shimmer-slide 2s linear infinite; }
        .animate-title-reveal { animation: title-reveal 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .animate-slide-up { animation: slide-up 1s ease-out 0.5s forwards; opacity: 0; }
        .animate-pulse-slow { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>
        </div>
    );
}

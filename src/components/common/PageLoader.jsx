import logoBlack from '../../assets/Cobrother_logo.png';

export default function PageLoader({ message = 'Preparing your workspace...' }) {
  return (
    <div
      className="min-h-[50vh] flex flex-col items-center justify-center gap-5 px-6 py-16 bg-gradient-to-b from-slate-50 to-indigo-50/40"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-indigo-400/20 blur-xl scale-150 animate-pulse" />
        <img
          src={logoBlack}
          alt=""
          className="relative h-10 w-auto opacity-90 animate-[pageLoaderFloat_2.4s_ease-in-out_infinite]"
        />
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600 tracking-wide">{message}</p>
      </div>
      <style>{`
        @keyframes pageLoaderFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

import { lazy, Suspense, useState } from 'react';
import { useLocation } from 'react-router-dom';
import broAILogo from '../../assets/Cobrother_Profile.png';

const CoBrotherAI = lazy(() => import('./CoBrotherAI'));

const AI_HIDDEN_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/complete-profile',
  '/password-security',
  '/privacy-policy',
  '/terms-and-conditions',
];

export default function CoBrotherAILauncher() {
  const { pathname } = useLocation();
  const [active, setActive] = useState(false);

  if (AI_HIDDEN_PATHS.some((path) => pathname.startsWith(path))) {
    return null;
  }

  if (active) {
    return (
      <Suspense fallback={null}>
        <CoBrotherAI initialOpen />
      </Suspense>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setActive(true)}
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] z-[1200] flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[var(--cobrother-brand-green)] shadow-2xl transition hover:border-[var(--cobrother-brand-green)] sm:bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:right-5 sm:h-16 sm:w-16"
      aria-label="Open Bro"
    >
      <img src={broAILogo} alt="" className="h-9 w-9 object-contain sm:h-10 sm:w-10" />
      <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-[var(--cobrother-brand-green)]" />
    </button>
  );
}

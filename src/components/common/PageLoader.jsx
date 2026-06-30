import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import logoBlack from '../../assets/Cobrother_logo.svg';
import '../../styles/page-loader.css';

function LoadingDots() {
  return (
    <span className="page-loader__dots" aria-hidden>
      <span />
      <span />
      <span />
    </span>
  );
}

export default function PageLoader({
  message = 'Preparing your workspace...',
  overlay = false,
}) {
  const [mounted, setMounted] = useState(false);
  const showDots = !message.trim().endsWith('...');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const loader = (
    <motion.div
      className={`page-loader${overlay ? ' page-loader--overlay' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="page-loader__bg" aria-hidden>
        <div className="page-loader__orb page-loader__orb--blue" />
        <div className="page-loader__grid" />
      </div>

      <motion.div
        className="page-loader__panel"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="page-loader__logo-wrap">
          <img src={logoBlack} alt="CoɃrother" className="page-loader__logo" />
        </div>
        <div className="page-loader__ring" aria-hidden />
        <p className="page-loader__message">
          {message}
          {showDots ? <LoadingDots /> : null}
        </p>
      </motion.div>
    </motion.div>
  );

  return createPortal(loader, document.body);
}

export function PageRouteEnter({ children }) {
  return <div className="page-loader-route-enter">{children}</div>;
}

import { motion } from 'framer-motion';
import logoBlack from '../../assets/Cobrother_logo.png';
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
  const showDots = !message.trim().endsWith('...');

  return (
    <motion.div
      className={`page-loader${overlay ? ' page-loader--overlay' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      initial={overlay ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: overlay ? 0.28 : 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="page-loader__bg" aria-hidden>
        <div className="page-loader__orb page-loader__orb--violet" />
        <div className="page-loader__orb page-loader__orb--blue" />
        <div className="page-loader__grid" />
      </div>

      <motion.div
        className="page-loader__panel"
        initial={overlay ? false : { opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: overlay ? 0.2 : 0.45, delay: overlay ? 0 : 0.06, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="page-loader__logo-wrap">
          <div className="page-loader__logo-glow" />
          <img src={logoBlack} alt="CoBrother" className="page-loader__logo" />
        </div>
        <div className="page-loader__ring" aria-hidden />
        <p className="page-loader__message">
          {message}
          {showDots ? <LoadingDots /> : null}
        </p>
      </motion.div>
    </motion.div>
  );
}

export function PageRouteEnter({ children }) {
  return <div className="page-loader-route-enter">{children}</div>;
}

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, LockKeyhole } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HOME_EASE } from '../home/motion/homeMotion';
import '../../styles/virtual-assistant-unlock.css';

const COLORS = ['#7c3aed', '#6366f1', '#50BF78', '#a78bfa'];

const ACT = {
  DEPARTURE: 'departure',
  APPROVAL: 'approval',
  UNLOCK: 'unlock',
  ENTER: 'enter',
};

const ACT_DURATIONS = {
  [ACT.DEPARTURE]: 800,
  [ACT.APPROVAL]: 2200,
  [ACT.UNLOCK]: 2000,
};

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function makeStageParticles(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `stage-${i}`,
    color: COLORS[i % COLORS.length],
    left: rand(4, 96),
    size: rand(4, 8),
    duration: rand(5.5, 9),
    delay: rand(0, 3),
    rotation: rand(120, 480),
    tx: rand(-30, 30),
    round: i % 2 === 0,
  }));
}

const panelVariants = {
  initial: { opacity: 0, y: 18, scale: 0.96 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: HOME_EASE },
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.98,
    transition: { duration: 0.35, ease: HOME_EASE },
  },
};

/**
 * Story-driven DeltaOperator workspace unlock cinematic (4 acts).
 * Does not change unlock eligibility — parent handles navigation + markSeen.
 */
export default function VaWorkspaceUnlockExperience({
  referenceNumber,
  onEnter,
  onSkip,
  onBackToJourney,
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const enterBtnRef = useRef(null);
  const [act, setAct] = useState(reduceMotion ? ACT.ENTER : ACT.DEPARTURE);
  const [canSkip, setCanSkip] = useState(Boolean(reduceMotion));

  const particles = useMemo(
    () => (reduceMotion ? [] : makeStageParticles(14)),
    [reduceMotion]
  );

  useEffect(() => {
    if (reduceMotion) {
      setAct(ACT.ENTER);
      setCanSkip(true);
      return undefined;
    }

    const timers = [];
    let elapsed = 0;
    const sequence = [ACT.DEPARTURE, ACT.APPROVAL, ACT.UNLOCK, ACT.ENTER];

    for (let i = 0; i < sequence.length - 1; i += 1) {
      const current = sequence[i];
      elapsed += ACT_DURATIONS[current];
      const next = sequence[i + 1];
      timers.push(
        setTimeout(() => {
          setAct(next);
          if (next === ACT.APPROVAL || next === ACT.UNLOCK || next === ACT.ENTER) {
            setCanSkip(true);
          }
        }, elapsed)
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [reduceMotion]);

  useEffect(() => {
    if (act === ACT.ENTER && enterBtnRef.current) {
      enterBtnRef.current.focus();
    }
  }, [act]);

  const finish = useCallback(
    (handler) => {
      handler?.();
    },
    []
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && canSkip) {
        e.preventDefault();
        finish(onSkip);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canSkip, finish, onSkip]);

  const showParticles = !reduceMotion && act !== ACT.DEPARTURE;

  return (
    <div
      className="va-unlock-stage"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {!reduceMotion && <div className="va-unlock-stage__glow" aria-hidden />}

      {showParticles && (
        <div className="va-unlock-stage__particles" aria-hidden>
          {particles.map((p) => (
            <span
              key={p.id}
              className="va-unlock-stage__particle"
              style={{
                left: `${p.left}%`,
                width: `${p.size}px`,
                height: `${p.round ? p.size : p.size * 0.55}px`,
                borderRadius: p.round ? '50%' : '2px',
                backgroundColor: p.color,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                '--rotation': `${p.rotation}deg`,
                '--tx': `${p.tx}px`,
              }}
            />
          ))}
        </div>
      )}

      {canSkip && (
        <button type="button" className="va-unlock-skip" onClick={() => finish(onSkip)}>
          {t('vaUnlockSkip', { defaultValue: 'Skip' })}
        </button>
      )}

      <div className="va-unlock-stage__content">
        <AnimatePresence mode="wait">
          {act === ACT.DEPARTURE && (
            <motion.div
              key="departure"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: HOME_EASE }}
            >
              <p className="va-unlock-eyebrow">
                {t('vaUnlockDeparting', { defaultValue: 'A moment for you' })}
              </p>
            </motion.div>
          )}

          {act === ACT.APPROVAL && (
            <motion.div key="approval" variants={panelVariants} initial="initial" animate="animate" exit="exit">
              <div className="va-unlock-seal va-unlock-seal--success" aria-hidden>
                <Check size={36} strokeWidth={2.5} />
                <span className="va-unlock-seal__ring" />
              </div>
              <p className="va-unlock-eyebrow">
                {t('vaUnlockApprovedEyebrow', { defaultValue: 'Decision complete' })}
              </p>
              <h1 id={titleId} className="va-unlock-title">
                {t('vaUnlockApprovedTitle', { defaultValue: 'Application Approved' })}
              </h1>
              <p className="va-unlock-subtitle">
                {t('vaUnlockApprovedSubtitle', {
                  defaultValue: 'Your DeltaOperator application has been accepted.',
                })}
              </p>
              {referenceNumber ? (
                <p className="va-unlock-ref">{referenceNumber}</p>
              ) : null}
            </motion.div>
          )}

          {act === ACT.UNLOCK && (
            <motion.div key="unlock" variants={panelVariants} initial="initial" animate="animate" exit="exit">
              <div className="va-unlock-seal" aria-hidden>
                <LockKeyhole size={34} strokeWidth={2.25} />
                <span className="va-unlock-seal__ring" />
                <span className="va-unlock-seal__sweep" />
              </div>
              <p className="va-unlock-eyebrow">
                {t('vaUnlockUnlockedEyebrow', { defaultValue: 'Milestone unlocked' })}
              </p>
              <h1 id={titleId} className="va-unlock-title">
                {t('vaUnlockUnlockedTitle', { defaultValue: 'Workspace Unlocked' })}
              </h1>
              <p className="va-unlock-subtitle">
                {t('vaUnlockUnlockedSubtitle', {
                  defaultValue: 'Your DeltaOperator Workspace is ready.',
                })}
              </p>
            </motion.div>
          )}

          {act === ACT.ENTER && (
            <motion.div key="enter" variants={panelVariants} initial="initial" animate="animate" exit="exit">
              <div className="va-unlock-seal va-unlock-seal--success" aria-hidden>
                <LockKeyhole size={34} strokeWidth={2.25} />
                <span className="va-unlock-seal__ring" />
              </div>
              <p className="va-unlock-eyebrow">
                {t('vaUnlockEnterEyebrow', { defaultValue: 'Welcome in' })}
              </p>
              <h1 id={titleId} className="va-unlock-title">
                {t('vaUnlockEnterTitle', { defaultValue: 'Your Workspace Awaits' })}
              </h1>
              <p className="va-unlock-subtitle">
                {t('vaUnlockEnterSubtitle', {
                  defaultValue: 'Step into your DeltaOperator workspace and begin your next chapter.',
                })}
              </p>
              <div className="va-unlock-actions">
                <button
                  ref={enterBtnRef}
                  type="button"
                  className="va-unlock-enter btn-glow"
                  onClick={() => finish(onEnter)}
                >
                  {t('vaUnlockEnterCta', { defaultValue: 'Enter Workspace' })}
                  <ArrowRight size={16} strokeWidth={2.5} />
                </button>
                {onBackToJourney && (
                  <button
                    type="button"
                    className="va-unlock-secondary"
                    onClick={() => finish(onBackToJourney)}
                  >
                    {t('vaUnlockBackJourney', { defaultValue: 'Back to Journey' })}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const HINT_POINTS = [
  'Finish the required profile fields.',
  'An admin reviews it before it goes live.',
  'Approved cards then appear in this row.',
];

export default function DeltapreneurShowcaseHint() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState(null);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const tooltipId = useId();

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(260, window.innerWidth - 24);
    let left = rect.right - width;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
    setStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left,
      width,
      zIndex: 10060,
    });
  }, []);

  const show = useCallback(() => {
    updatePosition();
    setOpen(true);
  }, [updatePosition]);

  const hide = useCallback(() => {
    setOpen(false);
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      const target = event.target;
      if (triggerRef.current?.contains(target) || tooltipRef.current?.contains(target)) return;
      hide();
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open, hide]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="home-section-header__showcase-hint"
        aria-label={t('homeDeltapreneurProfileTips', { defaultValue: 'Complete your profile' })}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={show}
        onFocus={show}
        onClick={() => (open ? hide() : show())}
      >
        <Info size={16} strokeWidth={2.25} aria-hidden="true" />
      </button>
      {open && style
        ? createPortal(
            <div
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              className="home-section-header__showcase-tooltip"
              style={style}
              onMouseLeave={hide}
            >
              <p className="home-section-header__showcase-tooltip-title">
                {t('homeDeltapreneurShowcaseTitle', {
                  defaultValue: 'Showcase your profile',
                })}
              </p>
              <ul className="home-section-header__showcase-tooltip-list">
                {HINT_POINTS.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <Link to="/creator" className="home-section-header__showcase-tooltip-link" onClick={hide}>
                {t('homeDeltapreneurOpenProfile', { defaultValue: 'Open your profile' })}
              </Link>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

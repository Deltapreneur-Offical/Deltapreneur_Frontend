import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import './operations-request-success.css';

const BOOKING_COLORS = ['#22c55e', '#86efac', '#0ea5e9', '#38bdf8', '#fbbf24', '#f59e0b', '#ffffff'];

function fireSmoothBookingConfetti(canvas) {
  const options = { resize: true };
  let fire;
  try {
    fire = confetti.create(canvas, { ...options, useWorker: true });
  } catch {
    fire = confetti.create(canvas, options);
  }

  const base = {
    colors: BOOKING_COLORS,
    disableForReducedMotion: true,
    gravity: 0.95,
    decay: 0.9,
    ticks: 220,
  };

  fire({
    ...base,
    particleCount: 55,
    angle: 62,
    spread: 58,
    startVelocity: 42,
    scalar: 1.28,
    origin: { x: 0.08, y: 0.78 },
  });
  fire({
    ...base,
    particleCount: 55,
    angle: 118,
    spread: 58,
    startVelocity: 42,
    scalar: 1.28,
    origin: { x: 0.92, y: 0.78 },
  });

  const later = window.setTimeout(() => {
    fire({
      ...base,
      particleCount: 42,
      spread: 86,
      startVelocity: 32,
      scalar: 1.42,
      origin: { x: 0.5, y: 0.58 },
    });
  }, 220);

  return () => {
    window.clearTimeout(later);
    fire.reset();
  };
}

function BookingConfetti({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;

    let cleanup;
    const frame = window.requestAnimationFrame(() => {
      if (!canvasRef.current) return;
      try {
        cleanup = fireSmoothBookingConfetti(canvasRef.current);
      } catch (err) {
        console.error('Confetti trigger failed:', err);
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
      cleanup?.();
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="ops-success-confetti"
      aria-hidden
    />
  );
}

/**
 * Confirmation overlay shown after a hire / booking request is submitted.
 * Reused by the Operations page and the Home page Operations section so the
 * success state is identical everywhere.
 */
export default function OperationsRequestSuccess({ payload, onClose, onTrack }) {
  const { t } = useTranslation();
  const isBooking = payload?.type === 'booking';

  return (
    <div
      className="ops-success-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ops-success-title"
    >
      <BookingConfetti active={isBooking} />
      <div
        className="ops-success-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ops-success-badge" aria-hidden>
          <Check size={32} strokeWidth={2.6} />
        </div>
        <h2 id="ops-success-title" className="ops-success-title">
          {isBooking
            ? t('operationsBookSuccessTitle', { defaultValue: 'Slot Booked!' })
            : t('operationsHireSuccessTitle', { defaultValue: 'Hire Request Confirmed!' })}
        </h2>
        <p className="ops-success-body">
          {isBooking
            ? t('operationsBookSuccessBody', {
                defaultValue:
                  "You'll be notified soon. Our team will contact you regarding this one-time service and next steps.",
              })
            : t('operationsHireSuccessBody', {
                defaultValue:
                  "You'll be notified soon. Our team will contact you to confirm your monthly engagement and onboarding.",
              })}
        </p>
        {isBooking ? (
          <p className="ops-success-followup">
            {t('operationsBookSuccessTrackHint', {
              defaultValue:
                'Your request is now in My Requests. Open Track to follow status while we review your booking.',
            })}
          </p>
        ) : null}
        {payload?.serviceName && (
          <p className="ops-success-service">{payload.serviceName}</p>
        )}
        <div className="ops-success-actions">
          <button type="button" className="ops-success-close" onClick={onClose}>
            {t('close', { defaultValue: 'Close' })}
          </button>
          <button type="button" className="ops-success-track" onClick={onTrack || onClose}>
            {t('operationsBookSuccessTrack', { defaultValue: 'Track' })}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logoBlack from '../../assets/Cobrother_logo.png';
import BrandLogoImage from '../common/BrandLogoImage';

const STATUS_MESSAGES = [
  'Payment received successfully...',
  'Verifying your payment...',
  'Connecting with the domain registry...',
  'Registering your domain...',
  'Configuring your purchase...',
  'Preparing your order...',
  'Creating your order details...',
  'Almost done...',
  'Finalizing everything...',
];

const ROTATE_MS = 2500;

/**
 * Full-screen lock while post-Razorpay verify + provision runs.
 * Status lines are cosmetic reassurance only — not tied to real backend stages.
 */
export default function PaymentProcessingOverlay({ open = false }) {
  const [mounted, setMounted] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setMessageIndex(0);
      return undefined;
    }
    const id = window.setInterval(() => {
      setMessageIndex((i) => (i + 1) % STATUS_MESSAGES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  const message = STATUS_MESSAGES[messageIndex];

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[10000] flex flex-col bg-slate-50/95 backdrop-blur-sm"
          role="status"
          aria-busy="true"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div
            className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-6"
            role="alert"
          >
            <div className="mx-auto flex max-w-3xl items-start gap-3">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
                aria-hidden
              />
              <p className="text-sm font-semibold leading-snug text-amber-950 sm:text-[15px]">
                Please do not close this tab or switch away until your payment is
                confirmed and your order finishes processing.
              </p>
            </div>
          </div>

          <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-16">
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden"
              aria-hidden
            >
              <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />
              <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-indigo-200/25 blur-3xl" />
            </div>

            <motion.div
              className="relative z-10 flex w-full max-w-md flex-col items-center text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
            >
              <BrandLogoImage
                src={logoBlack}
                alt="CoBrother"
                className="mb-6 h-10 w-auto object-contain"
              />
              <div
                className="mb-6 h-12 w-12 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600"
                aria-hidden
              />
              <AnimatePresence mode="wait">
                <motion.p
                  key={message}
                  className="min-h-[3rem] text-base font-medium text-slate-800 sm:text-lg"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.28 }}
                >
                  {message}
                </motion.p>
              </AnimatePresence>
              <p className="mt-3 max-w-sm text-xs text-slate-500 sm:text-sm">
                This usually takes a few moments. Stay on this page — we&apos;ll
                confirm as soon as everything is ready.
              </p>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

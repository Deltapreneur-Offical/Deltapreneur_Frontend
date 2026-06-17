import { useMemo, useState } from 'react';
import { ventureAPI } from '../../api/services';
import './venture-gstin-verification-modal.css';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function getGstinValidationState(value) {
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return 'empty';
  if (trimmed.length < 15) return 'incomplete';
  if (GSTIN_REGEX.test(trimmed)) return 'valid';
  return 'invalid';
}

function ShieldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.5L4.5 5.5V11.5C4.5 16.2 7.6 20.5 12 21.8C16.4 20.5 19.5 16.2 19.5 11.5V5.5L12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 12.1L11.1 14L14.9 10.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 10.5V16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="7.75" r="1" fill="currentColor" />
    </svg>
  );
}

function GstIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 8H16M8 12H14M8 16H12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="rgba(16,185,129,0.12)" stroke="#10b981" strokeWidth="1.75" />
      <path d="M8.5 12.2L10.8 14.5L15.8 9.5" stroke="#059669" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="rgba(239,68,68,0.1)" stroke="#ef4444" strokeWidth="1.75" />
      <path d="M12 8.5V13" stroke="#dc2626" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill="#dc2626" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg className="gst-modal__cta-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 6L19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SuccessCheckIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.5 12.5L10.5 15.5L16.5 9.5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function VentureGstinVerificationModal({ venture, onClose, onVerified, adminMode = false }) {
  const [gstin, setGstin] = useState(venture?.gstin || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const b = venture?.brandDetails || {};
  const isAuction = venture?.saleType === 'AUCTION';
  const validationState = useMemo(() => getGstinValidationState(gstin), [gstin]);

  const handleVerify = async () => {
    setError('');
    const trimmed = gstin.trim().toUpperCase();
    if (trimmed.length !== 15) {
      setError('GSTIN must be exactly 15 characters.');
      return;
    }
    setLoading(true);
    try {
      const verifyCall = adminMode
        ? ventureAPI.adminVerifyGstin
        : ventureAPI.verifyGstin;
      const { data } = await verifyCall(venture.id, trimmed);
      if (data.verified) {
        setResult({ legalName: data.legalName });
      } else {
        setError(data.error || 'GSTIN verification failed. Please check and try again.');
      }
    } catch (err) {
      const d = err.response?.data;
      setError(d?.error || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputWrapClass = [
    'gst-modal__input-wrap',
    validationState === 'valid' ? 'gst-modal__input-wrap--valid' : '',
    validationState === 'invalid' ? 'gst-modal__input-wrap--invalid' : '',
  ].filter(Boolean).join(' ');

  const validationMessage = (() => {
    if (validationState === 'valid') return 'Format looks valid — ready to verify';
    if (validationState === 'invalid') return 'Invalid GSTIN format — check characters and length';
    if (validationState === 'incomplete') return `${gstin.trim().length}/15 characters entered`;
    return null;
  })();

  return (
    <div className="gst-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="gst-modal" role="dialog" aria-modal="true" aria-labelledby="gst-modal-title">
        <button type="button" className="gst-modal__close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {result ? (
          <div className="gst-modal__success">
            <div className="gst-modal__success-icon-wrap">
              <span className="gst-modal__success-ring" aria-hidden="true" />
              <span className="gst-modal__success-ring gst-modal__success-ring--delay" aria-hidden="true" />
              <div className="gst-modal__success-icon">
                <SuccessCheckIcon />
              </div>
            </div>

            <div className="gst-modal__success-badge">Verified Business</div>
            <h3 className="gst-modal__success-title" id="gst-modal-title">
              GST verified successfully
            </h3>
            <p className="gst-modal__success-sub">Business identity confirmed.</p>

            <div className="gst-modal__success-card">
              <p>
                <strong>{b.brandName}</strong>
                {isAuction ? (
                  <>
                    {' '}auction is now
                    <strong className="gst-modal__success-live"> LIVE</strong> and ready for bidding!
                  </>
                ) : (
                  <> is now GST verified successfully.</>
                )}
              </p>
            </div>

            {result.legalName && (
              <div className="gst-modal__legal">
                <p className="gst-modal__legal-label">Legal Entity Name</p>
                <p className="gst-modal__legal-value">{result.legalName}</p>
              </div>
            )}

            <button type="button" className="gst-modal__cta" onClick={() => onVerified()}>
              {isAuction ? 'View Auction' : 'Done'}
              <ArrowIcon />
            </button>
          </div>
        ) : (
          <>
            <header className="gst-modal__header">
              <div className="gst-modal__header-top">
                <div className="gst-modal__shield" aria-hidden="true">
                  <ShieldIcon />
                </div>
                <div>
                  <div className="gst-modal__badge">
                    {isAuction ? 'Equity Auction Setup' : 'Verified Business Setup'}
                  </div>
                  <h2 className="gst-modal__title" id="gst-modal-title">
                    Verify Your GSTIN
                  </h2>
                </div>
              </div>
              <p className="gst-modal__subtitle">
                {isAuction
                  ? 'Verify your GSTIN to activate the equity auction and unlock trusted venture listings.'
                  : 'Validate your registered business identity and unlock trusted venture listings.'}
              </p>
            </header>

            <section className="gst-modal__info" aria-label="Why GST verification matters">
              <div className="gst-modal__info-head">
                <div className="gst-modal__info-icon">
                  <InfoIcon />
                </div>
                <h3 className="gst-modal__info-title">Why GST Verification Matters</h3>
              </div>
              <ul className="gst-modal__benefits">
                <li className="gst-modal__benefit">
                  <span className="gst-modal__benefit-check" aria-hidden="true">✓</span>
                  Builds buyer trust
                </li>
                <li className="gst-modal__benefit">
                  <span className="gst-modal__benefit-check" aria-hidden="true">✓</span>
                  Improves listing credibility
                </li>
                <li className="gst-modal__benefit">
                  <span className="gst-modal__benefit-check" aria-hidden="true">✓</span>
                  Unlocks premium venture features
                </li>
                <li className="gst-modal__benefit">
                  <span className="gst-modal__benefit-check" aria-hidden="true">✓</span>
                  Reduces fraud risk
                </li>
              </ul>
              <p className="gst-modal__warning">
                Use the GSTIN registered for the same business as your venture name below.
              </p>
            </section>

            <div className="gst-modal__context">
              <span className="gst-modal__context-label">Venture name on file</span>
              <span className="gst-modal__context-value">{b.brandName}</span>
            </div>

            <div className="gst-modal__field">
              <label className="gst-modal__label" htmlFor="gstin-input">
                GSTIN (15-digit) <span className="gst-modal__label-required">*</span>
              </label>
              <div className={inputWrapClass}>
                <span className="gst-modal__input-icon" aria-hidden="true">
                  <GstIcon />
                </span>
                <input
                  id="gstin-input"
                  className="gst-modal__input"
                  value={gstin}
                  onChange={e => { setGstin(e.target.value.toUpperCase()); setError(''); }}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  autoComplete="off"
                  spellCheck={false}
                />
                {validationState === 'valid' && (
                  <span className="gst-modal__input-status" aria-hidden="true">
                    <CheckIcon />
                  </span>
                )}
                {validationState === 'invalid' && (
                  <span className="gst-modal__input-status" aria-hidden="true">
                    <WarningIcon />
                  </span>
                )}
              </div>
              {validationMessage && (
                <p
                  className={`gst-modal__validation-msg gst-modal__validation-msg--${
                    validationState === 'valid'
                      ? 'valid'
                      : validationState === 'invalid'
                        ? 'invalid'
                        : 'incomplete'
                  }`}
                >
                  {validationMessage}
                </p>
              )}
              <p className="gst-modal__hint">
                Format: 2-digit state code + PAN (10 chars) + entity number + Z + check digit
              </p>
            </div>

            {error && (
              <div className="gst-modal__error" role="alert">
                {error}
              </div>
            )}

            <button
              type="button"
              className="gst-modal__cta"
              onClick={handleVerify}
              disabled={loading || gstin.trim().length !== 15}
            >
              {loading ? (
                <span className="btn-spinner" />
              ) : (
                <>
                  {isAuction ? 'Verify GSTIN & Activate Auction' : 'Verify GSTIN'}
                  <ArrowIcon />
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

import logoGreen from '../../assets/Cobrother_Green.png';
import logoBlack from '../../assets/Cobrother_logo.png';

function BackIcon() {
  return (
    <svg
      className="auth-back-icon"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

export default function AuthShell({
  title,
  subtitle,
  onBack,
  children,
  footer,
  brandTagline,
  brandBullets = [],
  headerActions,
}) {
  return (
    <div className="auth-split">
      <aside className="auth-split-brand" aria-hidden="false">
        <div className="auth-split-brand-inner">
          <img
            src={logoGreen}
            alt="CoBrother"
            className="auth-split-brand-logo"
          />
          {brandTagline && (
            <p className="auth-split-brand-tagline">{brandTagline}</p>
          )}
          <div className="auth-split-brand-divider" aria-hidden />
          {brandBullets.length > 0 && (
            <ul className="auth-split-brand-list">
              {brandBullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          <p className="auth-split-brand-footer">
            Trusted by entrepreneurs and domain investors across India.
          </p>
        </div>
      </aside>

      <div className="auth-split-form">
        <div className="auth-split-form-inner">
          {headerActions && (
            <div className="auth-split-form-actions">
              {headerActions}
            </div>
          )}
          <div className="auth-split-mobile-bar">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="auth-back-btn"
                aria-label="Go back"
              >
                <BackIcon />
              </button>
            )}
            <img
              src={logoBlack}
              alt="CoBrother"
              className="auth-split-mobile-logo"
            />
          </div>

          <div className="auth-split-form-header">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="auth-back-btn auth-back-btn--desktop"
                aria-label="Go back"
              >
                <BackIcon />
                <span>Back</span>
              </button>
            )}
            <div className="auth-split-form-titles">
              <h1 className="auth-split-title">{title}</h1>
              {subtitle && <p className="auth-split-subtitle">{subtitle}</p>}
            </div>
          </div>

          <div className="auth-split-form-body">{children}</div>

          {footer && <div className="auth-split-footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

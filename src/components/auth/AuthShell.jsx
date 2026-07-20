import logoBlack from '../../assets/Cobrother_logo.gif';
import BrandLogoImage from '../common/BrandLogoImage';
import '../../styles/auth.css';

function BackIcon() {
  return (
    <svg
      className="auth-page__back-icon"
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
  headerActions,
}) {
  return (
    <div className="auth-page">
      <div className="auth-page__glow auth-page__glow--top" aria-hidden />
      <div className="auth-page__glow auth-page__glow--bottom" aria-hidden />

      <main className="auth-page__card">
        <div className="auth-page__toolbar">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="auth-page__back"
              aria-label="Go back"
            >
              <BackIcon />
            </button>
          ) : (
            <span aria-hidden />
          )}

          <BrandLogoImage
            src={logoBlack}
            alt="CoBrother"
            className="auth-page__logo"
          />

          <div className="auth-page__toolbar-end">
            {headerActions || null}
          </div>
        </div>

        <header className="auth-page__header">
          <h1 className="auth-page__title">{title}</h1>
          {subtitle ? <p className="auth-page__subtitle">{subtitle}</p> : null}
        </header>

        <div className="auth-page__content">{children}</div>

        {footer ? <footer className="auth-page__footer">{footer}</footer> : null}
      </main>
    </div>
  );
}

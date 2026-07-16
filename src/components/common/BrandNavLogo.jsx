import logoBlack from '../../assets/Cobrother_logo.png';
import logoGreen from '../../assets/Cobrother_logo_G.png';

/**
 * CoBrother wordmark — black by default, green on hover.
 */
export default function BrandNavLogo({ className = '', imgClassName = 'brand-nav-logo' }) {
  const imgBase = `${imgClassName} home-nav-logo-img`.trim();

  return (
    <span className={`home-nav-logo-swap ${className}`.trim()}>
      <img
        src={logoBlack}
        alt="CoBrother"
        className={`${imgBase} home-nav-logo-img--default`.trim()}
        draggable={false}
      />
      <img
        src={logoGreen}
        alt=""
        aria-hidden
        className={`${imgBase} home-nav-logo-img--hover`.trim()}
        draggable={false}
      />
    </span>
  );
}

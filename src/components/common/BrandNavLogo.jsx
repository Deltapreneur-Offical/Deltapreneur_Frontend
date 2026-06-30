import logoBlack from '../../assets/Cobrother_logo.svg';
import logoGreen from '../../assets/Cobrother_Green.svg';

/**
 * Black CoBrother wordmark with green swap on parent hover/focus
 * (home main nav + dashboard sidebar / mobile header).
 */
export default function BrandNavLogo({ className = '', imgClassName = 'brand-nav-logo' }) {
  return (
    <span className={`home-nav-logo-swap ${className}`.trim()}>
      <img
        src={logoBlack}
        alt="CoɃrother"
        className={`${imgClassName} home-nav-logo-img home-nav-logo-img--default`.trim()}
      />
      <img
        src={logoGreen}
        alt=""
        aria-hidden
        className={`${imgClassName} home-nav-logo-img home-nav-logo-img--hover`.trim()}
      />
    </span>
  );
}

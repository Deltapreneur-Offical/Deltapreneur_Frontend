import logoBlack from '../../assets/Cobrother_logo.gif';

/**
 * CoBrother wordmark — GIF only (no hover swap).
 */
export default function BrandNavLogo({ className = '', imgClassName = 'brand-nav-logo' }) {
  return (
    <span className={`home-nav-logo-swap ${className}`.trim()}>
      <img
        src={logoBlack}
        alt="CoBrother"
        className={`${imgClassName} home-nav-logo-img home-nav-logo-img--default`.trim()}
      />
    </span>
  );
}

/**
 * HubRegistrar text wordmark — official logo asset to be added later.
 * Renders the brand word as styled text ("HubRegistrar", no ".com").
 */
export default function BrandNavLogo({ className = '', imgClassName = 'brand-nav-logo' }) {
  const base = `${imgClassName} home-nav-logo-text`.trim();

  return (
    <span className={`home-nav-logo-swap group h-full ${className}`.trim()}>
      <span className={`${base} home-nav-logo-text--default brand-text-logo`.trim()}>
        HubRegistrar
      </span>
    </span>
  );
}

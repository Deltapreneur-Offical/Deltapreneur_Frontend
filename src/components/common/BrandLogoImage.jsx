/**
 * HubRegistrar wordmark (text) — official logo asset to be added later.
 * Renders the brand word "HubRegistrar" (no ".com") instead of the old logo image.
 */
export default function BrandLogoImage({
  src: _src,
  className = '',
  alt = 'HubRegistrar',
  'aria-hidden': ariaHidden = false,
  ...rest
}) {
  return (
    <span
      className={`brand-text-logo ${className}`.trim()}
      role={ariaHidden ? undefined : 'img'}
      aria-label={ariaHidden ? undefined : alt}
      aria-hidden={ariaHidden || undefined}
      {...rest}
    >
      HubRegistrar
    </span>
  );
}

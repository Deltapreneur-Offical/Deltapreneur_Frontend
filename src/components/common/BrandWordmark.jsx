/**
 * HubRegistrar text wordmark — official logo asset to be added later.
 */
export default function BrandWordmark({ inline = false, className = '' }) {
  const displayClass = inline ? 'brand-wordmark-inline' : 'block';

  return (
    <span className={`${displayClass} ${className} brand-text-logo`.trim()}>
      HubRegistrar
    </span>
  );
}

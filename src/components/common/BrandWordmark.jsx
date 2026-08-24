/**
 * HubRegistrar logo — uses official logo image.
 */
import hubregistrarLogo from '../../assets/hubregistrarlogo_main.png';

export default function BrandWordmark({ inline = false, className = '' }) {
  const displayClass = inline ? 'brand-wordmark-inline' : 'block';

  return (
    <img
      src={hubregistrarLogo}
      alt="HubRegistrar"
      className={`${displayClass} ${className} brand-text-logo`.trim()}
      style={{ height: 'auto', width: 'auto', objectFit: 'contain' }}
    />
  );
}

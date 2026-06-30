import coBrotherLogo from '../../assets/Cobrother_logo.svg';

export default function BrandWordmark({ inline = false, className = '', alt = 'CoBrother' }) {
  const displayClass = inline ? 'brand-wordmark-inline' : 'block';

  return (
    <img
      src={coBrotherLogo}
      alt={alt}
      className={`${displayClass} ${className}`.trim()}
    />
  );
}
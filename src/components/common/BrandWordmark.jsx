import coBrotherLogo from '../../assets/Cobrother_logo.png';

export default function BrandWordmark({ inline = false, className = '', alt = 'CoɃrother' }) {
  const displayClass = inline ? 'inline-block align-middle' : 'block';

  return (
    <img
      src={coBrotherLogo}
      alt={alt}
      className={`${displayClass} ${className}`.trim()}
    />
  );
}
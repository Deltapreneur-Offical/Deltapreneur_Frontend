import './join-cobrother-gradient-button.css';

const GRADIENT_LAYERS = [
  { delay: '0s', duration: '25s' },
  { delay: '0.15s', duration: '15.9s' },
  { delay: '0.53s', duration: '26.4s' },
  { delay: '0.45s', duration: '17.8s' },
  { delay: '1.6s', duration: '19.2s' },
  { delay: '1.6s', duration: '29.2s' },
  { delay: '1.6s', duration: '20.2s' },
];

export default function JoinCoBrotherGradientButton({
  children,
  onClick,
  className = '',
  variant = 'nav',
}) {
  const label = children;

  return (
    <div className={`join-cb-gradient join-cb-gradient--${variant} ${className}`.trim()}>
      <div className="join-cb-gradient__wrapper">
        <div className="join-cb-gradient__light" aria-hidden />
        {GRADIENT_LAYERS.map((layer, index) => (
          <div
            key={index}
            className="join-cb-gradient__layer"
            style={{
              animationDelay: layer.delay,
              animationDuration: layer.duration,
            }}
            aria-hidden
          />
        ))}
        <button type="button" className="join-cb-gradient__btn" onClick={onClick}>
          {label}
        </button>
        <div className="join-cb-gradient__overlay" aria-hidden>
          {label}
        </div>
      </div>
    </div>
  );
}
